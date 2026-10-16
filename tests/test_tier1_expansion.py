#!/usr/bin/env python3
"""Offline regression checks for Tier-1 expansion routes, metadata, discovery and cache versioning."""
from html.parser import HTMLParser
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
TOOLS=["ai-prompt-enhancer.html","short-form-video-hook-generator.html","freelance-rate-calculator.html","crypto-tax-profit-estimator.html","privacy-policy-terms-generator.html"]
GUIDES=["guides/ai-prompt-workflows-2026.html","guides/short-form-hooks-2026.html","guides/freelance-pricing-remote-work.html","guides/crypto-recordkeeping-us-uk-2026.html","guides/app-privacy-terms-checklist.html"]
NEW_TOOLS = [
 "tools/us-federal-tax-bracket-calculator.html",
 "tools/mortgage-payoff-calculator.html",
 "tools/loan-payoff-calculator.html",
 "tools/stock-profit-calculator.html",
 "tools/crypto-profit-calculator.html",
]
class HTMLInfo(HTMLParser):
 def __init__(self):
  super().__init__(); self.parts=[]; self.assets=[]
 def handle_data(self,data): self.parts.append(data)
 def handle_starttag(self,tag,attrs):
  for name,value in attrs:
   if name in ("href","src") and value and value.startswith("assets/") and re.search(r"\.(css|js)(\?|$)",value,re.I):
    self.assets.append(value)
def parse(path):
 h=HTMLInfo();h.feed(path.read_text(encoding="utf-8-sig"));return h
def words(path): return len(" ".join(parse(path).parts).split())
core=(ROOT/"assets/js/search-core.js").read_text(encoding="utf-8")
home=(ROOT/"index.html").read_text(encoding="utf-8-sig")
directory=(ROOT/"tools.html").read_text(encoding="utf-8")
hub=(ROOT/"guides.html").read_text(encoding="utf-8-sig")
sitemap=(ROOT/"sitemap.xml").read_text(encoding="utf-8")
tool_routes=re.findall(r'url:"([^"]+)", type:"tool"',core)
guide_routes=re.findall(r'url:"([^"]+)", type:"guide"',core)
assert len(tool_routes)==108,"search index must expose 108 tool records"
assert len(guide_routes)==14,"search index must expose 14 guide records"
assert "DATASET_SIZE=165" in core,"search dataset total should be 165"
assert "NexusNova Tools — 108 Free Online Browser Tools" in home,"homepage metadata must match the 108 indexed tools"
assert len(re.findall(r'data-tool-card',directory))>=108,"directory must include all tool cards"
assert len(re.findall(r'data-guide-card',hub))>=14,"guide hub must expose all guide cards"
for rel in tool_routes:
 f=ROOT/rel; assert f.exists(),f"search route missing from repository: {rel}"
 for asset in parse(f).assets:
  assert re.search(r"[\?&](?:v|build)=[^&\"']+",asset),f"asset reference needs a cache-busting query in {rel}: {asset}"
for rel in NEW_TOOLS:
 f=ROOT/rel; assert f.exists(),f"missing new Western finance tool: {rel}"
 h=f.read_text(encoding="utf-8-sig")
 assert f"https://nexusnovatools.com/{rel}" in h,f"missing canonical on {rel}"
 assert 'property="og:image"' in h and 'name="twitter:image"' in h,f"missing social images: {rel}"
 assert "../assets/css/site.css?v=20261015-v4" in h,f"missing shared site stylesheet coverage: {rel}"
 assert "western-finance-v1" in h,f"missing cache version: {rel}"
 assert f"https://nexusnovatools.com/{rel}" in sitemap,f"missing sitemap entry: {rel}"
 assert f'url:"{rel}", type:"tool"' in core,f"missing search record: {rel}"
 assert words(f)>=250,f"new tool needs 250+ visible guidance words: {rel}"
for rel in TOOLS:
 f=ROOT/rel; assert f.exists(),f"missing tool route: {rel}"
 h=f.read_text(encoding="utf-8-sig")
 assert f"https://nexusnovatools.com/{rel}" in h,f"missing canonical on {rel}"
 assert "assets/css/tier1-tools.css?build=20261015-tier1-expansion-1" in h,f"missing shared UI CSS version on {rel}"
 assert "assets/js/tier1-tools.js?build=20261015-tier1-expansion-1" in h,f"missing shared UI JS version on {rel}"
 assert "<h2>Frequently asked questions</h2>" in h,f"missing FAQ section on {rel}"
 assert f"https://nexusnovatools.com/{rel}" in sitemap,f"missing sitemap entry: {rel}"
for rel in GUIDES:
 f=ROOT/rel; assert f.exists(),f"missing guide: {rel}"
 wc=words(f); assert wc>=1200,f"{rel} has only {wc} visible words"
 h=f.read_text(encoding="utf-8-sig")
 assert "<title>" in h and "canonical" in h.lower() and "application/ld+json" in h,f"missing metadata: {rel}"
 assert 'property="og:image"' in h and 'name="twitter:title"' in h and 'name="twitter:description"' in h and 'name="twitter:image"' in h,f"missing social metadata: {rel}"
 assert f"https://nexusnovatools.com/{rel}" in sitemap,f"missing sitemap entry: {rel}"
 assert f'url:"{rel}", type:"guide"' in core,f"missing search record: {rel}"
for rel in TOOLS: assert f'url:"{rel}", type:"tool"' in core,f"missing tool search record: {rel}"
assert "v=20261015-v4" in home,"homepage assets need the current cache version"
assert "assets/css/humanproof-home.css?v=20261015-v4" in home,"homepage hero stylesheet must use its current cache version"
assert "v=20261015-v4" in directory,"directory assets must be cache-busted for the live refresh"
print("PASS: 108 searchable tools; 14 guide records; five new tools and five guides over 1,200 words; metadata; sitemap; internal discovery; and cache-busted assets.")
for rel in GUIDES: print(f"GUIDE WORD COUNT: {rel}: {words(ROOT/rel)}")
