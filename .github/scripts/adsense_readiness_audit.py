from __future__ import annotations

import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
JSON_OUT = ROOT / 'adsense-readiness.json'
TEXT_OUT = ROOT / 'adsense-readiness.txt'

TRUST_FILES = [
    'about.html',
    'contact.html',
    'privacy.html',
    'terms.html',
    'disclaimer.html',
    'editorial-policy.html',
    'editorial-team.html',
    'faq.html',
    'tool-methodology.html',
    'robots.txt',
    'sitemap.xml',
    'ads.txt',
]

EXCLUDED_PREFIXES = ('.github/', 'ota/', 'cloudflare/', 'downloads/', 'tests/', 'vpn/', 'nexusnova-dev-ai/')
EXCLUDED_FILES = {'404.html', 'account.html', 'register.html', 'account-deletion.html'}


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title = ''
        self.meta_description = ''
        self.robots = ''
        self.canonical = ''
        self.links = 0
        self.headings = 0
        self._in_title = False
        self._skip = 0
        self.text_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        attrs_dict = {str(k).lower(): str(v or '') for k, v in attrs}
        if tag == 'title':
            self._in_title = True
        if tag in {'script', 'style', 'svg', 'noscript'}:
            self._skip += 1
        if tag == 'meta':
            name = attrs_dict.get('name', '').lower()
            if name == 'description':
                self.meta_description = attrs_dict.get('content', '').strip()
            elif name == 'robots':
                self.robots = attrs_dict.get('content', '').strip().lower()
        if tag == 'link' and attrs_dict.get('rel', '').lower() == 'canonical':
            self.canonical = attrs_dict.get('href', '').strip()
        if tag == 'a' and attrs_dict.get('href', '').strip():
            self.links += 1
        if tag in {'h1', 'h2', 'h3'}:
            self.headings += 1

    def handle_endtag(self, tag: str) -> None:
        if tag == 'title':
            self._in_title = False
        if tag in {'script', 'style', 'svg', 'noscript'} and self._skip:
            self._skip -= 1

    def handle_data(self, data: str) -> None:
        value = re.sub(r'\s+', ' ', data).strip()
        if not value:
            return
        if self._in_title:
            self.title += (' ' if self.title else '') + value
        if not self._skip:
            self.text_parts.append(value)


def public_html_files() -> list[Path]:
    result: list[Path] = []
    for path in ROOT.rglob('*.html'):
        rel = path.relative_to(ROOT).as_posix()
        if rel in EXCLUDED_FILES or rel.startswith(EXCLUDED_PREFIXES):
            continue
        result.append(path)
    return sorted(result)


def inspect_page(path: Path) -> dict:
    rel = path.relative_to(ROOT).as_posix()
    parser = PageParser()
    raw = path.read_text(encoding='utf-8', errors='ignore')
    try:
        parser.feed(raw)
    except Exception:
        pass
    text = re.sub(r'\s+', ' ', ' '.join(parser.text_parts)).strip()
    words = re.findall(r"\b[\w'-]+\b", text)
    noindex = 'noindex' in parser.robots
    return {
        'page': rel,
        'title': bool(parser.title.strip()),
        'description': bool(parser.meta_description),
        'canonical': bool(parser.canonical),
        'noindex': noindex,
        'word_count': len(words),
        'links': parser.links,
        'headings': parser.headings,
    }


def main() -> None:
    trust = {name: (ROOT / name).exists() for name in TRUST_FILES}
    pages = [inspect_page(path) for path in public_html_files()]
    indexable = [page for page in pages if not page['noindex']]

    missing_title = [p['page'] for p in indexable if not p['title']]
    missing_description = [p['page'] for p in indexable if not p['description']]
    missing_canonical = [p['page'] for p in indexable if not p['canonical']]
    low_text = [p for p in indexable if p['word_count'] < 180]
    very_low_text = [p for p in indexable if p['word_count'] < 90]
    weak_navigation = [p for p in indexable if p['links'] < 5]

    ads_lines: list[str] = []
    ads_valid = False
    ads_path = ROOT / 'ads.txt'
    if ads_path.exists():
        ads_lines = [line.strip() for line in ads_path.read_text(encoding='utf-8', errors='ignore').splitlines() if line.strip() and not line.lstrip().startswith('#')]
        ads_valid = any(re.match(r'^google\.com,\s*pub-\d+,\s*(DIRECT|RESELLER),\s*[a-zA-Z0-9]+$', line) for line in ads_lines)

    severe: list[str] = []
    warnings: list[str] = []
    missing_trust = [name for name, present in trust.items() if not present]
    if missing_trust:
        severe.append('Missing trust/readiness files: ' + ', '.join(missing_trust))
    if missing_title:
        severe.append(f'{len(missing_title)} indexable page(s) missing a title.')
    if not ads_valid:
        warnings.append('ads.txt does not contain a recognizable Google publisher entry.')
    if missing_description:
        warnings.append(f'{len(missing_description)} indexable page(s) missing a meta description.')
    if missing_canonical:
        warnings.append(f'{len(missing_canonical)} indexable page(s) missing a canonical URL.')
    if very_low_text:
        warnings.append(f'{len(very_low_text)} indexable page(s) have under 90 visible words; review them manually for sufficient standalone value.')
    elif low_text:
        warnings.append(f'{len(low_text)} indexable page(s) have under 180 visible words; review thin pages before AdSense application.')
    if weak_navigation:
        warnings.append(f'{len(weak_navigation)} indexable page(s) expose fewer than 5 links; check navigation/internal linking.')

    report = {
        'status': 'technical-ready' if not severe else 'needs-fixes',
        'approval_guaranteed': False,
        'note': 'This is a technical/content-structure readiness audit, not an AdSense approval prediction.',
        'trust_files': trust,
        'ads_txt_valid_google_entry': ads_valid,
        'pages_scanned': len(pages),
        'indexable_pages': len(indexable),
        'severe_findings': severe,
        'warnings': warnings,
        'details': {
            'missing_title': missing_title[:50],
            'missing_description': missing_description[:50],
            'missing_canonical': missing_canonical[:50],
            'low_text_pages': low_text[:50],
            'very_low_text_pages': very_low_text[:50],
            'weak_navigation_pages': weak_navigation[:50],
        },
    }
    JSON_OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

    lines = [
        'NEXUSNOVA ADSENSE READINESS AUDIT',
        '=' * 34,
        f"Status: {report['status']}",
        'Approval guarantee: NO (Google makes the approval decision)',
        f"Public HTML pages scanned: {len(pages)}",
        f"Indexable pages: {len(indexable)}",
        f"Trust/readiness files present: {sum(trust.values())}/{len(trust)}",
        f"Google ads.txt entry recognized: {'YES' if ads_valid else 'NO'}",
        f"Severe findings: {len(severe)}",
        f"Warnings: {len(warnings)}",
    ]
    if severe:
        lines += ['', 'SEVERE FINDINGS', *[f'- {item}' for item in severe]]
    if warnings:
        lines += ['', 'WARNINGS', *[f'- {item}' for item in warnings]]
    lines += ['', 'Note: manual review of originality, usefulness, policy compliance and user experience is still required before applying.']
    TEXT_OUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print('\n'.join(lines))


if __name__ == '__main__':
    main()
