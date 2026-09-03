#!/usr/bin/env python3
"""Check or pin GitHub Actions references to immutable commit SHAs.

Usage:
  python .github/scripts/pin_actions.py --check
  python .github/scripts/pin_actions.py --apply

Only workflow `uses:` entries are considered. Local actions and Docker images
are ignored. When applying, annotated comments such as `# v4` are preserved.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_DIR = ROOT / ".github" / "workflows"
SHA_RE = re.compile(r"^[0-9a-f]{40}$", re.IGNORECASE)
USES_RE = re.compile(r"^(\s*uses:\s*)([^\s#]+)(\s*(?:#.*)?)$")


def api_json(url: str) -> dict:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "nexusnova-actions-pinner/1.0",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def resolve_ref(repo: str, ref: str) -> str:
    if SHA_RE.fullmatch(ref):
        return ref.lower()

    encoded = urllib.parse.quote(ref, safe="")
    candidates = [
        f"https://api.github.com/repos/{repo}/git/ref/tags/{encoded}",
        f"https://api.github.com/repos/{repo}/git/ref/heads/{encoded}",
    ]
    last_error: Exception | None = None
    for url in candidates:
        try:
            payload = api_json(url)
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code == 404:
                continue
            raise
        obj = payload.get("object") or {}
        sha = str(obj.get("sha") or "")
        obj_type = str(obj.get("type") or "")
        if SHA_RE.fullmatch(sha) and obj_type == "commit":
            return sha.lower()
        if SHA_RE.fullmatch(sha) and obj_type == "tag":
            tag_payload = api_json(
                f"https://api.github.com/repos/{repo}/git/tags/{sha}"
            )
            target = tag_payload.get("object") or {}
            target_sha = str(target.get("sha") or "")
            if SHA_RE.fullmatch(target_sha) and str(target.get("type")) == "commit":
                return target_sha.lower()
    raise RuntimeError(f"Could not resolve {repo}@{ref}: {last_error or 'ref not found'}")


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
            if SHA_RE.fullmatch(ref):
                output.append(line)
                continue
            repo = "/".join(repo_path.split("/")[:2])
            sha = resolve_ref(repo, ref)
            suffix = comment if comment.strip() else f" # {ref}"
            newline = f"uses: {repo_path}@{sha}{suffix}\n"
            indent = line[: len(line) - len(line.lstrip(" "))]
            newline = indent + newline
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
