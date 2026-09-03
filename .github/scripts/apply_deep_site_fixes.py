from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path('.')
TODAY = '2026-09-03'
SKIP_DIRS = {'.git', 'node_modules', 'vendor', 'ota', 'downloads', 'nexusnova-dev-ai'}

PROTECTED_PREFIXES = (
    'cloudflare/', 'functions/', 'firebase/', 'nexusnova-dev-ai/', 'ota/', 'downloads/'
)

NAV_ITEMS = [
    ('index.html', 'Home'),
    ('tools.html', 'Tools'),
    ('categories.html', 'Categories'),
    ('labs.html', 'Labs'),
    ('live.html', 'LIVE'),
    ('articles.html', 'Articles'),
    ('guides.html', 'Guides'),
]

CONTROL_LABELS = {
    'meta-file': 'Choose image file for metadata removal',
    'merge-input': 'Choose PDF files to merge',
    'enhance-file': 'Choose image to enhance',
    'qr-text': 'Text or URL for QR code',
    'split-input': 'Choose PDF file to split',
    'typing-input': 'Typing test input',
    'unit-category': 'Unit category',
    'unit-from': 'From unit',
    'unit-to': 'To unit',
}

DATE_SENSITIVE = {
    'earthquakes-live.html', 'live-alerts.html', 'live.html',
    'pakistan-public-holidays-2026.html', 'prayer-times-qibla-pakistan.html',
    'pulse.html', 'salary-tax-calculator-pakistan.html', 'sports-live.html',
    'weather-live.html',
}

UPDATE_NOTE = (
    '<section class="section" data-reference-note><div class="container">'
    '<p class="mini-note"><strong>Update/reference note:</strong> Source timestamps or the applicable '
    'reference period are shown with the data or calculation where available. If a source is unavailable, '
    'NexusNova does not invent a current value.</p></div></section>'
)

CONSENT_BOOTSTRAP = r'''(()=>{
  const measurementId='G-YLPFKWSS12';
  const consentKey='nexusnova_analytics_consent_v1';
  if(window.__nexusnovaConsentReady)return;
  window.__nexusnovaConsentReady=true;
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
  window.gtag('consent','default',{
    analytics_storage:'denied',
    ad_storage:'denied',
    ad_user_data:'denied',
    ad_personalization:'denied',
    wait_for_update:500
  });
  window.gtag('js',new Date());

  const readChoice=()=>{try{return localStorage.getItem(consentKey)||''}catch(_){return ''}};
  const saveChoice=value=>{try{localStorage.setItem(consentKey,value)}catch(_){}};
  let analyticsLoaded=false;
  const loadAnalytics=()=>{
    window.gtag('consent','update',{
      analytics_storage:'granted',
      ad_storage:'denied',
      ad_user_data:'denied',
      ad_personalization:'denied'
    });
    if(analyticsLoaded||document.querySelector('script[data-nexusnova-ga4]'))return;
    analyticsLoaded=true;
    const analyticsScript=document.createElement('script');
    analyticsScript.async=true;
    analyticsScript.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    analyticsScript.dataset.nexusnovaGa4='';
    analyticsScript.onload=()=>window.gtag('config',measurementId,{
      allow_google_signals:false,
      allow_ad_personalization_signals:false
    });
    document.head.appendChild(analyticsScript);
  };
  const denyAnalytics=()=>window.gtag('consent','update',{
    analytics_storage:'denied',
    ad_storage:'denied',
    ad_user_data:'denied',
    ad_personalization:'denied'
  });

  const mountChoices=()=>{
    if(document.querySelector('[data-nexusnova-consent]'))return;
    const inSubdir=/\/(guides|articles|tech)\//.test(location.pathname);
    const base=inSubdir?'../':'';
    const style=document.createElement('style');
    style.dataset.nexusnovaConsentStyle='';
    style.textContent='.nn-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:780px;margin:auto;padding:16px 18px;border:1px solid #cbd5e1;border-radius:18px;background:#fff;color:#111827;box-shadow:0 18px 55px rgba(15,23,42,.22);font:14px/1.45 system-ui,sans-serif}.nn-consent[hidden]{display:none}.nn-consent p{margin:0 0 12px}.nn-consent-actions{display:flex;gap:8px;flex-wrap:wrap}.nn-consent button,.nn-privacy-choice{border:1px solid #cbd5e1;border-radius:999px;padding:9px 13px;background:#fff;color:#111827;font:700 13px system-ui,sans-serif;cursor:pointer}.nn-consent .primary{background:#111827;color:#fff;border-color:#111827}.nn-consent a{color:inherit;text-decoration:underline}.nn-privacy-choice{position:fixed;right:14px;bottom:14px;z-index:9998;box-shadow:0 8px 24px rgba(15,23,42,.14)}@media(max-width:640px){.nn-consent{left:10px;right:10px;bottom:10px}.nn-privacy-choice{right:10px;bottom:10px}}';
    document.head.appendChild(style);

    const banner=document.createElement('div');
    banner.className='nn-consent';
    banner.dataset.nexusnovaConsent='';
    banner.setAttribute('role','dialog');
    banner.setAttribute('aria-label','Analytics privacy choice');
    banner.innerHTML=`<p><strong>Optional analytics</strong><br>NexusNova can use Google Analytics to measure website traffic. Analytics stays off unless you allow it. <a href="${base}privacy.html">Privacy details</a>.</p><div class="nn-consent-actions"><button type="button" class="primary" data-consent-allow>Allow analytics</button><button type="button" data-consent-deny>No thanks</button></div>`;
    document.body.appendChild(banner);

    const reopen=document.createElement('button');
    reopen.type='button';
    reopen.className='nn-privacy-choice';
    reopen.textContent='Privacy choices';
    reopen.setAttribute('aria-label','Open analytics privacy choices');
    document.body.appendChild(reopen);

    const hide=()=>{banner.hidden=true};
    banner.querySelector('[data-consent-allow]').addEventListener('click',()=>{saveChoice('granted');loadAnalytics();hide()});
    banner.querySelector('[data-consent-deny]').addEventListener('click',()=>{saveChoice('denied');denyAnalytics();hide()});
    reopen.addEventListener('click',()=>{banner.hidden=false;banner.querySelector('button')?.focus()});

    const choice=readChoice();
    if(choice==='granted'){loadAnalytics();hide()}
    else if(choice==='denied'){denyAnalytics();hide()}
  };

  const initialChoice=readChoice();
  if(initialChoice==='granted')loadAnalytics();
  else denyAnalytics();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountChoices,{once:true});
  else mountChoices();
})();'''

