from __future__ import annotations

import html
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime
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


def rate(value: float | int | None) -> str:
    return f"{float(value or 0) * 100:.1f}%"


def short_date(value: str) -> str:
    try:
        return datetime.strptime(value, "%Y-%m-%d").strftime("%b %-d")
    except (ValueError, OSError):
        try:
            return datetime.strptime(value, "%Y-%m-%d").strftime("%b %d").replace(" 0", " ")
        except ValueError:
            return value


def load_report() -> dict:
    if not JSON_REPORT.exists():
        return {"status": "error", "error": "Traffic pulse report was not generated."}
    try:
        return json.loads(JSON_REPORT.read_text(encoding="utf-8"))
    except Exception as exc:
        return {"status": "error", "error": f"Could not read traffic report: {exc}"}


def lines_for(items: list[dict], name_key: str, value_key: str, unit: str) -> list[str]:
    return [
        f"- {item.get(name_key) or '(not set)'}: {fmt(item.get(value_key))} {unit}"
        for item in items[:5]
    ]


def html_for(items: list[dict], name_key: str, value_key: str, unit: str) -> str:
    return "".join(
        f"<li><code>{html.escape(str(item.get(name_key) or '(not set)'))}</code> — {html.escape(fmt(item.get(value_key)))} {html.escape(unit)}</li>"
        for item in items[:5]
    ) or "<li>No data yet</li>"


def trend_text(items: list[dict]) -> list[str]:
    if not items:
        return ["- No 7-day trend data yet"]
    return [
        f"- {short_date(str(item.get('date') or ''))}: {fmt(item.get('active_users'))} active users"
        for item in items
    ]


