# Google Search Console indexing automation

## Important limitation

Do not use Google's Indexing API as a general submission endpoint for NexusNova articles and browser tools. Google currently documents that the Indexing API is for pages containing `JobPosting` or `BroadcastEvent` in a `VideoObject`. It is not a general "submit every URL" API, and it does not guarantee one-second indexing.

For ordinary NexusNova tools, guides and articles, the supported automation is to keep `sitemap.xml` current and submit that sitemap through the Search Console Sitemap API. Google still decides when a URL is crawled and indexed.

## One-time setup

1. Verify `https://nexusnovatools.com/` in Google Search Console.
2. In Google Cloud, create or select a project and enable the Search Console API.
3. Create a service account and download its JSON key.
4. Add the service-account email as an owner or delegated user for the verified Search Console property, according to the property's access model.
5. In the GitHub repository settings, add these Actions secrets:
   - `GSC_SERVICE_ACCOUNT_JSON`: the complete service-account JSON document.
   - `GSC_SITE_URL`: the exact verified property URL, normally `https://nexusnovatools.com/`.
6. The workflow `.github/workflows/google-sitemap-submit.yml` can then submit `https://nexusnovatools.com/sitemap.xml` after content changes.

## What the automation does

The workflow does not claim instant indexing. It authenticates with Google's Search Console API, submits the sitemap URL, and exits successfully only when Google's API accepts the submission request. Google then crawls the sitemap on its own schedule.

## Recommended publishing flow

1. Add the new article/tool.
2. Add its canonical URL and appropriate structured data.
3. Add it to the internal search index and visitor-facing hub.
4. Add it to `sitemap.xml`.
5. Run `npm run check` and `npm test`.
6. Merge to `main`.
7. Let the sitemap-submission workflow notify Search Console.
8. Use Search Console URL Inspection for individual troubleshooting when a page remains unindexed.

A successful sitemap submission means Google received the sitemap. It is not a guarantee that every URL will be indexed, rank, or appear immediately.
