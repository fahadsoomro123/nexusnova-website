from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MARKER_START = '<!-- NEXUSNOVA_CONTENT_GUIDE_START -->'
MARKER_END = '<!-- NEXUSNOVA_CONTENT_GUIDE_END -->'
CHANGED_OUT = ROOT / 'adsense-content-hardening-changed-files.txt'

GUIDES = {
    'age-calculator.html': {
        'h2': 'How to use the age calculator accurately',
        'p1': 'Enter the date of birth and the date on which you want the age measured. The result is expressed in calendar years, months and days, which is more useful for birthdays, forms and eligibility checks than simply dividing a day count by 365.',
        'p2': 'Calendar arithmetic matters because months have different lengths and leap years add an extra day. If you are comparing dates for an official deadline, always confirm which date the organization treats as the cutoff and whether the start or end date is counted.',
        'tips': ['Use the exact recorded birth date rather than an estimated age.', 'Choose the comparison date explicitly when checking a past or future date.', 'For legal or eligibility decisions, verify the result against the relevant official rules.'],
        'q': 'Why can total days and calendar age look different?',
        'a': 'A fixed number of days does not map evenly to months and years. Calendar age follows real month lengths and leap-year boundaries, so it can differ from a simple days-based estimate.',
    },
    'avif-to-jpg.html': {
        'h2': 'Choosing JPG output from an AVIF image',
        'p1': 'AVIF is designed for efficient modern image compression, while JPG remains widely compatible with older apps, websites and document workflows. Convert to JPG when compatibility matters more than preserving AVIF features such as very efficient compression or transparency.',
        'p2': 'JPG uses lossy compression, so repeated conversions can reduce detail. Keep the original AVIF when possible and convert a copy for sharing. Photographs usually tolerate JPG well, while logos, screenshots and graphics with sharp text may show artifacts at aggressive compression levels.',
        'tips': ['Keep an untouched original before converting.', 'Check fine text, edges and gradients after export.', 'Use PNG instead when you must preserve transparency.'],
        'q': 'Will AVIF to JPG keep transparency?',
        'a': 'No. Standard JPG does not support an alpha transparency channel. Transparent areas must be flattened against a background, so review the converted image before publishing or sending it.',
    },
    'bmi-calculator.html': {
        'h2': 'How to interpret BMI without overreading the number',
        'p1': 'BMI is calculated from weight relative to height and is commonly used as a broad screening measure. It can be useful for quick comparisons, but it does not directly measure body fat, muscle mass, fitness, nutrition or a person’s overall health.',
        'p2': 'Age, pregnancy, body composition and other individual factors can make a BMI number less informative. Treat the result as one piece of context rather than a diagnosis. If a health decision depends on the result, discuss it with a qualified healthcare professional who can consider the full picture.',
        'tips': ['Enter current weight and measured height using the requested units.', 'Do not use BMI alone to judge an individual’s health status.', 'Recheck inputs if the result looks unexpected.'],
        'q': 'Is BMI a medical diagnosis?',
        'a': 'No. BMI is a screening calculation based on height and weight. It cannot diagnose a condition or replace individualized medical assessment.',
    },
    'date-difference-calculator.html': {
        'h2': 'Getting a reliable difference between two dates',
        'p1': 'Choose a start date and an end date to compare the span between them. Date differences are useful for planning projects, tracking waiting periods, measuring time between events and checking how many days remain until a deadline.',
        'p2': 'Be careful with inclusive counting. Some real-world rules count both the first and last day, while many calculators return the elapsed time between the dates. Leap years and different month lengths also mean that a calendar-month description can differ from a simple total-day count.',
        'tips': ['Confirm whether your real-world rule uses inclusive or exclusive counting.', 'Use total days when you need an unambiguous duration.', 'For contractual deadlines, follow the wording in the governing document.'],
        'q': 'Why can months and days give a different-looking answer?',
        'a': 'Calendar months are not all the same length. A result expressed as months plus days follows calendar boundaries, while a total-day value is a fixed elapsed duration.',
    },
    'disclaimer.html': {
        'h2': 'How to use NexusNova information responsibly',
        'p1': 'NexusNova Tools provides general-purpose utilities, calculators, converters and explanatory content for convenience. Outputs can help with everyday tasks, but they are not a substitute for professional judgment when a decision has legal, medical, financial, tax, safety or other high-stakes consequences.',
        'p2': 'Users should verify important inputs, units, dates and source data before relying on any result. Live or third-party information can change, become unavailable or be delayed. Where a page links to an official source, that source should be treated as authoritative for current rules, rates, notices or eligibility requirements.',
        'tips': ['Keep copies of important source documents and inputs.', 'Cross-check high-impact results with an appropriate official or professional source.', 'Report a suspected error through the contact page so it can be reviewed.'],
        'q': 'Does using a NexusNova tool create professional advice?',
        'a': 'No. Using the site does not create a professional-client relationship, and general tool output should not be treated as individualized professional advice.',
    },
    'discount-calculator.html': {
        'h2': 'Checking a discount before you buy',
        'p1': 'A discount calculator helps separate the advertised percentage from the actual amount you pay. Enter the original price and discount rate to estimate the reduction and the price after the discount, then compare that figure with the checkout total.',
        'p2': 'Taxes, delivery fees, minimum-spend rules, coupons and regional pricing can change the final amount charged. If more than one discount applies, the order matters: two successive percentage discounts are usually not the same as adding the percentages together.',
        'tips': ['Use the pre-discount price shown for the exact item or quantity.', 'Check whether tax is calculated before or after the discount.', 'For stacked offers, calculate each discount in the order the seller applies it.'],
        'q': 'Is 20% off plus 10% off the same as 30% off?',
        'a': 'Usually no. Successive discounts are applied to a changing price, so a 20% reduction followed by 10% off the remainder produces a different final price.',
    },
    'emi-calculator.html': {
        'h2': 'Using an EMI estimate for loan comparisons',
        'p1': 'An EMI calculator estimates a regular loan payment from principal, interest rate and repayment term. It is useful for comparing scenarios before you speak with a lender, especially when you want to see how a longer term can lower the monthly payment but increase total interest.',
        'p2': 'Real loan offers may include processing fees, insurance, taxes, changing rates, rounding rules or other charges that are not part of a basic EMI formula. Treat the result as an estimate and compare it with the lender’s official repayment schedule before making a financial commitment.',
        'tips': ['Enter the annual interest rate and term in the units requested by the tool.', 'Compare both the monthly payment and total repayment cost.', 'Use the lender’s official documents for any final borrowing decision.'],
        'q': 'Why can a lender’s EMI differ from the calculator?',
        'a': 'Lenders may use different compounding conventions, fees, payment dates or rounding rules. A simple calculator cannot include charges that were not entered.',
    },
    'gamer-name-generator.html': {
        'h2': 'Turning generated gamer names into a usable handle',
        'p1': 'A name generator is best used as an idea starter rather than a guarantee that a username is available. Generate several options, combine the parts you like, and choose something that is readable enough for teammates to recognize in chat, leaderboards and social profiles.',
        'p2': 'Availability and naming rules differ across games and platforms. Avoid names that impersonate another person or brand, reveal private information, or rely on characters that are hard to type. If you plan to use one identity across several services, check availability before you commit to it.',
        'tips': ['Keep a short list of several acceptable variants.', 'Avoid including your phone number, birth date or other private details.', 'Check the target game’s naming and moderation rules.'],
        'q': 'Does the generator reserve a username?',
        'a': 'No. It only creates ideas. A name can already be taken, restricted or unavailable on the service where you want to use it.',
    },
    'gaming-settings-notes.html': {
        'h2': 'Keeping game settings notes that are actually useful',
        'p1': 'Use this page to record settings you may want to reproduce later, such as sensitivity, field of view, graphics choices or key preferences. Notes are most useful when you also record the game, device and date, because updates and hardware changes can alter how the same values feel.',
        'p2': 'Change one important setting at a time when testing. That makes it easier to understand which adjustment helped or hurt. Avoid copying another player’s settings blindly: mouse DPI, display size, frame rate, controller response and personal comfort can all change the result.',
        'tips': ['Record the game version or date beside important settings.', 'Test one change at a time before saving a new baseline.', 'Keep backup notes before a game update resets preferences.'],
        'q': 'Are another player’s settings guaranteed to work for me?',
        'a': 'No. Hardware, input devices, display characteristics and personal preference all affect how settings feel, so treat shared configurations as a starting point.',
    },
    'image-resizer.html': {
        'h2': 'Resize images without accidentally hurting quality',
        'p1': 'Image resizing changes pixel dimensions, which is different from simply compressing a file. Reducing dimensions can make an image lighter and faster to share, but enlarging a small source cannot recreate detail that was never captured.',
        'p2': 'Start from the highest-quality original you have and keep the aspect ratio locked unless you intentionally want to stretch or crop. For websites, export only as large as the image needs to appear on screen. For print, confirm the required pixel dimensions and print size before resizing.',
        'tips': ['Keep the original file before creating smaller versions.', 'Preserve aspect ratio to avoid distorted faces, logos or objects.', 'Inspect text and fine edges at 100% after resizing.'],
        'q': 'Can resizing make a low-resolution image truly sharper?',
        'a': 'Not by itself. Upscaling adds pixels through interpolation, but it cannot recover original detail that is missing from the source.',
    },
    'ip-cidr-calculator.html': {
        'h2': 'Using CIDR results when planning a network',
        'p1': 'CIDR notation combines an IP address with a prefix length to describe a network range. A calculator can help you understand the network address, broadcast boundary and approximate host range when documenting subnets or checking whether two addresses fall inside the same block.',
        'p2': 'Network equipment and cloud providers can reserve addresses or apply rules that differ from the raw mathematical range. IPv4 private ranges, public routing and security policies also have different implications. Use the calculation for planning, then confirm the actual platform or router configuration before changing production networks.',
        'tips': ['Double-check the prefix length before applying a subnet change.', 'Distinguish private internal ranges from publicly routable addresses.', 'Validate cloud-specific reserved-address rules in the provider documentation.'],
        'q': 'Does every address in a calculated range work as a host?',
        'a': 'Not always. Traditional IPv4 subnets reserve network and broadcast addresses, and cloud platforms may reserve additional addresses for their own services.',
    },
    'jpg-to-png.html': {
        'h2': 'When converting a JPG image to PNG makes sense',
        'p1': 'PNG is useful when you need lossless storage for a new copy, broad support for transparency, or repeated editing without adding another round of JPG compression. Converting an existing JPG to PNG does not restore detail that was already removed by the original JPG compression.',
        'p2': 'The PNG file can be much larger because it stores image data differently. For photographs that will only be viewed or shared, keeping JPG may be more efficient. PNG is often a better fit for interface graphics, screenshots, diagrams and images with crisp text or flat areas of color.',
        'tips': ['Keep the original JPG so you can compare file size and quality.', 'Do not expect conversion to recover lost detail.', 'Choose PNG when lossless re-saving or transparency is important.'],
        'q': 'Will JPG to PNG improve image quality?',
        'a': 'It can prevent additional JPG loss on future saves, but it cannot recreate detail that the source JPG has already discarded.',
    },
    'merge-pdf.html': {
        'h2': 'A safer workflow for merging PDF files',
        'p1': 'Before combining PDFs, put the source files in the order you want them to appear and open each one to confirm it is the correct version. Merging is especially useful for assembling forms, receipts, reports or scanned pages into one document that is easier to send and archive.',
        'p2': 'After creating the merged file, check the first page, last page and several pages in the middle. Confirm page orientation, readability and ordering before sharing. If the documents contain confidential information, also consider whether the device, browser and sharing method are appropriate for that material.',
        'tips': ['Rename source files clearly before arranging them.', 'Verify the final page count against the originals.', 'Keep original documents until the merged copy has been checked.'],
        'q': 'Does merging change the content inside each PDF?',
        'a': 'A basic merge should combine pages rather than rewrite their visible content, but you should still inspect the output because forms, links, metadata or unusual PDF features can behave differently.',
    },
    'minecraft-coordinate-converter.html': {
        'h2': 'Using Minecraft coordinate conversions correctly',
        'p1': 'Coordinate conversion is useful when moving between dimensions or planning travel, portals and builds. The most common use is translating horizontal X and Z positions between the Overworld and the Nether, where the coordinate scale differs. The Y value represents height and is not converted with the same ratio.',
        'p2': 'Terrain, world borders, portal linking behavior and game-version mechanics can affect where you actually arrive. Treat converted coordinates as a planning target, then check the surrounding terrain and build a safe route rather than assuming the exact destination will always be usable.',
        'tips': ['Convert X and Z using the tool’s stated direction.', 'Keep the original coordinates in your notes before travelling.', 'Check elevation and terrain separately at the destination.'],
        'q': 'Why does the Y coordinate behave differently?',
        'a': 'Dimension travel primarily changes the horizontal coordinate scale. Height is governed by each dimension’s terrain and build limits rather than the X/Z travel ratio.',
    },
    'number-to-words.html': {
        'h2': 'Converting numbers to words without transcription mistakes',
        'p1': 'Number-to-words conversion is useful for invoices, cheques, forms, labels and documents where a numeric amount also needs to be written in plain language. Enter the value carefully and compare the generated wording with the original digits before copying it into an important document.',
        'p2': 'Large-number naming conventions and the use of words such as “and” vary by region and style guide. Currency documents may also require a specific format for decimals or minor units. If an organization provides an official wording rule, follow that rule rather than relying on a generic formatter.',
        'tips': ['Recheck every digit before converting a financial amount.', 'Confirm regional wording for large numbers when it matters.', 'Copy the result only after comparing it with the original numeric value.'],
        'q': 'Can wording conventions differ between countries?',
        'a': 'Yes. Large-number names, punctuation and the placement of “and” can vary, so formal documents may require a local or organization-specific style.',
    },
    'online-timer.html': {
        'h2': 'Using an online timer for focused intervals',
        'p1': 'Set a duration that matches the task, start the timer, and keep the tab or device available if you need to hear or see the completion alert. Timers are useful for cooking, study blocks, short exercises, presentations and any task where a simple countdown is enough.',
        'p2': 'Browser behavior can vary when a device sleeps, battery-saving mode is active or a tab is heavily restricted in the background. For safety-critical timing, medical dosing or situations where missing an alert could cause harm, use a dedicated device or approved timer instead of relying only on a browser page.',
        'tips': ['Test the alert before using it for an important session.', 'Keep device volume and notification settings in mind.', 'Use a dedicated timer for safety-critical tasks.'],
        'q': 'Will a browser timer always run perfectly in the background?',
        'a': 'Not necessarily. Operating systems and browsers can throttle background activity or suspend a sleeping device, so important timing should have a reliable backup.',
    },
    'password-strength-checker.html': {
        'h2': 'What a password strength result can and cannot tell you',
        'p1': 'A password strength checker can highlight patterns such as short length, repeated characters or predictable structure. A strong-looking score is not a guarantee that a password is safe, because real security also depends on whether the password is unique, has been exposed elsewhere and how the account protects sign-in.',
        'p2': 'For important accounts, use a long unique password generated and stored by a reputable password manager, or use passkeys where the service supports them. Never reuse a strong password across multiple services, because one breach can then expose several accounts at once.',
        'tips': ['Use a different password for every important account.', 'Prefer long generated passwords over clever substitutions.', 'Enable multi-factor authentication or passkeys when available.'],
        'q': 'Does a high score mean a password cannot be cracked?',
        'a': 'No. Strength estimates are only indicators. Reuse, prior exposure, phishing and account-recovery weaknesses can still compromise an otherwise complex password.',
    },
    'png-to-jpg.html': {
        'h2': 'What changes when you convert PNG to JPG',
        'p1': 'JPG is often smaller for photographs, but it uses lossy compression and does not support transparency. When a PNG contains a transparent background, conversion must flatten those pixels onto a solid background. Check the result carefully if the image will be placed on a colored page or design.',
        'p2': 'Graphics with fine text, logos, icons and sharp edges can look worse in JPG because compression may introduce halos or block artifacts. For photo-heavy images, JPG can be a practical sharing format. For graphics that require crisp edges or transparency, keeping PNG may be the better choice.',
        'tips': ['Check how transparent areas were flattened.', 'Inspect text and logos for compression artifacts.', 'Keep the original PNG if you may need transparency later.'],
        'q': 'Why did my transparent background disappear?',
        'a': 'JPG has no transparency channel, so transparent pixels must become an opaque color during conversion.',
    },
    'pomodoro-timer.html': {
        'h2': 'Using a Pomodoro timer without making focus complicated',
        'p1': 'Choose one clear task before starting a focus interval. Work on that task until the timer ends, then take a real break away from the work if possible. The common 25-minute pattern is only a starting point; longer or shorter intervals can be better for different kinds of work.',
        'p2': 'The method works best when the timer reduces decision-making rather than becoming another thing to manage. If you are repeatedly interrupted, shorten the next interval or remove the source of interruption. For deep creative work, you may prefer longer sessions with fewer context switches.',
        'tips': ['Define one task before pressing start.', 'Use breaks to move, rest your eyes or reset attention.', 'Adjust interval length based on the work rather than forcing one preset.'],
        'q': 'Do I have to use exactly 25 minutes?',
        'a': 'No. The classic interval is popular, but the useful principle is a bounded focus period followed by a deliberate break.',
    },
    'random-number-generator.html': {
        'h2': 'Using random numbers for everyday tasks',
        'p1': 'A random number generator is useful for casual draws, test data, classroom activities, game setup and picking a value within a chosen range. Enter the minimum and maximum carefully so the output reflects the interval you intended.',
        'p2': 'General browser-based random generators should not automatically be treated as cryptographically secure or independently audited. Do not use a casual random-number tool for passwords, encryption keys, regulated lotteries, gambling, security tokens or any high-stakes process that requires certified randomness.',
        'tips': ['Check the minimum and maximum before each draw.', 'Record the result if you need an auditable casual selection.', 'Use a security-grade or regulated system when randomness has legal or security consequences.'],
        'q': 'Is this suitable for cryptographic keys or regulated draws?',
        'a': 'No. Those uses require specialized randomness guarantees, controls and often independent auditing that an everyday utility does not provide.',
    },
    'rgb-hex-converter.html': {
        'h2': 'Working between RGB and HEX color values',
        'p1': 'RGB and HEX are two common ways to describe the same screen colors. RGB lists red, green and blue channel values, while HEX encodes those channel values in hexadecimal notation. Converting between them is useful when moving colors between design tools, CSS, mockups and developer handoff.',
        'p2': 'A matching numeric conversion does not guarantee identical appearance on every screen. Display calibration, color profiles, brightness and browser rendering can change how a color looks. For brand-critical work, verify the final color in the actual design environment and on representative devices.',
        'tips': ['Check that RGB channel values stay within the supported range.', 'Copy all six HEX digits when using the standard form.', 'Preview important colors in the final interface, not only in the converter.'],
        'q': 'Why can the same HEX color look different on two screens?',
        'a': 'The numeric color is the same, but displays can differ in calibration, brightness, gamut and color-management behavior.',
    },
    'roman-numeral-converter.html': {
        'h2': 'Checking Roman numeral conversions',
        'p1': 'Roman numerals are useful for outlines, clocks, titles, events and historical notation. A converter can quickly translate between standard Arabic numerals and the familiar symbols I, V, X, L, C, D and M.',
        'p2': 'Modern tools generally use the conventional subtractive form, such as IV for 4 and IX for 9. Historical inscriptions were not always written with one perfectly consistent standard, and very large numbers may require notation beyond the ordinary symbols supported by a simple converter.',
        'tips': ['Use standard positive whole numbers unless the tool states otherwise.', 'Check formal publishing requirements for unusual historical notation.', 'For large values, confirm that the target system supports the same convention.'],
        'q': 'Why do some old inscriptions use a different form?',
        'a': 'Roman numeral practice varied across periods and contexts. Modern converters usually follow a standardized convention rather than every historical variant.',
    },
    'scientific-calculator.html': {
        'h2': 'Getting dependable results from a scientific calculator',
        'p1': 'Scientific calculators are useful for powers, roots, logarithms, trigonometry and multi-step expressions. Enter one expression at a time and pay close attention to parentheses, signs and angle mode, because a small input difference can change the result dramatically.',
        'p2': 'For trigonometric functions, degrees and radians represent different angle units. For high-precision engineering, scientific or financial work, also consider rounding, significant figures and whether the browser’s numeric precision is sufficient for the task. Verify critical calculations with an independent method.',
        'tips': ['Use parentheses to make the intended order of operations explicit.', 'Confirm degrees versus radians before using trigonometric functions.', 'Keep extra precision during intermediate steps and round only at the end.'],
        'q': 'Why is my trigonometric result unexpected?',
        'a': 'A common cause is using radians when the input was intended as degrees, or the reverse. Check the selected angle convention and the expression.',
    },
    'split-pdf.html': {
        'h2': 'Splitting a PDF while keeping pages organized',
        'p1': 'Use PDF splitting when you need only selected pages from a larger document or want to separate one file into smaller parts. Before starting, note the page numbers you need and remember that printed page labels can differ from the PDF viewer’s numeric page positions.',
        'p2': 'After exporting, open every new file and confirm the first and last page, page order and readability. Keep the original PDF until you are sure nothing was omitted. If the document contains confidential material, use an appropriate device and sharing method for that level of sensitivity.',
        'tips': ['Write down the required page range before splitting.', 'Verify each exported file rather than trusting the filename alone.', 'Keep the source PDF until the new files have been checked and backed up.'],
        'q': 'Why can page numbers in the document differ from the PDF page count?',
        'a': 'A document may include covers, front matter or custom printed numbering, while a PDF viewer counts every page in file order.',
    },
    'stopwatch.html': {
        'h2': 'Using a browser stopwatch for elapsed time',
        'p1': 'A stopwatch measures elapsed time from a start point and is useful for practice sessions, demonstrations, workouts, simple experiments and productivity tracking. Use lap or reset controls only when you are sure you no longer need the previous measurement.',
        'p2': 'Browser timing can be affected by device sleep, heavy system load or background-tab restrictions. For casual measurement this is usually acceptable, but competitions, laboratory work, medical use or other precision-critical timing should rely on equipment designed and validated for that purpose.',
        'tips': ['Keep the device awake for important measurements.', 'Record lap values before resetting the stopwatch.', 'Use dedicated timing equipment when formal accuracy is required.'],
        'q': 'Is a browser stopwatch certified for competition timing?',
        'a': 'No. It is a convenience tool and should not replace certified or purpose-built timing equipment where official precision matters.',
    },
    'unit-converter.html': {
        'h2': 'Avoiding mistakes when converting units',
        'p1': 'Unit conversion is most reliable when you identify both the quantity and the exact units before entering a value. Similar names can represent different systems, and a misplaced prefix such as milli-, centi- or kilo- can change the result by a large factor.',
        'p2': 'For everyday length, mass, temperature and volume conversions, a calculator is a convenient way to avoid mental arithmetic. In engineering, medicine, laboratory work or regulated documentation, confirm the unit definition, required precision and rounding rules from the relevant standard before using the result.',
        'tips': ['Write the source unit beside the number before converting.', 'Check the destination unit after copying the result.', 'Keep sufficient decimal precision until the final step.'],
        'q': 'Why should I avoid rounding too early?',
        'a': 'Rounding an intermediate value can compound error in later calculations. Keep extra digits during conversion and round only to the precision the final task requires.',
    },
    'unix-timestamp-converter.html': {
        'h2': 'Converting Unix timestamps without time-zone confusion',
        'p1': 'A Unix timestamp represents elapsed time from a standard epoch, which makes it useful for logs, APIs and database records. The important first check is whether the value is expressed in seconds or milliseconds, because mixing the two can produce a date thousands of years away from the expected result.',
        'p2': 'Timestamps are commonly interpreted relative to UTC, while a displayed calendar time can be converted to a local time zone. When debugging an event, record the original timestamp and the time zone used for display so another person can reproduce the same result.',
        'tips': ['Check the number of digits to distinguish seconds from milliseconds.', 'Keep UTC as a neutral reference when comparing systems.', 'Record the display time zone when sharing a converted date.'],
        'q': 'Why is my converted date wildly wrong?',
        'a': 'The most common cause is treating a millisecond timestamp as seconds, or seconds as milliseconds. Confirm the unit before investigating other causes.',
    },
    'webp-to-jpg.html': {
        'h2': 'Converting WebP to JPG for compatibility',
        'p1': 'WebP is common on modern websites because it can provide efficient compression, while JPG remains widely supported in older software and document workflows. Convert a copy when an app or service does not accept WebP and the image is mainly photographic.',
        'p2': 'JPG does not support transparency and uses lossy compression, so the converted file can lose some detail or flatten transparent areas. Keep the WebP original when possible. For logos, screenshots or graphics with sharp text, PNG may preserve edges better than JPG even if the file is larger.',
        'tips': ['Keep the WebP source as the master copy.', 'Inspect transparent areas and fine details after conversion.', 'Prefer PNG when transparency or crisp graphics matter.'],
        'q': 'Will the JPG always be smaller?',
        'a': 'Not necessarily. File size depends on image content, dimensions and compression settings, so compare the actual outputs rather than assuming one format is always smaller.',
    },
    'webp-to-png.html': {
        'h2': 'When WebP to PNG is the better conversion',
        'p1': 'PNG is a useful target when you need broad support for lossless graphics or transparency in a workflow that does not accept WebP. It is especially suitable for screenshots, logos, interface elements and images where crisp edges matter more than the smallest possible file size.',
        'p2': 'A PNG made from a lossy WebP cannot recreate detail already removed from the WebP source. It can, however, avoid adding another lossy compression step during later edits. Because PNG files can be larger, compare output size before using them on bandwidth-sensitive pages.',
        'tips': ['Use PNG when transparency or lossless re-saving is important.', 'Keep the original WebP for comparison and future exports.', 'Check file size before replacing web assets in production.'],
        'q': 'Does converting WebP to PNG restore lost detail?',
        'a': 'No. The conversion changes the container and compression method, but it cannot recover image information that is missing from the source.',
    },
}


