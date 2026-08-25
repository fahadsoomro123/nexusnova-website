#!/usr/bin/env python3
from __future__ import annotations
import argparse, datetime as dt, json, os, secrets, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import agent as core
import power_engine_v6 as power
import project_tools_v6 as project
import git_tools_v6 as gitv6

APP='NexusNova Mobile AI Gateway V6'
VERSION='6.0.0'
MAX_BODY=2_000_000
MAX_HISTORY=24
MAX_MEMORY=120
WRITE_CONFIRM='ENABLE GITHUB WRITES'
SENSITIVE_WORDS=('password','passcode','private key','seed phrase','secret','api key','token','otp','pin code','recovery phrase')
CORE_ALLOWED={
 'list_files','read_file','search_text','write_file','git_status','git_diff','git_create_branch','run_checks','git_push_pr','web_search','web_fetch'
}
MUTATING={'write_file','scaffold_app','git_commit_safe'}


def load_or_create_token(app_dir: Path):
    state=app_dir/'.nexusnova-ai'; state.mkdir(parents=True,exist_ok=True)
    path=state/'mobile-pairing-token.txt'
    token=path.read_text(encoding='utf-8').strip() if path.exists() else ''
    if not token:
        token=secrets.token_urlsafe(32); path.write_text(token+'\n',encoding='utf-8')
    return token,path


def safe_history(value):
    out=[]
    if not isinstance(value,list):return out
    for row in value[-MAX_HISTORY:]:
        if not isinstance(row,dict):continue
        role=str(row.get('role','')).strip().lower(); text=str(row.get('content','')).strip()
        if role in {'user','assistant'} and text:out.append({'role':role,'content':text[:7000]})
    return out


def read_list(path):
    if not path.exists():return []
    try:data=json.loads(path.read_text(encoding='utf-8'))
    except Exception:return []
    return [str(x).strip() for x in data if isinstance(x,str) and str(x).strip()] if isinstance(data,list) else []


