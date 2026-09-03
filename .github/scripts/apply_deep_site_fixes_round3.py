from __future__ import annotations

import re
from pathlib import Path

REFERENCE_PAGES = {
    'currency-rates.html',
    'electricity-bill-calculator-pakistan.html',
    'fuel-rates.html',
    'gold-rates.html',
    'live-alerts.html',
    'pakistan-public-holidays-2026.html',
    'prayer-times-qibla-pakistan.html',
    'sports-live.html',
    'zakat-calculator-pakistan.html',
}


def update(path: Path, transform) -> bool:
    text = path.read_text(encoding='utf-8', errors='replace')
    new = transform(text)
    if new == text:
        return False
    path.write_text(new, encoding='utf-8')
    return True


def main() -> None:
    changed: list[str] = []

    for filename in REFERENCE_PAGES:
        path = Path(filename)
        if not path.exists():
            continue
        def fix_reference(text: str) -> str:
            text = text.replace(
                '<strong>Update/reference note:</strong>',
                '<strong>Last updated / reference date:</strong>',
            )
            return text
        if update(path, fix_reference):
            changed.append(filename)

    meta = Path('meta-tag-generator.html')
    if meta.exists():
        def fix_twitter_head(text: str) -> str:
            head_match = re.search(r'<head>(.*?)</head>', text, re.I | re.S)
            if not head_match:
                return text
            head = head_match.group(1)
            tags = (
                '<meta name="twitter:title" content="Meta Tag &amp; Open Graph Generator — NexusNova Tools">'
                '<meta name="twitter:description" content="Build copy-ready SEO and social meta tags with live previews.">'
                '<meta name="twitter:image" content="https://nexusnovatools.com/assets/nexusnova-logo-512.svg">'
            )
            missing = [
                name for name in ('twitter:title','twitter:description','twitter:image')
                if not re.search(rf'<meta\s+name=["\']{re.escape(name)}["\']', head, re.I)
            ]
            if not missing:
                return text
            insertion = ''.join(
                re.search(rf'<meta\s+name=["\']{re.escape(name)}["\'][^>]*>', tags, re.I).group(0)
                for name in missing
            )
            return text[:head_match.end(1)] + insertion + text[head_match.end(1):]
        if update(meta, fix_twitter_head):
            changed.append('meta-tag-generator.html')

    print(f'Round 3 changed {len(set(changed))} file(s).')
    for filename in sorted(set(changed)):
        print(filename)


if __name__ == '__main__':
    main()
