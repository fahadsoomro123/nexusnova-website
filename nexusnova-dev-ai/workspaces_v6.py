#!/usr/bin/env python3
from __future__ import annotations
import datetime as dt, json, re
from pathlib import Path

VERSION='6.1.0-work'
SAFE_ARTIFACT_EXT={'.md','.txt','.json','.html','.css','.js','.py','.xml','.csv','.yml','.yaml'}


def _spec(name,desc,props,required=None):
    return {'type':'function','function':{'name':name,'description':desc,'parameters':{'type':'object','properties':props,'required':required or []}}}


def tool_specs():
    return [
      _spec('work_open','Create or open a persistent NOVA Work workspace.',{'name':{'type':'string'},'objective':{'type':'string'}},['name']),
      _spec('work_context','Read persistent workspace objective, notes, tasks and artifacts.',{'name':{'type':'string'}},[]),
      _spec('work_list','List persistent NOVA Work workspaces.',{},[]),
      _spec('work_note','Append a durable note to a Work workspace.',{'name':{'type':'string'},'text':{'type':'string'}},['text']),
      _spec('work_task','Add/update a persistent Work task. action: add, done, reopen, remove.',{'name':{'type':'string'},'action':{'type':'string'},'text':{'type':'string'},'task_id':{'type':'string'}},['action']),
      _spec('work_save_artifact','Save a text/code artifact inside the Work workspace artifacts folder.',{'name':{'type':'string'},'filename':{'type':'string'},'content':{'type':'string'}},['filename','content'])
    ]


def _slug(value:str):
    s=re.sub(r'[^a-z0-9]+','-',str(value or '').strip().lower()).strip('-')
    return s[:64] or 'nexusnova-work'


def _base(ws):
    p=ws.root/'.nexusnova-ai'/'workspaces'; p.mkdir(parents=True,exist_ok=True); return p


def _active_path(ws):return _base(ws)/'_active.json'

def _now():return dt.datetime.now(dt.timezone.utc).isoformat()


def _workspace(ws,name=''):
    if name:return _base(ws)/_slug(name)
    try:
        d=json.loads(_active_path(ws).read_text(encoding='utf-8')); slug=_slug(d.get('slug',''))
        if slug:return _base(ws)/slug
    except Exception:pass
    return _base(ws)/'nexusnova-work'


def _meta(path):
    try:return json.loads((path/'workspace.json').read_text(encoding='utf-8'))
    except Exception:return {}


def _tasks(path):
    try:
        data=json.loads((path/'tasks.json').read_text(encoding='utf-8')); return data if isinstance(data,list) else []
    except Exception:return []


def _write_json(path,data):path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')


def work_open(ws,name,objective=''):
    clean=' '.join(str(name or '').split())[:140] or 'NexusNova Work'; path=_workspace(ws,clean); path.mkdir(parents=True,exist_ok=True)
    (path/'artifacts').mkdir(exist_ok=True); (path/'files').mkdir(exist_ok=True)
    meta=_meta(path) or {'name':clean,'slug':path.name,'created_at':_now(),'objective':''}
    if objective and not meta.get('objective'):meta['objective']=' '.join(str(objective).split())[:3000]
    meta['updated_at']=_now(); meta['last_opened_at']=meta['updated_at']; _write_json(path/'workspace.json',meta)
    if not (path/'tasks.json').exists():_write_json(path/'tasks.json',[])
    if not (path/'NOTES.md').exists():(path/'NOTES.md').write_text('# Work Notes\n\n',encoding='utf-8')
    _write_json(_active_path(ws),{'slug':path.name,'name':meta.get('name',clean),'updated_at':_now()})
    return {'ok':True,'name':meta.get('name',clean),'slug':path.name,'path':ws.rel(path),'objective':meta.get('objective','')}


def work_context(ws,name=''):
    path=_workspace(ws,name)
    if not (path/'workspace.json').exists():
        if name:return work_open(ws,name)
        return work_open(ws,'NexusNova Work')
    meta=_meta(path); tasks=_tasks(path)
    try:notes=(path/'NOTES.md').read_text(encoding='utf-8')[-12000:]
    except Exception:notes=''
    artifacts=[]
    adir=path/'artifacts'
    if adir.exists():
        for p in sorted(adir.rglob('*')):
            if p.is_file():artifacts.append({'path':p.relative_to(path).as_posix(),'size':p.stat().st_size})
            if len(artifacts)>=40:break
    return {'ok':True,'workspace':meta,'tasks':tasks[-100:],'notes':notes,'artifacts':artifacts}


