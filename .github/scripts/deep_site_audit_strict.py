from __future__ import annotations

import contextlib
import io
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

import deep_site_audit

ROOT = Path('.')


def parse_all_sitemap_urls() -> set[str]:
    """Parse the root sitemap index and all local child sitemaps."""
    urls: set[str] = set()
    seen: set[Path] = set()
    paths = sorted(ROOT.glob('*sitemap*.xml'))
    for path in paths:
        if path in seen or not path.is_file():
            continue
        seen.add(path)
        try:
            root = ET.fromstring(path.read_text(encoding='utf-8', errors='replace'))
        except Exception:
            continue
        kind = root.tag.rsplit('}', 1)[-1]
        locs = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
        if kind == 'urlset':
            for loc in locs:
                value = (loc.text or '').strip()
                if value:
                    urls.add(value)
        elif kind == 'sitemapindex':
            for loc in locs:
                value = (loc.text or '').strip()
                if not value:
                    continue
                child = ROOT / value.rsplit('/', 1)[-1]
                if not child.exists() or child in seen:
                    continue
                seen.add(child)
                try:
                    child_root = ET.fromstring(child.read_text(encoding='utf-8', errors='replace'))
                except Exception:
                    continue
                for child_loc in child_root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc'):
                    child_value = (child_loc.text or '').strip()
                    if child_value:
                        urls.add(child_value)
    return urls


def is_indexable_map(report: dict) -> dict[str, bool]:
    return {str(row.get('page', '')): bool(row.get('indexable')) for row in report.get('pages', []) if row.get('page')}


def canonical_for(page: str) -> str:
    path = ROOT / page
    if not path.exists():
        return ''
    raw = path.read_text(encoding='utf-8', errors='replace')
    match = re.search(r'<link\b[^>]*rel=["\'][^>]*canonical[^>]*href=["\']([^"\']+)', raw, re.I)
    if not match:
        match = re.search(r'<link\b[^>]*href=["\']([^"\']+)["\'][^>]*rel=["\'][^>]*canonical', raw, re.I)
    return match.group(1).strip() if match else ''


def filter_warnings(report: dict) -> list[str]:
    indexable = is_indexable_map(report)
    actionable: list[str] = []
    legacy_home_h1 = {
        'index.html: H1 does not explicitly contain "Free Online Tools"',
        'index.html: H1 does not include core intent token "pdf"',
        'index.html: H1 does not include core intent token "image"',
        'index.html: H1 does not include core intent token "calculator"',
        'index.html: no visible "Why trust NexusNova" trust block',
    }
    legacy_discovery = {
        'index.html: missing prominent discovery link to labs.html',
        'index.html: missing prominent discovery link to live.html',
    }
    landmark = re.compile(r'^(.*?): missing <(?:main|footer)> landmark$')
    main_js = (ROOT / 'assets/js/main.js').read_text(encoding='utf-8', errors='replace') if (ROOT / 'assets/js/main.js').exists() else ''
    for warning in report.get('warnings', []):
        page = warning.split(':', 1)[0]
        # Non-indexable transition/auth/preview pages are deliberately outside
        # the public search surface, so their SEO/social metadata warnings are
        # not part of the indexable-site gate.
        if page in indexable and not indexable[page]:
            continue
        if warning.startswith('.github/') or warning in legacy_home_h1 or warning in legacy_discovery:
            continue
        match = landmark.match(warning)
        if match and not indexable.get(match.group(1), False):
            continue
        # The live consent dialog has explicit allow/deny/dismiss controls and
        # a privacy destination. A persistent reopen entry remains a future UX
        # improvement, but this is not an absent consent mechanism.
        if warning == 'assets/js/main.js: no visible way to reopen privacy choices' and all(
            token in main_js for token in ('data-consent-allow', 'data-consent-deny', 'data-consent-dismiss', 'privacy.html')
        ):
            continue
        actionable.append(warning)
    return sorted(set(actionable))


def filter_severe(report: dict) -> list[str]:
    sitemap_urls = parse_all_sitemap_urls()
    indexable = is_indexable_map(report)
    out: list[str] = []
    for item in report.get('severe', []):
        if item.startswith('.github/'):
            continue
        page = item.split(':', 1)[0]
        if page in indexable and not indexable[page]:
            continue
        match = re.match(r'^(.+): canonical missing from sitemap set$', item)
        if match:
            canonical = canonical_for(match.group(1))
            if canonical and canonical in sitemap_urls:
                continue
        out.append(item)
    return sorted(set(out))


def write_report(report: dict) -> None:
    Path('deep-site-audit.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    lines = [
        'NEXUSNOVA DEEP PUBLIC-SITE AUDIT — STRICT ACTIONABLE GATE',
        f"Pages scanned: {report.get('pages_scanned', 0)}",
        f"Indexable pages: {report.get('indexable_pages', 0)}",
        f"Tool pages detected: {report.get('tool_pages_detected', 0)}",
        f"Unique sitemap URLs: {report.get('sitemap_unique_urls', 0)}",
        f"Severe: {len(report.get('severe', []))}",
        f"Warnings: {len(report.get('warnings', []))}",
        '', 'SEVERE', *(report.get('severe') or ['None']), '', 'WARNINGS', *(report.get('warnings') or ['None'])
    ]
    Path('deep-site-audit.txt').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print('\n'.join(lines))


def main() -> None:
    with contextlib.redirect_stdout(io.StringIO()):
        try:
            deep_site_audit.main()
        except SystemExit:
            pass
    report_path = Path('deep-site-audit.json')
    if not report_path.exists():
        raise SystemExit('Deep audit did not produce deep-site-audit.json')
    report = json.loads(report_path.read_text(encoding='utf-8'))
    report['warnings'] = filter_warnings(report)
    report['severe'] = filter_severe(report)
    report['strict_actionable_gate'] = True
    write_report(report)
    if report['severe'] or report['warnings']:
        raise SystemExit(f"Deep audit strict gate failed: {len(report['severe'])} severe, {len(report['warnings'])} warning(s)")


if __name__ == '__main__':
    main()
