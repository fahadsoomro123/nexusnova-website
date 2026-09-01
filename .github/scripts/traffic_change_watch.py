from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

GA4_PROPERTY_ID = os.getenv("GA4_PROPERTY_ID", "").strip()
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()
TO_EMAIL = os.getenv("TRAFFIC_ALERT_TO", "fahadsoomro123@gmail.com").strip()
FROM_EMAIL = os.getenv("TRAFFIC_ALERT_FROM", "NexusNova Traffic <traffic@nexusnovatools.com>").strip()
REPLY_TO = os.getenv("TRAFFIC_ALERT_REPLY_TO", TO_EMAIL).strip()
TIME_ZONE = os.getenv("TRAFFIC_TIME_ZONE", "Asia/Karachi").strip() or "Asia/Karachi"


def post_json(url: str, payload: dict, token: str | None = None) -> dict:
    headers = {"Content-Type": "application/json", "User-Agent": "NexusNovaTrafficChangeWatch/1.0"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        raw = response.read().decode("utf-8", errors="replace")
        return json.loads(raw) if raw else {}


def google_token() -> str:
    raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw or not GA4_PROPERTY_ID:
        raise RuntimeError("GA4 credentials/property are not configured")
    from google.auth.transport.requests import Request
    from google.oauth2 import service_account

    creds = service_account.Credentials.from_service_account_info(
        json.loads(raw), scopes=["https://www.googleapis.com/auth/analytics.readonly"]
    )
    creds.refresh(Request())
    if not creds.token:
        raise RuntimeError("Google Analytics access token was empty")
    return creds.token


def hourly_rows(token: str) -> dict[str, dict[str, float]]:
    endpoint = f"https://analyticsdata.googleapis.com/v1beta/properties/{GA4_PROPERTY_ID}:runReport"
    payload = {
        "dateRanges": [{"startDate": "yesterday", "endDate": "today"}],
        "dimensions": [{"name": "dateHour"}],
        "metrics": [
            {"name": "sessions"},
            {"name": "activeUsers"},
            {"name": "screenPageViews"},
        ],
        "limit": 100,
    }
    data = post_json(endpoint, payload, token)
    result: dict[str, dict[str, float]] = {}
    for row in data.get("rows") or []:
        dims = row.get("dimensionValues") or []
        metrics = row.get("metricValues") or []
        if not dims:
            continue
        key = str(dims[0].get("value") or "")
        if len(key) != 10:
            continue
        values = []
        for index in range(3):
            raw = metrics[index].get("value", "0") if index < len(metrics) else "0"
            values.append(float(raw or 0))
        result[key] = {"sessions": values[0], "users": values[1], "views": values[2]}
    return result


def fmt(value: float) -> str:
    return str(int(value)) if float(value).is_integer() else f"{value:.1f}"


def detect_change(current: dict[str, float], baseline: dict[str, float]) -> tuple[str, str] | None:
    sessions = current["sessions"]
    previous = baseline["sessions"]

    # Deliberately conservative thresholds: small-volume noise should not create email spam.
    if previous <= 0:
        if sessions >= 8:
            return "spike", "Traffic jumped from 0 sessions in the same hour yesterday to at least 8 sessions."
        return None

    ratio = sessions / previous
    if sessions >= 8 and ratio >= 2.5:
        return "spike", f"Sessions are {ratio:.1f}× the same completed hour yesterday."
    if previous >= 5 and ratio <= 0.30:
        return "drop", f"Sessions are down {((1 - ratio) * 100):.0f}% versus the same completed hour yesterday."
    return None


def send_alert(kind: str, reason: str, hour_label: str, current: dict[str, float], baseline: dict[str, float]) -> str:
    if not RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY is not configured")
    title = "Traffic spike" if kind == "spike" else "Traffic drop"
    subject = f"NexusNova {title} - {fmt(current['sessions'])} sessions in {hour_label}"
    text = (
        f"NexusNova {title}\n\n"
        f"Completed hour: {hour_label} ({TIME_ZONE})\n"
        f"Current: {fmt(current['sessions'])} sessions, {fmt(current['users'])} active users, {fmt(current['views'])} page views\n"
        f"Same hour yesterday: {fmt(baseline['sessions'])} sessions, {fmt(baseline['users'])} active users, {fmt(baseline['views'])} page views\n\n"
        f"Why this alert: {reason}\n\n"
        "This watcher uses conservative thresholds so ordinary small-volume changes do not trigger email.\n"
    )
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#111827;line-height:1.5">
      <h2>NexusNova {title}</h2>
      <p><strong>Completed hour:</strong> {hour_label} ({TIME_ZONE})</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <tr><th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb">Metric</th><th style="text-align:right;padding:8px;border-bottom:1px solid #e5e7eb">Current</th><th style="text-align:right;padding:8px;border-bottom:1px solid #e5e7eb">Yesterday</th></tr>
        <tr><td style="padding:8px">Sessions</td><td style="padding:8px;text-align:right"><strong>{fmt(current['sessions'])}</strong></td><td style="padding:8px;text-align:right">{fmt(baseline['sessions'])}</td></tr>
        <tr><td style="padding:8px">Active users</td><td style="padding:8px;text-align:right"><strong>{fmt(current['users'])}</strong></td><td style="padding:8px;text-align:right">{fmt(baseline['users'])}</td></tr>
        <tr><td style="padding:8px">Page views</td><td style="padding:8px;text-align:right"><strong>{fmt(current['views'])}</strong></td><td style="padding:8px;text-align:right">{fmt(baseline['views'])}</td></tr>
      </table>
      <p><strong>Why this alert:</strong> {reason}</p>
      <p style="font-size:13px;color:#6b7280">Conservative thresholds are used to avoid emails for ordinary small-volume variation.</p>
    </div>
    """
    payload = {
        "from": FROM_EMAIL,
        "to": [TO_EMAIL],
        "subject": subject,
        "text": text,
        "html": html,
        "reply_to": [REPLY_TO],
    }
    request = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "NexusNovaTrafficChangeWatch/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8", errors="replace")
            result = json.loads(raw) if raw else {}
            return str(result.get("id") or "unknown")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Resend returned HTTP {exc.code}: {detail}") from exc


def main() -> None:
    now = datetime.now(ZoneInfo(TIME_ZONE))
    completed = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=1)
    yesterday = completed - timedelta(days=1)
    current_key = completed.strftime("%Y%m%d%H")
    previous_key = yesterday.strftime("%Y%m%d%H")
    hour_label = completed.strftime("%d %b %Y %H:00")

    rows = hourly_rows(google_token())
    current = rows.get(current_key, {"sessions": 0.0, "users": 0.0, "views": 0.0})
    baseline = rows.get(previous_key, {"sessions": 0.0, "users": 0.0, "views": 0.0})
    change = detect_change(current, baseline)

    print(
        f"Completed hour {hour_label}: {fmt(current['sessions'])} sessions; "
        f"same hour yesterday: {fmt(baseline['sessions'])} sessions."
    )
    if not change:
        print("No meaningful traffic change. No email sent.")
        return

    kind, reason = change
    message_id = send_alert(kind, reason, hour_label, current, baseline)
    print(f"Meaningful {kind} alert sent through Resend. id={message_id}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Traffic change watch failed: {exc}", file=sys.stderr)
        raise
