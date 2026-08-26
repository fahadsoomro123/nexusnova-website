#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, os
from http.server import ThreadingHTTPServer
from pathlib import Path

import mobile_gateway_v6 as base
import workspaces_v6 as work

APP='NOVA AI V6 ULTIMATE + WORK'
VERSION='6.1.0-work'
WORK_TOOLS={'work_open','work_context','work_list','work_note','work_task','work_save_artifact'}

_original_mode_tool_names=base.mode_tool_names
_original_all_specs=base.all_specs
_original_execute_tool=base.execute_tool
_original_mode_instructions=base.mode_instructions


def mode_tool_names(mode):
    if mode=='work':return _original_mode_tool_names('power')|WORK_TOOLS
    return _original_mode_tool_names(mode)


def all_specs():return _original_all_specs()+work.tool_specs()


def execute_tool(ws,name,args):
    result=work.execute(ws,name,args)
    if result is not None:return result
    return _original_execute_tool(ws,name,args)


def mode_instructions(mode):
    if mode!='work':return _original_mode_instructions(mode)
    return _original_mode_instructions('power')+'''\n\nNOVA WORK MODE — PERSISTENT OUTCOME WORKSPACE:
- This is not a normal chat. Treat the request as an outcome to complete inside a persistent Work workspace.
- Read the injected WORKSPACE STATE before planning so previous notes, tasks and artifacts survive across sessions.
- Use work_task to keep a short actionable task list. Mark tasks done only after evidence supports completion.
- Use work_note for durable decisions, constraints, handoff details and important discoveries that should survive a new chat.
- Use work_save_artifact for useful text/code deliverables that belong to this Work workspace.
- Combine repo context, web research, Website/Dev/App Builder tools as needed. Do not make the owner translate goals into coding instructions.
- Prefer continuing the current workspace over starting duplicate projects. If a new outcome is clearly unrelated, open a new named workspace.
- Finish each turn with an accurate progress summary: completed, pending, blockers, and where outputs were saved.
- Work can persist state while the PC files remain available, but do not claim background execution after the gateway/computer is stopped.'''


base.mode_tool_names=mode_tool_names
base.all_specs=all_specs
base.execute_tool=execute_tool
base.mode_instructions=mode_instructions


