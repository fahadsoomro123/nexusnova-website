#!/usr/bin/env python3
"""
NexusNova low-value-content structural matrix.

This is a structural gate only. It cannot determine AdSense approval.
It checks the five already-built visual templates for:
- one mobile viewport declaration
- one canonical URL
- unique title tokens across templates
- exactly one H1
- indexable robots metadata
- non-empty meta descriptions
"""

from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

TEMPLATES = (
    "index.html",
    "tools.html",
    "categories.html",
    "salary-tax-calculator-pakistan.html",
    "currency-rates.html",
)

STOPWORDS = {
    "a", "an", "and", "for", "from", "how", "in", "of", "on", "or",
    "the", "to", "with", "your", "nexusnova", "tools",
}


def read(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(path)
    return path.read_text(encoding="utf-8")


def one_match(pattern: str, text: str) -> str | None:
    matches = re.findall(pattern, text, flags=re.I | re.S)
    if len(matches) != 1:
        return None
    return html.unescape(re.sub(r"<[^>]+>", "", matches[0]).strip())


def title_tokens(title: str) -> set[str]:
    tokens = re.findall(r"[a-z0-9]+", title.lower())
    return {token for token in tokens if token not in STOPWORDS and len(token) > 2}


def check_template(filename: str) -> dict[str, object]:
    path = ROOT / filename
    source = read(path)

    viewport_count = len(re.findall(r'<meta\s+[^>]*name=["\']viewport["\'][^>]*>', source, re.I))
    canonical_count = len(re.findall(r'<link\s+[^>]*rel=["\']canonical["\'][^>]*>', source, re.I))
    h1_count = len(re.findall(r"<h1\b", source, re.I))
    robots = one_match(r'<meta\s+[^>]*name=["\']robots["\'][^>]*content=["\']([^"\']*)["\']', source)
    description = one_match(r'<meta\s+[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)["\']', source)
    title = one_match(r"<title>(.*?)</title>", source)
    canonical = one_match(r'<link\s+[^>]*rel=["\']canonical["\'][^>]*href=["\']([^"\']+)["\']', source)

    return {
        "file": filename,
        "viewport_count": viewport_count,
        "canonical_count": canonical_count,
        "canonical": canonical or "",
        "h1_count": h1_count,
        "title": title or "",
        "title_tokens": sorted(title_tokens(title or "")),
        "robots": robots or "",
        "description": description or "",
        "passed": (
            viewport_count == 1
            and canonical_count == 1
            and bool(canonical and canonical.startswith("https://nexusnovatools.com/"))
            and h1_count == 1
            and bool(title)
            and bool(description)
            and bool(robots and "index" in robots.lower() and "follow" in robots.lower())
        ),
    }


def apply_title_uniqueness(rows: list[dict[str, object]]) -> None:
    for row in rows:
        own = set(row["title_tokens"])
        others = set().union(*(set(other["title_tokens"]) for other in rows if other is not row))
        row["unique_title_token_count"] = len(own - others)
        row["title_unique"] = bool(own - others)
        row["passed"] = bool(row["passed"] and row["title_unique"])


def main() -> int:
    rows: list[dict[str, object]] = []
    failures = 0

    print("=== NEXUSNOVA LOW-VALUE STRUCTURAL MATRIX ===")
    print("Scope: five built baseline templates")

    for filename in TEMPLATES:
        try:
            row = check_template(filename)
        except Exception as error:
            row = {
                "file": filename,
                "passed": False,
                "error": str(error),
                "title_tokens": [],
            }

        rows.append(row)

    apply_title_uniqueness(rows)

    headers = (
        "template",
        "viewport",
        "canonical",
        "h1",
        "unique_title_tokens",
        "robots",
        "description",
        "status",
    )
    print("\t".join(headers))

    for row in rows:
        passed = bool(row["passed"])
        if not passed:
            failures += 1

        print("\t".join([
            str(row["file"]),
            str(row.get("viewport_count", 0)),
            str(row.get("canonical_count", 0)),
            str(row.get("h1_count", 0)),
            str(row.get("unique_title_token_count", 0)),
            "PASS" if "index" in str(row.get("robots", "")).lower() and "follow" in str(row.get("robots", "")).lower() else "FAIL",
            "PASS" if row.get("description") else "FAIL",
            "PASS" if passed else "FAIL",
        ]))

    report = {
        "templates": rows,
        "summary": {
            "template_count": len(rows),
            "failed_templates": failures,
            "passed_templates": len(rows) - failures,
        },
    }

    output = ROOT / "quality-artifacts"
    output.mkdir(parents=True, exist_ok=True)
    report_path = output / "adsense-template-matrix.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nReport: {report_path}")

    if failures:
        print(f"RESULT: FAIL ({failures}/{len(rows)} template(s))")
        return 1

    print(f"RESULT: PASS ({len(rows)}/{len(rows)} templates)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
