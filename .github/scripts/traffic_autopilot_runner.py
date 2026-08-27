from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone

import feedparser
import ai_provider
import traffic_autopilot as core

SOURCES = [
    {"name": "Google Search Central", "url": "https://feeds.feedburner.com/blogspot/amDG", "category": "Search & SEO", "weight": 5},
    {"name": "Chrome Releases", "url": "https://chromereleases.googleblog.com/feeds/posts/default", "category": "Browser", "weight": 5},
    {"name": "Google Security Blog", "url": "https://security.googleblog.com/feeds/posts/default", "category": "Security", "weight": 5},
    {"name": "GitHub Changelog", "url": "https://github.blog/changelog/feed/", "category": "Developer", "weight": 5},
    {"name": "GitHub Blog", "url": "https://github.blog/feed/", "category": "Developer", "weight": 3},
    {"name": "Cloudflare Blog", "url": "https://blog.cloudflare.com/rss/", "category": "Cloud", "weight": 4},
    {"name": "Microsoft Windows Blog", "url": "https://blogs.windows.com/feed/", "category": "Windows", "weight": 4},
    {"name": "OpenAI News", "url": "https://openai.com/news/rss.xml", "category": "AI", "weight": 5},
]


def parsed_time(entry) -> datetime | None:
    value = entry.get("published_parsed") or entry.get("updated_parsed")
    if value:
        try:
            return datetime(*value[:6], tzinfo=timezone.utc)
        except Exception:
            pass
    return core.parse_date(entry.get("published", "") or entry.get("updated", ""))


def direct_link(entry, feed_url: str) -> str:
    candidates = [entry.get("link", ""), entry.get("id", "")]
    for item in entry.get("links", []) or []:
        if item.get("rel", "alternate") == "alternate":
            candidates.insert(0, item.get("href", ""))
    feed_norm = feed_url.rstrip("/")
    for value in candidates:
        value = (value or "").strip()
        if value.startswith(("https://", "http://")) and value.rstrip("/") != feed_norm:
            lower = value.lower().rstrip("/")
            if "/feeds/" in lower or lower.endswith(("/feed", "/rss", "/rss.xml")):
                continue
            if "feeds.feedburner.com" in lower:
                continue
            if value.startswith("http://"):
                value = "https://" + value[len("http://"):]
            return value
    return ""


def collect_trends() -> tuple[list[dict], list[str]]:
    rows: list[dict] = []
    errors: list[str] = []
    for source in SOURCES:
        feed = feedparser.parse(source["url"], agent="NexusNovaTrafficAutopilot/2.2 (+https://nexusnovatools.com/)")
        if getattr(feed, "bozo", False) and not feed.entries:
            errors.append(f"{source['name']}: feed parse failed")
            continue
        for entry in feed.entries[:25]:
            url = direct_link(entry, source["url"])
            title = core.clean_text(entry.get("title", ""))
            if not title or not url:
                continue
            summary = core.clean_text(entry.get("summary", "") or entry.get("description", ""))
            # Feed metadata comes first so the resolved per-entry URL cannot be overwritten by source['url'].
            row = {**source, "title": title, "url": url, "summary": summary, "published": parsed_time(entry)}
            row["category"] = core.infer_category(f"{title} {summary}", source["category"])
            row["score"] = core.score_item(row)
            rows.append(row)

    rows.sort(key=lambda row: (row["score"], row.get("published") or datetime(1970, 1, 1, tzinfo=timezone.utc)), reverse=True)
    selected: list[dict] = []
    seen: set[str] = set()
    category_counts: dict[str, int] = {}
    for row in rows:
        key = core.normalize_title(row["title"])
        published = row.get("published")
        if isinstance(published, datetime) and core.NOW - published > timedelta(days=35):
            continue
        if row["score"] < 7 or not key or key in seen or category_counts.get(row["category"], 0) >= 2:
            continue
        seen.add(key)
        category_counts[row["category"]] = category_counts.get(row["category"], 0) + 1
        selected.append(row)
        if len(selected) >= 8:
            break
    return selected, errors


def main() -> None:
    if not os.getenv("GSC_SITE_URL", "").strip():
        os.environ["GSC_SITE_URL"] = "sc-domain:nexusnovatools.com"
    # Keep the established article builder and safety gates, but route its AI call
    # through the Gemini-first provider with OpenAI used only as technical failover.
    core.ai_json = ai_provider.ai_json
    history = core.load_json(core.HISTORY_PATH, {"version": 1, "articles": [], "seo_refresh": {}})
    trends, feed_errors = collect_trends()
    pulse = core.write_pulse(trends)
    opportunities, analytics_report = core.google_signals()
    candidate = core.choose_article_candidate(trends, history)
    published = core.build_article(candidate, history, opportunities) if candidate else None
    changed_urls = [f"{core.SITE}/", f"{core.SITE}/articles.html"]
    if published:
        history.setdefault("articles", []).insert(0, published)
        history["articles"] = history["articles"][:60]
        changed_urls.append(published["url"])
        core.PUBLISH_PATH.write_text(json.dumps(published, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    elif core.PUBLISH_PATH.exists():
        core.PUBLISH_PATH.unlink()
    core.HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    core.HISTORY_PATH.write_text(json.dumps(history, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    core.update_discovery(history)
    core.CHANGED_URLS_PATH.write_text("\n".join(dict.fromkeys(changed_urls)) + "\n", encoding="utf-8")
    report = {
        "run_at": core.NOW.isoformat().replace("+00:00", "Z"),
        "trend_items_selected": len(pulse.get("items", [])),
        "feed_errors": feed_errors,
        "article_published": published,
        "article_candidate": core.public_item(candidate) if candidate else None,
        "ai": ai_provider.status(),
        "analytics": analytics_report,
        "search_opportunities": opportunities[:20],
        "safety": {"max_articles_per_run": 1, "minimum_article_score": 14, "source_allowlist_only": True, "direct_article_urls_only": True, "live_tech_max_age_days": 35, "no_publish_when_source_too_thin": True, "gemini_primary_openai_failover_only": True},
    }
    core.REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    ai_status = ai_provider.status()
    print(json.dumps({"trend_items": len(pulse.get("items", [])), "published": published["url"] if published else None, "ai_provider": ai_status.get("provider"), "gsc_connected": analytics_report.get("connected", False), "feed_errors": len(feed_errors)}, indent=2))


if __name__ == "__main__":
    main()
