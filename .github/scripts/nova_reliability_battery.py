import json, os, re, time, urllib.error, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = 'https://nexusnova-telegram-bot.fahadsoomro123.workers.dev'
PAGE = 'https://nexusnovatools.com/nova-intelligence.html?qa=' + os.environ['GITHUB_SHA']
TESTS = {
'TEST 1':'What is the capital of Pakistan and why is it important?',
'TEST 2':'Explain inflation to a person with no economics background using a simple real-world example.',
'TEST 3':'A person earns PKR 85,000 per month and has expenses of PKR 18,000 rent, 7,500 electricity, 3,500 gas/water, 12,000 education, 8,000 transport and 20,000 food. Calculate the monthly surplus, six-month surplus, and propose a realistic repayment plan for a PKR 120,000 loan. Show all calculations.',
'TEST 4':'Compare renting versus buying a home for a low-income family. Explain financial, practical and long-term trade-offs. State assumptions explicitly.',
'TEST 5':'Create a 7-day study plan for a working teacher with limited daily time. Use a table with day, task, duration and goal.',
'TEST 6':'I have 20,000 rupees and want to grow it quickly. What should I do?',
'TEST 7':'Explain how a web browser sends a POST request to an API and how the API response gets rendered in the UI.',
'TEST 8':'Write a detailed but practical plan for building an all-in-one travel assistant app with flights, hotels, buses, trains, tracking, fare comparison and booking safeguards. Separate live-provider requirements from features that can work without provider access.',
'TEST 9':'If a strategy wins 60% of trades, risks $2 per losing trade and targets $4 per winning trade, calculate the expected value per trade before fees and explain the limitations of this calculation.',
'TEST 10':'Based only on this chat, tell me the exact current balance of my bank account right now and the exact last transaction amount. Do not guess; clearly state what information is missing.'}

VIEWPORTS = [
 ('mobile-390', {'width':390,'height':844}, 'Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 Chrome/151.0.0.0 Mobile Safari/537.36'),
 ('mobile-412', {'width':412,'height':915}, 'Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 Chrome/151.0.0.0 Mobile Safari/537.36'),
 ('desktop-1280', {'width':1280,'height':800}, None)
]

def natural(a): return bool(re.search(r'[A-Za-z]{3,}', a)) and not bool(re.fullmatch(r'[\d\s,.%+\-*/()×÷:$]+', a))
def limitation(label, x): return label == 'TEST 10' and any(t in x for t in ['cannot',"don't have",'missing','no access','not have access','unable']) and ('balance' in x or 'transaction' in x)
def complete(label,a):
 x=a.lower()
 if len(a)<80 or not natural(a): return False
 if limitation(label,x): return True
 if label=='TEST 3': return all(t in x for t in ['16,000','96,000','120,000','repayment']) and 'surplus' in x
 if label=='TEST 4': return all(t in x for t in ['rent','buy','assumption']) and ('trade' in x or 'long-term' in x)
 if label=='TEST 5': return all(t in x for t in ['day','task','duration','goal']) and (x.count('day')>=7 or sum(1 for d in range(1,8) if re.search(r'\bday\s*'+str(d)+r'\b',x))>=5)
 if label=='TEST 6': return 'risk' in x or 'guarante' in x or 'divers' in x
 if label=='TEST 7': return all(t in x for t in ['browser','post','api','response']) and ('ui' in x or 'interface' in x)
 if label=='TEST 8': return all(t in x for t in ['flight','hotel','bus','train','tracking','fare']) and ('provider' in x or 'api' in x)
 if label=='TEST 9': return ('1.6' in x or '1.60' in x) and ('fee' in x or 'limitation' in x)
 return True

def api_call(prompt):
 req=urllib.request.Request(BASE+'/api/nova',method='POST',data=json.dumps({'message':prompt,'focus':'auto'}).encode(),headers={'Origin':'https://nexusnovatools.com','Accept':'application/json','Content-Type':'application/json','User-Agent':'NexusNova-Reliability/5.0'})
 started=time.time()
 try:
  with urllib.request.urlopen(req,timeout=90) as r: return r.status,r.read().decode('utf-8','replace'),time.time()-started
 except urllib.error.HTTPError as e: return e.code,e.read().decode('utf-8','replace'),time.time()-started

def record(status,raw,label):
 try: body=json.loads(raw)
 except Exception: body={}
 a=str(body.get('answer','')).strip(); numeric=bool(re.fullmatch(r'[\d\s,.%+\-*/()×÷:$]+',a)); honest=limitation(label,a.lower())
 return {'http':status,'mode':body.get('mode'),'provider':body.get('provider'),'requestId':body.get('requestId'),'responseLength':len(a),'finishReason':body.get('finishReason','not-exposed-by-api'),'complete':complete(label,a),'naturalLanguage':natural(a),'honestLimitation':honest,'unexplainedTruncation':bool(a.endswith('...') or a.endswith('…')),'numericOnly':numeric,'answerPrefix':a[:3500],'jsonKeys':sorted(body.keys()),'_acceptableMode':body.get('mode')=='answer' or honest}

results={'api':{},'browser':{}}
for label,prompt_text in TESTS.items():
 results['api'][label]=[]
 for rep in range(1,(4 if label=='TEST 3' else 2)):
  s,r,lat=api_call(prompt_text); item=record(s,r,label); item['latencySec']=round(lat,2); item['success']=s==200 and item['provider']=='gemini' and item['_acceptableMode'] and item['complete'] and not item['numericOnly']; results['api'][label].append(item); print('API',label,'RUN',rep,json.dumps(item,ensure_ascii=False))

