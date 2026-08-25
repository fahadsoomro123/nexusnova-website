#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, os, secrets, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import agent as core

APP='NexusNova Mobile AI Gateway'
VERSION='1.3.0'
MAX_BODY=2_000_000
MAX_HISTORY=20
MAX_MEMORY=100
WRITE_CONFIRM='ENABLE GITHUB WRITES'
SENSITIVE_WORDS=('password','passcode','private key','seed phrase','secret','api key','token','otp','pin code')


def load_or_create_token(app_dir: Path) -> tuple[str, Path]:
    state_dir=app_dir/'.nexusnova-ai'; state_dir.mkdir(parents=True,exist_ok=True)
    token_path=state_dir/'mobile-pairing-token.txt'
    if token_path.exists(): token=token_path.read_text(encoding='utf-8').strip()
    else:
        token=secrets.token_urlsafe(32); token_path.write_text(token+'\n',encoding='utf-8')
    return token,token_path


def safe_history(value):
    out=[]
    if not isinstance(value,list): return out
    for row in value[-MAX_HISTORY:]:
        if not isinstance(row,dict): continue
        role=str(row.get('role','')).strip().lower(); text=str(row.get('content','')).strip()
        if role in {'user','assistant'} and text: out.append({'role':role,'content':text[:6000]})
    return out


def read_lines(path: Path):
    if not path.exists(): return []
    try: data=json.loads(path.read_text(encoding='utf-8'))
    except Exception: return []
    return [str(x).strip() for x in data if isinstance(x,str) and str(x).strip()] if isinstance(data,list) else []


