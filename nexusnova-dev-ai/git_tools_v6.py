#!/usr/bin/env python3
from __future__ import annotations
import re

VERSION='6.0.0'


def _spec(name,desc,props,required=None):
    return {'type':'function','function':{'name':name,'description':desc,'parameters':{'type':'object','properties':props,'required':required or []}}}


def tool_specs():
    return [
      _spec('git_commit_safe','Commit only explicitly selected workspace files on a non-main branch. Refuses to absorb unrelated pre-staged files.',{'message':{'type':'string'},'paths':{'type':'array','items':{'type':'string'}}},['message','paths']),
      _spec('git_prepare_branch','Create or switch to a safe non-main work branch. Use before repository edits.',{'name':{'type':'string'}},['name'])
    ]


def prepare_branch(ws,name):
    clean=re.sub(r'[^A-Za-z0-9._/-]+','-',str(name or '').strip()).strip('-/')
    if not clean:clean='nova-v6-work'
    if clean in {'main','master'}:clean='nova-v6-work'
    return ws.git_create_branch(clean)


def commit_safe(ws,message,paths):
    msg=str(message or '').strip()[:180]
    if not msg:return {'ok':False,'error':'Commit message required.'}
    branch=ws.git('branch','--show-current').get('stdout','').strip()
    if not branch or branch in {'main','master'}:return {'ok':False,'error':'Safe commit from main/master is blocked.'}
    if not isinstance(paths,list) or not paths:return {'ok':False,'error':'Select at least one changed file path.'}
    safe_paths=[]
    for raw in paths[:80]:
        try:
            p=ws.safe(str(raw)); rel=ws.rel(p); safe_paths.append(rel)
        except Exception as e:return {'ok':False,'error':f'Invalid path {raw}: {e}'}
    staged=ws.git('diff','--cached','--name-only').get('stdout','').splitlines()
    unexpected=[x for x in staged if x.strip() and x.strip() not in safe_paths]
    if unexpected:return {'ok':False,'error':'Unrelated files are already staged; safe commit refused.','unexpected_staged':unexpected[:30]}
    add=ws.git('add','--',*safe_paths)
    if not add.get('ok'):return add
    names=ws.git('diff','--cached','--name-only').get('stdout','').splitlines()
    if not names:return {'ok':True,'note':'Nothing selected to commit.','branch':branch}
    unexpected=[x for x in names if x.strip() not in safe_paths]
    if unexpected:
        ws.git('reset','--',*safe_paths)
        return {'ok':False,'error':'Staged set contained unexpected files; commit cancelled.','unexpected':unexpected[:30]}
    result=ws.git('commit','-m',msg)
    result['branch']=branch; result['paths']=names
    return result


def execute(ws,name,args):
    try:
        if name=='git_prepare_branch':return prepare_branch(ws,args.get('name','nova-v6-work'))
        if name=='git_commit_safe':return commit_safe(ws,args.get('message',''),args.get('paths',[]))
        return None
    except Exception as e:return {'ok':False,'error':f'{type(e).__name__}: {e}'}
