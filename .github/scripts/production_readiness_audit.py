from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path('.')
errors: list[str] = []


def text(path: str) -> str:
    p = ROOT / path
    if not p.exists():
        errors.append(f'missing required file: {path}')
        return ''
    return p.read_text(encoding='utf-8', errors='replace')


index = text('index.html')
sitemap = text('sitemap.xml')
robots = text('robots.txt')
main_js = text('assets/js/main.js')
contact = text('contact.html')
privacy = text('privacy.html')

# Homepage consolidation: root canonical, root sitemap, no /index.html sitemap URL,
# and an explicit conditional browser redirect for the duplicate URL GitHub Pages serves.
if '<link rel="canonical" href="https://nexusnovatools.com/">' not in index:
    errors.append('index.html canonical is not the root URL')
if 'https://nexusnovatools.com/index.html' in sitemap:
    errors.append('sitemap.xml contains duplicate /index.html homepage URL')
if '<loc>https://nexusnovatools.com/</loc>' not in sitemap:
    errors.append('sitemap.xml does not contain canonical root homepage URL')
if 'data-index-canonical-redirect' not in index or "location.pathname==='/index.html'" not in index:
    errors.append('index.html lacks explicit conditional /index.html -> / consolidation redirect')

# Robots/sitemap discovery.
if not re.search(r'(?im)^\s*User-agent:\s*\*\s*$', robots):
    errors.append('robots.txt lacks wildcard user agent')
if not re.search(r'(?im)^\s*Allow:\s*/\s*$', robots):
    errors.append('robots.txt does not allow root crawling')
if 'https://nexusnovatools.com/sitemap.xml' not in robots:
    errors.append('robots.txt does not advertise sitemap.xml')

# Homepage purpose/hierarchy and topical category discovery.
for required in (
    'Free Online Tools for', 'PDF, Images, Calculators', 'categories.html',
    'pdf-tools.html', 'image-tools.html', 'calculator-tools.html',
    'productivity-tools.html', 'pakistan-tools.html', 'Why trust NexusNova?'
):
    if required not in index:
        errors.append(f'homepage missing production-readiness marker: {required}')

# Consent-first analytics implementation.
required_consent = (
    "analytics_storage:'denied'", "ad_storage:'denied'",
    "ad_user_data:'denied'", "ad_personalization:'denied'",
    'nexusnova_analytics_consent_v1', 'Allow analytics', 'Privacy choices'
)
for marker in required_consent:
    if marker not in main_js:
        errors.append(f'GA4 consent implementation missing: {marker}')
if 'Google Analytics' not in privacy or 'Analytics choice:' not in privacy:
    errors.append('privacy page does not explain the analytics choice')

# Current public support route. Do not require a paid/domain mailbox that does not exist.
if 'nexusnovatools@gmail.com' not in contact:
    errors.append('contact page does not publish the official support email')
if 'dedicated support mailbox has not been published' in contact.lower():
    errors.append('stale no-support-mailbox copy still exists on contact page')

# Editorial ownership should be visible and linked on every indexable article/guide/tech page.
for dirname in ('articles', 'guides', 'tech'):
    folder = ROOT / dirname
    if not folder.exists():
        continue
    for page in sorted(folder.glob('*.html')):
        value = page.read_text(encoding='utf-8', errors='replace')
        if re.search(r'<meta\s+name=["\']robots["\'][^>]*content=["\'][^"\']*noindex', value, re.I):
            continue
        if 'data-editorial-attribution' not in value:
            errors.append(f'{page.as_posix()}: missing standardized editorial attribution')
        if '../editorial-team.html' not in value:
            errors.append(f'{page.as_posix()}: editorial attribution does not link to Editorial Team')

# High-impact / date-sensitive Pakistan pages must expose sources/reference/update language.
for filename in (
    'currency-rates.html', 'gold-rates.html', 'fuel-rates.html',
    'salary-tax-calculator-pakistan.html', 'electricity-bill-calculator-pakistan.html',
    'zakat-calculator-pakistan.html', 'prayer-times-qibla-pakistan.html',
    'pakistan-public-holidays-2026.html'
):
    value = re.sub(r'<script\b.*?</script>', '', text(filename), flags=re.I | re.S).lower()
    if 'source' not in value:
        errors.append(f'{filename}: no visible source wording')
    if not any(term in value for term in ('last updated', 'reference date', 'last reviewed', 'applicable', 'tax year')):
        errors.append(f'{filename}: no visible update/reference-period wording')
    if not any(term in value for term in ('method', 'formula', 'calculation', 'assumption', 'basis', 'reference')):
        errors.append(f'{filename}: no visible method/formula/reference wording')

# Topical hubs must exist and remain indexable/canonicalized.
for filename in ('categories.html','pdf-tools.html','image-tools.html','calculator-tools.html','productivity-tools.html','pakistan-tools.html'):
    value = text(filename)
    if 'noindex' in value.lower():
        errors.append(f'{filename}: topical hub is noindex')
    canonical = f'https://nexusnovatools.com/{filename}'
    if canonical not in value:
        errors.append(f'{filename}: canonical URL marker missing')
    if canonical not in sitemap:
        errors.append(f'{filename}: missing from sitemap.xml')

print('NEXUSNOVA PRODUCTION READINESS AUDIT')
print(f'Errors: {len(errors)}')
if errors:
    for item in errors:
        print(f'- {item}')
    sys.exit(1)
print('All production-readiness checks passed.')
