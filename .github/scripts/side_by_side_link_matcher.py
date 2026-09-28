#!/usr/bin/env python3
"""
NexusNova side-by-side production-link matcher.

Reads local index.html and tools.html, scans every anchor href, normalizes
internal routes, and compares them against a static snapshot of production
routes.

Safety:
- READ-ONLY
- NO NETWORK
- NO FILE WRITES
- NO Git mutations

Exit codes:
    0 = all local internal links match the production database.
    1 = mismatch/read/parse error detected.
    2 = repository root could not be resolved.
"""

from __future__ import annotations

import argparse
import posixpath
import sys
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


TARGET_FILES = (
    "index.html",
    "tools.html",
)

# Static snapshot of production URLs from the production/main site's
# index.html and tools.html link inventory.
PRODUCTION_URLS = {
    "index.html": "https://nexusnovatools.com/index.html",
    "about.html": "https://nexusnovatools.com/about.html",
    "contact.html": "https://nexusnovatools.com/contact.html",
    "editorial-policy.html": "https://nexusnovatools.com/editorial-policy.html",
    "privacy.html": "https://nexusnovatools.com/privacy.html",
    "refund-policy.html": "https://nexusnovatools.com/refund-policy.html",
    "terms.html": "https://nexusnovatools.com/terms.html",
    "tool-methodology.html": "https://nexusnovatools.com/tool-methodology.html",
    "age-calculator.html": "https://nexusnovatools.com/age-calculator.html",
    "ai-prompt-builder.html": "https://nexusnovatools.com/ai-prompt-builder.html",
    "ai-token-calculator.html": "https://nexusnovatools.com/ai-token-calculator.html",
    "ai-vram-calculator.html": "https://nexusnovatools.com/ai-vram-calculator.html",
    "app.html": "https://nexusnovatools.com/app.html",
    "aqi-live.html": "https://nexusnovatools.com/aqi-live.html",
    "articles.html": "https://nexusnovatools.com/articles.html",
    "avif-to-jpg.html": "https://nexusnovatools.com/avif-to-jpg.html",
    "bill-split-tip-calculator.html": "https://nexusnovatools.com/bill-split-tip-calculator.html",
    "bmi-calculator.html": "https://nexusnovatools.com/bmi-calculator.html",
    "calculator-tools.html": "https://nexusnovatools.com/calculator-tools.html",
    "calculator.html": "https://nexusnovatools.com/calculator.html",
    "categories.html": "https://nexusnovatools.com/categories.html",
    "contrast-checker.html": "https://nexusnovatools.com/contrast-checker.html",
    "crypto-live.html": "https://nexusnovatools.com/crypto-live.html",
    "csv-json-converter.html": "https://nexusnovatools.com/csv-json-converter.html",
    "currency-rates.html": "https://nexusnovatools.com/currency-rates.html",
    "date-difference-calculator.html": "https://nexusnovatools.com/date-difference-calculator.html",
    "decision-matrix-calculator.html": "https://nexusnovatools.com/decision-matrix-calculator.html",
    "discount-calculator.html": "https://nexusnovatools.com/discount-calculator.html",
    "dns-lookup.html": "https://nexusnovatools.com/dns-lookup.html",
    "earthquakes-live.html": "https://nexusnovatools.com/earthquakes-live.html",
    "edpi-calculator.html": "https://nexusnovatools.com/edpi-calculator.html",
    "electricity-bill-calculator-pakistan.html": "https://nexusnovatools.com/electricity-bill-calculator-pakistan.html",
    "emi-calculator.html": "https://nexusnovatools.com/emi-calculator.html",
    "fbr-atl-status-checker.html": "https://nexusnovatools.com/fbr-atl-status-checker.html",
    "fbr-tax-calculator-pakistan.html": "https://nexusnovatools.com/fbr-tax-calculator-pakistan.html",
    "fps-frame-time-calculator.html": "https://nexusnovatools.com/fps-frame-time-calculator.html",
    "fuel-rates.html": "https://nexusnovatools.com/fuel-rates.html",
    "gamer-name-generator.html": "https://nexusnovatools.com/gamer-name-generator.html",
    "gaming-sensitivity-converter.html": "https://nexusnovatools.com/gaming-sensitivity-converter.html",
    "gold-rates.html": "https://nexusnovatools.com/gold-rates.html",
    "guides.html": "https://nexusnovatools.com/guides.html",
    "heic-to-jpg.html": "https://nexusnovatools.com/heic-to-jpg.html",
    "humanproof.html": "https://nexusnovatools.com/humanproof.html",
    "image-compressor.html": "https://nexusnovatools.com/image-compressor.html",
    "image-metadata-remover.html": "https://nexusnovatools.com/image-metadata-remover.html",
    "image-resizer.html": "https://nexusnovatools.com/image-resizer.html",
    "image-to-text-ocr.html": "https://nexusnovatools.com/image-to-text-ocr.html",
    "image-tools.html": "https://nexusnovatools.com/image-tools.html",
    "invoice-maker.html": "https://nexusnovatools.com/invoice-maker.html",
    "ip-cidr-calculator.html": "https://nexusnovatools.com/ip-cidr-calculator.html",
    "jpg-to-pdf.html": "https://nexusnovatools.com/jpg-to-pdf.html",
    "jpg-to-png.html": "https://nexusnovatools.com/jpg-to-png.html",
    "labs.html": "https://nexusnovatools.com/labs.html",
    "live-alerts.html": "https://nexusnovatools.com/live-alerts.html",
    "live.html": "https://nexusnovatools.com/live.html",
    "magic-drop.html": "https://nexusnovatools.com/magic-drop.html",
    "merge-pdf.html": "https://nexusnovatools.com/merge-pdf.html",
    "meta-tag-generator.html": "https://nexusnovatools.com/meta-tag-generator.html",
    "minecraft-coordinate-converter.html": "https://nexusnovatools.com/minecraft-coordinate-converter.html",
    "number-to-words.html": "https://nexusnovatools.com/number-to-words.html",
    "online-timer.html": "https://nexusnovatools.com/online-timer.html",
    "pakistan-jobs-finder.html": "https://nexusnovatools.com/pakistan-jobs-finder.html",
    "pakistan-public-holidays-2026.html": "https://nexusnovatools.com/pakistan-public-holidays-2026.html",
    "pakistan-tools.html": "https://nexusnovatools.com/pakistan-tools.html",
    "paper-size-converter.html": "https://nexusnovatools.com/paper-size-converter.html",
    "paper-size-in-pixels.html": "https://nexusnovatools.com/paper-size-in-pixels.html",
    "password-generator.html": "https://nexusnovatools.com/password-generator.html",
    "password-strength-checker.html": "https://nexusnovatools.com/password-strength-checker.html",
    "pdf-tools.html": "https://nexusnovatools.com/pdf-tools.html",
    "percentage-calculator.html": "https://nexusnovatools.com/percentage-calculator.html",
    "percentage-change-calculator.html": "https://nexusnovatools.com/percentage-change-calculator.html",
    "photo-cctv-enhancer.html": "https://nexusnovatools.com/photo-cctv-enhancer.html",
    "png-to-jpg.html": "https://nexusnovatools.com/png-to-jpg.html",
    "pomodoro-timer.html": "https://nexusnovatools.com/pomodoro-timer.html",
    "prayer-times-qibla-pakistan.html": "https://nexusnovatools.com/prayer-times-qibla-pakistan.html",
    "private-quick-note.html": "https://nexusnovatools.com/private-quick-note.html",
    "productivity-tools.html": "https://nexusnovatools.com/productivity-tools.html",
    "public-ip-checker.html": "https://nexusnovatools.com/public-ip-checker.html",
    "pulse.html": "https://nexusnovatools.com/pulse.html",
    "qr-code-generator.html": "https://nexusnovatools.com/qr-code-generator.html",
    "qr-code-scanner.html": "https://nexusnovatools.com/qr-code-scanner.html",
    "random-number-generator.html": "https://nexusnovatools.com/random-number-generator.html",
    "random-picker.html": "https://nexusnovatools.com/random-picker.html",
    "reaction-time-test.html": "https://nexusnovatools.com/reaction-time-test.html",
    "resume-builder.html": "https://nexusnovatools.com/resume-builder.html",
    "rgb-hex-converter.html": "https://nexusnovatools.com/rgb-hex-converter.html",
    "roman-numeral-converter.html": "https://nexusnovatools.com/roman-numeral-converter.html",
    "salary-tax-calculator-pakistan.html": "https://nexusnovatools.com/salary-tax-calculator-pakistan.html",
    "scientific-calculator.html": "https://nexusnovatools.com/scientific-calculator.html",
    "split-pdf.html": "https://nexusnovatools.com/split-pdf.html",
    "sports-live.html": "https://nexusnovatools.com/sports-live.html",
    "ssl-certificate-checker.html": "https://nexusnovatools.com/ssl-certificate-checker.html",
    "steam-playtime-calculator.html": "https://nexusnovatools.com/steam-playtime-calculator.html",
    "stopwatch.html": "https://nexusnovatools.com/stopwatch.html",
    "storage-size-converter.html": "https://nexusnovatools.com/storage-size-converter.html",
    "tech.html": "https://nexusnovatools.com/tech.html",
    "text-case-converter.html": "https://nexusnovatools.com/text-case-converter.html",
    "text-diff-checker.html": "https://nexusnovatools.com/text-diff-checker.html",
    "text-to-pdf.html": "https://nexusnovatools.com/text-to-pdf.html",
    "time-duration-calculator.html": "https://nexusnovatools.com/time-duration-calculator.html",
    "timezone-meeting-planner.html": "https://nexusnovatools.com/timezone-meeting-planner.html",
    "tools.html": "https://nexusnovatools.com/tools.html",
    "typing-speed-test.html": "https://nexusnovatools.com/typing-speed-test.html",
    "unit-converter.html": "https://nexusnovatools.com/unit-converter.html",
    "unix-timestamp-converter.html": "https://nexusnovatools.com/unix-timestamp-converter.html",
    "weather-live.html": "https://nexusnovatools.com/weather-live.html",
    "webp-to-jpg.html": "https://nexusnovatools.com/webp-to-jpg.html",
    "webp-to-png.html": "https://nexusnovatools.com/webp-to-png.html",
    "website-reachability-checker.html": "https://nexusnovatools.com/website-reachability-checker.html",
    "whatsapp-link-generator.html": "https://nexusnovatools.com/whatsapp-link-generator.html",
    "widget-pakistan-today.html": "https://nexusnovatools.com/widget-pakistan-today.html",
    "widgets.html": "https://nexusnovatools.com/widgets.html",
    "word-counter.html": "https://nexusnovatools.com/word-counter.html",
    "xray.html": "https://nexusnovatools.com/xray.html",
    "youtube-thumbnail-downloader.html": "https://nexusnovatools.com/youtube-thumbnail-downloader.html",
    "zakat-calculator-pakistan.html": "https://nexusnovatools.com/zakat-calculator-pakistan.html",
    "articles/ai-photo-restoration-vs-enhancement.html": "https://nexusnovatools.com/articles/ai-photo-restoration-vs-enhancement.html",
    "articles/ai-search-planning-decisions-2026.html": "https://nexusnovatools.com/articles/ai-search-planning-decisions-2026.html",
    "articles/ai-token-count-context-window-guide.html": "https://nexusnovatools.com/articles/ai-token-count-context-window-guide.html",
    "articles/amd-adrenalin-26-8-1-modern-warfare-4.html": "https://nexusnovatools.com/articles/amd-adrenalin-26-8-1-modern-warfare-4.html",
    "articles/background-removal-online-guide.html": "https://nexusnovatools.com/articles/background-removal-online-guide.html",
    "articles/chrome-152-for-android-adds-desktop-security-fixes.html": "https://nexusnovatools.com/articles/chrome-152-for-android-adds-desktop-security-fixes.html",
    "articles/cloudflare-introduces-context-aware-vulnerability-remediation.html": "https://nexusnovatools.com/articles/cloudflare-introduces-context-aware-vulnerability-remediation.html",
    "articles/compress-images-for-web.html": "https://nexusnovatools.com/articles/compress-images-for-web.html",
    "articles/cs2-valorant-sensitivity-edpi-guide.html": "https://nexusnovatools.com/articles/cs2-valorant-sensitivity-edpi-guide.html",
    "articles/emi-calculator-explained.html": "https://nexusnovatools.com/articles/emi-calculator-explained.html",
    "articles/github-copilot-global-model-policy-enforces-default-states.html": "https://nexusnovatools.com/articles/github-copilot-global-model-policy-enforces-default-states.html",
    "articles/github-copilot-in-visual-studio-august-2026-update-details.html": "https://nexusnovatools.com/articles/github-copilot-in-visual-studio-august-2026-update-details.html",
    "articles/github-copilot-in-vs-code-receives-august-2026-agent-updates.html": "https://nexusnovatools.com/articles/github-copilot-in-vs-code-receives-august-2026-agent-updates.html",
    "articles/github-copilot-model-access-ties-to-billing-org-for-team-plans.html": "https://nexusnovatools.com/articles/github-copilot-model-access-ties-to-billing-org-for-team-plans.html",
    "articles/google-august-2026-spam-update-traffic-drop.html": "https://nexusnovatools.com/articles/google-august-2026-spam-update-traffic-drop.html",
    "articles/google-preferred-sources-2026.html": "https://nexusnovatools.com/articles/google-preferred-sources-2026.html",
    "articles/google-releases-chrome-152-for-android.html": "https://nexusnovatools.com/articles/google-releases-chrome-152-for-android.html",
    "articles/google-releases-chrome-152-with-327-security-fixes.html": "https://nexusnovatools.com/articles/google-releases-chrome-152-with-327-security-fixes.html",
    "articles/google-search-console-platform-properties-2026.html": "https://nexusnovatools.com/articles/google-search-console-platform-properties-2026.html",
    "articles/gpt-5-6-sol-context-window-guide.html": "https://nexusnovatools.com/articles/gpt-5-6-sol-context-window-guide.html",
    "articles/hex-vs-rgb-colors.html": "https://nexusnovatools.com/articles/hex-vs-rgb-colors.html",
    "articles/jpg-png-webp-avif-guide.html": "https://nexusnovatools.com/articles/jpg-png-webp-avif-guide.html",
    "articles/merge-pdf-privately.html": "https://nexusnovatools.com/articles/merge-pdf-privately.html",
    "articles/modern-warfare-4-beta-pc-checklist.html": "https://nexusnovatools.com/articles/modern-warfare-4-beta-pc-checklist.html",
    "articles/pomodoro-focus-workflow.html": "https://nexusnovatools.com/articles/pomodoro-focus-workflow.html",
    "articles/qr-code-best-practices.html": "https://nexusnovatools.com/articles/qr-code-best-practices.html",
    "articles/remove-exif-gps-metadata-photos.html": "https://nexusnovatools.com/articles/remove-exif-gps-metadata-photos.html",
    "articles/resume-mistakes-to-fix.html": "https://nexusnovatools.com/articles/resume-mistakes-to-fix.html",
    "articles/simple-invoice-checklist-guide.html": "https://nexusnovatools.com/articles/simple-invoice-checklist-guide.html",
    "articles/split-pdf-organize-pages.html": "https://nexusnovatools.com/articles/split-pdf-organize-pages.html",
    "articles/typing-speed-wpm-accuracy-guide.html": "https://nexusnovatools.com/articles/typing-speed-wpm-accuracy-guide.html",
    "articles/unix-timestamps-explained.html": "https://nexusnovatools.com/articles/unix-timestamps-explained.html",
    "articles/windows-11-august-2026-rgb-gaming-crashes.html": "https://nexusnovatools.com/articles/windows-11-august-2026-rgb-gaming-crashes.html",
    "articles/youtube-thumbnail-size-guide-2026.html": "https://nexusnovatools.com/articles/youtube-thumbnail-size-guide-2026.html",
    "guides/ai-prompting.html": "https://nexusnovatools.com/guides/ai-prompting.html",
    "guides/image-compression.html": "https://nexusnovatools.com/guides/image-compression.html",
    "guides/jpg-to-pdf.html": "https://nexusnovatools.com/guides/jpg-to-pdf.html",
    "guides/password-security.html": "https://nexusnovatools.com/guides/password-security.html",
    "guides/percentage-basics.html": "https://nexusnovatools.com/guides/percentage-basics.html",
    "guides/resume-writing.html": "https://nexusnovatools.com/guides/resume-writing.html",
    "guides/unit-conversion.html": "https://nexusnovatools.com/guides/unit-conversion.html",
    "guides/weighted-decision-matrix.html": "https://nexusnovatools.com/guides/weighted-decision-matrix.html",
    "tech/ai-agent-browser-security.html": "https://nexusnovatools.com/tech/ai-agent-browser-security.html",
    "tech/browser-ai-webgpu-webassembly.html": "https://nexusnovatools.com/tech/browser-ai-webgpu-webassembly.html",
    "tech/chrome-151-august-2026-security-update.html": "https://nexusnovatools.com/tech/chrome-151-august-2026-security-update.html",
    "tech/firefox-154-security-update-2026.html": "https://nexusnovatools.com/tech/firefox-154-security-update-2026.html",
    "tech/gpt-6-astra-2026.html": "https://nexusnovatools.com/tech/gpt-6-astra-2026.html",
    "tech/passkeys-2026.html": "https://nexusnovatools.com/tech/passkeys-2026.html",
    "tech/post-quantum-encryption-explained.html": "https://nexusnovatools.com/tech/post-quantum-encryption-explained.html",
    "tech/qr-code-phishing-quishing.html": "https://nexusnovatools.com/tech/qr-code-phishing-quishing.html",
    "tech/toxicpanda-android-malware-2026.html": "https://nexusnovatools.com/tech/toxicpanda-android-malware-2026.html",
    "ota/files/index.html": "https://nexusnovatools.com/ota/files/index.html",
    "register.html?mode=register": "https://nexusnovatools.com/register.html?mode=register",
}

