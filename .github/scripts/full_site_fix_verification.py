#!/usr/bin/env python3
from __future__ import annotations

import concurrent.futures
import datetime as dt
import html
import json
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE_SHA = "d33551f2ab6dc7d370350d656e26165738f455e6"  # exact parent of the 2026-09-11 checklist remediation commit
SITE = "https://nexusnovatools.com/"
UA = "NexusNovaFullSiteVerification/2026-09-11 (+https://nexusnovatools.com/)"

A_NOINDEX = [
    "account.html","app.html","aqi-live.html",
    "articles/ai-search-planning-decisions-2026.html",
    "articles/ai-token-count-context-window-guide.html",
    "articles/amd-adrenalin-26-8-1-modern-warfare-4.html",
    "articles/chrome-152-for-android-adds-desktop-security-fixes.html",
    "articles/cloudflare-introduces-context-aware-vulnerability-remediation.html",
    "articles/github-copilot-global-model-policy-enforces-default-states.html",
    "articles/github-copilot-in-visual-studio-august-2026-update-details.html",
    "articles/github-copilot-in-vs-code-receives-august-2026-agent-updates.html",
    "articles/github-copilot-model-access-ties-to-billing-org-for-team-plans.html",
    "articles/google-august-2026-spam-update-traffic-drop.html",
    "articles/google-preferred-sources-2026.html",
    "articles/google-releases-chrome-152-for-android.html",
    "articles/google-releases-chrome-152-with-327-security-fixes.html",
    "articles/google-search-console-platform-properties-2026.html",
    "articles/gpt-5-6-sol-context-window-guide.html",
    "articles/modern-warfare-4-beta-pc-checklist.html",
    "articles/windows-11-august-2026-rgb-gaming-crashes.html",
    "crypto-live.html","currency-rates.html","earthquakes-live.html","fuel-rates.html","gaming.html","gold-rates.html",
    "homepage-adsense-compact-preview-v2.html","homepage-humanproof-compact-preview-v1.html",
    "humanproof-elite-credential-card-preview-v5.html","humanproof-gold-metal-card-preview-v3.html",
    "humanproof-live-payment-preview.html","humanproof-mixed-metal-card-preview-v4.html",
    *[f"humanproof-ultra-credential-card-preview-v{i}.html" for i in range(10,16)],
    *[f"humanproof-ultra-credential-card-preview-v{i}.html" for i in range(6,10)],
    "humanproof-verified-card-preview-v1.html","humanproof-verified-card-preview-v2.html",
    "humanproof-verified-card-preview-v3-gold.html","image-compressor-compact-preview-v1.html",
    "instagram-callback.html","instagram-connect.html","labs.html","live-alerts.html","live.html","magic-drop.html",
    *[f"preview-home-flagship-humanproof-v{i}.html" for i in range(1,5)],
    "preview-humanproof-scifi-mesh.html","pulse.html","sports-live.html","tech.html",
    "tech/ai-agent-browser-security.html","tech/browser-ai-webgpu-webassembly.html",
    "tech/chrome-151-august-2026-security-update.html","tech/firefox-154-security-update-2026.html",
    "tech/gpt-6-astra-2026.html","tech/passkeys-2026.html","tech/post-quantum-encryption-explained.html",
    "tech/qr-code-phishing-quishing.html","tech/toxicpanda-android-malware-2026.html",
    "weather-live.html","widgets.html","xray.html",
]

B_MERGE = [
    "daily-tools-directory.html","new-tools.html","popular-tools.html","smart-tools.html","trending-tools.html"
]

