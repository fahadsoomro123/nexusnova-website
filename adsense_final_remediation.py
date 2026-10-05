#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent

PRIMARY_NAV_REMOVE = (
    r'<a href="(?:\.\./)?labs\.html"[^>]*>Labs</a>',
    r'<a href="(?:\.\./)?live\.html"[^>]*>LIVE</a>',
)

VALUE_SECTIONS = {
    'daily-tools-directory.html': '''\n<!-- NEXUSNOVA_FINAL_REVIEW_VALUE -->\n<section class="section"><div class="container article"><h2>Choose the focused page when the details matter</h2><p>The directory is a fast starting point, while each linked utility has its own page for inputs, formulas, limitations and related guidance. Use the focused page when you need to bookmark a tool, share it with someone else or understand how a result is produced.</p><p>For private notes, passwords and file-based tools, check the individual page for its data-handling description before entering sensitive information. Different utilities can use different browser features, so the dedicated page is the source of truth for that tool.</p></div></section>\n''',
    'age-calculator.html': '''\n<!-- NEXUSNOVA_FINAL_REVIEW_VALUE -->\n<section class="section"><div class="container article"><h2>Why calendar age is more than dividing days by 365</h2><p>Calendar age depends on actual year and month boundaries, including leap years and different month lengths. A birthday near the end of a month can make a simple day-count approximation misleading, so this tool works from calendar dates rather than assuming every year has the same number of days.</p><p>For official forms, use the date required by the relevant organization and verify the result against the original birth record. Time of birth is not used; this is a date-based age calculation.</p></div></section>\n''',
    'date-difference-calculator.html': '''\n<!-- NEXUSNOVA_FINAL_REVIEW_VALUE -->\n<section class="section"><div class="container article"><h2>Check whether your real task counts both boundary dates</h2><p>A date-difference result normally measures the elapsed gap between two calendar dates. Some legal, travel, payroll or booking rules instead count both the first and last day, which can change the practical answer by one day.</p><p>Use the calculator for the raw calendar gap, then apply the convention required by your task. For deadlines or official eligibility periods, confirm the counting rule with the organization that issued it.</p></div></section>\n''',
    'discount-calculator.html': '''\n<!-- NEXUSNOVA_FINAL_REVIEW_VALUE -->\n<section class="section"><div class="container article"><h2>Discount percentage is not always the final checkout price</h2><p>A percentage discount reduces the entered base price, but a store can still add tax, delivery, service fees or other charges afterward. Two sequential discounts also do not usually equal one discount made by adding their percentages together.</p><p>For example, reducing 100 by 20% and then reducing the remaining 80 by 10% gives 72, not 70. Use the calculator for the stated discount step and compare the final retailer total separately.</p></div></section>\n''',
    'text-case-converter.html': '''\n<!-- NEXUSNOVA_FINAL_REVIEW_VALUE -->\n<section class="section"><div class="container article"><h2>Review names, acronyms and intentional capitalization after conversion</h2><p>Automatic case conversion is useful for cleaning headings, lists and pasted text, but it cannot always know that a word is a brand name, surname, acronym or intentionally stylized term. Title Case can therefore need a quick manual pass.</p><p>Keep a copy of the original when capitalization carries meaning. For code, passwords, identifiers or case-sensitive data, do not convert text unless changing letter case is actually intended.</p></div></section>\n''',
    'gamer-name-generator.html': '''\n<!-- NEXUSNOVA_FINAL_REVIEW_VALUE -->\n<section class="section"><div class="container article"><h2>Generated names are ideas, not guaranteed available usernames</h2><p>The generator combines name patterns for inspiration. It does not check Steam, Xbox, PlayStation, Discord, Riot, social networks or trademark databases, so a generated result may already be used by someone else.</p><p>Before adopting a name publicly, check availability on the platform you care about and avoid impersonating another person, team or brand. Small spelling changes can help create a distinct identity without copying an existing name.</p></div></section>\n''',
    'minecraft-coordinate-converter.html': '''\n<!-- NEXUSNOVA_FINAL_REVIEW_VALUE -->\n<section class="section"><div class="container article"><h2>Use Nether conversion as a navigation estimate</h2><p>For the common Overworld-to-Nether relationship, horizontal X and Z coordinates use an 8:1 scale. The Y coordinate is not converted by that ratio, and actual portal placement can shift because the game searches for a safe valid location.</p><p>Treat the converted X/Z pair as a planning target rather than a promise that a portal will appear on the exact block. Terrain, existing portals and game-version behavior can affect the final connection.</p></div></section>\n''',
    'gaming-settings-notes.html': '''\n<!-- NEXUSNOVA_FINAL_REVIEW_VALUE -->\n<section class="section"><div class="container article"><h2>Record the settings that make a comparison reproducible</h2><p>A useful gaming-settings note should include the game, mouse DPI, in-game sensitivity, resolution or aspect ratio where relevant, and the date you changed the setup. Without that context, a saved number can be hard to interpret later.</p><p>Use notes for personal comparison rather than as proof that one setting is objectively best. Hardware, field of view, patches and personal preference can change how the same numeric value feels.</p></div></section>\n''',
    'qr-code-scanner.html': '''\n<!-- NEXUSNOVA_FINAL_REVIEW_VALUE -->\n<section class="section"><div class="container article"><h2>Read the decoded destination before opening it</h2><p>A QR code can contain a harmless text value, contact detail or website address, but the image itself does not prove that the destination is trustworthy. Treat an unexpected login, payment or shortened URL with the same caution you would use for a suspicious link in a message.</p><p>If the scanner returns a URL, inspect the domain spelling first. The tool decodes the QR content; it does not certify the safety, ownership or reputation of the destination.</p></div></section>\n''',
    'ai-prompt-builder.html': '''\n<!-- NEXUSNOVA_FINAL_REVIEW_VALUE -->\n<section class="section"><div class="container article"><h2>A clearer prompt improves instructions, not guaranteed model accuracy</h2><p>Breaking a request into goal, context, constraints and output format can reduce ambiguity, but a well-structured prompt cannot guarantee that an AI system will produce a correct factual answer. Important claims still need verification.</p><p>Avoid pasting passwords, private keys, confidential documents or personal data into any external AI service unless you understand that service's data policy. The builder helps organize wording; the destination model controls how submitted content is processed.</p></div></section>\n''',
    'image-resizer.html': '''\n<!-- NEXUSNOVA_FINAL_REVIEW_VALUE -->\n<section class="section"><div class="container article"><h2>Resizing changes pixel dimensions, not the detail captured by the camera</h2><p>Reducing an image is useful for uploads, websites and smaller files. Enlarging an image creates more pixels but does not restore real detail that was never present in the source, so a large upscale can look soft or blocky.</p><p>Keep aspect ratio enabled when you want to avoid stretching. After export, check small text, faces and sharp edges at the size where the image will actually be used.</p></div></section>\n''',
    'webp-to-png.html': '''\n<!-- NEXUSNOVA_FINAL_REVIEW_VALUE -->\n<section class="section"><div class="container article"><h2>PNG is useful for compatibility and transparency, but can be larger</h2><p>Converting WebP to PNG can help when an editor or workflow does not accept WebP, and PNG can preserve transparent pixels. The trade-off is that PNG files are often larger than an efficiently encoded WebP photograph.</p><p>Open the result after conversion and confirm transparency, dimensions and visible colors. Conversion changes the container and encoding; it does not improve the original image's resolution or recover detail lost before upload.</p></div></section>\n''',
    'avif-to-jpg.html': '''\n<!-- NEXUSNOVA_FINAL_REVIEW_VALUE -->\n<section class="section"><div class="container article"><h2>JPEG removes transparency and uses lossy compression</h2><p>AVIF can store transparency and highly efficient image data, while JPEG is designed for opaque photographic images. If the source contains transparent pixels, a JPEG export must place them against a solid background rather than preserving transparency.</p><p>Use JPEG when broad compatibility matters, then inspect gradients, text and fine edges for compression artifacts. The conversion improves compatibility; it does not make the source sharper or more detailed.</p></div></section>\n''',
    'categories.html': '''\n<!-- NEXUSNOVA_FINAL_REVIEW_VALUE -->\n<section class="section"><div class="container article"><h2>Start with the task, then choose the smallest matching tool</h2><p>Use PDF tools for document page workflows, Image tools for pixel or format work, Calculators for formula-driven results, Productivity tools for everyday planning, and Developer tools for structured technical data. A focused utility is usually faster than opening a broad dashboard when you already know the task.</p><p>For changing Pakistan or live-data references, check the source date and limitation shown on the individual page. Category pages organize discovery; the tool page explains the actual processing and assumptions.</p></div></section>\n''',
    'labs.html': '''\n<!-- NEXUSNOVA_FINAL_REVIEW_VALUE -->\n<section class="section"><div class="container article"><h2>What the Labs collection provides today</h2><p>Labs groups working browser utilities that combine existing NexusNova functions in a different workflow. Pulse summarizes supported live references with source timing, Magic Drop routes a selected file toward relevant local tools, and X-Ray explains URL structure without claiming that a link is guaranteed safe.</p><p>Each utility states its own limitations. A missing live source is shown as unavailable rather than replaced with invented data, and safety signals are explanatory rather than a substitute for a professional threat-intelligence service.</p></div></section>\n''',
    'pulse.html': '''\n<!-- NEXUSNOVA_FINAL_REVIEW_VALUE -->\n<section class="section"><div class="container article"><h2>Freshness matters more than the number alone</h2><p>Pulse is designed as a quick reference across supported live modules. A displayed value should be read together with its source and update time because currency, fuel, weather, gold and earthquake information can change on different schedules.</p><p>If a source is delayed or unavailable, use the linked source or a relevant official provider before making an important decision. Pulse is a convenience dashboard, not an official market, weather or emergency authority.</p></div></section>\n''',
    'ip-cidr-calculator.html': '''\n<!-- NEXUSNOVA_FINAL_REVIEW_VALUE -->\n<section class="section"><div class="container article"><h2>CIDR results describe address ranges, not network reachability</h2><p>A CIDR calculation can identify the network range, mask and address boundaries for the entered prefix. It does not prove that a host exists, accepts traffic or is reachable through firewalls, routing rules, NAT or provider filtering.</p><p>Use the result when planning or checking IPv4 ranges, then verify the actual network configuration separately. Avoid assuming that every numerically valid address in a range is assignable in every environment.</p></div></section>\n''',
    'earthquakes-live.html': '''\n<!-- NEXUSNOVA_FINAL_REVIEW_VALUE -->\n<section class="section"><div class="container article"><h2>Recent earthquake feeds can be revised after the first report</h2><p>Magnitude, depth, coordinates and event status may change as monitoring agencies receive more sensor data and review an event. The first value you see should therefore be treated as a current feed record, not an immutable final measurement.</p><p>For emergency instructions, tsunami information or local safety decisions, follow the relevant government and geological authorities. This page is a convenient data view and is not an emergency-warning service.</p></div></section>\n''',
}


