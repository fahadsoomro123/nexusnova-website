#!/usr/bin/env python3
from __future__ import annotations
import argparse, datetime as dt, html, json, os, re, subprocess, sys, urllib.parse, urllib.request
from pathlib import Path

APP_NAME='NexusNova Dev AI'; VERSION='1.0.0'
DEFAULT_MODEL=os.environ.get('NEXUSNOVA_AI_MODEL','gpt-oss:20b')
DEFAULT_OLLAMA=os.environ.get('OLLAMA_HOST','http://127.0.0.1:11434').rstrip('/')
STATE={'github_writes':False}; MAX_TOOL_ROUNDS=12
SYSTEM_FALLBACK="""You are NexusNova Dev AI, a careful local software and SEO assistant. Work only inside the configured NexusNova workspace. Inspect before editing. Preserve working features. Never invent credentials, traffic, users, revenue or test results. Use tools instead of guessing file contents. Make the smallest safe change that solves the user's request. Before claiming success, run available checks and inspect git diff. Do not expose secrets. For GitHub, prefer branch -> change -> checks -> diff -> commit -> push -> PR. Respond to Fahad in short, simple Roman Urdu unless code or technical output requires English."""

def run_process(args,cwd,timeout=120):
    try:
        p=subprocess.run(args,cwd=str(cwd),capture_output=True,text=True,timeout=timeout,shell=False,encoding='utf-8',errors='replace')
        return {'ok':p.returncode==0,'code':p.returncode,'stdout':p.stdout[-20000:],'stderr':p.stderr[-12000:]}
    except FileNotFoundError:return {'ok':False,'code':127,'stdout':'','stderr':f'Command not found: {args[0]}'}
    except subprocess.TimeoutExpired:return {'ok':False,'code':124,'stdout':'','stderr':'Timed out.'}

def stamp(): return dt.datetime.now().strftime('%Y%m%d-%H%M%S')

