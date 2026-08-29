from __future__ import annotations

import html
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from ai_provider import ai_json, status as ai_status

ROOT = Path(__file__).resolve().parents[2]
OUT_JSON = ROOT / "tool-factory-output.json"
PR_BODY = ROOT / "tool-factory-pr-body.md"

ALLOWED_TYPES = {"number", "text", "date", "time"}
BANNED_JS = (
    "fetch(", "xmlhttprequest", "websocket", "eval(", "new function", "function(",
    "document.", "window.", "localstorage", "sessionstorage", "cookie", "navigator.",
    "location.", "import(", "require(", "process.", "globalthis", "__proto__", "constructor",
)
HIGH_RISK = (
    "medical diagnosis", "drug dose", "dosage", "tax filing", "legal advice", "gambling",
    "betting", "trading signal", "investment advice", "weapon", "explosive",
)


def slugify(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return value[:70]


def word_count(text: str) -> int:
    return len(re.findall(r"\b[\w'-]+\b", text))


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def validate_spec(spec: dict) -> dict:
    if not isinstance(spec, dict):
        raise ValueError("AI did not return a JSON object.")
    if spec.get("publishable") is not True:
        raise ValueError("Tool idea was rejected by the safety/quality gate: " + str(spec.get("reason") or "not publishable"))

    name = str(spec.get("name") or "").strip()
    slug = slugify(str(spec.get("slug") or name))
    description = " ".join(str(spec.get("description") or "").split())
    kicker = " ".join(str(spec.get("kicker") or "BROWSER TOOL").split())[:40]
    intro = " ".join(str(spec.get("intro") or "").split())
    button_label = " ".join(str(spec.get("button_label") or "Calculate").split())[:40]
    compute_js = str(spec.get("compute_js") or "").strip()
    paragraphs = spec.get("explanation_paragraphs") or []
    heading = " ".join(str(spec.get("explanation_heading") or "How this tool works").split())
    accuracy_note = " ".join(str(spec.get("accuracy_note") or "Check unusual or high-stakes results independently.").split())

    if not name or "\n" in name or len(name) > 80:
        raise ValueError("Invalid tool name.")
    if not slug or len(slug) < 3:
        raise ValueError("Invalid slug.")
    if not 70 <= len(description) <= 160:
        raise ValueError("Meta description must be 70-160 characters.")
    if not intro or len(intro) > 220:
        raise ValueError("Intro must be a short sentence.")
    if not compute_js.startswith("function calculate(values)"):
        raise ValueError("compute_js must define function calculate(values).")
    lower_js = compute_js.lower().replace(" ", "")
    for token in BANNED_JS:
        if token.replace(" ", "") in lower_js:
            raise ValueError(f"Unsafe JavaScript token rejected: {token}")
    if re.search(r"\bwhile\s*\(", compute_js, flags=re.I) or "for(;;" in lower_js:
        raise ValueError("Unbounded loops are not allowed.")
    if len(compute_js) > 5000:
        raise ValueError("Calculation code is too large.")

    fields = spec.get("fields") or []
    if not isinstance(fields, list) or not 1 <= len(fields) <= 6:
        raise ValueError("Tool must have 1-6 input fields.")
    clean_fields = []
    seen = set()
    for raw in fields:
        if not isinstance(raw, dict):
            raise ValueError("Invalid field definition.")
        field_id = slugify(str(raw.get("id") or "")).replace("-", "_")
        label = " ".join(str(raw.get("label") or "").split())
        ftype = str(raw.get("type") or "").strip().lower()
        if not re.fullmatch(r"[a-z][a-z0-9_]{0,24}", field_id):
            raise ValueError("Invalid field id.")
        if field_id in seen:
            raise ValueError("Duplicate field id.")
        if ftype not in ALLOWED_TYPES:
            raise ValueError(f"Unsupported field type: {ftype}")
        if not label or len(label) > 80:
            raise ValueError("Invalid field label.")
        seen.add(field_id)
        item = {"id": field_id, "label": label, "type": ftype}
        for key in ("placeholder", "min", "max", "step", "default"):
            if raw.get(key) is not None:
                item[key] = raw.get(key)
        clean_fields.append(item)

    if not isinstance(paragraphs, list) or len(paragraphs) < 3:
        raise ValueError("At least three explanation paragraphs are required.")
    paragraphs = [" ".join(str(p).split()) for p in paragraphs if str(p).strip()]
    if word_count(" ".join(paragraphs)) < 180:
        raise ValueError("Explanatory content is too thin; need at least 180 words.")

    tests = spec.get("tests") or []
    if not isinstance(tests, list) or len(tests) < 3:
        raise ValueError("At least three deterministic tests are required.")
    clean_tests = []
    for test in tests[:8]:
        if not isinstance(test, dict) or not isinstance(test.get("values"), dict):
            raise ValueError("Invalid test case.")
        expected = str(test.get("expected_contains") or "")
        if not expected or len(expected) > 120:
            raise ValueError("Test expected_contains is invalid.")
        clean_tests.append({"values": test["values"], "expected_contains": expected})

    return {
        "name": name,
        "slug": slug,
        "description": description,
        "kicker": kicker,
        "intro": intro,
        "fields": clean_fields,
        "button_label": button_label,
        "compute_js": compute_js,
        "tests": clean_tests,
        "explanation_heading": heading,
        "explanation_paragraphs": paragraphs,
        "accuracy_note": accuracy_note,
    }


def render_field(field: dict) -> str:
    attrs = [f'id="{esc(field["id"])}"', f'type="{esc(field["type"])}"', 'data-factory-field']
    for key in ("placeholder", "min", "max", "step"):
        if field.get(key) is not None:
            attrs.append(f'{key}="{esc(field[key])}"')
    if field.get("default") is not None:
        attrs.append(f'value="{esc(field["default"])}"')
    return (
        '<div class="field">'
        f'<label for="{esc(field["id"])}">{esc(field["label"])}</label>'
        f'<input {" ".join(attrs)}>'
        '</div>'
    )


def render_page(spec: dict) -> str:
    name = esc(spec["name"])
    slug = esc(spec["slug"])
    description = esc(spec["description"])
    intro = esc(spec["intro"])
    kicker = esc(spec["kicker"])
    fields_html = "".join(render_field(f) for f in spec["fields"])
    paragraphs = "".join(f"<p>{esc(p)}</p>" for p in spec["explanation_paragraphs"])
    compute_js = spec["compute_js"].replace("</script>", "<\\/script>")
    schema = json.dumps({
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "WebApplication", "name": spec["name"], "url": f"https://nexusnovatools.com/{spec['slug']}.html", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Any", "isAccessibleForFree": True, "description": spec["description"]},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://nexusnovatools.com/"},
                {"@type": "ListItem", "position": 2, "name": "Daily Tools", "item": "https://nexusnovatools.com/daily-tools-directory.html"},
                {"@type": "ListItem", "position": 3, "name": spec["name"], "item": f"https://nexusnovatools.com/{spec['slug']}.html"},
            ]},
        ],
    }, ensure_ascii=False, separators=(",", ":"))
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{name} | NexusNova Tools</title><meta name="description" content="{description}"><meta name="robots" content="index,follow,max-image-preview:large"><meta name="theme-color" content="#f5f7fb"><link rel="canonical" href="https://nexusnovatools.com/{slug}.html"><link rel="icon" href="assets/favicon.svg" type="image/svg+xml"><meta property="og:type" content="website"><meta property="og:site_name" content="NexusNova Tools"><meta property="og:title" content="{name} — NexusNova Tools"><meta property="og:description" content="{description}"><meta property="og:url" content="https://nexusnovatools.com/{slug}.html"><meta name="twitter:card" content="summary"><link rel="stylesheet" href="assets/css/site.css"><script type="application/ld+json">{schema}</script></head>
<body><header class="site-header" data-header><div class="container nav-wrap"><a class="brand" href="index.html" aria-label="NexusNova Tools home"><span class="brand-mark">N</span><span class="brand-copy"><strong>NEXUSNOVA TOOLS</strong><small>FAST EVERYDAY UTILITIES</small></span></a><button class="menu-btn" type="button" data-menu-btn aria-expanded="false" aria-label="Open navigation">☰</button><nav class="nav" data-nav aria-label="Primary navigation"></nav></div></header>
<main><section class="page-hero"><div class="container"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span>›</span><a href="daily-tools-directory.html">Daily Tools</a><span>›</span><span aria-current="page">{name}</span></nav><span class="kicker">{kicker}</span><h1>{name}</h1><p>{intro}</p></div></section>
<section class="section"><div class="container"><div class="tool-card"><h2>{name}</h2><div class="form-row">{fields_html}</div><button class="btn btn-primary" id="factory-run">{esc(spec["button_label"])}</button><div class="result" id="factory-result" aria-live="polite">Enter values and run the tool.</div><ul id="factory-details"></ul></div></div></section>
<section class="section"><div class="container article"><h2>{esc(spec["explanation_heading"])}</h2>{paragraphs}<h2>Accuracy and privacy</h2><p>{esc(spec["accuracy_note"])}</p><p>This tool runs in your browser. It does not need to send the values you enter to a calculation server.</p></div></section>
<section class="section"><div class="container"><div class="section-head"><div><span class="kicker">RELATED TOOLS</span><h2>Keep going.</h2></div><p>Browse more free NexusNova utilities and practical guides.</p></div><div class="article-grid"><a class="article-card" href="daily-tools-directory.html"><span class="tag">TOOLS</span><h3>Daily Tools</h3><p>Browse useful browser-based calculators and utilities.</p><span class="card-link">Browse →</span></a><a class="article-card" href="trending-tools.html"><span class="tag">TRENDING</span><h3>Trending Tools</h3><p>See recently useful tools and utilities.</p><span class="card-link">Explore →</span></a><a class="article-card" href="articles.html"><span class="tag">GUIDES</span><h3>Practical Articles</h3><p>Read clear guides for common digital tasks.</p><span class="card-link">Read →</span></a></div></div></section></main>
<footer class="site-footer"><div class="container footer-console"><div><a class="brand" href="index.html"><span class="brand-mark">N</span><span class="brand-copy"><strong>NEXUSNOVA TOOLS</strong><small>FAST EVERYDAY UTILITIES</small></span></a><p class="footer-copy">Free browser tools, practical articles and clear technology explainers.</p></div><div><div class="footer-title">Explore</div><div class="footer-links"><a href="daily-tools-directory.html">Daily Tools</a><a href="trending-tools.html">Trending Tools</a><a href="gaming.html">Gaming</a><a href="articles.html">Articles</a><a href="tech.html">Tech &amp; Security</a></div></div><div><div class="footer-title">Trust</div><div class="footer-links"><a href="about.html">About</a><a href="editorial-policy.html">Editorial Policy</a><a href="privacy.html">Privacy</a></div></div></div><div class="container footer-bottom"><span>© <span data-year></span> NexusNova Tools.</span><span class="footer-online"><i></i> NEXUSNOVATOOLS.COM</span></div></footer>
<script>{compute_js}
document.getElementById('factory-run').addEventListener('click',()=>{{const values={{}};document.querySelectorAll('[data-factory-field]').forEach(el=>{{values[el.id]=el.type==='number'?(el.value===''?null:Number(el.value)):el.value;}});const out=document.getElementById('factory-result');const details=document.getElementById('factory-details');details.replaceChildren();try{{const result=calculate(values);if(!result||typeof result.text!=='string')throw new Error('Invalid result');out.textContent=result.text;(Array.isArray(result.details)?result.details:[]).slice(0,8).forEach(item=>{{const li=document.createElement('li');li.textContent=String(item);details.appendChild(li);}});}}catch(error){{out.textContent='Please check the values and try again.';}}}});</script><script src="assets/js/main.js" defer></script></body></html>
'''


def run_tests(spec: dict) -> None:
    payload = json.dumps(spec["tests"], ensure_ascii=False)
    test_js = spec["compute_js"] + f'''\nconst tests = {payload};\nfor (const [index, test] of tests.entries()) {{\n  const result = calculate(test.values);\n  if (!result || typeof result.text !== 'string') throw new Error(`test ${{index + 1}} returned invalid shape`);\n  const hay = JSON.stringify(result);\n  if (!hay.includes(test.expected_contains)) throw new Error(`test ${{index + 1}} expected: ${{test.expected_contains}}; got: ${{hay}}`);\n}}\nconsole.log(`Tool Factory tests passed: ${{tests.length}}`);\n'''
    with tempfile.TemporaryDirectory() as td:
        path = Path(td) / "test.js"
        path.write_text(test_js, encoding="utf-8")
        proc = subprocess.run(["node", str(path)], capture_output=True, text=True, timeout=10)
        if proc.returncode != 0:
            raise ValueError("Generated calculator failed deterministic tests: " + (proc.stderr or proc.stdout)[-700:])
        print(proc.stdout.strip())


def prompt_for(idea: str) -> str:
    return f'''You are the safe tool-spec generator for NexusNova Tools.
