import json, os, re, time, urllib.error, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = 'https://nexusnova-telegram-bot.fahadsoomro123.workers.dev'
PAGE = 'https://nexusnovatools.com/nova-intelligence.html?qa=' + os.environ['GITHUB_SHA']
VIEWPORTS = [
    ('mobile-390', {'width': 390, 'height': 844}, 'Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 Chrome/151.0.0.0 Mobile Safari/537.36'),
    ('mobile-412', {'width': 412, 'height': 915}, 'Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 Chrome/151.0.0.0 Mobile Safari/537.36'),
    ('desktop-1280', {'width': 1280, 'height': 800}, None),
]
TESTS = {
    'TEST 1': 'What is the capital of Pakistan and why is it important?',
    'TEST 2': 'Explain inflation to a person with no economics background using a simple real-world example.',
    'TEST 3': 'A person earns PKR 85,000 per month and has expenses of PKR 18,000 rent, 7,500 electricity, 3,500 gas/water, 12,000 education, 8,000 transport and 20,000 food. Calculate the monthly surplus, six-month surplus, and propose a realistic repayment plan for a PKR 120,000 loan. Show all calculations.',
    'TEST 4': 'Compare renting versus buying a home for a low-income family. Explain financial, practical and long-term trade-offs. State assumptions explicitly.',
    'TEST 5': 'Create a 7-day study plan for a working teacher with limited daily time. Use a table with day, task, duration and goal.',
    'TEST 6': 'I have 20,000 rupees and want to grow it quickly. What should I do?',
    'TEST 7': 'Explain how a web browser sends a POST request to an API and how the API response gets rendered in the UI.',
    'TEST 8': 'Write a detailed but practical plan for building an all-in-one travel assistant app with flights, hotels, buses, trains, tracking, fare comparison and booking safeguards. Separate live-provider requirements from features that can work without provider access.',
    'TEST 9': 'If a strategy wins 60% of trades, risks $2 per losing trade and targets $4 per winning trade, calculate the expected value per trade before fees and explain the limitations of this calculation.',
    'TEST 10': 'Based only on this chat, tell me the exact current balance of my bank account right now and the exact last transaction amount. Do not guess; clearly state what information is missing.'
}
STRUCTURED_PROMPT = 'Give a practical answer using a level-2 heading, two short paragraphs, a 3-item bullet list, a 3-step numbered list, a small Markdown table with two data rows, one short JavaScript fenced code block, one blockquote, and one bold phrase. Do not invent facts.'
EVIDENCE_DIR = Path('nova-evidence')
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)


def natural(text):
    return bool(re.search(r'[A-Za-z]{3,}', text)) and not bool(re.fullmatch(r'[\d\s,.%+\-*/()×÷:$]+', text))


def honest_limit(label, text):
    x = text.lower()
    return label == 'TEST 10' and any(t in x for t in ('cannot', "don't have", 'missing', 'no access', 'not have access', 'unable')) and ('balance' in x or 'transaction' in x)


def complete(label, text):
    x = text.lower()
    if len(text) < 80 or not natural(text):
        return False
    if honest_limit(label, text):
        return True
    if label == 'TEST 3':
        return all(t in x for t in ('16,000', '96,000', '120,000', 'repayment')) and 'surplus' in x
    if label == 'TEST 4':
        return all(t in x for t in ('rent', 'buy', 'assumption')) and ('trade' in x or 'long-term' in x)
    if label == 'TEST 5':
        return all(t in x for t in ('day', 'task', 'duration', 'goal')) and x.count('day') >= 7
    if label == 'TEST 6':
        return any(t in x for t in ('risk', 'guarante', 'divers'))
    if label == 'TEST 7':
        return all(t in x for t in ('browser', 'post', 'api', 'response')) and ('ui' in x or 'interface' in x)
    if label == 'TEST 8':
        return all(t in x for t in ('flight', 'hotel', 'bus', 'train', 'tracking', 'fare')) and ('provider' in x or 'api' in x)
    if label == 'TEST 9':
        return ('1.6' in x or '1.60' in x) and ('fee' in x or 'limitation' in x)
    return True


def api_call(prompt):
    req = urllib.request.Request(
        BASE + '/api/nova',
        method='POST',
        data=json.dumps({'message': prompt, 'focus': 'auto'}).encode(),
        headers={'Origin': 'https://nexusnovatools.com', 'Accept': 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'NexusNova-Reliability/6.0'},
    )
    started = time.time()
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            return response.status, response.read().decode('utf-8', 'replace'), time.time() - started
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode('utf-8', 'replace'), time.time() - started


