from __future__ import annotations

import json
import os
import urllib.request
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "social-growth-metrics.json"
TRAFFIC = ROOT / "traffic-diagnosis.json"
PROPERTY_ID = os.getenv("GA4_PROPERTY_ID", "").strip()


def post_json(url: str, payload: dict, token: str) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "NexusNovaSocialGrowth/2.0 (+https://nexusnovatools.com/)",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        raw = response.read().decode("utf-8", errors="ignore")
        return json.loads(raw) if raw else {}


def google_token() -> tuple[str | None, str | None]:
    raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw:
        return None, "GOOGLE_SERVICE_ACCOUNT_JSON not configured"
    if not PROPERTY_ID:
        return None, "GA4_PROPERTY_ID not configured"
    try:
        from google.auth.transport.requests import Request
        from google.oauth2 import service_account

        creds = service_account.Credentials.from_service_account_info(
            json.loads(raw),
            scopes=["https://www.googleapis.com/auth/analytics.readonly"],
        )
        creds.refresh(Request())
        return creds.token, None
    except Exception as exc:
        return None, f"Google credential error: {exc}"


def main() -> None:
    token, error = google_token()
    if not token:
        payload = {"connected": False, "error": error, "campaigns": []}
        OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        print(f"Social growth metrics unavailable: {error}")
        return

    end = date.today() - timedelta(days=1)
    start = end - timedelta(days=27)
    endpoint = f"https://analyticsdata.googleapis.com/v1beta/properties/{PROPERTY_ID}:runReport"
    request = {
        "dateRanges": [{"startDate": start.isoformat(), "endDate": end.isoformat()}],
        "dimensions": [{"name": "sessionCampaignName"}],
        "metrics": [{"name": "sessions"}, {"name": "engagedSessions"}, {"name": "screenPageViews"}],
        "limit": 250,
    }

    try:
        data = post_json(endpoint, request, token)
        rows = []
        for row in data.get("rows") or []:
            dims = row.get("dimensionValues") or []
            metrics = row.get("metricValues") or []
            campaign = dims[0].get("value", "") if dims else ""
            if not campaign.startswith("social_growth_"):
                continue
            values = []
            for metric in metrics[:3]:
                try:
                    values.append(float(metric.get("value", "0") or 0))
                except Exception:
                    values.append(0.0)
            while len(values) < 3:
                values.append(0.0)
            sessions, engaged, views = values
            rows.append({
                "dimension": campaign,
                "sessions": round(sessions, 1),
                "engagedSessions": round(engaged, 1),
                "screenPageViews": round(views, 1),
                "engagementRate": round((engaged / sessions * 100) if sessions else 0, 1),
            })
        rows.sort(key=lambda item: (item["engagedSessions"], item["sessions"]), reverse=True)
        payload = {
            "connected": True,
            "range": [start.isoformat(), end.isoformat()],
            "campaigns": rows,
        }
    except Exception as exc:
        payload = {"connected": False, "error": str(exc), "campaigns": []}

    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Inject the feedback into the existing diagnosis so the selector has one input contract.
    try:
        diagnosis = json.loads(TRAFFIC.read_text(encoding="utf-8")) if TRAFFIC.exists() else {}
        ga4 = diagnosis.setdefault("ga4", {})
        if isinstance(ga4, dict):
            ga4["social_campaigns"] = payload.get("campaigns", [])
            diagnosis["social_growth_metrics"] = {
                "connected": payload.get("connected", False),
                "range": payload.get("range"),
                "campaign_count": len(payload.get("campaigns", [])),
                "error": payload.get("error"),
            }
            TRAFFIC.write_text(json.dumps(diagnosis, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    except Exception as exc:
        print(f"Traffic diagnosis enrichment warning: {exc}")

    print(f"Social growth campaigns with GA4 data: {len(payload.get('campaigns', []))}")
    for row in payload.get("campaigns", [])[:8]:
        print(
            f"- {row['dimension']}: {row['sessions']} sessions, "
            f"{row['engagedSessions']} engaged, {row['engagementRate']}% engagement"
        )


if __name__ == "__main__":
    main()
