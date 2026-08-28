from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
JSON_OUT = ROOT / 'traffic-diagnosis.json'
TEXT_OUT = ROOT / 'traffic-diagnosis.txt'
SITE_URL = os.getenv('GSC_SITE_URL', 'sc-domain:nexusnovatools.com').strip() or 'sc-domain:nexusnovatools.com'
GA4_PROPERTY_ID = os.getenv('GA4_PROPERTY_ID', '').strip()


def pct_change(current: float, previous: float) -> float | None:
    if previous == 0:
        return None if current == 0 else 100.0
    return round(((current - previous) / previous) * 100, 1)


def post_json(url: str, payload: dict, token: str) -> dict:
    body = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'User-Agent': 'NexusNovaTrafficDiagnosis/1.0 (+https://nexusnovatools.com/)',
        },
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        raw = response.read().decode('utf-8', errors='ignore')
        return json.loads(raw) if raw else {}


def google_token() -> tuple[str | None, str | None]:
    raw = os.getenv('GOOGLE_SERVICE_ACCOUNT_JSON', '').strip()
    if not raw:
        return None, 'GOOGLE_SERVICE_ACCOUNT_JSON not configured'
    try:
        from google.auth.transport.requests import Request
        from google.oauth2 import service_account
        info = json.loads(raw)
        creds = service_account.Credentials.from_service_account_info(
            info,
            scopes=[
                'https://www.googleapis.com/auth/webmasters.readonly',
                'https://www.googleapis.com/auth/analytics.readonly',
            ],
        )
        creds.refresh(Request())
        return creds.token, None
    except Exception as exc:
        return None, f'Google credential error: {exc}'


def gsc_query(token: str, start: date, end: date, dimensions: list[str] | None = None, row_limit: int = 250) -> dict:
    endpoint = (
        'https://searchconsole.googleapis.com/webmasters/v3/sites/'
        + urllib.parse.quote(SITE_URL, safe='')
        + '/searchAnalytics/query'
    )
    payload: dict = {
        'startDate': start.isoformat(),
        'endDate': end.isoformat(),
        'rowLimit': row_limit,
    }
    if dimensions:
        payload['dimensions'] = dimensions
    return post_json(endpoint, payload, token)


def gsc_metrics(data: dict) -> dict:
    rows = data.get('rows') or []
    row = rows[0] if rows else {}
    return {
        'clicks': round(float(row.get('clicks', 0)), 1),
        'impressions': round(float(row.get('impressions', 0)), 1),
        'ctr': round(float(row.get('ctr', 0)) * 100, 2),
        'position': round(float(row.get('position', 0)), 2),
    }


def gsc_page_map(data: dict) -> dict[str, dict]:
    result: dict[str, dict] = {}
    for row in data.get('rows') or []:
        keys = row.get('keys') or []
        if not keys:
            continue
        result[str(keys[0])] = {
            'clicks': float(row.get('clicks', 0)),
            'impressions': float(row.get('impressions', 0)),
            'ctr': float(row.get('ctr', 0)) * 100,
            'position': float(row.get('position', 0)),
        }
    return result


def ga4_report(token: str, start: date, end: date, dimensions: list[str] | None = None, metrics: list[str] | None = None, limit: int = 100) -> dict:
    if not GA4_PROPERTY_ID:
        raise RuntimeError('GA4_PROPERTY_ID not configured')
    endpoint = f'https://analyticsdata.googleapis.com/v1beta/properties/{GA4_PROPERTY_ID}:runReport'
    payload: dict = {
        'dateRanges': [{'startDate': start.isoformat(), 'endDate': end.isoformat()}],
        'metrics': [{'name': name} for name in (metrics or ['activeUsers', 'sessions', 'engagedSessions', 'screenPageViews'])],
        'limit': limit,
    }
    if dimensions:
        payload['dimensions'] = [{'name': name} for name in dimensions]
    return post_json(endpoint, payload, token)


def ga4_metrics(data: dict, names: list[str]) -> dict:
    rows = data.get('rows') or []
    values = (rows[0].get('metricValues') or []) if rows else []
    result = {}
    for idx, name in enumerate(names):
        value = values[idx].get('value', '0') if idx < len(values) else '0'
        result[name] = round(float(value), 1)
    return result


def ga4_dimension_rows(data: dict, metric_names: list[str]) -> list[dict]:
    rows: list[dict] = []
    for row in data.get('rows') or []:
        dims = row.get('dimensionValues') or []
        metrics = row.get('metricValues') or []
        item = {'dimension': dims[0].get('value', '') if dims else ''}
        for idx, name in enumerate(metric_names):
            value = metrics[idx].get('value', '0') if idx < len(metrics) else '0'
            item[name] = round(float(value), 1)
        rows.append(item)
    return rows


