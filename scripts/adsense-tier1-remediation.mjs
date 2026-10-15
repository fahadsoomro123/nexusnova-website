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
  'index.html','404.html','tools.html','categories.html','articles.html','guides.html','faq.html',
  'about.html','contact.html','privacy.html','terms.html','disclaimer.html',
  'editorial-policy.html','editorial-team.html','tool-methodology.html','account-deletion.html',
  'cancellation-policy.html','digital-delivery-policy.html','refund-policy.html','humanproof.html',
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
function files() { return fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && !excluded.has(f)); }
function read(file) { return fs.readFileSync(path.join(ROOT, file), 'utf8'); }
function clean(s) { return s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }
function titleOf(html, file) { const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i); return clean(m?.[1] || file.replace(/\.html$/, '').replace(/[-_]+/g, ' ')); }
function canonicalOf(html, file) { const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i); return m?.[1] || `https://nexusnovatools.com/${file}`; }
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
function specificExample(file, tool, k) {\n  const examples = {
  "age-calculator.html": "Test a known birth date against a selected reference date. Check whether the output reports completed years, months, days, or a combination, and remember that eligibility rules can define age differently from elapsed time.",
  "ai-token-calculator.html": "For a prompt estimate, test representative instructions, a user message, and an expected completion. Token counts are not word counts: the tokenizer for the deployed model, hidden system messages, tool definitions, and message formatting can change the total, so treat this as planning guidance rather than an exact provider bill.",
  "ai-vram-calculator.html": "Separate model-weight memory from runtime needs. Precision and quantization affect the weights, while batch size, context length, key-value cache, activations, and framework overhead can add materially to memory usage. Compare the estimate with the intended model and inference settings before deploying.",
  "avif-to-jpg.html": "Test an AVIF image with fine edges, gradients, and transparent areas. JPEG does not preserve transparency, and conversion cannot restore detail that was absent in the source. Inspect the output at its publication size and keep the original if color or compression artifacts matter.",
  "bill-split-tip-calculator.html": "Enter the pre-tax subtotal, decide whether the tip percentage is based on the pre-tax or after-tax amount, and state whether the tip is shared evenly. With uneven contributions, compare each share to the agreed split and account for rounding so payments add back to the bill total.",
  "bmi-calculator.html": "Enter height and weight in matching units, then verify the conversion before interpreting the number. BMI is a screening measure rather than a direct measurement of body fat or individual health; age, pregnancy, muscle mass, and clinical context change what the result means. Discuss personal concerns with a qualified clinician.",
  "calculator.html": "Test order of operations, brackets, decimals, and negative numbers with an expression whose answer you already know. Compare multiplication-plus-addition with the same expression grouped in parentheses. This can reveal a missed bracket or unexpected rounding before using a longer calculation.",
  "csv-json-converter.html": "Try a small CSV sample with a quoted comma, an empty field, a header row, and a value that looks numeric but should remain text. Confirm how quotes, line breaks, arrays, objects, field names, and character encoding are handled before importing the output into another application.",
  "date-difference-calculator.html": "Choose two dates with a known interval and check whether the result counts the start day, the end day, or only elapsed days. Month lengths, leap days, and time-zone boundaries can affect scheduling. For an employment, booking, or filing deadline, confirm the governing inclusive-counting rule.",
  "decision-matrix-calculator.html": "List criteria that genuinely matter, assign weights before scoring options, and check that the weight total follows the tool's convention. Score each option against the same scale, then change an important weight slightly. If the ranking reverses easily, use it to guide discussion rather than as an objective verdict.",
  "discount-calculator.html": "Start with the listed price and apply discounts in the same order the seller uses. Consecutive percentage reductions are usually not equivalent to adding the percentages together. Shipping, sales tax, coupons, exclusions, and retailer rounding may change the checkout total, so compare with the final order summary.",
  "edpi-calculator.html": "Multiply mouse DPI by the in-game sensitivity for the specified game to get eDPI, then compare values only when the game and relevant settings are compatible. Game-specific yaw, scoped sensitivity, field of view, and input settings can affect perceived movement, so eDPI is useful but not a universal feel measurement.",
  "electricity-bill-calculator-pakistan.html": "Enter billed energy units rather than the meter's cumulative reading, and identify the billing period. A Pakistan electricity bill can include tariff slabs, fuel adjustments, taxes, fixed charges, and distributor-specific line items. Compare each assumption with the current bill and notified tariff; treat the output as an estimate.",
  "emi-calculator.html": "Test principal, annual interest rate, and loan term separately before reviewing the monthly instalment. Check whether the rate is nominal or effective, how repayment frequency is defined, and whether fees, insurance, variable rates, or balloon payments are excluded. The result is not a lender's offer unless those terms are represented.",
  "fbr-tax-calculator-pakistan.html": "Select the correct tax year and confirm income category, applicable slabs, exemptions, allowances, and withholding assumptions. Pakistani tax rules and thresholds can change, and final liability may depend on several income streams. Verify current provisions and filing instructions with the Federal Board of Revenue or a qualified tax professional.",
  "fps-frame-time-calculator.html": "Frame time can be estimated as 1,000 divided by frames per second, in milliseconds, at a stable frame rate. Compare that value with the display refresh target and remember that a high average FPS can hide stutter from uneven frame pacing or slow percentile frames.",
  "gaming-sensitivity-converter.html": "Record the source game, sensitivity value, mouse DPI, and target game's conversion method before comparing outputs. Games can use different yaw values, aim multipliers, field-of-view behavior, and scoped modifiers, so a converted number may not feel identical. Test it in a practice session and change one variable at a time.",
  "heic-to-jpg.html": "Test a sample HEIC image with portrait detail, gradients, and metadata you need to retain. JPEG is broadly compatible but does not support transparency, and conversion can alter compression or embedded metadata. Check orientation, color, file size, and the exported image before replacing the original.",
  "ip-cidr-calculator.html": "Enter an IPv4 address and prefix, then verify the network address, mask, broadcast address, and usable-host range against a second calculation. Prefix edge cases, point-to-point networks, reserved ranges, and IPv6 rules require separate treatment. A valid subnet calculation does not prove that a network is reachable or secure.",
  "jpg-to-pdf.html": "Before exporting, decide page size, image order, orientation, and whether images should be fitted or cropped. Mixed portrait and landscape files may need per-page sizing to avoid distortion. Open the PDF to confirm readability; image-to-PDF conversion does not automatically create searchable OCR text or remove sensitive image information.",
  "jpg-to-png.html": "Check whether PNG is useful for the next editing step before converting. Changing a JPEG into PNG does not recover detail already lost or create transparency that was not in the source. Compare dimensions, file size, and visual quality before replacing an existing asset.",
  "minecraft-coordinate-converter.html": "Confirm source and target dimensions before converting coordinates. In standard Minecraft Overworld-to-Nether travel, horizontal coordinates use an 8-to-1 relationship, but vertical coordinates do not use that same scale; edition, version, structures, portals, and mods affect practical results. Verify the destination in the world before making a long trip.",
  "number-to-words.html": "Test with a whole number, a decimal, a negative value, and a larger grouped value. Financial records may require specific currency wording, decimal treatment, and locale conventions; ordinary number-to-words output is not automatically cheque-ready or legally compliant. Check spelling and locale before copying it into a formal record.",
  "online-timer.html": "Set a short test duration and confirm alert behavior, browser audio permissions, and what happens when the tab is backgrounded. Browsers may throttle background activity, while device sleep can affect alert timing. For a deadline, lab procedure, or safety-critical interval, use an independent timer.",
  "paper-size-converter.html": "Choose source and target standards before comparing dimensions. ISO A-series sizes, US Letter, US Legal, and regional formats differ, and print margins can reduce usable area further. For a print-ready file, confirm dimensions in the destination software and check whether scaling, bleed, or page orientation is required.",
  "percentage-calculator.html": "Identify the base value before calculating a percentage. The same percentage applied to different bases yields different amounts, and reversing the question can change the result. Record whether the requested output is a share of a total, the percentage amount, or a new total after an increase or reduction.",
  "percentage-change-calculator.html": "Use the earlier value as the baseline and the later value as the comparison point. Percentage change is commonly calculated as (new value minus old value) divided by the old value, multiplied by 100. A zero starting value makes the ratio undefined, and a negative baseline needs careful interpretation.",
  "pomodoro-timer.html": "Choose a focus interval and break duration that fit the work, then decide how interruptions will be recorded. Pausing, extending, or restarting a session changes how comparable sessions are. Review a few cycles and adjust the schedule to the task instead of assuming one interval works for everyone.",
  "rgb-hex-converter.html": "RGB channels generally range from 0 to 255, while a six-digit hexadecimal color represents red, green, and blue in base 16. Verify channel order and any alpha setting separately because a six-digit hex code does not include transparency. Compare the converted color in its actual CSS or display context.",
  "roman-numeral-converter.html": "Check that the input falls within the converter's supported range and that subtractive forms follow the intended convention, such as IV rather than IIII for four. Roman numerals lack one universal convention for every large number, zero, or decimal representation, so confirm the required style for formal or historical use.",
  "salary-tax-calculator-pakistan.html": "Use the relevant tax year and distinguish gross salary from taxable income after any applicable treatment of benefits and deductions. Withholding, other income, tax credits, and annual slab changes may affect the final amount. Compare the estimate with current FBR guidance and payroll records.",
  "scientific-calculator.html": "Check whether trigonometric functions use degrees or radians, then test parentheses, powers, roots, logarithms, and scientific notation with a known result. Very large or small values can show floating-point rounding effects. For coursework or lab work, record the units and significant figures too.",
  "social-security-cola-calculator-2027.html": "Treat a 2027 COLA percentage as hypothetical unless the Social Security Administration has officially announced that year's adjustment. This tool illustrates how a chosen percentage changes a starting benefit amount; it does not predict eligibility, Medicare premiums, withholding, or a personal award. Check the SSA's latest publication before planning benefits.",
  "steam-playtime-calculator.html": "Confirm whether the source is hours, minutes, or another platform-reported value before converting it into days or weeks. Time reported by a game platform can reflect the game being open rather than active attention, and rounding can change totals. Use the result as a rough personal summary, not proof of work or engagement.",
  "stopwatch.html": "Run a short practice interval and compare start, lap, split, and reset behavior before timing the actual task. Human reaction time limits manual starts and stops, and background tabs or device sleep can affect reliability. Keep the measurement method consistent when comparing attempts.",
  "storage-size-converter.html": "Check whether the source uses decimal units such as GB or binary units such as GiB. Manufacturers and operating systems may label capacity differently, so correct displays can show different numbers for the same device. Compare unit definitions before deciding that storage is missing or a transfer size is wrong.",
  "text-case-converter.html": "Use a sentence with acronyms, names, punctuation, and mixed capitalization to inspect the selected rule. Title-case conventions vary by style guide, and automatic changes may alter brand names, code identifiers, file paths, or abbreviations. Review transformed text before publishing or saving a data field.",
  "text-diff-checker.html": "Compare two short versions with an inserted line, a deleted phrase, repeated whitespace, and a changed character. Decide whether case, punctuation, and line endings should count as differences because those settings change the output. Remove credentials or private content from either version before sharing a diff.",
  "time-duration-calculator.html": "Check whether the interval crosses midnight and whether both times use the same time zone. Breaks, daylight-saving transitions, and inclusive scheduling rules can alter durations used for payroll or booking. Record the exact start/end convention whenever another person may review the total.",
  "unit-converter.html": "Confirm the physical quantity and source unit before selecting a target unit. Similar labels can describe different dimensions, such as mass versus force or energy versus power, and converting between them requires more than changing the unit label. Keep the original number, unit symbol, and rounding precision in technical notes.",
  "unix-timestamp-converter.html": "Check whether the value represents seconds or milliseconds since the Unix epoch, then choose the intended UTC or local-time display. A factor-of-1,000 mismatch can move a date far into the past or future, while a time-zone offset changes the displayed clock without changing the instant. Verify the source system's convention.",
  "word-counter.html": "Paste a representative draft with a heading, contractions, hyphenated terms, a list, and punctuation to see how the counter treats them. Editors and submission platforms use different rules for words, characters, and spaces, so the result may differ from a publisher's count. For strict limits, check in the destination system.",
  "zakat-calculator-pakistan.html": "List eligible assets separately from liabilities, then check the valuation date, applicable nisab threshold, asset type, and lunar-year assumptions. Treatment can vary by asset and scholarly guidance; this tool is a calculation aid rather than a religious ruling. Confirm the method with a qualified scholar or trusted authority."
};\n  if (examples[file]) return examples[file];\n  if (k === 'word') return 'For ' + tool + ', compare a short sample with a manually checked result and confirm the destination application uses the same counting convention.';\n  if (k === 'timer') return 'For ' + tool + ', run a short trial first and verify interval boundaries, alert behavior, and browser or device limitations before using it for a longer session.';\n  if (k === 'converter') return 'For ' + tool + ', keep a copy of the original input, confirm source and target formats, then inspect the converted output in the application that will use it.';\n  if (k === 'text') return 'For ' + tool + ', test representative content with punctuation, edge cases, and formatting that matter to the destination workflow before transforming a full document.';\n  return 'For ' + tool + ', write down a known input, estimate a reasonable output, and compare the result with an independent check before using it in a consequential workflow.';\n}\n\nfunction guide(title, file, k) {
  const tool = title.replace(/\s*\|\s*NexusNova.*$/i, '').trim();
  const url = `https://nexusnovatools.com/${file}`;
  return `<!-- ${marker} -->\n<section class="nn-tier1-guide" aria-labelledby="tier1-guide-title">\n  <div class="container">\n    <span class="nn-step-label">PRACTICAL GUIDE</span>\n    <h2 id="tier1-guide-title">How to use ${tool} for everyday work and study</h2>\n    <p><strong>${tool}</strong> is designed for ${audience(k)}. For ${tool}, the real benefit comes from applying the output correctly, not merely seeing a number or transformed value. For ${tool}, enter source information carefully, then read the output in light of the assumptions that produced it. Use ${tool} as a focused browser step when a quick check would otherwise mean setting up a separate spreadsheet.</p>\n    <h3>Worked example: ${tool}</h3>\n    <p>${specificExample(file, tool, k)}</p>\n    <h3>Start with the inputs, not the answer</h3>\n    <p>Before running ${tool}, review the fields it actually uses, such as dates, units, text, quantities, or settings. Freelancers can use this step when preparing a quote, invoice, proposal, delivery estimate, or client-facing explanation. Remote workers can use it when a task arrives in a format that does not match the convention used by the rest of the team. Students can use it as a verification step after doing the underlying work themselves. If the source value is wrong, a perfectly calculated result is still wrong, which is one of those small human tragedies computers are powerless to prevent.</p>\n    <h3>A practical US workflow</h3>\n    <p>When a US freelancer uses ${tool}, retaining the source value beside the output makes the check easier to explain later. Record the amount, quantity, duration, word count, unit, or text version that was entered, then record the result produced by this tool. A remote teammate can document how ${tool} was used in a project ticket, letting colleagues repeat the same steps. For coursework, ${tool} works best alongside the original exercise: compare both to catch arithmetic, formatting, or conversion mistakes without skipping the learning step. Keeping the inputs with ${tool}'s output gives a client or teammate a trail to review instead of a number with no explanation.</p>\n    <h3>When the result needs a second check</h3>\n    <p>If ${tool} is used for a contract, tax return, payroll choice, school requirement, or another consequential task, verify the result independently before relying on it. ${tool} can speed up a routine calculation or transformation, but it cannot infer special project assumptions or know every change made by an outside authority. Before acting on ${tool}'s result, check its inputs, reproduce important figures independently, and ask the responsible organization about official requirements. ${tool} is a practical utility, not a substitute for professional advice or an official record.</p>\n    <h3>Tips for repeat use</h3>\n    <ul><li>For ${tool}, choose a unit and rounding convention and apply it consistently across the task.</li><li>Save the inputs used by ${tool} alongside its output whenever a client or teammate may ask how the result was reached.</li><li>Only provide ${tool} with information required for its task; leave out client secrets and unrelated confidential details.</li><li>When sending a ${tool} result to a client, label estimates clearly and state the assumptions that matter.</li><li>For an assignment involving ${tool}, follow the instructor's rules about permitted calculators, outside assistance, and submitted work.</li></ul>\n    <h3>Limitations and privacy</h3>\n    <p>What ${tool} returns depends on the information supplied and the method implemented on this page. ${tool} may not cover every unusual input, local requirement, product-specific convention, or future change. If ${tool} displays live or external data, check the stated source and timestamp instead of assuming the value stays current. For sensitive work, use the minimum information necessary. The best way to use ${tool} is to understand the assumptions and verify consequential outputs rather than treating convenience as official authority.</p>\n    <p class="nn-tier1-source-note">Page-specific reference: <a href="${url}">${tool}</a>. This guide explains practical cases for ${tool}, including the points where its result needs independent confirmation.</p>\n  </div>\n</section>`;
}
function faq(title) {
  const tool = title.replace(/\s*\|\s*NexusNova.*$/i, '').trim();
  const questions = [
    [`What is ${tool} used for?`, `${tool} helps complete the specific task represented by its fields and output. Use its result as a routine check, then confirm that the inputs fit the problem you are actually solving.`],
    [`Can freelancers use ${tool} for client work?`, `A freelancer can use ${tool} while preparing routine client work, but any quoted amount, converted asset, or consequential output should be checked against the client's assumptions before delivery.`],
    [`Can students use ${tool}?`, `A student can use ${tool} to check a worked attempt when course rules permit outside tools. The student should still show their own reasoning and follow the instructor's submission requirements.`],
    [`Is the result an official or professional determination?`, `No. The output from ${tool} is informational, not an official determination. Confirm regulated decisions, formal requirements, and professional advice with the appropriate authority or qualified professional.`],
    [`What should I do if the result looks wrong?`, `If ${tool} produces an unexpected result, check its inputs, units, dates, and rounding settings. Reproduce an important result independently and compare the methods before relying on it.`]
  ];
  const entities = questions.map(([q,a]) => ({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}));
  return `\n<section class="nn-tier1-faq" aria-labelledby="tier1-faq-title"><div class="container"><h2 id="tier1-faq-title">Frequently asked questions about ${tool}</h2>${questions.map(([q,a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div></section>\n<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'FAQPage','mainEntity':entities})}</script>`;
}
function webAppSchema(title, canonical) {
  const tool = title.replace(/\s*\|\s*NexusNova.*$/i, '').trim();
  return `<script data-nexusnova-tier1-webapp type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'WebApplication','name':tool,'url':canonical,'applicationCategory':'UtilitiesApplication','operatingSystem':'Any','isAccessibleForFree':true,'publisher':{'@type':'Organization','name':'NexusNova Tools','url':'https://nexusnovatools.com/'}})}</script>`;
}
function ymylNotice(file, title) {
  const s = `${file} ${title}`.toLowerCase();
  if (!/(tax|salary|currency|gold|fuel|fbr|emi|social-security|cola)/.test(s)) return '';
  const refs = /social-security|cola/.test(s) ? '<a href="https://www.ssa.gov/cola/" rel="noopener">Social Security Administration (SSA)</a>' : /fbr/.test(s) || /salary|tax/.test(s) ? '<a href="https://www.fbr.gov.pk/" rel="noopener">Federal Board of Revenue (FBR)</a>' : /currency/.test(s) ? '<a href="https://www.sbp.org.pk/" rel="noopener">State Bank of Pakistan (SBP)</a>' : /fuel/.test(s) ? '<a href="https://ogra.org.pk/" rel="noopener">OGRA</a>' : '<a href="https://www.sbp.org.pk/" rel="noopener">State Bank of Pakistan (SBP)</a> and the relevant official market/source publication';
  return `<aside class="nn-ymyl-disclaimer" aria-label="Financial information disclaimer"><strong>Informational use only:</strong> This ${clean(title)} result is an estimate or reference, not financial, tax, legal, investment, payroll, or other professional advice. Rules, rates, prices, thresholds, exchange values, and official requirements can change. Verify important decisions against the current official source, including ${refs}, before filing, paying, contracting, or relying on the result.</aside>`;
}

