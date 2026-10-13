#!/usr/bin/env python3
"""Safely refresh the public Live Tech Pulse from fresh official RSS items."""
from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlsplit

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import traffic_autopilot as core
import traffic_autopilot_runner as runner

MIN_FRESH_ITEMS = 3
MAX_ITEMS = 8
MAX_PUBLICATION_AGE = timedelta(days=35)
MAX_FUTURE_SKEW = timedelta(hours=6)
MAX_GENERATION_SKEW = timedelta(minutes=5)

OFFICIAL_SOURCE_HOSTS = {
    "Google Search Central": {"developers.google.com", "developers.googleblog.com", "blog.google"},
    "Chrome Releases": {"chromereleases.googleblog.com", "chrome.googleblog.com", "developer.chrome.com"},
    "Google Security Blog": {"security.googleblog.com", "blog.google"},
    "GitHub Changelog": {"github.blog", "github.com"},
    "GitHub Blog": {"github.blog"},
    "Cloudflare Blog": {"blog.cloudflare.com", "developers.cloudflare.com"},
    "Microsoft Windows Blog": {"blogs.windows.com", "support.microsoft.com"},
    "OpenAI News": {"openai.com", "www.openai.com"},
}


def utc_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def parse_timestamp(value: object) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        return utc_datetime(datetime.fromisoformat(value.strip().replace("Z", "+00:00")))
    except (TypeError, ValueError):
        return None


def is_approved_official_url(source: str, url: str) -> bool:
    allowed_hosts = OFFICIAL_SOURCE_HOSTS.get(source)
    if not allowed_hosts:
        return False
    try:
        parsed = urlsplit(url)
        host = (parsed.hostname or "").lower()
        port = parsed.port
    except ValueError:
        return False
    return (
        parsed.scheme.lower() == "https"
        and host in allowed_hosts
        and not parsed.username
        and not parsed.password
        and port in (None, 443)
    )


def select_fresh_rows(rows: list[dict], now: datetime) -> list[dict]:
    now = utc_datetime(now)
    configured_sources = {entry.get("name") for entry in runner.SOURCES}
    fresh: list[dict] = []
    seen_urls: set[str] = set()

    for row in rows:
        if not isinstance(row, dict):
            continue
        source = str(row.get("name", "")).strip()
        title = str(row.get("title", "")).strip()
        url = str(row.get("url", "")).strip()
        published = row.get("published")
        if source not in configured_sources or not title or not url:
            continue
        if not is_approved_official_url(source, url):
            continue
        if not isinstance(published, datetime):
            continue
        published = utc_datetime(published)
        age = now - published
        if age > MAX_PUBLICATION_AGE or age < -MAX_FUTURE_SKEW:
            continue

        dedupe_key = url.split("#", 1)[0].rstrip("/").lower()
        if dedupe_key in seen_urls:
            continue
        seen_urls.add(dedupe_key)
        copied = dict(row)
        copied["published"] = published
        fresh.append(copied)
        if len(fresh) >= MAX_ITEMS:
            break

    return fresh


def validate_payload(payload: dict, now: datetime) -> None:
    now = utc_datetime(now)
    if payload.get("version") != 1:
        raise ValueError("Live Tech Pulse schema version must remain 1.")
    generated_at = parse_timestamp(payload.get("generated_at"))
    if generated_at is None or abs(now - generated_at) > MAX_GENERATION_SKEW:
        raise ValueError("Live Tech Pulse generated_at is missing or not current.")
    items = payload.get("items")
    if not isinstance(items, list) or not (MIN_FRESH_ITEMS <= len(items) <= MAX_ITEMS):
        raise ValueError("Live Tech Pulse must contain 3 to 8 fresh official-source items.")
    if payload.get("top_stories") != items[:3]:
        raise ValueError("Live Tech Pulse top_stories must match its first three items.")

    seen_urls: set[str] = set()
    for item in items:
        if not isinstance(item, dict):
            raise ValueError("Live Tech Pulse contains a malformed item.")
        source = str(item.get("source", "")).strip()
        url = str(item.get("url", "")).strip()
        title = str(item.get("title", "")).strip()
        published = parse_timestamp(item.get("published"))
        if not source or not title or not is_approved_official_url(source, url) or published is None:
            raise ValueError("Live Tech Pulse item is missing a title, date, or approved source URL.")
        age = now - published
        if age > MAX_PUBLICATION_AGE or age < -MAX_FUTURE_SKEW:
            raise ValueError("Live Tech Pulse contains an expired or future-dated story.")
        dedupe_key = url.split("#", 1)[0].rstrip("/").lower()
        if dedupe_key in seen_urls:
            raise ValueError("Live Tech Pulse contains duplicate source URLs.")
        seen_urls.add(dedupe_key)

    tool = payload.get("tool_of_day")
    if not isinstance(tool, dict) or not isinstance(tool.get("url"), str):
        raise ValueError("Live Tech Pulse tool_of_day field is missing.")


def build_payload(rows: list[dict], now: datetime) -> dict:
    now = utc_datetime(now)
    fresh = select_fresh_rows(rows, now)
    if len(fresh) < MIN_FRESH_ITEMS:
        raise ValueError(
            f"Refresh blocked: only {len(fresh)} fresh official-source stories; "
            "at least 3 are required. The existing published dataset is preserved."
        )

    public_items = [core.public_item(row) for row in fresh]
    day_key = now.date().isoformat()
    tool = core.TOOLS[int(hashlib.sha256(day_key.encode()).hexdigest(), 16) % len(core.TOOLS)]
    payload = {
        "version": 1,
        "generated_at": now.isoformat().replace("+00:00", "Z"),
        "items": public_items,
        "top_stories": public_items[:3],
        "tool_of_day": {"title": tool[0], "url": tool[1], "summary": tool[2]},
    }
    validate_payload(payload, now)
    return payload


def refresh_from_rows(rows: list[dict], now: datetime, destination: Path | None = None) -> dict:
    """Validate a complete replacement before atomically writing the one data file."""
    payload = build_payload(rows, now)
    target = destination or core.PULSE_PATH
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(target.name + ".tmp")
    try:
        temporary.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        temporary.replace(target)
    finally:
        if temporary.exists():
            temporary.unlink()
    return payload


def main() -> None:
    rows, feed_errors = runner.collect_trends()
    now = datetime.now(timezone.utc)
    payload = refresh_from_rows(rows, now)
    print(json.dumps({
        "status": "PASS",
        "generated_at": payload["generated_at"],
        "fresh_items": len(payload["items"]),
        "sources": sorted({item["source"] for item in payload["items"]}),
        "feed_errors": feed_errors,
        "published_path": str(core.PULSE_PATH.relative_to(core.ROOT)),
        "stale_fallback_used": False,
    }, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
