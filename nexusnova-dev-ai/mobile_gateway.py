#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, os, secrets, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import agent as core

APP='NexusNova Mobile AI Gateway'
VERSION='1.1.0'
MAX_BODY=2_000_000
MAX_HISTORY=20
WRITE_CONFIRM='ENABLE GITHUB WRITES'


def load_or_create_token(app_dir: Path) -> tuple[str, Path]:
    state_dir = app_dir / '.nexusnova-ai'
    state_dir.mkdir(parents=True, exist_ok=True)
    token_path = state_dir / 'mobile-pairing-token.txt'
    if token_path.exists():
        token = token_path.read_text(encoding='utf-8').strip()
    else:
        token = secrets.token_urlsafe(32)
        token_path.write_text(token + '\n', encoding='utf-8')
    return token, token_path


def safe_history(value):
    out=[]
    if not isinstance(value,list): return out
    for row in value[-MAX_HISTORY:]:
        if not isinstance(row,dict): continue
        role=str(row.get('role','')).strip().lower()
        text=str(row.get('content','')).strip()
        if role not in {'user','assistant'} or not text: continue
        out.append({'role':role,'content':text[:6000]})
    return out


def mode_tools(mode: str):
    mode=(mode or 'chat').lower()
    all_specs=core.tool_specs()
    write_tools={'list_files','read_file','search_text','write_file','git_status','git_diff','git_create_branch','run_checks','git_commit','git_push_pr','web_search','web_fetch'}
    allowed={
        'chat':set(),
        'web':{'web_search','web_fetch'},
        'website':write_tools,
        'dev':write_tools,
    }.get(mode,set())
    return [s for s in all_specs if s.get('function',{}).get('name') in allowed]


def mode_instructions(mode: str) -> str:
    if mode=='web':
        return '''WEB MODE:
- Use public web search/fetch whenever freshness matters.
- Give concise, sourced research-oriented answers.
- Do not modify workspace files.'''
    if mode=='website':
        return '''WEBSITE MODE — HIGH AUTONOMY FOR A NON-DEVELOPER OWNER:
The owner should be able to give one simple Roman Urdu instruction such as "homepage design better karo", "SEO improve karo", "article likho", "broken links fix karo", or "ye feature website par add karo".

Your job is to translate that simple instruction into the technical work yourself. Do NOT ask the owner to name files, write code, choose libraries, or explain implementation details when the repository can answer those questions.

For every website-changing task:
1. Inspect the repository and current implementation first. Search before editing.
2. Preserve working features and existing branding unless the owner explicitly asks to replace them.
3. If currently on main/master, create a clearly named non-main branch before edits.
4. Make the smallest complete change that actually fulfills the request; avoid fake placeholders.
5. For visual work, keep mobile responsiveness, accessibility, loading performance, and existing behavior intact.
6. For SEO/content work, prefer useful original content over mass keyword pages. Use fresh web research when the topic is time-sensitive. Keep canonical/meta/internal links/sitemap/feed consistency where relevant.
7. For articles, write a complete publish-ready article and wire it into the appropriate article hub/internal links when that is part of the site's pattern.
8. Run recognized checks/tests when available, inspect git diff, and summarize exactly what changed.
9. Commit completed work locally when appropriate.
10. GitHub push/PR is allowed only when GitHub writes have been explicitly armed; otherwise stop safely after local commit/diff and tell the owner that only publishing permission is still off.

Do not turn this into a coding lesson unless asked. The owner wants outcomes, not implementation homework.'''
    if mode=='dev':
        return '''DEV MODE:
- You may inspect and edit the configured NexusNova workspace.
- Preserve working features and inspect before editing.
- Prefer branch -> minimal edit -> checks -> diff -> commit.
- GitHub push/PR remains blocked unless explicitly armed.'''
    return 'CHAT MODE: Answer normally. Do not modify workspace files.'


def gateway_turn(ws, base, model, prompt, history, user, mode):
    tools=mode_tools(mode)
    mode_note=mode_instructions(mode)
    msgs=[{'role':'system','content':prompt+'\n\n'+mode_note}]+history[-MAX_HISTORY:]+[{'role':'user','content':user}]
    used=[]
    for _ in range(core.MAX_TOOL_ROUNDS):
        payload={'model':model,'messages':msgs,'stream':False,'options':{'temperature':0.2}}
        if tools: payload['tools']=tools
        try:
            r=core.http_json(base+'/api/chat',payload)
        except Exception as e:
            raise RuntimeError(f'Ollama se connect nahi hua: {e}')
        m=r.get('message') or {}
        content=str(m.get('content') or '')
        calls=m.get('tool_calls') or []
        am={'role':'assistant','content':content}
        if calls: am['tool_calls']=calls
        msgs.append(am)
        if not calls:
            return content.strip() or '(No text response.)', used
        for c in calls:
            f=c.get('function') or {}
            name=str(f.get('name',''))
            raw=f.get('arguments',{})
            if isinstance(raw,str):
                try: args=json.loads(raw)
                except Exception: args={}
            else: args=raw if isinstance(raw,dict) else {}
            allowed_names={x.get('function',{}).get('name') for x in tools}
            if name not in allowed_names:
                result={'ok':False,'error':'Tool is not allowed in this mode.'}
            else:
                result=core.execute(ws,name,args)
                used.append({'name':name,'ok':bool(result.get('ok'))})
            msgs.append({'role':'tool','tool_name':name,'content':json.dumps(result,ensure_ascii=False)[:60000]})
    return 'Tool loop limit reach ho gaya. Task ko chhote step me bolo.', used


