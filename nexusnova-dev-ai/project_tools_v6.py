#!/usr/bin/env python3
from __future__ import annotations
import json, re, zipfile
from pathlib import Path

VERSION='6.0.0'
TEXT_EXT={'.html','.htm','.css','.js','.mjs','.cjs','.ts','.tsx','.jsx','.json','.md','.txt','.py','.java','.kt','.kts','.xml','.yml','.yaml','.toml','.ini','.gradle','.properties','.sql'}
IGNORED={'.git','node_modules','.gradle','build','dist','.idea','.nexusnova-ai','.venv','venv','__pycache__'}


def _spec(name,desc,props,required=None):
    return {'type':'function','function':{'name':name,'description':desc,'parameters':{'type':'object','properties':props,'required':required or []}}}


def tool_specs():
    return [
      _spec('project_context','Find the most relevant project files/snippets for a task before editing.',{'query':{'type':'string'},'max_files':{'type':'integer'}},['query']),
      _spec('inspect_project','Inspect project type, important files and available recognized build commands.',{'path':{'type':'string'}},[]),
      _spec('scaffold_app','Create a safe starter app under generated-apps/. Kinds: web, pwa, python.',{'name':{'type':'string'},'kind':{'type':'string'}},['name']),
      _spec('run_build','Run recognized allow-listed builds/checks for the workspace or a subproject. No arbitrary command input.',{'path':{'type':'string'},'level':{'type':'string'}},[]),
      _spec('create_checkpoint','Create a local checkpoint manifest plus copies of small changed text files before risky edits.',{'label':{'type':'string'}},[]),
      _spec('export_project_zip','Export a generated app/project folder to a ZIP under .nexusnova-ai/exports.',{'path':{'type':'string'}},['path'])
    ]


def _terms(query: str):
    stop={'the','and','for','with','this','that','from','meri','mera','mere','karo','karna','bhai','please','isko','website','app'}
    return [x for x in re.findall(r'[A-Za-z0-9_-]{2,}',(query or '').lower()) if x not in stop][:28]


def project_context(ws, query: str, max_files: int=10):
    terms=_terms(query)
    if not terms:return {'ok':False,'error':'Query required.'}
    rows=[]
    for p in ws.root.rglob('*'):
        if not p.is_file() or p.suffix.lower() not in TEXT_EXT or any(x in IGNORED for x in p.parts):continue
        try:
            if p.stat().st_size>700_000:continue
            text=p.read_text(encoding='utf-8',errors='ignore')
        except Exception:continue
        rel=ws.rel(p); low=(rel+'\n'+text[:140000]).lower(); score=0
        for t in terms:score+=low.count(t)*(5 if t in rel.lower() else 1)
        if score<=0:continue
        snippets=[]; lines=text.splitlines()
        for i,line in enumerate(lines):
            if any(t in line.lower() for t in terms):
                a=max(0,i-2); b=min(len(lines),i+3)
                snippets.append('\n'.join(f'{n+1}: {lines[n]}' for n in range(a,b)))
                if len(snippets)>=3:break
        rows.append({'path':rel,'score':score,'snippets':snippets})
    rows.sort(key=lambda x:(-x['score'],x['path']))
    return {'ok':True,'query':query,'results':rows[:max(1,min(int(max_files),15))]}


def _safe_subproject(ws,path='.'):
    if not path or path=='.':return ws.root
    return ws.safe(path)


