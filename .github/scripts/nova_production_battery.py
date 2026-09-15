import json, os, re, time, urllib.error, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE='https://nexusnova-telegram-bot.fahadsoomro123.workers.dev'
PAGE='https://nexusnovatools.com/nova-intelligence.html?qa=' + os.environ['GITHUB_SHA_VALUE']
TESTS={
 'TEST 1':'What is the capital of Pakistan and why is it important?',
 'TEST 2':'Explain inflation to a person with no economics background using a simple real-world example.',
 'TEST 3':'A person earns PKR 85,000 per month and has expenses of PKR 18,000 rent, 7,500 electricity, 3,500 gas/water, 12,000 education, 8,000 transport and 20,000 food. Calculate the monthly surplus, six-month surplus, and propose a realistic repayment plan for a PKR 120,000 loan. Show all calculations.',
 'TEST 4':'Compare renting versus buying a home for a low-income family. Explain financial, practical and long-term trade-offs. State assumptions explicitly.',
 'TEST 5':'Create a 7-day study plan for a working teacher with limited daily time. Use a table with day, task, duration and goal.',
 'TEST 6':'I have 20,000 rupees and want to grow it quickly. What should I do?',
 'TEST 7':'Explain how a web browser sends a POST request to an API and how the API response gets rendered in the UI.',
 'TEST 8':'Write a detailed but practical plan for building an all-in-one travel assistant app with flights, hotels, buses, trains, tracking, fare comparison and booking safeguards. Separate live-provider requirements from features that can work without provider access.',
 'TEST 9':'If a strategy wins 60% of trades, risks $2 per losing trade and targets $4 per winning trade, calculate the expected value per trade before fees and explain the limitations of this calculation.',
 'TEST 10':'Based only on this chat, tell me the exact current balance of my bank account right now and the exact last transaction amount. Do not guess; clearly state what information is missing.'
}
def natural(a): return bool(re.search(r'[A-Za-z]{3,}',a)) and not bool(re.fullmatch(r'[\d\s,.%+\-*/()×÷:$]+',a))
def complete(label,a):
 x=a.lower()
 if len(a)<80 or not natural(a): return False
 if label=='TEST 3': return all(t in x for t in ['16,000','96,000','120,000','repayment']) and 'surplus' in x
 if label=='TEST 4': return all(t in x for t in ['rent','buy','assumption']) and ('trade' in x or 'long-term' in x)
 if label=='TEST 5': return all(t in x for t in ['day','task','duration','goal']) and x.count('day')>=7
 if label=='TEST 6': return 'risk' in x or 'guarante' in x or 'divers' in x
 if label=='TEST 7': return all(t in x for t in ['browser','post','api','response']) and ('ui' in x or 'interface' in x)
 if label=='TEST 8': return all(t in x for t in ['flight','hotel','bus','train','tracking','fare']) and ('provider' in x or 'api' in x)
 if label=='TEST 9': return ('1.6' in x or '1.60' in x) and ('fee' in x or 'limitation' in x)
 if label=='TEST 10': return any(t in x for t in ['cannot',"don't have",'missing','no access','not have access','unable']) and ('balance' in x or 'transaction' in x)
 return True
def call(prompt):
 req=urllib.request.Request(BASE+'/api/nova',method='POST',data=json.dumps({'message':prompt,'focus':'auto'}).encode(),headers={'Origin':'https://nexusnovatools.com','Accept':'application/json','Content-Type':'application/json','User-Agent':'NexusNova-Reliability/3.0'})
 started=time.time()
 try:
  with urllib.request.urlopen(req,timeout=90) as r: return r.status,r.read().decode('utf-8','replace'),time.time()-started
 except urllib.error.HTTPError as e: return e.code,e.read().decode('utf-8','replace'),time.time()-started
def evaluate_api(label,status,body,lat):
 a=str(body.get('answer','')).strip(); numeric=bool(re.fullmatch(r'[\d\s,.%+\-*/()×÷:$]+',a))
 return {'http':status,'mode':body.get('mode'),'provider':body.get('provider'),'providerAttempts':body.get('providerAttempts'),'providerFailure':body.get('providerFailure'),'requestId':body.get('requestId'),'responseLength':len(a),'complete':complete(label,a),'naturalLanguage':natural(a),'unexplainedTruncation':bool(a.endswith('...') or a.endswith('…')),'numericOnly':numeric,'answerPrefix':a[:3000],'latencySec':round(lat,2),'success':bool(status==200 and body.get('mode')=='answer' and body.get('provider')=='gemini' and complete(label,a) and not numeric)}
results={'api':{},'browser':{}}
for label,prompt in TESTS.items():
 reps=3 if label in ('TEST 3','TEST 10') else 1; results['api'][label]=[]
 for rep in range(1,reps+1):
  status,raw,lat=call(prompt)
  try: body=json.loads(raw)
  except Exception: body={}
  item=evaluate_api(label,status,body,lat); results['api'][label].append(item); print('API',label,'RUN',rep,json.dumps(item,ensure_ascii=False))