class Gateway:
    def __init__(self, workspace, ollama, model, token):
        self.ws=core.Workspace(workspace)
        self.ollama=ollama.rstrip('/')
        self.model=model
        self.token=token

    def authorized(self, headers):
        supplied=str(headers.get('X-NexusNova-Token','')).strip()
        return bool(supplied) and secrets.compare_digest(supplied,self.token)

    def health(self):
        ready,models=core.ollama_ready(self.ollama)
        return {
            'ok':ready,
            'app':APP,
            'version':VERSION,
            'model':self.model,
            'ollama':ready,
            'models':models,
            'modes':['chat','web','website','dev'],
            'workspace':str(self.ws.root),
            'github_writes':bool(core.STATE.get('github_writes'))
        }

    def chat(self, body):
        message=str(body.get('message','')).strip()[:12000]
        mode=str(body.get('mode','chat')).strip().lower()
        if mode not in {'chat','web','website','dev'}: mode='chat'
        if not message: return 400,{'ok':False,'error':'Message required.'}
        app_context=str(body.get('app_context','')).strip()[:8000]
        history=safe_history(body.get('history'))
        prompt=core.load_prompt(Path(__file__).resolve().parent)
        if app_context:
            prompt += '\n\nMOBILE APP CONTEXT (read-only; never invent missing values):\n' + app_context
        try:
            reply,used=gateway_turn(self.ws,self.ollama,self.model,prompt,history,message,mode)
            return 200,{
                'ok':True,
                'reply':reply,
                'mode':mode,
                'model':self.model,
                'tools_used':used,
                'github_writes':bool(core.STATE.get('github_writes'))
            }
        except Exception as e:
            return 503,{'ok':False,'error':str(e)}

    def github_toggle(self, body):
        enabled=bool(body.get('enabled'))
        if enabled and str(body.get('confirmation','')).strip()!=WRITE_CONFIRM:
            return 400,{'ok':False,'error':f'Type exactly: {WRITE_CONFIRM}'}
        core.STATE['github_writes']=enabled
        return 200,{'ok':True,'github_writes':enabled}


def make_handler(gateway: Gateway):
    class Handler(BaseHTTPRequestHandler):
        server_version='NexusNovaMobileAI/1.1'
        def log_message(self, fmt, *args):
            sys.stdout.write('[mobile-ai] '+(fmt%args)+'\n')
        def cors(self):
            self.send_header('Access-Control-Allow-Origin','*')
            self.send_header('Access-Control-Allow-Headers','Content-Type, X-NexusNova-Token')
            self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS')
            self.send_header('Cache-Control','no-store')
        def send_json(self,status,payload):
            data=json.dumps(payload,ensure_ascii=False).encode('utf-8')
            self.send_response(status); self.cors()
            self.send_header('Content-Type','application/json; charset=utf-8')
            self.send_header('Content-Length',str(len(data))); self.end_headers(); self.wfile.write(data)
        def do_OPTIONS(self):
            self.send_response(204); self.cors(); self.end_headers()
        def do_GET(self):
            if self.path.rstrip('/')=='/health': return self.send_json(200,gateway.health())
            return self.send_json(404,{'ok':False,'error':'Not found.'})
        def read_body(self):
            try: length=int(self.headers.get('Content-Length','0'))
            except ValueError: length=0
            if length<0 or length>MAX_BODY: raise ValueError('Request too large.')
            raw=self.rfile.read(length) if length else b'{}'
            data=json.loads(raw.decode('utf-8'))
            if not isinstance(data,dict): raise ValueError('JSON object required.')
            return data
        def do_POST(self):
            if not gateway.authorized(self.headers): return self.send_json(401,{'ok':False,'error':'Pairing token invalid.'})
            try: body=self.read_body()
            except Exception as e: return self.send_json(400,{'ok':False,'error':str(e)})
            path=self.path.rstrip('/')
            if path=='/api/chat':
                status,payload=gateway.chat(body); return self.send_json(status,payload)
            if path=='/api/github-writes':
                status,payload=gateway.github_toggle(body); return self.send_json(status,payload)
            return self.send_json(404,{'ok':False,'error':'Not found.'})
    return Handler


def main():
    ap=argparse.ArgumentParser(description=APP)
    ap.add_argument('--workspace',default=os.environ.get('NEXUSNOVA_WORKSPACE','..'))
    ap.add_argument('--host',default=os.environ.get('NEXUSNOVA_MOBILE_HOST','127.0.0.1'))
    ap.add_argument('--port',type=int,default=int(os.environ.get('NEXUSNOVA_MOBILE_PORT','8787')))
    ap.add_argument('--model',default=core.DEFAULT_MODEL)
    ap.add_argument('--ollama',default=core.DEFAULT_OLLAMA)
    args=ap.parse_args()
    app_dir=Path(__file__).resolve().parent
    token,token_path=load_or_create_token(app_dir)
    gateway=Gateway(args.workspace,args.ollama,args.model,token)
    ready,models=core.ollama_ready(args.ollama)
    print(f'\n{APP} {VERSION}')
    print(f'Workspace: {gateway.ws.root}')
    print(f'Model: {args.model}')
    print(f'Ollama: {"READY" if ready else "NOT READY"} {models}')
    print(f'Pairing token file: {token_path}')
    print(f'Pairing token: {token}')
    print('Modes: Chat | Web | Website | Dev')
    print('GitHub writes: OFF (can be explicitly armed from paired mobile client)')
    print(f'Listening: http://{args.host}:{args.port}')
    print('For phone access, put an HTTPS tunnel (for example Cloudflare Tunnel/Tailscale HTTPS) in front of this local port.\n')
    server=ThreadingHTTPServer((args.host,args.port),make_handler(gateway))
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()

if __name__=='__main__': main()
