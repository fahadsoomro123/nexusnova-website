from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
MARKER = 'data-nexusnova-compact'
CSS_PATH = ROOT / 'assets/css/compact-2026.css'

COMPACT_CSS = r'''
/* NEXUSNOVA COMPACT PREMIUM 2026
   Approved direction: mint / emerald / lilac / rose, compact, readable, no dark/blue shell.
   This file intentionally overrides legacy site.css without changing tool logic. */
:root{
  --bg:#f6fff9!important;
  --bg-soft:#edf9f3!important;
  --surface:rgba(255,255,255,.88)!important;
  --surface-strong:#fff!important;
  --line:rgba(34,119,93,.15)!important;
  --text:#123d33!important;
  --muted:#5d796f!important;
  --accent:#2fa77b!important;
  --accent-2:#9e88df!important;
  --accent-3:#cf7fa8!important;
  --danger:#b65d77!important;
  --shadow:0 16px 42px rgba(42,104,85,.11)!important;
  --radius:20px!important;
  --radius-sm:14px!important;
}
html,body{background:#f6fff9!important;color:var(--text)!important}
body{
  background:
    radial-gradient(circle at 10% 10%,rgba(82,204,157,.15),transparent 28rem),
    radial-gradient(circle at 88% 12%,rgba(158,136,223,.13),transparent 26rem),
    radial-gradient(circle at 84% 82%,rgba(207,127,168,.10),transparent 25rem),
    #f6fff9!important;
  line-height:1.55!important;
}
body::before{opacity:.18!important;background-image:linear-gradient(rgba(37,125,96,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(37,125,96,.025) 1px,transparent 1px)!important}
.site-header{background:rgba(250,255,252,.90)!important;border-bottom-color:rgba(34,119,93,.10)!important;box-shadow:0 7px 26px rgba(42,104,85,.05)!important}
.site-header.scrolled{background:rgba(250,255,252,.97)!important;border-color:var(--line)!important}
.nav-wrap{min-height:62px!important}
.brand{color:#17483a!important}.brand-mark{width:35px!important;height:35px!important;border-radius:11px!important;background:linear-gradient(145deg,#58d4a5,#9e88df 58%,#cf7fa8)!important;color:white!important;box-shadow:0 8px 22px rgba(68,181,142,.18)!important}.brand small{color:#6b847b!important}
.nav a{color:#527267!important;padding:8px 11px!important;font-size:13px!important}.nav a:hover,.nav a[aria-current="page"]{background:rgba(53,168,128,.09)!important;color:#17483a!important}.menu-btn{background:white!important;color:#17483a!important;border-color:var(--line)!important}
.btn{min-height:42px!important;padding:0 15px!important;border-radius:12px!important;background:white!important;color:#17483a!important;border-color:var(--line)!important;box-shadow:0 5px 16px rgba(42,104,85,.05)!important}.btn:hover{background:#fbfffd!important}.btn-primary{color:white!important;border-color:transparent!important;background:linear-gradient(135deg,#2fa77b,#59d3a5 52%,#9e88df)!important;box-shadow:0 10px 24px rgba(68,181,142,.17)!important}
.gradient-text{background:linear-gradient(95deg,#1d7158 0%,#4dc398 42%,#927bd7 72%,#c9779f 100%)!important;-webkit-background-clip:text!important;background-clip:text!important;color:transparent!important}
.page-hero{padding:36px 0 18px!important}.page-hero h1{font-size:clamp(34px,5vw,58px)!important;margin-top:10px!important}.page-hero p{font-size:15px!important;line-height:1.6!important;margin:10px 0!important;color:var(--muted)!important}.breadcrumb{margin-bottom:10px!important;color:#6b847b!important}.kicker{color:#2b8d6e!important;font-size:10px!important;letter-spacing:.11em!important}
.hero{padding:48px 0 28px!important}.hero-copy{font-size:16px!important;margin:16px 0 20px!important;color:var(--muted)!important}.hero-grid{gap:34px!important}
.section{padding:34px 0!important}.section-head{margin-bottom:18px!important;gap:18px!important}.section-head p{margin-top:7px!important;line-height:1.55!important}.section h2{font-size:clamp(26px,3.5vw,40px)!important}
.card,.guide-card,.tool-card,.feature-panel,.notice,.cta{background:rgba(255,255,255,.88)!important;border-color:var(--line)!important;box-shadow:0 10px 28px rgba(42,104,85,.07)!important;color:var(--text)!important}.card,.guide-card{padding:18px!important;border-radius:18px!important}.tool-card{padding:18px!important;border-radius:18px!important}.feature-panel{padding:22px!important;border-radius:20px!important}.notice{padding:14px 16px!important;border-radius:14px!important;background:rgba(158,136,223,.07)!important;color:#355e53!important}.cta{padding:24px!important;border-radius:22px!important;background:linear-gradient(130deg,rgba(82,204,157,.09),rgba(158,136,223,.08),rgba(207,127,168,.07))!important}
.card p,.tool-card>p,.feature-item p,.body-muted,.guide-card p{color:var(--muted)!important}.card-link,.article a,.guide-article a{color:#278a69!important}
.field{gap:5px!important;margin-bottom:10px!important}.field label{color:#365f54!important}.field input,.field select,.field textarea,.search-tools input{background:white!important;color:#163f35!important;border-color:rgba(34,119,93,.17)!important;padding:10px 12px!important}.field input:focus,.field select:focus,.field textarea:focus{border-color:rgba(47,167,123,.55)!important;box-shadow:0 0 0 3px rgba(47,167,123,.08)!important}.field textarea{min-height:96px!important}.result{min-height:44px!important;background:rgba(47,167,123,.07)!important;color:#245b4c!important;border-color:rgba(47,167,123,.28)!important;padding:10px 12px!important}.formula{background:rgba(47,167,123,.06)!important;color:#245b4c!important;border-color:var(--line)!important}
.article{max-width:900px!important}.article h2{font-size:27px!important;margin:24px 0 9px!important}.article h3{margin:18px 0 7px!important}.article p,.article li{color:#496d63!important;line-height:1.62!important}.article p{margin:9px 0!important}.article ul{margin:8px 0!important}.privacy-badge,.status-pill,.guide-tag{background:white!important;color:#3b6b5d!important;border-color:var(--line)!important}
[data-adsense-value-remediation]{padding-top:8px!important}[data-adsense-value-remediation] .article{border-top:1px solid var(--line)!important;padding-top:18px!important}
.site-footer{padding:26px 0 20px!important;margin-top:28px!important;background:rgba(250,255,252,.72)!important;border-top-color:var(--line)!important}.footer-copy,.footer-links a,.footer-bottom{color:#6a847b!important}.footer-bottom{margin-top:18px!important;padding-top:14px!important}
.calc-keys button{background:white!important;color:#17483a!important;border-color:var(--line)!important}.calc-keys .equal{background:linear-gradient(135deg,#2fa77b,#9e88df)!important;color:white!important}
/* Compact HumanProof-first homepage additions */
.nn-hp-overview{padding:30px 0!important}.nn-hp-overview .nn-hp-lead{max-width:860px;color:var(--muted);font-size:15px;line-height:1.65;margin:8px 0 0}.nn-hp-flow{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px}.nn-hp-step{padding:15px 16px;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.83)}.nn-hp-step b{display:block;font-size:13px;color:#245b4c}.nn-hp-step span{display:block;margin-top:5px;color:#668178;font-size:11px;line-height:1.5}.nn-hp-compare{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:12px}.nn-hp-compare div{padding:12px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.76);font-size:10px;line-height:1.45;color:#688078}.nn-hp-compare b{display:block;margin-bottom:4px;color:#315f52;font-size:11px}.nn-hp-compare .humanproof{background:linear-gradient(135deg,rgba(82,204,157,.12),rgba(158,136,223,.10),rgba(207,127,168,.08));border-color:rgba(47,167,123,.25)}.nn-hp-compare .humanproof b{color:#247557}.nn-hp-bottom{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.nn-hp-bottom>div{padding:15px 16px;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.80)}.nn-hp-bottom h3{font-size:15px;margin:0 0 6px!important}.nn-hp-bottom p{font-size:11px;line-height:1.55;color:#688078;margin:0}
/* Legacy dark home pieces become light without changing 360 mesh code. */
.nn-flagship-hero,.nn-proof-card,.nn-product-card,.nn-trust-band,.nn-trust-item,.home-tool{color:#17483a!important}.nn-proof-card,.nn-product-card,.nn-trust-band,.nn-trust-item,.home-tool{background:rgba(255,255,255,.82)!important;border-color:var(--line)!important;box-shadow:0 12px 34px rgba(42,104,85,.08)!important}.nn-flagship-hero{padding-top:42px!important;padding-bottom:22px!important}.nn-proof-card{border-radius:22px!important}.nn-compact-tools{gap:10px!important}.home-tool{padding:14px 15px!important;border-radius:15px!important}.home-tool span,.nn-product-card p,.nn-trust-copy p,.nn-trust-item span{color:#688078!important}.micro-status{color:#6a847b!important}.nn-proof-top,.nn-proof-360-status,.nn-proof-360-meta,.nn-proof-labels span{color:#416e60!important}
@media(max-width:920px){.nn-hp-compare{grid-template-columns:1fr 1fr}.nn-hp-flow{grid-template-columns:1fr 1fr}.nn-hp-bottom{grid-template-columns:1fr}}
@media(max-width:720px){.nav{background:rgba(250,255,252,.98)!important}.page-hero{padding:26px 0 12px!important}.section{padding:26px 0!important}.hero{padding:34px 0 20px!important}.hero-grid{gap:22px!important}.nn-hp-flow,.nn-hp-compare{grid-template-columns:1fr}.tool-card{padding:15px!important}.article h2{font-size:24px!important;margin-top:20px!important}.site-footer{margin-top:20px!important}}
'''.strip() + '\n'


