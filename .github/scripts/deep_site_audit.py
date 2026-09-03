from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path('.')
SITE = 'https://nexusnovatools.com/'
SKIP_DIRS = {'.git', 'node_modules', 'vendor', 'ota', 'downloads', 'nexusnova-dev-ai'}
SKIP_HTML = {'404.html'}
SITEMAP_NS = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

DATE_SENSITIVE = {
    'live.html', 'sports-live.html', 'currency-rates.html', 'gold-rates.html',
    'fuel-rates.html', 'weather-live.html', 'earthquakes-live.html',
    'salary-tax-calculator-pakistan.html', 'electricity-bill-calculator-pakistan.html',
    'zakat-calculator-pakistan.html', 'prayer-times-qibla-pakistan.html',
    'pakistan-public-holidays-2026.html', 'live-alerts.html', 'pulse.html'
}

HOME_REQUIRED_LINKS = {
    'tools.html', 'labs.html', 'live.html', 'articles.html', 'guides.html'
}

TOOL_SCHEMA_TYPES = {'SoftwareApplication', 'WebApplication'}


class AuditParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title_parts: list[str] = []
        self.in_title = False
        self.meta: dict[str, str] = {}
        self.canonical = ''
        self.h1_count = 0
        self.h1_parts: list[str] = []
        self._in_h1 = False
        self.h2_count = 0
        self.refs: list[tuple[str, str, dict[str, str]]] = []
        self.links: list[dict[str, str]] = []
        self.images: list[dict[str, str]] = []
        self.controls: list[tuple[str, dict[str, str]]] = []
        self.labels_for: set[str] = set()
        self.jsonld: list[str] = []
        self._jsonld: list[str] | None = None
        self.text_parts: list[str] = []
        self.navs: list[dict[str, object]] = []
        self._nav_depth = 0
        self._current_nav: dict[str, object] | None = None
        self.html_lang = ''
        self.has_main = False
        self.has_footer = False

    def handle_starttag(self, tag, attrs):
        data = {str(k).lower(): str(v or '') for k, v in attrs}
        tag = tag.lower()
        if tag == 'html':
            self.html_lang = data.get('lang', '').strip()
        elif tag == 'title':
            self.in_title = True
        elif tag == 'meta':
            key = (data.get('name') or data.get('property') or '').strip().lower()
            if key:
                self.meta[key] = data.get('content', '').strip()
        elif tag == 'link':
            rel = data.get('rel', '').lower().split()
            if 'canonical' in rel:
                self.canonical = data.get('href', '').strip()
            href = data.get('href', '').strip()
            if href:
                self.refs.append(('link', href, data))
        elif tag == 'script':
            src = data.get('src', '').strip()
            if src:
                self.refs.append(('script', src, data))
            if data.get('type', '').lower() == 'application/ld+json':
                self._jsonld = []
        elif tag == 'a':
            href = data.get('href', '').strip()
            if href:
                self.refs.append(('a', href, data))
                self.links.append(data)
                if self._current_nav is not None:
                    self._current_nav['links'].append(href)
        elif tag == 'img':
            src = data.get('src', '').strip()
            if src:
                self.refs.append(('img', src, data))
            self.images.append(data)
        elif tag in {'source', 'video', 'audio', 'iframe'}:
            src = data.get('src', '').strip()
            if src:
                self.refs.append((tag, src, data))
        elif tag == 'h1':
            self.h1_count += 1
            self._in_h1 = True
        elif tag == 'h2':
            self.h2_count += 1
        elif tag == 'main':
            self.has_main = True
        elif tag == 'footer':
            self.has_footer = True
        elif tag == 'label':
            target = data.get('for', '').strip()
            if target:
                self.labels_for.add(target)
        elif tag in {'input', 'textarea', 'select'}:
            self.controls.append((tag, data))
        elif tag == 'nav':
            self._nav_depth += 1
            if self._nav_depth == 1:
                self._current_nav = {'attrs': data, 'links': []}
                self.navs.append(self._current_nav)

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag == 'title':
            self.in_title = False
        elif tag == 'script' and self._jsonld is not None:
            self.jsonld.append(''.join(self._jsonld).strip())
            self._jsonld = None
        elif tag == 'h1':
            self._in_h1 = False
        elif tag == 'nav':
            self._nav_depth = max(0, self._nav_depth - 1)
            if self._nav_depth == 0:
                self._current_nav = None

    def handle_data(self, data):
        if self.in_title:
            self.title_parts.append(data)
        if self._in_h1:
            self.h1_parts.append(data)
        if self._jsonld is not None:
            self._jsonld.append(data)
        value = ' '.join(str(data).split())
        if value:
            self.text_parts.append(value)

    @property
    def title(self) -> str:
        return ' '.join(''.join(self.title_parts).split())

    @property
    def h1(self) -> str:
        return ' '.join(' '.join(self.h1_parts).split())

    @property
    def text(self) -> str:
        return ' '.join(self.text_parts)