def esc(value: str) -> str:
    return html.escape(value, quote=False)


def render_guide(item: dict[str, object]) -> str:
    tips = ''.join(f'<li>{esc(str(tip))}</li>' for tip in item['tips'])
    return (
        '\n' + MARKER_START + '\n'
        '<section class="section" data-nexusnova-content-guide><div class="container article">'
        f'<h2>{esc(str(item["h2"]))}</h2>'
        f'<p>{esc(str(item["p1"]))}</p>'
        f'<p>{esc(str(item["p2"]))}</p>'
        '<h3>Practical checks</h3>'
        f'<ul>{tips}</ul>'
        '<h3>Quick FAQ</h3>'
        f'<p><strong>{esc(str(item["q"]))}</strong> {esc(str(item["a"]))}</p>'
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
    updated = raw[:match.start()] + render_guide(item) + raw[match.start():]
    path.write_text(updated, encoding='utf-8')
    return True


def main() -> None:
    changed: list[str] = []
    missing = [name for name in GUIDES if not (ROOT / name).exists()]
    if missing:
        raise SystemExit('Missing target pages: ' + ', '.join(missing))

    for name, item in GUIDES.items():
        path = ROOT / name
        if inject(path, item):
            changed.append(name)
            print(f'Hardened {name}')
        else:
            print(f'Already hardened {name}')

    CHANGED_OUT.write_text('\n'.join(changed) + ('\n' if changed else ''), encoding='utf-8')
    print(f'Changed pages: {len(changed)}')
    print(f'Target pages: {len(GUIDES)}')


if __name__ == '__main__':
    main()
