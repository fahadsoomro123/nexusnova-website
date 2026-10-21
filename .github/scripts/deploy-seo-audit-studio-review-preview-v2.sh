#!/usr/bin/env bash
set -Eeuo pipefail

# Compatibility launcher for the existing isolated preview deploy script.
# Preserve the original tracked script untouched. Wrangler 4.151.2 no longer
# accepts the legacy --yes flag on D1 commands; CI skips confirmations in a
# non-interactive run, so remove only that unsupported flag from a temporary
# runner-local copy and execute it from the repository root.
source_script=".github/scripts/deploy-seo-audit-studio-review-preview.sh"
patched_script="${RUNNER_TEMP:-/tmp}/deploy-seo-audit-studio-review-preview-wrangler4.sh"

if [[ ! -f "$source_script" ]]; then
  echo "::error::Original isolated review deployment script was not found."
  exit 1
fi
sed 's/ --yes//g' "$source_script" > "$patched_script"
bash "$patched_script"
