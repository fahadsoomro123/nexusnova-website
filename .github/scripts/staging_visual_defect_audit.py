from __future__ import annotations
import concurrent.futures
import html as html_lib
import json
import re
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

ROOT=Path('.')
SKIP_DIRS={'.git','node_modules','vendor','ota','downloads','nexusnova-dev-ai'}
IMAGE_EXT_RE=re.compile(r'\.(?:png|jpe?g|gif|webp|svg|avif|ico)(?:[?#].*)?$',re.I)

class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.refs=[]
        self.external_images=[]
        self.footer_depth=None
        self.depth=0
        self.top_footer_lists=0
        self.footer_has_structured=False
        self.legacy_marks=[]
    def handle_starttag(self,tag,attrs):
        d={str(k).lower():str(v or '') for k,v in attrs}
        tag=tag.lower()
        if tag in {'img','source','video','audio','iframe'} and d.get('src'):
            self.refs.append((tag,d.get('src','')))
            if tag=='img' and re.match(r'^https?://',d.get('src',''),re.I):
                self.external_images.append(d.get('src',''))
        if tag=='script' and d.get('src'):
            self.refs.append((tag,d['src']))
        if tag=='link' and d.get('href'):
            self.refs.append((tag,d['href']))
        if tag=='footer':
            self.footer_depth=self.depth
        elif self.footer_depth is not None and self.depth==self.footer_depth+1:
            cls=d.get('class','').split()
            if tag=='ul' and 'footer-links' in cls:
                self.top_footer_lists+=1
            if any(x in cls for x in ('footer-grid','footer-console')):
                self.footer_has_structured=True
        if tag in {'span','div'} and re.search(r'\b(?:brand-mark|mark)\b',d.get('class','')):
            self.legacy_marks.append((tag,d.get('class','')))
        self.depth+=1
    def handle_endtag(self,tag):
        self.depth=max(0,self.depth-1)
        if tag.lower()=='footer' and self.footer_depth is not None:
            self.footer_depth=None

def resolve_ref(page:str,ref:str)->str:
    ref=html_lib.unescape(ref.strip())
    if not ref or ref.startswith(('#','?','data:','blob:','javascript:','mailto:','tel:','about:')):
        return ''
    p=urlparse(ref)
    if p.scheme in {'http','https'} or ref.startswith('//'):
        return ''
    if ref.startswith('/'):
        return ref.lstrip('/').split('?',1)[0].split('#',1)[0]
    base=Path(page).parent
    return str((base/ref).resolve().relative_to(Path('.').resolve())).replace('\\','/').split('?',1)[0].split('#',1)[0]

def iter_public_files():
    for p in ROOT.rglob('*'):
        if not p.is_file(): continue
        rel=p.relative_to(ROOT)
        if any(part in SKIP_DIRS for part in rel.parts): continue
        yield rel.as_posix()

files=set(iter_public_files())
htmls=[p for p in files if p.lower().endswith('.html')]

def audit_one(page):
    raw=Path(page).read_text(encoding='utf-8',errors='replace')
    parser=Parser()
    try: parser.feed(raw)
    except Exception: pass
    missing=[]
    for tag,ref in parser.refs:
        target=resolve_ref(page,ref)
        if target and any(target==d or target.startswith(d + '/') for d in SKIP_DIRS):
            continue
        if target and target not in files:
            missing.append({'tag':tag,'ref':ref,'resolved':target})
    legacy_html=bool(re.search(r'class=["\'][^"\']*\b(?:brand-mark|mark)\b[^"\']*["\'][^>]*>\s*N\s*<',raw,re.I))
    launch_img='websitelaunches.com/badge/' in raw
    direct_footer_duplicate=parser.top_footer_lists>0 and parser.footer_has_structured
    inline_urls=[]
    style_blocks=re.findall(r'<style\b[^>]*>([\s\S]*?)</style>',raw,re.I)
    for css in style_blocks:
        for u in re.findall(r"""url\(\s*["']?([^"')]+)""", css, re.I):
            if not re.match(r'^(?:https?:|data:|blob:|#)',u,re.I):
                t=resolve_ref(page,u)
                if t and not any(t==d or t.startswith(d + '/') for d in SKIP_DIRS) and t not in files:
                    inline_urls.append((u,t))
    return {'page':page,'missing':missing,'inline_missing':inline_urls,'legacy_mark_html':legacy_html,
            'website_launches_image':launch_img,'footer_duplicate_risk':direct_footer_duplicate,
            'external_images':parser.external_images}


