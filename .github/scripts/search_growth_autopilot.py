from __future__ import annotations

import hashlib
import html
import json
import math
import os
import re
import urllib.parse
import urllib.request
from datetime import date, timedelta
from pathlib import Path
from typing import Any

from ai_provider import ai_json, status as ai_status

ROOT = Path(__file__).resolve().parents[2]
JSON_OUT = ROOT / "search-growth-opportunities.json"
TEXT_OUT = ROOT / "search-growth-opportunities.txt"
CHANGES_OUT = ROOT / "search-growth-changes.json"
CHANGED_FILES_OUT = ROOT / "search-growth-changed-files.txt"
HISTORY_FILE = ROOT / "assets/data/search-growth-history.json"

SITE_URL = os.getenv("GSC_SITE_URL", "sc-domain:nexusnovatools.com").strip() or "sc-domain:nexusnovatools.com"
SITE_HOST = "nexusnovatools.com"
AUTO_OPTIMIZE = os.getenv("NEXUSNOVA_AUTO_OPTIMIZE", "0").strip() == "1"
MIN_IMPRESSIONS = max(10, int(os.getenv("SEARCH_GROWTH_MIN_IMPRESSIONS", "20") or "20"))
COOLDOWN_DAYS = max(14, int(os.getenv("SEARCH_GROWTH_COOLDOWN_DAYS", "45") or "45"))

EXCLUDED_PATHS = {
    "/", "/index.html", "/login.html", "/register.html", "/account.html",
    "/privacy.html", "/terms.html", "/disclaimer.html", "/contact.html",
    "/about.html", "/editorial-policy.html", "/editorial-team.html",
    "/private-quick-note.html",
}
EXCLUDED_PREFIXES = ("/admin", "/account", "/auth", "/ota/")
STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how",
    "in", "is", "it", "of", "on", "or", "the", "to", "vs", "what", "with", "your",
}


def post_json(url: str, payload: dict[str, Any], token: str) -> dict[str, Any]:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "NexusNovaSearchGrowth/1.0 (+https://nexusnovatools.com/)",
        },
    )
    with urllib.request.urlopen(req, timeout=35) as response:
        raw = response.read().decode("utf-8", errors="ignore")
        return json.loads(raw) if raw else {}


def google_token() -> tuple[str | None, str | None]:
    raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw:
        return None, "GOOGLE_SERVICE_ACCOUNT_JSON not configured"
    try:
        from google.auth.transport.requests import Request
        from google.oauth2 import service_account

        creds = service_account.Credentials.from_service_account_info(
            json.loads(raw),
            scopes=["https://www.googleapis.com/auth/webmasters.readonly"],
        )
        creds.refresh(Request())
        return creds.token, None
    except Exception as exc:
        return None, f"Google credential error: {exc}"


def gsc_rows(token: str, start: date, end: date) -> list[dict[str, Any]]:
    endpoint = (
        "https://searchconsole.googleapis.com/webmasters/v3/sites/"
        + urllib.parse.quote(SITE_URL, safe="")
        + "/searchAnalytics/query"
    )
    data = post_json(
        endpoint,
        {
            "startDate": start.isoformat(),
            "endDate": end.isoformat(),
            "dimensions": ["query", "page"],
            "rowLimit": 1000,
            "dataState": "final",
        },
        token,
    )
    return data.get("rows") or []


def local_file_for(page_url: str) -> Path | None:
    try:
        parsed = urllib.parse.urlsplit(page_url)
    except Exception:
        return None
    host = (parsed.hostname or "").lower()
    if host not in {SITE_HOST, f"www.{SITE_HOST}"}:
        return None
    path = parsed.path or "/"
    if path in EXCLUDED_PATHS or any(path.startswith(prefix) for prefix in EXCLUDED_PREFIXES):
        return None
    if path.endswith("/"):
        path += "index.html"
    if not path.endswith(".html") or ".." in path:
        return None
    target = (ROOT / path.lstrip("/")).resolve()
    try:
        target.relative_to(ROOT.resolve())
    except ValueError:
        return None
    return target if target.is_file() else None


def terms(value: str) -> set[str]:
    return {
        token for token in re.findall(r"[a-z0-9]+", value.lower())
        if len(token) >= 3 and token not in STOPWORDS
    }


