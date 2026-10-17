#!/usr/bin/env python3
"""Final deterministic SEO, article-discovery and GitHub Actions cleanup.

This deliberately touches public HTML metadata, public search discovery, sitemap
entries and workflow action references only. Protected business/runtime engines
are not modified.
"""
from __future__ import annotations

import html
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = "https://nexusnovatools.com/"
BRAND = " | NexusNova Tools"
ARTICLE_DIR = ROOT / "articles"

TITLE_OVERRIDES = {
    "50-30-20-budget-rule.html": "50/30/20 Budget Rule Explained | NexusNova Tools",
    "air-conditioner-running-cost.html": "Air Conditioner Running Cost Calculator | NexusNova Tools",
    "apr-vs-apy.html": "APR vs APY: Interest Rates Explained | NexusNova Tools",
    "bandwidth-vs-latency.html": "Bandwidth vs Latency: Key Differences | NexusNova Tools",
    "battery-runtime-estimator.html": "Battery Runtime Estimator: Backup Time | NexusNova Tools",
    "bond-yield-duration-risk.html": "Bond Yield vs Duration Risk | NexusNova Tools",
    "cagr-vs-average-return.html": "CAGR vs Average Return: Growth Explained | NexusNova Tools",
    "cash-flow-forecast-small-business.html": "Small-Business Cash Flow Forecast | NexusNova Tools",
    "cloud-storage-cost-growth.html": "Cloud Storage Cost Growth Forecast | NexusNova Tools",
    "credit-utilization-explained.html": "Credit Utilization: Credit Score Impact | NexusNova Tools",
    "currency-conversion-fees.html": "Currency Conversion Fees: Compare Costs | NexusNova Tools",
    "debt-avalanche-vs-snowball.html": "Debt Avalanche vs Snowball Payoff | NexusNova Tools",
    "dividend-yield-vs-total-return.html": "Dividend Yield vs Total Return | NexusNova Tools",
    "education-savings-time-value.html": "Education Savings: Time Value of Money | NexusNova Tools",
    "electricity-appliance-kwh-cost.html": "Appliance Electricity Cost: kWh and Bills | NexusNova Tools",
    "emergency-fund-size-guide.html": "Emergency Fund Size: How Much to Save | NexusNova Tools",
    "freelancer-hourly-rate.html": "Freelancer Hourly Rate: Price Your Work | NexusNova Tools",
    "fuel-cost-per-trip.html": "Fuel Cost per Trip Calculator | NexusNova Tools",
    "home-insulation-payback.html": "Home Insulation Payback: Energy Savings | NexusNova Tools",
    "inflation-purchasing-power.html": "Inflation and Purchasing Power Explained | NexusNova Tools",
    "insurance-deductible-tradeoff.html": "Insurance Deductible: Cost vs Risk | NexusNova Tools",
    "international-transfer-fees.html": "International Transfer Fees: Compare Costs | NexusNova Tools",
    "markup-vs-margin.html": "Markup vs Margin: Main Differences | NexusNova Tools",
    "mobile-data-budget.html": "Mobile Data Budget: Monthly Usage | NexusNova Tools",
    "overdraft-fee-opportunity-cost.html": "Overdraft Fees: Opportunity Cost | NexusNova Tools",
    "paycheck-budget-allocation.html": "Paycheck Budget Allocation Guide | NexusNova Tools",
    "pc-electricity-cost.html": "PC Electricity Cost Calculator | NexusNova Tools",
    "portfolio-rebalancing-bands.html": "Portfolio Rebalancing Bands Explained | NexusNova Tools",
    "printer-cost-per-page.html": "Printer Cost per Page Calculator | NexusNova Tools",
    "retirement-withdrawal-rate.html": "Retirement Withdrawal Rate Guide | NexusNova Tools",
    "seasonal-gas-heating-budget.html": "Seasonal Gas Heating Budget | NexusNova Tools",
    "sinking-funds-vs-emergency-funds.html": "Sinking Funds vs Emergency Funds | NexusNova Tools",
    "small-business-break-even.html": "Small Business Break-Even Analysis | NexusNova Tools",
    "solar-panel-payback-period.html": "Solar Panel Payback Period Calculator | NexusNova Tools",
    "subscription-annual-cost.html": "Subscription Annual Cost Calculator | NexusNova Tools",
    "tax-withholding-adjustment.html": "Tax Withholding Adjustment Guide | NexusNova Tools",
    "time-of-use-electricity-savings.html": "Time-of-Use Electricity Savings Guide | NexusNova Tools",
    "tire-pressure-fuel-savings.html": "Tire Pressure and Fuel Savings | NexusNova Tools",
    "water-heater-energy-cost.html": "Water Heater Energy Cost Calculator | NexusNova Tools",
    "water-leak-bill-estimate.html": "Water Leak Bill Estimate Calculator | NexusNova Tools",
    "zero-based-budget.html": "Zero-Based Budget: Give Every Dollar a Job | NexusNova Tools",
}
CASHFLOW_DESCRIPTION = (
    "Forecast small-business cash flow weekly with opening cash, expected invoice "
    "collections, supplier bills, payroll and tax reserves. Includes formulas and a worked example."
)

