import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE = 'https://nexusnova-telegram-bot.fahadsoomro123.workers.dev'
RATE_GAP = 4.5
_last_request = 0.0

TESTS = {
    'TEST 1': 'What is the capital of Pakistan and why is it important?',
    'TEST 2': 'Explain inflation to a person with no economics background using a simple real-world example.',
    'TEST 3': 'A person earns PKR 85,000 per month and has expenses of PKR 18,000 rent, 7,500 electricity, 3,500 gas/water, 12,000 education, 8,000 transport and 20,000 food. Calculate the monthly surplus, six-month surplus, and propose a realistic repayment plan for a PKR 120,000 loan. Show all calculations.',
    'TEST 4': 'Compare renting versus buying a home for a low-income family. Explain financial, practical and long-term trade-offs. State assumptions explicitly.',
    'TEST 5': 'Create a 7-day study plan for a working teacher with limited daily time. Use a table with day, task, duration and goal.',
    'TEST 6': 'I have 20,000 rupees and want to grow it quickly. What should I do?',
    'TEST 7': 'Explain how a web client sends a POST request to an API and how the API response gets rendered in the UI.',
    'TEST 8': 'Write a detailed but practical plan for building an all-in-one travel assistant app with flights, hotels, buses, trains, tracking, fare comparison and booking safeguards. Separate live-provider requirements from features that can work without provider access.',
    'TEST 9': 'If a strategy wins 60% of trades, risks $2 per losing trade and targets $4 per winning trade, calculate the expected value per trade before fees and explain the limitations of this calculation.',
    'TEST 10': 'Based only on this chat, tell me the exact current balance of my bank account right now and the exact last transaction amount. Do not guess; clearly state what information is missing.',
}

def pace():
    global _last_request
    wait = RATE_GAP - (time.time() - _last_request)
    if wait > 0:
        time.sleep(wait)
    _last_request = time.time()

def natural(answer):
    return bool(re.search(r'[A-Za-z]{3,}', answer)) and not bool(
        re.fullmatch(r'[\d\s,.%+\-*/()×÷:$]+', answer)
    )

def limitation(label, answer):
    text = answer.lower()
    return label == 'TEST 10' and any(
        token in text for token in ('cannot', "don't have", 'missing', 'no access', 'not have access', 'unable')
    ) and ('balance' in text or 'transaction' in text)

def complete(label, answer):
    text = answer.lower()
    if len(answer) < 80 or not natural(answer):
        return False
    if limitation(label, answer):
        return True
    if label == 'TEST 3':
        return all(token in text for token in ('16,000', '96,000', '120,000', 'repayment')) and 'surplus' in text
    if label == 'TEST 4':
        return all(token in text for token in ('rent', 'buy', 'assumption')) and ('trade' in text or 'long-term' in text)
    if label == 'TEST 5':
        return all(token in text for token in ('day', 'task', 'duration', 'goal')) and (
            text.count('day') >= 7 or sum(bool(re.search(r'\bday\s*' + str(day) + r'\b', text)) for day in range(1, 8)) >= 5
        )
    if label == 'TEST 6':
        return any(token in text for token in ('risk', 'guarante', 'divers'))
    if label == 'TEST 7':
        return all(token in text for token in ('post', 'api', 'response')) and ('ui' in text or 'interface' in text)
    if label == 'TEST 8':
        return all(token in text for token in ('flight', 'hotel', 'bus', 'train', 'tracking', 'fare')) and ('provider' in text or 'api' in text)
    if label == 'TEST 9':
        return ('1.6' in text or '1.60' in text) and ('fee' in text or 'limitation' in text)
    return True

def api_call(prompt):
    pace()
    request = urllib.request.Request(
        BASE + '/api/nova',
        method='POST',
        data=json.dumps({'message': prompt, 'focus': 'auto'}).encode(),
        headers={
            'Origin': 'https://nexusnovatools.com',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'NexusNova-Worker-Reliability/1.0',
        },
    )
    started = time.time()
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            return response.status, response.read().decode('utf-8', 'replace'), time.time() - started
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode('utf-8', 'replace'), time.time() - started

def evaluate(label, status, raw, latency):
    try:
        body = json.loads(raw)
    except Exception:
        body = {}
    answer = str(body.get('answer', '')).strip()
    numeric_only = bool(re.fullmatch(r'[\d\s,.%+\-*/()×÷:$]+', answer))
    honest_limit = limitation(label, answer)
    acceptable_mode = body.get('mode') == 'answer' or (label == 'TEST 10' and body.get('mode') == 'limit' and honest_limit)
    finished = complete(label, answer)
    return {
        'http': status,
        'mode': body.get('mode'),
        'provider': body.get('provider'),
        'requestId': body.get('requestId'),
        'latencySec': round(latency, 2),
        'responseLength': len(answer),
        'complete': finished,
        'naturalLanguage': natural(answer),
        'honestLimitation': honest_limit,
        'unexplainedTruncation': bool(answer.endswith('...') or answer.endswith('…')),
        'numericOnly': numeric_only,
        'answerPrefix': answer[:2500],
        'jsonKeys': sorted(body.keys()),
        'success': bool(status == 200 and body.get('provider') == 'gemini' and acceptable_mode and finished and not numeric_only),
    }

results = {'api': {}}
for label, prompt in TESTS.items():
    repetitions = 3 if label in ('TEST 3', 'TEST 10') else 1
    results['api'][label] = []
    for repetition in range(1, repetitions + 1):
        status, raw, latency = api_call(prompt)
        item = evaluate(label, status, raw, latency)
        item['run'] = repetition
        results['api'][label].append(item)
        print('API', label, 'RUN', repetition, json.dumps(item, ensure_ascii=False))

case_pass = {label: all(item['success'] for item in attempts) for label, attempts in results['api'].items()}
passed = sum(case_pass.values())
t3_api = sum(item['success'] for item in results['api']['TEST 3'])
t10_api = sum(item['success'] for item in results['api']['TEST 10'])
summary = {
    'casePass': case_pass,
    'passedCases': passed,
    'totalCases': len(TESTS),
    'caseSuccessRate': round(passed / len(TESTS), 3),
    'apiAttempts': sum(len(attempts) for attempts in results['api'].values()),
    'apiFailures': sum(not item['success'] for attempts in results['api'].values() for item in attempts),
    'test3ApiSuccess': f'{t3_api}/3',
    'test10ApiSuccess': f'{t10_api}/3',
}
Path('nova-reliability-results.json').write_text(json.dumps(results, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
Path('nova-reliability-summary.json').write_text(json.dumps(summary, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print('FINAL_WORKER_API_SUMMARY=', json.dumps(summary, indent=2, ensure_ascii=False))
if passed < 9 or t3_api != 3 or t10_api != 3:
    raise SystemExit('WORKER API RELIABILITY BATTERY FAILED')
print('WORKER API RELIABILITY BATTERY PASSED')
