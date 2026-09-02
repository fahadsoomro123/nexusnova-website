from __future__ import annotations

import html
import io
import re
import urllib.parse
import urllib.request
import zipfile
import xml.etree.ElementTree as ET

PAGE='https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en'
UA='NexusNova-LIVE/1.0 (+https://nexusnovatools.com/live.html)'
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships','p':'http://schemas.openxmlformats.org/package/2006/relationships'}


def fetch(url: str) -> bytes:
    req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'text/html,application/xhtml+xml,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;q=0.9,*/*;q=0.8'})
    with urllib.request.urlopen(req,timeout=25) as resp:
        return resp.read()


def latest_with_taxes_url(page_html: str) -> str:
    text=html.unescape(page_html)
    marker=re.search(r'Prices\s+with\s+taxes\s+latest\s+prices',text,re.I)
    if not marker:
        raise RuntimeError('Weekly Oil Bulletin prices-with-taxes marker not found')
    window=text[marker.start():marker.start()+6000]
    candidates=re.findall(r'href=["\']([^"\']+)["\']',window,re.I)
    for href in candidates:
        if '.xlsx' in href.lower():
            return urllib.parse.urljoin(PAGE,href.replace('&amp;','&'))
    raise RuntimeError('Prices-with-taxes XLSX link not found near marker')


def col_index(ref: str) -> int:
    letters=''.join(ch for ch in ref if ch.isalpha()).upper()
    value=0
    for ch in letters:
        value=value*26+(ord(ch)-64)
    return value-1


def shared_strings(z: zipfile.ZipFile) -> list[str]:
    try:
        root=ET.fromstring(z.read('xl/sharedStrings.xml'))
    except KeyError:
        return []
    values=[]
    for si in root.findall('m:si',NS):
        values.append(''.join(t.text or '' for t in si.findall('.//m:t',NS)))
    return values


def cell_value(cell: ET.Element, strings: list[str]):
    ctype=cell.attrib.get('t')
    if ctype=='inlineStr':
        return ''.join(t.text or '' for t in cell.findall('.//m:t',NS))
    node=cell.find('m:v',NS)
    if node is None:
        return ''
    raw=node.text or ''
    if ctype=='s':
        try:return strings[int(raw)]
        except Exception:return raw
    if ctype=='b': return 'TRUE' if raw=='1' else 'FALSE'
    return raw


def inspect_xlsx(blob: bytes):
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        strings=shared_strings(z)
        wb=ET.fromstring(z.read('xl/workbook.xml'))
        rels=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        relmap={rel.attrib['Id']:rel.attrib['Target'] for rel in rels.findall('p:Relationship',NS)}
        for sheet in wb.findall('m:sheets/m:sheet',NS):
            name=sheet.attrib.get('name','?')
            rid=sheet.attrib.get('{%s}id'%NS['r'])
            target=relmap.get(rid,'')
            if not target.startswith('xl/'):
                target='xl/'+target.lstrip('/')
            print(f'\n=== SHEET: {name} ({target}) ===')
            root=ET.fromstring(z.read(target))
            printed=0
            for row in root.findall('.//m:sheetData/m:row',NS):
                values=['']*24
                for cell in row.findall('m:c',NS):
                    idx=col_index(cell.attrib.get('r','A1'))
                    if idx<24:
                        values[idx]=str(cell_value(cell,strings)).strip()
                if any(values):
                    print(f"R{row.attrib.get('r','?')}: "+' | '.join(values).rstrip(' |'))
                    printed+=1
                if printed>=45:
                    break


def main():
    page=fetch(PAGE).decode('utf-8','replace')
    url=latest_with_taxes_url(page)
    print('Resolved XLSX:',url)
    blob=fetch(url)
    print('Downloaded bytes:',len(blob),'ZIP signature:',blob[:2]==b'PK')
    if blob[:2]!=b'PK':
        raise RuntimeError('Commission download did not return an XLSX ZIP payload')
    inspect_xlsx(blob)

if __name__=='__main__':
    main()