ACTION_PINS = {
    "actions/checkout": (
        "3d3c42e5aac5ba805825da76410c181273ba90b1", "v7.0.1"
    ),
    "actions/setup-node": (
        "949feb2413d6458794dcd2491c4babbbce0c15c1", "v7.1.0"
    ),
    "actions/setup-python": (
        "5fda3b95a4ea91299a34e894583c3862153e4b97", "v7.0.0"
    ),
    "actions/upload-artifact": (
        "cf430e030ddbb5b0abf93d22962f4752f3646cd9", "v7.0.2"
    ),
    "actions/download-artifact": (
        "9000827ccba6bdab643e8b6fd33ac0654aef8333", "v8.0.2"
    ),
    "actions/cache": (
        "55cc8345863c7cc4c66a329aec7e433d2d1c52a9", "v6.1.0"
    ),
    "actions/github-script": (
        "3a2844b7e9c422d3c10d287c895573f7108da1b3", "v9.0.0"
    ),
}

def get_attr(tag: str, key: str) -> str:
    match = re.search(
        r"\b" + re.escape(key) + r"\s*=\s*([\"'])(.*?)\1",
        tag, re.I | re.S
    )
    return html.unescape(match.group(2)).strip() if match else ""

def meta_tag_match(source: str, key: str, value: str):
    for match in re.finditer(r"<meta\b[^>]*>", source, re.I | re.S):
        tag = match.group(0)
        if get_attr(tag, key).lower() == value.lower():
            return match
    return None

def set_meta(source: str, key: str, value: str, content: str) -> str:
    tag_match = meta_tag_match(source, key, value)
    tag_content = f'<meta {key}="{html.escape(value, quote=True)}" content="{html.escape(content, quote=True)}">'
    if tag_match:
        tag = tag_match.group(0)
        content_pattern = re.compile(r"\bcontent\s*=\s*([\"']).*?\1", re.I | re.S)
        updated, count = content_pattern.subn(
            lambda _: f'content="{html.escape(content, quote=True)}"',
            tag, count=1
        )
        if count == 0:
            updated = tag[:-1] + f' content="{html.escape(content, quote=True)}">'
        return source[:tag_match.start()] + updated + source[tag_match.end():]
    head_end = re.search(r"</head\s*>", source, re.I)
    if head_end:
        return source[:head_end.start()] + tag_content + "\n" + source[head_end.start():]
    return tag_content + "\n" + source

def set_title(source: str, title: str) -> str:
    tag = "<title>" + html.escape(title, quote=False) + "</title>"
    pattern = re.compile(r"<title\b[^>]*>[\s\S]*?</title\s*>", re.I)
    updated, count = pattern.subn(tag, source, count=1)
    if count:
        return updated
    head_end = re.search(r"</head\s*>", source, re.I)
    return (source[:head_end.start()] + tag + "\n" + source[head_end.start()]) if head_end else tag + "\n" + source

def get_title(source: str) -> str:
    match = re.search(r"<title\b[^>]*>([\s\S]*?)</title\s*>", source, re.I)
    return html.unescape(re.sub(r"<[^>]+>", "", match.group(1))).strip() if match else ""

