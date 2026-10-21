#!/usr/bin/env bash
set -Eeuo pipefail
source_script=".github/scripts/deploy-seo-audit-studio-review-preview.sh"
if [[ ! -f "$source_script" ]]; then
  echo "::error::Original isolated review deployment script was not found."
  exit 1
fi
# The underlying script now uses Wrangler 4-compatible flags directly.
# Do not filter "--yes" globally: it is also needed by npm/npx and D1 execute.
exec bash "$source_script"