def parse_api(status, raw, label, latency):
    try:
        body = json.loads(raw)
    except Exception:
        body = {}
    answer = str(body.get('answer', '')).strip()
    honest = honest_limit(label, answer)
    numeric_only = bool(re.fullmatch(r'[\d\s,.%+\-*/()×÷:$]+', answer))
    return {
        'http': status,
        'mode': body.get('mode'),
        'provider': body.get('provider'),
        'requestId': body.get('requestId'),
        'responseLength': len(answer),
        'finishReason': body.get('finishReason', 'not-exposed-by-api'),
        'complete': complete(label, answer),
        'naturalLanguage': natural(answer),
        'honestLimitation': honest,
        'unexplainedTruncation': answer.endswith(('...', '…')),
        'numericOnly': numeric_only,
        'latencySec': round(latency, 2),
        'answerPrefix': answer[:3500],
        'jsonKeys': sorted(body.keys()),
        'success': status == 200 and body.get('provider') == 'gemini' and (body.get('mode') == 'answer' or honest) and complete(label, answer) and not numeric_only and bool(answer),
    }


results = {'api': {}, 'browser': {}}

# Production API acceptance: exactly 3 independent runs where the mission requires them.
for label, prompt in TESTS.items():
    reps = 3 if label in {'TEST 3', 'TEST 9', 'TEST 10'} else 1
    results['api'][label] = []
    for rep in range(1, reps + 1):
        status, raw, latency = api_call(prompt)
        item = parse_api(status, raw, label, latency)
        item['run'] = rep
        results['api'][label].append(item)
        print('API', label, 'RUN', rep, json.dumps(item, ensure_ascii=False))