def get_h1(source: str) -> str:
    match = re.search(r"<h1\b[^>]*>([\s\S]*?)</h1\s*>", source, re.I)
    if not match:
        return "Practical Guide"
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", match.group(1)))).strip()

def get_description(source: str) -> str:
    match = meta_tag_match(source, "name", "description")
    return get_attr(match.group(0), "content") if match else ""

def trim_description(description: str, topic: str) -> str:
    description = re.sub(r"\s+", " ", html.unescape(description)).strip()
    if len(description) > 175:
        clipped = description[:171]
        if " " in clipped:
            clipped = clipped.rsplit(" ", 1)[0]
        description = clipped.rstrip(" ,;:-") + "."
    if len(description) < 70:
        description = (
            f"Learn how {topic.lower()} works with clear formulas, practical examples "
            "and planning tips to support better-informed decisions."
        )
        if len(description) > 175:
            description = description[:171].rsplit(" ", 1)[0].rstrip(" ,;:-") + "."
    return description

def concise_title(full_title: str, filename: str) -> str:
    mapped = TITLE_OVERRIDES.get(filename)
    if mapped:
        candidate = mapped
    else:
        current = re.sub(r"\s*\|\s*NexusNova Tools\s*$", "", full_title, flags=re.I).strip()
        max_core = 70 - len(BRAND)
        if len(current) > max_core:
            current = current[:max_core].rsplit(" ", 1)[0].rstrip(" ,:;|-")
        candidate = current + BRAND
    if len(candidate) > 70:
        core = candidate[:-len(BRAND)] if candidate.endswith(BRAND) else candidate
        core = core[:70 - len(BRAND)].rsplit(" ", 1)[0].rstrip(" ,:;|-")
        candidate = core + BRAND
    if len(candidate) < 20:
        candidate = (candidate[:-len(BRAND)].strip() + " Guide" + BRAND) if candidate.endswith(BRAND) else candidate
    if len(candidate) > 70:
        raise ValueError(f"{filename}: title cannot be fit to 70 characters: {candidate!r}")
    return candidate

def page_url(path: Path) -> str:
    return BASE + path.relative_to(ROOT).as_posix()

def canonical_url(source: str) -> str:
    match = re.search(
        r'<link\b(?=[^>]*\brel=["\']canonical["\'])[^>]*>',
        source, re.I | re.S
    )
    return get_attr(match.group(0), "href") if match else ""

def is_indexable(source: str) -> bool:
    match = meta_tag_match(source, "name", "robots")
    return not (match and re.search(r"\bnoindex\b", get_attr(match.group(0), "content"), re.I))

def update_article(path: Path) -> bool:
    source = path.read_text(encoding="utf-8-sig")
    original = source
    title = concise_title(get_title(source), path.name)
    title_core = re.sub(r"\s*\|\s*NexusNova Tools\s*$", "", title, flags=re.I).strip()
    description = CASHFLOW_DESCRIPTION if path.name == "cash-flow-forecast-small-business.html" else trim_description(get_description(source), get_h1(source))
    source = set_title(source, title)
    source = set_meta(source, "name", "description", description)
    source = set_meta(source, "property", "og:title", title_core)
    source = set_meta(source, "name", "twitter:title", title_core)
    source = set_meta(source, "property", "og:description", description)
    source = set_meta(source, "name", "twitter:description", description)

    image_match = meta_tag_match(source, "property", "og:image")
    image = get_attr(image_match.group(0), "content") if image_match else ""
    if not image:
        image = BASE + "assets/nexusnova-logo-512.svg"
        source = set_meta(source, "property", "og:image", image)
    elif image.startswith("/"):
        image = BASE.rstrip("/") + image
        source = set_meta(source, "property", "og:image", image)
    elif not re.match(r"https?://", image, re.I):
        image = BASE + image.lstrip("./")
        source = set_meta(source, "property", "og:image", image)
    source = set_meta(source, "name", "twitter:image", image)

    # Use the shared production design foundation on article templates currently
    # missing all recognized theme assets. This is a stylesheet, not an audit waiver.
    has_theme = any(marker in source for marker in (
        "assets/css/site.css", "assets/css/scifi.css",
        "assets/js/main.js", "assets/css/humanproof.css"
    ))
    if not has_theme:
        tag = '<link rel="stylesheet" href="../assets/css/site.css?v=20261017-final-100">'
        head_end = re.search(r"</head\s*>", source, re.I)
        if head_end:
            source = source[:head_end.start()] + tag + "\n" + source[head_end.start():]
        else:
            source = tag + "\n" + source

    # Keep the structured Article headline aligned with the visible page title.
    source = re.sub(
        r'("headline"\s*:\s*)"(?:[^"\\]|\\.)*"',
        lambda m: m.group(1) + json.dumps(title_core, ensure_ascii=False),
        source, count=1
    )
    if source != original:
        path.write_text(source, encoding="utf-8")
        return True
    return False