def write_if_changed(path: Path, text: str):
    old = path.read_text(encoding='utf-8')
    if old != text:
        path.write_text(text, encoding='utf-8')
        return True
    return False


def clean_primary_nav(text: str) -> str:
    def repl(match):
        block = match.group(0)
        for pat in PRIMARY_NAV_REMOVE:
            block = re.sub(pat, '', block, flags=re.I)
        return block
    return re.sub(r'<nav class="nav"[^>]*>.*?</nav>', repl, text, flags=re.I | re.S)


def main():
    changed = []

    # Remove App preview from search discovery sitemap.
    sitemap = ROOT / 'sitemap.xml'
    text = sitemap.read_text(encoding='utf-8')
    text = re.sub(r'\s*<url><loc>https://nexusnovatools\.com/app\.html</loc><lastmod>[^<]+</lastmod></url>', '', text)
    if write_if_changed(sitemap, text):
        changed.append('sitemap.xml')

    for path in ROOT.rglob('*.html'):
        if any(part.startswith('.') for part in path.relative_to(ROOT).parts):
            continue
        text = path.read_text(encoding='utf-8')
        new = clean_primary_nav(text)
        # Remove dedicated App anchors from common shells during AdSense review.
        new = re.sub(r'<a href="(?:\.\./)?app\.html"[^>]*>App</a>', '', new, flags=re.I)
        if new != text:
            path.write_text(new, encoding='utf-8')
            changed.append(str(path.relative_to(ROOT)))

    # Remove unfinished/beta presentation from current indexable surfaces.
    p = ROOT / 'reaction-time-test.html'
    text = p.read_text(encoding='utf-8').replace('More flagship betas', 'More browser utilities')
    if write_if_changed(p, text): changed.append('reaction-time-test.html')

    p = ROOT / 'about.html'
    text = p.read_text(encoding='utf-8')
    text = text.replace('Learn what NexusNova Tools is building, meet creator Fahad Hussain, and review the quality standards behind its practical browser tools and articles.', 'Learn what NexusNova Tools provides, meet creator Fahad Hussain, and review the quality standards behind its practical browser tools and articles.')
    text = text.replace('"jobTitle":"Junior Elementary School Teacher","description":"Creator of NexusNova Tools and a Junior Elementary School Teacher."', '"jobTitle":"Creator and Publisher","description":"Creator and publisher responsible for NexusNova Tools."')
    text = text.replace('<strong>Junior Elementary School Teacher • Creator of NexusNova Tools</strong>', '<strong>Creator & Publisher of NexusNova Tools</strong>')
    text = text.replace('The NexusNova mobile app is a separate product under active development. This website will link to the official Play Store listing only after that listing is live and verified.', 'The NexusNova Android app is a separate product preview and is not part of the live browser-tool catalogue. This website only links to verified release destinations when they are actually available.')
    if write_if_changed(p, text): changed.append('about.html')

    p = ROOT / 'terms.html'
    text = p.read_text(encoding='utf-8')
    text = text.replace('Terms for NexusNova public tools, secure Firebase accounts, referral attribution, connected identities and future reward features.', 'Terms for NexusNova public tools, secure accounts, referral attribution and connected identities.')
    text = text.replace('Terms for NexusNova public tools, secure accounts, referrals and future reward features.', 'Terms for NexusNova public tools, secure accounts, referrals and connected services.')
    text = text.replace('any future supported social-account connection', 'any supported social-account connection')
    text = text.replace('any future activation reward', 'any activation reward')
    text = text.replace('<h2>NVX, mining and future rewards</h2>', '<h2>Separate account and reward features</h2>')
    text = text.replace('<h2>Availability and beta changes</h2>', '<h2>Availability and service changes</h2>')
    text = text.replace('during beta when necessary', 'when necessary')
    text = text.replace('before any future value-bearing program is finalized', 'when a value-bearing program is changed')
    if write_if_changed(p, text): changed.append('terms.html')

    # Add unique task-specific depth to every borderline page from the strict audit.
    for filename, section in VALUE_SECTIONS.items():
        p = ROOT / filename
        if not p.exists():
            continue
        text = p.read_text(encoding='utf-8')
        if 'NEXUSNOVA_FINAL_REVIEW_VALUE' in text:
            continue
        if '</main>' not in text:
            raise RuntimeError(f'Missing </main> in {filename}')
        text = text.replace('</main>', section + '</main>', 1)
        p.write_text(text, encoding='utf-8')
        changed.append(filename)

    print(f'Changed {len(set(changed))} files')
    for name in sorted(set(changed)):
        print('-', name)


if __name__ == '__main__':
    main()
