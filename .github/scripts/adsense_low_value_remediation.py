from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MARKER_START = '<!-- NEXUSNOVA_ADSENSE_VALUE_START -->'
MARKER_END = '<!-- NEXUSNOVA_ADSENSE_VALUE_END -->'
CHANGED_OUT = ROOT / 'adsense-value-remediation-changed-files.txt'

CONTENT = {
    'calculator.html': {
        'h2': 'Use a basic calculator without losing track of the numbers',
        'p1': 'A basic calculator is most useful when you can reproduce the calculation later. Before entering a multi-step problem, write down the original numbers and decide which operation belongs first. This avoids a common mistake where the correct numbers are entered in the wrong order or an intermediate result is reused accidentally.',
        'example': 'Example: if four items cost 18 each and a fixed 6 is deducted, calculate the item total first (18 × 4 = 72) and then subtract 6 to get 66. Breaking the task into visible steps makes the result easier to check than typing a long expression from memory.',
        'p2': 'Browser calculators use normal digital-number arithmetic, so very long decimals can show floating-point rounding effects. For tax filings, engineering tolerances, legal totals or other high-stakes calculations, confirm the required rounding rule and verify the final figure with the authoritative method.',
        'checks': ['Keep the original numbers visible while calculating.', 'Check whether multiplication or division must happen before addition or subtraction.', 'Round only at the final step unless the real-world rule says otherwise.'],
    },
    'password-generator.html': {
        'h2': 'Turn a generated password into a safer account setup',
        'p1': 'A password generator solves only one part of account security: creating a value that is difficult to guess. The bigger protection comes from using a different password for every important account. Reusing one strong password across email, banking, social media and developer services means a single breach can still expose several accounts.',
        'example': 'A practical workflow is to choose a long generated password, save it in a reputable password manager, and enable multi-factor authentication or a passkey where the service supports it. You should not simplify the generated value just to make it easier to remember if that makes it predictable.',
        'p2': 'Length usually contributes more guessing resistance than clever substitutions such as replacing “a” with “@”. Account recovery, phishing and malware can bypass password strength entirely, so a generated password should be treated as one layer rather than a complete security system.',
        'checks': ['Use a unique generated password per account.', 'Store important passwords in a trusted password manager rather than an unsecured note.', 'Enable a second sign-in factor or passkey where available.'],
    },
    'random-picker.html': {
        'h2': 'Make a random pick that other people can understand',
        'p1': 'For casual choices, the quality of the input list matters as much as the random selection. Remove accidental duplicates unless an item is intentionally meant to have more than one chance, and decide before the draw whether blank entries, repeated names or late additions are allowed.',
        'example': 'Example: for a classroom choice between Ali, Sara, Hina and Omar, enter each name once if every person should have equal weight. If Sara appears twice, the list itself gives Sara two opportunities even if the picking method is otherwise fair.',
        'p2': 'A browser-based picker is suitable for games, classroom activities, informal giveaways and everyday decisions. It should not be treated as an audited system for regulated lotteries, gambling, cryptographic selection or any process where certified randomness and an independent record are required.',
        'checks': ['Review the candidate list before drawing.', 'Remove unintended duplicates.', 'Record the final list and result when an informal draw needs to be explained later.'],
    },
    'edpi-calculator.html': {
        'h2': 'What eDPI tells you—and what it does not',
        'p1': 'eDPI combines mouse DPI and in-game sensitivity into one comparison number. For a simple scale, the calculation is DPI × in-game sensitivity. A player using 800 DPI at 0.50 sensitivity has an eDPI of 400. The same total can be reached with different DPI and sensitivity pairs.',
        'example': 'The number is useful when comparing settings inside the same game or sensitivity system. It does not automatically make sensitivities equivalent across different games because games can use different rotation scales, field-of-view behavior, acceleration rules and input processing.',
        'p2': 'Physical mouse feel also depends on factors eDPI does not include, such as Windows pointer settings, raw-input support, mouse acceleration, polling rate, display size and desk space. When changing settings, keep a known baseline and adjust one variable at a time so you can tell which change actually affected control.',
        'checks': ['Confirm the DPI set on the mouse or its software.', 'Compare eDPI only where the game sensitivity scale is comparable.', 'Save the old settings before testing a new value.'],
    },
    'reaction-time-test.html': {
        'h2': 'Read a reaction-time score as a device-assisted estimate',
        'p1': 'A browser reaction test measures the combined delay between the visual cue, your response, the input device and the browser registering that input. One unusually fast or slow attempt is not very informative, so several trials are more useful than a single result.',
        'example': 'For a casual baseline, run multiple attempts under similar conditions and compare the middle or average result rather than chasing one best score. Repeat on the same device if you want to compare your own performance over time.',
        'p2': 'Display refresh rate, touch-screen latency, mouse hardware, Bluetooth, browser workload, battery-saving modes and background processes can all change the measured time. This makes the tool appropriate for entertainment and personal comparison, not for medical diagnosis, professional sports certification or laboratory-grade measurement.',
        'checks': ['Use the same device when comparing sessions.', 'Run several trials rather than relying on one result.', 'Avoid interpreting small differences as a health or ability diagnosis.'],
    },
    'meta-tag-generator.html': {
        'h2': 'Generate metadata that describes the page instead of stuffing keywords',
        'p1': 'A useful title and meta description should tell a person what the page actually provides. The title is normally the clearest label for the page, while the meta description is a short summary that search engines may choose to use as a snippet. Open Graph and social-card fields help services describe a shared link.',
        'example': 'For a page that resizes images, “Resize Images Online — JPG, PNG & WebP” is clearer than repeating “image resizer” many times. A matching description can explain the main task, supported formats and an important benefit without promising rankings or clicks.',
        'p2': 'Generated tags are a starting point, not an SEO guarantee. Search engines can rewrite snippets, and social platforms can cache previews. After copying the output, review the final HTML, confirm that canonical and social URLs point to the intended page, and test a real share preview before a campaign.',
        'checks': ['Describe the actual page rather than unrelated search terms.', 'Keep URLs absolute and correct when a platform requires them.', 'Test the published page because platforms may cache old metadata.'],
    },
    'whatsapp-link-generator.html': {
        'h2': 'Build a click-to-chat link that works outside your own phone',
        'p1': 'A WhatsApp click-to-chat link normally depends on a phone number written with the international country code and without local formatting characters that the link format does not expect. A pre-filled message can also be included, but spaces and punctuation must be encoded correctly in the URL.',
        'example': 'Before publishing a link on a website, QR code or social profile, test it in a private browser window or on another device. Confirm that it opens the intended conversation and that any pre-filled message appears exactly as expected.',
        'p2': 'Treat phone numbers as personal information. Do not publish someone else’s number without permission, and remember that placing a number in a public link can make it easy for crawlers and visitors to discover. The link only starts a chat; it does not verify the identity or trustworthiness of the recipient.',
        'checks': ['Use the correct international country code.', 'Test the generated link before printing or sharing it widely.', 'Do not expose a private number without the owner’s permission.'],
    },
    'image-compressor.html': {
        'h2': 'Choose compression based on what the image is for',
        'p1': 'Image compression reduces file size by changing how image data is stored, while resizing changes the pixel dimensions. These are different controls: a very large image may benefit from sensible dimensions before compression, and a small image can still look poor if compression is too aggressive.',
        'example': 'For a web photograph, compare the compressed result at the size visitors will actually see. Zooming far beyond normal display size can reveal artifacts that are invisible in use, while text, screenshots and line art usually need closer inspection because blurred edges are easier to notice.',
        'p2': 'Keep the original image as a master copy. Repeated lossy saves can compound quality loss, and some export workflows can change metadata or color information. After downloading a compressed file, check dimensions, readability, transparency where relevant, and whether the size reduction is worth the visual trade-off.',
        'checks': ['Keep the original before compressing.', 'Inspect faces, text, gradients and sharp edges in the output.', 'Compare both visual quality and final file size.'],
    },
    'heic-to-jpg.html': {
        'h2': 'Convert HEIC to JPG when compatibility matters more than HEIC features',
        'p1': 'HEIC can store photographs efficiently, but not every website, document workflow or older application accepts it. JPG is a practical compatibility format for photographs, especially when the receiving service specifically lists JPEG/JPG as supported.',
        'example': 'A useful workflow is to keep the original HEIC file, convert a copy to JPG, and open the JPG in the exact app or upload form where you plan to use it. This checks both compatibility and visual quality before the original is archived or removed from a device.',
        'p2': 'JPG uses lossy compression and does not preserve every feature that may exist in the source container. Metadata, depth information, editing data or transparency-like features can change or disappear depending on the source and conversion path. For important photos, keep the HEIC original even after creating a JPG copy.',
        'checks': ['Keep the HEIC original as the master copy.', 'Inspect the JPG at normal viewing size after conversion.', 'Verify metadata separately if dates, location or camera information matter.'],
    },
    'bmi-calculator.html': {
        'h2': 'A worked BMI example and the limits of the result',
        'p1': 'BMI is weight in kilograms divided by height in metres squared. For example, a person who weighs 70 kg and is 1.75 m tall has a BMI of about 22.9 because 70 ÷ (1.75 × 1.75) ≈ 22.9. Unit conversion errors are a common source of incorrect results, so check the selected measurement system before interpreting the number.',
        'example': 'BMI is designed as a broad screening measure, not a direct measurement of body fat or fitness. Two people with the same BMI can have very different muscle mass, body composition, age and health context.',
        'p2': 'Pregnancy, childhood growth, athletic body composition and some medical situations require different interpretation. Do not use a browser BMI result to diagnose a condition, choose medication or replace individualized medical assessment. If the result affects a health decision, discuss it with a qualified healthcare professional.',
        'checks': ['Confirm height and weight units before calculating.', 'Treat BMI as screening context rather than a diagnosis.', 'Use professional guidance for individual health decisions.'],
    },
    'online-timer.html': {
        'h2': 'Plan the timer around the consequence of missing the alert',
        'p1': 'For study blocks, presentations, cooking reminders and routine tasks, a browser timer is convenient because the countdown is visible alongside the work. Before starting an important session, check device volume, battery level and whether the screen or browser is likely to be suspended.',
        'example': 'If you need a 20-minute focus interval, set the duration, start it, and keep the task definition separate from the timer itself. When the alert ends the interval, record progress before immediately starting another block; this makes the timer a boundary rather than a distraction.',
        'p2': 'Phones and laptops can pause or throttle background browser activity when the device sleeps or enters aggressive battery-saving mode. For medicine, industrial processes, fire safety or any situation where a missed alarm could cause harm, use purpose-built or approved timing equipment rather than relying only on a web page.',
        'checks': ['Test the alert before an important session.', 'Keep the device awake when timing matters.', 'Use dedicated equipment for safety-critical timing.'],
    },
    'stopwatch.html': {
        'h2': 'Measure elapsed time consistently across repeated attempts',
        'p1': 'A stopwatch is most useful when the start and stop rules are defined before the measurement. If you are comparing practice runs or work intervals, start from the same event each time and avoid changing devices between attempts because input and browser delays can differ.',
        'example': 'For an informal exercise drill, record several runs instead of only the fastest. Keeping the same phone or computer and the same start procedure gives a more meaningful comparison than mixing results from different devices.',
        'p2': 'A browser stopwatch is a convenience tool rather than certified timing equipment. Device sleep, heavy system load, background restrictions and human button-press delay can affect results. Official competitions, laboratory experiments, medical tests and compliance measurements should use equipment designed for the required accuracy.',
        'checks': ['Define the start and stop event before measuring.', 'Use the same device for comparisons.', 'Record results before resetting the stopwatch.'],
    },
    'png-to-jpg.html': {
        'h2': 'Know what is lost when a PNG becomes a JPG',
        'p1': 'PNG is commonly used for screenshots, graphics, logos and images that need transparency or lossless storage. JPG is usually a better fit for photographs where a smaller file can be worth some compression loss. Converting between them changes more than the filename extension.',
        'example': 'If a PNG logo has a transparent background, a JPG version cannot keep that transparency. The transparent area must become an opaque background color. Always preview the output on the background where it will actually be used.',
        'p2': 'JPG compression can create halos or block artifacts around text and sharp edges. Keep the PNG original and compare the converted file at 100% zoom before replacing a production asset. For diagrams, interface captures and brand graphics, PNG may remain the better format even if it is larger.',
        'checks': ['Check how transparent areas were flattened.', 'Inspect text and sharp edges for artifacts.', 'Keep the original PNG for future edits.'],
    },
    'jpg-to-png.html': {
        'h2': 'JPG to PNG changes the format, not the detail already captured',
        'p1': 'PNG can be useful for repeated editing, lossless re-saving and workflows that specifically require PNG. Converting a JPG to PNG does not reconstruct detail that JPEG compression already removed, so the new file should not be described as a quality restoration.',
        'example': 'A photo saved as JPG may become a larger PNG without looking sharper. The benefit is that later PNG saves do not add another round of JPEG compression; the cost is often a larger file.',
        'p2': 'If the original image is a photograph and no transparency or lossless editing is needed, keeping JPG can be more efficient. For screenshots, diagrams or text-heavy graphics, start from an original lossless source where possible rather than expecting a JPG-to-PNG conversion to recover crisp edges.',
        'checks': ['Compare actual file sizes after conversion.', 'Do not expect removed JPEG detail to return.', 'Keep the highest-quality original available.'],
    },
    'webp-to-jpg.html': {
        'h2': 'Use JPG as a compatibility copy of WebP',
        'p1': 'WebP is widely used on modern websites because it can provide efficient compression and can support features that JPG does not. Convert to JPG when a receiving service, editor or document workflow does not accept WebP and the image is mainly photographic.',
        'example': 'If a WebP contains transparency, the JPG copy cannot preserve that transparent channel. Preview the background after conversion and inspect any small text or sharp graphics that may be affected by lossy JPEG compression.',
        'p2': 'The JPG is best treated as a delivery copy rather than a replacement master. Keep the WebP source so you can create a different format later without repeatedly recompressing the JPG. File size is content-dependent, so do not assume the JPG will always be smaller.',
        'checks': ['Keep the original WebP.', 'Inspect transparent areas and fine edges after conversion.', 'Compare output size instead of assuming one format is smaller.'],
    },
    'random-number-generator.html': {
        'h2': 'Set the range before the draw, not after seeing the result',
        'p1': 'For an everyday random number, define the minimum and maximum first and confirm whether both endpoints should be allowed. Changing the range after a number has been generated undermines the fairness of an informal draw because the rules were not fixed in advance.',
        'example': 'For a classroom draw from 1 through 30, use 1 as the minimum and 30 as the maximum if every student number should be eligible. Record the chosen range along with the result when another person needs to understand how the number was selected.',
        'p2': 'An everyday browser random-number tool should not be assumed to provide certified or cryptographic randomness. Security keys, authentication tokens, regulated lotteries, gambling and audited scientific sampling can require stronger guarantees, independent controls or specialized systems.',
        'checks': ['Confirm both range endpoints before generating.', 'Record the rules for an informal draw when transparency matters.', 'Use a specialized system for cryptographic or regulated randomness.'],
    },
    'number-to-words.html': {
        'h2': 'Check number wording before using it in a formal document',
        'p1': 'Number-to-words conversion is useful when invoices, forms, cheques or labels need a written version of a numeric value. The safest workflow is to compare the generated wording back to the original digits before copying it into a document.',
        'example': 'For a value such as 1,250, verify that every place value is represented correctly and that no digit was mistyped before conversion. In financial documents, also check how the organization expects decimals or minor currency units to be written.',
        'p2': 'English wording conventions vary by region. The use of “and,” punctuation and large-number names can differ between style guides, and legal or banking forms may impose their own format. Follow the receiving organization’s instructions when they conflict with a generic converter.',
        'checks': ['Recheck the original digits before converting.', 'Confirm regional or organizational wording rules for formal use.', 'Compare the written result back to the number before submission.'],
    },
    'roman-numeral-converter.html': {
        'h2': 'Use modern Roman-numeral conventions with historical caution',
        'p1': 'Most modern converters use the familiar subtractive notation: IV for 4, IX for 9, XL for 40 and so on. This is useful for outlines, clock-style labels, event names and educational work where a standardized modern form is expected.',
        'example': 'For example, 49 is normally written XLIX in modern notation: XL represents 40 and IX represents 9. Breaking a conversion into place values can make an unexpected result easier to verify.',
        'p2': 'Historical inscriptions were not always consistent with one modern standard, and very large values can require notation outside the ordinary I, V, X, L, C, D and M symbols. If you are transcribing an artifact or following a publisher’s house style, use that source’s convention rather than assuming a simple converter covers every historical variant.',
        'checks': ['Use positive whole numbers within the tool’s supported range.', 'Break an unexpected result into place values to verify it.', 'Check the required convention for historical or formal publishing work.'],
    },
    'qr-code-generator.html': {
        'h2': 'Generate a QR code for the final data, then test the final image',
        'p1': 'A QR code stores the exact text or URL supplied to the generator. It does not validate that a website is safe, correct or permanent. For a public QR code, confirm the destination first and use the final production URL rather than a temporary preview link.',
        'example': 'After generating the image, scan it with at least one real phone before printing or publishing. Test again after the QR code has been placed in a poster or design because resizing, low contrast, cropping and insufficient clear space can make a previously valid code difficult to scan.',
        'p2': 'Keep strong contrast between the code and background and preserve the clear quiet zone around the pattern. A static QR code will continue to encode the same data; changing the page behind a URL is different from changing the QR code itself. Unknown QR destinations should be treated with the same caution as unknown links.',
        'checks': ['Verify the exact URL or text before generation.', 'Scan the final exported design, not only the preview.', 'Keep contrast and clear space around the QR pattern.'],
    },
    'image-metadata-remover.html': {
        'h2': 'Verify both the visible image and the metadata result',
        'p1': 'Photo metadata can include camera details, timestamps, orientation information and sometimes location coordinates. Creating a cleaned copy can reduce what is shared alongside the visible pixels, but “metadata” is a broad term and different formats or apps can store information in different places.',
        'example': 'For a privacy-sensitive photo, keep the original privately, create the cleaned copy, then inspect that output with a metadata viewer before posting it. This confirms the actual file you plan to share rather than relying only on an assumption about the conversion process.',
        'p2': 'Removing metadata cannot hide information that is visible inside the picture itself, such as a street sign, document name, face or reflected screen. It also cannot remove copies already uploaded elsewhere. Privacy review should therefore include both file metadata and the visible content of the image.',
        'checks': ['Keep the original in a private location if you may need it later.', 'Inspect the cleaned output before sharing sensitive images.', 'Review visible details as well as metadata.'],
    },
    'split-pdf.html': {
        'h2': 'Check page numbers, forms and signatures after extracting PDF pages',
        'p1': 'PDF viewers count file pages in order, but printed page labels inside a document can start later or use Roman numerals. Before entering a range, compare the pages you need with the viewer’s page positions so a cover or front-matter page is not accidentally omitted.',
        'example': 'For a 10-page PDF, a selection such as 1-3,5 means file pages 1, 2, 3 and 5. Open the exported PDF and verify the first page, last page and total page count before sending it to someone else.',
        'p2': 'Interactive forms, bookmarks, links, attachments, digital signatures and other advanced PDF features can behave differently when pages are extracted into a new document. If those features matter, inspect them explicitly and retain the original PDF until the new file has been checked.',
        'checks': ['Match requested pages to the viewer’s numeric page positions.', 'Verify order and page count in the exported file.', 'Check forms, links or signatures when the source PDF uses them.'],
    },
    'unit-converter.html': {
        'h2': 'A conversion is only as reliable as the unit definition',
        'p1': 'Before converting, identify the physical quantity as well as the unit. Metres and feet are both length units, while litres and kilograms describe different quantities and cannot be converted without extra information such as density. Temperature also needs a formula with an offset rather than a simple multiplication factor.',
        'example': 'For example, converting 2.5 kilometres to metres uses the metric prefix relationship: 2.5 × 1,000 = 2,500 metres. Keeping the source and destination unit written beside the number makes the result easier to audit.',
        'p2': 'Engineering, medical and laboratory work can require exact unit definitions, significant figures and mandated rounding. Keep extra precision during intermediate steps and apply the required rounding rule only to the final result. When a standard or official document defines the units, that source should take priority over a general-purpose converter.',
        'checks': ['Confirm source and destination describe the same quantity.', 'Keep unit labels beside copied numbers.', 'Use the governing standard for regulated or high-precision work.'],
    },
    'pdf-tools.html': {
        'h2': 'Choose a PDF tool based on the document change you actually need',
        'p1': 'PDF tasks are easier to verify when they are separated by purpose. Use merging when complete documents need to become one ordered file, splitting when only selected pages are needed, and image-to-PDF conversion when photographs or scans need to be packaged as pages.',
        'example': 'If you only need pages 4–7 from a report, splitting is safer than merging or rebuilding the document. If several finished PDFs must be submitted together, merge them and then check the final order and total page count.',
        'p2': 'Keep source files until the output has been opened and reviewed. Complex PDFs can contain forms, links, signatures, bookmarks or attachments that deserve a separate check after processing. Sensitive documents also require an appropriate device and sharing method, regardless of which PDF operation is used.',
        'checks': ['Pick the operation that changes the fewest things necessary.', 'Open the output and verify page order and readability.', 'Retain originals until the new document is confirmed.'],
    },
    'image-tools.html': {
        'h2': 'Pick an image tool by deciding whether you need pixels, format or file size changed',
        'p1': 'Resizing changes pixel dimensions, compression targets file size and encoding efficiency, and format conversion changes how image data is stored. These operations can be combined, but doing the minimum necessary usually makes quality easier to preserve.',
        'example': 'A 4000-pixel photo intended for a small web card may first need sensible dimensions and then compression. A transparent logo that only needs broader compatibility may need a format decision instead, because converting to JPG would remove transparency.',
        'p2': 'Always keep the highest-quality original before creating delivery copies. Check transparency, text edges, faces, gradients and metadata according to the task. There is no single “best” image format for every use: photographs, screenshots, logos and print files have different requirements.',
        'checks': ['Decide whether the real goal is dimensions, format, privacy or file size.', 'Keep the original before processing.', 'Inspect the output in the environment where it will be used.'],
    },
    'calculator-tools.html': {
        'h2': 'Choose the calculator that matches the question, not just the numbers',
        'p1': 'Different calculators can use similar inputs while answering different questions. A percentage calculator answers questions such as “what is 15% of 80,” while percentage change compares an old value with a new value. A discount calculator applies a reduction to a price, and an EMI calculator estimates loan payments from financial inputs.',
        'example': 'If a price rises from 80 to 100, use percentage change: the increase is 25% relative to the starting 80. If you only need 25% of 80, use the percentage calculator instead; that answer is 20.',
        'p2': 'Choosing the right formula is more important than entering numbers quickly. Check units, time periods and whether a rate is being treated as a percentage or percentage-point difference. For financial, legal or regulated decisions, compare the result with the authoritative rules or lender documents.',
        'checks': ['State the question in words before choosing a calculator.', 'Check the base value used by percentage formulas.', 'Verify official rules for high-impact calculations.'],
    },
    'productivity-tools.html': {
        'h2': 'Use productivity tools to reduce friction, not to create more tracking work',
        'p1': 'A timer is useful for a bounded work interval, a stopwatch measures elapsed time, a private note captures information quickly, and a meeting planner helps compare time zones. Choose the smallest tool that solves the immediate problem instead of adding a complicated workflow around a simple task.',
        'example': 'For a 25-minute writing block, a timer is enough. For measuring how long a repeated process actually takes, use a stopwatch. For arranging a call across countries, use the meeting planner and record the agreed instant rather than manually adding time-zone offsets.',
        'p2': 'Productivity results are most useful when they lead to an action. Save only the information you need, verify time-zone details for important meetings, and remember that browser timers can be affected by device sleep or background restrictions.',
        'checks': ['Choose the tool that directly matches the task.', 'Record the outcome that affects the next action.', 'Verify timing separately when a missed deadline would matter.'],
    },
    'pakistan-tools.html': {
        'h2': 'Use Pakistan-focused tools with the current official rule beside the calculation',
        'p1': 'Local calculators can be convenient for amounts, rates and planning, but Pakistan-specific taxes, utility tariffs, fuel prices, gold rates and regulatory rules can change. A calculator should therefore be treated as a calculation interface, while the current official source remains authoritative for the input rate or rule.',
        'example': 'If a tax or electricity calculation depends on a tax year or tariff slab, first confirm that period and rate from the relevant authority, then enter those values or use the clearly dated rule shown by the tool. A mathematically correct calculation can still be wrong for the real situation if the underlying rate is outdated.',
        'p2': 'For payments, filings, zakat decisions, contracts or regulated charges, keep the official notice or source used for the calculation. This makes the result easier to verify later and reduces the risk of relying on an old rate after a policy change.',
        'checks': ['Check the effective date or tax year.', 'Prefer official sources for rates and rules.', 'Keep supporting documents for financial or regulatory decisions.'],
    },
}