C_IMPROVE = [
    "age-calculator.html","ai-prompt-builder.html","ai-token-calculator.html","ai-vram-calculator.html",
    "avif-to-jpg.html","bill-split-tip-calculator.html","bmi-calculator.html","calculator.html",
    "date-difference-calculator.html","discount-calculator.html","dns-lookup.html","edpi-calculator.html",
    "emi-calculator.html","fps-frame-time-calculator.html","gamer-name-generator.html",
    "gaming-sensitivity-converter.html","gaming-settings-notes.html","heic-to-jpg.html","image-compressor.html",
    "image-metadata-remover.html","image-resizer.html","image-to-text-ocr.html","invoice-maker.html",
    "ip-cidr-calculator.html","jpg-to-pdf.html","jpg-to-png.html","merge-pdf.html","meta-tag-generator.html",
    "minecraft-coordinate-converter.html","number-to-words.html","online-timer.html",
    "pakistan-public-holidays-2026.html","paper-size-converter.html","password-generator.html",
    "password-strength-checker.html","percentage-calculator.html","percentage-change-calculator.html",
    "photo-cctv-enhancer.html","png-to-jpg.html","pomodoro-timer.html","prayer-times-qibla-pakistan.html",
    "private-quick-note.html","public-ip-checker.html","qr-code-generator.html","qr-code-scanner.html",
    "random-number-generator.html","random-picker.html","reaction-time-test.html","rgb-hex-converter.html",
    "roman-numeral-converter.html","scientific-calculator.html","split-pdf.html","ssl-certificate-checker.html",
    "steam-playtime-calculator.html","stopwatch.html","storage-size-converter.html","text-case-converter.html",
    "text-to-pdf.html","time-duration-calculator.html","timezone-meeting-planner.html","typing-speed-test.html",
    "unit-converter.html","unix-timestamp-converter.html","webp-to-jpg.html","webp-to-png.html",
    "website-reachability-checker.html","whatsapp-link-generator.html","word-counter.html",
    "youtube-thumbnail-downloader.html",
]

D_KEEP_HUB = [
    "tools.html","categories.html","calculator-tools.html","image-tools.html","pdf-tools.html",
    "productivity-tools.html","developer-tools.html","network-tools.html","pakistan-tools.html",
    "articles.html","guides.html",
]

E_KEEP_TRUST = [
    "about.html","editorial-policy.html","editorial-team.html","tool-methodology.html",
    "privacy.html","terms.html","contact.html","disclaimer.html",
]

SPOT_15 = [
    "bmi-calculator.html","age-calculator.html","date-difference-calculator.html","discount-calculator.html",
    "ai-prompt-builder.html","ai-token-calculator.html","calculator.html","emi-calculator.html",
    "image-resizer.html","qr-code-scanner.html","ip-cidr-calculator.html","unit-converter.html",
    "timezone-meeting-planner.html","merge-pdf.html","youtube-thumbnail-downloader.html",
]

METHOD_WORDS = (
    "formula","method","how it works","how the","calculation","calculate","convert","conversion",
    "process","steps","uses ","based on","works by","workflow","estimate","result is"
)
EXAMPLE_WORDS = (
    "example","for example","e.g.","suppose","try ","enter ","if you ","when you ","sample",
    "scenario","worked","input","output"
)
LIMIT_WORDS = (
    "limitation","limitations","note:","important","caution","warning","cannot","does not","doesn't",
    "may not","not guaranteed","not a guarantee","verify","check the","depends on","privacy","risk"
)

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta_robots = ""
        self.links: list[tuple[str,str,bool]] = []
        self._anchor_href: str | None = None
        self._anchor_parts: list[str] = []
        self._anchor_has_p = False
        self._skip = 0
        self.text_parts: list[str] = []
        self._in_nav_footer = 0

    def handle_starttag(self, tag, attrs):
        attrs = {str(k).lower(): str(v or "") for k,v in attrs}
        if tag in ("script","style","svg","noscript"):
            self._skip += 1
        if tag in ("nav","footer"):
            self._in_nav_footer += 1
        if tag == "meta" and attrs.get("name","").lower() == "robots":
            self.meta_robots = attrs.get("content","").strip()
        if tag == "a":
            self._anchor_href = attrs.get("href","").strip()
            self._anchor_parts = []
            self._anchor_has_p = False
        elif tag == "p" and self._anchor_href is not None:
            self._anchor_has_p = True

    def handle_endtag(self, tag):
        if tag == "a" and self._anchor_href is not None:
            txt = re.sub(r"\s+"," "," ".join(self._anchor_parts)).strip()
            self.links.append((self._anchor_href, txt, self._anchor_has_p))
            self._anchor_href = None
            self._anchor_parts = []
            self._anchor_has_p = False
        if tag in ("script","style","svg","noscript") and self._skip:
            self._skip -= 1
        if tag in ("nav","footer") and self._in_nav_footer:
            self._in_nav_footer -= 1

    def handle_data(self, data):
        if self._skip:
            return
        val = re.sub(r"\s+"," ",data).strip()
        if not val:
            return
        if self._anchor_href is not None:
            self._anchor_parts.append(val)
        if not self._in_nav_footer:
            self.text_parts.append(val)