def write(path: Path, text: str, changed: list[str]):
    old = path.read_text(encoding='utf-8') if path.exists() else None
    if old != text:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding='utf-8')
        changed.append(str(path.relative_to(ROOT)))


def inject_compact_css(changed: list[str]):
    for path in ROOT.rglob('*.html'):
        rel = path.relative_to(ROOT)
        if any(part.startswith('.') for part in rel.parts):
            continue
        text = path.read_text(encoding='utf-8')
        lower = text.lower()
        # Keep approved previews and standalone product shells untouched.
        if 'noindex,nofollow' in lower or 'noindex, nofollow' in lower or 'preview' in path.name.lower():
            continue
        if 'site.css' not in text or MARKER in text:
            continue
        prefix = '../' * (len(rel.parts) - 1)
        link = f'<link rel="stylesheet" href="{prefix}assets/css/compact-2026.css?v=20260910-1" {MARKER}>'
        if '</head>' not in text:
            raise RuntimeError(f'Missing </head>: {rel}')
        text = text.replace('</head>', link + '\n</head>', 1)
        path.write_text(text, encoding='utf-8')
        changed.append(str(rel))


def update_home(changed: list[str]):
    path = ROOT / 'index.html'
    text = path.read_text(encoding='utf-8')
    original = text
    replacements = {
        '<title>NexusNova Tools — Free Online Tools, HumanProof, LIVE & Labs</title>': '<title>NexusNova HumanProof & Free Online Tools — NexusNova Tools</title>',
        '<meta name="description" content="NexusNova offers free browser tools for PDF, images, calculators and productivity, plus HumanProof human-approval technology, NexusNova LIVE data and experimental Labs.">': '<meta name="description" content="NexusNova HumanProof adds live-human approval to sensitive digital actions, alongside focused free browser tools for PDF, images, calculators, productivity and live references.">',
        '<span class="kicker">NEXUSNOVA • USEFUL BY DESIGN</span><h1>Useful tools. <span class="gradient-text">Smarter actions.</span></h1><p class="hero-copy">NexusNova combines practical free browser tools with HumanProof for sensitive digital approvals, transparent LIVE data references and experimental Labs. The goal is simple: help you finish a real task quickly, show important limitations clearly and keep each experience focused.</p>': '<span class="kicker">NEXUSNOVA HUMANPROOF • VERIFIED ACTION</span><h1>Trust the action. <span class="gradient-text">Not just the screen.</span></h1><p class="hero-copy">HumanProof is NexusNova\'s live-human approval layer for sensitive digital actions. It is designed to confirm a real human is present, bind approval to the exact action being requested, and keep the result auditable without turning every workflow into a full identity check.</p>',
        '<a class="btn btn-primary" href="tools.html">Browse Tools</a><a class="btn" href="humanproof.html">Explore HumanProof</a><a class="btn" href="live.html">Open LIVE</a>': '<a class="btn btn-primary" href="humanproof.html#live-verification">Start Human Verification</a><a class="btn" href="humanproof.html">How HumanProof Works</a><a class="btn" href="tools.html">Browse Tools</a>',
        '<div class="micro-status"><span><i></i> Mobile friendly</span><span><i></i> Clear processing notes</span><span><i></i> Sources shown on LIVE pages</span></div>': '<div class="micro-status"><span><i></i> Live human response</span><span><i></i> Exact-action binding architecture</span><span><i></i> Privacy-first flow</span></div>',
    }
    for old, new in replacements.items():
        if old not in text:
            raise RuntimeError('Homepage expected fragment missing: ' + old[:90])
        text = text.replace(old, new, 1)

    overview = '''<section class="section nn-hp-overview" id="humanproof-overview"><div class="container"><div class="section-head"><div><span class="kicker">WHY HUMANPROOF</span><h2>Because “someone clicked approve” is not enough.</h2></div></div><p class="nn-hp-lead">Passwords, OTPs, face matching and CAPTCHAs each solve a different problem. HumanProof is focused on a narrower question for high-risk digital workflows: is a live human present, and did that person consciously approve this exact action? It is not presented as legal identity verification, and the public evaluation flow does not issue a production receipt.</p><div class="nn-hp-flow"><div class="nn-hp-step"><b>01 • Live response</b><span>A short camera challenge checks natural live facial response before the approval can continue.</span></div><div class="nn-hp-step"><b>02 • Bind the action</b><span>The approval is attached to the specific operation, such as a deploy, refund, export, recovery or withdrawal request.</span></div><div class="nn-hp-step"><b>03 • Issue proof after payment</b><span>A production result is issued only after the required paid flow and server confirmation. Before that, the state remains not verified.</span></div></div><div class="nn-hp-compare"><div><b>Password</b>Shows that a secret is known; it does not prove live human presence.</div><div><b>OTP</b>Shows access to a device or channel; it does not bind conscious approval to the exact action.</div><div><b>Face match</b>Can compare identity-like facial data; it is a different problem from conscious action approval.</div><div><b>CAPTCHA</b>Helps distinguish bots from users; it is not designed as a high-risk action receipt.</div><div class="humanproof"><b>HumanProof</b>Targets live-human presence plus exact-action approval for sensitive digital workflows.</div></div><div class="nn-hp-bottom"><div><h3>Where it can fit</h3><p>AI-agent approvals, admin changes, production deploys, destructive operations, account recovery, refunds, data export, marketplace release and financial approval workflows.</p></div><div><h3>Security claim kept realistic</h3><p>HumanProof does not claim 100% security or automatic deepfake-proofing. Hardened production security also needs replay resistance, nonces, device or passkey signals, backend-signed receipts, monitoring and independent review.</p></div></div></div></section>'''
    text, n = re.subn(r'<section class="section" id="products">.*?</section>\s*(?=<section class="section" id="popular-tools">)', overview + '\n\n', text, count=1, flags=re.S)
    if n != 1:
        raise RuntimeError('Could not replace homepage products section')
    if text != original:
        path.write_text(text, encoding='utf-8')
        changed.append('index.html')


