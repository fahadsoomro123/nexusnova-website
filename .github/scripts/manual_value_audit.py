from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path
import html as html_lib
import json
import math
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
    'weather-live.html','sports-live.html','live-alerts.html','pulse.html','magic-drop.html','xray.html','widgets.html'
}

STOP = {
    'the','and','for','that','with','this','from','your','you','are','can','into','use','when','what','how','not','but',
    'will','its','their','they','has','have','was','were','our','any','all','one','more','than','only','also','about',
    'before','after','where','which','each','may','should','tool','page','nexusnova','tools'
}


def read(path: Path) -> str:
    return path.read_text(encoding='utf-8', errors='replace')


def main_fragment(text: str) -> str:
    m = re.search(r'<main\b[^>]*>(.*?)</main>', text, re.I | re.S)
    return m.group(1) if m else text


def clean_fragment(fragment: str) -> str:
    fragment = re.sub(r'<!--.*?-->', ' ', fragment, flags=re.S)
    fragment = re.sub(r'<(?:script|style|svg|noscript)\b.*?</(?:script|style|svg|noscript)>', ' ', fragment, flags=re.I | re.S)
    fragment = re.sub(r'<(?:header|footer|nav)\b.*?</(?:header|footer|nav)>', ' ', fragment, flags=re.I | re.S)
    fragment = re.sub(r'<[^>]+>', ' ', fragment)
    fragment = html_lib.unescape(fragment)
    fragment = re.sub(r'\s+', ' ', fragment).strip()
    return fragment


def words(text: str) -> list[str]:
    return re.findall(r"[A-Za-z0-9][A-Za-z0-9'’+%./-]*", text)


def heading_texts(fragment: str) -> list[str]:
    out=[]
    for _, inner in re.findall(r'<(h[1-3])\b[^>]*>(.*?)</\1>', fragment, flags=re.I | re.S):
        out.append(clean_fragment(inner).lower())
    return out


def title_of(text: str) -> str:
    m=re.search(r'<title>(.*?)</title>',text,re.I|re.S)
    return clean_fragment(m.group(1)) if m else ''


def meta_description(text: str) -> str:
    m=re.search(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']', text, re.I|re.S)
    if not m:
        m=re.search(r'<meta\s+content=["\'](.*?)["\']\s+name=["\']description["\']', text, re.I|re.S)
    return html_lib.unescape(m.group(1).strip()) if m else ''


def is_noindex(text: str) -> bool:
    return bool(re.search(r'<meta\s+name=["\']robots["\'][^>]*content=["\'][^"\']*noindex', text, re.I))


def canonical(text: str) -> str:
    m=re.search(r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)', text, re.I)
    if not m:
        m=re.search(r'<link\s+href=["\']([^"\']+)["\']\s+rel=["\']canonical["\']', text, re.I)
    return m.group(1).strip() if m else ''


def sitemap_paths() -> set[str]:
    urls=set()
    for sm in ROOT.glob('sitemap*.xml'):
        try:
            root=ET.parse(sm).getroot()
        except Exception:
            continue
        for node in root.iter():
            if node.tag.endswith('loc') and node.text and node.text.startswith(BASE):
                u=node.text.strip()
                p=u[len(BASE):].split('?',1)[0].split('#',1)[0]
                if not p:
                    p='index.html'
                urls.add(p)
    urls.update({'index.html','humanproof.html','tools.html','about.html','contact.html','privacy.html','terms.html','tool-methodology.html','editorial-policy.html'})
    return urls


def classify(path: str, source: str) -> str:
    if path.startswith('articles/'):
        return 'article'
    if path.startswith('tech/'):
        return 'article'
    if path.startswith('guides/'):
        return 'guide'
    if path in NON_TOOL_ROOTS:
        if path.endswith('-live.html') or path in {'currency-rates.html','gold-rates.html','fuel-rates.html','live.html','live-alerts.html','pulse.html'}:
            return 'live'
        return 'support'
    if path.count('/') == 0 and re.search(r'<(?:input|select|textarea|button)\b', source, re.I):
        return 'tool'
    return 'support'


def sentences(text: str) -> list[str]:
    parts=re.split(r'(?<=[.!?])\s+', text)
    out=[]
    for s in parts:
        s=re.sub(r'\s+',' ',s).strip()
        if 10 <= len(words(s)) <= 45:
            out.append(s)
    return out


