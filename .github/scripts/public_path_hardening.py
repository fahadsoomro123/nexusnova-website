#!/usr/bin/env python3
"""
NexusNova public-path hardening gate for GitHub Pages.

Purpose:
- Keep Cloudflare Worker source/configuration outside the Pages artifact.
- Keep the repository root package manifest outside the Pages artifact.
- Optionally probe the deployed site and require HTTP 404 for protected paths.

This script does not alter the Worker runtime or CI deployment source tree.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT / "_config.yml"

PROTECTED_PATHS = (
    "/cloudflare/telegram-bot/wrangler.jsonc",
    "/cloudflare/telegram-bot/worker-entry.js",
    "/package.json",
)

REQUIRED_EXCLUDES = (
    "cloudflare/",
    "package.json",
    "tests/",
    "nexusnova-dev-ai/",
    ".github/",
)


def read_config() -> str:
    if not CONFIG_PATH.exists():
        raise SystemExit(f"ERROR: missing {CONFIG_PATH}")
    return CONFIG_PATH.read_text(encoding="utf-8")


def verify_jekyll_excludes() -> list[str]:
    text = read_config()
    errors: list[str] = []

    for item in REQUIRED_EXCLUDES:
        if item not in text:
            errors.append(f"_config.yml is missing required exclusion: {item}")

    for rel in ("cloudflare/telegram-bot/wrangler.jsonc", "cloudflare/telegram-bot/worker-entry.js"):
        if not (ROOT / rel).exists():
            errors.append(f"expected Worker source is missing from repository: {rel}")

    if not (ROOT / "package.json").exists():
        errors.append("expected repository package manifest is missing: package.json")

    return errors


def probe(url: str) -> tuple[bool, str]:
    request = Request(
        url,
        headers={
            "User-Agent": "NexusNova-Public-Path-Hardening/1.0",
            "Accept": "*/*",
        },
    )

    try:
        with urlopen(request, timeout=20) as response:
            status = int(response.status)
            return status == 404, f"{status} {response.reason}"
    except HTTPError as error:
        status = int(error.code)
        return status == 404, f"{status} {error.reason}"
    except URLError as error:
        return False, f"network error: {error.reason}"
    except Exception as error:  # pragma: no cover - defensive boundary
        return False, f"unexpected error: {error}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify NexusNova GitHub Pages public-path hardening.")
    parser.add_argument(
        "--live-base",
        default="",
        help="Optional deployed origin, for example https://nexusnovatools.com",
    )
    args = parser.parse_args()

    failures = verify_jekyll_excludes()

    print("=== NEXUSNOVA PUBLIC PATH HARDENING ===")
    print(f"Config: {CONFIG_PATH}")
    print(f"Required protected paths: {len(PROTECTED_PATHS)}")

    if failures:
        for item in failures:
            print(f"FAIL: {item}")
    else:
        print("PASS: Jekyll exclusions and protected source paths are present.")

    if args.live_base:
        base = args.live_base.rstrip("/")
        print("\n=== LIVE 404 PROBES ===")
        for path in PROTECTED_PATHS:
            ok, detail = probe(base + path)
            label = "PASS" if ok else "FAIL"
            print(f"{label}: {path} -> {detail}")
            if not ok:
                failures.append(f"live path did not return HTTP 404: {path} -> {detail}")
    else:
        print("\nLIVE probe skipped. Re-run with --live-base after the Pages deployment.")

    if failures:
        print(f"\nRESULT: FAIL ({len(failures)} finding(s))")
        return 1

    print("\nRESULT: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
