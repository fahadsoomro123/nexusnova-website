#!/usr/bin/env python3
import json,re,html
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
BASE="https://nexusnovatools.com/"
CORE=ROOT/"assets/js/search-core.js"
HUB=ROOT/"articles.html"
SITEMAP=ROOT/"sitemap.xml"

def meta(path):
    s=path.read_text(encoding="utf-8-sig")
    def one(p):
        m=re.search(p,s,re.I|re.S); return html.unescape(m.group(1)).strip() if m else ""
    title=one(r"<title>\s*(.*?)\s*</title>")
    title=re.sub(r"\s*\|\s*NexusNova Tools\s*$","",title)
    desc=one(r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']+)')
    canonical=one(r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)')
    cat=one(r'<span\s+class=["\']kicker["\']>\s*([^<]+)')
    return title,desc,canonical,cat

records=[]
for p in sorted((ROOT/"articles").glob("*.html")):
    title,desc,canonical,cat=meta(p)
    raw=p.read_text(encoding="utf-8-sig")[:5000]
    if not canonical or "noindex" in raw.lower(): continue
    if not title: continue
    records.append((title,canonical.replace(BASE,""),desc,cat))

core=CORE.read_text(encoding="utf-8-sig")
article_re=re.compile(r'\s*\{ title:"((?:[^"\\]|\\.)*)", url:"((?:[^"\\]|\\.)*)", type:"article", category:"Articles", tags:\[((?:[^\]])*)\] \},?\n?')
core=article_re.sub("\n",core)
block="\n".join(f'  {{ title:{json.dumps(t,ensure_ascii=False)}, url:{json.dumps(u,ensure_ascii=False)}, type:"article", category:"Articles", tags:[{json.dumps(t,ensure_ascii=False)},{json.dumps(d,ensure_ascii=False)},{json.dumps("Articles")},{json.dumps(c,ensure_ascii=False)}] }},' for t,u,d,c in records)+"\n"
marker='  { title:"How to use a weighted decision matrix without fooling yourself",'
if marker in core: core=core.replace(marker,block+marker,1)
else:
    marker='  { title:"Images", url:"image-tools.html", type:"category"'
    core=core.replace(marker,block+marker,1)
tools=len(re.findall(r'type:"tool"',core)); cats=len(re.findall(r'type:"category"',core)); guides=len(re.findall(r'type:"guide"',core)); articles=len(records); total=tools+cats+guides+articles
core=re.sub(
    r'const NEXUSNOVA_EXPECTED_COUNTS = Object\.freeze\(\{.*?\}\);',
    f'const NEXUSNOVA_EXPECTED_COUNTS = Object.freeze({{\n  tool:{tools},\n  category:{cats},\n  article:{articles},\n  guide:{guides}\n}});',
    core,count=1,flags=re.S
)
core=re.sub(r'/\*\*\n \* NexusNova Deep Client-Side Search Core\n \*.*?\n \*/',f'/**\n * NexusNova Deep Client-Side Search Core\n * {tools} tools + {cats} categories + {articles} articles + {guides} guides = {total} records.\n * Local-only, dependency-free, network-free search.\n */',core,count=1,flags=re.S)
core=re.sub(r'NexusNovaSearchCore\.DATASET_SIZE=\d+;',f'NexusNovaSearchCore.DATASET_SIZE={total};',core)
core=re.sub(r'NexusNovaSearchCore\.DATASET_COUNTS=Object\.freeze\(\{[^}]+\}\);',f'NexusNovaSearchCore.DATASET_COUNTS=Object.freeze({{tool:{tools},category:{cats},article:{articles},guide:{guides}}});',core)
CORE.write_text(core,encoding="utf-8")

hub=HUB.read_text(encoding="utf-8-sig")
for title,url,desc,cat in records:
    if f'href="{url}"' in hub: continue
    card=f'''          <a class="nn-article-card" href="{url}" data-article-card data-search-url="{url}">
            <span class="nn-article-tag">Phase 2</span>
            <h3>{html.escape(title)}</h3>
            <p>{html.escape(desc)}</p>
            <span class="nn-article-link">Read article →</span>
          </a>

'''
    hub=hub.replace('      <div class="nn-no-results" id="article-no-results">',card+'      <div class="nn-no-results" id="article-no-results">',1)
HUB.write_text(hub,encoding="utf-8")

sm=SITEMAP.read_text(encoding="utf-8-sig")
for _,url,_,_ in records:
    full=BASE+url
    if full in sm: continue
    sm=sm.replace("</urlset>",f'  <url><loc>{full}</loc><lastmod>2026-10-16</lastmod></url>\n</urlset>',1)
SITEMAP.write_text(sm,encoding="utf-8")
print(f"PASS: synchronized {articles} indexable article records; dataset={total}")
