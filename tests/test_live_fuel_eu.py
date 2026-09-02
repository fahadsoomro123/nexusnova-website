import importlib.util
import io
from pathlib import Path
import unittest
import zipfile

ROOT=Path(__file__).resolve().parents[1]
CORE=ROOT/'.github/scripts/live_fuel_eu_core.py'
spec=importlib.util.spec_from_file_location('live_fuel_eu_core',CORE)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def inline_cell(ref,text):
    safe=(str(text).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;'))
    return f'<c r="{ref}" t="inlineStr"><is><t>{safe}</t></is></c>'


def number_cell(ref,value):
    return f'<c r="{ref}"><v>{value}</v></c>'


def make_workbook(missing=None,unit='1000 l'):
    rows=[]
    rows.append('<row r="1">'+inline_cell('A1','in EUR')+inline_cell('B1','Euro-super 95 (I)')+inline_cell('C1','Gas oil automobile Automotive gas oil Dieselkraftstoff (I)')+'</row>')
    rows.append('<row r="2">'+number_cell('A2',46258)+inline_cell('B2',unit)+inline_cell('C2',unit)+'</row>')
    row_num=3
    for i,(_,country) in enumerate(module.EU_COUNTRIES):
        if country==missing:
            continue
        rows.append(f'<row r="{row_num}">'+inline_cell(f'A{row_num}',country)+number_cell(f'B{row_num}',1500+i*10)+number_cell(f'C{row_num}',1700+i*10)+'</row>')
        row_num+=1
    sheet='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+''.join(rows)+'</sheetData></worksheet>'
    workbook='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>'
    rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
    buffer=io.BytesIO()
    with zipfile.ZipFile(buffer,'w',zipfile.ZIP_DEFLATED) as z:
        z.writestr('xl/workbook.xml',workbook)
        z.writestr('xl/_rels/workbook.xml.rels',rels)
        z.writestr('xl/worksheets/sheet1.xml',sheet)
    return buffer.getvalue()


class EuFuelParserTests(unittest.TestCase):
    def test_parses_all_27_countries_and_converts_to_eur_per_litre(self):
        data=module.parse_weekly_prices_with_taxes_xlsx(make_workbook())
        self.assertEqual(data['data_date'],'2026-08-24')
        self.assertEqual(len(data['countries']),27)
        self.assertEqual(data['countries'][0]['country_code'],'AT')
        self.assertEqual(data['countries'][0]['gasoline_eur_per_litre'],1.5)
        self.assertEqual(data['countries'][0]['diesel_eur_per_litre'],1.7)
        self.assertEqual(data['countries'][-1]['country_code'],'SE')

    def test_fails_closed_when_any_eu_country_is_missing(self):
        with self.assertRaisesRegex(ValueError,'missing EU countries: Germany'):
            module.parse_weekly_prices_with_taxes_xlsx(make_workbook(missing='Germany'))

    def test_refuses_unexpected_units(self):
        with self.assertRaisesRegex(ValueError,'not EUR per 1000 litres'):
            module.parse_weekly_prices_with_taxes_xlsx(make_workbook(unit='EUR/L'))


if __name__=='__main__':
    unittest.main()
