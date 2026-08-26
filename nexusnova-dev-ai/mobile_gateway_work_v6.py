#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, os
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import mobile_gateway_v6 as base
import workspaces_v6 as work
import work_runtime_v6 as runtime
import work_intelligence_v6 as intelligence

APP='NOVA AI V6 ULTIMATE + WORK MAX'
VERSION='6.2.0-work-max'
WORK_TOOLS={'work_open','work_context','work_list','work_set_instructions','work_note','work_task','work_save_file','work_read_file','work_save_artifact'}

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
    return _original_mode_instructions('power')+'''\n\nNOVA WORK MAX — PERSISTENT OUTCOME AGENT:
- This is not a normal chat. Treat the owner's request as an outcome to complete inside a persistent Work workspace.
- Read WORKSPACE STATE before planning. Objective, workspace instructions, source files, notes, tasks and artifacts survive across sessions.
- Use work_read_file when a saved Work source file/artifact is relevant; do not guess its contents from the filename.
- Keep a short actionable task list with work_task. Mark tasks done only after evidence supports completion.
- Use work_note for durable decisions, constraints, handoff details and important discoveries.
- Use work_save_artifact for useful final deliverables and work_save_file for durable reference/source text supplied during the task.
- Combine repository context, web research, Website/Dev/App Builder tools and specialist agents as needed. Resolve routine implementation details yourself.
- Prefer continuing the current workspace over creating duplicate projects.
- Verify code changes with recognized checks/build/diff. Never claim deploy/live/browser success without evidence.
- A delegated background task may continue only while the local gateway/PC remains running. Never claim cloud execution when the PC is off.'''


base.mode_tool_names=mode_tool_names
base.all_specs=all_specs
base.execute_tool=execute_tool
base.mode_instructions=mode_instructions


