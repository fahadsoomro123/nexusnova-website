# NexusNova Tools — Low Value Content Remediation Tranche
Date: 20 September 2026

## Google finding being addressed

The current AdSense UI shows the site under **Needs attention** with the specific issue **Low value content**. Google asks publishers to provide unique, relevant, useful content and a good user experience; its Search documentation also warns against scaled pages that provide little original value.

## What changed in this tranche

### Six new workflow workbenches
- `document-workbench.html` — local PDF merge + selected-page extraction, with ordering and output verification guidance.
- `image-publishing-workbench.html` — local image resize + compression + format selection + fresh export, with metadata/privacy boundaries.
- `calculation-workbench.html` — percentage, reverse percentage, percentage change, discount, bill split, age, date difference and selected unit conversions in one transparent interface.
- `writing-workbench.html` — words, characters, reading estimate, whitespace cleanup and case transforms in one writing workflow.
- `ai-workflow-workbench.html` — structured prompt construction plus a test-case/checklist workflow; no AI API call.
- `password-security-workbench.html` — local random password generation, local composition inspection and account-hardening checklist.

### Nine commodity/single-task pages consolidated
These pages are retained for existing links but are now `noindex,follow` and point visitors to the broader workflow:
- percentage-calculator.html -> calculation-workbench.html
- age-calculator.html -> calculation-workbench.html
- date-difference-calculator.html -> calculation-workbench.html
- unit-converter.html -> calculation-workbench.html
- word-counter.html -> writing-workbench.html
- image-compressor.html -> image-publishing-workbench.html
- ai-prompt-builder.html -> ai-workflow-workbench.html
- merge-pdf.html -> document-workbench.html
- password-generator.html -> password-security-workbench.html

## Information architecture change

`tools.html` no longer presents a long wall of small utilities. It now presents five workflow workbenches first, followed by a smaller set of specialist utilities. The copy explains why the library is being consolidated and distinguishes browser-local processing from blanket security claims.

## Index surface

The branch sitemap now contains **52 URLs**. The previous remediation branch contained 55 URLs. Nine single-purpose pages were removed from the sitemap and six workbench pages were added.

## Verification status

Verified directly in the GitHub branch:
- PR #170 remains open and unmerged.
- Current PR head: `d3c37ed6f3e20c74c82ed1f5060902c058ea5529`.
- Six new workbench files are present in the PR.
- The sitemap was updated after the new workbench additions.
- The nine consolidated pages now contain `noindex,follow` directives.
- `tools.html` links to the new workbench pages rather than the consolidated pages.

Not yet claimed:
- Google AdSense approval.
- Successful live deployment of this exact PR head.
- Search Console performance changes.
- A complete live rendered crawl.

The live website must be checked after deployment before a new AdSense review request.