def work_list(ws):
    rows=[]
    for p in sorted(_base(ws).iterdir()):
        if p.is_dir() and (p/'workspace.json').exists():
            m=_meta(p); rows.append({'name':m.get('name',p.name),'slug':p.name,'objective':m.get('objective',''),'updated_at':m.get('updated_at','')})
    rows.sort(key=lambda x:x.get('updated_at',''),reverse=True)
    return {'ok':True,'workspaces':rows[:50]}


def work_note(ws,text,name=''):
    text=str(text or '').strip()[:8000]
    if not text:return {'ok':False,'error':'Note text required.'}
    path=_workspace(ws,name)
    if not (path/'workspace.json').exists():work_open(ws,name or 'NexusNova Work')
    with (path/'NOTES.md').open('a',encoding='utf-8') as f:f.write(f'\n## {_now()}\n{text}\n')
    m=_meta(path);m['updated_at']=_now();_write_json(path/'workspace.json',m)
    return {'ok':True,'workspace':m.get('name',path.name),'note_chars':len(text)}


def work_task(ws,action,text='',task_id='',name=''):
    path=_workspace(ws,name)
    if not (path/'workspace.json').exists():work_open(ws,name or 'NexusNova Work')
    tasks=_tasks(path); action=str(action or '').lower().strip(); now=_now()
    if action=='add':
        clean=' '.join(str(text or '').split())[:1200]
        if not clean:return {'ok':False,'error':'Task text required.'}
        ident=f't{len(tasks)+1}-{int(dt.datetime.now().timestamp())}'
        tasks.append({'id':ident,'text':clean,'status':'open','created_at':now,'updated_at':now})
    else:
        ident=str(task_id or '').strip(); row=next((x for x in tasks if str(x.get('id'))==ident),None)
        if not row:return {'ok':False,'error':'task_id not found.'}
        if action=='done':row['status']='done'
        elif action=='reopen':row['status']='open'
        elif action=='remove':tasks=[x for x in tasks if str(x.get('id'))!=ident]
        else:return {'ok':False,'error':'action must be add, done, reopen, or remove.'}
        if action!='remove':row['updated_at']=now
    _write_json(path/'tasks.json',tasks);m=_meta(path);m['updated_at']=now;_write_json(path/'workspace.json',m)
    return {'ok':True,'tasks':tasks[-100:]}


def work_save_artifact(ws,filename,content,name=''):
    path=_workspace(ws,name)
    if not (path/'workspace.json').exists():work_open(ws,name or 'NexusNova Work')
    raw=Path(str(filename or '').replace('\\','/')).name
    if not raw:return {'ok':False,'error':'Filename required.'}
    ext=Path(raw).suffix.lower()
    if ext not in SAFE_ARTIFACT_EXT:return {'ok':False,'error':'Unsupported artifact type.'}
    text=str(content or '')
    if len(text)>1_500_000:return {'ok':False,'error':'Artifact exceeds 1.5 MB text limit.'}
    out=path/'artifacts'/raw;out.write_text(text,encoding='utf-8',newline='\n')
    m=_meta(path);m['updated_at']=_now();_write_json(path/'workspace.json',m)
    return {'ok':True,'workspace':m.get('name',path.name),'path':ws.rel(out),'size_bytes':out.stat().st_size}


def execute(ws,name,args):
    try:
        if name=='work_open':return work_open(ws,args.get('name',''),args.get('objective',''))
        if name=='work_context':return work_context(ws,args.get('name',''))
        if name=='work_list':return work_list(ws)
        if name=='work_note':return work_note(ws,args.get('text',''),args.get('name',''))
        if name=='work_task':return work_task(ws,args.get('action',''),args.get('text',''),args.get('task_id',''),args.get('name',''))
        if name=='work_save_artifact':return work_save_artifact(ws,args.get('filename',''),args.get('content',''),args.get('name',''))
        return None
    except Exception as e:return {'ok':False,'error':f'{type(e).__name__}: {e}'}
