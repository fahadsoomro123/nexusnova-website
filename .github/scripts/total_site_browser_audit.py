#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path('.')
BASE='http://127.0.0.1:8000/'
WIDTHS=(320,360,390,430)

def tools():
    text=(ROOT/'assets/js/search-core.js').read_text(encoding='utf-8',errors='replace')
    return sorted(dict.fromkeys(re.findall(r'\{\s*title:"(?:[^"\\]|\\.)*",\s*url:"([^"]+)",\s*type:"tool"',text)))

def visible_output_text(page):
    return page.locator('body').inner_text(timeout=5000)

def fill_inputs(page):
    # Trigger ordinary calculation/input paths without uploading files or submitting forms.
    controls=page.locator('input, textarea, select')
    count=min(controls.count(),40)
    for i in range(count):
        el=controls.nth(i)
        try:
            if not el.is_visible(): continue
            typ=(el.get_attribute('type') or '').lower()
            if typ in {'file','submit','button','reset','checkbox','radio','hidden'}: continue
            if typ=='range':
                lo=el.get_attribute('min') or '0'; hi=el.get_attribute('max') or '100'
                try: value=str((float(lo)+float(hi))/2)
                except Exception: value='50'
                el.fill(value)
            elif typ in {'number','text','search','tel'}:
                el.fill('1')
            elif typ=='date':
                el.fill('2026-10-15')
            elif typ=='datetime-local':
                el.fill('2026-10-15T12:00')
            elif typ=='time':
                el.fill('12:00')
            elif el.evaluate('(e)=>e.tagName')=='SELECT':
                opts=el.locator('option')
                if opts.count():
                    value=opts.nth(0).get_attribute('value')
                    if value is not None: el.select_option(value)
            else:
                el.fill('1')
            el.dispatch_event('input')
            el.dispatch_event('change')
        except Exception:
            pass

def run():
    urls=tools()
    if len(urls)!=97: raise SystemExit(f'Expected 97 tools, found {len(urls)}')
    failures=[]; metrics={'pages':0,'console_errors':0,'page_errors':0,'unhandled_rejections':0,'copy_buttons':0,'reset_buttons':0,'download_buttons':0,'downloads_observed':0,'overflows':0}
    local_js=set()
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        for url in urls:
            for width in WIDTHS:
                page=browser.new_page(viewport={'width':width,'height':844})
                console_errors=[]; page_errors=[]
                page.on('console',lambda msg: console_errors.append(msg.text) if msg.type=='error' else None)
                page.on('pageerror',lambda exc: page_errors.append(str(exc)))
                page.add_init_script("""
                    window.__nnUnhandled=[]; window.__nnCopied=[];
                    window.addEventListener('unhandledrejection',e=>window.__nnUnhandled.push(String(e.reason&&e.reason.stack||e.reason||'unhandled rejection')));
                    try{navigator.clipboard={writeText:async t=>{window.__nnCopied.push(String(t));}}}catch(_){ }
                """)
                try:
                    response=page.goto(BASE+url,wait_until='domcontentloaded',timeout=30000)
                    metrics['pages']+=1
                    if not response or response.status>=400:
                        failures.append(f'{url}@{width}: HTTP {response.status if response else 0}')
                        continue
                    page.wait_for_timeout(180)
                    fill_inputs(page)
                    page.wait_for_timeout(120)
                    if page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth + 6'):
                        metrics['overflows']+=1; failures.append(f'{url}@{width}: horizontal overflow')
                    bad_outputs=page.locator('output,[data-result],[data-output],[class*="result"],[class*="output"],[id*="result"],[id*="output"]').all_inner_texts()
                    for text in bad_outputs:
                        if re.search(r'(^|\s)(?:NaN|Infinity)(?:\s|$)',text):
                            failures.append(f'{url}@{width}: invalid numeric output: {text[:160]!r}')
                            break
                    for tag in page.locator('script[src],link[href]').evaluate_all("els=>els.map(e=>e.src||e.href).filter(u=>u.includes('/assets/js/'))"):
                        m=re.search(r'/assets/js/([^?#]+)',tag)
                        if m: local_js.add(m.group(1))
                    buttons=page.locator('button,a,[role="button"]')
                    for i in range(buttons.count()):
                        el=buttons.nth(i)
                        try:
                            if not el.is_visible(): continue
                            label=' '.join((el.inner_text() or '').split()).lower()+' '+str(el.get_attribute('aria-label') or '').lower()+' '+str(el.get_attribute('title') or '').lower()
                            if 'copy' in label:
                                metrics['copy_buttons']+=1
                                before=len(console_errors)+len(page_errors)
                                try: el.click(timeout=1200)
                                except Exception: pass
                                page.wait_for_timeout(80)
                                if len(console_errors)+len(page_errors)>before:
                                    failures.append(f'{url}@{width}: copy button error')
                            elif 'reset' in label:
                                metrics['reset_buttons']+=1
                                before=len(console_errors)+len(page_errors)
                                try: el.click(timeout=1200)
                                except Exception: pass
                                page.wait_for_timeout(50)
                                if len(console_errors)+len(page_errors)>before:
                                    failures.append(f'{url}@{width}: reset button error')
                            elif 'download' in label:
                                metrics['download_buttons']+=1
                                before=len(console_errors)+len(page_errors)
                                try:
                                    with page.expect_download(timeout=1800) as info:
                                        el.click(timeout=1200)
                                    info.value.cancel()
                                    metrics['downloads_observed']+=1
                                except Exception:
                                    try: el.click(timeout=1200)
                                    except Exception: pass
                                page.wait_for_timeout(80)
                                if len(console_errors)+len(page_errors)>before:
                                    failures.append(f'{url}@{width}: download button error')
                        except Exception:
                            continue
                    unhandled=page.evaluate('window.__nnUnhandled||[]')
                    if console_errors:
                        metrics['console_errors']+=len(console_errors); failures.append(f'{url}@{width}: console errors: {" | ".join(dict.fromkeys(console_errors))[:500]}')
                    if page_errors:
                        metrics['page_errors']+=len(page_errors); failures.append(f'{url}@{width}: page errors: {" | ".join(dict.fromkeys(page_errors))[:500]}')
                    if unhandled:
                        metrics['unhandled_rejections']+=len(unhandled); failures.append(f'{url}@{width}: unhandled rejections: {" | ".join(dict.fromkeys(unhandled))[:500]}')
                except Exception as exc:
                    failures.append(f'{url}@{width}: {type(exc).__name__}: {exc}')
                finally:
                    page.close()
        browser.close()
    print(json.dumps({'tool_count':len(urls),'metrics':metrics,'failures':failures[:200]},indent=2))
    if failures:
        raise SystemExit(f'BROWSER_AUDIT_FAIL failures={len(failures)}')
    print(f'BROWSER_AUDIT_PASS 97 tools x {len(WIDTHS)} mobile widths; console/pageerror/unhandled rejection count = 0')

if __name__=='__main__': run()