class WorkGateway(base.Gateway):
    def health(self):
        data=super().health(); data['app']=APP; data['version']=VERSION; data['workspaces']=work.VERSION
        modes=list(data.get('modes') or [])
        if 'work' not in modes:modes.insert(1,'work')
        data['modes']=modes
        return data

    def chat(self,body):
        mode=str(body.get('mode','chat')).strip().lower()
        if mode!='work':return super().chat(body)
        message=str(body.get('message','')).strip()[:14000]
        if not message:return 400,{'ok':False,'error':'Message required.'}
        workspace_name=' '.join(str(body.get('work_workspace') or 'NexusNova Work').split())[:140] or 'NexusNova Work'
        opened=work.work_open(self.ws,workspace_name)
        state=work.work_context(self.ws,workspace_name)
        level='deep'
        app_context=str(body.get('app_context','')).strip()[:9000]
        history=base.safe_history(body.get('history')); captured=self.auto_capture(message)
        prompt=base.core.load_prompt(self.app_dir)
        rules=self.rules(); memory=self.memories()
        if rules:prompt+='\n\nOWNER RULES — persist across chats:\n- '+'\n- '.join(rules[-70:])
        if memory:prompt+='\n\nOWNER MEMORY — use only when relevant:\n- '+'\n- '.join(memory[-70:])
        if app_context:prompt+='\n\nMOBILE APP CONTEXT (read-only):\n'+app_context
        project_result=base.project.project_context(self.ws,message,10)
        chunks=[]
        if project_result.get('ok'):
            for row in project_result.get('results',[])[:10]:
                chunks.append(f"FILE: {row.get('path')}\n"+'\n---\n'.join(row.get('snippets') or []))
        work_text=json.dumps(state,ensure_ascii=False)[:16000]
        context_text=('PERSISTENT WORKSPACE STATE:\n'+work_text+'\n\nPROJECT CONTEXT:\n'+'\n\n'.join(chunks))[:30000]
        try:
            plan=base.power.make_plan(base.core,self.ollama,self.model,prompt,message,'work',level,context_text)
            plan_text=base.power.worker_plan_text(plan)
            pre=[base.evidence('work_open',opened),base.evidence('work_context',state)]
            cp=base.project.create_checkpoint(self.ws,'nova-work-task-start'); pre.append(base.evidence('create_checkpoint',cp)); pre.append(base.evidence('project_context',project_result))
            reply,used=base.worker_turn(self.ws,self.ollama,self.model,prompt,history,message,'work',plan_text,context_text,'',24)
            used=pre+used
            if base.power.should_auto_verify(used):
                used.append(base.evidence('run_checks',base.core.execute(self.ws,'run_checks',{})))
                scaffold_paths=[x.get('path') for x in used if x.get('tool')=='scaffold_app' and x.get('ok') and x.get('path')]
                build_path=scaffold_paths[-1] if scaffold_paths else '.'
                used.append(base.evidence('run_build',base.project.run_build(self.ws,build_path,level)))
                used.append(base.evidence('git_diff',base.core.execute(self.ws,'git_diff',{})))
                used.append(base.evidence('git_status',base.core.execute(self.ws,'git_status',{})))
            review=base.power.review(base.core,self.ollama,self.model,prompt,message,'work',level,reply,used,plan)
            critic=base.power.critic(base.core,self.ollama,self.model,prompt,message,'work',level,reply,used,review)
            corrected=0
            while corrected<2 and (not review.get('pass') or not critic.get('pass')):
                corrected+=1
                note=base.power.correction_note(plan,review,critic,corrected)
                reply2,used2=base.worker_turn(self.ws,self.ollama,self.model,prompt,history,message,'work',plan_text,context_text,note,24)
                reply=reply2; used.extend(used2)
                if base.power.should_auto_verify(used2):
                    used.append(base.evidence('run_checks',base.core.execute(self.ws,'run_checks',{})))
                    used.append(base.evidence('run_build',base.project.run_build(self.ws,'.',level)))
                    used.append(base.evidence('git_diff',base.core.execute(self.ws,'git_diff',{})))
                review=base.power.review(base.core,self.ollama,self.model,prompt,message,'work',level,reply,used,plan)
                critic=base.power.critic(base.core,self.ollama,self.model,prompt,message,'work',level,reply,used,review)
            latest=work.work_context(self.ws,workspace_name)
            self.journal(message,'work',level,used,review,critic)
            return 200,{'ok':True,'reply':reply,'mode':'work','model':self.model,'tools_used':used,'github_writes':bool(base.core.STATE.get('github_writes')),
                        'memory_captured':captured,'rules_count':len(self.rules()),'memory_count':len(self.memories()),'work':latest,
                        'power':{'version':base.power.VERSION,'reasoning':level,'planned':bool(plan.get('steps')),'specialists':plan.get('specialists',[]),
                                 'review_pass':bool(review.get('pass')),'review_score':review.get('score',0),'review_summary':review.get('summary',''),
                                 'critic_pass':bool(critic.get('pass')),'critic_summary':critic.get('summary',''),'correction_passes':corrected}}
        except Exception as e:return 503,{'ok':False,'error':str(e)}


base.Gateway=WorkGateway


def main():
    ap=argparse.ArgumentParser(description=APP)
    ap.add_argument('--workspace',default=os.environ.get('NEXUSNOVA_WORKSPACE','..'))
    ap.add_argument('--host',default=os.environ.get('NEXUSNOVA_MOBILE_HOST','127.0.0.1'))
    ap.add_argument('--port',type=int,default=int(os.environ.get('NEXUSNOVA_MOBILE_PORT','8787')))
    ap.add_argument('--model',default=base.core.DEFAULT_MODEL); ap.add_argument('--ollama',default=base.core.DEFAULT_OLLAMA); args=ap.parse_args()
    app_dir=Path(__file__).resolve().parent; token,token_path=base.load_or_create_token(app_dir)
    gateway=WorkGateway(args.workspace,args.ollama,args.model,token,app_dir); ready,models=base.core.ollama_ready(args.ollama)
    print(f'\n{APP} {VERSION}\nWorkspace: {gateway.ws.root}\nModel: {args.model}\nOllama: {"READY" if ready else "NOT READY"} {models}\nPairing token file: {token_path}\nPairing token: {token}\nModes: Chat | Work | Web | Research | Website | Dev | App Builder | Ultimate\nPersistent Workspaces: ON\nGitHub writes: OFF until explicitly armed\nListening: http://{args.host}:{args.port}\n')
    server=ThreadingHTTPServer((args.host,args.port),base.make_handler(gateway))
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()

if __name__=='__main__':main()