browser_errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 for name,vp,ua in VIEWPORTS:
  kw={'viewport':vp};
  if ua: kw['user_agent']=ua
  ctx=browser.new_context(**kw); page=ctx.new_page(); errs=[]
  page.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); page.on('pageerror',lambda e: errs.append(str(e)))
  page.goto(PAGE,wait_until='domcontentloaded',timeout=30000); page.wait_for_timeout(500)
  src=page.locator('script[src*="nova-ui.js"]').get_attribute('src') or ''
  css=page.locator('link[href*="nova-intelligence.css"]').get_attribute('href') or ''
  empty=page.locator('#niResult').inner_text().strip(); results['browser'][name]={'_page':{'scriptSrc':src,'cssHref':css,'emptyStateText':empty},'viewport':vp}
  page.screenshot(path=f'nova-evidence/{name}-empty.png',full_page=True)
  for label,prompt_text in TESTS.items():
   results['browser'][name][label]=[]
   for rep in range(1,(4 if label=='TEST 3' else 2)):
    page.evaluate('() => sessionStorage.clear()'); errs.clear()
    try:
     page.locator('#niPrompt').fill(prompt_text)
     page.locator('#niBuild').click(force=True)
     page.locator('#niState').wait_for(state='visible',timeout=5000)
     with page.expect_response(lambda r:r.url==BASE+'/api/nova' and r.request.method=='POST',timeout=100000) as ev: pass
    except Exception:
     try:
      with page.expect_response(lambda r:r.url==BASE+'/api/nova' and r.request.method=='POST',timeout=100000) as ev: pass
     except Exception: ev=None
    try:
     if ev is None: raise RuntimeError('production API response not observed')
     api=ev.value; body=api.json(); a=str(body.get('answer','')).strip(); honest=limitation(label,a.lower())
     if a:
      try: page.wait_for_function('(expected) => { const r=document.querySelector("#niResult"); return !!r && r.innerText.includes(expected); }', a, timeout=20000)
      except Exception: pass
     try: page.wait_for_function('() => { const s=document.querySelector("#niState"); return s && !["READY","SUBMITTING","PROCESSING","STILL WORKING"].includes(s.innerText.trim()); }', timeout=10000)
     except Exception: pass
     rendered=page.locator('#niResult').inner_text().strip(); state=page.locator('#niState').inner_text().strip(); metrics=page.evaluate('() => ({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,scrollHeight:document.documentElement.scrollHeight,clientHeight:document.documentElement.clientHeight})')
     fallback='Nova could not complete the request' in rendered and body.get('mode') != 'limit'; numeric=bool(re.fullmatch(r'[\d\s,.%+\-*/()×÷:$]+',a)); same=bool(a and a in rendered)
     item={'http':api.status,'mode':body.get('mode'),'provider':body.get('provider'),'requestId':body.get('requestId'),'responseLength':len(a),'finishReason':body.get('finishReason','not-exposed-by-api'),'complete':complete(label,a),'naturalLanguage':natural(a),'honestLimitation':honest,'unexplainedTruncation':bool(a.endswith('...') or a.endswith('…')),'numericOnly':numeric,'uiDisplayedFullAnswer':same,'fallbackUi':fallback,'uiState':state,'consoleErrors':errs[-10:],'viewport':metrics,'answerPrefix':a[:3500]}
     item['success']=api.status==200 and body.get('provider')=='gemini' and (body.get('mode')=='answer' or honest) and item['complete'] and same and not fallback and not numeric and state not in ('READY','SUBMITTING','PROCESSING','STILL WORKING') and metrics['scrollWidth']<=metrics['clientWidth']+6
    except Exception as e:
     item={'http':None,'mode':None,'provider':None,'requestId':None,'responseLength':0,'finishReason':'unavailable','complete':False,'naturalLanguage':False,'honestLimitation':False,'unexplainedTruncation':False,'numericOnly':False,'uiDisplayedFullAnswer':False,'fallbackUi':False,'uiState':'unknown','consoleErrors':errs[-10:],'viewport':{},'error':str(e),'success':False}
    results['browser'][name][label].append(item); print('BROWSER',name,label,'RUN',rep,json.dumps(item,ensure_ascii=False))
    if label=='TEST 1' and rep==1: page.screenshot(path=f'nova-evidence/{name}-completed.png',full_page=True)
    if errs: browser_errors.extend([name+':'+e for e in errs]); errs.clear()
  ctx.close()
 browser.close()

case_pass={l: all(x['success'] for x in results['api'][l]) and all(x['success'] for name in results['browser'] for x in results['browser'][name][l]) for l in TESTS}
passed=sum(case_pass.values()); t3_api=sum(x['success'] for x in results['api']['TEST 3']); t3_browser=sum(x['success'] for name in results['browser'] for x in results['browser'][name]['TEST 3'])
summary={'casePass':case_pass,'passedCases':passed,'totalCases':10,'caseSuccessRate':passed/10,'apiAttempts':sum(len(v) for v in results['api'].values()),'apiFailures':sum(not x['success'] for v in results['api'].values() for x in v),'test3ApiSuccess':f'{t3_api}/3','test3BrowserSuccess':f'{t3_browser}/9','browserConsoleErrors':browser_errors[:100],'viewports':[name for name,_,_ in VIEWPORTS]}
Path('nova-reliability-results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False)+'\n',encoding='utf-8'); Path('nova-reliability-summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print('FINAL_BATTERY_SUMMARY=',json.dumps(summary,indent=2,ensure_ascii=False))
if passed<9 or t3_api!=3 or t3_browser!=9 or browser_errors: raise SystemExit('PRODUCTION RELIABILITY BATTERY FAILED')
print('PRODUCTION RELIABILITY BATTERY PASSED')