class Workspace:
    def __init__(self,root):
        self.root=Path(root).expanduser().resolve()
        if not self.root.exists(): raise SystemExit(f'Workspace does not exist: {self.root}')
        self.backups=self.root/'.nexusnova-ai'/'backups'; self.backups.mkdir(parents=True,exist_ok=True)
    def safe(self,rel):
        rel=str(rel or '').replace('\\','/').strip()
        if not rel or rel.startswith('/') or re.match(r'^[A-Za-z]:',rel): raise ValueError('Use a relative workspace path.')
        p=(self.root/rel).resolve()
        try:p.relative_to(self.root)
        except ValueError: raise ValueError('Path escapes workspace.')
        if '.git' in p.parts: raise ValueError('Direct .git access blocked.')
        return p
    def rel(self,p): return p.resolve().relative_to(self.root).as_posix()
    def list_files(self,subdir='.',max_items=250):
        t=self.root if subdir in ('','.') else self.safe(subdir)
        if not t.exists(): return {'ok':False,'error':'Path does not exist.'}
        ignored={'.git','node_modules','.gradle','build','dist','.idea','.nexusnova-ai'}; out=[]
        seq=[t] if t.is_file() else sorted(t.rglob('*'))
        for p in seq:
            if p.is_file() and not any(x in ignored for x in p.parts):
                out.append(self.rel(p))
                if len(out)>=max_items: break
        return {'ok':True,'files':out,'truncated':len(out)>=max_items}
    def read_file(self,path,start_line=1,end_line=400):
        p=self.safe(path)
        if not p.is_file(): return {'ok':False,'error':'File does not exist.'}
        if p.stat().st_size>2_000_000:return {'ok':False,'error':'File too large.'}
        try: lines=p.read_text(encoding='utf-8').splitlines()
        except UnicodeDecodeError:return {'ok':False,'error':'Not UTF-8 text.'}
        s=max(1,int(start_line)); e=min(len(lines),max(s,int(end_line)))
        content='\n'.join(f'{i}: {line}' for i,line in enumerate(lines[s-1:e],s))[:50000]
        return {'ok':True,'path':self.rel(p),'start':s,'end':e,'total_lines':len(lines),'content':content}
    def search_text(self,query,glob='*'):
        q=(query or '').strip()
        if not q:return {'ok':False,'error':'Empty query.'}
        pat=re.compile(re.escape(q),re.I); ignored={'.git','node_modules','.gradle','build','dist','.idea','.nexusnova-ai'}; matches=[]
        for p in self.root.rglob(glob or '*'):
            if not p.is_file() or any(x in ignored for x in p.parts) or p.stat().st_size>1_000_000: continue
            try: lines=p.read_text(encoding='utf-8').splitlines()
            except Exception: continue
            for i,line in enumerate(lines,1):
                if pat.search(line):
                    matches.append({'path':self.rel(p),'line':i,'text':line[:500]})
                    if len(matches)>=50:return {'ok':True,'matches':matches,'truncated':True}
        return {'ok':True,'matches':matches,'truncated':False}
    def write_file(self,path,content):
        p=self.safe(path)
        if len(content)>2_000_000:return {'ok':False,'error':'Write >2MB blocked.'}
        backup=None
        if p.exists():
            backup=self.backups/f"{self.rel(p).replace('/','__')}.{stamp()}.bak"; backup.write_bytes(p.read_bytes())
        p.parent.mkdir(parents=True,exist_ok=True); p.write_text(content,encoding='utf-8',newline='\n')
        return {'ok':True,'path':self.rel(p),'backup':self.rel(backup) if backup else None}
    def git(self,*args,timeout=120): return run_process(['git',*args],self.root,timeout)
    def git_status(self): return self.git('status','--short','--branch')
    def git_diff(self): return {'ok':True,'unstaged':self.git('diff','--no-ext-diff','--')['stdout'],'staged':self.git('diff','--cached','--no-ext-diff','--')['stdout']}
    def git_create_branch(self,name):
        name=re.sub(r'[^A-Za-z0-9._/-]+','-',str(name).strip()).strip('-/')
        if not name or name in {'main','master'}:return {'ok':False,'error':'Choose non-main branch.'}
        cur=self.git('branch','--show-current')['stdout'].strip()
        if cur==name:return {'ok':True,'branch':name,'note':'Already on branch.'}
        exists=self.git('show-ref','--verify','--quiet',f'refs/heads/{name}')['code']==0
        r=self.git('switch',name) if exists else self.git('switch','-c',name); r['branch']=name; return r
    def run_checks(self):
        checks=[]; pkg=self.root/'package.json'
        if pkg.exists():
            try:scripts=json.loads(pkg.read_text(encoding='utf-8')).get('scripts',{})
            except Exception:scripts={}
            for s in ('test','check','lint'):
                if s in scripts:checks.append(['npm','run',s])
        if (self.root/'pytest.ini').exists() or (self.root/'tests').exists():checks.append([sys.executable,'-m','pytest','-q'])
        if not checks:return {'ok':True,'checks':[],'note':'No recognized checks found.'}
        results=[]; ok=True
        for cmd in checks[:4]:
            r=run_process(cmd,self.root,240); results.append({'command':' '.join(cmd),**r}); ok=ok and r['ok']
        return {'ok':ok,'checks':results}
    def git_commit(self,message):
        if not str(message).strip():return {'ok':False,'error':'Commit message required.'}
        a=self.git('add','-A')
        if not a['ok']:return a
        if self.git('diff','--cached','--quiet')['code']==0:return {'ok':True,'note':'Nothing to commit.'}
        return self.git('commit','-m',str(message)[:180])
    def git_push_pr(self,title,body=''):
        if not STATE['github_writes']:return {'ok':False,'error':'GitHub writes OFF. User must type /github-on.'}
        b=self.git('branch','--show-current')['stdout'].strip()
        if not b or b in {'main','master'}:return {'ok':False,'error':'PR push from main/master blocked.'}
        push=self.git('push','-u','origin',b,timeout=180)
        if not push['ok']:return {'ok':False,'push':push}
        pr=run_process(['gh','pr','create','--title',str(title)[:200],'--body',str(body)[:10000],'--base','main','--head',b],self.root,180)
        return {'ok':pr['ok'],'push':push,'pr':pr}