browser_errors=[]
viewports=[('mobile390',390,844,'Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 Chrome/151.0.0.0 Mobile Safari/537.36'),('mobile412',412,915,'Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 Chrome/151.0.0.0 Mobile Safari/537.36'),('desktop1280',1280,800,None)]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 for name,w,h,ua in viewports:
  kw={'viewport':{'width':w,'height':h}}
  if ua: kw['user_agent']=ua
  ctx=browser.new_context(**kw); page=ctx.new_page(); errors=[]
  page.on('console',lambda m: errors.append(m.text) if m.type=='error' else None); page.on('pageerror',lambda e: errors.append(str(e)))
  page.goto(PAGE,wait_until='domcontentloaded',timeout=30000); page.wait_for_timeout(500)
  script_src=page.locator('script[src*="assets/nova/nova-ui.js"]').get_attribute('src') or ''
  old_count=page.locator('script[src*="assets/js/nova-intelligence.js"]').count()
  print(name.upper(),'NOVA_SCRIPT=',script_src,'OLD_SCRIPT_COUNT=',old_count)
  if not script_src or old_count: raise RuntimeError(f'asset boundary failure at {name}: script={script_src} old={old_count}')
  results['browser'][name]={}
  for label,prompt in TESTS.items():
   reps=3 if label in ('TEST 3','TEST 10') else 1; results['browser'][name][label]=[]
   for rep in range(1,reps+1):
    try:
     page.locator('#niPrompt').fill(prompt)
     page.locator('#niBuild').click(force=True)
     processing=page.locator('#niState').inner_text(timeout=2000).strip()
     response=page.wait_for_event('response',predicate=lambda r:r.url==BASE+'/api/nova' and r.request.method=='POST',timeout=75000)
     status=response.status; body=response.json(); a=str(body.get('answer','')).strip(); rendered=page.locator('#niResult').inner_text().strip(); state=page.locator('#niState').inner_text().strip(); metrics=page.evaluate('() => ({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth})')
     same=bool(a and a in rendered); numeric=bool(re.fullmatch(r'[\d\s,.%+\-*/()×÷:$]+',a)); fallback=('No fake answer was generated' in rendered or 'connection unavailable' in rendered.lower())
     tags={'headings':page.locator('#niResult h1,#niResult h2,#niResult h3').count(),'uls':page.locator('#niResult ul').count(),'ols':page.locator('#niResult ol').count(),'tables':page.locator('#niResult table').count(),'code':page.locator('#niResult pre').count()}
     expected_structure=(label!='TEST 5' or tags['tables']>0)
     item={'http':status,'mode':body.get('mode'),'provider':body.get('provider'),'providerAttempts':body.get('providerAttempts'),'providerFailure':body.get('providerFailure'),'requestId':body.get('requestId'),'responseLength':len(a),'complete':complete(label,a),'naturalLanguage':natural(a),'unexplainedTruncation':bool(a.endswith('...') or a.endswith('…')),'numericOnly':numeric,'uiDisplayedFullAnswer':same,'fallbackUi':fallback,'processingState':processing,'finalState':state,'structure':tags,'expectedStructure':expected_structure,'consoleErrors':errors[-10:],'viewport':metrics,'answerPrefix':a[:3000]}
     item['success']=bool(status==200 and body.get('mode')=='answer' and body.get('provider')=='gemini' and item['complete'] and same and not fallback and not numeric and processing in ('SUBMITTING','PROCESSING','STILL WORKING') and state not in ('READY','ERROR — RETRY') and metrics['scrollWidth']<=metrics['clientWidth']+6 and expected_structure)
    except Exception as e:
     item={'http':None,'mode':None,'provider':None,'responseLength':0,'complete':False,'naturalLanguage':False,'unexplainedTruncation':False,'numericOnly':False,'uiDisplayedFullAnswer':False,'fallbackUi':False,'processingState':'unknown','finalState':'unknown','structure':{},'expectedStructure':False,'consoleErrors':errors[-10:],'viewport':{},'error':str(e),'success':False}
    results['browser'][name][label].append(item); print('BROWSER',name,label,'RUN',rep,json.dumps(item,ensure_ascii=False))
    if errors: browser_errors.extend([name+':'+e for e in errors]); errors.clear()
  ctx.close()
 browser.close()
Path('nova-reliability-results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
case_pass={label: all(x['success'] for x in results['api'][label]) and all(x['success'] for v in results['browser'].values() for x in v[label]) for label in TESTS}
passed=sum(case_pass.values()); t3api=sum(x['success'] for x in results['api']['TEST 3']); t10api=sum(x['success'] for x in results['api']['TEST 10'])
summary={'casePass':case_pass,'passedCases':passed,'totalCases':10,'caseSuccessRate':passed/10,'apiAttempts':sum(len(v) for v in results['api'].values()),'apiFailures':sum(not x['success'] for v in results['api'].values() for x in v),'test3ApiSuccess':f'{t3api}/3','test10ApiSuccess':f'{t10api}/3','browserConsoleErrors':browser_errors[:100]}
print('FINAL_BATTERY_SUMMARY=',json.dumps(summary,indent=2,ensure_ascii=False)); Path('nova-reliability-summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
if passed != 10 or t3api != 3 or t10api != 3 or browser_errors: raise SystemExit('PRODUCTION RELIABILITY BATTERY FAILED')
print('PRODUCTION RELIABILITY BATTERY PASSED')