let changed = 0;
for (const file of files()) {
  const original = read(file);
  let html = original;
  const title = titleOf(html, file);
  const canonical = canonicalOf(html, file);
  const robots = (html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)/i)?.[1] || '').toLowerCase();
  const indexable = !robots.includes('noindex');
  const isTool = indexable && (/data-tool=|nexusnova-tool-shell|applicationCategory|WebApplication/.test(html));
  if (indexable && isTool && !/WebApplication/.test(html)) {
    html = html.replace(/<\/head>/i, `  ${webAppSchema(title, canonical)}\n</head>`);
  }
  const k = kind(file, title);
  const isGeneric = indexable && genericPatterns.some(re => re.test(`${file} ${title}`));
  if (isGeneric) {
    const insertion = `${guide(title,file,k)}\n${faq(title)}\n`;
    const markerStart = html.indexOf(`<!-- ${marker} -->`);
    if (markerStart >= 0) {
      const faqStart = html.indexOf('<section class="nn-tier1-faq"', markerStart);
      const schemaStart = faqStart >= 0 ? html.indexOf('<script type="application/ld+json">', faqStart) : -1;
      const schemaClose = schemaStart >= 0 ? html.indexOf('</script>', schemaStart) : -1;
      const oldSchema = schemaStart >= 0 && schemaClose >= 0 ? html.slice(schemaStart, schemaClose + 9) : '';
      if (faqStart >= 0 && schemaClose >= 0 && /"@type":"FAQPage"/.test(oldSchema)) {
        html = html.slice(0, markerStart) + insertion + html.slice(schemaClose + 9);
      } else {
        throw new Error(`Cannot safely refresh existing guide/FAQ block in ${file}`);
      }
    } else {
      const mainClose = html.search(/<\/main>/i);
      if (mainClose >= 0) html = html.slice(0, mainClose) + insertion + html.slice(mainClose);
      else html = html.replace(/<\/body>/i, `${insertion}</body>`);
    }
  }
  const disclaimer = ymylNotice(file,title);
  if (disclaimer && !html.includes('nn-ymyl-disclaimer')) {
    const mainOpen = html.match(/<main\b[^>]*>/i);
    if (mainOpen) html = html.slice(0, mainOpen.index + mainOpen[0].length) + `\n${disclaimer}\n` + html.slice(mainOpen.index + mainOpen[0].length);
  }
  if (html !== original) { fs.writeFileSync(path.join(ROOT,file), html); changed++; }
}
console.log(`Tier-1 remediation changed ${changed} HTML files.`);