def parse_html(raw: str) -> PageParser:
    p = PageParser()
    try:
        p.feed(raw)
    except Exception:
        pass
    return p

def current_text(rel: str) -> str:
    p = ROOT / rel
    return p.read_text(encoding="utf-8", errors="ignore") if p.exists() else ""

def git_old_text(rel: str) -> str:
    proc = subprocess.run(
        ["git","show",f"{BASE_SHA}:{rel}"],
        cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True
    )
    return proc.stdout if proc.returncode == 0 else ""

def robots_value(raw: str) -> str:
    return parse_html(raw).meta_robots or "(missing)"

def is_noindex(value: str) -> bool:
    return "noindex" in value.lower()

def plain_text(raw: str) -> str:
    p = parse_html(raw)
    return re.sub(r"\s+"," "," ".join(p.text_parts)).strip()

def excerpt_for(raw: str, limit=280) -> str:
    text = plain_text(raw)
    if not text:
        return ""
    low = text.lower()
    anchors = ["formula","how it works","example","limitations","important","note","privacy","check ","verify"]
    pos = min((low.find(x) for x in anchors if low.find(x) >= 0), default=0)
    start = max(0, pos - 50)
    out = text[start:start+limit].strip()
    if start:
        out = "…" + out
    if start + limit < len(text):
        out += "…"
    return out

def content_quality(raw: str) -> dict:
    low = plain_text(raw).lower()
    words = re.findall(r"\b[\w'-]+\b", low)
    return {
        "boilerplate_gone": "nexusnova_compact_tool_guide" not in raw.lower(),
        "method": any(x in low for x in METHOD_WORDS),
        "example": any(x in low for x in EXAMPLE_WORDS),
        "limitations": any(x in low for x in LIMIT_WORDS),
        "word_count": len(words),
        "excerpt": excerpt_for(raw),
    }

