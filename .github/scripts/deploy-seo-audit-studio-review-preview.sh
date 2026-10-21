#!/usr/bin/env bash
set -Ee -o pipefail

if [[ -z "$CLOUDFLARE_API_TOKEN" || -z "$CLOUDFLARE_ACCOUNT_ID" ]]; then
  echo "Missing GitHub Actions secrets CLOUDFLARE_API_TOKEN and/or CLOUDFLARE_ACCOUNT_ID."
  exit 1
fi

API="https://api.cloudflare.com/client/v4"

# Verify credentials and account access before attempting D1.
# Print only HTTP status and safe Cloudflare error codes/messages, never the token.
echo "::group::Verify Cloudflare API token and account scope"
verify_raw="$(curl -sS -w '\n%{http_code}' -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$API/user/tokens/verify")"
verify_status="${verify_raw##*$'\n'}"
verify_body="${verify_raw%$'\n'*}"
echo "Token verification HTTP status: $verify_status"
jq -c '{success, result_status:.result.status, errors:[.errors[]? | {code,message}]}' <<< "$verify_body" || echo "Cloudflare token verification returned non-JSON data."
if [[ "$verify_status" != "200" ]] || [[ "$(jq -r '.success // false' <<< "$verify_body")" != "true" ]] || [[ "$(jq -r '.result.status // ""' <<< "$verify_body")" != "active" ]]; then
  echo "::error::CLOUDFLARE_API_TOKEN is invalid, expired, or not active. Update the GitHub Actions secret with the intended Cloudflare token."
  exit 1
fi

account_raw="$(curl -sS -w '\n%{http_code}' -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$API/accounts/$CLOUDFLARE_ACCOUNT_ID")"
account_status="${account_raw##*$'\n'}"
account_body="${account_raw%$'\n'*}"
echo "Configured account lookup HTTP status: $account_status"
jq -c '{success, errors:[.errors[]? | {code,message}]}' <<< "$account_body" || echo "Cloudflare account lookup returned non-JSON data."
if [[ "$account_status" != "200" ]] || [[ "$(jq -r '.success // false' <<< "$account_body")" != "true" ]]; then
  echo "::error::The token is active, but CLOUDFLARE_ACCOUNT_ID is not accessible with it. Check that the GitHub secret contains the account ID selected in the Cloudflare token."
  exit 1
fi
echo "Cloudflare token is active and the configured account is accessible."
echo "::endgroup::"

PAGE_PROJECT="nexusnova-seo-audit-studio-review"
PAGE_BRANCH="review"
PAGE_ORIGIN="https://review.nexusnova-seo-audit-studio-review.pages.dev"
WORKER_NAME="nexusnova-audit-studio-review"
WORKER_ORIGIN="https://$WORKER_NAME.fahadsoomro123.workers.dev"
DB_NAME="nexusnova-audit-studio-review-db"
BACKEND_DIR=".review-backend"
WRANGLER_CONFIG="$BACKEND_DIR/cloudflare/wrangler.review.jsonc"

echo "::group::Find or create isolated review D1 database"
db_list_raw="$(curl -sS -w '\n%{http_code}' -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/d1/database?per_page=100")"
db_list_status="${db_list_raw##*$'\n'}"
db_list="${db_list_raw%$'\n'*}"
if [[ "$db_list_status" != "200" ]] || [[ "$(jq -r '.success // false' <<< "$db_list")" != "true" ]]; then
  echo "Cloudflare D1 database listing failed (HTTP $db_list_status)."
  jq -c '{errors:[.errors[]? | {code,message}]}' <<< "$db_list" || echo "Cloudflare D1 endpoint returned non-JSON data."
  echo "::error::Review token verification and account lookup above to identify whether this is a token, account, or D1-specific permission issue."
  exit 1
fi
db_id="$(jq -r --arg name "$DB_NAME" '.result[]? | select(.name == $name) | .uuid' <<< "$db_list" | head -n 1)"
if [[ -z "$db_id" || "$db_id" == "null" ]]; then
  create_body="$(jq -nc --arg name "$DB_NAME" '{name:$name}')"
  created="$(curl -sS -X POST -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/d1/database" --data "$create_body")"
  jq -e '.success == true' <<< "$created" >/dev/null || { echo "Could not create isolated preview D1 database."; jq -r '.errors[]?.message' <<< "$created"; exit 1; }
  db_id="$(jq -r '.result.uuid' <<< "$created")"
fi
if [[ -z "$db_id" || "$db_id" == "null" ]]; then echo "No D1 database id returned."; exit 1; fi
echo "Using separate database $DB_NAME ($db_id); production D1 is not referenced."
echo "::endgroup::"

