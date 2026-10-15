import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const marker = 'NEXUSNOVA-TIER1-GUIDE:v1';
const genericPatterns = [
  /calculator/i, /word-counter/i, /age-calculator/i, /timer/i, /stopwatch/i,
  /unit-converter/i, /converter/i, /text-case/i, /text-diff/i, /number-to-words/i,
  /roman-numeral/i, /percentage/i, /date-difference/i, /time-duration/i
];
const excluded = new Set([
  'index.html','tools.html','categories.html','articles.html','guides.html','faq.html',
  'about.html','contact.html','privacy.html','terms.html','disclaimer.html',
  'editorial-policy.html','editorial-team.html','tool-methodology.html','account-deletion.html',
  'pakistan-tools.html','calculator-tools.html','image-tools.html','pdf-tools.html',
  'productivity-tools.html','network-tools.html','gaming-tools.html','developer-tools.html',
  'new-tools.html','popular-tools.html','smart-tools.html','trending-tools.html','daily-tools-directory.html'
]);
const genericAudience = {
  calculator: 'freelancers estimating project hours, remote workers checking a quick business number, and students validating coursework before submitting it',
  word: 'freelancers preparing proposals and briefs, remote workers checking document limits, and students measuring essays, applications, or research drafts',
  timer: 'remote workers using focused work blocks, freelancers tracking billable sessions, and students managing revision, practice, or exam drills',
  converter: 'freelancers preparing files or measurements for a client, remote teams working across different conventions, and students translating values between units or formats',
  text: 'freelancers cleaning copy for proposals and websites, remote workers normalizing text between systems, and students preparing notes, citations, or assignments',
  default: 'freelancers, remote workers, and students who need a fast browser-based result without installing another application'
};

