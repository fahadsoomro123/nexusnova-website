import json, os, re, time, urllib.error, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE='https://nexusnova-telegram-bot.fahadsoomro123.workers.dev'; PAGE='https://nexusnovatools.com/nova-intelligence.html?qa='+os.environ['GITHUB_SHA']; E=Path('nova-evidence'); E.mkdir(parents=True,exist_ok=True)
V=[('mobile-390',390,844,True),('mobile-412',412,915,True),('desktop-1280',1280,800,False)]
T={'TEST 1':'What is the capital of Pakistan and why is it important?','TEST 2':'Explain inflation to a person with no economics background using a simple real-world example.','TEST 3':'A person earns PKR 85,000 per month and has expenses of PKR 18,000 rent, 7,500 electricity, 3,500 gas/water, 12,000 education, 8,000 transport and 20,000 food. Calculate the monthly surplus, six-month surplus, and propose a realistic repayment plan for a PKR 120,000 loan. Show all calculations.','TEST 4':'Compare renting versus buying a home for a low-income family. Explain financial, practical and long-term trade-offs. State assumptions explicitly.','TEST 5':'Create a 7-day study plan for a working teacher with limited daily time. Use a table with day, task, duration and goal.','TEST 6':'I have 20,000 rupees and want to grow it quickly. What should I do?','TEST 7':'Explain how a web browser sends a POST request to an API and how the API response gets rendered in the UI.','TEST 8':'Write a detailed but practical plan for building an all-in-one travel assistant app with flights, hotels, buses, trains, tracking, fare comparison and booking safeguards. Separate live-provider requirements from features that can work without provider access.','TEST 9':'If a strategy wins 60% of trades, risks $2 per losing trade and targets $4 per winning trade, calculate the expected value per trade before fees and explain the limitations of this calculation.','TEST 10':'Based only on this chat, tell me the exact current balance of my bank account right now and the exact last transaction amount. Do not guess; clearly state what information is missing.'}
S='Give a practical answer using a level-2 heading, two short paragraphs, a 3-item bullet list, a 3-step numbered list, a small Markdown table with two data rows, one short JavaScript fenced code block, one blockquote, and one bold phrase. Do not invent facts.'
def natural(a): return bool(re.search(r'[A-Za-z]{3,}',a)) and not bool(re.fullmatch(r'[\d\s,.%+\-*/()×÷:$]+',a))
def limited(label,a):
 x=a.lower(); return label=='TEST 10' and any(k in x for k in ('cannot',"don't have",'missing','no access','unable')) and any(k in x for k in ('balance','transaction'))
def complete(label,a):
 x=a.lower()
 if len(a)<80 or not natural(a): return False
 if limited(label,a): return True
 rules={'TEST 3':all(k in x for k in ('16,000','96,000','120,000','repayment')) and 'surplus' in x,'TEST 4':all(k in x for k in ('rent','buy','assumption')) and ('trade' in x or 'long-term' in x),'TEST 5':all(k in x for k in ('day','task','duration','goal')) and x.count('day')>=7,'TEST 6':any(k in x for k in ('risk','guarante','divers')),'TEST 7':all(k in x for k in ('browser','post','api','response')) and ('ui' in x or 'interface' in x),'TEST 8':all(k in x for k in ('flight','hotel','bus','train','tracking','fare')) and ('provider' in x or 'api' in x),'TEST 9':('1.6' in x or '1.60' in x) and ('fee' in x or 'limitation' in x)}
 return rules.get(label,True)
def api_call(prompt):
 req=urllib.request.Request(BASE+'/api/nova',method='POST',data=json.dumps({'message':prompt,'focus':'auto'}).encode(),headers={'Origin':'https://nexusnovatools.com','Accept':'application/json','Content-Type':'application/json','User-Agent':'NexusNova-Reliability/10.0'}); t=time.time()
 try:
  with urllib.request.urlopen(req,timeout=90) as r:return r.status,r.read().decode('utf-8','replace'),time.time()-t
 except urllib.error.HTTPError as e:return e.code,e.read().decode('utf-8','replace'),time.time()-t
def record(status,raw,label,lat,run):
 try:b=json.loads(raw)
 except Exception:b={}
 a=str(b.get('answer','')).strip(); lim=limited(label,a); num=bool(re.fullmatch(r'[\d\s,.%+\-*/()×÷:$]+',a))
 return {'run':run,'http':status,'mode':b.get('mode'),'provider':b.get('provider'),'requestId':b.get('requestId'),'responseLength':len(a),'complete':complete(label,a),'honestLimitation':lim,'numericOnly':num,'unexplainedTruncation':a.endswith(('...','…')),'latencySec':round(lat,2),'answerPrefix':a[:3500],'success':status==200 and b.get('provider')=='gemini' and (b.get('mode')=='answer' or lim) and complete(label,a) and bool(a) and not num}
R={'api':{},'browser':{}}
for label,prompt in T.items():
 reps=3 if label in {'TEST 3','TEST 9','TEST 10'} else 1; R['api'][label]=[]
 for run in range(1,reps+1):
  row=record(*api_call(prompt),label,run); R['api'][label].append(row); print('API',label,run,json.dumps(row,ensure_ascii=False))
