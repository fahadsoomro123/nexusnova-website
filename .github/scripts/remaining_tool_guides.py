#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
START='<!-- NEXUSNOVA_REMAINING_TOOL_GUIDE_START -->'
END='<!-- NEXUSNOVA_REMAINING_TOOL_GUIDE_END -->'
BLOCKS={
'paper-size-in-pixels.html': '''<section class="section" data-nexusnova-tool-guide><div class="container article"><h2>How to use Paper Size in Pixels</h2><ol><li>Choose the paper size and the DPI or pixel-density value required by your print, export or design workflow.</li><li>Read the width and height in pixels and keep the orientation consistent with the document you are preparing.</li><li>Before final export, compare the value with the printer, marketplace or design specification you actually need to satisfy.</li></ol><h3>Practical example</h3><p>An A4 page prepared at 300 DPI needs many more pixels than an A4 preview prepared at 96 DPI because the physical paper size stays the same while pixel density changes. Use the 300-DPI result only when the destination really expects that density.</p><h3>Limits and checks</h3><p>Pixel dimensions alone do not guarantee print quality. Bleed, crop marks, printer scaling, color profile and the real resolution of placed images still matter. For professional print work, follow the print provider’s specification rather than assuming one DPI value is universal.</p></div></section>''',
'salary-tax-calculator-pakistan.html': '''<section class="section" data-nexusnova-tool-guide><div class="container article"><h2>How to use the Pakistan Salary Tax Calculator</h2><ol><li>Confirm the tax year or reference period shown by the page before entering salary figures.</li><li>Enter the salary amount in the period expected by the calculator and review the estimated taxable amount, tax and take-home context shown by the result.</li><li>Compare the estimate with the current FBR rules, payroll treatment and any allowances or deductions that apply to your real employment situation.</li></ol><h3>Practical example</h3><p>If two employees earn the same headline annual salary but one has taxable allowances or payroll adjustments that the calculator does not model, their actual deductions can differ. Use the calculator to understand the slab-based estimate, then reconcile it with the employer’s payroll statement and the applicable tax-year rules.</p><h3>Limits and checks</h3><p>This page is a planning calculator, not a tax filing or legal determination. Tax slabs, credits, exemptions, surcharges and payroll rules can change. Keep the tax-year source with any important estimate and use FBR guidance or a qualified tax professional when the result affects a filing or financial commitment.</p></div></section>''',
'zakat-calculator-pakistan.html': '''<section class="section" data-nexusnova-tool-guide><div class="container article"><h2>How to use the Pakistan Zakat Calculator</h2><ol><li>Select or enter the nisab basis and asset values you intend to include, making sure the reference value and date are appropriate for your calculation.</li><li>Add eligible cash, gold, savings or other included assets and subtract only liabilities that your chosen method allows.</li><li>Review the resulting zakatable amount and cross-check the method with the religious authority or scholar you follow before treating the number as final.</li></ol><h3>Practical example</h3><p>If a person has cash savings and gold above the selected nisab threshold, the calculator can total the included assets and apply the configured zakat rate to the eligible amount. The practical answer can change when asset valuation, debt treatment or nisab methodology changes.</p><h3>Limits and checks</h3><p>Zakat treatment can differ by scholarly opinion, asset type, ownership period, debt treatment and the gold or silver nisab method. This calculator provides arithmetic assistance, not a religious ruling. Use a trusted scholar or authority for questions about what should be included in your individual case.</p></div></section>'''
}

def apply(path, block):
    text=path.read_text(encoding='utf-8')
    wrapped=START+'\n'+block+'\n'+END+'\n'
    if START in text:
        a=text.index(START); b=text.index(END,a)+len(END)
        new=text[:a]+wrapped+text[b:]
    else:
        pos=text.lower().rfind('</main>')
        if pos<0: raise RuntimeError(f'Missing </main>: {path.name}')
        new=text[:pos]+wrapped+text[pos:]
    path.write_text(new,encoding='utf-8')

def main():
    for name,block in BLOCKS.items():
        path=ROOT/name
        if not path.exists(): raise SystemExit('Missing '+name)
        apply(path,block)
        print('Completed guide:',name)
    (ROOT/'remaining-tool-guide-changed-files.txt').write_text('\n'.join(BLOCKS)+'\n',encoding='utf-8')

if __name__=='__main__': main()
