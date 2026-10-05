#!/usr/bin/env python3
from pathlib import Path
import subprocess
from adsense_content_remediation_20260911 import (
    DUPLICATE_HUBS, OFF_TOPIC_OR_TRANSIENT, WEAK_ARTICLES, WEAK_TECH, NON_SEARCH_SURFACES
)

ROOT=Path(__file__).resolve().parent
def old_has_guide(rel):
    r=subprocess.run(['git','show',f'HEAD:{rel}'],cwd=ROOT,text=True,capture_output=True)
    return r.returncode==0 and 'NEXUSNOVA_COMPACT_TOOL_GUIDE_START' in r.stdout

improved=sorted(str(p.relative_to(ROOT)) for p in ROOT.rglob('*.html') if old_has_guide(str(p.relative_to(ROOT))))
merged=sorted(DUPLICATE_HUBS)
noindex=sorted((OFF_TOPIC_OR_TRANSIENT|WEAK_ARTICLES|WEAK_TECH|NON_SEARCH_SURFACES)-set(merged))
trust=['about.html','editorial-policy.html','editorial-team.html','tool-methodology.html','privacy.html','terms.html','contact.html','disclaimer.html']
kept_hubs=['tools.html','categories.html','calculator-tools.html','image-tools.html','pdf-tools.html','productivity-tools.html','developer-tools.html','network-tools.html','pakistan-tools.html','articles.html','guides.html']

def bullets(items): return '\n'.join(f'- `{x}`' for x in items)
report=f'''# NexusNova Tools — AdSense Content Remediation Report

Date: 11 September 2026  
Baseline `main`: `3a7913c0d40f08cfd75891cb88e906b95c3d041b`

## Classification summary

| Decision | Count | Meaning |
|---|---:|---|
| IMPROVE | {len(improved)} | Repeated compact guide removed; the page's tool-specific operating notes, worked detail, limitations and privacy/method content remain. |
| MERGE | {len(merged)} | Duplicate discovery intent consolidated into `tools.html`; page stays usable for visitors but is no longer indexable. |
| NOINDEX | {len(noindex)} | Preview/auth, transient live data, Labs, broad tech/news or weak rewrite surface removed from search discovery. |
| KEEP hubs | {len(kept_hubs)} | Focused discovery hubs retained. |
| KEEP trust | {len(trust)} | Author, editorial, methodology, legal and contact signals retained. |

## IMPROVE — exact pages

{bullets(improved)}

## MERGE — exact pages

{bullets(merged)}

## NOINDEX — exact pages

{bullets(noindex)}

## KEEP — focused hubs

{bullets(kept_hubs)}

## KEEP — trust pages

{bullets(trust)}

## HumanProof changes

- Preserved the approved homepage 3D head and V11 sample credential.
- Preserved explicit sample states: SAMPLE, NOT VERIFIED, NO LIVE PROOF and NOT ISSUED.
- Added a direct Password vs OTP vs CAPTCHA vs Face Match vs HumanProof comparison.
- Clarified exact-action binding, on-device landmark analysis, data minimization, server-confirmed issuance and realistic attack/accessibility limitations.
- Explicitly rejects legal-identity, 100%-secure and deepfake-proof claims.
- Production receipt remains conditional on paid flow plus trusted server validation/signing.

## Technical SEO decisions

- Every noindexed URL is removed from discovery sitemaps.
- Sitemap index now points to the canonical main sitemap only; historical sitemap families no longer multiply discovery signals.
- `robots.txt` continues to allow crawling so search engines can observe `noindex`.
- Canonical tags remain on public pages; no word-count target was used.

## Remaining risks before AdSense re-review

- No internal audit can guarantee Google AdSense approval.
- A newly focused site still needs genuine usage and time for recrawling/reprocessing.
- HumanProof production security, paid issuance and receipt APIs are not represented as complete until a trusted backend is activated and independently reviewed.
- Indexable tool/article quality should be sampled manually after deployment; broken links, rendered mobile/desktop layout and Lighthouse results must be recorded from the live GitHub Pages build.
- Do not request AdSense review until deployment and live QA are complete and the owner gives final approval.
'''
(ROOT/'ADSENSE-REMEDIATION-REPORT-2026-09-11.md').write_text(report,encoding='utf-8')
print(f'wrote report: improve={len(improved)} merge={len(merged)} noindex={len(noindex)}')
