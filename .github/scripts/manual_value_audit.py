from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path
import html as html_lib
import json
import posixpath
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
BASE = 'https://nexusnovatools.com/'
OUT_JSON = ROOT / 'manual-value-audit.json'
OUT_MD = ROOT / 'manual-value-audit.md'

NON_TOOL_ROOTS = {
    'index.html','tools.html','categories.html','daily-tools-directory.html','popular-tools.html','trending-tools.html',
    'smart-tools.html','gaming.html','developer-tools.html','pdf-tools.html','image-tools.html','calculator-tools.html',
    'productivity-tools.html','pakistan-tools.html','network-tools.html','new-tools.html','articles.html','tech.html','guides.html',
    'live.html','labs.html','about.html','contact.html','privacy.html','terms.html','disclaimer.html','faq.html',
    'editorial-policy.html','editorial-team.html','tool-methodology.html','account-deletion.html','app.html','humanproof.html',
    'currency-rates.html','gold-rates.html','fuel-rates.html','aqi-live.html','earthquakes-live.html','crypto-live.html',
    'weather-live.html','sports-live.html','live-alerts.html','pulse.html','magic-drop.html','xray.html','widgets.html',
    'pakistan-public-holidays-2026.html','refund-policy.html','cancellation-policy.html','digital-delivery-policy.html',
}

STOP = {
    'the','and','for','that','with','this','from','your','you','are','can','into','use','when','what','how','not','but',
    'will','its','their','they','has','have','was','were','our','any','all','one','more','than','only','also','about',
    'before','after','where','which','each','may','should','tool','page','nexusnova','tools'
}

METHOD_TERMS = [
    'how to','how it works','how this','how the','formula','workflow','calculation','calculate','conversion','convert',
    'process','method','steps','browser workflow','enter ','select ','choose ','generate ','scan ','extract ','resize ',
    'compress ','merge ','split ','result is','based on','works by','practical checks'
]
EXAMPLE_TERMS = [
    'example','for example','e.g.','worked example','sample','scenario','try it','quick example','examples',
    'if you enter','if you choose','input','output'
]
LIMIT_TERMS = [
    'limit','limitation','privacy','important','caution','warning','verify','check the','double-check','does not',
    "doesn't",'not a ','may not','depends on','starting point','official source','professional','risk','before relying',
    'before you rely','keep original','not guaranteed','cannot','can differ','can vary'
]


def read(path: Path) -> str:
    return path.read_text(encoding='utf-8', errors='replace')


def main_fragment(text: str) -> str:
    m = re.search(r'<main\b[^>]*>(.*?)</main>', text, re.I | re.S)
    return m.group(1) if m else text

def duplicate_section_blocks(fragment: str) -> list[dict]:
    """Find substantial, exact duplicate visible sections inside one page.

    This is a redundancy detector, not a minimum-word-count rule. Hidden responsive
    copies are ignored, and only sections with at least 80 words are compared to
    keep ordinary short UI fragments from becoming false positives.
    """
    seen: dict[str, tuple[int, int]] = {}
    duplicates: list[dict] = []
    pattern = re.compile(r'<section\b(?P<attrs>[^>]*)>(?P<body>.*?)</section\s*>', re.I | re.S)
    for index, match in enumerate(pattern.finditer(fragment), start=1):
        attrs = match.group('attrs') or ''
        if re.search(r'\bhidden\b|aria-hidden\s*=\s*["\']true|display\s*:\s*none|(?:^|["\' ])(?:hidden|d-none|is-hidden|u-hidden)(?:["\' ])', attrs, re.I):
            continue
        plain = clean_fragment(match.group('body'))
        count = len(words(plain))
        if count < 80:
            continue
        normalized = re.sub(r'[^a-z0-9]+', ' ', plain.lower()).strip()
        if not normalized:
            continue
        if normalized in seen:
            first_index, first_count = seen[normalized]
            duplicates.append({'first_section': first_index, 'duplicate_section': index, 'word_count': min(first_count, count)})
        else:
            seen[normalized] = (index, count)
    return duplicates