cat > "$WRANGLER_CONFIG" <<JSON
{
  "\$schema": "../node_modules/wrangler/config-schema.json",
  "name": "$WORKER_NAME",
  "main": "worker.js",
  "compatibility_date": "2026-10-19",
  "workers_dev": true,
  "preview_urls": false,
  "vars": {
    "APP_MODE": "sandbox",
    "AUDIT_PAYMENT_PROVIDER": "mock",
    "AUDIT_SAFEPAY_ENV": "sandbox",
    "AUDIT_NOWPAYMENTS_ENV": "sandbox",
    "ENABLE_TEST_SIMULATOR": "true",
    "ALLOW_LIVE_PAYMENTS": "false",
    "CRYPTO_LIVE_AUTHORIZED": "false",
    "AUDIT_CRYPTO_COMPLIANCE_CONFIRMED": "false",
    "AUDIT_CRYPTO_MINIMUM_BUFFER_USD": "1.00",
    "ALLOWED_ORIGINS": "$PAGE_ORIGIN"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "$DB_NAME",
      "database_id": "$db_id",
      "migrations_dir": "migrations"
    }
  ],
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  }
}
JSON

echo "::group::Apply migrations to the isolated review database"
npx --yes wrangler@4.151.2 d1 migrations apply "$DB_NAME" --remote --config "$WRANGLER_CONFIG"
echo "::endgroup::"

echo "::group::Seed mock-only promotion test codes"
now="$(date +%s)"
ends="$((now + 604800))"
hash20="$(printf 'REVIEW20' | sha256sum | cut -d' ' -f1)"
hashfixed="$(printf 'REVIEWFIXED' | sha256sum | cut -d' ' -f1)"
hashfree="$(printf 'REVIEWFREE' | sha256sum | cut -d' ' -f1)"
cat > "$BACKEND_DIR/cloudflare/review-seed.sql" <<SQL
INSERT INTO promotion_campaigns (id,name,status,offer_type,offer_value,starts_at,ends_at,total_limit,per_user_limit,claimed_count,terms,created_at,updated_at)
VALUES ('review_campaign_percent','Review Preview: 20% Off','active','percent',20,$now,$ends,200,20,0,'Review environment only. Mock checkout; no payment is processed.',$now,$now)
ON CONFLICT(id) DO UPDATE SET status='active',offer_type='percent',offer_value=20,starts_at=excluded.starts_at,ends_at=excluded.ends_at,total_limit=MAX(promotion_campaigns.total_limit,excluded.total_limit),per_user_limit=20,terms=excluded.terms,updated_at=excluded.updated_at;

INSERT INTO promotion_campaigns (id,name,status,offer_type,offer_value,starts_at,ends_at,total_limit,per_user_limit,claimed_count,terms,created_at,updated_at)
VALUES ('review_campaign_fixed','Review Preview: US$1 Off','active','fixed',100,$now,$ends,200,20,0,'Review environment only. Mock checkout; no payment is processed.',$now,$now)
ON CONFLICT(id) DO UPDATE SET status='active',offer_type='fixed',offer_value=100,starts_at=excluded.starts_at,ends_at=excluded.ends_at,total_limit=MAX(promotion_campaigns.total_limit,excluded.total_limit),per_user_limit=20,terms=excluded.terms,updated_at=excluded.updated_at;

INSERT INTO promotion_campaigns (id,name,status,offer_type,offer_value,starts_at,ends_at,total_limit,per_user_limit,claimed_count,terms,created_at,updated_at)
VALUES ('review_campaign_free','Review Preview: Free Report','active','free_report',100,$now,$ends,200,20,0,'Review environment only. Mock checkout; no payment is processed.',$now,$now)
ON CONFLICT(id) DO UPDATE SET status='active',offer_type='free_report',offer_value=100,starts_at=excluded.starts_at,ends_at=excluded.ends_at,total_limit=MAX(promotion_campaigns.total_limit,excluded.total_limit),per_user_limit=20,terms=excluded.terms,updated_at=excluded.updated_at;

INSERT INTO promotion_codes (id,campaign_id,code_hash,code_preview,status,max_uses,uses_count,per_user_limit,expires_at,target_session_ref,created_at)
VALUES ('review_code_percent','review_campaign_percent','$hash20','...IEW20','active',200,0,20,$ends,NULL,$now)
ON CONFLICT(id) DO UPDATE SET code_hash=excluded.code_hash,code_preview=excluded.code_preview,status='active',max_uses=MAX(promotion_codes.max_uses,excluded.max_uses),per_user_limit=20,expires_at=excluded.expires_at;

INSERT INTO promotion_codes (id,campaign_id,code_hash,code_preview,status,max_uses,uses_count,per_user_limit,expires_at,target_session_ref,created_at)
VALUES ('review_code_fixed','review_campaign_fixed','$hashfixed','...FIXED','active',200,0,20,$ends,NULL,$now)
ON CONFLICT(id) DO UPDATE SET code_hash=excluded.code_hash,code_preview=excluded.code_preview,status='active',max_uses=MAX(promotion_codes.max_uses,excluded.max_uses),per_user_limit=20,expires_at=excluded.expires_at;

