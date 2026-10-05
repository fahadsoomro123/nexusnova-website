#!/usr/bin/env python3
from pathlib import Path
from html.parser import HTMLParser
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent

class TextParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts=[]; self.skip=0
    def handle_starttag(self, tag, attrs):
        if tag in {'script','style','svg'}: self.skip += 1
    def handle_endtag(self, tag):
        if tag in {'script','style','svg'} and self.skip: self.skip -= 1
    def handle_data(self, data):
        if not self.skip: self.parts.append(data)

def sitemap_paths():
    paths=set()
    for sm in ROOT.glob('sitemap*.xml'):
        try: tree=ET.parse(sm)
        except ET.ParseError: continue
        for el in tree.iter():
            if el.tag.endswith('loc') and el.text and el.text.startswith('https://nexusnovatools.com/'):
                rel=el.text.removeprefix('https://nexusnovatools.com/').split('#')[0]
                paths.add(rel or 'index.html')
    return paths

def main():
    rows=[]
    for rel in sorted(sitemap_paths()):
        p=ROOT/rel
        if not p.exists() or p.suffix != '.html': continue
        raw=p.read_text(encoding='utf-8',errors='ignore')
        parser=TextParser(); parser.feed(raw)
        words=re.findall(r"[A-Za-z0-9][A-Za-z0-9'’-]*", ' '.join(parser.parts))
        rows.append((rel,len(words),'noindex' in raw.lower(),'NEXUSNOVA_COMPACT_TOOL_GUIDE_START' in raw,
                     bool(re.search(r'<link[^>]+rel=["\']canonical["\']',raw,re.I))))
    print('path\twords\tnoindex\tcompact_guide\tcanonical')
    for row in rows: print('\t'.join(map(str,row)))

if __name__=='__main__': main()
