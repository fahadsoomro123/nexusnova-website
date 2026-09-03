#!/usr/bin/env python3
"""Check or pin GitHub Actions references to immutable commit SHAs.

This intentionally uses a local allowlist instead of live GitHub API lookups.
That keeps CI deterministic and prevents a network/rate-limit failure from
blocking repository maintenance.

Usage:
  python .github/scripts/pin_actions.py --check
  python .github/scripts/pin_actions.py --apply
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_DIR = ROOT / ".github" / "workflows"
SHA_RE = re.compile(r"^[0-9a-f]{40}$", re.IGNORECASE)
USES_RE = re.compile(r"^(\s*uses:\s*)([^\s#]+)(\s*(?:#.*)?)$")

# Immutable commit pins verified against the corresponding official action tags.
PIN_MAP = {
    "actions/checkout@v4": "actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4",
    "actions/checkout@v6": "actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6",
    "actions/setup-python@v5": "actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065 # v5",
    "actions/setup-python@v6": "actions/setup-python@ece7cb06caefa5fff74198d8649806c4678c61a1 # v6",
    "actions/setup-node@v4": "actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4",
    "actions/setup-node@v5": "actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444 # v5",
    "actions/setup-node@v7": "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7",
    "actions/upload-artifact@v4": "actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4",
    "actions/github-script@v7": "actions/github-script@f28e40c7f34bde8b3046d885e986cb6290c5673b # v7",
}


def workflow_files() -> list[Path]:
    return sorted([*WORKFLOW_DIR.glob("*.yml"), *WORKFLOW_DIR.glob("*.yaml")])


def parse_uses(line: str) -> tuple[str, str, str] | None:
    match = USES_RE.match(line.rstrip("\n"))
    if not match:
        return None
    target = match.group(2)
    comment = match.group(3) or ""
    if target.startswith("./") or target.startswith("docker://"):
        return None
    if "@" not in target:
        raise RuntimeError(f"Malformed external action reference: {target}")
    repo_path, ref = target.rsplit("@", 1)
    parts = repo_path.split("/")
    if len(parts) < 2 or not parts[0] or not parts[1]:
        raise RuntimeError(f"Unsupported external action reference: {target}")
    return repo_path, ref, comment


def replacement_for(repo_path: str, ref: str, comment: str) -> str:
    key = f"{repo_path}@{ref}"
    mapped = PIN_MAP.get(key)
    if mapped:
        return mapped
    if SHA_RE.fullmatch(ref):
        suffix = comment if comment.strip() else ""
        return f"{repo_path}@{ref}{suffix}"
    raise RuntimeError(
        f"No verified immutable pin is registered for {key}. "
        "Add its verified commit SHA to PIN_MAP before using --apply."
    )


def check() -> int:
    failures: list[str] = []
    for path in workflow_files():
        for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            parsed = parse_uses(line)
            if not parsed:
                continue
            _repo_path, ref, _comment = parsed
            if not SHA_RE.fullmatch(ref):
                failures.append(f"{path.relative_to(ROOT)}:{lineno}: {ref}")
    if failures:
        print("Unpinned GitHub Actions references:")
        for item in failures:
            print(f"- {item}")
        return 1
    print("All external GitHub Actions references are pinned to commit SHAs.")
    return 0


def apply() -> int:
    changed = False
    for path in workflow_files():
        source = path.read_text(encoding="utf-8")
        output: list[str] = []
        file_changed = False
        for line in source.splitlines(keepends=True):
            parsed = parse_uses(line)
            if not parsed:
                output.append(line)
                continue
            repo_path, ref, comment = parsed
            replacement = replacement_for(repo_path, ref, comment)
            indent = line[: len(line) - len(line.lstrip(" "))]
            newline = f"{indent}uses: {replacement}\n"
            if newline != line:
                file_changed = True
                changed = True
            output.append(newline)
        if file_changed:
            path.write_text("".join(output), encoding="utf-8")
            print(f"Pinned {path.relative_to(ROOT)}")
    if not changed:
        print("No workflow changes required.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--check", action="store_true")
    group.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    return check() if args.check else apply()


if __name__ == "__main__":
    sys.exit(main())