def request(url: str, timeout=25) -> dict:
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": "text/html,application/xml,text/plain,*/*;q=0.7",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8","replace")
            return {"ok": True, "status": resp.status, "url": resp.geturl(), "body": body,
                    "date": resp.headers.get("Date","")}
    except urllib.error.HTTPError as exc:
        return {"ok": False, "status": exc.code, "url": exc.geturl(),
                "body": exc.read().decode("utf-8","replace"), "error": f"HTTP {exc.code}"}
    except Exception as exc:
        return {"ok": False, "status": 0, "url": url, "body": "",
                "error": f"{type(exc).__name__}: {exc}"}

def live_fetch_many(rels: list[str]) -> dict[str,dict]:
    out: dict[str,dict] = {}
    def one(rel):
        return rel, request(urllib.parse.urljoin(SITE, rel))
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
        futs = [ex.submit(one, r) for r in rels]
        for fut in concurrent.futures.as_completed(futs):
            rel, result = fut.result()
            out[rel] = result
    return out

def internal_target(source_rel: str, href: str) -> str | None:
    href = html.unescape(href or "").strip()
    if not href or href.startswith(("#","mailto:","tel:","javascript:","data:")):
        return None
    base = urllib.parse.urljoin(SITE, source_rel)
    absu = urllib.parse.urljoin(base, href)
    u = urllib.parse.urlparse(absu)
    if u.netloc and u.netloc.lower() not in ("nexusnovatools.com","www.nexusnovatools.com"):
        return None
    path = urllib.parse.unquote(u.path or "/")
    if path in ("","/"):
        return "index.html"
    rel = path.lstrip("/")
    if rel.endswith("/"):
        rel += "index.html"
    return rel

def all_public_html() -> list[str]:
    excluded_prefixes = (".github/","ota/","cloudflare/","downloads/","tests/","vpn/","nexusnova-dev-ai/")
    result=[]
    for p in ROOT.rglob("*.html"):
        rel=p.relative_to(ROOT).as_posix()
        if rel.startswith(excluded_prefixes):
            continue
        result.append(rel)
    return sorted(result)

def indexable(rel: str) -> bool:
    raw=current_text(rel)
    if not raw:
        return False
    return not is_noindex(robots_value(raw))

def broken_and_inbound():
    pages=all_public_html()
    existing={p.relative_to(ROOT).as_posix() for p in ROOT.rglob("*") if p.is_file()}
    broken=[]
    inbound=defaultdict(set)
    for src in pages:
        raw=current_text(src)
        parser=parse_html(raw)
        src_indexable = not is_noindex(parser.meta_robots)
        for href, anchor, has_p in parser.links:
            target=internal_target(src,href)
            if target is None:
                continue
            if target not in existing:
                broken.append({"source":src,"href":href,"resolved":target})
            elif src_indexable:
                inbound[target].add(src)
    return broken, inbound

def teaser_violations():
    targets=set(A_NOINDEX+B_MERGE)
    violations=[]
    for hub in D_KEEP_HUB:
        p=parse_html(current_text(hub))
        for href, text, has_p in p.links:
            target=internal_target(hub,href)
            if target in targets and (has_p or len(text) >= 90):
                violations.append({"hub":hub,"target":target,"anchor_text":text[:180],"has_p":has_p})
    return violations

def trust_unchanged(rel: str) -> bool:
    proc=subprocess.run(["git","diff","--quiet",BASE_SHA,"--",rel],cwd=ROOT)
    return proc.returncode == 0

def md_escape(s: str) -> str:
    return (s or "").replace("|","\\|").replace("\n"," ").strip()

def main():
    assert len(A_NOINDEX)==72, len(A_NOINDEX)
    assert len(B_MERGE)==5
    assert len(C_IMPROVE)==69
    assert len(D_KEEP_HUB)==11
    assert len(E_KEEP_TRUST)==8
    assert len(set(A_NOINDEX+B_MERGE+C_IMPROVE+D_KEEP_HUB+E_KEEP_TRUST)) == 165

    checked_at = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    live_rels = sorted(set(A_NOINDEX+B_MERGE+D_KEEP_HUB+E_KEEP_TRUST))
    live = live_fetch_many(live_rels)

    failures=[]
    a_rows=[]
    for rel in A_NOINDEX:
        old=robots_value(git_old_text(rel))
        new=robots_value(current_text(rel))
        lv=robots_value(live.get(rel,{}).get("body",""))
        ok_source=is_noindex(new)
        ok_live=live.get(rel,{}).get("status")==200 and is_noindex(lv)
        if not ok_source: failures.append(f"A source noindex missing: {rel} ({new})")
        if not ok_live: failures.append(f"A live noindex missing/unavailable: {rel} status={live.get(rel,{}).get('status')} robots={lv}")
        a_rows.append({"filename":rel,"old":old,"new":new,"live":lv,"live_status":live.get(rel,{}).get("status",0)})

    b_rows=[]
    for rel in B_MERGE:
        old=robots_value(git_old_text(rel))
        new=robots_value(current_text(rel))
        lv=robots_value(live.get(rel,{}).get("body",""))
        ok_source=is_noindex(new)
        ok_live=live.get(rel,{}).get("status")==200 and is_noindex(lv)
        if not ok_source: failures.append(f"B source noindex missing: {rel} ({new})")
        if not ok_live: failures.append(f"B live noindex missing/unavailable: {rel} status={live.get(rel,{}).get('status')} robots={lv}")
        b_rows.append({"filename":rel,"old":old,"new":new,"live":lv,"live_status":live.get(rel,{}).get("status",0)})

    c_rows=[]
    for rel in C_IMPROVE:
        raw=current_text(rel)
        q=content_quality(raw)
        rb=robots_value(raw)
        idx=not is_noindex(rb)
        checks=q["boilerplate_gone"] and idx and q["method"] and q["example"] and q["limitations"] and q["word_count"] >= 180
        if not checks:
            failures.append(
                f"C quality gate: {rel} boilerplate_gone={q['boilerplate_gone']} indexable={idx} "
                f"method={q['method']} example={q['example']} limitations={q['limitations']} words={q['word_count']}"
            )
        c_rows.append({"filename":rel,"robots":rb,"indexable":idx,**q,"pass":checks})

    d_rows=[]
    for rel in D_KEEP_HUB:
        src=robots_value(current_text(rel))
        lv=robots_value(live.get(rel,{}).get("body",""))
        ok=(not is_noindex(src)) and live.get(rel,{}).get("status")==200 and not is_noindex(lv)
        if not ok:
            failures.append(f"D indexability: {rel} source={src} live_status={live.get(rel,{}).get('status')} live={lv}")
        d_rows.append({"filename":rel,"source":src,"live":lv,"status":live.get(rel,{}).get("status",0),"pass":ok})

    teasers=teaser_violations()
    for t in teasers:
        failures.append(f"D full teaser to noindex target: {t['hub']} -> {t['target']}")

    e_rows=[]
    for rel in E_KEEP_TRUST:
        src=robots_value(current_text(rel))
        lv=robots_value(live.get(rel,{}).get("body",""))
        unchanged=trust_unchanged(rel)
        ok=(not is_noindex(src)) and live.get(rel,{}).get("status")==200 and not is_noindex(lv) and unchanged
        if not ok:
            failures.append(f"E trust check: {rel} source={src} live_status={live.get(rel,{}).get('status')} live={lv} unchanged={unchanged}")
        e_rows.append({"filename":rel,"source":src,"live":lv,"status":live.get(rel,{}).get("status",0),"unchanged_from_base":unchanged,"pass":ok})

    forbidden=set(A_NOINDEX+B_MERGE)
    sitemap_source=(ROOT/"sitemap.xml").read_text(encoding="utf-8",errors="ignore")
    live_sitemap=request(urllib.parse.urljoin(SITE,"sitemap.xml"))
    live_sitemap_body=live_sitemap.get("body","")
    sitemap_source_hits=sorted(x for x in forbidden if f"https://nexusnovatools.com/{x}" in sitemap_source)
    sitemap_live_hits=sorted(x for x in forbidden if f"https://nexusnovatools.com/{x}" in live_sitemap_body)
    if sitemap_source_hits: failures.append(f"F sitemap source forbidden URLs: {sitemap_source_hits}")
    if live_sitemap.get("status") != 200: failures.append(f"F live sitemap HTTP {live_sitemap.get('status')}")
    if sitemap_live_hits: failures.append(f"F live sitemap forbidden URLs: {sitemap_live_hits}")

    live_robots=request(urllib.parse.urljoin(SITE,"robots.txt"))
    robots_body=live_robots.get("body","")
    disallows=[]
    active_star=False
    for rawline in robots_body.splitlines():
        line=rawline.split("#",1)[0].strip()
        if not line: continue
        key,_,val=line.partition(":")
        key=key.strip().lower(); val=val.strip()
        if key=="user-agent":
            active_star = (val=="*")
        elif active_star and key=="disallow" and val:
            disallows.append(val)
    blocked_noindex=[]
    for rel in forbidden:
        path="/"+rel
        for rule in disallows:
            if rule=="/" or path.startswith(rule):
                blocked_noindex.append({"page":rel,"rule":rule})
                break
    if live_robots.get("status") != 200: failures.append(f"F live robots HTTP {live_robots.get('status')}")
    if blocked_noindex: failures.append(f"F robots blocks noindex pages from crawl: {blocked_noindex[:20]}")

    broken,inbound=broken_and_inbound()
    if broken: failures.append(f"F broken internal links: {len(broken)}")
    required_reachable=C_IMPROVE+D_KEEP_HUB
    orphans=[x for x in required_reachable if x!="index.html" and not inbound.get(x)]
    if orphans: failures.append(f"F orphaned required pages: {orphans}")

    b_reach_ok = not [x for x in C_IMPROVE if not inbound.get(x)]

    home=request(SITE)
    home_text=plain_text(home.get("body",""))
    required_claims=["SAMPLE","NOT VERIFIED","NO LIVE PROOF","NOT ISSUED"]
    claims={x:(x.lower() in home_text.lower()) for x in required_claims}
    if home.get("status") != 200 or not all(claims.values()):
        failures.append(f"F HumanProof live labels missing: status={home.get('status')} claims={claims}")
    hp_low=home_text.lower()
    hp_pos=hp_low.find("design sample")
    if hp_pos<0: hp_pos=hp_low.find("not verified")
    hp_excerpt=home_text[max(0,hp_pos-80):hp_pos+420] if hp_pos>=0 else home_text[:500]

    live_articles=live.get("articles.html",{})
    deployment_match=(
        live_articles.get("status")==200
        and "Practical context for everyday digital tasks." in live_articles.get("body","")
        and "CURRENT SIGNALS" not in live_articles.get("body","").upper()
    )
    if not deployment_match:
        failures.append("G live deployment does not yet match remediated articles.html source")

    spot={rel:excerpt_for(current_text(rel),360) for rel in SPOT_15}

    status="PASS" if not failures else "FAIL"
    report={
        "checked_at_utc":checked_at,
        "base_sha":BASE_SHA,
        "status":status,
        "counts":{"A":len(A_NOINDEX),"B":len(B_MERGE),"C":len(C_IMPROVE),"D":len(D_KEEP_HUB),"E":len(E_KEEP_TRUST),"total":165},
        "section_a":a_rows,"section_b":b_rows,"section_c":c_rows,"section_d":d_rows,
        "section_d_teaser_violations":teasers,"section_e":e_rows,
        "technical":{
            "sitemap_source_forbidden_hits":sitemap_source_hits,
            "sitemap_live_status":live_sitemap.get("status"),
            "sitemap_live_forbidden_hits":sitemap_live_hits,
            "robots_live_status":live_robots.get("status"),
            "robots_disallow_rules":disallows,
            "robots_blocked_noindex":blocked_noindex,
            "broken_internal_links_count":len(broken),
            "broken_internal_links":broken,
            "broken_link_method":"Python stdlib HTMLParser + urllib.parse.urljoin static repository crawl after remediation",
            "orphaned_required_pages":orphans,
            "orphan_method":"Inbound-link graph built only from current indexable HTML pages",
            "merge_tool_reachability_ok":b_reach_ok,
            "humanproof_claims":claims,
            "humanproof_live_excerpt":hp_excerpt,
            "deployment_match_current_source":deployment_match,
            "live_articles_http_status":live_articles.get("status"),
        },
        "spot_check_15":spot,
        "failures":failures,
    }
    (ROOT/"full-site-fix-verification.json").write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")

    md=[]
    md += ["# NexusNova Full Site Fix — Evidence Report","",f"- Checked UTC: `{checked_at}`",f"- Baseline before checklist remediation: `{BASE_SHA}`",
           f"- Pages in checklist scope: **165**",f"- Overall verification: **{status}**",""]
    md += ["## Section A — 72 NOINDEX pages","","| Filename | Old meta-robots | New meta-robots | Live meta-robots | Live HTTP |",
           "|---|---|---|---|---:|"]
    for r in a_rows:
        md.append(f"| `{r['filename']}` | `{md_escape(r['old'])}` | `{md_escape(r['new'])}` | `{md_escape(r['live'])}` | {r['live_status']} |")
    md += ["","## Section B — 5 MERGE pages","","| Filename | Old meta-robots | New meta-robots | Live meta-robots | Live HTTP |",
           "|---|---|---|---|---:|"]
    for r in b_rows:
        md.append(f"| `{r['filename']}` | `{md_escape(r['old'])}` | `{md_escape(r['new'])}` | `{md_escape(r['live'])}` | {r['live_status']} |")
    md += ["",f"All 69 IMPROVE targets reachable from an indexable internal page: **{'YES' if b_reach_ok else 'NO'}**","",
           "## Section C — 69 IMPROVE pages",
           "",
           "| Filename | Indexed | Boilerplate gone | Method/formula evidence | Example/usage evidence | Limitations/caution evidence | Words | Result |",
           "|---|---:|---:|---:|---:|---:|---:|---:|"]
    for r in c_rows:
        md.append(f"| `{r['filename']}` | {'YES' if r['indexable'] else 'NO'} | {'YES' if r['boilerplate_gone'] else 'NO'} | "
                  f"{'YES' if r['method'] else 'NO'} | {'YES' if r['example'] else 'NO'} | {'YES' if r['limitations'] else 'NO'} | "
                  f"{r['word_count']} | {'PASS' if r['pass'] else 'FAIL'} |")
    md += ["","### Required 15-page unique-content spot check",""]
    for rel in SPOT_15:
        md += [f"**`{rel}`**",f"> {md_escape(spot[rel])}",""]
    md += ["## Section D — 11 KEEP hubs","","| Hub | Source robots | Live robots | Live HTTP | Result |","|---|---|---|---:|---:|"]
    for r in d_rows:
        md.append(f"| `{r['filename']}` | `{md_escape(r['source'])}` | `{md_escape(r['live'])}` | {r['status']} | {'PASS' if r['pass'] else 'FAIL'} |")
    md += ["",f"Full-teaser links from indexable hubs to A/B noindex targets: **{len(teasers)}**",""]
    if teasers:
        for t in teasers: md.append(f"- `{t['hub']}` → `{t['target']}` — {md_escape(t['anchor_text'])}")
    md += ["","## Section E — 8 KEEP trust pages","","| Trust page | Source robots | Live robots | Unchanged vs baseline | Result |",
           "|---|---|---|---:|---:|"]
    for r in e_rows:
        md.append(f"| `{r['filename']}` | `{md_escape(r['source'])}` | `{md_escape(r['live'])}` | {'YES' if r['unchanged_from_base'] else 'NO'} | {'PASS' if r['pass'] else 'FAIL'} |")
    md += ["","## Section F — Site-wide technical checks","",
           f"- Live `sitemap.xml` HTTP: **{live_sitemap.get('status')}**; forbidden A+B URLs present: **{len(sitemap_live_hits)}**.",
           f"- Source `sitemap.xml` forbidden A+B URLs present: **{len(sitemap_source_hits)}**.",
           f"- Live `robots.txt` HTTP: **{live_robots.get('status')}**; noindexed A+B pages blocked from crawl: **{len(blocked_noindex)}**.",
           f"- Internal broken links: **{len(broken)}**. Method: `Python stdlib HTMLParser + urllib.parse.urljoin static repository crawl after remediation`.",
           f"- Required IMPROVE + KEEP-hub orphan pages: **{len(orphans)}**. Method: `inbound-link graph from indexable HTML only`.",
           f"- HumanProof live labels: " + ", ".join(f"`{k}`={'YES' if v else 'NO'}" for k,v in claims.items()),
           f"- Live HumanProof excerpt: > {md_escape(hp_excerpt)}",
           "",
           "## Section G — Deployment + independently checkable result","",
           f"- Live `articles.html` matches the remediated source (new practical-workflow copy present; legacy Current Signals absent): **{'YES' if deployment_match else 'NO'}**.",
           f"- Deployment was independently observed in the public domain **no later than `{checked_at}` UTC** if the match above is YES.",
           "- This workflow checks live page robots tags for every A/B/D/E page and fetches live sitemap/robots directly from `https://nexusnovatools.com/`.",
           ""]
    if failures:
        md += ["## FAILURES",""] + [f"- {x}" for x in failures] + [""]
    else:
        md += ["## FINAL VERDICT","","**PASS — all non-negotiable checklist checks passed in this run.**",""]
    (ROOT/"NEXUSNOVA-FULL-SITE-FIX-PROOF.md").write_text("\n".join(md)+"\n",encoding="utf-8")
    print("\n".join(md[-60:]))
    if failures:
        print(f"\nFAILED: {len(failures)} issue(s)", file=sys.stderr)
        for item in failures:
            print(" - "+item, file=sys.stderr)
        raise SystemExit(1)
    print("PASS: full 165-page checklist verified.")

if __name__=="__main__":
    main()