def norm_sentence(s: str) -> str:
    s=s.lower()
    s=re.sub(r'https?://\S+','URL',s)
    s=re.sub(r'\b\d+(?:\.\d+)?\b','N',s)
    s=re.sub(r'[^a-z0-9%+ ]+',' ',s)
    return re.sub(r'\s+',' ',s).strip()


def shingles(text: str, n: int=4) -> set[tuple[str,...]]:
    toks=[t.lower() for t in words(text) if t.lower() not in STOP and len(t)>2]
    return {tuple(toks[i:i+n]) for i in range(max(0,len(toks)-n+1))}


def jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def has_any(headings: list[str], body: str, terms: list[str]) -> bool:
    hay=' '.join(headings)+' '+body.lower()
    return any(t in hay for t in terms)


def main():
    targets=sorted(sitemap_paths())
    pages={}
    repeated=defaultdict(list)
    title_seen=defaultdict(list)
    desc_seen=defaultdict(list)

    for path in targets:
        f=ROOT/path
        if not f.exists() or f.suffix.lower()!='.html':
            continue
        source=read(f)
        if is_noindex(source):
            continue
        frag=main_fragment(source)
        plain=clean_fragment(frag)
        w=words(plain)
        hs=heading_texts(frag)
        kind=classify(path, source)
        title=title_of(source)
        desc=meta_description(source)
        can=canonical(source)
        h1_count=len(re.findall(r'<h1\b', frag, re.I))
        interactive=len(re.findall(r'<(?:input|select|textarea|button)\b', frag, re.I))
        entry={
            'path':path,'kind':kind,'words':len(w),'headings':hs,'h1_count':h1_count,
            'interactive_controls':interactive,'title':title,'description':desc,'canonical':can,
            'plain':plain,'shingles':shingles(plain)
        }
        pages[path]=entry
        title_seen[title.strip().lower()].append(path)
        desc_seen[desc.strip().lower()].append(path)
        for s in sentences(plain):
            ns=norm_sentence(s)
            if len(words(ns))>=10:
                repeated[ns].append(path)

    findings=[]
    for path,p in pages.items():
        kind=p['kind']; wc=p['words']; hs=p['headings']; body=p['plain']
        if p['h1_count'] != 1:
            findings.append({'severity':'blocker','type':'h1','path':path,'detail':f"Expected 1 H1, found {p['h1_count']}"})
        if not p['title'] or len(p['title'])<20:
            findings.append({'severity':'warning','type':'title','path':path,'detail':'Missing or very short title'})
        if not p['description'] or len(p['description'])<90:
            findings.append({'severity':'warning','type':'meta','path':path,'detail':'Missing or thin meta description'})
        if not p['canonical']:
            findings.append({'severity':'warning','type':'canonical','path':path,'detail':'Missing canonical'})

        if kind=='tool':
            if wc < 500:
                findings.append({'severity':'high','type':'thin_tool','path':path,'detail':f'{wc} main-content words; target >=500 useful words'})
            if len(hs) < 3:
                findings.append({'severity':'high','type':'weak_structure','path':path,'detail':f'Only {len(hs)} H1-H3 headings in main content'})
            if not has_any(hs,body,['how to','how it works','how this','steps','use this','using the']):
                findings.append({'severity':'high','type':'missing_howto','path':path,'detail':'No clear how-to/how-it-works guidance'})
            if not has_any(hs,body,['example','worked example','practical use','for example']):
                findings.append({'severity':'high','type':'missing_example','path':path,'detail':'No clear practical/worked example'})
            if not has_any(hs,body,['limit','privacy','important','before you rely','check the result','what it does not','safety']):
                findings.append({'severity':'high','type':'missing_limits','path':path,'detail':'No clear limitations/privacy/check-before-use guidance'})
            if p['interactive_controls'] == 0:
                findings.append({'severity':'blocker','type':'nonfunctional_tool_surface','path':path,'detail':'Tool-like page has no interactive control'})
        elif kind in {'article','guide'}:
            if wc < 650:
                findings.append({'severity':'high','type':'thin_article','path':path,'detail':f'{wc} main-content words; target >=650 useful words'})
        elif kind=='live':
            if wc < 430:
                findings.append({'severity':'high','type':'thin_live','path':path,'detail':f'{wc} main-content words; live pages need source/method/limitations context'})

        if kind in {'tool','support','live'} and re.search(r'\b(?:coming soon|placeholder|lorem ipsum|under construction)\b', body, re.I):
            findings.append({'severity':'blocker','type':'unfinished_copy','path':path,'detail':'Unfinished/placeholder wording on indexable page'})
        if 'preview' in path.lower() or re.search(r'(?:preview|demo)\s*v?\d+', p['title'], re.I):
            findings.append({'severity':'blocker','type':'indexable_preview','path':path,'detail':'Preview/demo appears indexable'})

    for title, paths in title_seen.items():
        if title and len(paths)>1:
            findings.append({'severity':'high','type':'duplicate_title','paths':paths,'detail':'Duplicate page title'})
    for desc, paths in desc_seen.items():
        if desc and len(paths)>1:
            findings.append({'severity':'high','type':'duplicate_meta','paths':paths,'detail':'Duplicate meta description'})

    repeated_items=[]
    for sent, paths in repeated.items():
        uniq=sorted(set(paths))
        if len(uniq)>=6:
            repeated_items.append({'sentence':sent,'count':len(uniq),'paths':uniq[:20]})
    repeated_items.sort(key=lambda x:(-x['count'],x['sentence']))
    for item in repeated_items[:80]:
        findings.append({'severity':'high','type':'repeated_template_sentence','paths':item['paths'],'detail':f"Repeated across {item['count']} indexable pages: {item['sentence'][:180]}"})

    similarity=[]
    names=sorted(pages)
    for i,a_name in enumerate(names):
        a=pages[a_name]
        if a['kind'] not in {'tool','article','guide','live'}:
            continue
        for b_name in names[i+1:]:
            b=pages[b_name]
            if a['kind'] != b['kind']:
                continue
            score=jaccard(a['shingles'],b['shingles'])
            if score>=0.42:
                similarity.append({'a':a_name,'b':b_name,'score':round(score,3),'kind':a['kind']})
    similarity.sort(key=lambda x:-x['score'])
    for item in similarity[:80]:
        findings.append({'severity':'high','type':'near_duplicate_main_content','paths':[item['a'],item['b']],'detail':f"{item['kind']} main-content similarity {item['score']}"})

    severity_order={'blocker':0,'high':1,'warning':2}
    findings.sort(key=lambda x:(severity_order.get(x['severity'],9),x['type'],x.get('path',''),str(x.get('paths',''))))
    counts=Counter(x['severity'] for x in findings)
    type_counts=Counter(x['type'] for x in findings)
    kind_counts=Counter(p['kind'] for p in pages.values())
    thinest=sorted(({k:v['words'] for k,v in pages.items() if v['kind'] in {'tool','article','guide','live'}}).items(), key=lambda kv:kv[1])[:80]

    out={
        'summary':{
            'indexable_pages_audited':len(pages),
            'page_kinds':dict(kind_counts),
            'blockers':counts.get('blocker',0),
            'high':counts.get('high',0),
            'warnings':counts.get('warning',0),
            'finding_types':dict(type_counts),
            'status':'REMEDIATE' if counts.get('blocker',0) or counts.get('high',0) else 'READY_FOR_MANUAL_REVIEW'
        },
        'thinest_pages':[{'path':p,'words':w,'kind':pages[p]['kind']} for p,w in thinest],
        'near_duplicates':similarity[:100],
        'repeated_sentences':repeated_items[:100],
        'findings':findings,
    }
    OUT_JSON.write_text(json.dumps(out,indent=2,ensure_ascii=False),encoding='utf-8')

    lines=['# NexusNova Strict Manual Value Audit','',f"Status: **{out['summary']['status']}**",'',f"Pages audited: **{len(pages)}**",f"Blockers: **{counts.get('blocker',0)}**",f"High findings: **{counts.get('high',0)}**",f"Warnings: **{counts.get('warning',0)}**",'', '## Finding counts']
    for k,v in sorted(type_counts.items(), key=lambda kv:(-kv[1],kv[0])):
        lines.append(f'- {k}: {v}')
    lines += ['', '## Thinest content pages']
    for p,w in thinest[:50]:
        lines.append(f'- `{p}` — {w} words — {pages[p]["kind"]}')
    lines += ['', '## First 100 findings']
    for item in findings[:100]:
        target=item.get('path') or ', '.join(item.get('paths',[]))
        lines.append(f"- **{item['severity']} / {item['type']}** — `{target}` — {item['detail']}")
    OUT_MD.write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print(json.dumps(out['summary'],indent=2))


if __name__=='__main__':
    main()