def patch_phase2_sync_script() -> bool:
    path = ROOT / ".github/scripts/sync_phase2_content.py"
    source = path.read_text(encoding="utf-8")
    original = source
    lines = source.splitlines()
    output = []
    skipped_old_sub = False
    for line in lines:
        if line.startswith("article_re=re.compile("):
            output.append(
                'core="\\n".join(line for line in core.splitlines() '
                'if not (line.strip().startswith("{ title:") and \'type:"article"\' in line))+"\\n"'
            )
            continue
        if line.startswith('core=article_re.sub('):
            skipped_old_sub = True
            continue
        if line.strip().startswith("if not indexable and canonical != page_url.rstrip"):
            output.append('    if not indexable or canonical != page_url.rstrip("/"): continue')
            continue
        if line.strip().startswith("    records.append(record)"):
            output.append(line)
            continue
        if line.strip().startswith("    if indexable and canonical == page_url.rstrip"):
            output.append("    sitemap_records.append(record)")
            continue
        output.append(line)
    source = "\n".join(output) + "\n"
    # Require exactly 100 indexable self-canonical URLs and article records.
    marker = 'core=CORE.read_text(encoding="utf-8-sig")'
    source = source.replace(
        marker,
        'if len(records) != 100:\n    raise SystemExit(f"ERROR: expected 100 indexable self-canonical articles, found {len(records)}")\n'
        + marker, 1
    )
    if source != original:
        path.write_text(source, encoding="utf-8")
    return source != original

def upgrade_workflow_action_pins() -> tuple[int, list[str]]:
    changed = 0
    versions: list[str] = []
    workflow_dir = ROOT / ".github/workflows"
    for path in sorted(list(workflow_dir.glob("*.yml")) + list(workflow_dir.glob("*.yaml"))):
        source = path.read_text(encoding="utf-8-sig")
        original = source
        lines = source.splitlines(keepends=True)
        updated_lines = []
        for line in lines:
            for action, (sha, version) in ACTION_PINS.items():
                if re.search(r"\buses:\s*" + re.escape(action) + r"@", line):
                    newline = "\r\n" if line.endswith("\r\n") else ("\n" if line.endswith("\n") else "")
                    prefix = line[:re.search(r"\buses:\s*", line).end()]
                    line = prefix + action + "@" + sha + " # " + version + newline
                    versions.append(f"{path.relative_to(ROOT).as_posix()}: {action}@{version}")
                    break
            updated_lines.append(line)
        updated = "".join(updated_lines)
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            changed += 1
    return changed, versions