class WorkGateway(base.Gateway):
    def __init__(self,workspace,ollama,model,token,app_dir):
        super().__init__(workspace,ollama,model,token,app_dir)
        self.runtime=runtime.WorkRuntime(self.state,self._background_runner)

    def health(self):
        data=super().health(); data['app']=APP; data['version']=VERSION
        data['workspaces']=work.VERSION; data['work_runtime']=runtime.VERSION; data['work_intelligence']=intelligence.VERSION
        modes=list(data.get('modes') or [])
        if 'work' not in modes:modes.insert(1,'work')
        data['modes']=modes;data['work_max']=True;data['background_local']=True;data['work_jobs']=self.runtime.stats()
        return data

    def _background_runner(self,body,progress,cancel_event):
        return self._run_work(body,progress,cancel_event)

    def chat(self,body):
        mode=str(body.get('mode','chat')).strip().lower()
        if mode!='work':return super().chat(body)
        if bool(body.get('work_background')):
            queued=self.runtime.submit(body)
            if not queued.get('ok'):return 400,queued
            job=queued.get('job') or {}
            return 200,{'ok':True,'queued':True,'mode':'work','reply':f"NOVA Work MAX task background me queue ho gaya. Job: {job.get('id','')}. PC/gateway on rakho; progress Work Jobs me milegi.",'job':job,'work_max':True}
        return self._run_work(body)

    def _run_work(self,body,progress=None,cancel_event=None):
        def step(stage,message):
            if progress:
                try:progress(stage,message)
                except Exception:pass
        def cancelled():return bool(cancel_event and cancel_event.is_set())

        message=str(body.get('message','')).strip()[:14000]
        if not message:return 400,{'ok':False,'error':'Message required.'}
        workspace_name=' '.join(str(body.get('work_workspace') or 'NexusNova Work').split())[:140] or 'NexusNova Work'
        step('workspace','Opening persistent workspace')
        opened=work.work_open(self.ws,workspace_name)
        state=work.work_context(self.ws,workspace_name)
        if cancelled():return 409,{'ok':False,'error':'Cancelled before planning.'}
        level='deep'; app_context=str(body.get('app_context','')).strip()[:9000]
        history=base.safe_history(body.get('history')); captured=self.auto_capture(message)
        prompt=base.core.load_prompt(self.app_dir)
        rules=self.rules(); memory=self.memories()
        if rules:prompt+='\n\nOWNER RULES — persist across chats:\n- '+'\n- '.join(rules[-70:])
        if memory:prompt+='\n\nOWNER MEMORY — use only when relevant:\n- '+'\n- '.join(memory[-70:])
        if app_context:prompt+='\n\nMOBILE APP CONTEXT (read-only):\n'+app_context
        step('context','Retrieving repository and Work context')
        project_result=base.project.project_context(self.ws,message,12)
        chunks=[]
        if project_result.get('ok'):
            for row in project_result.get('results',[])[:12]:
                chunks.append(f"FILE: {row.get('path')}\n"+'\n---\n'.join(row.get('snippets') or []))
        work_text=json.dumps(state,ensure_ascii=False)[:22000]
        context_text=('PERSISTENT WORKSPACE STATE:\n'+work_text+'\n\nPROJECT CONTEXT:\n'+'\n\n'.join(chunks))[:38000]
        try:
            step('planning','Specialists and planner are building the execution plan')
            plan=base.power.make_plan(base.core,self.ollama,self.model,prompt,message,'work',level,context_text)
            plan_text=base.power.worker_plan_text(plan)
            if cancelled():return 409,{'ok':False,'error':'Cancelled after planning.'}
            pre=[base.evidence('work_open',opened),base.evidence('work_context',state)]
            cp=base.project.create_checkpoint(self.ws,'nova-work-max-task-start'); pre.append(base.evidence('create_checkpoint',cp)); pre.append(base.evidence('project_context',project_result))
            step('executing','Worker is executing tools and producing the outcome')
            reply,used=base.worker_turn(self.ws,self.ollama,self.model,prompt,history,message,'work',plan_text,context_text,'',28)
            used=pre+used
            if cancelled():return 409,{'ok':False,'error':'Cancelled after worker execution. Existing safe changes/workspace state were preserved.'}
            if base.power.should_auto_verify(used):
                step('verifying','Running recognized checks/build and inspecting diff')
                used.append(base.evidence('run_checks',base.core.execute(self.ws,'run_checks',{})))
                scaffold_paths=[x.get('path') for x in used if x.get('tool')=='scaffold_app' and x.get('ok') and x.get('path')]
                build_path=scaffold_paths[-1] if scaffold_paths else '.'
                used.append(base.evidence('run_build',base.project.run_build(self.ws,build_path,level)))
                used.append(base.evidence('git_diff',base.core.execute(self.ws,'git_diff',{})))
                used.append(base.evidence('git_status',base.core.execute(self.ws,'git_status',{})))
            step('review','Independent reviewer and red-team critic are checking the result')
            review=base.power.review(base.core,self.ollama,self.model,prompt,message,'work',level,reply,used,plan)
            critic=base.power.critic(base.core,self.ollama,self.model,prompt,message,'work',level,reply,used,review)
            corrected=0
            while corrected<2 and not cancelled() and (not review.get('pass') or not critic.get('pass')):
                corrected+=1;step('recovery',f'Correction pass {corrected} is fixing verification gaps')
                note=base.power.correction_note(plan,review,critic,corrected)
                reply2,used2=base.worker_turn(self.ws,self.ollama,self.model,prompt,history,message,'work',plan_text,context_text,note,26)
                reply=reply2; used.extend(used2)
                if base.power.should_auto_verify(used2):
                    used.append(base.evidence('run_checks',base.core.execute(self.ws,'run_checks',{})))
                    used.append(base.evidence('run_build',base.project.run_build(self.ws,'.',level)))
                    used.append(base.evidence('git_diff',base.core.execute(self.ws,'git_diff',{})))
                review=base.power.review(base.core,self.ollama,self.model,prompt,message,'work',level,reply,used,plan)
                critic=base.power.critic(base.core,self.ollama,self.model,prompt,message,'work',level,reply,used,review)
            if cancelled():return 409,{'ok':False,'error':'Cancelled during verification/recovery. Work state was preserved.'}
            latest=work.work_context(self.ws,workspace_name)
            step('finalizing','Building final evidence-grounded deliverable summary')
            reply=intelligence.finalize(base.core,self.ollama,self.model,prompt,message,reply,used,review,critic,latest)
            self.journal(message,'work',level,used,review,critic)
            step('done','Work MAX completed')
            return 200,{'ok':True,'reply':reply,'mode':'work','model':self.model,'tools_used':used,'github_writes':bool(base.core.STATE.get('github_writes')),
                        'memory_captured':captured,'rules_count':len(self.rules()),'memory_count':len(self.memories()),'work':latest,'work_max':True,
                        'power':{'version':base.power.VERSION,'reasoning':level,'planned':bool(plan.get('steps')),'specialists':plan.get('specialists',[]),
                                 'review_pass':bool(review.get('pass')),'review_score':review.get('score',0),'review_summary':review.get('summary',''),
                                 'critic_pass':bool(critic.get('pass')),'critic_summary':critic.get('summary',''),'correction_passes':corrected,
                                 'finalizer':intelligence.VERSION}}
        except Exception as e:return 503,{'ok':False,'error':str(e)}


