#!/usr/bin/env python3
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ET.register_namespace('', 'http://www.sitemaps.org/schemas/sitemap/0.9')

ROOT = Path(__file__).resolve().parent
TODAY = '2026-09-11'

# Same-intent discovery pages: preserve tools.html and focused category hubs.
DUPLICATE_HUBS = {
    'daily-tools-directory.html': 'MERGE into tools.html',
    'popular-tools.html': 'MERGE into tools.html',
    'trending-tools.html': 'MERGE into tools.html',
    'new-tools.html': 'MERGE into tools.html',
    'smart-tools.html': 'MERGE into tools.html',
}

# These broaden the site away from its browser-tool identity or are transient feeds.
OFF_TOPIC_OR_TRANSIENT = {
    'labs.html','pulse.html','magic-drop.html','xray.html','widgets.html',
    'live.html','live-alerts.html','aqi-live.html','crypto-live.html','earthquakes-live.html',
    'sports-live.html','weather-live.html','currency-rates.html','gold-rates.html','fuel-rates.html',
    'tech.html','gaming.html',
}

# News rewrites / trend-driven pages do not demonstrate enough first-hand NexusNova value.
WEAK_ARTICLES = {
    'articles/amd-adrenalin-26-8-1-modern-warfare-4.html',
    'articles/windows-11-august-2026-rgb-gaming-crashes.html',
    'articles/modern-warfare-4-beta-pc-checklist.html',
    'articles/google-august-2026-spam-update-traffic-drop.html',
    'articles/google-preferred-sources-2026.html',
    'articles/google-search-console-platform-properties-2026.html',
    'articles/gpt-5-6-sol-context-window-guide.html',
    'articles/ai-search-planning-decisions-2026.html',
    'articles/ai-token-count-context-window-guide.html',
    'articles/chrome-152-for-android-adds-desktop-security-fixes.html',
    'articles/cloudflare-introduces-context-aware-vulnerability-remediation.html',
    'articles/github-copilot-global-model-policy-enforces-default-states.html',
    'articles/github-copilot-in-visual-studio-august-2026-update-details.html',
    'articles/github-copilot-in-vs-code-receives-august-2026-agent-updates.html',
    'articles/github-copilot-model-access-ties-to-billing-org-for-team-plans.html',
    'articles/google-releases-chrome-152-for-android.html',
    'articles/google-releases-chrome-152-with-327-security-fixes.html',
}
WEAK_TECH = {str(p.relative_to(ROOT)) for p in (ROOT/'tech').glob('*.html')}

# Preview, account, auth callback and unfinished product surfaces are not search landing pages.
NON_SEARCH_SURFACES = {
    'account.html','app.html','instagram-callback.html','instagram-connect.html',
    'humanproof-live-payment-preview.html',
}
NON_SEARCH_SURFACES |= {str(p.relative_to(ROOT)) for p in ROOT.glob('*preview*.html')}

def write(path: Path, text: str):
    old = path.read_text(encoding='utf-8')
    if old == text: return False
    path.write_text(text, encoding='utf-8')
    return True

def add_noindex(rel: str):
    p=ROOT/rel
    if not p.exists(): return False
    text=p.read_text(encoding='utf-8')
    if re.search(r'<meta[^>]+name=["\']robots["\'][^>]+noindex', text, re.I): return False
    meta='<meta name="robots" content="noindex, follow">'
    if '</title>' in text: text=text.replace('</title>', '</title>'+meta, 1)
    elif '<head>' in text: text=text.replace('<head>', '<head>'+meta, 1)
    else: raise RuntimeError(f'No head insertion point: {rel}')
    return write(p,text)

def remove_compact_guides():
    changed=[]
    pat=re.compile(r'\s*<!-- NEXUSNOVA_COMPACT_TOOL_GUIDE_START -->.*?<!-- NEXUSNOVA_COMPACT_TOOL_GUIDE_END -->\s*',re.S)
    for p in ROOT.rglob('*.html'):
        text=p.read_text(encoding='utf-8')
        new,n=pat.subn('\n',text)
        if n and write(p,new): changed.append(str(p.relative_to(ROOT)))
    return changed

def prune_sitemaps(noindex):
    changed=[]
    for p in ROOT.glob('sitemap*.xml'):
        if p.name == 'sitemap-index.xml': continue
        try: tree=ET.parse(p)
        except ET.ParseError: continue
        root=tree.getroot(); removed=0
        for url in list(root):
            loc=next((x for x in url if x.tag.endswith('loc')),None)
            if loc is None or not loc.text: continue
            rel=loc.text.removeprefix('https://nexusnovatools.com/').split('#')[0] or 'index.html'
            if rel in noindex:
                root.remove(url); removed+=1
        # Always normalize to the default sitemap namespace (never ns0:loc).
        ET.indent(tree,space='  ')
        tree.write(p,encoding='utf-8',xml_declaration=True)
        if removed or 'ns0:' in p.read_text(encoding='utf-8'):
            changed.append((p.name,removed))
    # One canonical discovery sitemap avoids duplicated sitemap families.
    index='''<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>https://nexusnovatools.com/sitemap.xml</loc></sitemap>\n</sitemapindex>\n'''
    write(ROOT/'sitemap-index.xml',index)
    return changed

def main():
    removed_guides=remove_compact_guides()
    noindex=set(DUPLICATE_HUBS)|OFF_TOPIC_OR_TRANSIENT|WEAK_ARTICLES|WEAK_TECH|NON_SEARCH_SURFACES
    noindexed=[]
    for rel in sorted(noindex):
        if add_noindex(rel): noindexed.append(rel)
    # Also prune pages that were already noindexed before this remediation.
    all_noindex=set(noindex)
    for p in ROOT.rglob('*.html'):
        if 'noindex' in p.read_text(encoding='utf-8',errors='ignore').lower():
            all_noindex.add(str(p.relative_to(ROOT)))
    sitemap_changes=prune_sitemaps(all_noindex)
    print(f'removed_compact_guides={len(removed_guides)}')
    print(f'new_noindex={len(noindexed)}')
    print(f'noindex_scope={len(noindex)}')
    print(f'sitemap_files_pruned={len(sitemap_changes)}')
    for name,count in sitemap_changes: print(f'  {name}: -{count} URLs')

if __name__=='__main__': main()
