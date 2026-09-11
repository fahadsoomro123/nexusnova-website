#!/usr/bin/env python3
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT=Path(__file__).resolve().parent
SKIP_PREFIX=('http://','https://','mailto:','tel:','javascript:','data:','#')
class Links(HTMLParser):
    def __init__(self): super().__init__(); self.urls=[]
    def handle_starttag(self,tag,attrs):
        data=dict(attrs)
        for key in ('href','src'):
            if data.get(key): self.urls.append(data[key])

broken=[]; checked=0
for page in ROOT.rglob('*.html'):
    if '.git' in page.parts: continue
    if {'ota','nexusnova-dev-ai'} & set(page.relative_to(ROOT).parts): continue
    parser=Links(); parser.feed(page.read_text(encoding='utf-8',errors='ignore'))
    for value in parser.urls:
        if value.startswith(SKIP_PREFIX) or value.startswith('//'): continue
        path=unquote(urlsplit(value).path)
        if not path: continue
        target=(ROOT/path.lstrip('/')) if path.startswith('/') else (page.parent/path)
        checked+=1
        if not target.resolve().exists(): broken.append((str(page.relative_to(ROOT)),value))
print(f'checked={checked} broken={len(broken)}')
for page,value in broken: print(f'{page}\t{value}')
raise SystemExit(bool(broken))
