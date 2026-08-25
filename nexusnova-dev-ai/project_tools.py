#!/usr/bin/env python3
from __future__ import annotations
import json, re
from pathlib import Path

VERSION='3.0.0'
TEXT_EXT={'.html','.htm','.css','.js','.mjs','.cjs','.ts','.tsx','.jsx','.json','.md','.txt','.py','.java','.kt','.kts','.xml','.yml','.yaml','.toml','.ini','.gradle','.properties','.sql'}
IGNORED={'.git','node_modules','.gradle','build','dist','.idea','.nexusnova-ai','.venv','venv','__pycache__'}


def _terms(query: str):
    return [x for x in re.findall(r'[A-Za-z0-9_-]{2,}',(query or '').lower()) if x not in {'the','and','for','with','this','that','from','meri','mera','mere','karo','karna','bhai'}][:24]


def project_context(root: Path, query: str, max_files: int=10):
    terms=_terms(query)
    if not terms:return {'ok':False,'error':'Query required.'}
    rows=[]
    for p in root.rglob('*'):
        if not p.is_file() or p.suffix.lower() not in TEXT_EXT or any(x in IGNORED for x in p.parts):continue
        try:
            if p.stat().st_size>600_000:continue
            text=p.read_text(encoding='utf-8',errors='ignore')
        except Exception:continue
        rel=p.relative_to(root).as_posix(); low=(rel+'\n'+text[:120000]).lower(); score=0
        for t in terms:score+=low.count(t)*(4 if t in rel.lower() else 1)
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


def slugify(name: str):
    s=re.sub(r'[^a-z0-9]+','-',(name or '').strip().lower()).strip('-')
    return s[:60] or 'new-app'


def scaffold(root: Path, name: str, kind: str='web'):
    kind=(kind or 'web').lower().strip(); slug=slugify(name); base=root/'generated-apps'/slug
    if base.exists():return {'ok':False,'error':f'Project already exists: generated-apps/{slug}'}
    base.mkdir(parents=True,exist_ok=False)
    manifest={'name':name.strip() or slug,'slug':slug,'kind':kind,'created_by':'NOVA AI POWER v3','status':'scaffolded'}
    (base/'NOVA_PROJECT.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (base/'README.md').write_text(f'# {manifest["name"]}\n\nCreated by NOVA AI POWER v3.\n\nProject kind: `{kind}`\n\nNOVA AI should inspect `NOVA_PROJECT.json`, implement the owner request, run checks/build, inspect diff, and report evidence.\n',encoding='utf-8')
    if kind in {'web','pwa','website'}:
        (base/'index.html').write_text('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>New App</title>\n<link rel="stylesheet" href="style.css">\n</head>\n<body>\n<main id="app"></main>\n<script src="app.js"></script>\n</body>\n</html>\n',encoding='utf-8')
        (base/'style.css').write_text('html{font-family:system-ui,sans-serif}body{margin:0;min-height:100vh}*{box-sizing:border-box}\n',encoding='utf-8')
        (base/'app.js').write_text("document.getElementById('app').textContent='NOVA AI app scaffold ready';\n",encoding='utf-8')
    return {'ok':True,'path':f'generated-apps/{slug}','manifest':manifest}


def evidence(name: str, result: dict):
    if not isinstance(result,dict):return {'tool':name,'ok':False}
    out={'tool':name,'ok':bool(result.get('ok'))}
    if name in {'read_file','write_file'}:out['path']=result.get('path')
    elif name=='project_context':out['files']=[x.get('path') for x in result.get('results',[])[:8]]
    elif name=='scaffold_app':out['path']=result.get('path'); out['manifest']=result.get('manifest')
    elif name=='git_create_branch':out['branch']=result.get('branch')
    elif name=='git_status':out['status']=(result.get('stdout') or '')[-2500:]
    elif name=='git_diff':out['diff_chars']=len(result.get('unstaged',''))+len(result.get('staged',''))
    elif name in {'run_checks','run_build'}:
        checks=result.get('checks') or result.get('builds') or []
        out['commands']=[{'command':x.get('command'),'ok':x.get('ok'),'code':x.get('code')} for x in checks[:8]]
    elif name=='web_search':out['results']=len(result.get('results',[]))
    elif name=='web_fetch':out['url']=result.get('url')
    elif name=='git_commit':out['code']=result.get('code');out['note']=result.get('note')
    elif name=='git_push_pr':out['push_ok']=bool((result.get('push') or {}).get('ok'));out['pr_ok']=bool((result.get('pr') or {}).get('ok'))
    if result.get('error'):out['error']=str(result.get('error'))[:500]
    return out
