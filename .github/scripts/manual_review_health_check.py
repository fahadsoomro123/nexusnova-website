#!/usr/bin/env python3
"""
NexusNova local manual-review health check.

Read-only:
- Reads only the repository files.
- Never modifies HTML, CSS, JS, config, Git state or deployed files.
- Uses no network requests.
- Exits 0 only when all five templates pass the required asset/navigation checks.

Usage from repository root:
    python .github/scripts/manual_review_health_check.py

Optional explicit repository root:
    python .github/scripts/manual_review_health_check.py --root .
"""

from __future__ import annotations

import argparse
import os
import posixpath
import re
import sys
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote


TEMPLATES = (
    "index.html",
    "tools.html",
    "categories.html",
    "salary-tax-calculator-pakistan.html",
    "currency-rates.html",
)

LOCAL_SCHEMES = {"", "file"}
EXTERNAL_SCHEMES = {"http", "https", "mailto", "tel", "data", "blob"}

GENERIC_DYNAMIC_TARGETS = {
    "",
    "#",
    "javascript:void(0)",
    "javascript:void(0);",
}


@dataclass
class Finding:
    level: str
    area: str
    detail: str


@dataclass
class TemplateReport:
    path: str
    script_total: int = 0
    script_failures: int = 0
    favicon_total: int = 0
    favicon_failures: int = 0
    nav_total: int = 0
    nav_failures: int = 0
    findings: list[Finding] = field(default_factory=list)

    @property
    def script_status(self) -> str:
        return "PASS" if self.script_failures == 0 else "FAIL"

    @property
    def favicon_status(self) -> str:
        return "PASS" if self.favicon_total > 0 and self.favicon_failures == 0 else "FAIL"

    @property
    def nav_status(self) -> str:
        return "PASS" if self.nav_failures == 0 else "FAIL"

    @property
    def overall(self) -> str:
        return (
            "PASS"
            if (
                self.script_failures == 0
                and self.favicon_total > 0
                and self.favicon_failures == 0
                and self.nav_failures == 0
            )
            else "FAIL"
        )


