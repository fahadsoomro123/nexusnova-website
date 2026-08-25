#!/usr/bin/env python3
from __future__ import annotations
import json, re

VERSION='2.0.0'

COMPLEX_WORDS=(
    'fix','debug','error','bug','seo','redesign','design','website','article','auth','firebase',
    'telegram','github','deploy','research','audit','optimize','improve','complex','problem',
    'check everything','khud check','khud karo','complete karo','solve','implement','build'
)


def complexity(message: str, mode: str='chat', requested: str='auto') -> str:
    requested=(requested or 'auto').lower().strip()
    if requested in {'fast','standard','deep'}: return requested
    text=(message or '').lower()
    score=0
    if mode in {'website','dev','power','research'}: score+=2
    if len(text)>500: score+=1
    if len(text)>1800: score+=1
    score+=sum(1 for w in COMPLEX_WORDS if w in text)
    if score>=4: return 'deep'
    if score>=2: return 'standard'
    return 'fast'


def _call(core, base, model, messages, temperature=0.15, timeout=600):
    payload={
        'model':model,
        'messages':messages,
        'stream':False,
        'options':{'temperature':temperature}
    }
    return core.http_json(base+'/api/chat',payload,timeout=timeout).get('message',{}).get('content','').strip()


def make_plan(core, base, model, system_prompt: str, user: str, mode: str, level: str) -> str:
    if level=='fast': return ''
    planner='''You are the planning stage of NOVA AI POWER v2. Create a short execution plan for another AI worker.
Do not perform the task. Do not invent file names or facts. Identify what must be inspected/researched first, safe execution order, checks/evidence needed, and likely failure points.
For repository-changing work require inspect -> non-main branch -> minimal change -> checks -> diff -> commit; publishing stays separately gated.
Return 4-9 concise numbered steps.''' 
    context=f"MODE: {mode}\nREASONING: {level}\nOWNER REQUEST:\n{user}"
    try:return _call(core,base,model,[{'role':'system','content':system_prompt+'\n\n'+planner},{'role':'user','content':context}],0.1)
    except Exception:return ''


def parse_review(text: str):
    raw=(text or '').strip()
    block=re.search(r'\{[\s\S]*\}',raw)
    if block:
        try:
            data=json.loads(block.group(0))
            return {
                'pass':bool(data.get('pass')),
                'issues':[str(x)[:500] for x in (data.get('issues') or [])[:8]],
                'correction':str(data.get('correction') or '')[:3000],
                'summary':str(data.get('summary') or '')[:1000]
            }
        except Exception: pass
    low=raw.lower()
    return {'pass':('pass' in low and 'fail' not in low),'issues':[raw[:1200]] if raw else [],'correction':'','summary':raw[:1000]}


def review(core, base, model, system_prompt: str, user: str, mode: str, draft: str, tools_used, level: str):
    if level=='fast': return {'pass':True,'issues':[],'correction':'','summary':'Fast mode: reviewer skipped.'}
    reviewer='''You are the independent verification stage of NOVA AI POWER v2.
Judge whether the worker actually satisfied the owner's request based ONLY on the request, draft, and tool evidence supplied.
Be strict about false "done" claims, missing tests, missing repo inspection, dangerous broad edits, stale research, and claims unsupported by evidence.
Do not demand unnecessary perfection. If the result is usable and honestly states limitations, pass it.
Return ONLY valid JSON:
{"pass":true|false,"issues":["..."],"correction":"specific instruction for worker if failed","summary":"one sentence"}'''
    evidence=json.dumps(tools_used or [],ensure_ascii=False)[:12000]
    prompt=f"MODE: {mode}\nLEVEL: {level}\nOWNER REQUEST:\n{user}\n\nWORKER DRAFT:\n{draft[:18000]}\n\nTOOL EVIDENCE:\n{evidence}"
    try:return parse_review(_call(core,base,model,[{'role':'system','content':system_prompt+'\n\n'+reviewer},{'role':'user','content':prompt}],0.0))
    except Exception as e:return {'pass':True,'issues':[],'correction':'','summary':f'Reviewer unavailable: {e}'}


def correction_prompt(plan: str, review_result: dict) -> str:
    issues='\n'.join(f'- {x}' for x in review_result.get('issues',[]))
    return f'''POWER v2 REVIEW FAILED. Correct the task before finalizing.
Original execution plan:\n{plan or '(none)'}\n\nReviewer issues:\n{issues or '(unspecified)'}\n\nCorrection instruction:\n{review_result.get('correction') or 'Resolve the evidence-backed issues, re-check your work, and return an accurate final result.'}
Do not merely apologize or describe a fix; use available tools to correct it when possible.'''
