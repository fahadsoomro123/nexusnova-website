#!/usr/bin/env python3
from __future__ import annotations
import json, re

VERSION='6.0.0-ultimate'

SPECIALISTS={
 'architect':('Software Architect','architecture, dependencies, data flow, maintainability, minimal safe design'),
 'android':('Android Engineer','Android/WebView/Gradle/mobile lifecycle, performance, packaging and APK realities'),
 'frontend':('UI/UX Engineer','responsive UI, accessibility, interaction states, visual consistency and lightweight implementation'),
 'backend':('Backend Engineer','APIs, auth, data validation, state, reliability and integration boundaries'),
 'debugger':('Senior Debugger','root-cause analysis, reproduction, logs, regressions and smallest evidence-backed fix'),
 'security':('Security Reviewer','secret handling, auth boundaries, unsafe exposure, injection, permissions and least privilege'),
 'qa':('QA Engineer','test strategy, edge cases, build evidence, regression checks and honest completion criteria'),
 'seo':('SEO/Content Engineer','current search intent, technical SEO, structured data, internal links, quality content and performance'),
 'research':('Research Analyst','fresh primary sources, dates, conflicting claims, uncertainty and evidence quality'),
 'product':('Product Engineer','owner intent, simple flows, usefulness, scope control and complete end-to-end user outcome'),
}

KEYWORDS={
 'android':('android','apk','gradle','webview','mobile app','phone'),
 'frontend':('design','ui','ux','css','html','screen','layout','icon','responsive'),
 'backend':('api','firebase','auth','database','server','worker','cloudflare','telegram'),
 'debugger':('fix','bug','error','issue','not working','debug','problem','fail'),
 'security':('auth','login','token','secret','permission','security','firebase','payment','wallet'),
 'qa':('build','test','check','release','apk','deploy','working','complete'),
 'seo':('seo','article','traffic','search','google','sitemap','schema','content'),
 'research':('research','latest','current','trend','compare','news','source'),
 'product':('new app','nayi app','app bana','feature','product','user flow'),
 'architect':('architecture','refactor','migration','complex','integration','multiple','system'),
}


def select(message: str, mode: str, level: str, limit: int=3):
    text=(message or '').lower(); scores={k:0 for k in SPECIALISTS}
    for role,words in KEYWORDS.items():
        scores[role]+=sum(2 for w in words if w in text)
    if mode=='builder':
        scores['product']+=4; scores['architect']+=4; scores['qa']+=3
        if 'android' in text or 'apk' in text:scores['android']+=5
        else:scores['frontend']+=3
    if mode=='website':scores['frontend']+=3; scores['seo']+=2; scores['qa']+=2
    if mode=='research':scores['research']+=6
    if mode=='dev':scores['architect']+=2; scores['debugger']+=2; scores['qa']+=2
    if mode=='power':scores['architect']+=3; scores['qa']+=3
    if level in {'deep','builder'}:scores['security']+=1; scores['debugger']+=1
    ranked=[k for k,v in sorted(scores.items(),key=lambda x:(-x[1],x[0])) if v>0]
    if not ranked:ranked=['product','qa']
    return ranked[:max(1,min(int(limit),3))]


def _extract_json(text):
    m=re.search(r'\{[\s\S]*\}',text or '')
    if not m:return {}
    try:return json.loads(m.group(0))
    except Exception:return {}


def council(core,base,model,system_prompt,user,mode,level,context=''):
    if level=='fast':return {'roles':[],'advice':[],'summary':''}
    roles=select(user,mode,level,3); advice=[]
    for role in roles:
        title,focus=SPECIALISTS[role]
        instruction=f'''You are the {title} in NOVA AI POWER V6 Ultimate Specialist Council.
Focus only on: {focus}.
Do NOT execute tools and do NOT claim work is complete. Analyze the owner's task and the supplied project context for the Planner.
Return ONLY JSON: {{"priority":"one sentence","actions":["..."],"risks":["..."],"checks":["..."]}}.
Keep it practical: max 4 actions, 3 risks, 4 checks. Do not invent file names or facts.'''
        payload=f'MODE: {mode}\nLEVEL: {level}\nOWNER REQUEST:\n{user}\n\nPROJECT CONTEXT:\n{context[:14000] or "(none)"}'
        try:
            raw=core.http_json(base+'/api/chat',{'model':model,'messages':[{'role':'system','content':system_prompt+'\n\n'+instruction},{'role':'user','content':payload}],'stream':False,'options':{'temperature':0.05}},timeout=700)
            data=_extract_json(str((raw.get('message') or {}).get('content') or ''))
            advice.append({'role':role,'title':title,'priority':str(data.get('priority') or '')[:700],
                           'actions':[str(x)[:700] for x in (data.get('actions') or [])[:4]],
                           'risks':[str(x)[:600] for x in (data.get('risks') or [])[:3]],
                           'checks':[str(x)[:600] for x in (data.get('checks') or [])[:4]]})
        except Exception as e:
            advice.append({'role':role,'title':title,'priority':'','actions':[],'risks':[],'checks':[],'error':str(e)[:300]})
    summary='; '.join(f"{x['title']}: {x.get('priority','')}" for x in advice if x.get('priority'))[:2200]
    return {'roles':roles,'advice':advice,'summary':summary}


def planner_context(result):
    if not result or not result.get('advice'):return ''
    lines=['ULTIMATE SPECIALIST COUNCIL:']
    for row in result['advice']:
        lines.append(f"\n[{row.get('title',row.get('role'))}]")
        if row.get('priority'):lines.append('Priority: '+row['priority'])
        for x in row.get('actions',[]):lines.append('- Action: '+x)
        for x in row.get('risks',[]):lines.append('- Risk: '+x)
        for x in row.get('checks',[]):lines.append('- Check: '+x)
    return '\n'.join(lines)[:12000]
