from __future__ import annotations

import json
import os
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
JSON_OUT = ROOT / "today-traffic-pulse.json"
TEXT_OUT = ROOT / "today-traffic-pulse.txt"
MD_OUT = ROOT / "today-traffic-pulse.md"
GA4_PROPERTY_ID = os.getenv("GA4_PROPERTY_ID", "").strip()


def post_json(url: str, payload: dict, token: str) -> dict:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "NexusNovaTodayTrafficPulse/1.2 (+https://nexusnovatools.com/)",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        raw = response.read().decode("utf-8", errors="ignore")
        return json.loads(raw) if raw else {}


def google_token() -> str:
    raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw:
        raise RuntimeError("GOOGLE_SERVICE_ACCOUNT_JSON is not configured")
    if not GA4_PROPERTY_ID:
        raise RuntimeError("GA4_PROPERTY_ID is not configured")

    from google.auth.transport.requests import Request
    from google.oauth2 import service_account

    info = json.loads(raw)
    creds = service_account.Credentials.from_service_account_info(
        info,
        scopes=["https://www.googleapis.com/auth/analytics.readonly"],
    )
    creds.refresh(Request())
    if not creds.token:
        raise RuntimeError("Google Analytics access token was empty")
    return creds.token


def run_report(
    token: str,
    start_date: str,
    end_date: str,
    metrics: list[str],
    dimensions: list[str] | None = None,
    limit: int = 10,
) -> dict:
    endpoint = f"https://analyticsdata.googleapis.com/v1beta/properties/{GA4_PROPERTY_ID}:runReport"
    payload: dict = {
        "dateRanges": [{"startDate": start_date, "endDate": end_date}],
        "metrics": [{"name": name} for name in metrics],
        "limit": limit,
    }
    if dimensions:
        payload["dimensions"] = [{"name": name} for name in dimensions]
        payload["orderBys"] = [{"metric": {"metricName": metrics[0]}, "desc": True}]
    return post_json(endpoint, payload, token)


def run_daily_trend(token: str) -> dict:
    endpoint = f"https://analyticsdata.googleapis.com/v1beta/properties/{GA4_PROPERTY_ID}:runReport"
    payload = {
        "dateRanges": [{"startDate": "6daysAgo", "endDate": "today"}],
        "dimensions": [{"name": "date"}],
        "metrics": [{"name": "activeUsers"}],
        "orderBys": [{"dimension": {"dimensionName": "date", "orderType": "ALPHANUMERIC"}}],
        "limit": 7,
    }
    return post_json(endpoint, payload, token)


def realtime_report(token: str) -> dict:
    endpoint = f"https://analyticsdata.googleapis.com/v1beta/properties/{GA4_PROPERTY_ID}:runRealtimeReport"
    payload = {
        "metrics": [
            {"name": "activeUsers"},
            {"name": "screenPageViews"},
            {"name": "eventCount"},
        ]
    }
    return post_json(endpoint, payload, token)


def first_metric_row(data: dict, names: list[str]) -> dict[str, float]:
    rows = data.get("rows") or []
    values = (rows[0].get("metricValues") or []) if rows else []
    result: dict[str, float] = {}
    for idx, name in enumerate(names):
        raw = values[idx].get("value", "0") if idx < len(values) else "0"
        result[name] = round(float(raw), 3)
    return result


def dimension_rows(data: dict, dimension_name: str, metric_name: str) -> list[dict]:
    result: list[dict] = []
    for row in data.get("rows") or []:
        dims = row.get("dimensionValues") or []
        metrics = row.get("metricValues") or []
        result.append(
            {
                dimension_name: dims[0].get("value", "") if dims else "",
                metric_name: round(float(metrics[0].get("value", "0")), 3) if metrics else 0.0,
            }
        )
    return result