def clean_fragment(fragment: str) -> str:
    fragment = re.sub(r'<!--.*?-->', ' ', fragment, flags=re.S)
    fragment = re.sub(r'<(?:script|style|svg|noscript)\b.*?</(?:script|style|svg|noscript)>', ' ', fragment, flags=re.I | re.S)
    fragment = re.sub(r'<(?:header|footer|nav)\b.*?</(?:header|footer|nav)>', ' ', fragment, flags=re.I | re.S)
    fragment = re.sub(r'<[^>]+>', ' ', fragment)
    fragment = html_lib.unescape(fragment)
    return re.sub(r'\s+', ' ', fragment).strip()


def words(text: str) -> list[str]:
    return re.findall(r"[A-Za-z0-9][A-Za-z0-9'’+%./-]*", text)


def heading_texts(fragment: str) -> list[str]:
    return [clean_fragment(inner).lower() for _, inner in re.findall(r'<(h[1-3])\b[^>]*>(.*?)</\1>', fragment, re.I | re.S)]


def title_of(text: str) -> str:
    m = re.search(r'<title>(.*?)</title>', text, re.I | re.S)
    return clean_fragment(m.group(1)) if m else ''


def meta_description(text: str) -> str:
    """Read the content attribute without truncating on apostrophes inside quotes."""
    attr_pattern = re.compile(r"""([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))""", re.I)
    for tag in re.findall(r'<meta\b[^>]*>', text, re.I | re.S):
        attrs = {}
        for match in attr_pattern.finditer(tag):
            key = match.group(1).lower()
            value = next((group for group in match.groups()[1:] if group is not None), '')
            attrs[key] = html_lib.unescape(value)
        if attrs.get('name', '').strip().lower() == 'description':
            return attrs.get('content', '').strip()
    return ''

def meta_value(text: str, wanted: str) -> str:
    """Read one named/property metadata value without assuming attribute order."""
    attr_pattern = re.compile(r"""([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))""", re.I)
    wanted = wanted.strip().lower()
    for tag in re.findall(r'<meta\b[^>]*>', text, re.I | re.S):
        attrs = {}
        for match in attr_pattern.finditer(tag):
            key = match.group(1).lower()
            value = next((group for group in match.groups()[1:] if group is not None), '')
            attrs[key] = html_lib.unescape(value).strip()
        if attrs.get('name', '').lower() == wanted or attrs.get('property', '').lower() == wanted:
            return attrs.get('content', '').strip()
    return ''


def has_faq_section(headings: list[str]) -> bool:
    """Recognize visible FAQ/questions headings and natural question headings."""
    if any(re.search(r'\b(?:faq|frequently asked questions|common questions|questions)\b', h, re.I) for h in headings):
        return True
    return any('?' in h for h in headings)


def is_noindex(text: str) -> bool:
    return bool(re.search(r'<meta\s+name=["\']robots["\'][^>]*content=["\'][^"\']*noindex', text, re.I))


def canonical(text: str) -> str:
    m = re.search(r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)', text, re.I)
    if not m:
        m = re.search(r'<link\s+href=["\']([^"\']+)["\']\s+rel=["\']canonical["\']', text, re.I)
    return m.group(1).strip() if m else ''


def sitemap_paths() -> set[str]:
    urls: set[str] = set()
    for sm in ROOT.glob('sitemap*.xml'):
        try:
            root = ET.parse(sm).getroot()
        except Exception:
            continue
        for node in root.iter():
            if node.tag.endswith('loc') and node.text and node.text.startswith(BASE):
                url = node.text.strip()
                path = url[len(BASE):].split('?', 1)[0].split('#', 1)[0] or 'index.html'
                urls.add(path)
    urls.update({'index.html','humanproof.html','tools.html','about.html','contact.html','privacy.html','terms.html','tool-methodology.html','editorial-policy.html'})
    return urls


