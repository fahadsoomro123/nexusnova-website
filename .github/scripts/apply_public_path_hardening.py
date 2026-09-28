#!/usr/bin/env python3
"""
One-pass repository patch helper for the NexusNova GitHub Pages hardening.

The repository should keep Cloudflare Worker source under cloudflare/telegram-bot
for Worker CI, while GitHub Pages must exclude that directory from the published
artifact. The helper only writes the Jekyll exclusion file and never changes main.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "_config.yml"

BLOCK = """# NexusNova GitHub Pages build exclusions.
exclude:
  - cloudflare/
  - package.json
  - tests/
  - nexusnova-dev-ai/
  - .github/
"""

current = CONFIG.read_text(encoding="utf-8") if CONFIG.exists() else ""
if current.strip() == BLOCK.strip():
    print("_config.yml already hardened.")
else:
    CONFIG.write_text(BLOCK, encoding="utf-8")
    print("Wrote GitHub Pages public-path hardening to _config.yml.")
