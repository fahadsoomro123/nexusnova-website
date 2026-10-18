#!/usr/bin/env python3
from __future__ import annotations

import datetime as dt
import html
import json
import re
import subprocess
from pathlib import Path

ROOT = Path('.')
SITE = 'https://nexusnovatools.com/'
VERSION = '20261015-v4'
PROTECTED = ('cloudflare/', 'functions/', 'firebase/', 'nexusnova-dev-ai/', 'ota/', 'downloads/')
EXCLUDED = PROTECTED + ('.git/', 'node_modules/', 'tests/', 'vpn/')


def read(path: Path) -> str:
    return path.read_text(encoding='utf-8', errors='replace')


def write_if_changed(path: Path, text: str) -> bool:
    old = read(path) if path.exists() else ''
    if old == text:
        return False
    path.write_text(text, encoding='utf-8')
    return True


def public_html():
    return sorted(p for p in ROOT.rglob('*.html') if not p.as_posix().startswith(EXCLUDED))


def indexable(text: str) -> bool:
    m = re.search(r'<meta[^>]+name=["\']robots["\'][^>]+content=["\']([^"\']*)', text, re.I)
    return not m or 'noindex' not in m.group(1).lower()


def cache_bust():
    changed=[]
    attr_re = re.compile(r'(?P<prefix>(?:src|href)=["\'])(?P<url>(?:\.\.?/)*assets/(?:[^"\']+?\.(?:js|css)))(?:\?[^"\']*)?(?P<quote>["\'])', re.I)
    absolute_attr_re = re.compile(r'(?P<prefix>(?:src|href)=["\'])/(?P<url>assets/(?:[^"\']+?\.(?:js|css)))(?:\?[^"\']*)?(?P<quote>["\'])', re.I)
    for path in public_html():
        text=read(path)
        def repl(m):
            # app.html loads this consent runtime directly during the first deferred pass.
            # Keep its targeted cache key so production edges do not reuse the previous script.
            if path.as_posix() == 'app.html' and m.group("url").endswith('assets/js/site-main.js'):
                return f'{m.group("prefix")}{m.group("url")}?v=20261018-app-consent-lcp-v1{m.group("quote")}'
            return f'{m.group("prefix")}{m.group("url")}?v={VERSION}{m.group("quote")}'
        new=attr_re.sub(repl,text)
        new=absolute_attr_re.sub(repl,new)
        if new != text and write_if_changed(path,new): changed.append(path.as_posix())
    return changed


def patch_search():
    path=ROOT/'assets/js/search-core.js'
    text=read(path)
    # Idempotence: the production index already has the hardened single-character rule.
    if 'const singleCharacterQuery=queryTokens.length===1 && query.length===1;' in text:
        return False
    needle='''    const queryTokens=tokenizeSearchText(query);\n    if(!queryTokens.length) return [];\n\n    const aliasTargets=NEXUSNOVA_ALIAS_MAP[query];\n    const scored=[];\n'''
    replacement='''    const queryTokens=tokenizeSearchText(query);\n    if(!queryTokens.length) return [];\n\n    // Single-character searches are discovery queries, not fuzzy full-text queries.\n    // Do not let article prose or generic tags such as "tool" dominate a query like "t".\n    const singleCharacterQuery=queryTokens.length===1 && query.length===1;\n    const aliasTargets=NEXUSNOVA_ALIAS_MAP[query];\n    const scored=[];\n'''
    if needle not in text: raise RuntimeError('search-core query guard anchor not found')
    text=text.replace(needle,replacement,1)
    old='''      const result=this.scoreRecord(query,queryTokens,record);\n      if(!result) continue;\n\n      if(aliasTargets&&!aliasTargets.includes(result.record.url)) continue;\n      scored.push(result);\n'''
    new='''      const result=this.scoreRecord(query,queryTokens,record);\n      if(!result) continue;\n\n      if(aliasTargets&&!aliasTargets.includes(result.record.url)) continue;\n\n      if(singleCharacterQuery){\n        const token=queryTokens[0];\n        const titlePrefix=record._titleTokens.some(candidate=>candidate.startsWith(token));\n        const urlPrefix=record._urlTokens.some(candidate=>candidate.startsWith(token));\n        if(!titlePrefix&&!urlPrefix) continue;\n        result.singleCharacterPrefix=titlePrefix?2:1;\n      }\n\n      scored.push(result);\n'''
    if old not in text: raise RuntimeError('search-core scoring anchor not found')
    text=text.replace(old,new,1)
    old_sort='''    scored.sort((left,right)=>{\n      const typePriority=type=>type==='tool'?0:(type==='category'?1:2);\n      const priorityDiff=typePriority(left.record.type)-typePriority(right.record.type);\n'''
    new_sort='''    if(singleCharacterQuery&&scored.some(item=>item.record.type==='tool')){\n      const tools=scored.filter(item=>item.record.type==='tool');\n      const nonTools=scored.filter(item=>item.record.type!=='tool');\n      scored.length=0;\n      scored.push(...tools,...nonTools);\n    }\n\n    scored.sort((left,right)=>{\n      if(singleCharacterQuery){\n        const prefixDiff=(right.singleCharacterPrefix||0)-(left.singleCharacterPrefix||0);\n        if(prefixDiff) return prefixDiff;\n      }\n      const typePriority=type=>type==='tool'?0:(type==='category'?1:2);\n      const priorityDiff=typePriority(left.record.type)-typePriority(right.record.type);\n'''
    if old_sort not in text: raise RuntimeError('search-core sort anchor not found')
    text=text.replace(old_sort,new_sort,1)
    return write_if_changed(path,text)