def classify(path: str, source: str, frag: str) -> str:
    if path.startswith(('articles/', 'tech/')):
        return 'article'
    if path.startswith('guides/'):
        return 'guide'
    if path in NON_TOOL_ROOTS:
        if path.endswith('-live.html') or path in {'currency-rates.html','gold-rates.html','fuel-rates.html','live.html','live-alerts.html','pulse.html'}:
            return 'live'
        return 'support'
    if path.count('/') == 0:
        has_main_controls = bool(re.search(r'<(?:input|select|textarea|button)\b', frag, re.I))
        has_js_tool_mount = bool(re.search(r'\bdata-tool-ui\b', frag, re.I))
        has_tool_identity = bool(re.search(r'<body\b[^>]*\bdata-tool=["\'][^"\']+', source, re.I))
        if has_main_controls or has_js_tool_mount or has_tool_identity:
            return 'tool'
    return 'support'


def local_script_texts(page_path: str, source: str) -> list[str]:
    page_dir = posixpath.dirname(page_path)
    out: list[str] = []
    for src in re.findall(r'<script\b[^>]*\bsrc=["\']([^"\']+)["\']', source, re.I):
        if re.match(r'^(?:https?:)?//', src) or src.startswith('data:'):
            continue
        clean = src.split('?', 1)[0].split('#', 1)[0]
        rel = posixpath.normpath(posixpath.join(page_dir, clean))
        p = ROOT / rel
        if p.is_file():
            out.append(read(p))
    return out


def tool_functional(path: str, source: str, frag: str) -> tuple[bool, str]:
    controls = len(re.findall(r'<(?:input|select|textarea|button)\b', frag, re.I))
    if controls:
        return True, f'{controls} interactive control(s) in main content'
    if re.search(r'\bdata-tool-ui\b', frag, re.I):
        key_match = re.search(r'<body\b[^>]*\bdata-tool=["\']([^"\']+)', source, re.I)
        if not key_match:
            return False, 'JS tool mount exists but body data-tool key is missing'
        key = key_match.group(1)
        scripts = local_script_texts(path, source)
        if any(re.search(rf"[\"']{re.escape(key)}[\"']\s*:", js) or re.search(rf"[\"']{re.escape(key)}[\"']", js) for js in scripts):
            return True, f'JS-mounted tool key {key!r} found in local implementation'
        return False, f'JS tool key {key!r} not found in local script implementation'
    return False, 'No main interactive controls or verified JS tool mount'


def has_any(headings: list[str], body: str, terms: list[str]) -> bool:
    hay = (' '.join(headings) + ' ' + body).lower()
    return any(term in hay for term in terms)


def sentences(text: str) -> list[str]:
    out=[]
    for sentence in re.split(r'(?<=[.!?])\s+', text):
        sentence = re.sub(r'\s+', ' ', sentence).strip()
        if 10 <= len(words(sentence)) <= 45:
            out.append(sentence)
    return out


def norm_sentence(sentence: str) -> str:
    sentence = sentence.lower()
    sentence = re.sub(r'https?://\S+', 'URL', sentence)
    sentence = re.sub(r'\b\d+(?:\.\d+)?\b', 'N', sentence)
    sentence = re.sub(r'[^a-z0-9%+ ]+', ' ', sentence)
    return re.sub(r'\s+', ' ', sentence).strip()


def shingles(text: str, n: int = 4) -> set[tuple[str, ...]]:
    toks = [t.lower() for t in words(text) if t.lower() not in STOP and len(t) > 2]
    return {tuple(toks[i:i+n]) for i in range(max(0, len(toks)-n+1))}


def jaccard(a: set, b: set) -> float:
    return len(a & b) / len(a | b) if a and b else 0.0