def write_list(path,rows):
    clean=[]
    for x in rows:
        t=' '.join(str(x).strip().split())[:1400]
        if t and t not in clean:clean.append(t)
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(clean[-MAX_MEMORY:],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return clean[-MAX_MEMORY:]


def safe_to_remember(text):
    low=str(text or '').lower()
    return bool(low.strip()) and not any(w in low for w in SENSITIVE_WORDS)


def classify_memory(text):
    low=str(text or '').lower().strip()
    if any(m in low for m in ('rule:','rule ','hamesha ','always ','har baar ','must ','zaroor ','follow this rule','ye rule')):return 'rule'
    if any(m in low for m in ('yaad rakh','yaad rakho','remember ','remember that','kal bhi yaad','future me yaad')):return 'memory'
    return ''


def core_specs_without_unsafe_commit():
    out=[]
    for s in core.tool_specs():
        name=s.get('function',{}).get('name')
        if name in CORE_ALLOWED:out.append(s)
    return out


def mode_tool_names(mode):
    read={'list_files','read_file','search_text','git_status','git_diff','project_context','inspect_project'}
    web={'web_search','web_fetch'}
    write=read|web|{'write_file','git_prepare_branch','git_commit_safe','git_push_pr','run_checks','run_build','create_checkpoint'}
    builder=write|{'scaffold_app','export_project_zip'}
    return {
      'chat':set(),
      'web':web,
      'research':web,
      'website':write,
      'dev':write,
      'builder':builder,
      'power':builder,
    }.get(mode,set())


def all_specs():return core_specs_without_unsafe_commit()+project.tool_specs()+gitv6.tool_specs()


def specs_for_mode(mode):
    allowed=mode_tool_names(mode)
    return [s for s in all_specs() if s.get('function',{}).get('name') in allowed]


def evidence(name,result):
    out={'tool':name,'ok':bool(isinstance(result,dict) and result.get('ok'))}
    if not isinstance(result,dict):return out
    if result.get('error'):out['error']=str(result.get('error'))[:500]
    for key in ('path','branch','note','kind','size_bytes','changed_count'):
        if key in result:out[key]=result.get(key)
    if name=='git_status':out['status']=str(result.get('stdout',''))[-2500:]
    if name=='git_diff':out['diff_chars']=len(str(result.get('unstaged','')))+len(str(result.get('staged','')))
    if name=='project_context':out['files']=[x.get('path') for x in result.get('results',[])[:10]]
    if name in {'run_build','run_checks'}:
        rows=result.get('builds') or result.get('checks') or []
        out['commands']=[{'command':x.get('command'),'ok':x.get('ok'),'code':x.get('code')} for x in rows[:8]]
    if name=='web_search':out['results']=len(result.get('results',[]))
    if name=='web_fetch':out['url']=result.get('url')
    if name=='git_commit_safe':out['paths']=result.get('paths',[])[:30]
    if name=='git_push_pr':
        out['push_ok']=bool((result.get('push') or {}).get('ok')); out['pr_ok']=bool((result.get('pr') or {}).get('ok'))
    return out


def ensure_safe_branch(ws,name):
    branch=ws.git('branch','--show-current').get('stdout','').strip()
    if branch not in {'main','master',''}:return {'ok':True,'branch':branch,'note':'Existing non-main branch.'}
    status=ws.git_status().get('stdout','')
    if status.strip():project.create_checkpoint(ws,'before-v6-auto-branch')
    stamp=dt.datetime.now().strftime('%Y%m%d-%H%M%S')
    hint='nova-v6-'+stamp
    return gitv6.prepare_branch(ws,hint)


def execute_tool(ws,name,args):
    if name in MUTATING:
        prep=ensure_safe_branch(ws,name)
        if not prep.get('ok'):return {'ok':False,'error':'Could not prepare safe work branch.','branch_result':prep}
    r=project.execute(ws,name,args)
    if r is not None:return r
    r=gitv6.execute(ws,name,args)
    if r is not None:return r
    return core.execute(ws,name,args)


def mode_instructions(mode):
    common='''V6 OWNER WORKFLOW:
- Fahad Hussain is the NexusNova owner. Resolve implementation details yourself from repo/web evidence instead of giving coding homework.
- Never pretend a task, build, PR, deploy or live verification happened when it did not.
- Preserve working features. Prefer small reversible edits. Use a non-main branch for edits.
- Do not expose or store secrets. GitHub publishing stays separately gated.'''
    if mode=='web':return common+'\nWEB: fresh public research only; do not edit files.'
    if mode=='research':return common+'\nRESEARCH: decompose question, compare multiple current sources, prefer official/primary evidence, state uncertainty; do not edit files.'
    if mode=='website':return common+'''\nWEBSITE: inspect project context first; handle design/SEO/content/bug requests end-to-end; keep responsive/accessibility/performance; run checks/diff; articles must be publish-ready and wired into existing site systems.'''
    if mode=='dev':return common+'\nDEV: inspect context -> branch -> focused edit -> checks/build -> diff -> safe selective commit when requested.'
    if mode=='builder':return common+'''\nAPP BUILDER: turn plain-language product ideas into a working project. Inspect existing workspace first. For a new project use scaffold_app under generated-apps, implement complete core flows, run recognized build/checks, fix failures, inspect evidence, and export a ZIP when the owner asks for a downloadable project. Do not claim APK creation unless an Android project was actually built.'''
    if mode=='power':return common+'''\nPOWER: maximum safe autonomy. Combine project context, web research, website/dev/builder tools as needed. Plan, execute, verify, review, critic-check and correct material gaps. Use tools rather than assumptions.'''
    return common+'\nCHAT: answer normally without modifying workspace.'


def _parse_args(raw):
    if isinstance(raw,dict):return raw
    if isinstance(raw,str):
        try:v=json.loads(raw);return v if isinstance(v,dict) else {}
        except Exception:return {}
    return {}


def worker_turn(ws,base,model,prompt,history,user,mode,plan_text='',context_text='',correction='',max_rounds=16):
    tools=specs_for_mode(mode); allowed={x.get('function',{}).get('name') for x in tools}
    system=prompt+'\n\n'+mode_instructions(mode)
    if context_text:system+='\n\nV6 RETRIEVED PROJECT CONTEXT:\n'+context_text[:22000]
    if plan_text:system+='\n\n'+plan_text[:12000]
    if correction:system+='\n\n'+correction[:12000]
    msgs=[{'role':'system','content':system}]+history[-MAX_HISTORY:]+[{'role':'user','content':user}]
    used=[]
    for _ in range(max_rounds):
        payload={'model':model,'messages':msgs,'stream':False,'options':{'temperature':0.12 if mode in {'power','builder','website','dev','research'} else 0.2}}
        if tools:payload['tools']=tools
        try:r=core.http_json(base+'/api/chat',payload,timeout=720)
        except Exception as e:raise RuntimeError(f'Ollama se connect nahi hua: {e}')
        m=r.get('message') or {}; content=str(m.get('content') or ''); calls=m.get('tool_calls') or []
        am={'role':'assistant','content':content}
        if calls:am['tool_calls']=calls
        msgs.append(am)
        if not calls:return content.strip() or '(No text response.)',used
        for c in calls:
            f=c.get('function') or {}; name=str(f.get('name','')); args=_parse_args(f.get('arguments',{}))
            result={'ok':False,'error':'Tool not allowed in this mode.'} if name not in allowed else execute_tool(ws,name,args)
            ev=evidence(name,result); used.append(ev)
            msgs.append({'role':'tool','tool_name':name,'content':json.dumps(result,ensure_ascii=False)[:65000]})
    return 'V6 tool-loop limit reach ho gaya. Main available evidence ke saath yahan ruk raha hun.',used


class Gateway:
    def __init__(self,workspace,ollama,model,token,app_dir):
        self.ws=core.Workspace(workspace); self.ollama=ollama.rstrip('/'); self.model=model; self.token=token; self.app_dir=app_dir
        self.state=app_dir/'.nexusnova-ai'; self.state.mkdir(parents=True,exist_ok=True)
        self.rules_path=self.state/'owner-rules.json'; self.memory_path=self.state/'memory.json'; self.journal_path=self.state/'task-journal-v6.jsonl'

    def authorized(self,headers):
        supplied=str(headers.get('X-NexusNova-Token','')).strip()
        return bool(supplied) and secrets.compare_digest(supplied,self.token)
    def rules(self):return read_list(self.rules_path)
    def memories(self):return read_list(self.memory_path)
    def memory_state(self):return {'ok':True,'rules':self.rules(),'memory':self.memories()}

    def remember(self,body):
        kind=str(body.get('kind','memory')).lower().strip(); text=' '.join(str(body.get('text','')).strip().split())[:1400]
        if kind not in {'memory','rule'}:return 400,{'ok':False,'error':'kind must be memory or rule'}
        if not safe_to_remember(text):return 400,{'ok':False,'error':'Sensitive or empty information is not stored.'}
        path=self.rules_path if kind=='rule' else self.memory_path; rows=write_list(path,read_list(path)+[text])
        return 200,{'ok':True,'kind':kind,'count':len(rows)}

    def clear_memory(self,body):
        kind=str(body.get('kind','all')).lower().strip()
        if kind in {'all','rule','rules'}:write_list(self.rules_path,[])
        if kind in {'all','memory','memories'}:write_list(self.memory_path,[])
        return 200,self.memory_state()

    def auto_capture(self,message):
        kind=classify_memory(message)
        if not kind or not safe_to_remember(message):return ''
        path=self.rules_path if kind=='rule' else self.memory_path; compact=' '.join(message.strip().split())[:1400]
        rows=read_list(path)
        if compact not in rows:write_list(path,rows+[compact])
        return kind

    def journal(self,message,mode,level,evidence_rows,review,critic):
        sensitive=not safe_to_remember(message)
        row={'at':dt.datetime.now(dt.timezone.utc).isoformat(),'mode':mode,'level':level,'request':'[sensitive task omitted]' if sensitive else message[:700],
             'tools':[{'tool':x.get('tool'),'ok':x.get('ok')} for x in evidence_rows[-60:]],'review_pass':bool(review.get('pass')),'critic_pass':bool(critic.get('pass'))}
        try:
            with self.journal_path.open('a',encoding='utf-8') as f:f.write(json.dumps(row,ensure_ascii=False)+'\n')
        except Exception:pass

    def health(self):
        ready,models=core.ollama_ready(self.ollama)
        return {'ok':ready,'app':APP,'version':VERSION,'power_engine':power.VERSION,'project_tools':project.VERSION,'git_tools':gitv6.VERSION,
                'model':self.model,'ollama':ready,'models':models,'modes':['chat','web','research','website','dev','builder','power'],
                'reasoning':['auto','fast','standard','deep','builder'],'workspace':str(self.ws.root),'github_writes':bool(core.STATE.get('github_writes')),
                'rules_count':len(self.rules()),'memory_count':len(self.memories())}

    def chat(self,body):
        message=str(body.get('message','')).strip()[:14000]; mode=str(body.get('mode','chat')).strip().lower()
        if mode not in {'chat','web','research','website','dev','builder','power'}:mode='chat'
        if not message:return 400,{'ok':False,'error':'Message required.'}
        requested=str(body.get('reasoning','auto')).lower().strip(); level=power.route(message,mode,requested)
        if mode=='power':level='deep'
        if mode=='builder':level='builder'
        app_context=str(body.get('app_context','')).strip()[:9000]; history=safe_history(body.get('history')); captured=self.auto_capture(message)
        prompt=core.load_prompt(self.app_dir)
        rules=self.rules(); memory=self.memories()
        if rules:prompt+='\n\nOWNER RULES — persist across chats:\n- '+'\n- '.join(rules[-70:])
        if memory:prompt+='\n\nOWNER MEMORY — use only when relevant:\n- '+'\n- '.join(memory[-70:])
        if app_context:prompt+='\n\nMOBILE APP CONTEXT (read-only):\n'+app_context
        context_result={'ok':True,'results':[]}; context_text=''
        if mode in {'website','dev','builder','power'}:
            context_result=project.project_context(self.ws,message,10)
            if context_result.get('ok'):
                chunks=[]
                for row in context_result.get('results',[])[:10]:chunks.append(f"FILE: {row.get('path')}\n"+'\n---\n'.join(row.get('snippets') or []))
                context_text='\n\n'.join(chunks)[:22000]
        try:
            plan=power.make_plan(core,self.ollama,self.model,prompt,message,mode,level,context_text)
            plan_text=power.worker_plan_text(plan)
            max_rounds=22 if level in {'deep','builder'} else (16 if level=='standard' else 10)
            pre=[]
            if mode in {'website','dev','builder','power'}:
                cp=project.create_checkpoint(self.ws,'v6-task-start'); pre.append(evidence('create_checkpoint',cp))
                pre.append(evidence('project_context',context_result))
            reply,used=worker_turn(self.ws,self.ollama,self.model,prompt,history,message,mode,plan_text,context_text,'',max_rounds)
            used=pre+used
            if power.should_auto_verify(used):
                check=core.execute(self.ws,'run_checks',{}); used.append(evidence('run_checks',check))
                scaffold_paths=[x.get('path') for x in used if x.get('tool')=='scaffold_app' and x.get('ok') and x.get('path')]
                build_path=scaffold_paths[-1] if scaffold_paths else '.'
                build=project.run_build(self.ws,build_path,level); used.append(evidence('run_build',build))
                used.append(evidence('git_diff',core.execute(self.ws,'git_diff',{})))
                used.append(evidence('git_status',core.execute(self.ws,'git_status',{})))
            review=power.review(core,self.ollama,self.model,prompt,message,mode,level,reply,used,plan)
            critic=power.critic(core,self.ollama,self.model,prompt,message,mode,level,reply,used,review)
            corrected=0
            while level in {'deep','builder'} and corrected<2 and (not review.get('pass') or not critic.get('pass')):
                corrected+=1; note=power.correction_note(plan,review,critic,corrected)
                reply2,used2=worker_turn(self.ws,self.ollama,self.model,prompt,history,message,mode,plan_text,context_text,note,max_rounds)
                reply=reply2; used.extend(used2)
                if power.should_auto_verify(used2):
                    used.append(evidence('run_checks',core.execute(self.ws,'run_checks',{})))
                    used.append(evidence('run_build',project.run_build(self.ws,'.',level)))
                    used.append(evidence('git_diff',core.execute(self.ws,'git_diff',{})))
                review=power.review(core,self.ollama,self.model,prompt,message,mode,level,reply,used,plan)
                critic=power.critic(core,self.ollama,self.model,prompt,message,mode,level,reply,used,review)
            self.journal(message,mode,level,used,review,critic)
            return 200,{'ok':True,'reply':reply,'mode':mode,'model':self.model,'tools_used':used,'github_writes':bool(core.STATE.get('github_writes')),
                        'memory_captured':captured,'rules_count':len(self.rules()),'memory_count':len(self.memories()),
                        'power':{'version':power.VERSION,'reasoning':level,'planned':bool(plan.get('steps')),'review_pass':bool(review.get('pass')),
                                 'review_score':review.get('score',0),'review_summary':review.get('summary',''),'critic_pass':bool(critic.get('pass')),
                                 'critic_summary':critic.get('summary',''),'correction_passes':corrected}}
        except Exception as e:return 503,{'ok':False,'error':str(e)}

    def github_toggle(self,body):
        enabled=bool(body.get('enabled'))
        if enabled and str(body.get('confirmation','')).strip()!=WRITE_CONFIRM:return 400,{'ok':False,'error':f'Type exactly: {WRITE_CONFIRM}'}
        core.STATE['github_writes']=enabled; return 200,{'ok':True,'github_writes':enabled}


def make_handler(gateway):
    class Handler(BaseHTTPRequestHandler):
        server_version='NexusNovaMobileAI/6.0'
        def log_message(self,fmt,*args):sys.stdout.write('[nova-v6] '+(fmt%args)+'\n')
        def cors(self):
            self.send_header('Access-Control-Allow-Origin','*'); self.send_header('Access-Control-Allow-Headers','Content-Type, X-NexusNova-Token'); self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS'); self.send_header('Cache-Control','no-store')
        def send_json(self,status,payload):
            data=json.dumps(payload,ensure_ascii=False).encode('utf-8'); self.send_response(status); self.cors(); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Content-Length',str(len(data))); self.end_headers(); self.wfile.write(data)
        def do_OPTIONS(self):self.send_response(204); self.cors(); self.end_headers()
        def do_GET(self):
            if self.path.rstrip('/')=='/health':return self.send_json(200,gateway.health())
            return self.send_json(404,{'ok':False,'error':'Not found.'})
        def read_body(self):
            try:length=int(self.headers.get('Content-Length','0'))
            except ValueError:length=0
            if length<0 or length>MAX_BODY:raise ValueError('Request too large.')
            raw=self.rfile.read(length) if length else b'{}'; data=json.loads(raw.decode('utf-8'))
            if not isinstance(data,dict):raise ValueError('JSON object required.')
            return data
        def do_POST(self):
            if not gateway.authorized(self.headers):return self.send_json(401,{'ok':False,'error':'Pairing token invalid.'})
            try:body=self.read_body()
            except Exception as e:return self.send_json(400,{'ok':False,'error':str(e)})
            path=self.path.rstrip('/')
            if path=='/api/chat':status,payload=gateway.chat(body)
            elif path=='/api/github-writes':status,payload=gateway.github_toggle(body)
            elif path=='/api/memory/list':status,payload=200,gateway.memory_state()
            elif path=='/api/memory/add':status,payload=gateway.remember(body)
            elif path=='/api/memory/clear':status,payload=gateway.clear_memory(body)
            else:status,payload=404,{'ok':False,'error':'Not found.'}
            return self.send_json(status,payload)
    return Handler


def main():
    ap=argparse.ArgumentParser(description=APP); ap.add_argument('--workspace',default=os.environ.get('NEXUSNOVA_WORKSPACE','..')); ap.add_argument('--host',default=os.environ.get('NEXUSNOVA_MOBILE_HOST','127.0.0.1')); ap.add_argument('--port',type=int,default=int(os.environ.get('NEXUSNOVA_MOBILE_PORT','8787'))); ap.add_argument('--model',default=core.DEFAULT_MODEL); ap.add_argument('--ollama',default=core.DEFAULT_OLLAMA); args=ap.parse_args()
    app_dir=Path(__file__).resolve().parent; token,token_path=load_or_create_token(app_dir); gateway=Gateway(args.workspace,args.ollama,args.model,token,app_dir); ready,models=core.ollama_ready(args.ollama)
    print(f'\n{APP} {VERSION}\nWorkspace: {gateway.ws.root}\nModel: {args.model}\nOllama: {"READY" if ready else "NOT READY"} {models}\nPairing token file: {token_path}\nPairing token: {token}\nModes: Chat | Web | Research | Website | Dev | App Builder | Power\nReasoning: Auto | Fast | Standard | Deep | Builder\nGitHub writes: OFF until explicitly armed\nListening: http://{args.host}:{args.port}\n')
    server=ThreadingHTTPServer((args.host,args.port),make_handler(gateway))
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()

if __name__=='__main__':main()
