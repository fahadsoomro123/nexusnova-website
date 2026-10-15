import fs from 'node:fs';

const file = 'index.html';
const marker = 'NEXUSNOVA-TIER1-HOME:v1';
const block = `\n<!-- ${marker} -->\n<section class="nn-featured-tools nn-tier1-global-tools" aria-labelledby="tier1-global-title">\n  <div class="nn-shell">\n    <div class="nn-featured-head"><div><span class="nn-step-label">GLOBAL / US-FACING TOOLSET</span><h2 id="tier1-global-title">High-value tools for AI, gaming, networking and documents</h2><p class="nn-featured-copy">A focused starting point for international users: practical tools with clear use cases for AI workloads, gaming setup, network checks, social-security planning and PDF work.</p></div></div>\n    <div class="nn-featured-grid">\n      <a class="nn-featured-card" href="ai-token-calculator.html"><span class="nn-featured-kicker">AI</span><h3>AI Token Calculator</h3><p>Estimate token usage and compare prompt or completion volumes for AI workflows.</p><span class="nn-featured-open">Open tool →</span></a>\n      <a class="nn-featured-card" href="ai-vram-calculator.html"><span class="nn-featured-kicker">AI / GPU</span><h3>AI VRAM Calculator</h3><p>Estimate graphics-memory requirements for model and workload planning.</p><span class="nn-featured-open">Open tool →</span></a>\n      <a class="nn-featured-card" href="social-security-cola-calculator-2027.html"><span class="nn-featured-kicker">US PLANNING</span><h3>2027 Social Security COLA Calculator</h3><p>Explore an estimate of how a COLA percentage could change a benefit amount.</p><span class="nn-featured-open">Open tool →</span></a>\n      <a class="nn-featured-card" href="edpi-calculator.html"><span class="nn-featured-kicker">GAMING</span><h3>eDPI &amp; Gaming Sensitivity</h3><p>Convert mouse DPI and in-game sensitivity into a comparable eDPI value.</p><span class="nn-featured-open">Open tool →</span></a>\n      <a class="nn-featured-card" href="ip-cidr-calculator.html"><span class="nn-featured-kicker">NETWORKING</span><h3>IP CIDR Calculator</h3><p>Work through CIDR ranges, network addresses and host calculations.</p><span class="nn-featured-open">Open tool →</span></a>\n      <a class="nn-featured-card" href="document-workbench.html"><span class="nn-featured-kicker">PDF</span><h3>PDF Workbench</h3><p>Use browser-based PDF workflows for common document preparation tasks.</p><span class="nn-featured-open">Open tool →</span></a>\n    </div>\n  </div>\n</section>\n`;
let html = fs.readFileSync(file, 'utf8');
if (!html.includes(marker)) {
  const at = html.search(/<section class="nn-featured-tools"/i);
  if (at < 0) throw new Error('Existing featured-tools section not found; refusing blind insertion.');
  html = html.slice(0, at) + block + html.slice(at);
  fs.writeFileSync(file, html);
  console.log('Inserted tier-1 global homepage discovery layer.');
} else {
  console.log('Tier-1 homepage discovery layer already present.');
}
