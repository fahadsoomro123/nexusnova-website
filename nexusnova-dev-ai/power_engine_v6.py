#!/usr/bin/env python3
from __future__ import annotations
import json, re

VERSION='6.0.0'

COMPLEX_WORDS=(
 'fix','debug','error','bug','seo','redesign','design','website','article','auth','firebase','telegram','github','deploy',
 'research','audit','optimize','improve','complex','problem','check everything','khud check','khud karo','complete karo','solve',
 'implement','build','app','android','apk','database','api','migration','performance','security','architecture','refactor'
)
BUILDER_WORDS=('new app','nayi app','app bana','application bana','build an app','create app','apk bana','project bana')


def route(message: str, mode: str='chat', requested: str='auto'):
    text=(message or '').lower(); requested=(requested or 'auto').lower().strip()
    if mode=='builder' or any(x in text for x in BUILDER_WORDS):kind='builder'
    elif mode in {'power','research'}:kind='deep'
    else:
        score=(2 if mode in {'website','dev'} else 0)+(1 if len(text)>500 else 0)+(1 if len(text)>1800 else 0)
        score+=sum(1 for w in COMPLEX_WORDS if w in text)
        kind='deep' if score>=5 else ('standard' if score>=2 else 'fast')
    if requested in {'fast','standard','deep','builder'}:kind=requested
    if mode=='builder':kind='builder'
    return kind


def _call(core,base,model,messages,temperature=0.12,timeout=700,options=None):
    opts={'temperature':temperature}
    if options:opts.update(options)
    payload={'model':model,'messages':messages,'stream':False,'options':opts}
    return str(core.http_json(base+'/api/chat',payload,timeout=timeout).get('message',{}).get('content','')).strip()


def _extract_json(text,default):
    block=re.search(r'\{[\s\S]*\}',text or '')
    if block:
        try:return json.loads(block.group(0))
        except Exception:pass
    return default


def make_plan(core,base,model,system_prompt,user,mode,level,context=''):
    if level=='fast':return {'steps':[],'success':[],'risks':[],'summary':'Fast task'}
    planner='''You are NOVA AI POWER V6 Planner. Plan for another tool-using worker.
Return ONLY JSON: {"summary":"...","steps":["..."],"success":["..."],"risks":["..."]}.
Rules: do not pretend work is done; use supplied project context; inspect before editing; for code changes require non-main branch, minimal reversible changes, checks/build, diff/evidence. For Builder mode include scaffold/inspect/implementation/build/export only when relevant. Keep 4-10 concrete steps and 2-6 success criteria.'''
    msg=f'MODE: {mode}\nLEVEL: {level}\nOWNER REQUEST:\n{user}\n\nPROJECT CONTEXT:\n{context[:18000] or "(none yet)"}'
    try:
        raw=_call(core,base,model,[{'role':'system','content':system_prompt+'\n\n'+planner},{'role':'user','content':msg}],0.08)
        data=_extract_json(raw,{})
        return {
          'summary':str(data.get('summary') or '')[:1000],
          'steps':[str(x)[:900] for x in (data.get('steps') or [])[:10]],
          'success':[str(x)[:700] for x in (data.get('success') or [])[:6]],
          'risks':[str(x)[:700] for x in (data.get('risks') or [])[:6]]
        }
    except Exception:return {'steps':[],'success':[],'risks':[],'summary':''}


def worker_plan_text(plan):
    if not plan or not plan.get('steps'):return ''
    lines=['V6 EXECUTION PLAN:']+[f'{i+1}. {x}' for i,x in enumerate(plan['steps'])]
    if plan.get('success'):lines+=['SUCCESS CRITERIA:']+[f'- {x}' for x in plan['success']]
    if plan.get('risks'):lines+=['RISKS TO WATCH:']+[f'- {x}' for x in plan['risks']]
    return '\n'.join(lines)


def review(core,base,model,system_prompt,user,mode,level,draft,evidence,plan):
    if level=='fast':return {'pass':True,'score':0.75,'issues':[],'correction':'','summary':'Fast mode reviewer skipped.'}
    reviewer='''You are NOVA AI POWER V6 Evidence Reviewer. Judge the worker using ONLY owner request, plan/success criteria, final draft and structured tool evidence. Be strict about false completion claims, missing inspection, missing build/tests after code edits, unsafe main-branch edits, missing diff/check evidence, stale research, and unverified deploy/live claims. Honest limitations may still pass. Return ONLY JSON: {"pass":true|false,"score":0.0,"issues":["..."],"correction":"...","summary":"..."}.'''
    payload={'owner_request':user,'mode':mode,'level':level,'plan':plan,'worker_draft':draft[:22000],'evidence':evidence[-80:]}
    try:
        data=_extract_json(_call(core,base,model,[{'role':'system','content':system_prompt+'\n\n'+reviewer},{'role':'user','content':json.dumps(payload,ensure_ascii=False)}],0.0),{})
        return {'pass':bool(data.get('pass')),'score':float(data.get('score') or 0),'issues':[str(x)[:700] for x in (data.get('issues') or [])[:10]],'correction':str(data.get('correction') or '')[:4000],'summary':str(data.get('summary') or '')[:1200]}
    except Exception as e:return {'pass':True,'score':0.5,'issues':[],'correction':'','summary':f'Reviewer unavailable: {e}'}


def critic(core,base,model,system_prompt,user,mode,level,draft,evidence,review_result):
    if level not in {'deep','builder'}:return {'pass':True,'issues':[],'correction':'','summary':'Critic skipped.'}
    critic_prompt='''You are NOVA AI POWER V6 Critic, a second independent checker. Look for ONE OR MORE material gaps the reviewer may miss: unmet owner requirement, likely regression, missing app usability, missing mobile responsiveness, insufficient project context, build not actually run, dangerous broad rewrite, or unsupported claim. Do not nitpick style. Return ONLY JSON: {"pass":true|false,"issues":["..."],"correction":"...","summary":"..."}.'''
    payload={'request':user,'mode':mode,'draft':draft[:18000],'evidence':evidence[-80:],'review':review_result}
    try:
        data=_extract_json(_call(core,base,model,[{'role':'system','content':system_prompt+'\n\n'+critic_prompt},{'role':'user','content':json.dumps(payload,ensure_ascii=False)}],0.0),{})
        return {'pass':bool(data.get('pass')),'issues':[str(x)[:700] for x in (data.get('issues') or [])[:8]],'correction':str(data.get('correction') or '')[:3500],'summary':str(data.get('summary') or '')[:1000]}
    except Exception as e:return {'pass':True,'issues':[],'correction':'','summary':f'Critic unavailable: {e}'}


def correction_note(plan,review_result,critic_result,attempt):
    issues=[]
    issues.extend(review_result.get('issues') or [])
    issues.extend(critic_result.get('issues') or [])
    corrections=[review_result.get('correction',''),critic_result.get('correction','')]
    return f'''NOVA AI POWER V6 RECOVERY PASS {attempt}.
The previous result did not fully pass independent verification. Use tools to FIX the material issues, not merely describe them.
Original plan:\n{worker_plan_text(plan) or '(none)'}
Issues:\n{chr(10).join('- '+x for x in issues) or '- Re-verify task completely.'}
Correction guidance:\n{chr(10).join(x for x in corrections if x) or 'Resolve evidence-backed gaps, re-run relevant checks/build, inspect diff/evidence, then return an accurate final result.'}
Never claim deployment/live success unless actually verified.'''


def should_auto_verify(evidence):
    mutating={'write_file','scaffold_app','git_commit'}
    return any(x.get('tool') in mutating and x.get('ok') for x in evidence)