EXTERNAL_SCHEMES = {
    "http",
    "https",
    "mailto",
    "tel",
    "data",
    "blob",
    "file",
}

DYNAMIC_SCHEMES = {
    "javascript",
    "about",
}

GENERIC_DYNAMIC_TARGETS = {
    "",
    "#",
    "javascript:void(0)",
    "javascript:void(0);",
}


@dataclass(frozen=True)
class LinkResult:
    source: str
    href: str
    normalized: str
    link_type: str
    status: str
    production_url: str = ""


class AnchorParser(HTMLParser):
    """Read anchor attributes only; never execute page JavaScript."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.hrefs: list[str] = []

    def handle_starttag(
        self,
        tag: str,
        attrs: list[tuple[str, str | None]],
    ) -> None:
        if tag.lower() != "a":
            return

        for name, value in attrs:
            if name.lower() == "href":
                self.hrefs.append("" if value is None else value)
                return


def infer_repo_root() -> Path:
    """
    Resolve the repository root safely even when __file__ is unavailable.

    Normal execution uses the script location.
    Dynamic execution falls back to Path.cwd() and walks upward for .git.
    """
    module_file = globals().get("__file__")

    if module_file:
        try:
            script_path = Path(module_file).expanduser().resolve()
            candidate = script_path.parents[2]

            if (candidate / ".git").exists():
                return candidate
        except (OSError, RuntimeError, IndexError):
            pass

    try:
        cwd = Path.cwd().resolve()
    except (OSError, RuntimeError):
        cwd = Path(".")

    for candidate in (cwd, *cwd.parents):
        if (candidate / ".git").exists():
            return candidate

    return cwd


def normalize_internal_href(
    raw_href: str,
    source_file: Path,
    repo_root: Path,
) -> str | None:
    """
    Convert a local href into the production database key.

    Relative and root-relative routes are supported. Query strings and
    fragments are preserved because they can be part of the actual route.
    """
    value = unquote(raw_href.strip())

    if value in GENERIC_DYNAMIC_TARGETS:
        return None

    parsed = urlsplit(value)
    scheme = parsed.scheme.lower()

    if value.startswith("//"):
        return None

    if scheme in EXTERNAL_SCHEMES or scheme in DYNAMIC_SCHEMES:
        return None

    if scheme:
        return None

    if value.startswith("#") or value.startswith("?"):
        return None

    target_path = parsed.path

    if not target_path:
        target_path = source_file.name

    source_relative = source_file.relative_to(repo_root).as_posix()
    source_directory = posixpath.dirname(source_relative)

    if target_path.startswith("/"):
        route = posixpath.normpath(target_path.lstrip("/"))
    else:
        route = posixpath.normpath(
            posixpath.join(source_directory, target_path)
        )

    if route in {"", "."}:
        route = "index.html"

    if route.startswith("../") or route == "..":
        return None

    if parsed.query:
        route = f"{route}?{parsed.query}"

    if parsed.fragment:
        route = f"{route}#{parsed.fragment}"

    return route


def classify_href(
    raw_href: str,
    source_file: Path,
    repo_root: Path,
) -> LinkResult:
    value = raw_href.strip()

    if value in GENERIC_DYNAMIC_TARGETS:
        return LinkResult(
            source=source_file.name,
            href=raw_href,
            normalized="",
            link_type="DYNAMIC",
            status="SKIP",
        )

    parsed = urlsplit(value)
    scheme = parsed.scheme.lower()

    if value.startswith("//") or scheme in EXTERNAL_SCHEMES:
        return LinkResult(
            source=source_file.name,
            href=raw_href,
            normalized="",
            link_type="EXTERNAL",
            status="SKIP",
        )

    if value.startswith("#") or value.startswith("?"):
        return LinkResult(
            source=source_file.name,
            href=raw_href,
            normalized="",
            link_type="SAME-PAGE",
            status="SKIP",
        )

    if scheme in DYNAMIC_SCHEMES or scheme:
        return LinkResult(
            source=source_file.name,
            href=raw_href,
            normalized="",
            link_type="UNSUPPORTED",
            status="FAIL",
        )

    normalized = normalize_internal_href(
        value,
        source_file,
        repo_root,
    )

    if normalized is None:
        return LinkResult(
            source=source_file.name,
            href=raw_href,
            normalized="",
            link_type="SKIP",
            status="SKIP",
        )

    production_url = PRODUCTION_URLS.get(normalized)

    return LinkResult(
        source=source_file.name,
        href=raw_href,
        normalized=normalized,
        link_type="INTERNAL",
        status="MATCH" if production_url else "MISMATCH",
        production_url=production_url or "",
    )


def scan_file(
    repo_root: Path,
    relative_path: str,
) -> tuple[list[LinkResult], str | None]:
    source_file = repo_root / relative_path

    if not source_file.is_file():
        return [], f"Missing target file: {relative_path}"

    try:
        source = source_file.read_text(encoding="utf-8")
    except UnicodeDecodeError as error:
        return [], f"UTF-8 read failure: {relative_path}: {error}"
    except OSError as error:
        return [], f"Read failure: {relative_path}: {error}"

    parser = AnchorParser()

    try:
        parser.feed(source)
        parser.close()
    except Exception as error:
        return [], f"HTML parse failure: {relative_path}: {error}"

    results: list[LinkResult] = []

    for href in parser.hrefs:
        result = classify_href(
            href,
            source_file,
            repo_root,
        )

        results.append(
            LinkResult(
                source=relative_path,
                href=result.href,
                normalized=result.normalized,
                link_type=result.link_type,
                status=result.status,
                production_url=result.production_url,
            )
        )

    return results, None


def print_table(results: list[LinkResult]) -> None:
    headers = (
        "FILE",
        "LOCAL HREF",
        "NORMALIZED ROUTE",
        "TYPE",
        "STATUS",
    )
    widths = (13, 42, 42, 12, 10)

    print()
    print("NEXUSNOVA SIDE-BY-SIDE LINK MATCHER")
    print("=" * 126)
    print("MODE: READ-ONLY / NO NETWORK / NO FILE WRITES")
    print(f"STATIC PRODUCTION URL DATABASE: {len(PRODUCTION_URLS)} routes")
    print()

    print(
        " | ".join(
            header.ljust(width)
            for header, width in zip(headers, widths)
        )
    )
    print("-" * 126)

    for result in results:
        print(
            " | ".join(
                (
                    result.source[:13],
                    result.href[:42],
                    result.normalized[:42],
                    result.link_type[:12],
                    result.status[:10],
                )
            )
        )

    print("-" * 126)


def print_summary(
    results: list[LinkResult],
    errors: list[str],
) -> None:
    internal = [
        result
        for result in results
        if result.link_type == "INTERNAL"
    ]
    matches = [
        result
        for result in internal
        if result.status == "MATCH"
    ]
    mismatches = [
        result
        for result in internal
        if result.status == "MISMATCH"
    ]
    failures = [
        result
        for result in results
        if result.status == "FAIL"
    ]
    skipped = [
        result
        for result in results
        if result.status == "SKIP"
    ]

    print()
    print("SUMMARY")
    print("=" * 126)
    print(f"ANCHORS SCANNED       : {len(results)}")
    print(f"INTERNAL LINKS        : {len(internal)}")
    print(f"PRODUCTION MATCHES    : {len(matches)}")
    print(f"PRODUCTION MISMATCHES : {len(mismatches)}")
    print(f"SKIPPED/EXTERNAL      : {len(skipped)}")
    print(f"UNSUPPORTED FAILURES  : {len(failures)}")
    print(f"FILE/READ ERRORS      : {len(errors)}")

    if mismatches:
        print()
        print("MISMATCH DETAILS")
        print("=" * 126)
        for result in mismatches:
            print(
                f"{result.source}: "
                f"{result.href} -> {result.normalized}"
            )

    if errors:
        print()
        print("ERROR DETAILS")
        print("=" * 126)
        for error in errors:
            print(error)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Match internal links in local index.html and tools.html "
            "against the static NexusNova production URL database."
        )
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=None,
        help="Explicit repository root.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    repo_root = (
        args.root.expanduser().resolve()
        if args.root is not None
        else infer_repo_root()
    )

    if not repo_root.is_dir():
        print(
            f"ERROR: repository root does not exist: {repo_root}",
            file=sys.stderr,
        )
        return 2

    print(f"Repository root: {repo_root}")

    all_results: list[LinkResult] = []
    errors: list[str] = []

    for relative_path in TARGET_FILES:
        results, error = scan_file(
            repo_root,
            relative_path,
        )
        all_results.extend(results)

        if error:
            errors.append(error)

    print_table(all_results)
    print_summary(all_results, errors)

    has_failure = bool(errors) or any(
        result.status in {"MISMATCH", "FAIL"}
        for result in all_results
    )

    print()
    print(
        "FINAL STATUS: FAIL"
        if has_failure
        else "FINAL STATUS: PASS"
    )

    return 1 if has_failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