def inspect_project(ws,path='.'):
    root=_safe_subproject(ws,path)
    if not root.exists() or not root.is_dir():return {'ok':False,'error':'Project folder does not exist.'}
    files=[]
    for name in ('package.json','pyproject.toml','requirements.txt','pytest.ini','build.gradle','build.gradle.kts','settings.gradle','settings.gradle.kts','gradlew','gradlew.bat','AndroidManifest.xml','index.html','README.md','NOVA_PROJECT.json'):
        if (root/name).exists():files.append(name)
    kind='generic'
    if (root/'package.json').exists():kind='node/web'
    if (root/'gradlew').exists() or (root/'gradlew.bat').exists():kind='gradle/android'
    if (root/'pyproject.toml').exists() or (root/'requirements.txt').exists():kind='python'
    commands=[]
    pkg=root/'package.json'
    if pkg.exists():
        try:scripts=json.loads(pkg.read_text(encoding='utf-8')).get('scripts',{})
        except Exception:scripts={}
        for s in ('test','check','lint','build'):
            if s in scripts:commands.append(f'npm run {s}')
    if (root/'gradlew.bat').exists() or (root/'gradlew').exists():commands.extend(['gradle test','gradle assembleDebug'])
    if (root/'pytest.ini').exists() or (root/'tests').exists():commands.append('python -m pytest -q')
    return {'ok':True,'path':ws.rel(root) if root!=ws.root else '.','kind':kind,'important_files':files,'recognized_commands':commands}


def _slugify(name: str):
    s=re.sub(r'[^a-z0-9]+','-',(name or '').strip().lower()).strip('-')
    return s[:60] or 'new-app'