# Browser acceptance: one real Gemini answer per viewport, plus real retry interaction on 390px.
browser_errors = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    for name, viewport, user_agent in VIEWPORTS:
        context_args = {'viewport': viewport}
        if user_agent:
            context_args['user_agent'] = user_agent
        context = browser.new_context(**context_args)
        page = context.new_page()
        errors = []
        page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(PAGE, wait_until='domcontentloaded', timeout=30000)
        page.wait_for_timeout(400)
        asset_info = page.evaluate('''() => ({
          script: document.querySelector('script[src*="nova-ui.js"]')?.src || '',
          css: [...document.querySelectorAll('link[href*="nova-intelligence.css"]')].map(x => x.href),
          accessCss: [...document.querySelectorAll('link[href*="nova-accessibility.css"]')].map(x => x.href),
          robots: document.querySelector('meta[name="robots"]')?.content || '',
          build: document.documentElement.dataset.novaClientBuild || ''
        })''')
        empty_text = page.locator('#niResult').inner_text().strip()
        results['browser'][name] = {'page': asset_info, 'emptyState': empty_text}
        page.screenshot(path=str(EVIDENCE_DIR / f'{name}-empty.png'), full_page=True)

        page.locator('#niPrompt').fill(STRUCTURED_PROMPT)
        first_state = {'label': None, visible': False}
        with page.expect_response(lambda response: response.url == BASE + '/api/nova' and response.request.method == 'POST', timeout=100000) as event:
            page.locator('#niBuild').click(force=True)
        response = event.value
        body = response.json()
        answer = str(body.get('answer', '')).strip()
        try:
            page.wait_for_function('(expected) => document.querySelector("#niResult")?.innerText.includes(expected)', answer[:120], timeout=20000)
        except Exception:
            pass
        rendered = page.locator('#niResult').inner_text().strip()
        state = page.locator('#niState').inner_text().strip()
        html_checks = page.evaluate('''() => ({
          headings: document.querySelectorAll('#niResult h1,#niResult h2,#niResult h3').length,
          paragraphs: document.querySelectorAll('#niResult p').length,
          lists: document.querySelectorAll('#niResult ul,#niResult ol').length,
          tables: document.querySelectorAll('#niResult table').length,
          codeBlocks: document.querySelectorAll('#niResult pre.ni-code').length,
          blockquotes: document.querySelectorAll('#niResult blockquote').length,
          dangerousHtml: !!document.querySelector('#niResult script, #niResult iframe, #niResult object'),
          overflow: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth },
          actions: [...document.querySelectorAll('#niResult button')].map(x => x.textContent.trim())
        })''')
        item = {
            'http': response.status,
            'mode': body.get('mode'),
            'provider': body.get('provider'),
            'requestId': body.get('requestId'),
            'responseLength': len(answer),
            'complete': complete('TEST 2', answer),
            'uiDisplayedFullAnswer': bool(answer and answer in rendered),
            'uiState': state,
            'htmlChecks': html_checks,
            'consoleErrors': errors[-10:],
            'assetInfo': asset_info,
            'success': response.status == 200 and body.get('provider') == 'gemini' and bool(answer) and answer in rendered and html_checks['headings'] >= 1 and html_checks['paragraphs'] >= 2 and html_checks['lists'] >= 2 and html_checks['tables'] >= 1 and html_checks['codeBlocks'] >= 1 and html_checks['blockquotes'] >= 1 and not html_checks['dangerousHtml'] and html_checks['overflow']['scrollWidth'] <= html_checks['overflow']['clientWidth'] + 6 and not errors,
        }
        results['browser'][name]['structured'] = item
        print('BROWSER', name, 'STRUCTURED', json.dumps(item, ensure_ascii=False))
        page.screenshot(path=str(EVIDENCE_DIR / f'{name}-completed.png'), full_page=True)

        if name == 'mobile-390':
            # Real retry against the live API.
            with page.expect_response(lambda response: response.url == BASE + '/api/nova' and response.request.method == 'POST', timeout=100000):
                page.get_by_role('button', name='Retry').click()
            page.wait_for_timeout(500)
            retry_state = page.locator('#niState').inner_text().strip()
            copy_button = page.get_by_role('button', name='Copy')
            copy_working = copy_button.count() == 1
            copy_label_before = copy_button.inner_text().strip() if copy_working else ''
            clear_button = page.get_by_role('button', name='Clear')
            copy_result = 'not-tested'
            if copy_working:
                page.context.grant_permissions(['clipboard-read', 'clipboard-write'], origin='https://nexusnovatools.com')
                copy_button.click()
                page.wait_for_timeout(200)
                copy_result = copy_button.inner_text().strip()
            if clear_button.count() == 1:
                clear_button.click()
            cleared = page.locator('#niPrompt').input_value() == '' and page.locator('#niState').inner_text().strip() == 'READY'
            results['browser'][name]['actions'] = {'retryState': retry_state, 'copyBefore': copy_label_before, 'copyAfter': copy_result, 'clearWorked': cleared, 'retryWorked': retry_state not in ('READY', 'ERROR — RETRY', 'LIMITED')}
            print('BROWSER', name, 'ACTIONS', json.dumps(results['browser'][name]['actions'], ensure_ascii=False))

        if errors:
            browser_errors.extend([name + ':' + error for error in errors])
        context.close()

    # Explicit error/recovery test: real browser, real page, intentionally aborted network request only.
    error_context = browser.new_context(viewport={'width': 390, 'height': 844})
    error_page = error_context.new_page()
    error_messages = []
    error_page.on('console', lambda msg: error_messages.append(msg.text) if msg.type == 'error' else None)
    error_page.goto(PAGE, wait_until='domcontentloaded', timeout=30000)
    error_page.route(BASE + '/api/nova', lambda route: route.abort('failed'))
    error_page.locator('#niPrompt').fill('Trigger a network recovery state.')
    error_page.locator('#niBuild').click(force=True)
    error_page.wait_for_function('() => document.querySelector("#niState")?.innerText.includes("ERROR")', timeout=5000)
    error_text = error_page.locator('#niResult').inner_text().strip()
    results['browser']['error-recovery'] = {
        'uiState': error_page.locator('#niState').inner_text().strip(),
        'hasRetry': error_page.get_by_role('button', name='Retry').count() == 1,
        'honestError': 'No fake answer was generated' in error_text,
        'consoleErrors': error_messages[-10:],
        'success': 'ERROR' in error_page.locator('#niState').inner_text().strip() and error_page.get_by_role('button', name='Retry').count() == 1 and 'No fake answer was generated' in error_text,
    }
    print('BROWSER error-recovery', json.dumps(results['browser']['error-recovery'], ensure_ascii=False))
    error_context.close()
    browser.close()

summary = {
    'api': {label: {'runs': len(rows), 'passed': sum(bool(row['success']) for row in rows)} for label, rows in results['api'].items()},
    'browser': {name: {'success': row.get('structured', row).get('success', False) if name != 'error-recovery' else row.get('success', False)} for name, row in results['browser'].items()},
    'test3Api': f"{sum(bool(x['success']) for x in results['api']['TEST 3'])}/3",
    'test9Api': f"{sum(bool(x['success']) for x in results['api']['TEST 9'])}/3",
    'test10Api': f"{sum(bool(x['success']) for x in results['api']['TEST 10'])}/3",
    'browserErrors': browser_errors[:100],
    'viewports': [name for name, _, _ in VIEWPORTS],
}
Path('nova-reliability-results.json').write_text(json.dumps(results, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
Path('nova-reliability-summary.json').write_text(json.dumps(summary, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

api_ok = all(all(x['success'] for x in rows) for rows in results['api'].values())
browser_ok = all(results['browser'][name]['structured']['success'] for name, _, _ in VIEWPORTS) and results['browser']['error-recovery']['success'] and results['browser']['mobile-390']['actions']['retryWorked'] and results['browser']['mobile-390']['actions']['clearWorked'] and results['browser']['mobile-390']['actions']['copyAfter'] == 'Copied'
if not api_ok or not browser_ok or browser_errors:
    raise SystemExit('PRODUCTION RELIABILITY BATTERY FAILED')
print('PRODUCTION RELIABILITY BATTERY PASSED', json.dumps(summary, ensure_ascii=False))