PRIVACY_NOTICE = (
    '<section class="section" data-analytics-consent-notice><div class="container article">'
    '<div class="notice"><strong>Analytics choice:</strong> Google Analytics is optional. On a new browser, '
    'analytics storage and advertising-related storage start denied, and the Google Analytics script is not '
    'loaded unless you choose <em>Allow analytics</em>. Your choice is stored locally in this browser so the '
    'site can remember it. Use the visible <strong>Privacy choices</strong> control at any time to change the '
    'choice. Declining analytics does not block the public tools.</div></div></section>'
)

TOOL_DEPTH_SECTIONS = {
    'image-to-text-ocr.html': (
        '<section class="section" data-deep-seo><div class="container article">'
        '<h2>English OCR works best with clear source images</h2><p>Use a sharp, upright image with readable '
        'contrast. Small text, motion blur, handwriting, decorative fonts and mixed-language documents can '
        'reduce recognition accuracy, so review important extracted text before using it.</p>'
        '<h2>Privacy and processing</h2><p>This OCR tool is designed around browser-side processing. Its current '
        'recognition model is English, so the page labels that limitation instead of implying universal-language accuracy.</p>'
        '<p>Related: <a href="image-compressor.html">Image Compressor</a> · <a href="image-metadata-remover.html">Metadata Remover</a> · <a href="qr-code-scanner.html">QR Scanner</a>.</p>'
        '</div></section>'
    ),
    'meta-tag-generator.html': (
        '<section class="section" data-deep-seo><div class="container article">'
        '<h2>Preview metadata before publishing</h2><p>Generated tags are a starting point. Keep the page title '
        'and description accurate to the real page, use a canonical URL you control, and confirm the final HTML '
        'after publishing.</p><h2>Social previews can vary</h2><p>Open Graph and social-card tags help platforms '
        'understand a page, but each platform may cache or crop previews differently. Recheck the live URL after '
        'major metadata changes.</p><p>Related: <a href="seo-tools.html">SEO Tools</a> · <a href="url-parser.html">URL Parser</a> · <a href="tool-methodology.html">Methodology</a>.</p>'
        '</div></section>'
    ),
    'paper-size-converter.html': (
        '<section class="section" data-deep-seo><div class="container article">'
        '<h2>Pixel dimensions depend on DPI</h2><p>A physical paper size does not have one universal pixel size. '
        'The pixel result changes with the DPI/PPI value, so choose a value that matches the print or screen workflow.</p>'
        '<h2>Check the destination requirement</h2><p>For printing, use the printer or publisher requirement. For '
        'online forms, use the exact dimensions requested by that service instead of assuming a print DPI.</p>'
        '<p>Related: <a href="image-resizer.html">Image Resizer</a> · <a href="image-compressor.html">Image Compressor</a> · <a href="jpg-to-pdf.html">JPG to PDF</a>.</p>'
        '</div></section>'
    ),
    'photo-cctv-enhancer.html': (
        '<section class="section" data-deep-seo><div class="container article">'
        '<h2>Enhancement improves visibility, not missing evidence</h2><p>Brightness, contrast, sharpening and '
        'upscaling can make existing pixels easier to inspect, but they cannot reliably reconstruct details that '
        'were never captured in the source image.</p><h2>Use the original for important decisions</h2><p>Keep the '
        'original file and compare it with the enhanced copy. For legal, identification or safety-sensitive use, '
        'do not treat enhancement artifacts as verified source detail.</p><p>Related: <a href="image-resizer.html">Image Resizer</a> · <a href="image-metadata-remover.html">Metadata Remover</a> · <a href="image-to-text-ocr.html">English OCR</a>.</p>'
        '</div></section>'
    ),
}