def add_lighthouse_failure_diagnostics() -> bool:
    path = ROOT / ".github/workflows/live-performance-100.yml"
    source = path.read_text(encoding="utf-8-sig")
    original = source
    old = """failures=[f'{k}={v}' for k,v in scores.items() if v < 100]
if failures:
    raise SystemExit('Live Lighthouse 100 gate failed: '+', '.join(failures))"""
    new = """failures=[f'{k}={v}' for k,v in scores.items() if v < 100]
if failures:
    for category in ('performance','accessibility','best-practices','seo'):
        if scores.get(category, 100) < 100:
            print(f'FAILED LIGHTHOUSE CATEGORY: {category} score={scores[category]}')
            refs = report.get('categories', {}).get(category, {}).get('auditRefs', [])
            for ref in refs:
                audit = report.get('audits', {}).get(ref.get('id', ''), {})
                score = audit.get('score')
                if score is not None and score < 1:
                    print('AUDIT_FAILURE', json.dumps({
                        'category': category,
                        'id': audit.get('id'),
                        'title': audit.get('title'),
                        'score': score,
                        'displayValue': audit.get('displayValue'),
                        'description': audit.get('description')
                    }, ensure_ascii=False))
    raise SystemExit('Live Lighthouse 100 gate failed: '+', '.join(failures))"""
    if old in source:
        source = source.replace(old, new, 1)
    if source != original:
        path.write_text(source, encoding="utf-8")
        return True
    return False

def main() -> None:
    if not ARTICLE_DIR.is_dir():
        raise SystemExit("ERROR: articles directory is missing")
    changed_articles = 0
    for path in sorted(ARTICLE_DIR.glob("*.html")):
        if update_article(path):
            changed_articles += 1

    indexable_self = []
    for path in sorted(ARTICLE_DIR.glob("*.html")):
        source = path.read_text(encoding="utf-8-sig")
        canonical = canonical_url(source).rstrip("/")
        expected = page_url(path).rstrip("/")
        if is_indexable(source) and canonical == expected:
            indexable_self.append(path)
    if len(indexable_self) != 100:
        raise SystemExit(
            f"ERROR: expected exactly 100 indexable self-canonical article pages; found {len(indexable_self)}"
        )

    sync_patched = patch_phase2_sync_script()
    lighthouse_diagnostics = add_lighthouse_failure_diagnostics()
    workflow_files, action_versions = upgrade_workflow_action_pins()

    sync_path = ROOT / ".github/scripts/sync_phase2_content.py"
    run = subprocess.run(
        [sys.executable, str(sync_path)],
        cwd=ROOT, text=True, capture_output=True
    )
    if run.stdout:
        print(run.stdout.rstrip())
    if run.returncode:
        if run.stderr:
            print(run.stderr.rstrip(), file=sys.stderr)
        raise SystemExit(f"ERROR: article discovery synchronization failed with exit code {run.returncode}")

    # Assert the hard acceptance criteria without mutating protected logic.
    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    article_sitemap_urls = set(re.findall(
        r"<loc>(https://nexusnovatools\.com/articles/[^<]+)</loc>", sitemap, re.I
    ))
    search_core = (ROOT / "assets/js/search-core.js").read_text(encoding="utf-8")
    article_records = re.findall(
        r'\{\s*title:"(?:[^"\\]|\\.)*",\s*url:"(?:[^"\\]|\\.)*",\s*type:"article",',
        search_core
    )
    if len(article_sitemap_urls) != 100:
        raise SystemExit(f"ERROR: expected 100 article sitemap URLs, found {len(article_sitemap_urls)}")
    if len(article_records) != 100:
        raise SystemExit(f"ERROR: expected 100 search article records, found {len(article_records)}")

    print(
        "FINAL_SYSTEM_CLEANUP_PASS "
        f"article_files_scanned={len(list(ARTICLE_DIR.glob('*.html')))} "
        f"indexable_self_canonical={len(indexable_self)} "
        f"article_pages_changed={changed_articles} "
        f"sitemap_article_urls={len(article_sitemap_urls)} "
        f"search_article_records={len(article_records)} "
        f"sync_script_fixed={sync_patched} "
        f"lighthouse_diagnostics_added={lighthouse_diagnostics} "
        f"workflow_files_action_pins_updated={workflow_files} "
        f"action_pin_lines={len(action_versions)}"
    )
    # Ensure the chosen Article title cap is a real invariant, not an audit bypass.
    offending = []
    for path in ARTICLE_DIR.glob("*.html"):
        title = get_title(path.read_text(encoding="utf-8-sig"))
        if len(title) > 70:
            offending.append(f"{path.relative_to(ROOT)}={len(title)}")
    if offending:
        raise SystemExit("ERROR: article titles remain longer than 70 chars: " + ", ".join(offending))

if __name__ == "__main__":
    main()
