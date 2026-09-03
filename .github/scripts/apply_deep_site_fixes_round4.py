from __future__ import annotations

import re
from pathlib import Path

ROOT = Path('.')
EDITORIAL_DIRS = ('articles', 'guides', 'tech')

REDIRECT_SCRIPT = "<script data-index-canonical-redirect>(()=>{if(location.pathname==='/index.html'){location.replace('/'+location.search+location.hash)}})();</script>"
EDITORIAL_LINE = '<p class="article-meta" data-editorial-attribution>Editorial owner: <a href="../editorial-team.html">NexusNova Editorial Team</a></p>'


def write_if_changed(path: Path, value: str) -> bool:
    old = path.read_text(encoding='utf-8', errors='replace')
    if old == value:
        return False
    path.write_text(value, encoding='utf-8')
    return True


def fix_homepage() -> bool:
    path = ROOT / 'index.html'
    text = path.read_text(encoding='utf-8', errors='replace')
    original = text
    if 'data-index-canonical-redirect' not in text:
        # Keep the canonical root as the primary signal; this conditional redirect
        # only fires when the explicit /index.html duplicate is requested.
        text = re.sub(r'(<meta\s+name=["\']viewport["\'][^>]*>)', r'\1' + REDIRECT_SCRIPT, text, count=1, flags=re.I)
    return write_if_changed(path, text) if text != original else False


def fix_editorial_pages() -> list[str]:
    changed: list[str] = []
    for dirname in EDITORIAL_DIRS:
        folder = ROOT / dirname
        if not folder.exists():
            continue
        for path in sorted(folder.glob('*.html')):
            text = path.read_text(encoding='utf-8', errors='replace')
            if re.search(r'<meta\s+name=["\']robots["\'][^>]*content=["\'][^"\']*noindex', text, re.I):
                continue
            if 'data-editorial-attribution' in text:
                continue
            h1 = re.search(r'</h1>', text, re.I)
            if not h1:
                continue
            text = text[:h1.end()] + EDITORIAL_LINE + text[h1.end():]
            if write_if_changed(path, text):
                changed.append(path.as_posix())
    return changed


def main() -> None:
    changed: list[str] = []
    if fix_homepage():
        changed.append('index.html')
    changed.extend(fix_editorial_pages())
    print(f'Round 4 changed {len(changed)} file(s).')
    for item in changed:
        print(item)


if __name__ == '__main__':
    main()
