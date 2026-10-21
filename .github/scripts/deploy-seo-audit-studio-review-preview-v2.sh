#!/usr/bin/env bash
set -Eeuo pipefail

# Compatibility launcher for the isolated preview deploy script.
# Wrangler 4.151.2 does not accept --yes on `d1 migrations apply`; CI skips
# confirmations for this command in non-interactive runs. Restrict the rewrite
# to that command so valid npx --yes and d1 execute --yes flags remain intact.
source_script=".github/scripts/deploy-seo-audit-studio-review-preview.sh"
patched_script="${RUNNER_TEMP:-/tmp}/deploy-seo-audit-studio-review-preview-wrangler4.sh"

if [[ ! -f "$source_script" ]]; then
  echo "::error::Original isolated review deployment script was not found."
  exit 1
fi
sed '/d1 migrations apply /s/ --yes$//' "$source_script" > "$patched_script"
bash "$patched_script"
