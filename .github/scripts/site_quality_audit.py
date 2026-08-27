from __future__ import annotations

import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path('.')
SITE = 'https://nexusnovatools.com/'
SKIP_DIRS = {'.git', 'node_modules', 'vendor'}


class AuditParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title = []
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
    path = unquote(parts.path)
    if not path:
        return None
    target = (page.parent / path).resolve()
    try:
        target.relative_to(ROOT.resolve())
    except ValueError:
        return None
    if raw.endswith('/'):
        target = target / 'index.html'
    return target


def main() -> None:
    pages = list(html_files())
    warnings: list[str] = []
    severe: list[str] = []
    indexable = 0
    titles: dict[str, list[str]] = {}
    canonicals: dict[str, list[str]] = {}

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
        is_indexable = 'noindex' not in robots
        if is_indexable:
            indexable += 1

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

        if parser.h1_count != 1:
            warnings.append(f'{rel}: H1 count is {parser.h1_count}, expected 1')

        for raw in parser.jsonld:
            if not raw:
                continue
            try:
                json.loads(raw)
            except Exception as exc:
                severe.append(f'{rel}: invalid JSON-LD: {exc}')

        if 'fahadsoomro123.github.io/nexusnova-website' in text:
            severe.append(f'{rel}: old GitHub Pages URL still present')

        seen = set()
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

    for title, paths in titles.items():
        if len(paths) > 1:
            warnings.append('duplicate title: ' + ' | '.join(paths))
    for canonical, paths in canonicals.items():
        if len(paths) > 1:
            severe.append(f'duplicate canonical {canonical}: ' + ' | '.join(paths))

    report = [
        'NEXUSNOVA FULL-SITE QUALITY AUDIT',
        f'HTML pages scanned: {len(pages)}',
        f'Indexable pages: {indexable}',
        f'Severe findings: {len(severe)}',
        f'Warnings: {len(warnings)}',
        '',
        'SEVERE FINDINGS',
        *(severe or ['None']),
        '',
        'WARNINGS',
        *(warnings or ['None']),
        '',
        'NOTE: Report-only audit; workflow exits successfully so it cannot block deployment.'
    ]
    output = '\n'.join(report) + '\n'
    Path('site-quality-report.txt').write_text(output, encoding='utf-8')
    print(output)


if __name__ == '__main__':
    main()
