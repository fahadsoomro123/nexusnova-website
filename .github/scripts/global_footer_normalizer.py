from __future__ import annotations

import html as html_lib
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(".")
REMOVE_LABELS = {
    "all tools",
    "content",
    "tools directory",
    "categories",
    "articles",
    "guides",
    "humanproof",
}
TRUST_PATHS = {
    "/terms.html",
    "/refund-policy.html",
    "/about.html",
    "/editorial-team.html",
    "/editorial-policy.html",
    "/tool-methodology.html",
    "/faq.html",
    "/privacy.html",
    "/contact.html",
    "/disclaimer.html",
}
TRUST_ITEMS = [
    ("Terms", "/terms.html"),
    ("Refund Policy", "/refund-policy.html"),
    ("About", "/about.html"),
    ("Editorial Team", "/editorial-team.html"),
    ("Editorial Policy", "/editorial-policy.html"),
    ("Tool Methodology", "/tool-methodology.html"),
    ("FAQ", "/faq.html"),
    ("Privacy", "/privacy.html"),
    ("Contact Us & Support", "/contact.html"),
    ("Disclaimer", "/disclaimer.html"),
]

ANCHOR_RE = re.compile(r"<a\b[^>]*>.*?</a\s*>", re.I | re.S)
HREF_RE = re.compile(r"\bhref\s*=\s*(['\"])(.*?)\1", re.I | re.S)
TRUST_TITLE_RE = re.compile(
    r"<(?:span|div)\b[^>]*class=['\"][^'\"]*(?:nn-footer-title|footer-title)[^'\"]*['\"][^>]*>\s*Trust\s*</(?:span|div)>",
    re.I | re.S,
)
DIV_TAG_RE = re.compile(r"</?div\b[^>]*>", re.I)

def visible_text(fragment: str) -> str:
    text = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"\s+", " ", html_lib.unescape(text)).strip().lower()

def normalized_href(href: str) -> str:
    value = html_lib.unescape(href.strip())
    parsed = urlparse(value)
    path = parsed.path or value
    if not path.startswith("/"):
        path = "/" + path
    path = re.sub(r"/+", "/", path)
    return path.rstrip("/").lower() or "/"

def find_trust_parent(footer: str):
    title = TRUST_TITLE_RE.search(footer)
    if not title:
        return None
    title_start, title_end = title.span()
    stack = []
    intervals = []
    for match in DIV_TAG_RE.finditer(footer):
        token = match.group(0)
        if token.lower().startswith("</"):
            if stack:
                start, _ = stack.pop()
                intervals.append((start, match.end()))
        elif not token.rstrip().endswith("/>"):
            stack.append((match.start(), match.end()))
    containing = [
        interval for interval in intervals
        if interval[0] < title_start and interval[1] >= title_end
    ]
    if not containing:
        return None
    return min(containing, key=lambda pair: pair[1] - pair[0])

def trust_markup() -> str:
    parts = [
        '<div class="nn-footer-trust">',
        '<span class="nn-footer-trust-title">Trust</span>',
        '<div class="nn-footer-trust-links">',
        '<span class="nn-footer-trust-pair">',
        '<a href="/terms.html">Terms</a>',
        '<span aria-hidden="true"> &amp; </span>',
        '<a href="/refund-policy.html">Refund Policy</a>',
        '</span>',
    ]
    parts.extend(f'<a href="{href}">{label}</a>' for label, href in TRUST_ITEMS[2:])
    parts.extend(['</div>', '</div>'])
    return "".join(parts)

def remove_unwanted_and_trust_anchors(footer: str) -> str:
    def replace_anchor(match):
        anchor = match.group(0)
        href_match = HREF_RE.search(anchor)
        href = normalized_href(href_match.group(2)) if href_match else ""
        label = visible_text(anchor)
        if label in REMOVE_LABELS or href in TRUST_PATHS:
            return ""
        return anchor
    return ANCHOR_RE.sub(replace_anchor, footer)

def insert_trust(footer: str) -> str:
    trust = trust_markup()
    nav_close = re.search(r"</nav\s*>", footer, re.I)
    if nav_close:
        pos = nav_close.start()
        return footer[:pos] + trust + "\n" + footer[pos:]
    bottom = re.search(
        r"<(?:div|section)\b[^>]*class=['\"][^'\"]*(?:nn-footer-bottom|footer-bottom)[^'\"]*['\"][^>]*>",
        footer,
        re.I,
    )
    if bottom:
        pos = bottom.start()
        return footer[:pos] + trust + "\n" + footer[pos:]
    close = footer.lower().rfind("</footer>")
    return footer[:close] + trust + "\n" + footer[close:]

def normalize_footer(footer: str) -> str:
    parent = find_trust_parent(footer)
    if parent:
        start, end = parent
        footer = footer[:start] + "__NN_TRUST_SLOT__" + footer[end:]
    footer = remove_unwanted_and_trust_anchors(footer)
    if "__NN_TRUST_SLOT__" in footer:
        footer = footer.replace("__NN_TRUST_SLOT__", trust_markup(), 1)
    elif not re.search(r'class=["\']nn-footer-trust["\']', footer, re.I):
        footer = insert_trust(footer)
    for _ in range(8):
        cleaned = re.sub(r"<(?:ul|div)\b[^>]*>\s*</(?:ul|div)>", "", footer, flags=re.I | re.S)
        if cleaned == footer:
            break
        footer = cleaned
    return footer

def html_files():
    return sorted(
        p for p in ROOT.rglob("*.html")
        if ".git" not in p.parts and not any(part.startswith("node_modules") for part in p.parts)
    )

def validate_footer(content: str):
    match = re.search(r"<footer\b[\s\S]*?</footer>", content, re.I)
    if not match:
        return "NO_FOOTER"
    footer = match.group(0)
    anchors = {
        normalized_href(HREF_RE.search(a).group(2))
        for a in ANCHOR_RE.findall(footer)
        if HREF_RE.search(a)
    }
    missing = sorted(TRUST_PATHS - anchors)
    if missing:
        return "MISSING_TRUST:" + ",".join(missing)
    found_labels = {visible_text(a) for a in ANCHOR_RE.findall(footer)}
    bad = sorted(found_labels & REMOVE_LABELS)
    if bad:
        return "FORBIDDEN_LABELS:" + ",".join(bad)
    return None

def main():
    files = html_files()
    changed = []
    failures = []

    for path in files:
        original = path.read_text(encoding="utf-8")
        footer_match = re.search(r"<footer\b[\s\S]*?</footer>", original, re.I)
        if not footer_match:
            failures.append(f"{path}: NO_FOOTER")
            continue
        old_footer = footer_match.group(0)
        new_footer = normalize_footer(old_footer)
        if new_footer != old_footer:
            updated = original[:footer_match.start()] + new_footer + original[footer_match.end():]
            path.write_text(updated, encoding="utf-8")
            changed.append(str(path).replace("\\", "/"))

        problem = validate_footer(path.read_text(encoding="utf-8"))
        if problem:
            failures.append(f"{path}: {problem}")

    out = ROOT / "quality-artifacts"
    out.mkdir(exist_ok=True)
    report = [
        f"HTML files inspected: {len(files)}",
        f"HTML files changed: {len(changed)}",
        f"Validation failures: {len(failures)}",
        "",
        "Changed files:",
        *changed,
        "",
        "Failures:",
        *failures,
    ]
    (out / "global-footer-normalizer-report.txt").write_text("\n".join(report) + "\n", encoding="utf-8")
    if failures:
        raise SystemExit("\n".join(failures))
    print("\n".join(report))

if __name__ == "__main__":
    main()