def audit_css_assets():
    """Check local url(...) references inside public CSS files."""
    css_reports=[]
    for page in sorted(files):
        if not page.lower().endswith('.css'):
            continue
        raw=Path(page).read_text(encoding='utf-8',errors='replace')
        for u in re.findall(r"""url\(\s*["']?([^"')]+)""",raw,re.I):
            ref=html_lib.unescape(u.strip())
            if not ref or re.match(r'^(?:https?:|data:|blob:|#|//)',ref,re.I):
                continue
            target=resolve_ref(page,ref)
            if target and not any(target==d or target.startswith(d + '/') for d in SKIP_DIRS) and target not in files:
                css_reports.append({'file':page,'ref':ref,'resolved':target})
    return css_reports

reports=[]
for page in sorted(htmls):
    reports.append(audit_one(page))

external={}
urls=sorted({u for r in reports for u in r['external_images']})
def check(url):
    try:
        req=urllib.request.Request(url,headers={'User-Agent':'NexusNova-Staging-Audit/1.0'})
        with urllib.request.urlopen(req,timeout=8) as resp:
            return resp.status,resp.headers.get('content-type','')
    except Exception as e:
        return None,str(e)
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
    for u,(status,meta) in zip(urls,ex.map(check,urls)):
        external[u]={'status':status,'meta':meta}

css_missing=audit_css_assets()
summary={
 'pages_scanned':len(htmls),
 'css_missing_asset_refs':css_missing,
 'missing_asset_refs':[r for r in reports if r['missing'] or r['inline_missing']],
 'legacy_mark_pages':[r['page'] for r in reports if r['legacy_mark_html']],
 'website_launches_refs':[r['page'] for r in reports if r['website_launches_image']],
 'footer_duplicate_risk_pages':[r['page'] for r in reports if r['footer_duplicate_risk']],
 'external_images':external,
}
Path('staging-visual-defect-audit.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
lines=[
 'NEXUSNOVA STAGING VISUAL-DEFECT AUDIT',
 f"HTML pages scanned: {summary['pages_scanned']}",
 f"Missing local asset pages: {len(summary['missing_asset_refs'])}",
 f"Missing CSS asset refs: {len(summary['css_missing_asset_refs'])}",
 f"Legacy N-mark pages: {len(summary['legacy_mark_pages'])}",
 f"WebsiteLaunches image refs: {len(summary['website_launches_refs'])}",
 f"Footer duplicate-risk pages: {len(summary['footer_duplicate_risk_pages'])}",
 f"External image URLs checked: {len(urls)}",
 f"External image failures: {sum(1 for v in external.values() if v['status'] != 200)}",
 '',
 'MISSING ASSETS',
 *[f"{r['page']}: {r['missing'] or r['inline_missing']}" for r in summary['missing_asset_refs']],
 '',
 'MISSING CSS ASSETS',
 *[f"{r['file']}: {r['ref']} -> {r['resolved']}" for r in summary['css_missing_asset_refs']],
 '',
 'LEGACY N MARKS',
 *summary['legacy_mark_pages'],
 '',
 'WEBSITELAUNCHES IMAGE REFERENCES',
 *summary['website_launches_refs'],
 '',
 'FOOTER DUPLICATE RISK',
 *summary['footer_duplicate_risk_pages'],
 '',
 'EXTERNAL IMAGE FAILURES',
 *[f"{u}: {v}" for u,v in external.items() if v['status']!=200],
]
Path('staging-visual-defect-audit.txt').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('\n'.join(lines))
if summary['missing_asset_refs'] or summary['css_missing_asset_refs'] or summary['footer_duplicate_risk_pages'] or any(v['status']!=200 for v in external.values()):
    raise SystemExit(1)