def daily_trend_rows(data: dict) -> list[dict]:
    result: list[dict] = []
    for row in data.get("rows") or []:
        dims = row.get("dimensionValues") or []
        metrics = row.get("metricValues") or []
        raw_date = dims[0].get("value", "") if dims else ""
        label = raw_date
        if len(raw_date) == 8 and raw_date.isdigit():
            label = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:]}"
        active_users = round(float(metrics[0].get("value", "0")), 3) if metrics else 0.0
        result.append({"date": label, "active_users": active_users})
    return result


def pct_change(current: float, previous: float) -> float | None:
    if previous == 0:
        return None if current == 0 else 100.0
    return round(((current - previous) / previous) * 100, 1)


def fmt_number(value: float) -> str:
    value = float(value)
    return str(int(value)) if value.is_integer() else f"{value:.1f}"


def fmt_percent(value: float) -> str:
    return f"{float(value) * 100:.1f}%"


def write_failure(message: str) -> None:
    report = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "status": "error",
        "error": message,
    }
    JSON_OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    TEXT_OUT.write_text(f"Today Traffic Pulse unavailable: {message}\n", encoding="utf-8")
    MD_OUT.write_text(
        "## NexusNova Today Traffic Pulse\n\n"
        f"❌ **Unavailable:** {message}\n",
        encoding="utf-8",
    )


