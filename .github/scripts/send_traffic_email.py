from __future__ import annotations

import html
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
JSON_REPORT = ROOT / "today-traffic-pulse.json"

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()
TO_EMAIL = os.getenv("TRAFFIC_ALERT_TO", "fahadsoomro123@gmail.com").strip()
FROM_EMAIL = os.getenv("TRAFFIC_ALERT_FROM", "NexusNova Traffic <traffic@nexusnovatools.com>").strip()
REPLY_TO = os.getenv("TRAFFIC_ALERT_REPLY_TO", TO_EMAIL).strip()


def fmt(value: float | int | str | None) -> str:
    try:
        number = float(value or 0)
    except (TypeError, ValueError):
        return str(value or "0")
    return str(int(number)) if number.is_integer() else f"{number:.1f}"


def pct(value: float | int | None) -> str:
    if value is None:
        return "n/a"
    return f"{float(value):+.1f}%"


def load_report() -> dict:
    if not JSON_REPORT.exists():
        return {"status": "error", "error": "Traffic pulse report was not generated."}
    try:
        return json.loads(JSON_REPORT.read_text(encoding="utf-8"))
    except Exception as exc:
        return {"status": "error", "error": f"Could not read traffic report: {exc}"}


def build_message(report: dict) -> tuple[str, str, str]:
    if report.get("status") != "ok":
        error = str(report.get("error") or "Unknown traffic-pulse failure")
        subject = "NexusNova Traffic Alert - report failed"
        text = (
            "NexusNova Traffic Alert\n\n"
            f"Traffic report failed: {error}\n\n"
            "Open GitHub Actions for the full workflow logs.\n"
        )
        body = f"""
        <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#111827">
          <h2 style="margin-bottom:8px">NexusNova Traffic Alert</h2>
          <p><strong>Traffic report failed.</strong></p>
          <p>{html.escape(error)}</p>
          <p><a href="https://github.com/fahadsoomro123/nexusnova-website/actions/workflows/today-traffic-pulse.yml">Open GitHub Actions</a></p>
        </div>
        """
        return subject, text, body

    today = report.get("today") or {}
    changes = report.get("change_vs_yesterday_percent") or {}
    realtime = report.get("realtime_last_30_minutes") or {}
    sources = report.get("top_sources_today") or []
    pages = report.get("top_pages_today") or []

    users = fmt(today.get("activeUsers"))
    sessions = fmt(today.get("sessions"))
    views = fmt(today.get("screenPageViews"))
    realtime_users = fmt(realtime.get("activeUsers"))
    subject = f"NexusNova Traffic - {users} users, {sessions} sessions today"

    source_lines = [
        f"- {item.get('source_medium') or '(not set)'}: {fmt(item.get('sessions'))} sessions"
        for item in sources[:5]
    ]
    page_lines = [
        f"- {item.get('page') or '/'}: {fmt(item.get('views'))} views"
        for item in pages[:5]
    ]

    text = "\n".join(
        [
            "NexusNova Traffic Pulse",
            "",
            f"Today: {users} active users, {sessions} sessions, {views} page views",
            f"Realtime (last 30 min): {realtime_users} active users",
            f"Change vs yesterday: users {pct(changes.get('activeUsers'))}, sessions {pct(changes.get('sessions'))}",
            "",
            "Top sources:",
            *(source_lines or ["- No source data yet"]),
            "",
            "Top pages:",
            *(page_lines or ["- No page data yet"]),
            "",
            "GA4 same-day totals are intraday and may still adjust.",
            "GitHub Actions: https://github.com/fahadsoomro123/nexusnova-website/actions/workflows/today-traffic-pulse.yml",
        ]
    ) + "\n"

    source_html = "".join(
        f"<li><code>{html.escape(str(item.get('source_medium') or '(not set)'))}</code> — {html.escape(fmt(item.get('sessions')))} sessions</li>"
        for item in sources[:5]
    ) or "<li>No source data yet</li>"
    page_html = "".join(
        f"<li><code>{html.escape(str(item.get('page') or '/'))}</code> — {html.escape(fmt(item.get('views')))} views</li>"
        for item in pages[:5]
    ) or "<li>No page data yet</li>"

    body = f"""
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#111827;line-height:1.5">
      <h2 style="margin-bottom:6px">NexusNova Traffic Pulse</h2>
      <p style="margin-top:0;color:#4b5563">Transactional traffic alert from nexusnovatools.com</p>
      <table style="border-collapse:collapse;width:100%;margin:18px 0">
        <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Active users today</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right"><strong>{html.escape(users)}</strong></td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Sessions today</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right"><strong>{html.escape(sessions)}</strong></td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Page views today</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right"><strong>{html.escape(views)}</strong></td></tr>
        <tr><td style="padding:8px">Realtime active users (30m)</td><td style="padding:8px;text-align:right"><strong>{html.escape(realtime_users)}</strong></td></tr>
      </table>
      <p><strong>Vs yesterday:</strong> users {html.escape(pct(changes.get('activeUsers')))}, sessions {html.escape(pct(changes.get('sessions')))}</p>
      <h3>Top sources</h3><ul>{source_html}</ul>
      <h3>Top pages</h3><ul>{page_html}</ul>
      <p style="font-size:13px;color:#6b7280">GA4 same-day totals are intraday and may still adjust during processing.</p>
      <p><a href="https://github.com/fahadsoomro123/nexusnova-website/actions/workflows/today-traffic-pulse.yml">Open GitHub traffic workflow</a></p>
    </div>
    """
    return subject, text, body


def send_email(subject: str, text: str, body: str) -> dict:
    if not RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY is not configured")
    if not TO_EMAIL:
        raise RuntimeError("TRAFFIC_ALERT_TO is empty")

    payload = {
        "from": FROM_EMAIL,
        "to": [TO_EMAIL],
        "subject": subject,
        "text": text,
        "html": body,
        "reply_to": [REPLY_TO],
    }
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "NexusNovaTrafficMailer/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read().decode("utf-8", errors="replace")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Resend returned HTTP {exc.code}: {detail}") from exc


def main() -> None:
    report = load_report()
    subject, text, body = build_message(report)
    result = send_email(subject, text, body)
    print(f"Resend traffic email accepted. id={result.get('id') or 'unknown'}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Traffic email failed: {exc}", file=sys.stderr)
        raise