def write_lines(path: Path, rows):
    clean=[]
    for x in rows:
        t=' '.join(str(x).strip().split())[:1200]
        if t and t not in clean: clean.append(t)
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(clean[-MAX_MEMORY:],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return clean[-MAX_MEMORY:]


def safe_to_remember(text: str):
    low=text.lower()
    return bool(text.strip()) and not any(w in low for w in SENSITIVE_WORDS)


def classify_memory(text: str):
    low=text.lower().strip()
    rule_markers=('rule:','rule ','hamesha ','always ','har baar ','must ','zaroor ','follow this rule','ye rule')
    memory_markers=('yaad rakh','yaad rakho','remember ','remember that','kal bhi yaad','future me yaad')
    if any(m in low for m in rule_markers): return 'rule'
    if any(m in low for m in memory_markers): return 'memory'
    return ''


def mode_tools(mode: str):
    all_specs=core.tool_specs()
    write_tools={'list_files','read_file','search_text','write_file','git_status','git_diff','git_create_branch','run_checks','git_commit','git_push_pr','web_search','web_fetch'}
    allowed={'chat':set(),'web':{'web_search','web_fetch'},'website':write_tools,'dev':write_tools}.get((mode or 'chat').lower(),set())
    return [s for s in all_specs if s.get('function',{}).get('name') in allowed]


def mode_instructions(mode: str) -> str:
    if mode=='web': return 'WEB MODE: Use public web search/fetch whenever freshness matters. Give concise sourced answers. Do not modify workspace files.'
    if mode=='website':
        return '''WEBSITE MODE — HIGH AUTONOMY FOR A NON-DEVELOPER OWNER:
- Translate simple Roman Urdu requests into technical work yourself. Do not ask the owner for file names, code, libraries or implementation details when repo/web research can answer them.
- Inspect/search first. Preserve working features and branding unless explicitly asked to replace them.
- If on main/master, create a non-main branch before edits.
- Make the smallest complete change. No fake placeholders or mass keyword pages.
- For visual work preserve mobile responsiveness, accessibility, performance and behavior.
- For SEO/content use fresh research when needed and keep canonical/meta/internal links/sitemaps/feed consistent where relevant.
- For articles create complete publish-ready content and wire it into the site's existing article system.
- Run recognized checks, inspect diff, summarize exactly what changed, and commit clean work.
- Push/PR only when GitHub writes are explicitly armed. Never push directly to main.
- The owner wants outcomes, not coding homework.'''
    if mode=='dev': return 'DEV MODE: Inspect before editing. Preserve working features. Prefer branch -> minimal edit -> checks -> diff -> commit. Push/PR only when GitHub writes are armed.'
    return 'CHAT MODE: Answer normally. Do not modify workspace files.'


def gateway_turn(ws,base,model,prompt,history,user,mode):
    tools=mode_tools(mode); msgs=[{'role':'system','content':prompt+'\n\n'+mode_instructions(mode)}]+history[-MAX_HISTORY:]+[{'role':'user','content':user}]; used=[]
    for _ in range(core.MAX_TOOL_ROUNDS):
        payload={'model':model,'messages':msgs,'stream':False,'options':{'temperature':0.2}}
        if tools: payload['tools']=tools
        try: r=core.http_json(base+'/api/chat',payload)
        except Exception as e: raise RuntimeError(f'Ollama se connect nahi hua: {e}')
        m=r.get('message') or {}; content=str(m.get('content') or ''); calls=m.get('tool_calls') or []
        am={'role':'assistant','content':content}
        if calls: am['tool_calls']=calls
        msgs.append(am)
        if not calls: return content.strip() or '(No text response.)',used
        allowed_names={x.get('function',{}).get('name') for x in tools}
        for c in calls:
            f=c.get('function') or {}; name=str(f.get('name','')); raw=f.get('arguments',{})
            if isinstance(raw,str):
                try: args=json.loads(raw)
                except Exception: args={}
            else: args=raw if isinstance(raw,dict) else {}
            result={'ok':False,'error':'Tool is not allowed in this mode.'} if name not in allowed_names else core.execute(ws,name,args)
            if name in allowed_names: used.append({'name':name,'ok':bool(result.get('ok'))})
            msgs.append({'role':'tool','tool_name':name,'content':json.dumps(result,ensure_ascii=False)[:60000]})
    return 'Tool loop limit reach ho gaya. Task ko chhote step me bolo.',used


class Gateway:
    def __init__(self,workspace,ollama,model,token,app_dir: Path):
        self.ws=core.Workspace(workspace); self.ollama=ollama.rstrip('/'); self.model=model; self.token=token
        self.state_dir=app_dir/'.nexusnova-ai'; self.rules_path=self.state_dir/'owner-rules.json'; self.memory_path=self.state_dir/'memory.json'

    def authorized(self,headers):
        supplied=str(headers.get('X-NexusNova-Token','')).strip()
        return bool(supplied) and secrets.compare_digest(supplied,self.token)

    def rules(self): return read_lines(self.rules_path)
    def memories(self): return read_lines(self.memory_path)

    def memory_state(self): return {'ok':True,'rules':self.rules(),'memory':self.memories()}

    def remember(self,body):
        kind=str(body.get('kind','memory')).strip().lower(); text=' '.join(str(body.get('text','')).strip().split())[:1200]
        if kind not in {'memory','rule'}: return 400,{'ok':False,'error':'kind must be memory or rule'}
        if not safe_to_remember(text): return 400,{'ok':False,'error':'Sensitive or empty information is not stored in memory.'}
        path=self.rules_path if kind=='rule' else self.memory_path; rows=read_lines(path); rows.append(text); rows=write_lines(path,rows)
        return 200,{'ok':True,'kind':kind,'count':len(rows)}

    def clear_memory(self,body):
        kind=str(body.get('kind','all')).strip().lower()
        if kind in {'all','rule','rules'}: write_lines(self.rules_path,[])
        if kind in {'all','memory','memories'}: write_lines(self.memory_path,[])
        return 200,self.memory_state()

    def auto_capture(self,message: str):
        kind=classify_memory(message)
        if not kind or not safe_to_remember(message): return ''
        path=self.rules_path if kind=='rule' else self.memory_path; rows=read_lines(path)
        compact=' '.join(message.strip().split())[:1200]
        if compact not in rows: write_lines(path,rows+[compact])
        return kind

    def health(self):
        ready,models=core.ollama_ready(self.ollama)
        return {'ok':ready,'app':APP,'version':VERSION,'model':self.model,'ollama':ready,'models':models,'modes':['chat','web','website','dev'],'workspace':str(self.ws.root),'github_writes':bool(core.STATE.get('github_writes')),'rules_count':len(self.rules()),'memory_count':len(self.memories())}

    def chat(self,body):
        message=str(body.get('message','')).strip()[:12000]; mode=str(body.get('mode','chat')).strip().lower()
        if mode not in {'chat','web','website','dev'}: mode='chat'
        if not message: return 400,{'ok':False,'error':'Message required.'}
        app_context=str(body.get('app_context','')).strip()[:8000]; history=safe_history(body.get('history'))
        captured=self.auto_capture(message)
        prompt=core.load_prompt(Path(__file__).resolve().parent)
        rules=self.rules(); memory=self.memories()
        if rules:
            prompt+='\n\nOWNER RULES — persist across chats. Follow them consistently unless they conflict with safety, law, or technical reality:\n- '+'\n- '.join(rules[-60:])
        if memory:
            prompt+='\n\nOWNER MEMORY — stable context from earlier chats. Use it when relevant; never invent details not present here:\n- '+'\n- '.join(memory[-60:])
        if app_context: prompt+='\n\nMOBILE APP CONTEXT (read-only; never invent missing values):\n'+app_context
        try:
            reply,used=gateway_turn(self.ws,self.ollama,self.model,prompt,history,message,mode)
            return 200,{'ok':True,'reply':reply,'mode':mode,'model':self.model,'tools_used':used,'github_writes':bool(core.STATE.get('github_writes')),'memory_captured':captured,'rules_count':len(self.rules()),'memory_count':len(self.memories())}
        except Exception as e: return 503,{'ok':False,'error':str(e)}

    def github_toggle(self,body):
        enabled=bool(body.get('enabled'))
        if enabled and str(body.get('confirmation','')).strip()!=WRITE_CONFIRM: return 400,{'ok':False,'error':f'Type exactly: {WRITE_CONFIRM}'}
        core.STATE['github_writes']=enabled; return 200,{'ok':True,'github_writes':enabled}


def make_handler(gateway: Gateway):
    class Handler(BaseHTTPRequestHandler):
        server_version='NexusNovaMobileAI/1.3'
        def log_message(self,fmt,*args): sys.stdout.write('[mobile-ai] '+(fmt%args)+'\n')
        def cors(self):
            self.send_header('Access-Control-Allow-Origin','*'); self.send_header('Access-Control-Allow-Headers','Content-Type, X-NexusNova-Token'); self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS'); self.send_header('Cache-Control','no-store')
        def send_json(self,status,payload):
            data=json.dumps(payload,ensure_ascii=False).encode('utf-8'); self.send_response(status); self.cors(); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Content-Length',str(len(data))); self.end_headers(); self.wfile.write(data)
        def do_OPTIONS(self): self.send_response(204); self.cors(); self.end_headers()
        def do_GET(self):
            if self.path.rstrip('/')=='/health': return self.send_json(200,gateway.health())
            return self.send_json(404,{'ok':False,'error':'Not found.'})
        def read_body(self):
            try: length=int(self.headers.get('Content-Length','0'))
            except ValueError: length=0
            if length<0 or length>MAX_BODY: raise ValueError('Request too large.')
            raw=self.rfile.read(length) if length else b'{}'; data=json.loads(raw.decode('utf-8'))
            if not isinstance(data,dict): raise ValueError('JSON object required.')
            return data
        def do_POST(self):
            if not gateway.authorized(self.headers): return self.send_json(401,{'ok':False,'error':'Pairing token invalid.'})
            try: body=self.read_body()
            except Exception as e: return self.send_json(400,{'ok':False,'error':str(e)})
            path=self.path.rstrip('/')
            if path=='/api/chat': status,payload=gateway.chat(body)
            elif path=='/api/github-writes': status,payload=gateway.github_toggle(body)
            elif path=='/api/memory/list': status,payload=200,gateway.memory_state()
            elif path=='/api/memory/add': status,payload=gateway.remember(body)
            elif path=='/api/memory/clear': status,payload=gateway.clear_memory(body)
            else: status,payload=404,{'ok':False,'error':'Not found.'}
            return self.send_json(status,payload)
    return Handler


def main():
    ap=argparse.ArgumentParser(description=APP); ap.add_argument('--workspace',default=os.environ.get('NEXUSNOVA_WORKSPACE','..')); ap.add_argument('--host',default=os.environ.get('NEXUSNOVA_MOBILE_HOST','127.0.0.1')); ap.add_argument('--port',type=int,default=int(os.environ.get('NEXUSNOVA_MOBILE_PORT','8787'))); ap.add_argument('--model',default=core.DEFAULT_MODEL); ap.add_argument('--ollama',default=core.DEFAULT_OLLAMA); args=ap.parse_args()
    app_dir=Path(__file__).resolve().parent; token,token_path=load_or_create_token(app_dir); gateway=Gateway(args.workspace,args.ollama,args.model,token,app_dir); ready,models=core.ollama_ready(args.ollama)
    print(f'\n{APP} {VERSION}\nWorkspace: {gateway.ws.root}\nModel: {args.model}\nOllama: {"READY" if ready else "NOT READY"} {models}\nPairing token file: {token_path}\nPairing token: {token}\nModes: Chat | Web | Website | Dev\nPersistent rules: {len(gateway.rules())} | memory: {len(gateway.memories())}\nGitHub writes: OFF (explicitly arm from paired mobile client)\nListening: http://{args.host}:{args.port}\n')
    server=ThreadingHTTPServer((args.host,args.port),make_handler(gateway))
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()

if __name__=='__main__': main()