def web_fetch(url):
    try:
        u=urllib.parse.urlparse(url)
        if u.scheme not in {'http','https'}:return {'ok':False,'error':'Only http/https.'}
        req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 NexusNovaDevAI/1.0'})
        with urllib.request.urlopen(req,timeout=20) as r:
            raw=r.read(400000).decode('utf-8',errors='replace'); c=r.headers.get('Content-Type','')
        if 'html' in c or '<html' in raw[:1000].lower():
            raw=re.sub(r'(?is)<script.*?</script>|<style.*?</style>',' ',raw); raw=html.unescape(re.sub(r'(?s)<[^>]+>',' ',raw)); raw=re.sub(r'\s+',' ',raw).strip()
        return {'ok':True,'url':url,'content':raw[:30000]}
    except Exception as e:return {'ok':False,'error':str(e)}

def web_search(query):
    try:
        q=urllib.parse.quote_plus(str(query)[:300]); url=f'https://html.duckduckgo.com/html/?q={q}'
        req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req,timeout=20) as r: raw=r.read(500000).decode('utf-8',errors='replace')
        out=[]
        for m in re.finditer(r'class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>',raw,re.I|re.S):
            href=html.unescape(m.group(1)); title=html.unescape(re.sub(r'<[^>]+>','',m.group(2))).strip(); p=urllib.parse.urlparse(href); qs=urllib.parse.parse_qs(p.query); target=qs.get('uddg',[href])[0]
            if title and target:out.append({'title':title[:250],'url':target})
            if len(out)>=8:break
        return {'ok':True,'query':query,'results':out,'note':'Best-effort no-key public search.'}
    except Exception as e:return {'ok':False,'error':str(e),'note':'Search optional; direct URL fetch still works.'}

def spec(name,desc,props,required=None): return {'type':'function','function':{'name':name,'description':desc,'parameters':{'type':'object','properties':props,'required':required or []}}}
def tool_specs():
    return [
      spec('list_files','List files inside workspace.',{'subdir':{'type':'string'},'max_items':{'type':'integer'}}),
      spec('read_file','Read a UTF-8 file with line numbers.',{'path':{'type':'string'},'start_line':{'type':'integer'},'end_line':{'type':'integer'}},['path']),
      spec('search_text','Search exact text in workspace.',{'query':{'type':'string'},'glob':{'type':'string'}},['query']),
      spec('write_file','Create or replace UTF-8 file; backup existing file.',{'path':{'type':'string'},'content':{'type':'string'}},['path','content']),
      spec('git_status','Show git status.',{}), spec('git_diff','Show staged/unstaged diff.',{}),
      spec('git_create_branch','Create/switch non-main branch.',{'name':{'type':'string'}},['name']),
      spec('run_checks','Run recognized npm/pytest checks; no arbitrary shell.',{}),
      spec('git_commit','Stage and local commit.',{'message':{'type':'string'}},['message']),
      spec('git_push_pr','Push branch and create GitHub PR via gh; requires /github-on.',{'title':{'type':'string'},'body':{'type':'string'}},['title']),
      spec('web_search','Best-effort no-key web search.',{'query':{'type':'string'}},['query']),
      spec('web_fetch','Fetch readable public URL text.',{'url':{'type':'string'}},['url'])]

def execute(ws,name,a):
    try:
        if name=='list_files':return ws.list_files(a.get('subdir','.'),int(a.get('max_items',250)))
        if name=='read_file':return ws.read_file(a['path'],int(a.get('start_line',1)),int(a.get('end_line',400)))
        if name=='search_text':return ws.search_text(a['query'],a.get('glob','*'))
        if name=='write_file':return ws.write_file(a['path'],a['content'])
        if name=='git_status':return ws.git_status()
        if name=='git_diff':return ws.git_diff()
        if name=='git_create_branch':return ws.git_create_branch(a['name'])
        if name=='run_checks':return ws.run_checks()
        if name=='git_commit':return ws.git_commit(a['message'])
        if name=='git_push_pr':return ws.git_push_pr(a['title'],a.get('body',''))
        if name=='web_search':return web_search(a['query'])
        if name=='web_fetch':return web_fetch(a['url'])
        return {'ok':False,'error':f'Unknown tool {name}'}
    except Exception as e:return {'ok':False,'error':f'{type(e).__name__}: {e}'}