INSERT INTO promotion_codes (id,campaign_id,code_hash,code_preview,status,max_uses,uses_count,per_user_limit,expires_at,target_session_ref,created_at)
VALUES ('review_code_free','review_campaign_free','$hashfree','...EFREE','active',200,0,20,$ends,NULL,$now)
ON CONFLICT(id) DO UPDATE SET code_hash=excluded.code_hash,code_preview=excluded.code_preview,status='active',max_uses=MAX(promotion_codes.max_uses,excluded.max_uses),per_user_limit=20,expires_at=excluded.expires_at;
SQL
npx --yes wrangler@4.151.2 d1 execute "$DB_NAME" --remote --config "$WRANGLER_CONFIG" --file "$BACKEND_DIR/cloudflare/review-seed.sql" --yes
echo "Review-only codes available in isolated D1: REVIEW20, REVIEWFIXED, REVIEWFREE. No charge or provider is involved."
echo "::endgroup::"

echo "::group::Deploy isolated mock-only review Worker"
npx --yes wrangler@4.151.2 deploy --config "$WRANGLER_CONFIG"
pagespeed_key="${PAGESPEED_API_KEY:-}"
google_service_account="${GOOGLE_SERVICE_ACCOUNT_JSON:-}"
if [[ -n "$pagespeed_key" ]]; then
  printf '%s' "$pagespeed_key" | npx --yes wrangler@4.151.2 secret put PAGESPEED_API_KEY --config "$WRANGLER_CONFIG"
  echo "Private PageSpeed project key configured in isolated Worker (value not logged)."
elif [[ -n "$google_service_account" ]]; then
  printf '%s' "$google_service_account" | npx --yes wrangler@4.151.2 secret put PAGESPEED_SERVICE_ACCOUNT_JSON --config "$WRANGLER_CONFIG"
  echo "Google service-account OAuth configured for isolated PageSpeed (credential value not logged)."
else
  echo "::warning::No PageSpeed credential is configured; live performance measurements remain unavailable and paid unlock stays disabled."
fi
preview_token="$AUDIT_PREVIEW_OWNER_TOKEN"
if [[ -n "$preview_token" ]]; then
  token_length="$(printf '%s' "$preview_token" | wc -c | tr -d ' ')"
  if (( token_length < 32 || token_length > 256 )); then echo "AUDIT_PREVIEW_OWNER_TOKEN must be 32-256 characters."; exit 1; fi
  printf '%s' "$preview_token" | npx --yes wrangler@4.151.2 secret put AUDIT_OWNER_ADMIN_TOKEN --config "$WRANGLER_CONFIG"
  echo "Separate preview owner token configured as a Worker secret (value not logged)."
else
  echo "::warning::Owner Console actions remain locked until GitHub Actions secret AUDIT_PREVIEW_OWNER_TOKEN (32-256 random characters) is configured and this workflow reruns."
fi
echo "::endgroup::"

echo "::group::Create or reuse isolated Cloudflare Pages project"
project_url="$API/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PAGE_PROJECT"
project_status="$(curl -sS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$project_url")"
if [[ "$(jq -r '.success // false' <<< "$project_status")" != "true" ]]; then
  create_project_body="$(jq -nc --arg name "$PAGE_PROJECT" '{name:$name,production_branch:"main"}')"
  created_project="$(curl -sS -X POST -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects" --data "$create_project_body")"
  jq -e '.success == true' <<< "$created_project" >/dev/null || { echo "Could not create isolated Cloudflare Pages project."; jq -r '.errors[]?.message' <<< "$created_project"; exit 1; }
fi
echo "::endgroup::"

echo "::group::Publish complete site root to isolated noindex review URL"
preview_dir=".preview-dist"
rm -rf "$preview_dir"
mkdir -p "$preview_dir"
rsync -a \
  --exclude='.git/' \
  --exclude='.github/' \
  --exclude='.review-backend/' \
  --exclude='.preview-dist/' \
  --exclude='node_modules/' \
  --exclude='tests/' \
  --exclude='test/' \
  --exclude='docs/' \
  --exclude='cloudflare/' \
  --exclude='package.json' \
  --exclude='package-lock.json' \
  --exclude='*.md' \
  --exclude='*.py' \
  --exclude='*.sh' \
  --exclude='*.cjs' \
  --exclude='*.mjs' \
  --exclude='*.log' \
  . "$preview_dir/"
npx --yes wrangler@4.151.2 pages deploy "$preview_dir" --project-name "$PAGE_PROJECT" --branch "$PAGE_BRANCH"
echo "::endgroup::"

{
  echo "## NexusNova SEO Audit Studio Review Preview"
  echo
  echo "- **Homepage:** $PAGE_ORIGIN/"
  echo "- **Audit Studio (mock checkout):** $PAGE_ORIGIN/seo-audit-studio.html"
  echo "- **Owner Console:** $PAGE_ORIGIN/seo-audit-studio-admin.html"
  echo "- **Review Worker:** $WORKER_ORIGIN"
  echo "- **Payments:** sandbox/mock only; no real card or crypto transfer is enabled."
  echo "- **Database:** separate D1 database \`$DB_NAME\`; production D1 is not used."
  if [[ -z "$preview_token" ]]; then
    echo "- **Owner Console:** configure Actions secret \`AUDIT_PREVIEW_OWNER_TOKEN\` (32-256 random characters) and rerun the workflow to enable authenticated owner actions."
  else
    echo "- **Owner Console:** separate preview token was configured as a Worker secret."
  fi
} >> "$GITHUB_STEP_SUMMARY"