def esc(value: str) -> str:
    return html.escape(value, quote=False)


def render(item: dict[str, object]) -> str:
    checks = ''.join(f'<li>{esc(str(x))}</li>' for x in item['checks'])
    return (
        '\n' + MARKER_START + '\n'
        '<section class="section" data-adsense-value-remediation><div class="container article">'
        f'<h2>{esc(str(item["h2"]))}</h2>'
        f'<p>{esc(str(item["p1"]))}</p>'
        f'<p><strong>Worked example / practical use:</strong> {esc(str(item["example"]))}</p>'
        f'<p>{esc(str(item["p2"]))}</p>'
        '<h3>Before you rely on the result</h3>'
        f'<ul>{checks}</ul>'
        '</div></section>\n'
        + MARKER_END + '\n'
    )


def inject(path: Path, item: dict[str, object]) -> bool:
    raw = path.read_text(encoding='utf-8', errors='strict')
    if MARKER_START in raw:
        return False
    matches = list(re.finditer(r'</main\s*>', raw, flags=re.I))
    if not matches:
        raise RuntimeError(f'{path.name}: closing </main> not found')
    match = matches[-1]
    updated = raw[:match.start()] + render(item) + raw[match.start():]
    path.write_text(updated, encoding='utf-8')
    return True


def main() -> None:
    changed: list[str] = []
    missing = [name for name in CONTENT if not (ROOT / name).exists()]
    if missing:
        raise SystemExit('Missing remediation target pages: ' + ', '.join(missing))

    for name, item in CONTENT.items():
        if inject(ROOT / name, item):
            changed.append(name)
            print(f'Remediated {name}')
        else:
            print(f'Already remediated {name}')

    CHANGED_OUT.write_text('\n'.join(changed) + ('\n' if changed else ''), encoding='utf-8')
    print(f'Value-remediation pages changed: {len(changed)}')
    print(f'Value-remediation targets: {len(CONTENT)}')


if __name__ == '__main__':
    main()
