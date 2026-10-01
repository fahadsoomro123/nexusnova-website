from pathlib import Path
import re

R=Path(".")
REG=R/"assets/js/search-core.js"
HEADER='''<header class="nn-header" data-nn-header><div class="nn-shell nn-header-row"><a class="nn-brand" href="index.html" aria-label="NexusNova Tools home"><img src="assets/logo.png" alt="NexusNova Tools Logo" class="nn-brand-logo-img"><span class="nn-brand-copy"><strong>NEXUSNOVA TOOLS</strong><small>FAST EVERYDAY UTILITIES</small></span></a><button class="nn-menu" type="button" data-nn-menu aria-expanded="false" aria-controls="nn-primary-nav" aria-label="Open navigation">☰</button><nav class="nn-nav" id="nn-primary-nav" data-nn-nav aria-label="Primary navigation"><a href="index.html">Home</a><a href="index.html#master-directory">All Tools</a><a href="index.html#content-library">Content</a><a href="categories.html">Categories</a><a href="articles.html">Articles</a><a href="guides.html">Guides</a></nav></div></header>'''
FOOTER='''<footer class="nn-footer"><div class="nn-shell nn-footer-main"><div class="nn-footer-brand"><a class="nn-brand" href="index.html" aria-label="NexusNova Tools home"><img src="assets/logo.png" alt="NexusNova Tools Logo" class="nn-brand-logo-img nn-footer-logo"><span class="nn-brand-copy"><strong>NEXUSNOVA TOOLS</strong><small>FAST EVERYDAY UTILITIES</small></span></a><p>Practical browser tools, guides and utilities with clear limits and useful workflows.</p></div><nav class="nn-footer-links" aria-label="Footer navigation"><div><span class="nn-footer-title">Explore</span><a href="tools.html">Tools directory</a><a href="categories.html">Categories</a><a href="articles.html">Articles</a><a href="guides.html">Guides</a></div><div><span class="nn-footer-title">Trust</span><a href="tool-methodology.html">Tool Methodology</a><a href="editorial-policy.html">Editorial Policy</a><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a><a href="contact.html">Contact</a></div><div><span class="nn-footer-title">Follow</span><a href="https://x.com/NexusNovaTools">X · @NexusNovaTools</a><a href="https://www.facebook.com/NexusNovaTools">Facebook · NexusNovaTools</a><a href="https://www.instagram.com/nexusnovatools/">Instagram · @nexusnovatools</a><a href="https://t.me/NexusNovaTools">Telegram · @NexusNovaTools</a></div></nav></div><div class="nn-shell nn-footer-bottom"><span>© <span data-year></span> NexusNova Tools</span><span class="nn-footer-domain">NEXUSNOVATOOLS.COM</span></div></footer>'''

def main():
    s=REG.read_text(encoding="utf-8")
    urls=list(dict.fromkeys(re.findall(r'\{\s*title:.*?url:"([^"]+)"[^}]*type:"tool"',s)))
    urls=[u for u in urls if u.endswith(".html") and "/" not in u]
    assert len(urls)==94, len(urls)
    changed=0
    for u in urls:
        p=R/u
        c=p.read_text(encoding="utf-8")
        if '<header class="nn-header"' in c and '<footer class="nn-footer"' in c and 'nn-inner-shell.css' in c:
            continue
        c=re.sub(r'<link[^>]+href="[^"]*assets/css/(?:scifi|motion)\.css[^"]*"[^>]*>\s*','',c,flags=re.I)
        c=re.sub(r'<link[^>]+href="[^"]*assets/css/compact-2026\.css[^"]*"[^>]*>\s*','',c,flags=re.I)
        if 'assets/css/nn-inner-shell.css' not in c:
            c=c.replace('</head>','<link rel="stylesheet" href="assets/css/nn-inner-shell.css">\n</head>',1)
        c=re.sub(r'<header\b[^>]*>.*?</header>',HEADER,c,count=1,flags=re.I|re.S) if re.search(r'<header\b',c,re.I) else c.replace('<body',HEADER+'\n<body',1)
        c=re.sub(r'<footer\b[^>]*>.*?</footer>',FOOTER,c,count=1,flags=re.I|re.S) if re.search(r'<footer\b',c,re.I) else c.replace('</body>',FOOTER+'\n</body>',1)
        c=re.sub(r'<body\b([^>]*)>',lambda m:'<body'+((' class="nn-inner-page"' if 'class=' not in m.group(1) else re.sub(r'class\s*=\s*"([^"]*)"',lambda x:'class="'+x.group(1)+' nn-inner-page"',m.group(1),count=1,flags=re.I)))+'>',c,count=1,flags=re.I)
        if 'nn-inner-shell.js' not in c:
            c=c.replace('</body>','<script src="assets/js/nn-inner-shell.js" defer></script>\n</body>',1)
        assert c.count('<header class="nn-header"')==1 and c.count('<footer class="nn-footer"')==1
        assert 'class="site-header"' not in c and 'class="site-footer"' not in c
        assert all(x not in c for x in ('scifi.css','compact-2026.css','motion.css'))
        p.write_text(c,encoding="utf-8",newline="\n")
        changed+=1
    print("TOOLS="+str(len(urls))+" CHANGED="+str(changed))

if __name__=="__main__": main()