def trend_chart_html(items: list[dict]) -> str:
    if not items:
        return "<p>No 7-day trend data yet.</p>"

    values = [float(item.get("active_users") or 0) for item in items]
    peak = max(values) if values else 0.0
    rows: list[str] = []
    for item, value in zip(items, values):
        width = 0 if peak <= 0 else max(4, round((value / peak) * 100))
        label = html.escape(short_date(str(item.get("date") or "")))
        value_text = html.escape(fmt(value))
        rows.append(
            "<tr>"
            f"<td style=\"padding:5px 8px 5px 0;width:58px;white-space:nowrap;color:#4b5563;font-size:12px\">{label}</td>"
            "<td style=\"padding:5px 8px;width:100%\">"
            "<div style=\"background:#eef2f7;border-radius:6px;overflow:hidden;height:14px\">"
            f"<div style=\"width:{width}%;height:14px;background:#2563eb;border-radius:6px\"></div>"
            "</div>"
            "</td>"
            f"<td style=\"padding:5px 0 5px 8px;width:52px;text-align:right;white-space:nowrap;font-weight:700\">{value_text}</td>"
            "</tr>"
        )
    return (
        "<div style=\"margin:18px 0 22px\">"
        "<h3 style=\"margin-bottom:6px\">7-day active-user graph</h3>"
        "<p style=\"margin-top:0;color:#6b7280;font-size:13px\">Longer bar = more active users that day.</p>"
        "<table role=\"presentation\" style=\"border-collapse:collapse;width:100%\">"
        + "".join(rows)
        + "</table></div>"
    )


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
        <div style="font-family:Arial,sans-serif;max-width:720px;margin:auto;color:#111827">
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
    daily_trend = report.get("daily_active_users_7d") or []
    channels = report.get("top_channels_today") or []
    sources = report.get("top_sources_today") or []
    pages = report.get("top_pages_today") or []
    cities = report.get("top_cities_today") or []
    devices = report.get("devices_today") or []

    users = fmt(today.get("activeUsers"))
    new_users = fmt(today.get("newUsers"))
    sessions = fmt(today.get("sessions"))
    engaged = fmt(today.get("engagedSessions"))
    engagement_rate = rate(today.get("engagementRate"))
    views = fmt(today.get("screenPageViews"))
    events = fmt(today.get("eventCount"))
    key_events = fmt(today.get("keyEvents"))
    realtime_users = fmt(realtime.get("activeUsers"))
    realtime_views = fmt(realtime.get("screenPageViews"))
    realtime_events = fmt(realtime.get("eventCount"))
    subject = f"NexusNova Traffic - {users} users, {sessions} sessions today"

    channel_lines = lines_for(channels, "channel", "sessions", "sessions")
    source_lines = lines_for(sources, "source_medium", "sessions", "sessions")
    page_lines = lines_for(pages, "page", "views", "views")
    city_lines = lines_for(cities, "city", "active_users", "active users")
    device_lines = lines_for(devices, "device", "active_users", "active users")
    trend_lines = trend_text(daily_trend)

    text = "\n".join(
        [
            "NexusNova Traffic Pulse",
            "",
            f"Today: {users} active users, {new_users} new users, {sessions} sessions",
            f"Engagement: {engaged} engaged sessions, {engagement_rate} engagement rate",
            f"Content/events: {views} page views, {events} events, {key_events} key events",
            f"Realtime (last 30 min): {realtime_users} active users, {realtime_views} page views, {realtime_events} events",
            (
                "Change vs yesterday: "
                f"users {pct(changes.get('activeUsers'))}, sessions {pct(changes.get('sessions'))}, "
                f"views {pct(changes.get('screenPageViews'))}, events {pct(changes.get('eventCount'))}"
            ),
            "",
            "7-day active-user trend:",
            *trend_lines,
            "",
            "Traffic channels:",
            *(channel_lines or ["- No channel data yet"]),
            "",
            "Source / medium:",
            *(source_lines or ["- No source data yet"]),
            "",
            "Top pages:",
            *(page_lines or ["- No page data yet"]),
            "",
            "Top cities:",
            *(city_lines or ["- No city data yet"]),
            "",
            "Devices:",
            *(device_lines or ["- No device data yet"]),
            "",
            "GA4 same-day totals are intraday and may still adjust.",
            "GitHub Actions: https://github.com/fahadsoomro123/nexusnova-website/actions/workflows/today-traffic-pulse.yml",
        ]
    ) + "\n"

    channel_html = html_for(channels, "channel", "sessions", "sessions")
    source_html = html_for(sources, "source_medium", "sessions", "sessions")
    page_html = html_for(pages, "page", "views", "views")
    city_html = html_for(cities, "city", "active_users", "active users")
    device_html = html_for(devices, "device", "active_users", "active users")
    graph_html = trend_chart_html(daily_trend)

    body = f"""
    <div style="font-family:Arial,sans-serif;max-width:720px;margin:auto;color:#111827;line-height:1.5">
      <h2 style="margin-bottom:6px">NexusNova Traffic Pulse</h2>
      <p style="margin-top:0;color:#4b5563">GA4 traffic snapshot for nexusnovatools.com</p>
      <table style="border-collapse:collapse;width:100%;margin:18px 0">
        <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Active users</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right"><strong>{html.escape(users)}</strong></td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">New users</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right"><strong>{html.escape(new_users)}</strong></td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Sessions</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right"><strong>{html.escape(sessions)}</strong></td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Engaged sessions</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right"><strong>{html.escape(engaged)}</strong></td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Engagement rate</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right"><strong>{html.escape(engagement_rate)}</strong></td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Page views</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right"><strong>{html.escape(views)}</strong></td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Event count</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right"><strong>{html.escape(events)}</strong></td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Key events</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right"><strong>{html.escape(key_events)}</strong></td></tr>
        <tr><td style="padding:8px">Realtime (30m)</td><td style="padding:8px;text-align:right"><strong>{html.escape(realtime_users)} users · {html.escape(realtime_views)} views · {html.escape(realtime_events)} events</strong></td></tr>
      </table>
      <p><strong>Vs yesterday:</strong> users {html.escape(pct(changes.get('activeUsers')))} · sessions {html.escape(pct(changes.get('sessions')))} · views {html.escape(pct(changes.get('screenPageViews')))} · events {html.escape(pct(changes.get('eventCount')))}</p>
      {graph_html}
      <h3>Traffic channels</h3><ul>{channel_html}</ul>
      <h3>Source / medium</h3><ul>{source_html}</ul>
      <h3>Top pages</h3><ul>{page_html}</ul>
      <h3>Top cities</h3><ul>{city_html}</ul>
      <h3>Devices</h3><ul>{device_html}</ul>
      <p style="font-size:13px;color:#6b7280">GA4 same-day totals are intraday and can still adjust during processing. Small city/source values can also be withheld or grouped by GA4 privacy thresholds.</p>
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
            "User-Agent": "NexusNovaTrafficMailer/1.2",
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