def patch_cola_content():
    path=ROOT/'articles/social-security-cola-2027-estimate.html'
    if not path.exists(): return False
    text=read(path)
    old='''The Bureau of Labor Statistics released September 2026 CPI data on October 14. The CPI release supplies data used in inflation analysis; it is not itself the SSA's published COLA determination. On the source check date, the SSA's <a href="https://www.ssa.gov/oact/cola/colasummary.html" target="_blank" rel="noopener noreferrer">COLA summary</a> still said the next rate would be announced in October 2026.'''
    new='''The Bureau of Labor Statistics released September 2026 CPI data on October 14. The CPI release supplies data used in inflation analysis; it is not itself the SSA's published COLA determination. SSA has now published the official 2027 rate: 3.6%. Its <a href="https://www.ssa.gov/oact/cola/colasummary.html" target="_blank" rel="noopener noreferrer">COLA page</a> records the 3.6% result and the underlying CPI-W calculation.'''
    if old not in text: return False
    return write_if_changed(path,text.replace(old,new,1))


def patch_search_data_cola():
    path=ROOT/'assets/js/search-core.js'
    text=read(path)
    old='2027 Social Security COLA Estimate: Latest Forecast and Dates'
    if old not in text: return False
    new='2027 Social Security COLA: Official 3.6% Rate and Payment Timing'
    text=text.replace(old,new,1)
    old2='The latest reported 2027 Social Security COLA estimates sit around 3.4%–3.6%. See what is official, how CPI-W sets the adjustment, and calculate a benefit scenario.'
    new2='SSA announced a 3.6% Social Security COLA for 2027 on October 14, 2026. See payment timing, the CPI-W method, and calculate a gross benefit scenario.'
    text=text.replace(old2,new2,1)
    return write_if_changed(path,text)


def git_date(rel: str) -> str:
    try:
        out=subprocess.check_output(['git','log','-1','--format=%cs','--',rel],text=True).strip()
        return out or dt.date.today().isoformat()
    except Exception:
        return dt.date.today().isoformat()


def canonical(text: str) -> str|None:
    m=re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)',text,re.I)
    return html.unescape(m.group(1)) if m else None


def build_sitemap():
    urls=[]
    for path in public_html():
        text=read(path)
        rel=path.relative_to(ROOT).as_posix()
        if rel=='404.html' or not indexable(text): continue
        if rel=='index.html': loc=SITE
        else: loc=SITE+rel
        urls.append((loc,git_date(rel)))
    urls=sorted(dict(urls).items())
    body=['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc,lastmod in urls:
        body.append(f'  <url><loc>{html.escape(loc)}</loc><lastmod>{lastmod}</lastmod></url>')
    body.append('</urlset>')
    changed=write_if_changed(ROOT/'sitemap.xml','\n'.join(body)+'\n')
    return changed,len(urls)


def validate_jsonld_and_canon():
    errors=[]
    for path in public_html():
        text=read(path)
        if not indexable(text): continue
        rel=path.relative_to(ROOT).as_posix()
        can=canonical(text)
        expected=SITE if rel=='index.html' else SITE+rel
        if can and can.rstrip('/') != expected.rstrip('/'):
            errors.append(f'{rel}: canonical={can!r} expected={expected!r}')
        for block in re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',text,re.I|re.S):
            try: json.loads(html.unescape(block).strip())
            except Exception as exc: errors.append(f'{rel}: invalid JSON-LD: {exc}')
    if errors:
        raise RuntimeError('Canonical/JSON-LD validation failed:\n'+'\n'.join(errors[:80]))


def tool_urls():
    text=read(ROOT/'assets/js/search-core.js')
    pairs=re.findall(r'\{\s*title:"(?:[^"\\]|\\.)*",\s*url:"([^"]+)",\s*type:"tool"',text)
    return sorted(dict.fromkeys(pairs))


def main():
    changes=[]
    changes += cache_bust()
    if patch_search(): changes.append('assets/js/search-core.js (single-character search hardening)')
    if patch_search_data_cola(): changes.append('assets/js/search-core.js (2027 COLA metadata)')
    if patch_cola_content(): changes.append('articles/social-security-cola-2027-estimate.html')
    sitemap_changed,sitemap_count=build_sitemap()
    if sitemap_changed: changes.append('sitemap.xml')
    validate_jsonld_and_canon()
    tools=tool_urls()
    if len(tools) < 100 or len(set(tools)) != len(tools):
        raise RuntimeError(f'Expected at least 100 unique tool routes in search index, found {len(tools)}')
    print(f'OVERHAUL_PREP_PASS tools={len(tools)} public_urls={sitemap_count} changed={len(changes)}')
    for item in changes: print('CHANGED',item)

if __name__=='__main__': main()
