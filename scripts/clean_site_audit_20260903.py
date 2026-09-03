from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Missing expected anchor: {label}")
    return text.replace(old, new, 1)


# Homepage: reduce competing top-level actions and surface Labs as the flagship.
index = read("index.html")
if "assets/css/home-cleanup.css" not in index:
    index = once(index, "</head>", '<link rel="stylesheet" href="assets/css/home-cleanup.css" data-nexusnova-home-cleanup></head>', "home cleanup css")

old_actions = '<div class="hero-actions" style="margin-top:14px"><a class="btn btn-primary" href="live.html">NexusNova LIVE</a><a class="btn" href="new-tools.html">New tools</a><a class="btn" href="smart-tools.html">Smart tools</a><a class="btn" href="gaming.html">Gaming tools</a><a class="btn" href="trending-tools.html">Browse all tools</a><a class="btn" href="tech.html">Tech & Security</a></div>'
new_actions = '<div class="hero-actions" style="margin-top:14px"><a class="btn btn-primary" href="labs.html">Explore NexusNova Labs</a><a class="btn" href="live.html">NexusNova LIVE</a><a class="btn" href="tools.html">Browse Tools</a></div>'
if old_actions in index:
    index = index.replace(old_actions, new_actions, 1)

labs = '<section class="section nn-labs-launch" data-nexusnova-labs-launch><div class="container"><div class="nn-labs-shell"><div class="nn-labs-intro"><span class="nn-labs-badge">NEW • NEXUSNOVA LABS</span><span class="kicker">FLAGSHIP EXPERIENCES</span><h2>Three smarter ways to start.</h2><p>Pulse, Magic Drop and X-Ray combine useful NexusNova capabilities into simple experiences that explain their real limits instead of making fake claims.</p><div class="hero-actions"><a class="btn btn-primary" href="labs.html">Explore all Labs →</a><a class="btn" href="reaction-time-test.html">Reaction Challenge</a></div></div><div class="nn-labs-cards"><a class="nn-lab-mini" href="pulse.html"><span>🌐</span><b>NexusNova Pulse</b><small>Currency, gold, fuel, weather and earthquake signals in one snapshot.</small><strong>See what changed →</strong></a><a class="nn-lab-mini" href="magic-drop.html"><span>✨</span><b>Magic Drop</b><small>Drop a file, detect what it is and jump straight to useful actions.</small><strong>Drop anything →</strong></a><a class="nn-lab-mini" href="xray.html"><span>🔎</span><b>NexusNova X-Ray</b><small>Inspect a link or QR for understandable risk signals before opening it.</small><strong>Scan before you trust →</strong></a></div></div></div></section>'
anchor = '</section><section class="section" data-nexusnova-live-launch>'
if "data-nexusnova-labs-launch" not in index:
    index = once(index, anchor, "</section>" + labs + '<section class="section" data-nexusnova-live-launch>', "home labs insertion")
index = index.replace("<b>Free Invoice Maker</b>", "<b>Simple Invoice Generator</b>", 1)
write("index.html", index)

write("assets/css/home-cleanup.css", """/* NexusNova homepage hierarchy cleanup — 2026-09-03 */
.nn-labs-launch{padding-top:30px;padding-bottom:34px}
.nn-labs-shell{display:grid;grid-template-columns:minmax(0,.88fr) minmax(0,1.12fr);gap:24px;padding:28px;border:1px solid #dbe6f2;border-radius:30px;background:linear-gradient(135deg,#f8fbff 0%,#f4f0ff 50%,#effcf8 100%);box-shadow:0 22px 60px rgba(15,23,42,.08)}
.nn-labs-intro h2{margin:10px 0;font-size:clamp(1.7rem,3vw,2.5rem);line-height:1.08}.nn-labs-intro p{color:#536176}.nn-labs-badge{display:inline-flex;margin-bottom:10px;padding:7px 11px;border-radius:999px;background:#111827;color:#fff;font-size:.74rem;font-weight:900;letter-spacing:.08em}
.nn-labs-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.nn-lab-mini{display:flex;min-height:205px;flex-direction:column;gap:8px;padding:18px;border:1px solid rgba(148,163,184,.34);border-radius:22px;background:rgba(255,255,255,.94);color:inherit;text-decoration:none;box-shadow:0 12px 30px rgba(15,23,42,.06);transition:transform .18s ease,box-shadow .18s ease}.nn-lab-mini:hover{transform:translateY(-3px);box-shadow:0 18px 38px rgba(15,23,42,.1)}.nn-lab-mini>span{font-size:1.9rem}.nn-lab-mini>b{font-size:1.08rem}.nn-lab-mini>small{flex:1;color:#5b6678;line-height:1.45}.nn-lab-mini>strong{font-size:.86rem}
@media(max-width:980px){.nn-labs-shell{grid-template-columns:1fr}}@media(max-width:720px){.nn-labs-shell{padding:20px;border-radius:24px}.nn-labs-cards{grid-template-columns:1fr}.nn-lab-mini{min-height:auto}.nn-home .hero-actions .btn{flex:1 1 100%}}
""")