def read(path: Path) -> str:
    return path.read_text(encoding='utf-8', errors='replace')


def write_if_changed(path: Path, content: str) -> bool:
    old = read(path) if path.exists() else None
    if old == content:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8')
    return True


def is_subdir(page: Path) -> bool:
    return any(part in {'articles', 'guides', 'tech'} for part in page.parts[:-1])


def raw_nav(page: Path) -> str:
    base = '../' if is_subdir(page) else ''
    current = page.name.lower()
    links = []
    for filename, label in NAV_ITEMS:
        active = ' aria-current="page"' if current == filename else ''
        if filename == 'articles.html' and 'articles' in page.parts:
            active = ' aria-current="page"'
        if filename == 'guides.html' and 'guides' in page.parts:
            active = ' aria-current="page"'
        links.append(f'<a href="{base}{filename}"{active}>{label}</a>')
    return '<nav class="nav" data-nav aria-label="Primary navigation">' + ''.join(links) + '</nav>'


def add_attr_to_tag(text: str, tag: str, element_id: str, attr: str, value: str) -> str:
    pattern = re.compile(rf'<{tag}\b(?=[^>]*\bid=["\']{re.escape(element_id)}["\'])[^>]*>', re.I)
    def repl(match):
        value_text = match.group(0)
        if re.search(rf'\b{re.escape(attr)}\s*=', value_text, re.I):
            return value_text
        return value_text[:-1] + f' {attr}="{html.escape(value, quote=True)}">'
    return pattern.sub(repl, text, count=1)


def ensure_twitter_tags(text: str) -> str:
    if re.search(r'<meta\s+name=["\']robots["\'][^>]*content=["\'][^"\']*noindex', text, re.I):
        return text
    def meta_content(kind: str, key: str) -> str:
        pattern = rf'<meta\s+{kind}=["\']{re.escape(key)}["\'][^>]*content=["\']([^"\']*)["\'][^>]*>'
        m = re.search(pattern, text, re.I)
        return html.unescape(m.group(1)) if m else ''
    title_m = re.search(r'<title>(.*?)</title>', text, re.I | re.S)
    title = ' '.join(html.unescape(title_m.group(1)).split()) if title_m else 'NexusNova Tools'
    desc = meta_content('name', 'description')
    og_title = meta_content('property', 'og:title') or title
    og_desc = meta_content('property', 'og:description') or desc
    og_image = meta_content('property', 'og:image') or 'https://nexusnovatools.com/assets/nexusnova-logo-512.svg'
    additions = []
    values = {
        'twitter:card': 'summary_large_image',
        'twitter:title': og_title,
        'twitter:description': og_desc,
        'twitter:image': og_image,
    }
    for name, value in values.items():
        if not re.search(rf'<meta\s+name=["\']{re.escape(name)}["\']', text, re.I):
            additions.append(f'<meta name="{name}" content="{html.escape(value, quote=True)}">')
    if additions:
        text = re.sub(r'</head>', ''.join(additions) + '</head>', text, count=1, flags=re.I)
    return text