def html_files() -> list[Path]:
    out = []
    for path in sorted(ROOT.rglob('*.html')):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        out.append(path)
    return out


def expected_canonical(page: Path) -> str:
    rel = page.as_posix()
    return SITE if rel == 'index.html' else SITE + rel


def local_target(page: Path, raw: str) -> Path | None:
    raw = raw.strip()
    if not raw or raw.startswith(('#', 'mailto:', 'tel:', 'javascript:', 'data:', 'blob:')):
        return None
    parts = urlsplit(raw)
    if parts.scheme or parts.netloc:
        return None
    rel_path = unquote(parts.path)
    if not rel_path:
        return None
    target = (page.parent / rel_path).resolve()
    try:
        target.relative_to(ROOT.resolve())
    except ValueError:
        return None
    if raw.endswith('/'):
        target = target / 'index.html'
    return target


def parse_sitemaps() -> tuple[set[str], dict[str, int], list[str]]:
    urls: set[str] = set()
    counts: Counter[str] = Counter()
    problems: list[str] = []
    for path in sorted(ROOT.glob('sitemap*.xml')):
        try:
            root = ET.fromstring(path.read_text(encoding='utf-8', errors='replace'))
        except Exception as exc:
            problems.append(f'{path}: invalid XML: {exc}')
            continue
        local = root.tag.rsplit('}', 1)[-1]
        if local == 'urlset':
            for node in root.findall('.//sm:url/sm:loc', SITEMAP_NS):
                value = (node.text or '').strip()
                if value:
                    urls.add(value)
                    counts[value] += 1
    return urls, dict(counts), problems


def jsonld_types(raw: str) -> set[str]:
    found: set[str] = set()
    try:
        data = json.loads(raw)
    except Exception:
        return found

    def walk(node):
        if isinstance(node, dict):
            value = node.get('@type')
            if isinstance(value, str):
                found.add(value)
            elif isinstance(value, list):
                found.update(str(v) for v in value)
            for child in node.values():
                walk(child)
        elif isinstance(node, list):
            for child in node:
                walk(child)

    walk(data)
    return found


def has_accessible_name(tag: str, attrs: dict[str, str], labels_for: set[str]) -> bool:
    if tag == 'input' and attrs.get('type', '').lower() in {'hidden', 'submit', 'button', 'reset', 'image'}:
        return True
    control_id = attrs.get('id', '').strip()
    if control_id and control_id in labels_for:
        return True
    if attrs.get('aria-label', '').strip() or attrs.get('aria-labelledby', '').strip():
        return True
    if tag == 'input' and attrs.get('type', '').lower() in {'checkbox', 'radio'}:
        # Checkbox/radio inputs are commonly wrapped by a label in this codebase;
        # HTMLParser cannot cheaply reconstruct that parent relationship.
        return True
    return False


