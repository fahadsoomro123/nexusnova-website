from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path('.')
SITE = 'https://nexusnovatools.com/'
SKIP_DIRS = {'.git', 'node_modules', 'vendor', 'ota', 'downloads', 'nexusnova-dev-ai'}
SKIP_HTML = {'404.html'}
SITEMAP_NS = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}


class AuditParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title: list[str] = []
        self.in_title = False
        self.meta: dict[str, str] = {}
        self.canonical = ''
        self.h1_count = 0
        self.refs: list[str] = []
        self.jsonld: list[str] = []
        self._jsonld: list[str] | None = None

    def handle_starttag(self, tag, attrs):
        data = {str(k).lower(): str(v or '') for k, v in attrs}
        tag = tag.lower()
        if tag == 'title':
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
                self.refs.append(href)
        elif tag == 'script':
            src = data.get('src', '').strip()
            if src:
                self.refs.append(src)
            if data.get('type', '').lower() == 'application/ld+json':
                self._jsonld = []
        elif tag == 'a':
            href = data.get('href', '').strip()
            if href:
                self.refs.append(href)
        elif tag in {'img', 'source', 'video', 'audio', 'iframe'}:
            src = data.get('src', '').strip()
            if src:
                self.refs.append(src)
        elif tag == 'h1':
            self.h1_count += 1

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag == 'title':
            self.in_title = False
        elif tag == 'script' and self._jsonld is not None:
            self.jsonld.append(''.join(self._jsonld).strip())
            self._jsonld = None

    def handle_data(self, data):
        if self.in_title:
            self.title.append(data)
        if self._jsonld is not None:
            self._jsonld.append(data)

    @property
    def clean_title(self) -> str:
        return ' '.join(''.join(self.title).split())


def html_files():
    for path in sorted(ROOT.rglob('*.html')):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        yield path


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


def expected_canonical(page: Path) -> str:
    rel = page.as_posix()
    if rel == 'index.html':
        return SITE
    return SITE + rel


def parse_sitemaps() -> tuple[set[str], list[str], list[str]]:
    urls: set[str] = set()
    files: list[str] = []
    problems: list[str] = []
    for path in sorted(ROOT.glob('sitemap*.xml')):
        files.append(path.as_posix())
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
        elif local != 'sitemapindex':
            problems.append(f'{path}: unsupported sitemap root <{local}>')
    return urls, files, problems


def canonical_to_local(url: str) -> Path | None:
    if not url.startswith(SITE):
        return None
    rel = url[len(SITE):].split('?', 1)[0].split('#', 1)[0]
    if rel == '':
        return ROOT / 'index.html'
    if rel.endswith('/'):
        return ROOT / rel / 'index.html'
    if rel.endswith('.html'):
        return ROOT / rel
    return None