def build_opportunities(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for row in rows:
        keys = row.get("keys") or []
        if len(keys) < 2:
            continue
        query, page = str(keys[0]).strip(), str(keys[1]).strip()
        impressions = float(row.get("impressions", 0))
        clicks = float(row.get("clicks", 0))
        ctr = float(row.get("ctr", 0)) * 100
        position = float(row.get("position", 100))
        if impressions < MIN_IMPRESSIONS or not (18 <= position <= 90) or not local_file_for(page):
            continue
        ctr_gap = max(0.25, 3.0 - min(3.0, ctr))
        rank_weight = 1.0 + min(2.5, max(0.0, (90.0 - position) / 30.0))
        score = math.log1p(impressions) * ctr_gap * rank_weight
        items.append({
            "query": query,
            "page": page,
            "clicks": round(clicks, 1),
            "impressions": round(impressions, 1),
            "ctr": round(ctr, 2),
            "position": round(position, 1),
            "score": round(score, 4),
        })
    return sorted(items, key=lambda x: (x["score"], x["impressions"]), reverse=True)


def aggregate_pages(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    pages: dict[str, dict[str, Any]] = {}
    for item in items:
        bucket = pages.setdefault(item["page"], {
            "page": item["page"], "impressions": 0.0, "clicks": 0.0,
            "weighted_position": 0.0, "score": 0.0, "queries": [],
        })
        imp = float(item["impressions"])
        bucket["impressions"] += imp
        bucket["clicks"] += float(item["clicks"])
        bucket["weighted_position"] += float(item["position"]) * imp
        bucket["score"] += float(item["score"])
        if len(bucket["queries"]) < 8:
            bucket["queries"].append({k: item[k] for k in ("query", "impressions", "clicks", "ctr", "position")})
    result: list[dict[str, Any]] = []
    for bucket in pages.values():
        imp = bucket["impressions"]
        clicks = bucket["clicks"]
        result.append({
            "page": bucket["page"],
            "impressions": round(imp, 1),
            "clicks": round(clicks, 1),
            "ctr": round((clicks / imp * 100) if imp else 0.0, 2),
            "position": round(bucket["weighted_position"] / imp, 1) if imp else 0.0,
            "score": round(bucket["score"], 3),
            "queries": bucket["queries"],
        })
    return sorted(result, key=lambda x: (x["score"], x["impressions"]), reverse=True)


def load_history() -> dict[str, Any]:
    try:
        value = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else {"pages": {}}
    except Exception:
        return {"pages": {}}


def on_cooldown(page: str, history: dict[str, Any], today: date) -> bool:
    raw = ((history.get("pages") or {}).get(page) or {}).get("last_optimized")
    if not raw:
        return False
    try:
        last = date.fromisoformat(str(raw))
    except ValueError:
        return False
    return (today - last).days < COOLDOWN_DAYS


def extract_tag(text: str, pattern: str) -> str:
    match = re.search(pattern, text, re.I | re.S)
    if not match:
        return ""
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", match.group(1))).strip())


def page_context(text: str) -> dict[str, str]:
    title = extract_tag(text, r"<title[^>]*>(.*?)</title>")
    h1 = extract_tag(text, r"<h1[^>]*>(.*?)</h1>")
    tag = re.search(r"<meta\b[^>]*\bname=[\"']description[\"'][^>]*>", text, re.I)
    description = ""
    if tag:
        content = re.search(r"\bcontent=[\"'](.*?)[\"']", tag.group(0), re.I | re.S)
        if content:
            description = html.unescape(re.sub(r"\s+", " ", content.group(1)).strip())
    visible = re.sub(r"<script\b.*?</script>|<style\b.*?</style>", " ", text, flags=re.I | re.S)
    visible = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", visible))).strip()
    return {"title": title, "description": description, "h1": h1, "excerpt": visible[:6000]}


def fingerprint(text: str) -> dict[str, Any]:
    body = re.search(r"<body\b.*", text, re.I | re.S)
    body_text = body.group(0) if body else ""
    scripts = "\n".join(re.findall(r"<script\b.*?</script>", text, re.I | re.S))
    return {
        "body_sha256": hashlib.sha256(body_text.encode()).hexdigest(),
        "scripts_sha256": hashlib.sha256(scripts.encode()).hexdigest(),
        "script_count": len(re.findall(r"<script\b", text, re.I)),
    }


def replace_metadata(text: str, title: str, description: str) -> str | None:
    title_match = re.search(r"<title[^>]*>.*?</title>", text, re.I | re.S)
    desc_match = re.search(r"<meta\b[^>]*\bname=[\"']description[\"'][^>]*>", text, re.I)
    if not title_match or not desc_match:
        return None
    new_title = f"<title>{html.escape(title, quote=False)}</title>"
    old_tag = desc_match.group(0)
    escaped_desc = html.escape(description, quote=True)
    if re.search(r"\bcontent=[\"'].*?[\"']", old_tag, re.I | re.S):
        new_tag = re.sub(r"\bcontent=[\"'].*?[\"']", f'content="{escaped_desc}"', old_tag, count=1, flags=re.I | re.S)
    else:
        new_tag = old_tag[:-1].rstrip() + f' content="{escaped_desc}">'
    changed = text[:title_match.start()] + new_title + text[title_match.end():]
    desc_match = re.search(r"<meta\b[^>]*\bname=[\"']description[\"'][^>]*>", changed, re.I)
    if not desc_match:
        return None
    return changed[:desc_match.start()] + new_tag + changed[desc_match.end():]


def validate_candidate(candidate: dict[str, Any], current: dict[str, str], queries: list[dict[str, Any]]) -> tuple[bool, str, str, str]:
    if candidate.get("apply") is not True:
        return False, "", "", "AI declined change"
    title = re.sub(r"\s+", " ", str(candidate.get("title") or "")).strip()
    desc = re.sub(r"\s+", " ", str(candidate.get("description") or "")).strip()
    if not (30 <= len(title) <= 65):
        return False, "", "", "title length outside 30-65"
    if not (110 <= len(desc) <= 165):
        return False, "", "", "description length outside 110-165"
    if any(x in title + desc for x in ("\n", "\r", "<", ">", "http://", "https://")):
        return False, "", "", "unsafe markup or URL"
    lowered = (title + " " + desc).lower()
    if any(x in lowered for x in ("#1", "guaranteed", "100% accurate", "best in the world", "official google")):
        return False, "", "", "unsupported promotional wording"
    if title == current["title"] and desc == current["description"]:
        return False, "", "", "no effective change"
    target_terms: set[str] = set()
    for row in queries[:3]:
        target_terms |= terms(str(row.get("query", "")))
    if target_terms and len(target_terms & terms(title + " " + desc)) < min(2, len(target_terms)):
        return False, "", "", "dominant search intent not represented"
    return True, title, desc, "ok"


def append_changed_url(page: str) -> None:
    path = ROOT / "autopilot-changed-urls.txt"
    lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    lines = [line.strip() for line in lines if line.strip()]
    if page not in lines:
        lines.append(page)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def choose_target(pages: list[dict[str, Any]], history: dict[str, Any], today: date) -> dict[str, Any] | None:
    for row in pages:
        if on_cooldown(row["page"], history, today):
            continue
        target = local_file_for(row["page"])
        if not target:
            continue
        text = target.read_text(encoding="utf-8")
        if re.search(r"<meta\b[^>]*\bname=[\"']robots[\"'][^>]*\bnoindex\b", text, re.I):
            continue
        context = page_context(text)
        if context["title"] and context["description"] and context["h1"]:
            return row
    return None


def optimize_one(row: dict[str, Any], history: dict[str, Any], today: date) -> dict[str, Any]:
    target = local_file_for(row["page"])
    if not target:
        return {"changed": False, "reason": "local file not found"}
    original = target.read_text(encoding="utf-8")
    context = page_context(original)
    prompt = f"""
You are the conservative SEO metadata editor for NexusNova Tools.
Return JSON only with keys: apply (boolean), title (string), description (string), rationale (string).
You may improve ONLY the HTML title and meta description for one existing page.
Never invent features, prices, statistics, guarantees, certifications or capabilities.
Do not keyword-stuff. Keep the existing page intent. Never change H1 or body.
Title must be 30-65 characters. Description must be 110-165 characters.
Use Search Console queries as evidence only when supported by the existing page excerpt.
If current metadata is already good or queries do not match the page, set apply=false.
Page: {row['page']}
Current title: {context['title']}
Current description: {context['description']}
H1: {context['h1']}
Queries: {json.dumps(row['queries'][:5], ensure_ascii=False)}
Page excerpt: {context['excerpt']}
""".strip()
    candidate = ai_json(prompt)
    if not isinstance(candidate, dict):
        return {"changed": False, "reason": "AI unavailable or invalid JSON", "ai": ai_status()}
    ok, title, desc, reason = validate_candidate(candidate, context, row["queries"])
    if not ok:
        return {"changed": False, "reason": reason, "candidate": candidate, "ai": ai_status()}
    changed = replace_metadata(original, title, desc)
    if not changed or changed == original:
        return {"changed": False, "reason": "metadata replacement unavailable", "ai": ai_status()}
    if fingerprint(original) != fingerprint(changed):
        return {"changed": False, "reason": "integrity gate blocked non-metadata change", "ai": ai_status()}

    target.write_text(changed, encoding="utf-8")
    rel = target.relative_to(ROOT).as_posix()
    CHANGED_FILES_OUT.write_text(rel + "\n", encoding="utf-8")
    append_changed_url(row["page"])
    history.setdefault("pages", {})[row["page"]] = {
        "last_optimized": today.isoformat(),
        "file": rel,
        "old_title": context["title"],
        "new_title": title,
        "old_description": context["description"],
        "new_description": desc,
        "queries": [q.get("query") for q in row["queries"][:5]],
    }
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    HISTORY_FILE.write_text(json.dumps(history, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return {
        "changed": True,
        "page": row["page"],
        "file": rel,
        "old_title": context["title"],
        "new_title": title,
        "old_description": context["description"],
        "new_description": desc,
        "rationale": str(candidate.get("rationale") or "")[:500],
        "integrity": fingerprint(changed),
        "ai": ai_status(),
    }


def main() -> None:
    today = date.today()
    end = today - timedelta(days=3)
    start = end - timedelta(days=27)
    token, token_error = google_token()
    report: dict[str, Any] = {
        "generated_on": today.isoformat(),
        "range": [start.isoformat(), end.isoformat()],
        "gsc_site": SITE_URL,
        "auto_optimize_enabled": AUTO_OPTIMIZE,
        "min_impressions": MIN_IMPRESSIONS,
        "cooldown_days": COOLDOWN_DAYS,
    }
    change: dict[str, Any] = {"changed": False, "generated_on": today.isoformat()}

    if not token:
        report["error"] = token_error
    else:
        try:
            opportunities = build_opportunities(gsc_rows(token, start, end))
            pages = aggregate_pages(opportunities)
            report["eligible_query_rows"] = len(opportunities)
            report["eligible_pages"] = len(pages)
            report["query_opportunities"] = opportunities[:50]
            report["page_opportunities"] = pages[:20]
            history = load_history()
            target = choose_target(pages, history, today)
            report["next_target"] = target
            if AUTO_OPTIMIZE and target:
                change = optimize_one(target, history, today)
            elif AUTO_OPTIMIZE:
                change = {"changed": False, "generated_on": today.isoformat(), "reason": "no eligible page outside cooldown"}
            else:
                change = {"changed": False, "generated_on": today.isoformat(), "reason": "report-only mode"}
        except Exception as exc:
            report["error"] = f"{exc.__class__.__name__}: {exc}"
            change = {"changed": False, "generated_on": today.isoformat(), "reason": report["error"]}

    JSON_OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    CHANGES_OUT.write_text(json.dumps(change, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    lines = [
        "NEXUSNOVA SEARCH GROWTH AUTOPILOT",
        "=" * 35,
        f"GSC range: {start.isoformat()} to {end.isoformat()}",
        f"Eligible query/page rows: {report.get('eligible_query_rows', 0)}",
        f"Eligible pages: {report.get('eligible_pages', 0)}",
    ]
    if report.get("error"):
        lines.append(f"Error: {report['error']}")
    for row in (report.get("page_opportunities") or [])[:8]:
        lines.append(f"- {row['page']} | {row['impressions']} imp | {row['ctr']}% CTR | pos {row['position']} | score {row['score']}")
        for query in row.get("queries", [])[:3]:
            lines.append(f"    query: {query['query']} | {query['impressions']} imp | {query['ctr']}% CTR | pos {query['position']}")
    if change.get("changed"):
        lines += [
            "",
            f"SAFE AUTO-CHANGE: {change.get('file')}",
            f"Old title: {change.get('old_title')}",
            f"New title: {change.get('new_title')}",
            "Integrity gate: body and scripts unchanged.",
        ]
    elif AUTO_OPTIMIZE:
        lines += ["", f"No metadata change: {change.get('reason', 'not needed')}"]
    TEXT_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