Create ONE original, useful, browser-only utility from this owner idea:\n\nOWNER IDEA:\n{idea}\n\nReturn one JSON object only.

STRICT SAFETY:
- Set publishable=false for medical diagnosis/dosage, legal/tax filing advice, gambling/betting, investment/trading recommendations, weapons, illegal activity, adult content, or anything high-risk.
- Reject ideas needing login, paid APIs, server uploads, external network calls, scraping, or personal data storage.
- The tool must work fully client-side with normal browser JavaScript.
- No claims that results are professional advice.

JSON KEYS:
publishable: boolean
reason: short string
name: concise tool name
slug: lowercase-hyphen slug
description: 70-160 character SEO description
kicker: short uppercase label
intro: one clear sentence
fields: array of 1-6 objects with id, label, type (number,text,date,time), and optional placeholder,min,max,step,default
button_label: concise action text
compute_js: JavaScript defining exactly `function calculate(values){{...}}`; pure calculation only, no DOM/network/storage/eval/imports. Return `{{text:"...", details:["..."]}}`.
tests: at least 3 deterministic cases, each `{{"values":{{...}},"expected_contains":"exact substring expected in JSON result"}}`
explanation_heading: informative heading
explanation_paragraphs: 3-5 useful original paragraphs totaling 220-360 words
accuracy_note: one concise limitation/accuracy note

