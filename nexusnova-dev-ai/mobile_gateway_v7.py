#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path

import mobile_gateway_work_v6 as workmax
import pro_tools_v7 as pro

APP='NOVA AI V7 PRO MAX'
VERSION='7.0.0-pro-max'
PRO_TOOLS={'deep_research','knowledge_search','analyze_data'}
PLANNING_JUDGE=True
MEMORY_RETRIEVAL=True

core=workmax.base
_original_mode_tool_names=core.mode_tool_names
_original_all_specs=core.all_specs
_original_execute_tool=core.execute_tool
_original_mode_instructions=core.mode_instructions
_original_evidence=core.evidence
_original_make_plan=core.power.make_plan


def mode_tool_names(mode):
    allowed=set(_original_mode_tool_names(mode))
    if mode=='web':allowed.add('deep_research')
    if mode in {'research','website','dev','builder','power','work'}:allowed|=PRO_TOOLS
    return allowed


def all_specs():
    return _original_all_specs()+pro.tool_specs()


def execute_tool(ws,name,args):
    result=pro.execute(ws,name,args)
    if result is not None:return result
    return _original_execute_tool(ws,name,args)


def mode_instructions(mode):
    text=_original_mode_instructions(mode)
    if mode in {'web','research','power','work'}:
        text+='''\nV7 DEEP RESEARCH: when freshness, comparisons, documentation or evidence matter, prefer deep_research with multiple focused queries. Judge source authority/date and do not turn fetched text into a completion claim.'''
    if mode in {'website','dev','builder','power','work'}:
        text+='''\nV7 SMART CONTEXT: use knowledge_search when the relevant project area is uncertain or broad. Read exact files before editing; retrieval snippets are context, not permission to guess unseen code.'''
    if mode in {'research','website','dev','builder','power','work'}:
        text+='''\nV7 DATA ANALYSIS: use analyze_data for CSV/JSON evidence instead of guessing trends or totals. It is read-only and does not execute arbitrary code.'''
    return text


def evidence(name,result):
    out=_original_evidence(name,result)
    if not isinstance(result,dict):return out
    if name=='deep_research':out['sources']=int(result.get('source_count') or 0)
    if name=='knowledge_search':out['files']=[x.get('path') for x in (result.get('results') or [])[:12]]
    if name=='analyze_data':
        out['path']=result.get('path');out['rows_analyzed']=result.get('rows_analyzed');out['kind']=result.get('kind')
    return out


def _plan_judge(core_module,base,model,system_prompt,user,mode,level,context,plan):
    if level not in {'deep','builder'} or mode not in {'power','work','builder','dev','website','research'} or not plan.get('steps'):
        return plan
    instruction='''You are NOVA AI V7 Executive Planning Judge. Independently improve the proposed plan before any tools execute. Preserve good specialist advice but fix missing owner requirements, unsafe sequencing, weak verification, unnecessary work, and missing evidence criteria. Return ONLY JSON: {"summary":"...","steps":["..."],"success":["..."],"risks":["..."]}. Keep 4-12 concrete steps. Never claim work is already complete.'''
    payload={'owner_request':user,'mode':mode,'level':level,'proposed_plan':{k:plan.get(k) for k in ('summary','steps','success','risks')},'context':str(context or '')[:16000]}
    try:
        raw=core.power._call(core_module,base,model,[{'role':'system','content':system_prompt+'\n\n'+instruction},{'role':'user','content':json.dumps(payload,ensure_ascii=False)}],0.0,700)
        data=core.power._extract_json(raw,{})
        steps=[str(x)[:900] for x in (data.get('steps') or [])[:12]]
        if len(steps)<2:return plan
        return {'summary':str(data.get('summary') or plan.get('summary') or '')[:1200],
                'steps':steps,
                'success':[str(x)[:700] for x in (data.get('success') or plan.get('success') or [])[:7]],
                'risks':[str(x)[:700] for x in (data.get('risks') or plan.get('risks') or [])[:7]],
                'specialists':plan.get('specialists',[]),'council':plan.get('council',[])}
    except Exception:return plan