def main() -> None:
    pages = html_files()
    sitemap_urls, sitemap_counts, sitemap_problems = parse_sitemaps()
    severe: list[str] = list(sitemap_problems)
    warnings: list[str] = []
    notes: list[str] = []
    records: list[dict[str, object]] = []
    titles: defaultdict[str, list[str]] = defaultdict(list)
    descriptions: defaultdict[str, list[str]] = defaultdict(list)
    canonicals: defaultdict[str, list[str]] = defaultdict(list)

    robots = Path('robots.txt').read_text(encoding='utf-8', errors='replace') if Path('robots.txt').exists() else ''
    if not robots:
        severe.append('robots.txt missing')
    else:
        if not re.search(r'(?im)^\s*User-agent:\s*\*\s*$', robots):
            severe.append('robots.txt missing wildcard user-agent')
        if not re.search(r'(?im)^\s*Allow:\s*/\s*$', robots):
            warnings.append('robots.txt does not explicitly Allow: /')
        if 'https://nexusnovatools.com/sitemap.xml' not in robots:
            severe.append('robots.txt does not advertise sitemap.xml')

    if not Path('404.html').exists():
        severe.append('404.html missing')

    for url, count in sitemap_counts.items():
        if count > 1:
            warnings.append(f'sitemap URL appears in multiple urlsets: {url} ({count} times)')

    for page in pages:
        rel = page.as_posix()
        text = page.read_text(encoding='utf-8', errors='replace')
        parser = AuditParser()
        try:
            parser.feed(text)
        except Exception as exc:
            severe.append(f'{rel}: HTML parse error: {exc}')
            continue

        robots_meta = parser.meta.get('robots', '').lower()
        indexable = 'noindex' not in robots_meta and rel not in SKIP_HTML
        title = parser.title
        desc = parser.meta.get('description', '').strip()

        if not parser.html_lang:
            warnings.append(f'{rel}: missing html lang')
        if 'viewport' not in parser.meta:
            severe.append(f'{rel}: missing viewport meta')
        if not parser.has_main:
            warnings.append(f'{rel}: missing <main> landmark')
        if not parser.has_footer:
            warnings.append(f'{rel}: missing <footer> landmark')

        if not title:
            severe.append(f'{rel}: missing title')
        else:
            titles[title.lower()].append(rel)
            if indexable and not (20 <= len(title) <= 70):
                warnings.append(f'{rel}: title length {len(title)} outside 20-70 chars')

        if indexable:
            if not desc:
                severe.append(f'{rel}: missing meta description')
            else:
                descriptions[desc.lower()].append(rel)
                if not (70 <= len(desc) <= 175):
                    warnings.append(f'{rel}: meta description length {len(desc)} outside 70-175 chars')

            expected = expected_canonical(page)
            if not parser.canonical:
                severe.append(f'{rel}: missing canonical')
            elif parser.canonical != expected:
                severe.append(f'{rel}: canonical mismatch {parser.canonical} != {expected}')
            else:
                canonicals[parser.canonical].append(rel)
            if expected not in sitemap_urls:
                severe.append(f'{rel}: canonical missing from sitemap set')

            if parser.h1_count != 1 and rel != 'register.html':
                severe.append(f'{rel}: H1 count {parser.h1_count}, expected 1')

            for key in ('og:title', 'og:description', 'og:url', 'og:image', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'):
                if not parser.meta.get(key, '').strip():
                    warnings.append(f'{rel}: missing {key}')

        for raw in parser.jsonld:
            if not raw:
                continue
            try:
                json.loads(raw)
            except Exception as exc:
                severe.append(f'{rel}: invalid JSON-LD: {exc}')

        # Raw navigation should stay concise even before JavaScript enhancement.
        primary_navs = []
        for nav in parser.navs:
            attrs = nav['attrs']
            if attrs.get('data-nav', '') != '' or 'data-nav' in attrs:
                primary_navs.append(nav)
        for nav in primary_navs:
            links = nav['links']
            if len(links) > 8:
                warnings.append(f'{rel}: raw primary navigation has {len(links)} links (>8)')
            attrs = nav['attrs']
            if not attrs.get('aria-label', '').strip():
                warnings.append(f'{rel}: primary navigation missing aria-label')

        # Images need an alt attribute, including intentionally empty alt for decorative images.
        for img in parser.images:
            if 'alt' not in img:
                warnings.append(f"{rel}: image missing alt attribute -> {img.get('src', '[inline]')}")

        # Form controls should have labels/accessible names.
        for tag, attrs in parser.controls:
            if not has_accessible_name(tag, attrs, parser.labels_for):
                severe.append(f"{rel}: {tag} missing accessible name -> #{attrs.get('id','') or attrs.get('name','') or '?'}")

        # target=_blank must not expose window.opener.
        for link in parser.links:
            if link.get('target', '').lower() == '_blank':
                rel_attr = set(link.get('rel', '').lower().split())
                if 'noopener' not in rel_attr:
                    warnings.append(f"{rel}: target=_blank link missing noopener -> {link.get('href','')}")

        seen_targets: set[Path] = set()
        for _tag, ref, _attrs in parser.refs:
            target = local_target(page, ref)
            if target is None or target in seen_targets:
                continue
            seen_targets.add(target)
            if target.suffix.lower() in {'.html', '.css', '.js', '.svg', '.png', '.webp', '.jpg', '.jpeg', '.xml', '.json', '.txt', '.pdf', '.apk'} and not target.exists():
                severe.append(f'{rel}: missing local target -> {ref}')

        if re.search(r'http://(?!127\.0\.0\.1|localhost)', text, re.I):
            warnings.append(f'{rel}: insecure http:// URL present')

        schema_types = set()
        for raw in parser.jsonld:
            schema_types |= jsonld_types(raw)
        is_tool = bool(schema_types & TOOL_SCHEMA_TYPES)
        internal_main_links = [
            a.get('href', '') for a in parser.links
            if a.get('href', '') and not urlsplit(a.get('href', '')).scheme and not a.get('href', '').startswith('#')
        ]
        if is_tool:
            lower_text = parser.text.lower()
            if parser.h2_count < 2:
                warnings.append(f'{rel}: tool page has fewer than 2 H2 explanation sections')
            if 'privacy' not in lower_text and 'local' not in lower_text and 'browser' not in lower_text:
                warnings.append(f'{rel}: tool page has no visible privacy/processing explanation')
            if len(set(internal_main_links)) < 3:
                warnings.append(f'{rel}: tool page has fewer than 3 internal links')

        if rel in DATE_SENSITIVE:
            lower = parser.text.lower()
            if 'source' not in lower:
                severe.append(f'{rel}: date-sensitive page lacks visible source wording')
            if not any(token in lower for token in ('last updated', 'updated', 'reference date', 'reviewed', 'data time', 'as of')):
                warnings.append(f'{rel}: date-sensitive page lacks visible update/reference wording')
            if not any(token in lower for token in ('method', 'calculation', 'reference', 'source')):
                warnings.append(f'{rel}: date-sensitive page lacks visible method/reference wording')

        records.append({
            'page': rel,
            'indexable': indexable,
            'title': title,
            'description_length': len(desc),
            'canonical': parser.canonical,
            'h1': parser.h1,
            'h1_count': parser.h1_count,
            'h2_count': parser.h2_count,
            'schema_types': sorted(schema_types),
            'tool_page': is_tool,
            'internal_links': len(set(internal_main_links)),
        })

    for title, paths in titles.items():
        if len(paths) > 1:
            warnings.append('duplicate title: ' + ' | '.join(paths))
    for desc, paths in descriptions.items():
        if len(paths) > 1:
            warnings.append('duplicate meta description: ' + ' | '.join(paths))
    for canonical, paths in canonicals.items():
        if len(paths) > 1:
            severe.append(f'duplicate canonical {canonical}: ' + ' | '.join(paths))

    # Homepage intent/hierarchy checks.
    home = next((r for r in records if r['page'] == 'index.html'), None)
    if home:
        h1 = str(home['h1']).lower()
        if 'free online tools' not in h1:
            warnings.append('index.html: H1 does not explicitly contain "Free Online Tools"')
        for token in ('pdf', 'image', 'calculator'):
            if token not in h1:
                warnings.append(f'index.html: H1 does not include core intent token "{token}"')
    home_text = Path('index.html').read_text(encoding='utf-8', errors='replace') if Path('index.html').exists() else ''
    for href in HOME_REQUIRED_LINKS:
        if f'href="{href}"' not in home_text and f"href='{href}'" not in home_text:
            warnings.append(f'index.html: missing prominent discovery link to {href}')
    if 'Why trust NexusNova' not in home_text:
        warnings.append('index.html: no visible "Why trust NexusNova" trust block')
    if 'categories.html' not in home_text:
        warnings.append('index.html: no dedicated Categories discovery link')

    # Analytics privacy/consent implementation checks.
    main_js = Path('assets/js/main.js').read_text(encoding='utf-8', errors='replace') if Path('assets/js/main.js').exists() else ''
    privacy = Path('privacy.html').read_text(encoding='utf-8', errors='replace') if Path('privacy.html').exists() else ''
    consent_default = main_js.find("gtag('consent','default'")
    config_call = main_js.find("gtag('config'")
    if consent_default < 0:
        severe.append('assets/js/main.js: Google consent default is not implemented')
    elif config_call >= 0 and consent_default > config_call:
        severe.append('assets/js/main.js: consent default is set after GA4 config')
    for token in ('analytics_storage', 'ad_storage', 'ad_user_data', 'ad_personalization'):
        if token not in main_js:
            severe.append(f'assets/js/main.js: consent mode missing {token}')
    if 'nexusnova_analytics_consent' not in main_js:
        severe.append('assets/js/main.js: no persistent analytics consent choice key found')
    if 'Privacy choices' not in main_js:
        warnings.append('assets/js/main.js: no visible way to reopen privacy choices')
    if 'Google Analytics' not in privacy or 'consent' not in privacy.lower():
        severe.append('privacy.html: analytics/consent disclosure incomplete')

    # Local-storage tools should expose a clear action.
    local_storage_expectations = {
        'resume-builder.html': ('Clear draft', 'local'),
        'ai-prompt-builder.html': ('Clear', 'browser'),
        'tools.html': ('Clear', 'browser'),
    }
    for rel, tokens in local_storage_expectations.items():
        path = Path(rel)
        if not path.exists():
            continue
        value = path.read_text(encoding='utf-8', errors='replace').lower()
        for token in tokens:
            if token.lower() not in value:
                warnings.append(f'{rel}: expected local-storage UX token missing: {token}')

    # Public source must not contain obvious private keys or Telegram bot tokens.
    secret_patterns = [
        (re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'), 'private key marker'),
        (re.compile(r'(?<![A-Za-z0-9_])\d{8,12}:[A-Za-z0-9_-]{30,}(?![A-Za-z0-9_])'), 'Telegram-style bot token'),
        (re.compile(r'(?i)(?:secret|private[_-]?key)\s*[:=]\s*["\'][A-Za-z0-9_\-]{24,}["\']'), 'hard-coded secret-like assignment'),
    ]
    for path in sorted(ROOT.rglob('*')):
        if not path.is_file() or any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.suffix.lower() not in {'.html', '.js', '.mjs', '.json', '.yml', '.yaml', '.py', '.txt'}:
            continue
        try:
            data = path.read_text(encoding='utf-8', errors='ignore')
        except Exception:
            continue
        for pattern, label in secret_patterns:
            if pattern.search(data):
                severe.append(f'{path.as_posix()}: possible {label} exposed in repository')

    report = {
        'site': SITE,
        'pages_scanned': len(pages),
        'indexable_pages': sum(1 for r in records if r['indexable']),
        'tool_pages_detected': sum(1 for r in records if r['tool_page']),
        'sitemap_unique_urls': len(sitemap_urls),
        'severe': sorted(set(severe)),
        'warnings': sorted(set(warnings)),
        'notes': notes,
        'pages': records,
    }
    Path('deep-site-audit.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    lines = [
        'NEXUSNOVA DEEP PUBLIC-SITE AUDIT',
        f"Pages scanned: {report['pages_scanned']}",
        f"Indexable pages: {report['indexable_pages']}",
        f"Tool pages detected: {report['tool_pages_detected']}",
        f"Unique sitemap URLs: {report['sitemap_unique_urls']}",
        f"Severe: {len(report['severe'])}",
        f"Warnings: {len(report['warnings'])}",
        '', 'SEVERE', *(report['severe'] or ['None']), '', 'WARNINGS', *(report['warnings'] or ['None'])
    ]
    Path('deep-site-audit.txt').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print('\n'.join(lines))
    # Initial audit is diagnostic: only severe findings fail the job. Warnings are
    # intentionally surfaced so the cleanup PR can close or explicitly justify them.
    if report['severe']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