base.Gateway=WorkGateway


def make_work_handler(gateway):
    Parent=base.make_handler(gateway)
    class Handler(Parent):
        def do_GET(self):
            parsed=urlparse(self.path); path=parsed.path.rstrip('/'); qs=parse_qs(parsed.query)
            if path in {'/api/work/job','/api/work/jobs','/api/work/context'}:
                if not gateway.authorized(self.headers):return self.send_json(401,{'ok':False,'error':'Pairing token invalid.'})
                if path=='/api/work/job':
                    row=gateway.runtime.get((qs.get('id') or [''])[0]);return self.send_json(200 if row else 404,{'ok':bool(row),'job':row} if row else {'ok':False,'error':'Job not found.'})
                if path=='/api/work/jobs':
                    rows=gateway.runtime.list((qs.get('workspace') or [''])[0],30);return self.send_json(200,{'ok':True,'jobs':rows})
                state=work.work_context(gateway.ws,(qs.get('workspace') or [''])[0]);return self.send_json(200,state)
            return super().do_GET()

        def do_POST(self):
            parsed=urlparse(self.path); path=parsed.path.rstrip('/')
            if path in {'/api/work/submit','/api/work/cancel','/api/work/instructions'}:
                if not gateway.authorized(self.headers):return self.send_json(401,{'ok':False,'error':'Pairing token invalid.'})
                try:body=self.read_body()
                except Exception as e:return self.send_json(400,{'ok':False,'error':str(e)})
                if path=='/api/work/submit':
                    body={**body,'mode':'work','work_background':False};result=gateway.runtime.submit(body);return self.send_json(200 if result.get('ok') else 400,result)
                if path=='/api/work/cancel':
                    result=gateway.runtime.cancel(body.get('id',''));return self.send_json(200 if result.get('ok') else 400,result)
                result=work.work_set_instructions(gateway.ws,body.get('text',''),body.get('workspace',''));return self.send_json(200 if result.get('ok') else 400,result)
            return super().do_POST()
    return Handler


def main():
    ap=argparse.ArgumentParser(description=APP)
    ap.add_argument('--workspace',default=os.environ.get('NEXUSNOVA_WORKSPACE','..'))
    ap.add_argument('--host',default=os.environ.get('NEXUSNOVA_MOBILE_HOST','127.0.0.1'))
    ap.add_argument('--port',type=int,default=int(os.environ.get('NEXUSNOVA_MOBILE_PORT','8787')))
    ap.add_argument('--model',default=base.core.DEFAULT_MODEL); ap.add_argument('--ollama',default=base.core.DEFAULT_OLLAMA); args=ap.parse_args()
    app_dir=Path(__file__).resolve().parent; token,token_path=base.load_or_create_token(app_dir)
    gateway=WorkGateway(args.workspace,args.ollama,args.model,token,app_dir); ready,models=base.core.ollama_ready(args.ollama)
    print(f'\n{APP} {VERSION}\nWorkspace: {gateway.ws.root}\nModel: {args.model}\nOllama: {"READY" if ready else "NOT READY"} {models}\nPairing token file: {token_path}\nPairing token: {token}\nModes: Chat | Work MAX | Web | Research | Website | Dev | App Builder | Ultimate\nPersistent Workspaces: ON\nBackground local Work jobs: ON while this PC/gateway stays running\nGitHub writes: OFF until explicitly armed\nListening: http://{args.host}:{args.port}\n')
    server=ThreadingHTTPServer((args.host,args.port),make_work_handler(gateway))
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()

if __name__=='__main__':main()
