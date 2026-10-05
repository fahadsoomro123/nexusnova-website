#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
TARGETS=['calculator-tools.html','categories.html','image-tools.html','pakistan-tools.html','pdf-tools.html','productivity-tools.html']
OLD1='How this category is organized: each utility keeps its own dedicated page so the input method, privacy behavior and limitations can be explained where they matter.'
OLD2='Trust and privacy: NexusNova labels local browser processing where it is actually used and shows sources or reference methods on data-sensitive pages.'
OLD3='Use the related links on each page to move between closely connected tasks instead of searching a giant unstructured list.'
REPL={
'calculator-tools.html':(
'Calculator pages are separated by formula and question type so percentage, tax, loan, date and unit calculations do not blur into one generic interface.',
'Calculation pages explain assumptions, units and rounding where those details can change the meaning of a result.',
'Open a related calculator only when the next question uses a different formula; this keeps the working path short and auditable.'),
'categories.html':(
'The category directory groups tools by the job a visitor is trying to finish, while each real utility still keeps its own focused page and explanation.',
'Privacy and source notes live on the pages where they are relevant instead of being repeated as a generic promise across every category card.',
'Use category links to narrow the library first, then move through the related-tool links on an individual page when two tasks genuinely connect.'),
'image-tools.html':(
'Image utilities are separated by the property they change: dimensions, compression, format, OCR or metadata, because those operations have different quality and privacy trade-offs.',
'Image pages identify local processing where it actually happens and explain when metadata, transparency or lossy export can change the output.',
'Choose the smallest image operation that solves the problem, then use a related converter or compressor only if the destination still requires another change.'),
'pakistan-tools.html':(
'Pakistan-focused pages separate calculations from reference data so tax, zakat, holidays, prayer times and live prices can each show the rule or source that applies.',
'Local financial and reference pages keep dates, methods and source context visible because a correct formula can still be wrong when an outdated rate is used.',
'Move from a Pakistan reference page to a related calculator only after confirming the applicable date, tariff, tax year or religious method for the task.'),
'pdf-tools.html':(
'PDF utilities are organized around document operations such as merge, split, image-to-PDF and text-to-PDF so users can change only what the document workflow requires.',
'PDF pages call out browser-local handling where implemented and explain when forms, signatures, bookmarks or other advanced features deserve a separate check.',
'Use related PDF links when the output of one document step becomes the input to the next, while keeping the original source files until the final PDF is verified.'),
'productivity-tools.html':(
'Productivity utilities are grouped by immediate task—timing, notes, planning and similar small workflows—without forcing visitors into a large dashboard for a simple action.',
'Pages explain persistence and browser limitations where they matter, especially for timers, local notes and time-zone planning.',
'Follow related links only when they support the next concrete action, so the productivity section stays useful instead of becoming another layer of navigation overhead.')
}

def main():
    changed=[]
    for name in TARGETS:
        path=ROOT/name
        text=path.read_text(encoding='utf-8')
        a,b,c=REPL[name]
        original=text
        text=text.replace(OLD1,a).replace(OLD2,b).replace(OLD3,c)
        if text!=original:
            path.write_text(text,encoding='utf-8'); changed.append(name); print('De-duplicated hub copy:',name)
        else:
            print('No shared hub copy found:',name)
    (ROOT/'hub-copy-changed-files.txt').write_text('\n'.join(changed)+('\n' if changed else ''),encoding='utf-8')

if __name__=='__main__': main()
