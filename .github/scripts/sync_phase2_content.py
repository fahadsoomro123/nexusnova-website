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


def ensure_global_shell_loader(path):
    source=path.read_text(encoding="utf-8-sig")
    loader_pattern = r"""<script\b[^>]+src=["'][^"']*(?:nn-inner-shell|main|site-main|related-tools|analytics|tier1-tools|search-core)\.js(?:\?[^"']*)?["']"""
    if re.search(loader_pattern, source, re.I):
        return False
    source = re.sub(r'<script[^>]*global-shell-guard\.js[^>]*></script>', '', source, flags=re.I)
    tag = '\n<script defer src="../assets/js/nn-inner-shell.js?v=20261016-related-content-v1"></script>\n'
    if path.name == "cash-flow-forecast-small-business.html":
        tag += '<script defer src="../assets/js/global-shell-guard.js?v=20261017-ui-sweep"></script>\n'
    updated,n=re.subn(r'</body\s*>', lambda m:tag+m.group(0), source, count=1, flags=re.I)
    if not n:
        updated=source+tag
    if updated==source:
        return False
    path.write_text(updated,encoding="utf-8")
    return True

records=[]
sitemap_records=[]
for p in sorted((ROOT/"articles").glob("*.html")):
    ensure_global_shell_loader(p)
    title,desc,canonical,cat=meta(p)
    raw=p.read_text(encoding="utf-8-sig")[:5000]
    if not canonical or not title: continue
    page_url=BASE+p.relative_to(ROOT).as_posix()
    indexable="noindex" not in raw.lower()
    canonical=canonical.rstrip("/")
    # Keep self-canonical noindex pages searchable internally, but never submit
    # them in the sitemap. Drop noindex aliases whose canonical points elsewhere.
    if canonical != page_url.rstrip("/"): continue
    record=(title,canonical.replace(BASE,""),desc,cat)
    records.append(record)
    if indexable and canonical == page_url.rstrip("/") and canonical.startswith(BASE + "articles/"): sitemap_records.append(record)

if len(records) != 100:
    raise SystemExit(f"ERROR: expected 100 self-canonical articles, found {len(records)}")
core=CORE.read_text(encoding="utf-8-sig")
core="\n".join(line for line in core.splitlines() if not (line.strip().startswith("{ title:") and 'type:"article"' in line))+"\n"
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
existing_lastmod={}
for match in re.finditer(r'<url>\s*<loc>(https://nexusnovatools\.com/articles/[^<]+)</loc>\s*(?:<lastmod>([^<]+)</lastmod>\s*)?</url>',sm,re.S):
    existing_lastmod[match.group(1)]=match.group(2) or __import__("datetime").date.today().isoformat()

# Rebuild article URL entries instead of append-only syncing.
sm=re.sub(
    r'\s*<url>\s*<loc>https://nexusnovatools\.com/articles/[^<]+</loc>[\s\S]*?</url>',
    '',
    sm
)
article_urls=sorted({
    BASE+url.lstrip("/")
    for _,url,_,_ in sitemap_records
    if (BASE+url.lstrip("/")).startswith(BASE+"articles/")
})
article_xml="".join(
    f'  <url><loc>{html.escape(url,quote=False)}</loc><lastmod>{existing_lastmod.get(url,__import__("datetime").date.today().isoformat())}</lastmod></url>\n'
    for url in article_urls
)
if "</urlset>" not in sm:
    raise SystemExit("ERROR: sitemap.xml has no closing </urlset> element")
sm=sm.replace("</urlset>",article_xml+"</urlset>",1)
SITEMAP.write_text(sm,encoding="utf-8")
print(f"PASS: synchronized {articles} search article records; sitemap_articles={len(article_urls)}; dataset={total}")