def http_json(url,payload,timeout=600):
    req=urllib.request.Request(url,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'},method='POST')
    with urllib.request.urlopen(req,timeout=timeout) as r:return json.loads(r.read().decode())
def ollama_ready(base):
    try:
        with urllib.request.urlopen(base+'/api/tags',timeout=5) as r:d=json.loads(r.read().decode())
        return True,', '.join(x.get('name','') for x in d.get('models',[])[:8])
    except Exception as e:return False,str(e)
def load_prompt(app):
    p=app/'SYSTEM_PROMPT.md'
    try:return p.read_text(encoding='utf-8')
    except OSError:return SYSTEM_FALLBACK

def turn(ws,base,model,prompt,history,user):
    msgs=[{'role':'system','content':prompt}]+history[-24:]+[{'role':'user','content':user}]
    for _ in range(MAX_TOOL_ROUNDS):
        try:r=http_json(base+'/api/chat',{'model':model,'messages':msgs,'tools':tool_specs(),'stream':False,'options':{'temperature':0.2}})
        except Exception as e:return f'Ollama se connect nahi hua: {e}'
        m=r.get('message') or {}; content=m.get('content') or ''; calls=m.get('tool_calls') or []; am={'role':'assistant','content':content}
        if calls:am['tool_calls']=calls
        msgs.append(am)
        if not calls:
            history.extend([{'role':'user','content':user},{'role':'assistant','content':content}]); return content.strip() or '(No text response.)'
        for c in calls:
            f=c.get('function') or {}; name=f.get('name',''); raw=f.get('arguments',{})
            if isinstance(raw,str):
                try:a=json.loads(raw)
                except Exception:a={}
            else:a=raw if isinstance(raw,dict) else {}
            res=execute(ws,name,a); print(f"\n  [tool] {name}: {'OK' if res.get('ok') else 'ERROR'}")
            msgs.append({'role':'tool','tool_name':name,'content':json.dumps(res,ensure_ascii=False)[:60000]})
    return 'Tool loop limit reach ho gaya. Task ko chhote step me bolo.'

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--workspace',default=os.environ.get('NEXUSNOVA_WORKSPACE','..')); ap.add_argument('--model',default=DEFAULT_MODEL); ap.add_argument('--ollama',default=DEFAULT_OLLAMA); a=ap.parse_args()
    app=Path(__file__).resolve().parent; ws=Workspace(a.workspace); hist=[]; ready,detail=ollama_ready(a.ollama)
    print(f'\n{APP_NAME} v{VERSION}\n'+'='*54); print(f'Workspace : {ws.root}\nModel     : {a.model}\nGitHub PR : OFF (type /github-on when needed)')
    if not ready: print(f'\nOllama nahi mil raha. Ollama install/start karo aur INSTALL_MODEL.bat chalao.\nDetail: {detail}'); return 2
    print('Ollama    : connected\n\nRoman Urdu me task likho. /help for commands.\n')
    while True:
        try:u=input('Fahad > ').strip()
        except (EOFError,KeyboardInterrupt):print('\nAllah Hafiz.'); break
        if not u:continue
        c=u.lower()
        if c in {'/exit','/quit'}:print('Allah Hafiz.'); break
        if c=='/help': print('/status /github-on /github-off /model /clear /exit'); continue
        if c=='/github-on': STATE['github_writes']=True; print('GitHub push/PR ON for this session.'); continue
        if c=='/github-off': STATE['github_writes']=False; print('GitHub push/PR OFF.'); continue
        if c=='/model': print(a.model); continue
        if c=='/clear': hist.clear(); print('Chat memory clear.'); continue
        if c=='/status': print(json.dumps(ws.git_status(),indent=2,ensure_ascii=False)); continue
        print('\nNexusNova AI >\n'+turn(ws,a.ollama,a.model,load_prompt(app),hist,u)+'\n')
    return 0
if __name__=='__main__': raise SystemExit(main())