def comparison(current: dict, previous: dict, keys: list[str]) -> dict:
    return {key: pct_change(float(current.get(key, 0)), float(previous.get(key, 0))) for key in keys}


def page_movers(current: dict[str, dict], previous: dict[str, dict], limit: int = 10) -> dict:
    movers = []
    for page in set(current) | set(previous):
        cur = current.get(page, {})
        prev = previous.get(page, {})
        imp_delta = float(cur.get('impressions', 0)) - float(prev.get('impressions', 0))
        click_delta = float(cur.get('clicks', 0)) - float(prev.get('clicks', 0))
        if imp_delta == 0 and click_delta == 0:
            continue
        movers.append({
            'page': page,
            'impressions_delta': round(imp_delta, 1),
            'clicks_delta': round(click_delta, 1),
            'current_impressions': round(float(cur.get('impressions', 0)), 1),
            'current_clicks': round(float(cur.get('clicks', 0)), 1),
            'current_position': round(float(cur.get('position', 0)), 1),
        })
    gains = sorted(movers, key=lambda x: (x['impressions_delta'], x['clicks_delta']), reverse=True)[:limit]
    losses = sorted(movers, key=lambda x: (x['impressions_delta'], x['clicks_delta']))[:limit]
    return {'gains': gains, 'losses': losses}


def diagnose(report: dict) -> list[str]:
    findings: list[str] = []
    gsc = report.get('gsc', {})
    ga4 = report.get('ga4', {})
    gsc_week = (gsc.get('changes') or {}).get('week', {})
    ga4_week = (ga4.get('changes') or {}).get('week', {})

    imp = gsc_week.get('impressions')
    clicks = gsc_week.get('clicks')
    ctr = gsc_week.get('ctr')
    sessions = ga4_week.get('sessions')

    if imp is not None and imp <= -25:
        findings.append('Search visibility is down materially: Google impressions fell by at least 25% week over week.')
    elif clicks is not None and clicks <= -25 and (imp is None or imp > -15):
        if ctr is not None and ctr <= -20:
            findings.append('Search demand is relatively stable, but click-through rate dropped; titles/snippets are a likely weakness.')
        else:
            findings.append('Google clicks fell faster than impressions; rankings/CTR should be checked page by page.')

    if sessions is not None and sessions <= -25 and (clicks is None or clicks > -15):
        findings.append('Overall sessions fell more than Google clicks, suggesting social/direct/referral traffic is the larger drop.')

    if not findings:
        findings.append('No single severe traffic-drop pattern was detected in the complete comparison windows; continue building impressions and referral traffic.')

    gsc_last = (gsc.get('week') or {}).get('current', {})
    if float(gsc_last.get('impressions', 0)) < 500:
        findings.append('Search visibility is still small in absolute terms, so the main growth job is earning more impressions, not fixing a crawler block.')

    return findings


