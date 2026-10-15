#!/usr/bin/env python3
"""Offline checks for Tier-1 expansion routes, metadata, discovery and cache versioning."""
from html.parser import HTMLParser
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
TOOLS=["ai-prompt-enhancer.html","short-form-video-hook-generator.html","freelance-rate-calculator.html","crypto-tax-profit-estimator.html","privacy-policy-terms-generator.html"]
GUIDES=["guides/ai-prompt-workflows-2026.html","guides/short-form-hooks-2026.html","guides/freelance-pricing-remote-work.html","guides/crypto-recordkeeping-us-uk-2026.html","guides/app-privacy-terms-checklist.html"]
class Text(HTMLParser):
 def __init__(self): super().__init__(); self.parts=[]
 def handle_data(self,data): self.parts.append(data)
def words(path):
 p=Text();p.feed(path.read_text(encoding="utf-8-sig"));return len(" ".join(p.parts).split())
core=(ROOT/"assets/js/search-core.js").read_text(encoding="utf-8")
home=(ROOT/"index.html").read_text(encoding="utf-8-sig")
directory=(ROOT/"tools.html").read_text(encoding="utf-8")
hub=(ROOT/"guides.html").read_text(encoding="utf-8-sig")
sitemap=(ROOT/"sitemap.xml").read_text(encoding="utf-8")
assert len(re.findall(r'url:"[^"]+", type:"tool"',core))==97,"search index must expose 97 tool records"
assert len(re.findall(r'type:"guide"',core))==14,"search index must expose 14 guide records"
assert "DATASET_SIZE=154" in core,"search dataset total should be 154"
assert "97 Free Browser Tools" in home,"homepage total count should be 97"
assert len(re.findall(r'data-tool-card',directory))>=97,"directory must include all tool cards"
assert len(re.findall(r'data-guide-card',hub))>=14,"guide hub must expose all guide cards"
for rel in TOOLS:
 f=ROOT/rel; assert f.exists(),f"missing tool route: {rel}"
 h=f.read_text(encoding="utf-8-sig")
 assert f"https://nexusnovatools.com/{rel}" in h,f"missing canonical on {rel}"
 assert "assets/css/tier1-tools.css?build=20261015-tier1-expansion-1" in h,f"missing shared UI CSS version on {rel}"
 assert "assets/js/tier1-tools.js?build=20261015-tier1-expansion-1" in h,f"missing shared UI JS version on {rel}"
 assert f"https://nexusnovatools.com/{rel}" in sitemap,f"missing sitemap entry: {rel}"
for rel in GUIDES:
 f=ROOT/rel; assert f.exists(),f"missing guide: {rel}"
 wc=words(f); assert wc>=1200,f"{rel} has only {wc} visible words"
 h=f.read_text(encoding="utf-8-sig")
 assert "<title>" in h and "canonical" in h.lower() and "application/ld+json" in h,f"missing metadata: {rel}"
 assert f"https://nexusnovatools.com/{rel}" in sitemap,f"missing sitemap entry: {rel}"
 assert f'url:"{rel}", type:"guide"' in core,f"missing search record: {rel}"
for rel in TOOLS: assert f'url:"{rel}", type:"tool"' in core,f"missing tool search record: {rel}"
assert "build=20261015-tier1-expansion-1" in home,"homepage assets need build version"
for rel in re.findall(r'url:"([^"]+)", type:"tool"',core):
 f=ROOT/rel
 assert f.exists(),f"search route missing from repository: {rel}"
 text=f.read_text(encoding="utf-8-sig")
 for attr in ("href","src"):
  for url in re.findall(r'\\b'+attr+r'=["\\']([^"\\']+\\.(?:css|js)(?:\\?[^"\\']*)?)["\\']',text,re.I):
   if url.startswith("assets/") and "build=20261015-tier1-expansion-1" not in url:
    raise AssertionError(f"asset reference missing build version in {rel}: {url}")
print("PASS: 97 searchable tools, 14 guides, 5 new tools and 5 guides over 1200 words, metadata, sitemap, shared UI and cache-busted assets.")
for rel in GUIDES: print(f"GUIDE WORD COUNT: {rel}: {words(ROOT/rel)}")