def fix_blank_links(text: str) -> str:
    pattern = re.compile(r'<a\b[^>]*\btarget=["\']_blank["\'][^>]*>', re.I)
    def repl(match):
        tag = match.group(0)
        rel_match = re.search(r'\brel=["\']([^"\']*)["\']', tag, re.I)
        if rel_match:
            tokens = rel_match.group(1).split()
            for token in ('noopener', 'noreferrer'):
                if token not in {t.lower() for t in tokens}:
                    tokens.append(token)
            replacement = 'rel="' + ' '.join(tokens) + '"'
            return tag[:rel_match.start()] + replacement + tag[rel_match.end():]
        return tag[:-1] + ' rel="noopener noreferrer">'
    return pattern.sub(repl, text)


def fix_html_file(page: Path) -> bool:
    rel = page.as_posix()
    if rel.startswith(PROTECTED_PREFIXES):
        return False
    text = read(page)
    original = text

    # Make static/raw nav match the concise JS-enhanced navigation.
    text = re.sub(r'<nav\b(?=[^>]*\bdata-nav\b)[^>]*>.*?</nav>', lambda _m: raw_nav(page), text, flags=re.I | re.S)

    # Known missing accessible names from the refined scanner.
    if 'data-comment-input' in text:
        text = re.sub(
            r'<textarea\b(?=[^>]*\bdata-comment-input\b)[^>]*>',
            lambda m: m.group(0) if re.search(r'\baria-label\s*=', m.group(0), re.I) else m.group(0)[:-1] + ' aria-label="Comment">',
            text,
        )
    for element_id, label in CONTROL_LABELS.items():
        for tag in ('input', 'textarea', 'select'):
            text = add_attr_to_tag(text, tag, element_id, 'aria-label', label)

    text = fix_blank_links(text)
    text = ensure_twitter_tags(text)

    if page.name in DATE_SENSITIVE:
        lower_visible = re.sub(r'<script\b.*?</script>', '', text, flags=re.I | re.S).lower()
        if 'data-reference-note' not in text and not any(k in lower_visible for k in ('last updated', 'reference date', 'last reviewed', 'data time', 'as of')):
            text = re.sub(r'</main>', UPDATE_NOTE + '</main>', text, count=1, flags=re.I)

    if page.name == 'bill-split-tip-calculator.html' and 'data-browser-privacy-note' not in text:
        note = '<section class="section" data-browser-privacy-note><div class="container article"><h2>Privacy</h2><p>This calculator handles the bill, tip and split values in the browser interface and does not require an account. Review the result before using it for a payment decision.</p></div></section>'
        text = re.sub(r'</main>', note + '</main>', text, count=1, flags=re.I)

    if page.name == 'currency-rates.html' and 'data-related-currency-links' not in text:
        related = '<section class="section" data-related-currency-links><div class="container article"><h2>Related NexusNova tools</h2><p><a href="live.html">Pakistan Today</a> · <a href="gold-rates.html">Gold Rates</a> · <a href="salary-tax-calculator-pakistan.html">Pakistan Salary Tax</a> · <a href="pakistan-tools.html">Pakistan Tools</a></p></div></section>'
        text = re.sub(r'</main>', related + '</main>', text, count=1, flags=re.I)

    if page.name in TOOL_DEPTH_SECTIONS and 'data-deep-seo' not in text:
        text = re.sub(r'</main>', TOOL_DEPTH_SECTIONS[page.name] + '</main>', text, count=1, flags=re.I)

    return write_if_changed(page, text) if text != original else False