class AssetParser(HTMLParser):
    """Collect only the HTML attributes needed by this verification gate."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.scripts: list[str | None] = []
        self.links: list[dict[str, str]] = []
        self.anchors: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_map = {
            str(key).lower(): "" if value is None else value
            for key, value in attrs
        }

        lowered = tag.lower()

        if lowered == "script":
            self.scripts.append(attrs_map.get("src"))

        elif lowered == "link":
            self.links.append(attrs_map)

        elif lowered == "a":
            href = attrs_map.get("href")
            if href is not None:
                self.anchors.append(href)


def normalize_reference(value: str) -> str:
    return unquote(value.strip())


def is_external_reference(value: str) -> bool:
    parsed = urlsplit(value)

    if parsed.scheme.lower() in EXTERNAL_SCHEMES:
        return True

    if value.startswith("//"):
        return True

    return False


def is_dynamic_reference(value: str) -> bool:
    normalized = value.strip().lower()

    if normalized in GENERIC_DYNAMIC_TARGETS:
        return True

    return normalized.startswith("javascript:")


def resolve_repo_target(repo_root: Path, source_file: Path, href: str) -> Path | None:
    """
    Resolve an internal URL path to a repository path.

    Supported:
    - relative: tools.html
    - root-relative: /tools.html
    - query/hash suffixes
    """
    raw = normalize_reference(href)

    if is_external_reference(raw):
        return None

    parsed = urlsplit(raw)

    if parsed.scheme and parsed.scheme.lower() not in LOCAL_SCHEMES:
        return None

    target_path = parsed.path

    if not target_path:
        return source_file

    if target_path.startswith("/"):
        relative = target_path.lstrip("/")
    else:
        source_rel = source_file.relative_to(repo_root).as_posix()
        base_dir = posixpath.dirname(source_rel)
        relative = posixpath.normpath(posixpath.join(base_dir, target_path))

    if relative in {".", ""}:
        return source_file

    if relative.startswith("../") or relative == "..":
        return None

    return repo_root / relative


def check_script_tags(repo_root: Path, source_file: Path, parser: AssetParser, report: TemplateReport) -> None:
    report.script_total = len(parser.scripts)

    if not parser.scripts:
        report.script_failures += 1
        report.findings.append(
            Finding("FAIL", "SCRIPT", "No <script> tags were found.")
        )
        return

    for index, src in enumerate(parser.scripts, start=1):
        if src is None or not src.strip():
            report.findings.append(
                Finding("INFO", "SCRIPT", f"#{index}: inline script (no src) — accepted.")
            )
            continue

        value = normalize_reference(src)

        if is_external_reference(value):
            report.findings.append(
                Finding("INFO", "SCRIPT", f"#{index}: external source — not locally resolved: {value}")
            )
            continue

        parsed = urlsplit(value)

        if parsed.scheme and parsed.scheme.lower() not in LOCAL_SCHEMES:
            report.script_failures += 1
            report.findings.append(
                Finding("FAIL", "SCRIPT", f"#{index}: unsupported script URL scheme: {value}")
            )
            continue

        target = resolve_repo_target(repo_root, source_file, value)

        if target is None or not target.is_file():
            report.script_failures += 1
            report.findings.append(
                Finding(
                    "FAIL",
                    "SCRIPT",
                    f"#{index}: missing local script asset: {value}",
                )
            )
            continue

        report.findings.append(
            Finding(
                "INFO",
                "SCRIPT",
                f"#{index}: local asset OK: {target.relative_to(repo_root).as_posix()}",
            )
        )


def check_favicons(repo_root: Path, source_file: Path, parser: AssetParser, report: TemplateReport) -> None:
    icon_links: list[dict[str, str]] = []

    for attrs in parser.links:
        rel_tokens = {
            token.lower()
            for token in attrs.get("rel", "").split()
            if token.strip()
        }

        if "icon" in rel_tokens:
            icon_links.append(attrs)

    report.favicon_total = len(icon_links)

    if not icon_links:
        report.favicon_failures += 1
        report.findings.append(
            Finding("FAIL", "FAVICON", 'No <link rel="icon"> asset was found.')
        )
        return

    for index, attrs in enumerate(icon_links, start=1):
        href = attrs.get("href", "").strip()

        if not href:
            report.favicon_failures += 1
            report.findings.append(
                Finding("FAIL", "FAVICON", f"#{index}: icon link has no href.")
            )
            continue

        value = normalize_reference(href)

        if is_external_reference(value):
            report.findings.append(
                Finding(
                    "INFO",
                    "FAVICON",
                    f"#{index}: external favicon — not locally resolved: {value}",
                )
            )
            continue

        target = resolve_repo_target(repo_root, source_file, value)

        if target is None or not target.is_file():
            report.favicon_failures += 1
            report.findings.append(
                Finding(
                    "FAIL",
                    "FAVICON",
                    f"#{index}: missing local favicon asset: {value}",
                )
            )
            continue

        report.findings.append(
            Finding(
                "INFO",
                "FAVICON",
                f"#{index}: local asset OK: {target.relative_to(repo_root).as_posix()}",
            )
        )


def check_internal_navigation(
    repo_root: Path,
    source_file: Path,
    parser: AssetParser,
    report: TemplateReport,
) -> None:
    for href in parser.anchors:
        raw = normalize_reference(href)

        if is_dynamic_reference(raw):
            report.findings.append(
                Finding(
                    "INFO",
                    "NAV",
                    f"dynamic/non-navigation target skipped: {href}",
                )
            )
            continue

        if raw.startswith("#") or raw.startswith("?"):
            report.findings.append(
                Finding(
                    "INFO",
                    "NAV",
                    f"same-page target skipped: {href}",
                )
            )
            continue

        if is_external_reference(raw):
            continue

        parsed = urlsplit(raw)

        if parsed.scheme and parsed.scheme.lower() not in LOCAL_SCHEMES:
            report.nav_failures += 1
            report.nav_total += 1
            report.findings.append(
                Finding(
                    "FAIL",
                    "NAV",
                    f"unsupported internal navigation scheme: {href}",
                )
            )
            continue

        target = resolve_repo_target(repo_root, source_file, raw)

        # A path such as ../foo.html is intentionally rejected rather than
        # silently checking outside the repository root.
        if target is None:
            report.nav_failures += 1
            report.nav_total += 1
            report.findings.append(
                Finding(
                    "FAIL",
                    "NAV",
                    f"navigation target escapes repository root or is invalid: {href}",
                )
            )
            continue

        report.nav_total += 1

        if target.is_file():
            report.findings.append(
                Finding(
                    "INFO",
                    "NAV",
                    f"internal target OK: {href} -> {target.relative_to(repo_root).as_posix()}",
                )
            )
            continue

        if target.is_dir():
            index_file = target / "index.html"

            if index_file.is_file():
                report.findings.append(
                    Finding(
                        "INFO",
                        "NAV",
                        f"directory target OK via index.html: {href}",
                    )
                )
            else:
                report.nav_failures += 1
                report.findings.append(
                    Finding(
                        "FAIL",
                        "NAV",
                        f"directory target has no index.html: {href}",
                    )
                )
            continue

        report.nav_failures += 1
        report.findings.append(
            Finding(
                "FAIL",
                "NAV",
                f"missing internal target: {href}",
            )
        )


def load_template(repo_root: Path, relative_path: str) -> tuple[Path, str]:
    path = repo_root / relative_path

    if not path.is_file():
        raise FileNotFoundError(
            f"Template does not exist: {relative_path}"
        )

    return path, path.read_text(encoding="utf-8")


def verify_template(repo_root: Path, relative_path: str) -> TemplateReport:
    report = TemplateReport(path=relative_path)

    try:
        source_file, source = load_template(repo_root, relative_path)
    except Exception as error:
        report.findings.append(
            Finding("FAIL", "TEMPLATE", str(error))
        )
        report.script_failures = 1
        report.favicon_failures = 1
        report.nav_failures = 1
        return report

    parser = AssetParser()

    try:
        parser.feed(source)
        parser.close()
    except Exception as error:
        report.findings.append(
            Finding(
                "FAIL",
                "HTML",
                f"HTML parser error: {error}",
            )
        )
        report.script_failures += 1
        report.favicon_failures += 1
        report.nav_failures += 1
        return report

    check_script_tags(repo_root, source_file, parser, report)
    check_favicons(repo_root, source_file, parser, report)
    check_internal_navigation(repo_root, source_file, parser, report)

    return report


def print_matrix(reports: list[TemplateReport]) -> None:
    print()
    print("STRICT LOCAL MANUAL-REVIEW HEALTH MATRIX")
    print("=" * 96)

    headers = (
        "TEMPLATE",
        "SCRIPTS",
        "FAVICON",
        "INTERNAL NAV",
        "OVERALL",
    )

    print(
        f"{headers[0]:<36}"
        f"{headers[1]:<14}"
        f"{headers[2]:<14}"
        f"{headers[3]:<18}"
        f"{headers[4]:<10}"
    )
    print("-" * 96)

    for report in reports:
        print(
            f"{report.path:<36}"
            f"{report.script_status:<14}"
            f"{report.favicon_status:<14}"
            f"{report.nav_status:<18}"
            f"{report.overall:<10}"
        )

    print("-" * 96)

    passed = sum(report.overall == "PASS" for report in reports)

    print(
        f"RESULT: {passed}/{len(reports)} templates PASS"
    )


def print_findings(reports: list[TemplateReport]) -> None:
    print()
    print("DIAGNOSTIC LOG")
    print("=" * 96)

    for report in reports:
        print(f"\n[{report.path}]")

        if not report.findings:
            print("  FAIL  TEMPLATE   No diagnostics were produced.")
            continue

        for finding in report.findings:
            print(
                f"  {finding.level:<5} "
                f"{finding.area:<10} "
                f"{finding.detail}"
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Read-only local health check for NexusNova manual review templates."
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=None,
        help="Repository root. Defaults to the Git root inferred from this script.",
    )
    return parser.parse_args()


def infer_repo_root() -> Path:
    """
    Resolve the repository root safely in both normal module execution and
    dynamic runtimes where Python may not define __file__.
    """
    module_file = globals().get("__file__")

    if module_file:
        try:
            script_path = Path(module_file).expanduser().resolve()

            # .github/scripts/manual_review_health_check.py
            # parents[2] -> repository root
            candidate = script_path.parents[2]

            if (candidate / ".git").exists():
                return candidate
        except (OSError, RuntimeError, IndexError):
            # Fall through to cwd-based discovery.
            pass

    # Dynamic execution environments may not expose __file__. Start from
    # the current working directory and walk upward until the Git root is
    # found. This also handles execution from inside a repository subfolder.
    try:
        cwd = Path.cwd().resolve()
    except (OSError, RuntimeError):
        cwd = Path(os.path.abspath(os.getcwd()))

    for candidate in (cwd, *cwd.parents):
        if (candidate / ".git").exists():
            return candidate

    # Last-resort deterministic fallback: use the current working directory
    # itself rather than raising because a file-binding is unavailable.
    return cwd


def main() -> int:
    args = parse_args()
    repo_root = (
        args.root.expanduser().resolve()
        if args.root is not None
        else infer_repo_root()
    )

    if not repo_root.is_dir():
        print(f"ERROR: repository root does not exist: {repo_root}")
        return 2

    print("NEXUSNOVA MANUAL REVIEW HEALTH CHECK")
    print(f"Repository root: {repo_root}")
    print("Mode: READ-ONLY / NO NETWORK / NO FILE WRITES")

    reports = [
        verify_template(repo_root, relative_path)
        for relative_path in TEMPLATES
    ]

    print_matrix(reports)
    print_findings(reports)

    failures = [report for report in reports if report.overall != "PASS"]

    print()
    print("=" * 96)

    if failures:
        print(
            f"FINAL: FAIL — {len(failures)}/{len(reports)} template(s) need attention."
        )
        return 1

    print(
        f"FINAL: PASS — all {len(reports)} templates passed the local manual-review asset gate."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
