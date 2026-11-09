#!/usr/bin/env node
/**
 * Retired on 9 November 2026.
 *
 * The former generator added a repeated audience/FAQ template to tool pages.
 * That content was not sufficiently specific to the tool and has been removed.
 * Tool guidance is now maintained as reviewed, page-specific content.
 *
 * This file is intentionally validation-only so an older workflow or manual
 * invocation cannot re-introduce the retired template.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const legacyMarkers = ['NEXUSNOVA-TIER1-GUIDE:v1', 'nn-tier1-faq'];
const pages = fs.readdirSync(root).filter(name => name.toLowerCase().endsWith('.html'));
const offenders = [];

for (const name of pages) {
  const html = fs.readFileSync(path.join(root, name), 'utf8');
  if (legacyMarkers.some(marker => html.toLowerCase().includes(marker.toLowerCase()))) offenders.push(name);
}

if (offenders.length) {
  console.error('Retired generic tier-1 blocks remain:', offenders.join(', '));
  process.exitCode = 1;
} else {
  console.log(`Legacy guide generator is retired; no legacy generated blocks remain in ${pages.length} top-level HTML pages.`);
}