def build_collection_page(filename: str, title: str, description: str, kicker: str, heading: str, intro: str, cards: list[tuple[str, str, str]]) -> str:
    canonical = f'https://nexusnovatools.com/{filename}'
    card_html = ''.join(
        f'<a class="article-card" href="{html.escape(href, quote=True)}"><span class="tag">{html.escape(tag)}</span><h3>{html.escape(name)}</h3><p>{html.escape(copy)}</p></a>'
        for href, tag, name, copy in cards
    )
    schema_items = [
        {'@type': 'ListItem', 'position': i + 1, 'name': name, 'url': f'https://nexusnovatools.com/{href}'}
        for i, (href, _tag, name, _copy) in enumerate(cards)
    ]
    schema = json.dumps({
        '@context': 'https://schema.org',
        '@graph': [
            {'@type': 'CollectionPage', 'name': heading, 'url': canonical, 'description': description, 'dateModified': TODAY},
            {'@type': 'ItemList', 'itemListElement': schema_items},
            {'@type': 'BreadcrumbList', 'itemListElement': [
                {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://nexusnovatools.com/'},
                {'@type': 'ListItem', 'position': 2, 'name': heading, 'item': canonical},
            ]},
        ]
    }, separators=(',', ':'))
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title><meta name="description" content="{html.escape(description, quote=True)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta name="theme-color" content="#f5f7fb"><link rel="canonical" href="{canonical}"><link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website"><meta property="og:site_name" content="NexusNova Tools"><meta property="og:title" content="{html.escape(title, quote=True)}"><meta property="og:description" content="{html.escape(description, quote=True)}"><meta property="og:url" content="{canonical}"><meta property="og:image" content="https://nexusnovatools.com/assets/nexusnova-logo-512.svg"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{html.escape(title, quote=True)}"><meta name="twitter:description" content="{html.escape(description, quote=True)}"><meta name="twitter:image" content="https://nexusnovatools.com/assets/nexusnova-logo-512.svg"><link rel="stylesheet" href="assets/css/site.css"><link rel="stylesheet" href="assets/css/scifi.css" data-nexusnova-scifi><script type="application/ld+json">{schema}</script></head><body>
<header class="site-header" data-header><div class="container nav-wrap"><a class="brand" href="index.html" aria-label="NexusNova Tools home"><span class="brand-mark" aria-hidden="true">N</span><span class="brand-copy"><strong>NEXUSNOVA TOOLS</strong><small>FAST EVERYDAY UTILITIES</small></span></a><button class="menu-btn" type="button" data-menu-btn aria-expanded="false" aria-label="Open navigation">☰</button>{raw_nav(Path(filename))}</div></header>
<main><section class="page-hero"><div class="container"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span>›</span><a href="categories.html">Categories</a><span>›</span><span aria-current="page">{html.escape(heading)}</span></nav><span class="kicker">{html.escape(kicker)}</span><h1>{html.escape(heading)}</h1><p>{html.escape(intro)}</p></div></section><section class="section"><div class="container"><div class="article-grid">{card_html}</div></div></section><section class="section"><div class="container article"><h2>How this category is organized</h2><p>Each utility keeps its own dedicated page so the input, method, privacy behavior and limitations can be explained where they matter. Use the related links on each page to move between closely connected tasks instead of searching a giant unstructured list.</p><h2>Trust and privacy</h2><p>NexusNova labels local browser processing where it is actually used and shows sources or reference methods on data-sensitive pages. Read the <a href="tool-methodology.html">Tool Methodology</a> and <a href="privacy.html">Privacy Policy</a> for details.</p></div></section></main>
<footer class="site-footer"><div class="container footer-bottom"><span>© <span data-year></span> NexusNova Tools.</span><a href="tool-methodology.html">Methodology</a><a href="editorial-policy.html">Editorial Policy</a><a href="privacy.html">Privacy</a><a href="contact.html">Contact</a></div></footer><script src="assets/js/main.js" defer></script></body></html>'''


def create_hubs() -> list[str]:
    pages: dict[str, tuple[str, str, str, str, str, list[tuple[str, str, str, str]]]] = {
        'pdf-tools.html': (
            'Free PDF & Document Tools Online | NexusNova',
            'Free browser-based PDF and document tools for merging, splitting, creating PDFs and converting images or text into documents.',
            'PDF & DOCUMENTS', 'PDF & Document Tools',
            'Handle common PDF and document tasks from focused NexusNova utilities with clear limits and privacy notes.',
            [
                ('merge-pdf.html','PDF','Merge PDF','Combine multiple PDF files into one document.'),
                ('split-pdf.html','PDF','Split PDF','Extract or separate pages from a PDF.'),
                ('jpg-to-pdf.html','PDF','JPG to PDF','Turn supported JPG/JPEG images into a PDF document.'),
                ('text-to-pdf.html','PDF','Text to PDF','Create a PDF from text in the browser.'),
                ('resume-builder.html','DOCUMENT','Resume Builder','Build a resume preview and print or save it as PDF.'),
                ('invoice-maker.html','DOCUMENT','Simple Invoice Generator','Create a lightweight invoice and print or save it as PDF.'),
            ],
        ),
        'image-tools.html': (
            'Free Image Tools Online | NexusNova Tools',
            'Free browser image tools for compression, resizing, format conversion, OCR, metadata cleanup and practical image enhancement.',
            'IMAGE TOOLS', 'Image Tools',
            'Compress, resize, convert, inspect or extract information from images with dedicated browser-focused utilities.',
            [
                ('image-compressor.html','IMAGE','Image Compressor','Compress and resize JPG, PNG and WebP images.'),
                ('image-resizer.html','IMAGE','Image Resizer','Resize images to the dimensions you need.'),
                ('image-metadata-remover.html','PRIVACY','Metadata Remover','Create a clean image copy without common EXIF/GPS metadata.'),
                ('image-to-text-ocr.html','OCR','English Image OCR','Extract copyable English text from images.'),
                ('png-to-jpg.html','CONVERT','PNG to JPG','Convert PNG images to JPG.'),
                ('jpg-to-png.html','CONVERT','JPG to PNG','Convert JPG images to PNG.'),
                ('webp-to-jpg.html','CONVERT','WebP to JPG','Convert WebP images to JPG.'),
                ('photo-cctv-enhancer.html','IMAGE','Photo & CCTV Enhancer','Adjust and upscale still images without claiming to recover missing detail.'),
            ],
        ),
        'calculator-tools.html': (
            'Free Online Calculators | NexusNova Tools',
            'Free online calculators for percentages, EMI, BMI, dates, time, gaming eDPI, AI VRAM and practical Pakistan estimates.',
            'CALCULATORS', 'Online Calculators',
            'Use focused calculators with visible formulas, assumptions, units and reference notes where the result depends on changing data.',
            [
                ('calculator.html','MATH','Calculator','Handle everyday arithmetic.'),
                ('scientific-calculator.html','MATH','Scientific Calculator','Use common scientific functions in the browser.'),
                ('percentage-calculator.html','MATH','Percentage Calculator','Calculate common percentage problems.'),
                ('percentage-change-calculator.html','MATH','Percentage Change','Measure percentage increase or decrease.'),
                ('emi-calculator.html','FINANCE','EMI Calculator','Estimate installment payments from entered loan values.'),
                ('bmi-calculator.html','HEALTH','BMI Calculator','Calculate BMI as a general numeric screening reference.'),
                ('age-calculator.html','DATE','Age Calculator','Calculate age from dates.'),
                ('date-difference-calculator.html','DATE','Date Difference','Measure the difference between two dates.'),
                ('edpi-calculator.html','GAMING','eDPI Calculator','Calculate effective DPI from mouse DPI and sensitivity.'),
                ('ai-vram-calculator.html','AI','AI VRAM Calculator','Estimate model-weight memory from parameters and precision.'),
            ],
        ),
        'productivity-tools.html': (
            'Free Productivity Tools Online | NexusNova',
            'Free productivity tools for resumes, invoices, prompts, notes, typing, meeting planning and quick everyday digital workflows.',
            'PRODUCTIVITY', 'Productivity Tools',
            'Create, plan, draft and organize common digital tasks with lightweight tools and explicit privacy behavior.',
            [
                ('resume-builder.html','CAREER','Resume Builder','Draft a resume with a live local preview and print/PDF output.'),
                ('invoice-maker.html','BUSINESS','Simple Invoice Generator','Build a simple invoice with line items, tax and discount.'),
                ('ai-prompt-builder.html','AI','AI Prompt Builder','Structure prompts without calling an AI model.'),
                ('private-quick-note.html','NOTE','Private Quick Note','Keep a quick browser note on the current device.'),
                ('typing-speed-test.html','SKILL','Typing Speed Test','Measure WPM and accuracy.'),
                ('timezone-meeting-planner.html','TIME','Timezone Meeting Planner','Compare meeting times across regions.'),
                ('whatsapp-link-generator.html','LINK','WhatsApp Link Generator','Create a wa.me chat link with an optional message.'),
            ],
        ),
        'pakistan-tools.html': (
            'Pakistan Online Tools & Calculators | NexusNova',
            'Pakistan-focused tools for currency, gold, fuel, weather, salary tax, electricity bills, Zakat, prayer times and public holidays.',
            'PAKISTAN', 'Pakistan Tools',
            'Open Pakistan-first live references and calculators with source, method and limitation notes kept visible on the relevant page.',
            [
                ('live.html','LIVE','Pakistan Today','Open the NexusNova LIVE Pakistan-first dashboard.'),
                ('currency-rates.html','CURRENCY','Currency Rates','View Pakistan-first reference rates and convert currencies.'),
                ('gold-rates.html','GOLD','Gold Rates','See international XAU/USD and transparent PKR reference calculations.'),
                ('fuel-rates.html','FUEL','Fuel Rates','View Pakistan fuel references with source labels.'),
                ('weather-live.html','WEATHER','Weather','Search worldwide weather with Pakistan-first discovery.'),
                ('salary-tax-calculator-pakistan.html','TAX','Pakistan Salary Tax','Estimate salaried-person tax using the stated tax-year structure.'),
                ('electricity-bill-calculator-pakistan.html','BILL','Electricity Bill','Estimate residential energy and fixed-charge components.'),
                ('zakat-calculator-pakistan.html','ZAKAT','Zakat Calculator','Calculate a private 2.5% estimate with editable nisab.'),
                ('prayer-times-qibla-pakistan.html','PRAYER','Prayer Times & Qibla','Calculate prayer times and Qibla direction for Pakistan cities.'),
                ('pakistan-public-holidays-2026.html','HOLIDAYS','Public Holidays 2026','Review federal dates with moon-dependent updates separated.'),
            ],
        ),
    }
    created = []
    for filename, args in pages.items():
        content = build_collection_page(filename, *args)
        if write_if_changed(Path(filename), content):
            created.append(filename)

    category_cards = [
        ('pdf-tools.html','PDF','PDF & Documents','Merge, split, create and convert PDF/document workflows.'),
        ('image-tools.html','IMAGE','Image Tools','Compress, resize, convert, inspect metadata and use English OCR.'),
        ('calculator-tools.html','CALCULATORS','Calculators','Math, finance, date, gaming and AI memory calculators.'),
        ('productivity-tools.html','PRODUCTIVITY','Productivity','Resume, invoice, prompt, note, typing and planning tools.'),
        ('pakistan-tools.html','PAKISTAN','Pakistan Tools','Currency, gold, fuel, tax, electricity, Zakat, prayer and holidays.'),
        ('developer-tools.html','DEVELOPER','Developer Tools','JSON, Base64, UUID, SHA-256, URL and technical utilities.'),
        ('network-tools.html','NETWORK','Network Tools','Public IP and SSL certificate inspection tools.'),
        ('gaming.html','GAMING','Gaming Tools','Sensitivity, eDPI, frame time, reaction and gaming utilities.'),
        ('labs.html','LABS','NexusNova Labs','Pulse, Magic Drop, X-Ray, widgets and experimental experiences.'),
        ('live.html','LIVE','NexusNova LIVE','Pakistan-first and worldwide live/reference data pages.'),
    ]
    categories = build_collection_page(
        'categories.html',
        'Free Online Tool Categories | NexusNova Tools',
        'Browse NexusNova Tools by clear categories including PDF, images, calculators, productivity, Pakistan, developer, network, gaming and Labs.',
        'BROWSE BY TASK', 'Tool Categories',
        'Start with the type of task you need instead of scrolling through one giant list of unrelated utilities.',
        category_cards,
    )
    if write_if_changed(Path('categories.html'), categories):
        created.append('categories.html')
    return created


def update_sitemap(urls: list[str]) -> bool:
    path = Path('sitemap.xml')
    text = read(path)
    original = text
    additions = []
    for filename in urls:
        canonical = f'https://nexusnovatools.com/{filename}'
        if canonical in text:
            continue
        additions.append(f'  <url><loc>{canonical}</loc><lastmod>{TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.80</priority></url>')
    if additions:
        text = re.sub(r'</urlset>\s*$', '\n' + '\n'.join(additions) + '\n</urlset>\n', text, count=1, flags=re.I)
    return write_if_changed(path, text) if text != original else False


def fix_homepage() -> bool:
    path = Path('index.html')
    text = read(path)
    original = text
    text = re.sub(
        r'<h1>Useful online tools\s*<span class="neon-word">without the clutter\.</span></h1>',
        '<h1>Free Online Tools for <span class="neon-word">PDF, Images, Calculators &amp; More.</span></h1>',
        text,
        count=1,
        flags=re.I,
    )
    if 'href="categories.html">Categories' not in text:
        text = text.replace('<a class="btn" href="tools.html">Browse Tools</a>', '<a class="btn" href="tools.html">Browse Tools</a><a class="btn" href="categories.html">Categories</a>', 1)
    if 'data-home-trust' not in text:
        trust = '''<section class="section" data-home-trust><div class="container"><div class="section-head"><div><span class="kicker">TRUST & PRIVACY</span><h2>Why trust NexusNova?</h2></div><p>Clear processing notes, visible limitations and source-aware data pages—without pretending every tool works the same way.</p></div><div class="home-tools"><a class="home-tool" href="privacy.html"><b>Local where stated</b><span>Files stay on your device on tools that explicitly say local browser processing.</span></a><a class="home-tool" href="tool-methodology.html"><b>Methods explained</b><span>Calculations, browser behavior and important limitations are documented.</span></a><a class="home-tool" href="editorial-policy.html"><b>No fake authority</b><span>No fabricated experts, testimonials or usage statistics are used as trust shortcuts.</span></a><a class="home-tool" href="contact.html"><b>Corrections welcome</b><span>Report a broken tool, unclear explanation or material factual issue directly.</span></a></div></div></section>'''
        text = re.sub(r'</main>', trust + '</main>', text, count=1, flags=re.I)
    return write_if_changed(path, text) if text != original else False


def fix_tools_discovery() -> bool:
    path = Path('tools.html')
    text = read(path)
    original = text
    if 'data-category-discovery' not in text:
        block = '''<section class="section" data-category-discovery><div class="container"><div class="section-head"><div><span class="kicker">BROWSE BY CATEGORY</span><h2>Start with the task type.</h2></div><p>Use focused hubs for PDF, images, calculators, productivity, Pakistan, developer/network and gaming tools.</p></div><div class="article-grid"><a class="article-card" href="pdf-tools.html"><span class="tag">PDF</span><h3>PDF & Documents</h3><p>Merge, split, create and convert documents.</p></a><a class="article-card" href="image-tools.html"><span class="tag">IMAGE</span><h3>Image Tools</h3><p>Compress, resize, convert, OCR and metadata tasks.</p></a><a class="article-card" href="calculator-tools.html"><span class="tag">CALCULATORS</span><h3>Calculators</h3><p>Math, finance, dates, gaming and AI estimates.</p></a><a class="article-card" href="productivity-tools.html"><span class="tag">PRODUCTIVITY</span><h3>Productivity</h3><p>Resume, invoice, prompts, notes and planning.</p></a><a class="article-card" href="pakistan-tools.html"><span class="tag">PAKISTAN</span><h3>Pakistan Tools</h3><p>Live references and Pakistan-first calculators.</p></a><a class="article-card" href="categories.html"><span class="tag">ALL</span><h3>All Categories</h3><p>See every major NexusNova tool cluster.</p></a></div></div></section>'''
        text = re.sub(r'(<section class="section")', block + r'\1', text, count=1, flags=re.I)
    return write_if_changed(path, text) if text != original else False


def fix_main_js() -> bool:
    path = Path('assets/js/main.js')
    text = read(path)
    original = text
    first_end = text.find('\n})();')
    if first_end < 0:
        raise SystemExit('Could not locate first main.js bootstrap IIFE safely.')
    first_end += len('\n})();')
    if "const measurementId='G-YLPFKWSS12';" not in text[:first_end]:
        if 'nexusnova_analytics_consent_v1' not in text:
            raise SystemExit('GA4 bootstrap changed unexpectedly; refusing broad main.js rewrite.')
    else:
        text = CONSENT_BOOTSTRAP + text[first_end:]

    old_items = "['index.html','Home'],['labs.html','Labs'],['live.html','LIVE'],['tools.html','Tools'],['articles.html','Articles'],['guides.html','Guides'],['app.html','App']"
    new_items = "['index.html','Home'],['tools.html','Tools'],['categories.html','Categories'],['labs.html','Labs'],['live.html','LIVE'],['articles.html','Articles'],['guides.html','Guides']"
    text = text.replace(old_items, new_items, 1)
    return write_if_changed(path, text) if text != original else False


def fix_privacy() -> bool:
    path = Path('privacy.html')
    text = read(path)
    original = text
    if 'data-analytics-consent-notice' not in text:
        text = re.sub(r'<main>', '<main>' + PRIVACY_NOTICE, text, count=1, flags=re.I)
    return write_if_changed(path, text) if text != original else False


def main() -> None:
    changed: list[str] = []
    for path in sorted(ROOT.rglob('*.html')):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if fix_html_file(path):
            changed.append(path.as_posix())

    hubs = create_hubs()
    changed.extend(hubs)
    # Normalize the newly created hubs too.
    for filename in hubs:
        path = Path(filename)
        if fix_html_file(path) and filename not in changed:
            changed.append(filename)

    if update_sitemap(['categories.html','pdf-tools.html','image-tools.html','calculator-tools.html','productivity-tools.html','pakistan-tools.html']):
        changed.append('sitemap.xml')
    if fix_homepage():
        changed.append('index.html')
    if fix_tools_discovery():
        changed.append('tools.html')
    if fix_main_js():
        changed.append('assets/js/main.js')
    if fix_privacy():
        changed.append('privacy.html')

    # One final HTML normalization pass after targeted insertions.
    for path in sorted(ROOT.rglob('*.html')):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if fix_html_file(path) and path.as_posix() not in changed:
            changed.append(path.as_posix())

    print(f'Changed {len(set(changed))} public-site files.')
    for item in sorted(set(changed)):
        print(item)


if __name__ == '__main__':
    main()
