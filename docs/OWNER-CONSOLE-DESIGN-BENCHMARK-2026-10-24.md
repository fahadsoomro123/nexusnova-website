# Owner Console Design Benchmark
**Prepared:** 24 October 2026  
**Scope:** SEO Audit Studio Owner Console and the audit-report summary surface  
**Intent:** Use established visualization, accessibility, and Search platform guidance to make operational status easier to interpret without implying measurements or actions that have not happened.

## Benchmark findings and product decisions

| Source | Relevant principle | Application in NexusNova |
|---|---|---|
| Grafana, *Dashboard best practices* — https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/best-practices/ | A dashboard should answer a clear operational question, keep charts focused, reduce cognitive load, use meaningful colour, and make related navigation deliberate. | Put the audit's headline measurements and status counts ahead of lengthy finding rows; use the report's actual values; keep the existing detailed evidence available below the summary. |
| W3C, *Web Content Accessibility Guidelines (WCAG) 2.2* — https://www.w3.org/TR/wcag/ | Non-text content needs text alternatives; colour must not be the only way information is conveyed; text contrast, resize, keyboard operation, and programmatic names matter. | SVG gauges include an accessible name and a visible numerical score. Status counters use text labels as well as restrained severity colours. Missing measurements are rendered as **Not measured**, not a zero-width result. Responsive layouts reflow on narrow viewports. |
| W3C WAI, *Understanding SC 1.4.11: Non-text Contrast* — https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast | Meaningful graphics and UI state indicators need sufficient contrast unless equivalent information is supplied in another form. | Gauge arcs use distinct contrast-bearing strokes, but the score and text label carry the meaning independently of colour. The SVG is not the sole source of a number. |
| Google PageSpeed Insights, *About PageSpeed Insights* — https://developers.google.com/speed/docs/insights/v5/about | Lab measurements and real-user field data answer different questions; a good lab score does not guarantee good field experience, and field data may be unavailable for a page. | Mobile/desktop performance gauges appear only when the stored report contains numeric measurements. Missing PSI credentials or missing field data must remain visible as a coverage limitation rather than being presented as measured performance. |
| Google Search Central, *SEO Starter Guide* — https://developers.google.com/search/docs/fundamentals/seo-starter-guide | Technical SEO helps search engines understand content, but SEO guidance is not a guarantee of rankings or indexing. | Label the gauge as an audit/technical health measurement, not a promise of rankings, AdSense approval, or indexing. A score must remain tied to the audit's recorded checks and scoring rules. |
| Google Search Central, *Robots.txt introduction* — https://developers.google.com/search/docs/crawling-indexing/robots/intro | `robots.txt` controls crawler access; it is not a mechanism for keeping a URL out of search results. | Findings should distinguish crawl restrictions from indexing directives and recommend the correct remedy rather than treating all indexing symptoms as interchangeable. |
| Google Search Console API, *Search Analytics: query* — https://developers.google.com/webmaster-tools/v1/searchanalytics/query | Search-performance numbers require an authorized property and a defined date range; API results have limits and are not necessarily every row. | The audit console must not fabricate clicks, impressions, CTR, or average position. Any future GSC panel must display the property, date range, authorization state, and data limitations. |

## Decisions adopted by the scorecard change

1. **Measurement before decoration.** Overall SEO health is shown only when the report says its overall score is measured and provides a finite numeric value. Technical health is shown only from a numeric, measured technical category. Mobile and desktop scores use stored numeric device measurements. An unavailable value is explicitly marked **Not measured**.
2. **Severity counts are evidence-derived.** Passing, warning, failure, notice, and other/unverified totals are calculated from the report's individual checks. The scoring-only synthetic row is excluded from the check count.
3. **Accessible equivalents.** Each SVG names the metric and its score; the score is also visible as ordinary text. Severity is communicated by the label and number as well as colour. A full report and the finding details remain available for drill-down.
4. **No false operational claims.** A missing performance credential is not represented as a score of zero or a successful performance check. An audit score is not described as a Google ranking, indexing verdict, or AdSense approval.
5. **Responsive by default.** The summary uses CSS grid breakpoints so it can reflow on tablet and mobile. The pull request's responsive browser matrix is used as a release check; it is not a substitute for assistive-technology testing.

## Validation and remaining checks

The Owner Console scorecard implementation is covered by the repository test asserting SVG semantics, measured-score gating, numeric counts, and the **Not measured** state. The scorecard is also subject to the website's site-quality, responsive-matrix, and manual-value CI jobs. This document records the design benchmark; it does not claim a formal WCAG conformance audit or independent screen-reader user study.

## References

- Grafana dashboard principles: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/best-practices/
- WCAG 2.2: https://www.w3.org/TR/wcag/
- WAI non-text contrast: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast
- PageSpeed Insights data and interpretation: https://developers.google.com/speed/docs/insights/v5/about
- Google Search Central SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google robots.txt guidance: https://developers.google.com/search/docs/crawling-indexing/robots/intro
- Search Console Search Analytics API: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