QUALITY:
- Prefer practical evergreen utilities.
- Handle empty/invalid values safely.
- Use mathematically correct formulas.
- Round only for display, not intermediate calculations when avoidable.
- Keep compute_js under 5000 characters.
'''


def self_test() -> None:
    spec = validate_spec({
        "publishable": True,
        "name": "Demo Percentage Tool",
        "slug": "demo-percentage-tool",
        "description": "A deterministic internal demo used to verify the NexusNova safe tool factory template and validation pipeline.",
        "kicker": "FACTORY TEST",
        "intro": "Verify that the safe browser-tool template can render and execute calculations.",
        "fields": [{"id": "a", "label": "Value", "type": "number"}, {"id": "b", "label": "Percent", "type": "number"}],
        "button_label": "Calculate",
        "compute_js": "function calculate(values){const a=Number(values.a),b=Number(values.b);if(!Number.isFinite(a)||!Number.isFinite(b))return {text:'Enter valid numbers.',details:[]};const x=a*b/100;return {text:`Result: ${x}`,details:[`${b}% of ${a}`]};}",
        "tests": [{"values": {"a": 100, "b": 10}, "expected_contains": "Result: 10"}, {"values": {"a": 50, "b": 20}, "expected_contains": "Result: 10"}, {"values": {"a": 0, "b": 50}, "expected_contains": "Result: 0"}],
        "explanation_heading": "Factory self-test",
        "explanation_paragraphs": [
            "This internal self-test checks the fixed NexusNova page template without publishing a real tool. It verifies that labels, number fields, the action button, result area and supporting content can be assembled from a validated specification. The goal is to catch template regressions before an owner-requested tool is ever proposed for the live website. The test is intentionally isolated from normal site content and does not write a public page.",
            "The demo calculation deliberately uses a simple percentage formula because the expected outcomes are easy to verify independently. A generated tool must include deterministic test cases and the workflow executes those tests with Node.js. If the calculation throws an error, returns the wrong shape or does not contain the expected result text, the factory stops before creating a branch or pull request. This prevents obvious runtime failures from reaching review.",
            "The factory also restricts generated JavaScript to pure calculation logic. Network access, browser storage, page manipulation from generated code, dynamic evaluation and unbounded loops are rejected. The surrounding user interface is controlled by the fixed repository template instead of AI-generated page plumbing. This reduces the chance that a generated draft can interfere with navigation, analytics or unrelated website features while still allowing useful client-side calculators and converters.",
        ],
        "accuracy_note": "This is an internal validation page and is never written to the repository.",
    })
    run_tests(spec)
    page = render_page(spec)
    if "<title>Demo Percentage Tool | NexusNova Tools</title>" not in page:
        raise SystemExit("Template render self-test failed.")
    print("NexusNova Safe Tool Factory self-test PASS")


def main() -> None:
    if "--self-test" in sys.argv:
        self_test()
        return

    idea = " ".join(os.getenv("TOOL_IDEA", "").split())
    if not idea:
        raise SystemExit("TOOL_IDEA is required.")
    if len(idea) > 500:
        raise SystemExit("TOOL_IDEA is too long.")
    if any(term in idea.lower() for term in HIGH_RISK):
        raise SystemExit("This idea is outside the safe automated tool-factory scope.")

    raw = ai_json(prompt_for(idea))
    if raw is None:
        raise SystemExit("AI provider unavailable; no draft was created.")
    spec = validate_spec(raw)
    output_path = ROOT / f"{spec['slug']}.html"
    if output_path.exists():
        raise SystemExit(f"Refusing to overwrite existing page: {output_path.name}")

    run_tests(spec)
    output_path.write_text(render_page(spec), encoding="utf-8")
    result = {"ok": True, "idea": idea, "name": spec["name"], "slug": spec["slug"], "file": output_path.name, "tests": len(spec["tests"]), "ai": ai_status(), "auto_merge": False}
    OUT_JSON.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    PR_BODY.write_text(f'''## NexusNova Safe Tool Factory\n\n**Owner idea:** {idea}\n\n**Generated draft:** `{output_path.name}`  \n**Tool:** {spec['name']}  \n**Deterministic tests:** {len(spec['tests'])} passed locally before PR creation.\n\n### Safety boundaries\n- Browser-only utility; no network/storage/login code generated.\n- Fixed NexusNova page shell; AI supplies only validated fields, copy and pure calculation logic.\n- Generated calculation code passed deterministic Node.js tests.\n- Full repository site-quality audit is run before the PR is opened.\n- **No auto-merge.** The owner must review the PR and merge it manually.\n\nIf a check fails, do not merge the PR.\n''', encoding="utf-8")
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
