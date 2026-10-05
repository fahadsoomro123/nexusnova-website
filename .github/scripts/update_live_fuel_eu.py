from __future__ import annotations

from datetime import datetime, timezone
import html
import json
from pathlib import Path
import re
import urllib.parse
import urllib.request

from live_fuel_eu_core import parse_weekly_prices_with_taxes_xlsx

PAGE='https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en'
LEGAL='https://commission.europa.eu/legal-notice_en'
OUT=Path('assets/data/live-fuel-eu.json')
UA='NexusNova-LIVE/1.0 (+https://nexusnovatools.com/live.html)'


def fetch(url: str, accept: str) -> bytes:
    req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':accept})
    with urllib.request.urlopen(req,timeout=25) as resp:
        payload=resp.read()
        if not payload:
            raise RuntimeError(f'European Commission source returned empty response: {url}')
        return payload


def latest_with_taxes_url(page_html: str) -> str:
    text=html.unescape(page_html)
    marker=re.search(r'Prices\s+with\s+taxes\s+latest\s+prices',text,re.I)
    if not marker:
        raise RuntimeError('Weekly Oil Bulletin prices-with-taxes marker not found')
    window=text[marker.start():marker.start()+6000]
    for href in re.findall(r'href=["\']([^"\']+)["\']',window,re.I):
        if '.xlsx' in href.lower():
            return urllib.parse.urljoin(PAGE,href.replace('&amp;','&'))
    raise RuntimeError('Weekly Oil Bulletin prices-with-taxes XLSX link not found')


def previous_by_code(previous: dict) -> dict:
    return {item.get('country_code'):item for item in previous.get('countries',[]) if item.get('country_code')}


def enrich_changes(current: dict, previous: dict) -> list[dict]:
    old_map=previous_by_code(previous)
    same_date=previous.get('data_date')==current.get('data_date')
    output=[]
    for item in current['countries']:
        old=old_map.get(item['country_code'],{})
        row=dict(item)
        if same_date:
            row['previous_gasoline_eur_per_litre']=old.get('previous_gasoline_eur_per_litre')
            row['gasoline_change_eur_per_litre']=old.get('gasoline_change_eur_per_litre')
            row['previous_diesel_eur_per_litre']=old.get('previous_diesel_eur_per_litre')
            row['diesel_change_eur_per_litre']=old.get('diesel_change_eur_per_litre')
        elif old:
            old_gas=float(old['gasoline_eur_per_litre'])
            old_diesel=float(old['diesel_eur_per_litre'])
            row['previous_gasoline_eur_per_litre']=round(old_gas,4)
            row['gasoline_change_eur_per_litre']=round(row['gasoline_eur_per_litre']-old_gas,4)
            row['previous_diesel_eur_per_litre']=round(old_diesel,4)
            row['diesel_change_eur_per_litre']=round(row['diesel_eur_per_litre']-old_diesel,4)
        else:
            row['previous_gasoline_eur_per_litre']=None
            row['gasoline_change_eur_per_litre']=None
            row['previous_diesel_eur_per_litre']=None
            row['diesel_change_eur_per_litre']=None
        output.append(row)
    return output


def main():
    page=fetch(PAGE,'text/html,application/xhtml+xml').decode('utf-8','replace')
    xlsx_url=latest_with_taxes_url(page)
    workbook=fetch(xlsx_url,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    parsed=parse_weekly_prices_with_taxes_xlsx(workbook)
    try:
        previous=json.loads(OUT.read_text(encoding='utf-8'))
    except Exception:
        previous={}
    countries=enrich_changes(parsed,previous)
    payload={
        'schema_version':1,
        'status':'ok',
        'generated_at':datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z'),
        'data_date':parsed['data_date'],
        'region':'EU27',
        'currency':'EUR',
        'unit':'EUR per litre',
        'frequency':'weekly',
        'source':{
            'name':'European Commission Weekly Oil Bulletin',
            'url':PAGE,
            'download_url':xlsx_url,
            'legal_notice_url':LEGAL,
            'license':'European Commission-owned website content is generally reusable under CC BY 4.0 unless otherwise indicated',
            'method':'Weekly consumer prices with taxes; source values in EUR per 1000 litres are divided by 1000 for NexusNova EUR/litre display'
        },
        'countries':countries,
        'notice':'Weekly national consumer-price references including taxes for EU countries. Values are converted from EUR per 1000 litres to EUR per litre and are not real-time station quotes.'
    }
    OUT.write_text(json.dumps(payload,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(f"Wrote {len(countries)} EU country fuel rows for {payload['data_date']} from European Commission Weekly Oil Bulletin.")
    sample=next(item for item in countries if item['country_code']=='DE')
    print(f"Germany sample: Euro-super 95 €{sample['gasoline_eur_per_litre']:.4f}/L; diesel €{sample['diesel_eur_per_litre']:.4f}/L")


if __name__=='__main__':
    main()