def main() -> None:
    try:
        token = google_token()
        metric_names = [
            "activeUsers",
            "newUsers",
            "sessions",
            "engagedSessions",
            "engagementRate",
            "screenPageViews",
            "eventCount",
            "keyEvents",
        ]
        today = first_metric_row(run_report(token, "today", "today", metric_names), metric_names)
        yesterday = first_metric_row(run_report(token, "yesterday", "yesterday", metric_names), metric_names)

        realtime_names = ["activeUsers", "screenPageViews", "eventCount"]
        realtime = first_metric_row(realtime_report(token), realtime_names)

        sources = dimension_rows(
            run_report(token, "today", "today", ["sessions"], ["sessionSourceMedium"], limit=8),
            "source_medium",
            "sessions",
        )
        channels = dimension_rows(
            run_report(token, "today", "today", ["sessions"], ["sessionDefaultChannelGroup"], limit=8),
            "channel",
            "sessions",
        )
        pages = dimension_rows(
            run_report(token, "today", "today", ["screenPageViews"], ["pagePath"], limit=8),
            "page",
            "views",
        )
        cities = dimension_rows(
            run_report(token, "today", "today", ["activeUsers"], ["city"], limit=8),
            "city",
            "active_users",
        )
        devices = dimension_rows(
            run_report(token, "today", "today", ["activeUsers"], ["deviceCategory"], limit=8),
            "device",
            "active_users",
        )
        daily_active_users = daily_trend_rows(run_daily_trend(token))

        traffic_seen = bool(today["activeUsers"] > 0 or today["sessions"] > 0 or today["screenPageViews"] > 0)
        changes = {key: pct_change(today[key], yesterday[key]) for key in metric_names}
        generated = datetime.now(timezone.utc).isoformat()

        report = {
            "generated_at_utc": generated,
            "status": "ok",
            "traffic_seen_today": traffic_seen,
            "today": today,
            "yesterday": yesterday,
            "change_vs_yesterday_percent": changes,
            "realtime_last_30_minutes": realtime,
            "daily_active_users_7d": daily_active_users,
            "top_channels_today": channels,
            "top_sources_today": sources,
            "top_pages_today": pages,
            "top_cities_today": cities,
            "devices_today": devices,
            "note": "GA4 same-day totals are intraday and can still be adjusted by Google Analytics processing.",
        }
        JSON_OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

        yes_no = "YES" if traffic_seen else "NO"
        text_lines = [
            "NEXUSNOVA TODAY TRAFFIC PULSE",
            "=" * 31,
            f"Traffic seen today: {yes_no}",
            (
                f"Today: {fmt_number(today['activeUsers'])} active users, "
                f"{fmt_number(today['newUsers'])} new users, {fmt_number(today['sessions'])} sessions, "
                f"{fmt_number(today['engagedSessions'])} engaged sessions, {fmt_percent(today['engagementRate'])} engagement rate"
            ),
            (
                f"Content/events: {fmt_number(today['screenPageViews'])} page views, "
                f"{fmt_number(today['eventCount'])} events, {fmt_number(today['keyEvents'])} key events"
            ),
            (
                f"Realtime last 30m: {fmt_number(realtime['activeUsers'])} active users, "
                f"{fmt_number(realtime['screenPageViews'])} page views, {fmt_number(realtime['eventCount'])} events"
            ),
            "Note: today's GA4 totals are intraday and may still adjust during processing.",
        ]
        TEXT_OUT.write_text("\n".join(text_lines) + "\n", encoding="utf-8")

        status_icon = "✅" if traffic_seen else "⚪"
        md = [
            "## NexusNova Today Traffic Pulse",
            "",
            f"{status_icon} **Traffic seen today: {yes_no}**",
            "",
            "| Metric | Today | Yesterday | Change |",
            "|---|---:|---:|---:|",
        ]
        labels = {
            "activeUsers": "Active users",
            "newUsers": "New users",
            "sessions": "Sessions",
            "engagedSessions": "Engaged sessions",
            "engagementRate": "Engagement rate",
            "screenPageViews": "Page views",
            "eventCount": "Event count",
            "keyEvents": "Key events",
        }
        for key in metric_names:
            change = changes[key]
            change_text = "n/a" if change is None else f"{change:+.1f}%"
            today_text = fmt_percent(today[key]) if key == "engagementRate" else fmt_number(today[key])
            yesterday_text = fmt_percent(yesterday[key]) if key == "engagementRate" else fmt_number(yesterday[key])
            md.append(f"| {labels[key]} | {today_text} | {yesterday_text} | {change_text} |")

        md += [
            "",
            "### Realtime — last 30 minutes",
            f"**{fmt_number(realtime['activeUsers'])} active users** · {fmt_number(realtime['screenPageViews'])} page views · {fmt_number(realtime['eventCount'])} events",
        ]

        if daily_active_users:
            md += ["", "### 7-day active-user trend"]
            for item in daily_active_users:
                md.append(f"- `{item['date']}` — {fmt_number(item['active_users'])} active users")

        if channels:
            md += ["", "### Traffic channels today"]
            for item in channels[:5]:
                md.append(f"- `{item['channel'] or '(not set)'}` — {fmt_number(item['sessions'])} sessions")

        if sources:
            md += ["", "### Top sources / medium today"]
            for item in sources[:5]:
                md.append(f"- `{item['source_medium'] or '(not set)'}` — {fmt_number(item['sessions'])} sessions")

        if pages:
            md += ["", "### Top pages today"]
            for item in pages[:5]:
                md.append(f"- `{item['page'] or '/'}` — {fmt_number(item['views'])} views")

        if cities:
            md += ["", "### Top cities today"]
            for item in cities[:5]:
                md.append(f"- `{item['city'] or '(not set)'}` — {fmt_number(item['active_users'])} active users")

        if devices:
            md += ["", "### Devices today"]
            for item in devices[:5]:
                md.append(f"- `{item['device'] or '(not set)'}` — {fmt_number(item['active_users'])} active users")

        md += [
            "",
            "> GA4 same-day totals are intraday and can still be adjusted by Google Analytics processing.",
            f"Generated: `{generated}`",
        ]
        MD_OUT.write_text("\n".join(md) + "\n", encoding="utf-8")
        print("\n".join(text_lines))
    except Exception as exc:
        message = str(exc)
        write_failure(message)
        print(f"Today Traffic Pulse failed: {message}", file=sys.stderr)
        raise


if __name__ == "__main__":
    main()
