#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OLD = 'Source timestamps or the applicable reference period are shown with the data or calculation where available. If a source is unavailable, NexusNova does not invent a current value.'
REPLACEMENTS = {
    'currency-rates.html': 'Currency references show their available source date or timestamp. If the currency dataset cannot be loaded, the page leaves the rate unavailable instead of fabricating a replacement number.',
    'earthquakes-live.html': 'Earthquake entries retain the available USGS event time and feed context. If the earthquake feed is unavailable, the page does not create synthetic events or magnitudes.',
    'electricity-bill-calculator-pakistan.html': 'The calculator shows the tariff or reference period used where available. If an applicable official rate cannot be established, the page should not present an invented current tariff as fact.',
    'fuel-rates.html': 'Pakistan fuel references show the published period attached to the cached source. If a current reference is unavailable, the page keeps the value unavailable instead of guessing a petrol or diesel price.',
    'gold-rates.html': 'Gold references show the source timing behind the international-derived calculation. If one of the required market inputs is unavailable, the page does not manufacture a current PKR gold value.',
    'live-alerts.html': 'Threshold checks use the timestamps or reference periods carried by the underlying NexusNova datasets. Missing source data leaves the alert unresolved rather than forcing a made-up trigger value.',
    'pakistan-public-holidays-2026.html': 'Holiday dates carry the published or announced reference available to the page. Dates that depend on later official notification should be rechecked instead of being treated as automatically final.',
    'prayer-times-qibla-pakistan.html': 'Prayer times are calculated from the selected location and stated method rather than fetched as an official mosque timetable. If required location inputs are unavailable, the page should not invent a local prayer time.',
    'pulse.html': 'Each Pulse card keeps the timing and limitations of its own underlying dataset. If one source fails, that card remains unavailable rather than being filled with a guessed current value.',
    'salary-tax-calculator-pakistan.html': 'The calculator should identify the tax year or reference basis used for the estimate. If a current rule cannot be verified, NexusNova should not substitute an invented rate or slab.',
    'sports-live.html': 'Sports results and fixtures keep the source timing supplied by the available feed. If the feed does not return a current event, the page does not create a score, fixture or status.',
    'weather-live.html': 'Forecasts retain the timestamp and model context supplied by the weather source. If forecast data is unavailable for a location, the page does not generate an artificial current condition.',
    'zakat-calculator-pakistan.html': 'The calculator should make the selected nisab basis and reference value clear. If the required current reference cannot be verified, the page should not invent a market value for the calculation.'
}

def main():
    changed=[]
    for name,new in REPLACEMENTS.items():
        path=ROOT/name
        text=path.read_text(encoding='utf-8')
        if OLD not in text:
            print(f'Skip {name}: shared sentence not present')
            continue
        text=text.replace(OLD,new,1)
        path.write_text(text,encoding='utf-8')
        changed.append(name)
        print('Unique reference note:',name)
    (ROOT/'unique-reference-note-changed-files.txt').write_text('\n'.join(changed)+('\n' if changed else ''),encoding='utf-8')
    print('Changed reference notes:',len(changed))

if __name__=='__main__':
    main()