def update_humanproof_state(changed: list[str]):
    html_path = ROOT / 'humanproof.html'
    if html_path.exists():
        text = html_path.read_text(encoding='utf-8')
        original = text
        text = text.replace(
            '<div class="ok" id="ok">Live response completed. Production-grade signed receipts are issued only through activated HumanProof business integrations.</div>',
            '<div class="ok" id="ok">PENDING PAYMENT • NOT VERIFIED. No HumanProof result has been issued. Production verification requires an activated paid flow and server confirmation.</div>'
        )
        text = text.replace(
            '<div class="notice">This public flow is an evaluation surface for the live camera interaction. It does not identify you by name and does not issue a production verification receipt.</div>',
            '<div class="notice">This public flow is an evaluation surface for the live camera interaction. Completing the challenge alone does not create a verified result. A production HumanProof receipt is issued only through an activated paid flow after server confirmation.</div>'
        )
        if text != original:
            html_path.write_text(text, encoding='utf-8')
            changed.append('humanproof.html')

    js_path = ROOT / 'assets/js/humanproof-live.js'
    text = js_path.read_text(encoding='utf-8')
    original = text
    text = text.replace("state.textContent=idx>=2?'HUMAN CONFIRMED':'LIVE ANALYSIS';", "state.textContent='LIVE ANALYSIS';")
    old = "if(idx>=2){state.textContent='HUMAN CONFIRMED';prompt.textContent='Human verification complete';ok.classList.add('show')}else showChallenge()"
    new = "if(idx>=2){run=false;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}v.srcObject=null;res=null;state.textContent='PENDING PAYMENT';prompt.textContent='Challenge complete • no HumanProof result issued';ok.textContent='PENDING PAYMENT • NOT VERIFIED. No HumanProof result has been issued. Production verification requires an activated paid flow and server confirmation.';ok.classList.add('show');start.disabled=false;return}else showChallenge()"
    if old not in text:
        raise RuntimeError('HumanProof completion fragment not found; refusing blind JS rewrite')
    text = text.replace(old, new, 1)
    if 'HUMAN CONFIRMED' in text or 'Human verification complete' in text:
        raise RuntimeError('Unsafe pre-payment success wording remains in humanproof-live.js')
    if text != original:
        js_path.write_text(text, encoding='utf-8')
        changed.append('assets/js/humanproof-live.js')


def main():
    changed: list[str] = []
    write(CSS_PATH, COMPACT_CSS, changed)
    inject_compact_css(changed)
    update_home(changed)
    update_humanproof_state(changed)
    print(f'Final compact remediation changed {len(set(changed))} files.')
    for name in sorted(set(changed)):
        print(name)


if __name__ == '__main__':
    main()
