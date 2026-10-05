from __future__ import annotations

import html
import re
from pathlib import Path

CONTROL_LABELS = {
    'ocr-text': 'Extracted OCR text',
    'canonical': 'Canonical URL',
    'image': 'Social preview image URL',
    'site': 'Site name',
    'title': 'Page title',
    'robots': 'Robots directive',
    'code': 'Generated code',
    'description': 'Meta description',
    'dpi': 'DPI value',
    'orientation': 'Paper orientation',
    'paper': 'Paper size',
    'brightness': 'Brightness adjustment',
    'contrast': 'Contrast adjustment',
    'file': 'Choose image file',
    'saturation': 'Saturation adjustment',
    'sharpen': 'Sharpen adjustment',
    'scale': 'Upscale factor',
    'qr': 'Choose QR code image',
    'url': 'URL to inspect',
}

DATE_NOTE_PAGES = {
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

UPDATE_NOTE = (
    '<section class="section" data-reference-note><div class="container">'
    '<p class="mini-note"><strong>Update/reference note:</strong> Source timestamps or the applicable '
    'reference period are shown with the data or calculation where available. If a source is unavailable, '
    'NexusNova does not invent a current value.</p></div></section>'
)


def add_aria(text: str, element_id: str, label: str) -> str:
    pattern = re.compile(rf'<(input|textarea|select)\b(?=[^>]*\bid=["\']{re.escape(element_id)}["\'])[^>]*>', re.I)
    def repl(match):
        tag = match.group(0)
        if re.search(r'\baria-label\s*=', tag, re.I) or re.search(r'\baria-labelledby\s*=', tag, re.I):
            return tag
        return tag[:-1] + f' aria-label="{html.escape(label, quote=True)}">'
    return pattern.sub(repl, text)


def update(path: Path, transform) -> bool:
    text = path.read_text(encoding='utf-8', errors='replace')
    new = transform(text)
    if new == text:
        return False
    path.write_text(new, encoding='utf-8')
    return True


def main() -> None:
    changed: list[str] = []

    target_pages = {
        'image-to-text-ocr.html', 'meta-tag-generator.html', 'paper-size-converter.html',
        'photo-cctv-enhancer.html', 'widgets.html', 'xray.html'
    }
    for filename in target_pages:
        path = Path(filename)
        if not path.exists():
            continue
        def transform(text: str) -> str:
            for element_id, label in CONTROL_LABELS.items():
                text = add_aria(text, element_id, label)
            return text
        if update(path, transform):
            changed.append(filename)

    meta = Path('meta-tag-generator.html')
    if meta.exists():
        def fix_meta(text: str) -> str:
            text = text.replace('href="seo-tools.html"', 'href="tools.html"')
            text = text.replace("href='seo-tools.html'", "href='tools.html'")
            text = text.replace('href="url-parser.html"', 'href="developer-tools.html"')
            text = text.replace("href='url-parser.html'", "href='developer-tools.html'")
            title = 'Meta Tag & Open Graph Generator | NexusNova Tools'
            desc = 'Create SEO meta tags, Open Graph tags and social preview markup with a browser-based generator and live preview.'
            image = 'https://nexusnovatools.com/assets/nexusnova-logo-512.svg'
            additions = []
            for name, value in (
                ('twitter:title', title),
                ('twitter:description', desc),
                ('twitter:image', image),
            ):
                if not re.search(rf'<meta\s+name=["\']{re.escape(name)}["\']', text, re.I):
                    additions.append(f'<meta name="{name}" content="{html.escape(value, quote=True)}">')
            if additions:
                text = re.sub(r'</head>', ''.join(additions) + '</head>', text, count=1, flags=re.I)
            return text
        if update(meta, fix_meta) and 'meta-tag-generator.html' not in changed:
            changed.append('meta-tag-generator.html')

    for filename in DATE_NOTE_PAGES:
        path = Path(filename)
        if not path.exists():
            continue
        def add_note(text: str) -> str:
            if 'data-reference-note' in text:
                return text
            return re.sub(r'</main>', UPDATE_NOTE + '</main>', text, count=1, flags=re.I)
        if update(path, add_note):
            changed.append(filename)

    print(f'Round 2 changed {len(set(changed))} file(s).')
    for filename in sorted(set(changed)):
        print(filename)


if __name__ == '__main__':
    main()