def main() -> None:
    pages = list(html_files())
    sitemap_urls, sitemap_files, sitemap_problems = parse_sitemaps()
    warnings: list[str] = []
    severe: list[str] = list(sitemap_problems)
    page_map: list[dict[str, object]] = []
    indexable = 0
    mapped = 0
    theme_covered = 0
    titles: dict[str, list[str]] = {}
    canonicals: dict[str, list[str]] = {}

    robots_text = Path('robots.txt').read_text(encoding='utf-8', errors='replace') if Path('robots.txt').exists() else ''
    if not robots_text:
        severe.append('robots.txt: missing')
    else:
        if not re.search(r'(?im)^\s*User-agent:\s*\*\s*$', robots_text):
            severe.append('robots.txt: missing wildcard user-agent block')
        if not re.search(r'(?im)^\s*Allow:\s*/\s*$', robots_text):
            warnings.append('robots.txt: root Allow directive not found')
        if 'https://nexusnovatools.com/sitemap.xml' not in robots_text:
            severe.append('robots.txt: primary sitemap.xml is not advertised')
        if Path('sitemap-index.xml').exists() and 'https://nexusnovatools.com/sitemap-index.xml' not in robots_text:
            warnings.append('robots.txt: sitemap-index.xml exists but is not advertised')

    for page in pages:
        text = page.read_text(encoding='utf-8', errors='replace')
        parser = AuditParser()
        try:
            parser.feed(text)
        except Exception as exc:
            severe.append(f'{page}: HTML parser error: {exc}')
            continue

        rel = page.as_posix()
        robots = parser.meta.get('robots', '').lower()
        is_indexable = 'noindex' not in robots and rel not in SKIP_HTML
        canonical_expected = expected_canonical(page)
        in_sitemap = bool(parser.canonical and parser.canonical in sitemap_urls)
        if is_indexable:
            indexable += 1
            if in_sitemap:
                mapped += 1

        has_theme = 'assets/css/scifi.css' in text or '../assets/css/scifi.css' in text or 'assets/js/main.js' in text or '../assets/js/main.js' in text
        if has_theme:
            theme_covered += 1
        elif rel not in SKIP_HTML:
            severe.append(f'{rel}: missing canonical NexusNova theme coverage')

        title = parser.clean_title
        if not title:
            severe.append(f'{rel}: missing <title>')
        else:
            titles.setdefault(title.lower(), []).append(rel)
            if len(title) > 70:
                warnings.append(f'{rel}: long title ({len(title)} chars)')

        desc = parser.meta.get('description', '')
        if is_indexable and not desc:
            severe.append(f'{rel}: indexable page missing meta description')
        elif desc and len(desc) > 175:
            warnings.append(f'{rel}: long meta description ({len(desc)} chars)')

        if is_indexable:
            if not parser.canonical:
                severe.append(f'{rel}: indexable page missing canonical')
            elif not parser.canonical.startswith(SITE):
                severe.append(f'{rel}: canonical is outside canonical domain: {parser.canonical}')
            else:
                canonicals.setdefault(parser.canonical, []).append(rel)
                if parser.canonical != canonical_expected:
                    severe.append(f'{rel}: canonical mismatch: {parser.canonical} != {canonical_expected}')
                if not in_sitemap:
                    severe.append(f'{rel}: indexable canonical missing from sitemap set: {parser.canonical}')
        elif parser.canonical and parser.canonical in sitemap_urls:
            severe.append(f'{rel}: noindex page is present in sitemap: {parser.canonical}')

        if parser.h1_count != 1 and rel not in {'register.html'}:
            warnings.append(f'{rel}: H1 count is {parser.h1_count}, expected 1')

        for key in ('og:title', 'og:description', 'og:url'):
            if is_indexable and not parser.meta.get(key, ''):
                warnings.append(f'{rel}: missing {key}')
        if is_indexable and not parser.meta.get('twitter:card', ''):
            warnings.append(f'{rel}: missing twitter:card')
        if is_indexable and not parser.meta.get('og:image', ''):
            warnings.append(f'{rel}: missing og:image')

        for raw in parser.jsonld:
            if not raw:
                continue
            try:
                json.loads(raw)
            except Exception as exc:
                severe.append(f'{rel}: invalid JSON-LD: {exc}')

        if 'fahadsoomro123.github.io/nexusnova-website' in text:
            severe.append(f'{rel}: old GitHub Pages URL still present')

        seen: set[Path] = set()
        for ref in parser.refs:
            target = local_target(page, ref)
            if target is None or target in seen:
                continue
            seen.add(target)
            suffix = target.suffix.lower()
            if suffix not in {'.html', '.css', '.js', '.svg', '.webp', '.png', '.jpg', '.jpeg', '.xml', '.json', '.txt', '.pdf', '.apk'}:
                continue
            if not target.exists():
                severe.append(f'{rel}: missing local target -> {ref}')

        page_map.append({
            'page': rel,
            'indexable': is_indexable,
            'title': title,
            'canonical': parser.canonical,
            'in_sitemap': in_sitemap,
            'h1_count': parser.h1_count,
            'has_description': bool(desc),
            'has_og_title': bool(parser.meta.get('og:title', '')),
            'has_og_description': bool(parser.meta.get('og:description', '')),
            'has_og_url': bool(parser.meta.get('og:url', '')),
            'has_og_image': bool(parser.meta.get('og:image', '')),
            'has_twitter_card': bool(parser.meta.get('twitter:card', '')),
        })

    for title, paths in titles.items():
        if len(paths) > 1:
            warnings.append('duplicate title: ' + ' | '.join(paths))
    for canonical, paths in canonicals.items():
        if len(paths) > 1:
            severe.append(f'duplicate canonical {canonical}: ' + ' | '.join(paths))

    for url in sorted(sitemap_urls):
        target = canonical_to_local(url)
        if target is not None and not target.exists():
            severe.append(f'sitemap references missing local HTML: {url}')

    report_json = {
        'site': SITE,
        'html_pages_scanned': len(pages),
        'theme_covered': theme_covered,
        'indexable_pages': indexable,
        'indexable_pages_in_sitemaps': mapped,
        'sitemap_files': sitemap_files,
        'unique_sitemap_urls': len(sitemap_urls),
        'severe': severe,
        'warnings': warnings,
        'pages': page_map,
    }
    Path('site-quality-report.json').write_text(json.dumps(report_json, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

    report = [
        'NEXUSNOVA FULL WEBSITE MAP + SEO AUDIT',
        f'HTML pages scanned: {len(pages)}',
        f'Pages with canonical premium theme coverage: {theme_covered}/{len(pages)}',
        f'Indexable pages: {indexable}',
        f'Indexable pages mapped in sitemap set: {mapped}/{indexable}',
        f'Sitemap files scanned: {len(sitemap_files)}',
        f'Unique sitemap URLs: {len(sitemap_urls)}',
        f'Severe findings: {len(severe)}',
        f'Warnings: {len(warnings)}',
        'Scope note: ota/, downloads/ and local nexusnova-dev-ai/ payloads are excluded from public-site SEO checks.',
        '',
        'SEVERE FINDINGS',
        *(severe or ['None']),
        '',
        'WARNINGS',
        *(warnings or ['None']),
        '',
        'NOTE: Report-only static audit. Browser quality is enforced separately by the workflow.'
    ]
    output = '\n'.join(report) + '\n'
    Path('site-quality-report.txt').write_text(output, encoding='utf-8')
    print(output)


if __name__ == '__main__':
    main()
