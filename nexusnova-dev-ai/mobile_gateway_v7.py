#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
from http.server import ThreadingHTTPServer
from pathlib import Path

import mobile_gateway_work_v6 as workmax
import pro_tools_v7 as pro

APP='NOVA AI V7 PRO MAX'
VERSION='7.0.0-pro-max'
PRO_TOOLS={'deep_research','knowledge_search','analyze_data'}

core=workmax.base
_original_mode_tool_names=core.mode_tool_names
_original_all_specs=core.all_specs
_original_execute_tool=core.execute_tool
_original_mode_instructions=core.mode_instructions
_original_evidence=core.evidence


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


core.mode_tool_names=mode_tool_names
core.all_specs=all_specs
core.execute_tool=execute_tool
core.mode_instructions=mode_instructions
core.evidence=evidence


class ProGateway(workmax.WorkGateway):
    def health(self):
        data=super().health()
        data['app']=APP;data['version']=VERSION;data['pro_max']=True;data['pro_tools_version']=pro.VERSION
        data['capabilities']=sorted(PRO_TOOLS)
        return data


def main():
    ap=argparse.ArgumentParser(description=APP)
    ap.add_argument('--workspace',default=os.environ.get('NEXUSNOVA_WORKSPACE','..'))
    ap.add_argument('--host',default=os.environ.get('NEXUSNOVA_MOBILE_HOST','127.0.0.1'))
    ap.add_argument('--port',type=int,default=int(os.environ.get('NEXUSNOVA_MOBILE_PORT','8787')))
    ap.add_argument('--model',default=core.core.DEFAULT_MODEL)
    ap.add_argument('--ollama',default=core.core.DEFAULT_OLLAMA)
    args=ap.parse_args()
    app_dir=Path(__file__).resolve().parent
    token,token_path=core.load_or_create_token(app_dir)
    gateway=ProGateway(args.workspace,args.ollama,args.model,token,app_dir)
    ready,models=core.core.ollama_ready(args.ollama)
    print(f'\n{APP} {VERSION}\nWorkspace: {gateway.ws.root}\nModel: {args.model}\nOllama: {"READY" if ready else "NOT READY"} {models}\nPairing token file: {token_path}\nPairing token: {token}\nModes: Chat | Work MAX | Web | Research | Website | Dev | App Builder | Ultimate\nV7 Pro tools: Deep Research | Smart Knowledge Search | CSV/JSON Data Analysis\nPersistent Workspaces: ON\nBackground local Work jobs: ON while this PC/gateway stays running\nGitHub writes: OFF until explicitly armed\nListening: http://{args.host}:{args.port}\n')
    server=ThreadingHTTPServer((args.host,args.port),workmax.make_work_handler(gateway))
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()


if __name__=='__main__':main()