# Global nav: keep the primary menu focused; secondary hubs remain accessible through Tools/Home.
main_js = read("assets/js/main.js")
pat = re.compile(r"    const items=\[\s*\['index\.html','Home'\].*?\n\s*\];", re.S)
replacement = "    const items=[\n      ['index.html','Home'],['labs.html','Labs'],['live.html','LIVE'],['tools.html','Tools'],['articles.html','Articles'],['guides.html','Guides'],['app.html','App']\n    ];"
main_js, n = pat.subn(replacement, main_js, count=1)
if n != 1:
    raise SystemExit("Could not replace primary nav array")
year = "  const year=document.querySelector('[data-year]');if(year)year.textContent=String(new Date().getFullYear());"
if "coreEmblem=document.querySelector('.core-emblem')" not in main_js:
    add = year + "\n  document.querySelectorAll('.brand-mark').forEach(mark=>mark.setAttribute('aria-hidden','true'));\n  const coreEmblem=document.querySelector('.core-emblem');if(coreEmblem){coreEmblem.setAttribute('aria-label','NexusNova Tools');coreEmblem.querySelectorAll('small,strong').forEach(part=>part.setAttribute('aria-hidden','true'));}"
    main_js = once(main_js, year, add, "brand accessibility")
write("assets/js/main.js", main_js)

# Privacy: explicitly distinguish local file processing from analytics/CDN requests.
privacy = read("privacy.html")
privacy = privacy.replace("<strong>Last updated:</strong> 2 September 2026", "<strong>Last updated:</strong> 3 September 2026", 1)
overview = "<h2>Overview</h2><p>Most NexusNova browser tools can be used without creating an account. Many calculations, conversions and file operations run directly in the visitor's browser. NexusNova also provides an optional Firebase-backed account experience and uses limited third-party infrastructure for security, analytics, supported account linking and, when enabled, advertising.</p>"
if "Plain-language privacy:" not in privacy:
    privacy = once(privacy, overview, overview + '\n    <div class="notice"><strong>Plain-language privacy:</strong> When a tool says its core file processing is local or browser-based, the selected file stays on the device for that core operation. NexusNova still uses Google Analytics 4 for traffic measurement, and a tool may load a third-party client-side library or language model that receives ordinary web-request information when fetched.</div>', "privacy notice")
write("privacy.html", privacy)

# Contact: publish the existing official project mailbox.
contact = read("contact.html")
contact = contact.replace('"dateModified":"2026-08-24"', '"dateModified":"2026-09-03"', 1)
if '"email":"nexusnovatools@gmail.com"' not in contact:
    contact = contact.replace('"logo":"https://nexusnovatools.com/assets/nexusnova-logo-512.svg",', '"logo":"https://nexusnovatools.com/assets/nexusnova-logo-512.svg","email":"nexusnovatools@gmail.com",', 1)
contact = contact.replace("NexusNovaTools.com is the official website. Until a dedicated support mailbox is published, the public GitHub profile below remains the verified project contact route.", "NexusNovaTools.com is the official website. For website, tool and support questions, use the official NexusNova mailbox below. The public GitHub profile remains the technical project route.", 1)
old_card = '<div class="card" style="margin-top:18px"><h3>Verified project contact route</h3><p>Use the public GitHub profile for project-related contact or repository questions while the dedicated support mailbox is being prepared.</p><a class="btn btn-primary" href="https://github.com/fahadsoomro123" rel="noopener noreferrer" target="_blank">Open verified GitHub profile →</a></div>'
new_card = '<div class="card" style="margin-top:18px"><h3>Official support email</h3><p>For website, tool, correction and general NexusNova questions, email <strong>nexusnovatools@gmail.com</strong>. Do not send passwords, verification codes, API keys or payment-card details.</p><a class="btn btn-primary" href="mailto:nexusnovatools@gmail.com">Email NexusNova Support →</a></div><div class="card" style="margin-top:18px"><h3>Technical project route</h3><p>For repository-specific or public development questions, the verified GitHub profile remains available.</p><a class="btn" href="https://github.com/fahadsoomro123" rel="noopener noreferrer" target="_blank">Open verified GitHub profile →</a></div>'
contact = once(contact, old_card, new_card, "support card")
contact = contact.replace("<strong>Last reviewed:</strong> 24 August 2026", "<strong>Last reviewed:</strong> 3 September 2026", 1)
write("contact.html", contact)

# Resume Builder: functionality already exists; make that visible to crawlers/users.
resume = read("resume-builder.html")
r_anchor = '</section>\n<section class="section"><div class="container resume-layout">'
if "Working browser tool:" not in resume:
    r_note = '</section>\n<section class="section no-print" style="padding-bottom:0"><div class="container"><div class="notice"><strong>Working browser tool:</strong> Fill the form below and the preview updates as you type. The draft is saved in this browser with localStorage, Clear draft removes it, and Print / Save as PDF opens the browser print dialog.</div></div></section>\n<section class="section"><div class="container resume-layout">'
    resume = once(resume, r_anchor, r_note, "resume working note")