def main() -> None:
    today = date.today()
    gsc_day_current = today - timedelta(days=2)
    gsc_day_previous = today - timedelta(days=3)
    gsc_week_current = (today - timedelta(days=8), today - timedelta(days=2))
    gsc_week_previous = (today - timedelta(days=15), today - timedelta(days=9))

    ga4_day_current = today - timedelta(days=1)
    ga4_day_previous = today - timedelta(days=2)
    ga4_week_current = (today - timedelta(days=7), today - timedelta(days=1))
    ga4_week_previous = (today - timedelta(days=14), today - timedelta(days=8))

    token, token_error = google_token()
    report: dict = {
        'generated_on': today.isoformat(),
        'gsc_site': SITE_URL,
        'ga4_property_configured': bool(GA4_PROPERTY_ID),
        'connected': bool(token),
    }
    if not token:
        report['error'] = token_error
        JSON_OUT.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
        TEXT_OUT.write_text(f'Traffic diagnosis unavailable: {token_error}\n', encoding='utf-8')
        print(report['error'])
        return

    try:
        gsc_day_cur = gsc_metrics(gsc_query(token, gsc_day_current, gsc_day_current))
        gsc_day_prev = gsc_metrics(gsc_query(token, gsc_day_previous, gsc_day_previous))
        gsc_week_cur = gsc_metrics(gsc_query(token, *gsc_week_current))
        gsc_week_prev = gsc_metrics(gsc_query(token, *gsc_week_previous))
        pages_cur = gsc_page_map(gsc_query(token, *gsc_week_current, dimensions=['page'], row_limit=250))
        pages_prev = gsc_page_map(gsc_query(token, *gsc_week_previous, dimensions=['page'], row_limit=250))
        report['gsc'] = {
            'day': {'current_date': gsc_day_current.isoformat(), 'previous_date': gsc_day_previous.isoformat(), 'current': gsc_day_cur, 'previous': gsc_day_prev},
            'week': {'current_range': [d.isoformat() for d in gsc_week_current], 'previous_range': [d.isoformat() for d in gsc_week_previous], 'current': gsc_week_cur, 'previous': gsc_week_prev},
            'changes': {
                'day': comparison(gsc_day_cur, gsc_day_prev, ['clicks', 'impressions', 'ctr', 'position']),
                'week': comparison(gsc_week_cur, gsc_week_prev, ['clicks', 'impressions', 'ctr', 'position']),
            },
            'page_movers': page_movers(pages_cur, pages_prev),
        }
    except Exception as exc:
        report['gsc'] = {'error': str(exc)}

    ga_metric_names = ['activeUsers', 'sessions', 'engagedSessions', 'screenPageViews']
    try:
        ga_day_cur = ga4_metrics(ga4_report(token, ga4_day_current, ga4_day_current, metrics=ga_metric_names), ga_metric_names)
        ga_day_prev = ga4_metrics(ga4_report(token, ga4_day_previous, ga4_day_previous, metrics=ga_metric_names), ga_metric_names)
        ga_week_cur = ga4_metrics(ga4_report(token, *ga4_week_current, metrics=ga_metric_names), ga_metric_names)
        ga_week_prev = ga4_metrics(ga4_report(token, *ga4_week_previous, metrics=ga_metric_names), ga_metric_names)
        channels = ga4_dimension_rows(ga4_report(token, *ga4_week_current, dimensions=['sessionDefaultChannelGroup'], metrics=['sessions'], limit=25), ['sessions'])
        sources = ga4_dimension_rows(ga4_report(token, *ga4_week_current, dimensions=['sessionSourceMedium'], metrics=['sessions'], limit=25), ['sessions'])
        landings = ga4_dimension_rows(ga4_report(token, *ga4_week_current, dimensions=['landingPagePlusQueryString'], metrics=['sessions', 'engagedSessions'], limit=50), ['sessions', 'engagedSessions'])
        for row in landings:
            row['dimension'] = row['dimension'].split('?', 1)[0] or '/'
        report['ga4'] = {
            'day': {'current_date': ga4_day_current.isoformat(), 'previous_date': ga4_day_previous.isoformat(), 'current': ga_day_cur, 'previous': ga_day_prev},
            'week': {'current_range': [d.isoformat() for d in ga4_week_current], 'previous_range': [d.isoformat() for d in ga4_week_previous], 'current': ga_week_cur, 'previous': ga_week_prev},
            'changes': {
                'day': comparison(ga_day_cur, ga_day_prev, ga_metric_names),
                'week': comparison(ga_week_cur, ga_week_prev, ga_metric_names),
            },
            'channels': channels[:15],
            'sources': sources[:15],
            'landing_pages': landings[:25],
        }
    except Exception as exc:
        report['ga4'] = {'error': str(exc)}

    report['diagnosis'] = diagnose(report)
    JSON_OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

    lines = ['NEXUSNOVA TRAFFIC DIAGNOSIS', '=' * 30]
    for finding in report.get('diagnosis', []):
        lines.append(f'- {finding}')
    gsc_week = ((report.get('gsc') or {}).get('week') or {}).get('current')
    gsc_change = ((report.get('gsc') or {}).get('changes') or {}).get('week')
    if gsc_week and gsc_change:
        lines += ['', f"GSC last complete 7d: {gsc_week.get('clicks', 0)} clicks, {gsc_week.get('impressions', 0)} impressions, {gsc_week.get('ctr', 0)}% CTR, position {gsc_week.get('position', 0)}", f"GSC WoW: clicks {gsc_change.get('clicks')}%, impressions {gsc_change.get('impressions')}%, CTR {gsc_change.get('ctr')}%"]
    ga_week = ((report.get('ga4') or {}).get('week') or {}).get('current')
    ga_change = ((report.get('ga4') or {}).get('changes') or {}).get('week')
    if ga_week and ga_change:
        lines += [f"GA4 last 7d: {ga_week.get('activeUsers', 0)} active users, {ga_week.get('sessions', 0)} sessions, {ga_week.get('engagedSessions', 0)} engaged sessions", f"GA4 WoW: users {ga_change.get('activeUsers')}%, sessions {ga_change.get('sessions')}%, engaged {ga_change.get('engagedSessions')}%"]
    TEXT_OUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print('\n'.join(lines))


if __name__ == '__main__':
    main()