def make_plan(core_module,base,model,system_prompt,user,mode,level,context=''):
    plan=_original_make_plan(core_module,base,model,system_prompt,user,mode,level,context)
    return _plan_judge(core_module,base,model,system_prompt,user,mode,level,context,plan)


def _memory_terms(text):
    stop={'the','and','for','with','this','that','from','into','your','you','meri','mera','mere','mujhe','isko','bhai','please','karo','karna','aur','hai'}
    return [x for x in re.findall(r'[a-z0-9_-]{3,}',str(text or '').lower()) if x not in stop][:30]


def _relevant_memory(rows,query,limit=30):
    rows=list(rows or [])
    if not rows:return []
    terms=_memory_terms(query)
    if not terms:return rows[-limit:]
    scored=[]
    for idx,row in enumerate(rows):
        low=str(row).lower();score=sum(1 for t in terms if t in low)
        if score:scored.append((score,idx,row))
    selected=[x[2] for x in sorted(scored,key=lambda x:(-x[0],-x[1]))[:max(1,limit-8)]]
    for row in rows[-8:]:
        if row not in selected:selected.append(row)
    return selected[:limit]


core.mode_tool_names=mode_tool_names
core.all_specs=all_specs
core.execute_tool=execute_tool
core.mode_instructions=mode_instructions
core.evidence=evidence
core.power.make_plan=make_plan


class ProGateway(workmax.WorkGateway):
    def __init__(self,*args,**kwargs):
        self._v7_context=threading.local()
        super().__init__(*args,**kwargs)

    def memories(self):
        rows=super().memories()
        query=getattr(self._v7_context,'query','')
        return _relevant_memory(rows,query,30) if MEMORY_RETRIEVAL else rows

    def chat(self,body):
        self._v7_context.query=str(body.get('message',''))[:14000]
        try:return super().chat(body)
        finally:self._v7_context.query=''

    def _run_work(self,body,progress=None,cancel_event=None):
        self._v7_context.query=str(body.get('message',''))[:14000]
        try:return super()._run_work(body,progress,cancel_event)
        finally:self._v7_context.query=''

    def health(self):
        data=super().health()
        data['app']=APP;data['version']=VERSION;data['pro_max']=True;data['pro_tools_version']=pro.VERSION
        data['capabilities']=sorted(PRO_TOOLS);data['planning_judge']=PLANNING_JUDGE;data['memory_retrieval']=MEMORY_RETRIEVAL
        return data


def main():
    ap=argparse.ArgumentParser(description=APP)
    ap.add_argument('--workspace',default=os.environ.get('NEXUSNOVA_WORKSPACE','..'))
    ap.add_argument('--host',default=os.environ.get('NEXUSNOVA_MOBILE_HOST','127.0.0.1'))
    ap.add_argument('--port',type=int,default=int(os.environ.get('NEXUSNOVA_MOBILE_PORT','8787')))
    ap.add_argument('--model',default=core.core.DEFAULT_MODEL)
    ap.add_argument('--ollama',default=core.core.DEFAULT_OLLAMA)
    args=ap.parse_args();app_dir=Path(__file__).resolve().parent
    token,token_path=core.load_or_create_token(app_dir);gateway=ProGateway(args.workspace,args.ollama,args.model,token,app_dir)
    ready,models=core.core.ollama_ready(args.ollama)
    print(f'\n{APP} {VERSION}\nWorkspace: {gateway.ws.root}\nModel: {args.model}\nOllama: {"READY" if ready else "NOT READY"} {models}\nPairing token file: {token_path}\nPairing token: {token}\nModes: Chat | Work MAX | Web | Research | Website | Dev | App Builder | Ultimate\nV7 Pro tools: Deep Research | Smart Knowledge Search | CSV/JSON Data Analysis\nExecutive Planning Judge: ON\nRelevant Long-Term Memory Retrieval: ON\nPersistent Workspaces: ON\nBackground local Work jobs: ON while this PC/gateway stays running\nGitHub writes: OFF until explicitly armed\nListening: http://{args.host}:{args.port}\n')
    server=ThreadingHTTPServer((args.host,args.port),workmax.make_work_handler(gateway))
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()


if __name__=='__main__':main()