def main() -> None:
    targets = sorted(sitemap_paths())
    pages: dict[str, dict] = {}
    repeated = defaultdict(list)
    title_seen = defaultdict(list)
    desc_seen = defaultdict(list)

    for path in targets:
        file = ROOT / path
        if not file.exists() or file.suffix.lower() != '.html':
            continue
        source = read(file)
        if is_noindex(source):
            continue
        frag = main_fragment(source)
        plain = clean_fragment(frag)
        headings = heading_texts(frag)
        kind = classify(path, source, frag)
        title = title_of(source)
        desc = meta_description(source)
        functional, function_evidence = (True, 'not a tool')
        if kind == 'tool':
            functional, function_evidence = tool_functional(path, source, frag)
        entry = {
            'path': path,
            'kind': kind,
            'words': len(words(plain)),
            'headings': headings,
            'h1_count': len(re.findall(r'<h1\b', frag, re.I)),
            'interactive_controls': len(re.findall(r'<(?:input|select|textarea|button)\b', frag, re.I)),
            'functional': functional,
            'function_evidence': function_evidence,
            'method': has_any(headings, plain, METHOD_TERMS),
            'example': has_any(headings, plain, EXAMPLE_TERMS) or bool(re.search(r'<table\b', frag, re.I)),
            'limits': has_any(headings, plain, LIMIT_TERMS),
            'title': title,
            'description': desc,
            'canonical': canonical(source),
            'og_title': meta_value(source, 'og:title'),
            'og_description': meta_value(source, 'og:description'),
            'og_url': meta_value(source, 'og:url'),
            'twitter_card': meta_value(source, 'twitter:card'),
            'twitter_title': meta_value(source, 'twitter:title'),
            'twitter_description': meta_value(source, 'twitter:description'),
            'faq': has_faq_section(headings),
            'plain': plain,
            'shingles': shingles(plain),
            'duplicate_sections': duplicate_section_blocks(frag),
        }
        pages[path] = entry
        title_seen[title.strip().lower()].append(path)
        desc_seen[desc.strip().lower()].append(path)
        for sentence in sentences(plain):
            normalized = norm_sentence(sentence)
            if len(words(normalized)) >= 10:
                repeated[normalized].append(path)

    findings: list[dict] = []
    for path, page in pages.items():
        for duplicate in page.get('duplicate_sections', []):
            findings.append({
                'severity': 'high',
                'type': 'duplicate_section_content',
                'path': path,
                'detail': (
                    f"Sections {duplicate['first_section']} and {duplicate['duplicate_section']} "
                    f"repeat the same visible {duplicate['word_count']}-word content block"
                ),
            })

    for path, page in pages.items():
        kind = page['kind']
        wc = page['words']
        headings = page['headings']
        body = page['plain']

        if page['h1_count'] != 1:
            findings.append({'severity':'blocker','type':'h1','path':path,'detail':f"Expected exactly 1 H1 in main content; found {page['h1_count']}"})
        if not page['title']:
            findings.append({'severity':'blocker','type':'title','path':path,'detail':'Missing page title'})
        elif len(page['title']) < 12:
            findings.append({'severity':'warning','type':'title','path':path,'detail':'Very short page title; review search clarity'})
        if not page['description']:
            findings.append({'severity':'warning','type':'meta','path':path,'detail':'Missing meta description'})
        elif len(page['description']) < 60:
            findings.append({'severity':'warning','type':'meta','path':path,'detail':'Very short meta description; review search clarity'})
        if not page['canonical']:
            findings.append({'severity':'warning','type':'canonical','path':path,'detail':'Missing canonical URL'})
        else:
            expected_canonical = BASE if path == 'index.html' else BASE + path
            if page['canonical'].rstrip('/') != expected_canonical.rstrip('/'):
                findings.append({'severity':'warning','type':'canonical_mismatch','path':path,'detail':f"Expected canonical {expected_canonical}; found {page['canonical']}"})

        for field, label in (
            ('og_title', 'Open Graph title'),
            ('og_description', 'Open Graph description'),
            ('og_url', 'Open Graph URL'),
            ('twitter_card', 'Twitter card type'),
            ('twitter_title', 'Twitter title'),
            ('twitter_description', 'Twitter description'),
        ):
            if not page[field]:
                findings.append({'severity':'warning','type':'social_metadata','path':path,'detail':f'Missing {label}'})

        if kind == 'tool':
            if not page['functional']:
                findings.append({'severity':'blocker','type':'nonfunctional_tool_surface','path':path,'detail':page['function_evidence']})
            signals = sum(bool(page[name]) for name in ('method','example','limits'))
            # 600 words is this project's requested editorial target, not a Google-published minimum.
            if wc < 600:
                findings.append({'severity':'warning','type':'tool_content_below_target','path':path,'detail':f'{wc} visible main-content words; project target is at least 600 plus page-specific examples and limitations'})
            if not page['faq']:
                findings.append({'severity':'warning','type':'tool_faq_missing','path':path,'detail':'No visible FAQ/questions heading or question heading found'})
            # Retain the existing severe checks for pages that are unusually sparse and lack useful context.
            if wc < 120:
                findings.append({'severity':'high','type':'weak_tool_value','path':path,'detail':f'Only {wc} main-content words on an indexable tool page'})
            elif wc < 220 and signals < 2:
                findings.append({'severity':'high','type':'weak_tool_value','path':path,'detail':f'{wc} words with only {signals}/3 value signals (method/example/limits)'})
            elif wc < 300 and signals < 2:
                findings.append({'severity':'warning','type':'tool_context_review','path':path,'detail':f'{wc} words with limited explanatory context; manual review recommended'})

        elif kind in {'article','guide'}:
            # Escalate only pages that are both unusually short and structurally
            # weak. A concise guide with formulas/examples can be valuable without
            # reaching an arbitrary 650-word quota.
            signals = sum((page['method'], page['example'], page['limits']))
            if wc < 180:
                findings.append({'severity':'high','type':'weak_article_value','path':path,'detail':f'Only {wc} main-content words'})
            elif wc < 280 and len(headings) < 3 and signals < 2:
                findings.append({'severity':'high','type':'weak_article_value','path':path,'detail':f'{wc} words, {len(headings)} headings and {signals}/3 value signals'})
            elif wc < 300 and signals < 2:
                findings.append({'severity':'warning','type':'article_context_review','path':path,'detail':f'{wc} words with limited supporting context; manual review recommended'})

        elif kind == 'live':
            # An indexable live/reference page must explain source/freshness or
            # limitations. Most experimental live surfaces are intentionally noindex.
            signals = sum((page['method'], page['example'], page['limits']))
            if wc < 180 and signals < 2:
                findings.append({'severity':'high','type':'weak_live_value','path':path,'detail':f'{wc} words with insufficient source/method/limitations context'})

        if kind in {'tool','support','live'} and re.search(r'\b(?:coming soon|lorem ipsum|under construction|TODO|FIXME|sample text goes here)\b', body, re.I):
            findings.append({'severity':'blocker','type':'unfinished_copy','path':path,'detail':'Unfinished/placeholder wording on an indexable page'})
        if 'preview' in path.lower() or re.search(r'(?:preview|demo)\s*v?\d+', page['title'], re.I):
            findings.append({'severity':'blocker','type':'indexable_preview','path':path,'detail':'Preview/demo appears indexable'})

    for title, paths in title_seen.items():
        if title and len(paths) > 1:
            findings.append({'severity':'high','type':'duplicate_title','paths':paths,'detail':'Duplicate page title'})
    for desc, paths in desc_seen.items():
        if desc and len(paths) > 1:
            findings.append({'severity':'high','type':'duplicate_meta','paths':paths,'detail':'Duplicate meta description'})

    repeated_items=[]
    for sentence, paths in repeated.items():
        unique = sorted(set(paths))
        if len(unique) >= 10:
            repeated_items.append({'sentence':sentence,'count':len(unique),'paths':unique[:25]})
    repeated_items.sort(key=lambda item: (-item['count'], item['sentence']))
    for item in repeated_items[:40]:
        findings.append({'severity':'warning','type':'repeated_template_sentence','paths':item['paths'],'detail':f"Repeated across {item['count']} indexable pages: {item['sentence'][:180]}"})

    similarity=[]
    names=sorted(pages)
    for i, a_name in enumerate(names):
        a=pages[a_name]
        if a['kind'] not in {'tool','article','guide','live'}:
            continue
        for b_name in names[i+1:]:
            b=pages[b_name]
            if a['kind'] != b['kind']:
                continue
            score=jaccard(a['shingles'], b['shingles'])
            if score >= 0.55:
                similarity.append({'a':a_name,'b':b_name,'score':round(score,3),'kind':a['kind']})
    similarity.sort(key=lambda item: -item['score'])
    for item in similarity[:50]:
        findings.append({'severity':'high','type':'near_duplicate_main_content','paths':[item['a'],item['b']],'detail':f"{item['kind']} main-content similarity {item['score']}"})

    severity_order={'blocker':0,'high':1,'warning':2}
    findings.sort(key=lambda item:(severity_order.get(item['severity'],9), item['type'], item.get('path',''), str(item.get('paths',''))))
    counts=Counter(item['severity'] for item in findings)
    type_counts=Counter(item['type'] for item in findings)
    kind_counts=Counter(page['kind'] for page in pages.values())
    shortest=sorted(({path:page['words'] for path,page in pages.items() if page['kind'] in {'tool','article','guide','live'}}).items(), key=lambda pair:pair[1])[:80]
    status='REMEDIATE' if counts.get('blocker',0) or counts.get('high',0) else ('READY_WITH_WARNINGS' if counts.get('warning',0) else 'READY_FOR_MANUAL_REVIEW')

    out={
        'audit_method':'value-and-functionality heuristic; no arbitrary Google word-count requirement',
        'summary':{
            'indexable_pages_audited':len(pages),
            'page_kinds':dict(kind_counts),
            'blockers':counts.get('blocker',0),
            'high':counts.get('high',0),
            'warnings':counts.get('warning',0),
            'finding_types':dict(type_counts),
            'status':status,
        },
        'shortest_pages':[{'path':path,'words':count,'kind':pages[path]['kind']} for path,count in shortest],
        'near_duplicates':similarity[:100],
        'repeated_sentences':repeated_items[:100],
        'findings':findings,
    }
    OUT_JSON.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding='utf-8')

    lines=[
        '# NexusNova Strict Manual Value Audit','',
        'This audit checks functionality, useful context, visible FAQ coverage and metadata completeness. The 600-word tool depth target is a project editorial standard, not a Google-published minimum.','',
        f'**Status: {status}**','',
        f"Pages audited: **{len(pages)}**",
        f"Blockers: **{counts.get('blocker',0)}**",
        f"High findings: **{counts.get('high',0)}**",
        f"Warnings: **{counts.get('warning',0)}**",'',
        '## Finding counts'
    ]
    if type_counts:
        for key,value in sorted(type_counts.items(), key=lambda pair:(-pair[1],pair[0])):
            lines.append(f'- {key}: {value}')
    else:
        lines.append('- None')
    lines += ['', '## Shortest audited content pages']
    for path,count in shortest[:40]:
        lines.append(f'- `{path}` — {count} words — {pages[path]["kind"]}')
    lines += ['', '## Findings']
    if findings:
        for item in findings[:150]:
            target=item.get('path') or ', '.join(item.get('paths',[]))
            lines.append(f"- **{item['severity'].upper()}** `{item['type']}` — {target}: {item['detail']}")
    else:
        lines.append('- None')
    OUT_MD.write_text('\n'.join(lines) + '\n', encoding='utf-8')

    for item in findings:
        if item['severity'] == 'warning':
            target = item.get('path') or ', '.join(item.get('paths', []))
            print(f"WARNING {item['type']} {target}: {item['detail']}")
    print(json.dumps(out['summary'], indent=2))


if __name__ == '__main__':
    main()