function files() {
  return fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && !excluded.has(f));
}
function read(file) { return fs.readFileSync(path.join(ROOT, file), 'utf8'); }
function words(s) { return (s.match(/\b[\w'-]+\b/g) || []).length; }
function clean(s) { return s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }
function titleOf(html, file) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return clean(m?.[1] || file.replace(/\.html$/, '').replace(/[-_]+/g, ' '));
}
function canonicalOf(html, file) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i);
  return m?.[1] || `https://nexusnovatools.com/${file}`;
}
function kind(file, title) {
  const s = `${file} ${title}`.toLowerCase();
  if (/word-counter|word count/.test(s)) return 'word';
  if (/timer|stopwatch|pomodoro|reaction-time/.test(s)) return 'timer';
  if (/converter|conversion|unit/.test(s)) return 'converter';
  if (/text-case|text-diff|number-to-words|roman-numeral/.test(s)) return 'text';
  if (/calculator|percentage|bmi|age|date-difference|time-duration/.test(s)) return 'calculator';
  return 'default';
}
function audience(k) { return genericAudience[k] || genericAudience.default; }
function guide(title, file, k) {
  const tool = title.replace(/\s*\|\s*NexusNova.*$/i, '').trim();
  const url = `https://nexusnovatools.com/${file}`;
  const a = audience(k);
  return `<!-- ${marker} -->\n<section class="nn-tier1-guide" aria-labelledby="tier1-guide-title">\n  <div class="container">\n    <span class="nn-step-label">PRACTICAL GUIDE</span>\n    <h2 id="tier1-guide-title">How to use ${tool} for everyday work and study</h2>\n    <p><strong>${tool}</strong> is designed for ${a}. The useful part is not simply getting a number or transformed value on screen. A good workflow is to enter the source information carefully, understand what the result represents, and keep the result consistent with the assumptions that produced it. This page keeps the calculation or conversion in the browser so the routine step can be completed without building a spreadsheet from scratch.</p>\n    <h3>Start with the inputs, not the answer</h3>\n    <p>Before pressing the main action, check the units, dates, text, quantities, or other fields you have entered. Freelancers can use this step when preparing a quote, invoice, proposal, delivery estimate, or client-facing explanation. Remote workers can use it when a task arrives in a format that does not match the convention used by the rest of the team. Students can use it as a verification step after doing the underlying work themselves. If the source value is wrong, a perfectly calculated result is still wrong, which is one of those small human tragedies computers are powerless to prevent.</p>\n    <h3>A practical US workflow</h3>\n    <p>For a US freelancer, a sensible workflow is to keep the original value beside the result in the working document. For example, record the amount, quantity, duration, word count, unit, or text version that was entered, then record the result produced by this tool. A remote worker can use the same approach in a project ticket or shared note so another person can reproduce the check. A student can keep the original exercise beside the verified result and use the tool to spot arithmetic, formatting, or conversion mistakes rather than replacing the learning step. This makes the result auditable and reduces the chance of copying a number without remembering how it was produced.</p>\n    <h3>When the result needs a second check</h3>\n    <p>Use a second source when the result affects a contract, legal filing, tax return, payroll decision, academic requirement, medical decision, or another situation where an error has meaningful consequences. Browser tools are useful for routine calculations and transformations, but they do not know the private assumptions behind a project or the latest rules of an outside authority. Check the input, compare an important result with an independent calculation, and confirm any official requirement with the responsible organization. ${tool} should be treated as a practical utility, not as a substitute for professional advice or an official record.</p>\n    <h3>Tips for repeat use</h3>\n    <ul>\n      <li>Use the same unit and rounding convention throughout a project.</li>\n      <li>Keep source values and final results together when a calculation may need to be explained later.</li>\n      <li>Do not enter unnecessary private or confidential information into a browser tool.</li>\n      <li>For client work, label estimates clearly and confirm the assumptions before sending them.</li>\n      <li>For school work, follow the instructor's rules about calculators, external tools, and submitted work.</li>\n    </ul>\n    <h3>Limitations and privacy</h3>\n    <p>The result depends on the information supplied and on the method implemented by this page. It may not include every edge case, local rule, proprietary convention, or future change. If a page uses live or externally sourced data, check the displayed source and timestamp rather than assuming the value is permanent. For sensitive work, use the minimum information necessary. The safest browser workflow is to verify the result, understand the assumptions, and avoid treating a convenience tool as an authority.</p>\n    <p class="nn-tier1-source-note">Page-specific reference: <a href="${url}">${tool}</a>. This guide is original NexusNova editorial content written to explain practical use of the tool and its limits.</p>\n  </div>\n</section>`;
}
function faq(title, file, k) {
  const tool = title.replace(/\s*\|\s*NexusNova.*$/i, '').trim();
  const url = `https://nexusnovatools.com/${file}`;
  const questions = [
    [`What is ${tool} used for?`, `${tool} is a browser-based utility for completing the task described by its inputs and result fields. It is intended for routine checks and practical workflows.`],
    [`Can freelancers use ${tool} for client work?`, `Yes. Freelancers can use it to prepare or verify routine work, but important client-facing results should be checked against the underlying assumptions before delivery.`],
    [`Can students use ${tool}?`, `Students can use it as a verification and practice aid when their course or instructor permits external tools. The student remains responsible for following the assignment rules.`],
    [`Is the result an official or professional determination?`, `No. A NexusNova result is an informational calculation or transformation. Official requirements, regulated decisions, and professional advice should be confirmed with the responsible authority or qualified professional.`],
    [`What should I do if the result looks wrong?`, `Recheck every input, unit, date, rounding setting, and assumption. For an important result, reproduce it independently and compare the methods before relying on it.`]
  ];
  const entities = questions.map(([q,a]) => ({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}));
  return `\n<section class="nn-tier1-faq" aria-labelledby="tier1-faq-title">\n  <div class="container">\n    <h2 id="tier1-faq-title">Frequently asked questions about ${tool}</h2>\n    ${questions.map(([q,a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('\n    ')}\n  </div>\n</section>\n<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'FAQPage','mainEntity':entities})}</script>`;
}
function webAppSchema(title, file, canonical) {
  if (/WebApplication/.test(read(file))) return '';
  const tool = title.replace(/\s*\|\s*NexusNova.*$/i, '').trim();
  return `<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'WebApplication','name':tool,'url':canonical,'applicationCategory':'UtilitiesApplication','operatingSystem':'Any','isAccessibleForFree':true,'publisher':{'@type':'Organization','name':'NexusNova Tools','url':'https://nexusnovatools.com/'}})}</script>`;
}

let changed = 0;
for (const file of files()) {
  let html = read(file);
  const title = titleOf(html, file);
  const canonical = canonicalOf(html, file);
  const robots = (html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)/i)?.[1] || '').toLowerCase();
  const indexable = !robots.includes('noindex');
  if (indexable) {
    const schema = webAppSchema(title, file, canonical);
    if (schema) {
      html = html.replace(/<\/head>/i, `  ${schema}\n</head>`);
    }
  }
  const k = kind(file, title);
  if (indexable && genericPatterns.some(re => re.test(`${file} ${title}`)) && !html.includes(marker)) {
    const insertion = `${guide(title,file,k)}\n${faq(title,file,k)}\n`;
    const mainClose = html.search(/<\/main>/i);
    if (mainClose >= 0) html = html.slice(0, mainClose) + insertion + html.slice(mainClose);
    else html = html.replace(/<\/body>/i, `${insertion}</body>`);
  }
  if (html !== read(file)) { fs.writeFileSync(path.join(ROOT,file), html); changed++; }
}
console.log(`Tier-1 remediation changed ${changed} HTML files.`);