def scaffold_app(ws,name: str,kind: str='web'):
    kind=(kind or 'web').lower().strip(); slug=_slugify(name); base=ws.root/'generated-apps'/slug
    if base.exists():return {'ok':False,'error':f'Project already exists: generated-apps/{slug}'}
    base.mkdir(parents=True,exist_ok=False)
    manifest={'name':name.strip() or slug,'slug':slug,'kind':kind,'created_by':'NOVA AI POWER V6','status':'scaffolded'}
    (base/'NOVA_PROJECT.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (base/'README.md').write_text(f'# {manifest["name"]}\n\nCreated by NOVA AI POWER V6.\n\nKind: `{kind}`\n',encoding='utf-8')
    if kind in {'web','pwa','website'}:
        (base/'index.html').write_text('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>New App</title>\n<link rel="stylesheet" href="style.css">\n</head>\n<body>\n<main id="app"></main>\n<script src="app.js"></script>\n</body>\n</html>\n',encoding='utf-8')
        (base/'style.css').write_text('html{font-family:system-ui,sans-serif}body{margin:0;min-height:100vh}*{box-sizing:border-box}\n',encoding='utf-8')
        (base/'app.js').write_text("document.getElementById('app').textContent='NOVA AI V6 scaffold ready';\n",encoding='utf-8')
        if kind=='pwa':
            (base/'manifest.webmanifest').write_text(json.dumps({'name':manifest['name'],'short_name':manifest['name'][:12],'start_url':'./','display':'standalone'},indent=2)+'\n',encoding='utf-8')
    elif kind=='python':
        (base/'app.py').write_text("def main():\n    print('NOVA AI V6 app ready')\n\nif __name__ == '__main__':\n    main()\n",encoding='utf-8')
    else:return {'ok':False,'error':'Supported scaffold kinds: web, pwa, python.'}
    return {'ok':True,'path':ws.rel(base),'manifest':manifest}


def run_build(ws,path='.',level='standard'):
    root=_safe_subproject(ws,path)
    if not root.exists() or not root.is_dir():return {'ok':False,'error':'Project folder does not exist.'}
    level=(level or 'standard').lower(); commands=[]
    pkg=root/'package.json'
    if pkg.exists():
        try:scripts=json.loads(pkg.read_text(encoding='utf-8')).get('scripts',{})
        except Exception:scripts={}
        order=('test','check','lint','build') if level in {'deep','builder'} else ('test','check','build')
        for s in order:
            if s in scripts:commands.append(['npm','run',s])
    if (root/'pytest.ini').exists() or (root/'tests').exists():commands.append([__import__('sys').executable,'-m','pytest','-q'])
    if (root/'pyproject.toml').exists() or any(root.glob('*.py')):commands.append([__import__('sys').executable,'-m','compileall','-q','.'])
    gradle=None
    if (root/'gradlew.bat').exists():gradle=[str(root/'gradlew.bat')]
    elif (root/'gradlew').exists():gradle=[str(root/'gradlew')]
    if gradle:
        commands.append(gradle+['test'])
        if level in {'deep','builder'}:commands.append(gradle+['assembleDebug'])
    if not commands:return {'ok':True,'builds':[],'note':'No recognized build/check commands found.'}
    results=[]; ok=True
    for cmd in commands[:6]:
        r=__import__('agent').run_process(cmd,root,420); results.append({'command':' '.join(cmd),**r}); ok=ok and r.get('ok',False)
        if not r.get('ok') and level not in {'deep','builder'}:break
    return {'ok':ok,'builds':results}


def create_checkpoint(ws,label='checkpoint'):
    safe_label=_slugify(label)[:40]; stamp=__import__('datetime').datetime.now().strftime('%Y%m%d-%H%M%S')
    folder=ws.root/'.nexusnova-ai'/'checkpoints'/f'{stamp}-{safe_label}'; folder.mkdir(parents=True,exist_ok=False)
    diff=ws.git_diff(); status=ws.git_status(); copied=[]
    changed=[]
    for line in str(status.get('stdout','')).splitlines():
        rel=line[3:].strip() if len(line)>=4 else ''
        if ' -> ' in rel:rel=rel.split(' -> ')[-1]
        if rel:changed.append(rel)
    for rel in changed[:80]:
        try:
            src=ws.safe(rel)
            if src.is_file() and src.suffix.lower() in TEXT_EXT and src.stat().st_size<500_000:
                dst=folder/rel; dst.parent.mkdir(parents=True,exist_ok=True); dst.write_bytes(src.read_bytes()); copied.append(rel)
        except Exception:pass
    manifest={'label':label,'status':status,'diff':diff,'copied':copied}
    (folder/'checkpoint.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return {'ok':True,'path':ws.rel(folder),'copied':copied,'changed_count':len(changed)}


def export_project_zip(ws,path: str):
    root=_safe_subproject(ws,path)
    if not root.exists() or not root.is_dir():return {'ok':False,'error':'Project folder does not exist.'}
    try:root.relative_to(ws.root)
    except ValueError:return {'ok':False,'error':'Project must be inside workspace.'}
    exports=ws.root/'.nexusnova-ai'/'exports'; exports.mkdir(parents=True,exist_ok=True)
    out=exports/(root.name+'-NOVA-V6.zip')
    with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
        for p in root.rglob('*'):
            if not p.is_file() or any(x in IGNORED for x in p.parts):continue
            if p.stat().st_size>25_000_000:continue
            z.write(p,p.relative_to(root.parent))
    return {'ok':True,'path':ws.rel(out),'size_bytes':out.stat().st_size}


def execute(ws,name,args):
    try:
        if name=='project_context':return project_context(ws,args.get('query',''),int(args.get('max_files',10)))
        if name=='inspect_project':return inspect_project(ws,args.get('path','.'))
        if name=='scaffold_app':return scaffold_app(ws,args.get('name',''),args.get('kind','web'))
        if name=='run_build':return run_build(ws,args.get('path','.'),args.get('level','standard'))
        if name=='create_checkpoint':return create_checkpoint(ws,args.get('label','checkpoint'))
        if name=='export_project_zip':return export_project_zip(ws,args.get('path',''))
        return None
    except Exception as e:return {'ok':False,'error':f'{type(e).__name__}: {e}'}


def evidence(name,result):
    if not isinstance(result,dict):return {'tool':name,'ok':False}
    out={'tool':name,'ok':bool(result.get('ok'))}
    if result.get('error'):out['error']=str(result.get('error'))[:500]
    for key in ('path','kind','note','size_bytes','changed_count'):
        if key in result:out[key]=result[key]
    if name=='project_context':out['files']=[x.get('path') for x in result.get('results',[])[:10]]
    if name in {'run_build','run_checks'}:
        rows=result.get('builds') or result.get('checks') or []
        out['commands']=[{'command':x.get('command'),'ok':x.get('ok'),'code':x.get('code')} for x in rows[:8]]
    return out
