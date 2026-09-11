#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MARKER = "NEXUSNOVA_CHECKLIST_QUALITY_GAP_20260911"

INSERTS = {
"date-difference-calculator.html": """
<!-- NEXUSNOVA_CHECKLIST_QUALITY_GAP_20260911 -->
<section class="section" data-checklist-quality-gap><div class="container article">
<h2>Limitation: elapsed days are not the same as every official counting rule</h2>
<p>The calculator returns a calendar difference from the dates entered. It does not decide whether a legal, payroll, travel or booking rule counts both boundary dates. For example, an organization may treat both the start date and end date as included even though the raw elapsed gap is one day smaller. Confirm the required counting convention before using the result for an official deadline or eligibility decision.</p>
</div></section>
""",
"discount-calculator.html": """
<!-- NEXUSNOVA_CHECKLIST_QUALITY_GAP_20260911 -->
<section class="section" data-checklist-quality-gap><div class="container article">
<h2>Limitation: a discount result may not be the final checkout total</h2>
<p>The method applies the entered percentage to the entered base price. For example, 20% off 100 gives a discounted price of 80 before any later tax, delivery, service fee or store-specific adjustment. Use the result for the discount step, then verify the retailer's final total separately.</p>
</div></section>
""",
"gamer-name-generator.html": """
<!-- NEXUSNOVA_CHECKLIST_QUALITY_GAP_20260911 -->
<section class="section" data-checklist-quality-gap><div class="container article">
<h2>Method: combine themed name parts, then review the result</h2>
<p>The generator combines themed word fragments to produce candidate gamer tags. For example, a short prefix and a gaming-style suffix can create a memorable starting point, but the generated name is only an idea. Check platform availability, community rules and possible brand or identity conflicts before adopting it publicly.</p>
</div></section>
""",
"pakistan-public-holidays-2026.html": """
<!-- NEXUSNOVA_CHECKLIST_QUALITY_GAP_20260911 -->
<section class="section" data-checklist-quality-gap><div class="container article">
<h2>Worked lookup example</h2>
<p>For example, if you are checking the list after Kashmir Day on 5 February 2026, move down the dated table to the next applicable listed holiday and then read its note to see whether the date is fixed or based on a later notification. Holiday calendars can be revised, especially around religious dates, so confirm the latest government notification before making travel, payroll or office-closure decisions.</p>
</div></section>
""",
"paper-size-converter.html": """
<!-- NEXUSNOVA_CHECKLIST_QUALITY_GAP_20260911 -->
<section class="section" data-checklist-quality-gap><div class="container article">
<h2>Worked example: A4 at 300 DPI</h2>
<p>A4 is 210 × 297 mm. Converting millimetres to inches and multiplying by 300 DPI gives about 2480 × 3508 pixels after rounding. The method is pixels = inches × DPI. Printer drivers, bleed, crop marks and application rounding can change the practical export size, so verify the final document settings before print production.</p>
</div></section>
""",
"pomodoro-timer.html": """
<!-- NEXUSNOVA_CHECKLIST_QUALITY_GAP_20260911 -->
<section class="section" data-checklist-quality-gap><div class="container article">
<h2>Limitation: a timer structures attention but cannot guarantee productivity</h2>
<p>A 25-minute focus block and short break is a common example, not a rule that fits every task or person. Deep work, meetings, accessibility needs and fatigue may require different intervals. Use the timer as a pacing aid, review whether the schedule is helping, and adjust the durations instead of treating one preset as universally optimal.</p>
</div></section>
""",
"qr-code-generator.html": """
<!-- NEXUSNOVA_CHECKLIST_QUALITY_GAP_20260911 -->
<section class="section" data-checklist-quality-gap><div class="container article">
<h2>Method: encode the exact payload, then test the rendered symbol</h2>
<p>The QR method converts the text or URL you enter into a machine-readable QR pattern. For example, a website address should be decoded back to the same address when scanned. Generation does not verify that a destination is safe or that a printed code will scan at every size, so test the final image with a second device before publishing or printing it.</p>
</div></section>
""",
"text-case-converter.html": """
<!-- NEXUSNOVA_CHECKLIST_QUALITY_GAP_20260911 -->
<section class="section" data-checklist-quality-gap><div class="container article">
<h2>Worked example: compare automatic case with the intended wording</h2>
<p>For example, converting “nEXUS nova TOOLS” to title case can produce “Nexus Nova Tools,” while sentence case can produce “Nexus nova tools.” Automatic casing cannot know every brand, acronym or proper-name rule, so review names such as PDF, AI or deliberately stylized brands after conversion.</p>
</div></section>
""",
"youtube-thumbnail-downloader.html": """
<!-- NEXUSNOVA_CHECKLIST_QUALITY_GAP_20260911 -->
<section class="section" data-checklist-quality-gap><div class="container article">
<h2>Method: resolve the video identifier and request known thumbnail variants</h2>
<p>The tool uses the YouTube video reference you provide to form thumbnail-image candidates for that video; it does not download the video itself. For example, a video may expose a standard thumbnail even when a maximum-resolution variant is unavailable. Thumbnail availability and image rights remain controlled by YouTube and the video's owner, so verify the chosen image and permission before reuse.</p>
</div></section>
""",
}

changed=[]
for rel, block in INSERTS.items():
    path=ROOT/rel
    text=path.read_text(encoding="utf-8")
    if MARKER in text:
        continue
    if "</main>" not in text:
        raise RuntimeError(f"Missing </main>: {rel}")
    text=text.replace("</main>", block+"\n</main>", 1)
    path.write_text(text,encoding="utf-8")
    changed.append(rel)

print(f"changed={len(changed)}")
for rel in changed:
    print(rel)
