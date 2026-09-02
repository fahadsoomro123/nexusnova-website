from __future__ import annotations

from datetime import datetime, timedelta
import io
import re
import zipfile
import xml.etree.ElementTree as ET

MAIN_NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
REL_NS='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
PKG_NS='http://schemas.openxmlformats.org/package/2006/relationships'
NS={'m':MAIN_NS,'r':REL_NS,'p':PKG_NS}

EU_COUNTRIES=[
    ('AT','Austria'),('BE','Belgium'),('BG','Bulgaria'),('HR','Croatia'),('CY','Cyprus'),
    ('CZ','Czechia'),('DK','Denmark'),('EE','Estonia'),('FI','Finland'),('FR','France'),
    ('DE','Germany'),('GR','Greece'),('HU','Hungary'),('IE','Ireland'),('IT','Italy'),
    ('LV','Latvia'),('LT','Lithuania'),('LU','Luxembourg'),('MT','Malta'),('NL','Netherlands'),
    ('PL','Poland'),('PT','Portugal'),('RO','Romania'),('SK','Slovakia'),('SI','Slovenia'),
    ('ES','Spain'),('SE','Sweden')
]
COUNTRY_CODE={name:code for code,name in EU_COUNTRIES}


def _col_index(ref: str) -> int:
    letters=''.join(ch for ch in ref if ch.isalpha()).upper()
    value=0
    for ch in letters:
        value=value*26+(ord(ch)-64)
    return value-1


def _shared_strings(z: zipfile.ZipFile) -> list[str]:
    try:
        root=ET.fromstring(z.read('xl/sharedStrings.xml'))
    except KeyError:
        return []
    return [''.join(t.text or '' for t in si.findall('.//m:t',NS)) for si in root.findall('m:si',NS)]


def _cell_value(cell: ET.Element, strings: list[str]):
    ctype=cell.attrib.get('t')
    if ctype=='inlineStr':
        return ''.join(t.text or '' for t in cell.findall('.//m:t',NS)).strip()
    node=cell.find('m:v',NS)
    if node is None:
        return ''
    raw=(node.text or '').strip()
    if ctype=='s':
        try:return strings[int(raw)].strip()
        except Exception:return raw
    if ctype=='b':
        return 'TRUE' if raw=='1' else 'FALSE'
    return raw


def _first_sheet_rows(blob: bytes) -> dict[int,dict[int,str]]:
    if not blob.startswith(b'PK'):
        raise ValueError('Weekly Oil Bulletin download is not an XLSX ZIP payload')
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        strings=_shared_strings(z)
        wb=ET.fromstring(z.read('xl/workbook.xml'))
        rels=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        relmap={rel.attrib['Id']:rel.attrib['Target'] for rel in rels.findall('p:Relationship',NS)}
        sheet=wb.find('m:sheets/m:sheet',NS)
        if sheet is None:
            raise ValueError('Weekly Oil Bulletin workbook has no worksheet')
        rid=sheet.attrib.get(f'{{{REL_NS}}}id')
        target=relmap.get(rid or '','')
        if not target:
            raise ValueError('Weekly Oil Bulletin worksheet relationship is missing')
        if not target.startswith('xl/'):
            target='xl/'+target.lstrip('/')
        root=ET.fromstring(z.read(target))
        rows={}
        for row in root.findall('.//m:sheetData/m:row',NS):
            row_num=int(row.attrib.get('r','0') or 0)
            values={}
            for cell in row.findall('m:c',NS):
                ref=cell.attrib.get('r','A1')
                values[_col_index(ref)]=str(_cell_value(cell,strings)).strip()
            rows[row_num]=values
        return rows


def _excel_serial_to_iso(value: str) -> str:
    try:
        serial=float(value)
    except Exception as exc:
        raise ValueError(f'Invalid Weekly Oil Bulletin Excel date: {value!r}') from exc
    if not 40000 < serial < 60000:
        raise ValueError(f'Weekly Oil Bulletin Excel date is outside expected range: {serial}')
    date=(datetime(1899,12,30)+timedelta(days=serial)).date()
    return date.isoformat()


def _number(value: str, label: str) -> float:
    try:
        number=float(str(value).replace(',','').strip())
    except Exception as exc:
        raise ValueError(f'Invalid {label} value: {value!r}') from exc
    if not 500 <= number <= 4000:
        raise ValueError(f'{label} EUR/1000L value outside expected range: {number}')
    return number


def parse_weekly_prices_with_taxes_xlsx(blob: bytes) -> dict:
    rows=_first_sheet_rows(blob)
    header_row=None
    gasoline_col=None
    diesel_col=None
    for row_num,values in rows.items():
        for col,value in values.items():
            lowered=value.lower()
            if 'euro-super 95' in lowered:
                header_row=row_num
                gasoline_col=col
            if 'gas oil automobile' in lowered or 'automotive gas oil' in lowered or 'dieselkraftstoff' in lowered:
                diesel_col=col
        if header_row==row_num and gasoline_col is not None and diesel_col is not None:
            break
    if header_row is None or gasoline_col is None or diesel_col is None:
        raise ValueError('Weekly Oil Bulletin gasoline/diesel headers not found')

    country_col=None
    for row_num,values in rows.items():
        if row_num<=header_row:
            continue
        for col,value in values.items():
            if value in COUNTRY_CODE:
                country_col=col
                break
        if country_col is not None:
            break
    if country_col is None:
        raise ValueError('Weekly Oil Bulletin country column not found')

    unit_row=rows.get(header_row+1,{})
    if '1000' not in unit_row.get(gasoline_col,'').lower() or '1000' not in unit_row.get(diesel_col,'').lower():
        raise ValueError('Weekly Oil Bulletin fuel units are not EUR per 1000 litres')
    data_date=_excel_serial_to_iso(unit_row.get(country_col,''))

    found={}
    for row_num in sorted(rows):
        if row_num<=header_row+1:
            continue
        values=rows[row_num]
        country=values.get(country_col,'')
        if country not in COUNTRY_CODE:
            continue
        gasoline_raw=_number(values.get(gasoline_col,''),f'{country} gasoline')
        diesel_raw=_number(values.get(diesel_col,''),f'{country} diesel')
        gasoline=gasoline_raw/1000.0
        diesel=diesel_raw/1000.0
        if not 0.5 <= gasoline <= 4 or not 0.5 <= diesel <= 4:
            raise ValueError(f'{country} converted EUR/litre value outside expected range')
        found[country]={
            'country_code':COUNTRY_CODE[country],
            'country':country,
            'gasoline_eur_per_litre':round(gasoline,4),
            'diesel_eur_per_litre':round(diesel,4)
        }

    missing=[name for _,name in EU_COUNTRIES if name not in found]
    if missing:
        raise ValueError('Weekly Oil Bulletin missing EU countries: '+', '.join(missing))
    return {
        'data_date':data_date,
        'countries':[found[name] for _,name in EU_COUNTRIES]
    }