errs=[]
with sync_playwright() as p:
 br=p.chromium.launch(headless=True)
 for name,w,h,mobile in V:
  args={'viewport':{'width':w,'height':h}}
  if mobile: args['user_agent']='Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 Chrome/151.0.0.0 Mobile Safari/537.36'
  c=br.new_context(**args); page=c.new_page(); ce=[]; page.on('console',lambda m:ce.append(m.text) if m.type=='error' else None); page.on('pageerror',lambda e:ce.append(str(e))); page.goto(PAGE,wait_until='domcontentloaded',timeout=30000); page.wait_for_timeout(400)
  assets=page.evaluate('''() => ({script:document.querySelector('script[src*="nova-ui.js"]')?.src||'',css:document.querySelector('link[href*="nova-intelligence.css"]')?.href||'',accessCss:document.querySelector('link[href*="nova-accessibility.css"]')?.href||'',robots:document.querySelector('meta[name="robots"]')?.content||''})''')
  empty=page.locator('#niResult').inner_text().strip(); page.screenshot(path=str(E/f'{name}-empty.png'),full_page=True); page.locator('#niPrompt').fill(S); processing=False
  with page.expect_response(lambda r:r.url==BASE+'/api/nova' and r.request.method=='POST',timeout=100000) as ev:
   page.locator('#niBuild').click(force=True)
   try: page.wait_for_function('() => ["SUBMITTING","PROCESSING","STILL WORKING"].includes(document.querySelector("#niState")?.innerText.trim())',timeout=3000); processing=True
   except Exception: pass
  resp=ev.value; body=resp.json(); answer=str(body.get('answer','')).strip()
  try: page.wait_for_function('(x)=>document.querySelector("#niResult")?.innerText.includes(x)',answer[:100],timeout=20000)
  except Exception: pass
  rendered=page.locator('#niResult').inner_text().strip(); state=page.locator('#niState').inner_text().strip(); hc=page.evaluate('''() => ({headings:document.querySelectorAll('#niResult h1,#niResult h2,#niResult h3').length,paragraphs:document.querySelectorAll('#niResult p').length,lists:document.querySelectorAll('#niResult ul,#niResult ol').length,tables:document.querySelectorAll('#niResult table').length,code:document.querySelectorAll('#niResult pre.ni-code').length,quotes:document.querySelectorAll('#niResult blockquote').length,dangerous:!!document.querySelector('#niResult script,#niResult iframe,#niResult object'),sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth})''')
  ok=resp.status==200 and body.get('provider')=='gemini' and bool(answer) and answer in rendered and hc['headings']>=1 and hc['paragraphs']>=2 and hc['lists']>=2 and hc['tables']>=1 and hc['code']>=1 and hc['quotes']>=1 and not hc['dangerous'] and hc['sw']<=hc['cw']+6 and not ce
  R['browser'][name]={'assets':assets,'emptyState':empty,'processingSeen':processing,'structured':{'http':resp.status,'provider':body.get('provider'),'mode':body.get('mode'),'state':state,'checks':hc,'success':ok}}
  page.screenshot(path=str(E/f'{name}-completed.png'),full_page=True)
  if name=='mobile-390' and ok:
   with page.expect_response(lambda r:r.url==BASE+'/api/nova' and r.request.method=='POST',timeout=100000):page.get_by_role('button',name='Retry').click()
   rs=page.locator('#niState').inner_text().strip(); cb=page.get_by_role('button',name='Copy'); copied=False
   if cb.count()==1:
    page.context.grant_permissions(['clipboard-read','clipboard-write'],origin='https://nexusnovatools.com'); cb.click(); page.wait_for_timeout(200); copied=cb.inner_text().strip()=='Copied'
   page.get_by_role('button',name='Clear').click(); cleared=page.locator('#niPrompt').input_value()=='' and page.locator('#niState').inner_text().strip()=='READY'; R['browser'][name]['actions']={'retryWorked':rs not in ('READY','ERROR — RETRY','LIMITED'),'copyWorked':copied,'clearWorked':cleared}
  if ce: errs.extend(name+':'+e for e in ce)
  c.close()
 ectx=br.new_context(viewport={'width':390,'height':844}); ep=ectx.new_page(); ep.goto(PAGE,wait_until='domcontentloaded',timeout=30000); ep.route(BASE+'/api/nova',lambda route:route.abort('failed')); ep.locator('#niPrompt').fill('Show the network recovery state.'); ep.locator('#niBuild').click(force=True); ep.wait_for_function('() => document.querySelector("#niState")?.innerText.includes("ERROR")',timeout=5000); txt=ep.locator('#niResult').inner_text().strip(); R['browser']['error-recovery']={'state':ep.locator('#niState').inner_text().strip(),'hasRetry':ep.get_by_role('button',name='Retry').count()==1,'honestError':'No fake answer was generated' in txt,'success':'ERROR' in ep.locator('#niState').inner_text().strip() and ep.get_by_role('button',name='Retry').count()==1 and 'No fake answer was generated' in txt}; ectx.close(); br.close()
summary={'test3Api':f"{sum(x['success'] for x in R['api']['TEST 3'])}/3",'test9Api':f"{sum(x['success'] for x in R['api']['TEST 9'])}/3",'test10Api':f"{sum(x['success'] for x in R['api']['TEST 10'])}/3",'browser':{k:(v['structured']['success'] if k!='error-recovery' else v['success']) for k,v in R['browser'].items()},'browserErrors':errs}
Path('nova-reliability-results.json').write_text(json.dumps(R,indent=2,ensure_ascii=False)+'\n',encoding='utf-8');Path('nova-reliability-summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
api_ok=all(all(x['success'] for x in rows) for rows in R['api'].values()); browser_ok=all(R['browser'][n]['structured']['success'] for n,_,_,_ in V) and R['browser']['error-recovery']['success'] and R['browser'].get('mobile-390',{}).get('actions',{}).get('retryWorked') and R['browser'].get('mobile-390',{}).get('actions',{}).get('copyWorked') and R['browser'].get('mobile-390',{}).get('actions',{}).get('clearWorked')
if not api_ok or not browser_ok or errs: raise SystemExit('PRODUCTION RELIABILITY BATTERY FAILED')
print('PRODUCTION RELIABILITY BATTERY PASSED',json.dumps(summary,ensure_ascii=False))