resume = resume.replace('aria-label="Resume preview"', 'aria-label="Resume preview" aria-live="polite"', 1)
write("resume-builder.html", resume)

# OCR: clearly scope it to the currently loaded English model.
ocr = read("image-to-text-ocr.html")
ocr = ocr.replace("<title>Image to Text OCR Online — Extract Text from Photos | NexusNova</title>", "<title>English Image to Text OCR Online — Extract Text from Photos | NexusNova</title>", 1)
ocr = ocr.replace('<span class="kicker">OCR // IMAGE TO TEXT</span><h1>Extract text from an image without retyping.</h1>', '<span class="kicker">ENGLISH OCR // IMAGE TO TEXT</span><h1>Extract English text from an image without retyping.</h1>', 1)
write("image-to-text-ocr.html", ocr)

# Invoice: make the lightweight scope obvious.
invoice = read("invoice-maker.html")
invoice = invoice.replace("<title>Free Invoice Maker — Create & Print an Invoice Online | NexusNova</title>", "<title>Simple Invoice Generator — Create & Print an Invoice Online | NexusNova</title>", 1)
invoice = invoice.replace('<meta property="og:title" content="Free Invoice Maker — NexusNova Tools">', '<meta property="og:title" content="Simple Invoice Generator — NexusNova Tools">', 1)
invoice = invoice.replace('"name":"Free Invoice Maker"', '"name":"Simple Invoice Generator"', 1)
invoice = invoice.replace("<h1>Free Invoice Maker</h1><p>Create a clean invoice, calculate totals, then print it or use your browser's Save as PDF option.</p>", "<h1>Simple Invoice Generator</h1><p>Create a lightweight invoice document, calculate totals, then print it or use your browser's Save as PDF option. This is not accounting, tax-filing or payment-processing software.</p>", 1)
write("invoice-maker.html", invoice)

# JPG-to-PDF: preserve the stable JPEG-only engine but make the limitation impossible to miss.
jpg = read("jpg-to-pdf.html")
jpg = jpg.replace('<label for="pdf-images">Choose JPG/JPEG images (up to 30)</label>', '<label for="pdf-images">Choose JPG/JPEG images only (up to 30)</label>', 1)
if "Need PNG or WebP?" not in jpg:
    note = '<p class="tool-note">Pages are created in the same order the browser supplies the selected files. Each image is fitted within an A4 page without stretching.</p>'
    clearer = note + '<div class="notice"><strong>Need PNG or WebP?</strong> This converter intentionally accepts JPEG input only. Convert PNG with <a href="png-to-jpg.html">PNG to JPG</a> or use the <a href="image-converter.html">Image Converter</a> first, then create the PDF.</div>'
    jpg = once(jpg, note, clearer, "jpeg-only clarity")
write("jpg-to-pdf.html", jpg)

# QA assertions before cleanup.
ideas = ["labs.html", "pulse.html", "magic-drop.html", "xray.html", "widgets.html", "reaction-time-test.html"]
missing = [p for p in ideas if not Path(p).exists()]
if missing:
    raise SystemExit(f"Missing idea pages: {missing}")
for p in ["labs.html", "pulse.html", "magic-drop.html", "xray.html"]:
    if p not in index:
        raise SystemExit(f"Homepage missing flagship link: {p}")
if "NEXUSNTOOLS" in index or "NNEXUSNOVA" in index:
    raise SystemExit("Literal branding typo found")
if "['labs.html','Labs']" not in main_js:
    raise SystemExit("Labs missing from primary nav")
if "mailto:nexusnovatools@gmail.com" not in contact:
    raise SystemExit("Support email missing")
if "Plain-language privacy:" not in privacy:
    raise SystemExit("Privacy clarity missing")
pjs = read("assets/js/popular-tools.js")
for token in ["resume-name", "resume-title", "resume-email", "resume-print", "resume-clear"]:
    if token not in resume or token not in pjs:
        raise SystemExit(f"Resume hook missing: {token}")
if "ENGLISH OCR // IMAGE TO TEXT" not in ocr or "recognize(source,'eng'" not in ocr:
    raise SystemExit("OCR English scope mismatch")
if "Simple Invoice Generator" not in invoice or "does not send invoices" not in invoice:
    raise SystemExit("Invoice scope clarity missing")
if "JPG/JPEG images only" not in jpg or "Need PNG or WebP?" not in jpg:
    raise SystemExit("JPG-to-PDF limitation not clear")

# Remove all one-time helpers from the final branch diff.
for helper in [
    ".github/workflows/clean-site-audit-20260903.yml",
    ".github/workflows/clean-site-audit-20260903-v2.yml",
    ".github/workflows/clean-site-audit-20260903-v3.yml",
    "scripts/clean_site_audit_20260903.py",
]:
    Path(helper).unlink(missing_ok=True)

print("Clean-site transformation and focused QA passed.")
