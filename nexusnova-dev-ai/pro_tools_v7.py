#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import math
import re
import statistics
from collections import Counter

import agent as core

VERSION='7.0.0-pro-tools'
TEXT_EXT={'.html','.htm','.css','.js','.mjs','.cjs','.ts','.tsx','.jsx','.json','.md','.txt','.py','.java','.kt','.kts','.xml','.yml','.yaml','.toml','.ini','.gradle','.properties','.sql','.csv'}
IGNORED={'.git','node_modules','.gradle','build','dist','.idea','.nexusnova-ai','.venv','venv','__pycache__'}


def _spec(name,desc,props,required=None):
    return {'type':'function','function':{'name':name,'description':desc,'parameters':{'type':'object','properties':props,'required':required or []}}}


def tool_specs():
    return [
      _spec('deep_research','Run several no-key public web searches, deduplicate results, fetch readable source text, and return a multi-source evidence pack. Use for current/fresh research before conclusions.',{'question':{'type':'string'},'queries':{'type':'array','items':{'type':'string'}},'max_sources':{'type':'integer'}},['question']),
      _spec('knowledge_search','Search the local workspace using multiple task terms, path/phrase bonuses and contextual snippets. Better for broad project retrieval than exact text search.',{'query':{'type':'string'},'max_files':{'type':'integer'}},['query']),
      _spec('analyze_data','Safely inspect and summarize a local CSV or JSON data file without executing arbitrary code. Returns schema, missing values, numeric statistics and common values.',{'path':{'type':'string'},'max_rows':{'type':'integer'}},['path']),
    ]


def _terms(text):
    stop={'the','and','for','with','this','that','from','into','your','you','are','was','were','will','have','meri','mera','mere','mujhe','isko','bhai','please','karo','karna','aur','hai','hey','website','app'}
    out=[]
    for x in re.findall(r'[A-Za-z0-9_./-]{2,}',str(text or '').lower()):
        x=x.strip('./-')
        if x and x not in stop and x not in out:out.append(x)
    return out[:36]


def deep_research(question,queries=None,max_sources=8):
    question=' '.join(str(question or '').split())[:1200]
    if not question:return {'ok':False,'error':'Question required.'}
    clean=[]
    for q in (queries or []):
        q=' '.join(str(q or '').split())[:300]
        if q and q not in clean:clean.append(q)
        if len(clean)>=5:break
    if not clean:clean=[question[:300]]
    if len(clean)<3:
        for suffix in (' official',' documentation'):
            q=(question[:260]+suffix).strip()
            if q not in clean:clean.append(q)
            if len(clean)>=3:break
    max_sources=max(2,min(int(max_sources or 8),10))
    candidates=[];seen=set();searches=[]
    for q in clean[:5]:
        sr=core.web_search(q);searches.append({'query':q,'ok':bool(sr.get('ok')),'count':len(sr.get('results') or [])})
        for row in sr.get('results') or []:
            url=str(row.get('url') or '').strip()
            if not url or url in seen:continue
            seen.add(url);candidates.append({'title':str(row.get('title') or '')[:300],'url':url})
            if len(candidates)>=max_sources*3:break
        if len(candidates)>=max_sources*3:break
    sources=[]
    for row in candidates:
        if len(sources)>=max_sources:break
        fetched=core.web_fetch(row['url'])
        if not fetched.get('ok'):continue
        content=' '.join(str(fetched.get('content') or '').split())
        if len(content)<120:continue
        sources.append({'title':row['title'],'url':row['url'],'excerpt':content[:5000]})
    return {'ok':bool(sources),'question':question,'searches':searches,'source_count':len(sources),'sources':sources,'note':'Public no-key research evidence. Source freshness/authority must still be judged by the model.'}


def _snippet(lines,hit_lines,max_snippets=3):
    out=[];used=set()
    for i in hit_lines:
        a=max(0,i-2);b=min(len(lines),i+3);key=(a,b)
        if key in used:continue
        used.add(key);out.append('\n'.join(f'{n+1}: {lines[n]}' for n in range(a,b)))
        if len(out)>=max_snippets:break
    return out


def knowledge_search(ws,query,max_files=12):
    query=' '.join(str(query or '').split())[:1200];terms=_terms(query)
    if not terms:return {'ok':False,'error':'Useful query terms required.'}
    phrase=query.lower();rows=[];scanned=0
    for p in ws.root.rglob('*'):
        if not p.is_file() or p.suffix.lower() not in TEXT_EXT or any(x in IGNORED for x in p.parts):continue
        try:
            if p.stat().st_size>1_000_000:continue
            text=p.read_text(encoding='utf-8',errors='ignore')
        except Exception:continue
        scanned+=1;rel=ws.rel(p);low=text.lower();rel_low=rel.lower();score=0.0;hits=[]
        for t in terms:
            count=low.count(t)
            if count:
                score+=min(count,12)
                if t in rel_low:score+=8
        if phrase and len(phrase)>=8 and phrase in low:score+=14
        if score<=0:continue
        lines=text.splitlines()
        for i,line in enumerate(lines):
            ll=line.lower()
            if any(t in ll for t in terms):hits.append(i)
            if len(hits)>=8:break
        rows.append({'path':rel,'score':round(score,2),'snippets':_snippet(lines,hits)})
    rows.sort(key=lambda x:(-x['score'],x['path']));limit=max(1,min(int(max_files or 12),20))
    return {'ok':True,'query':query,'scanned_files':scanned,'results':rows[:limit]}


def _to_number(value):
    if value is None:return None
    text=str(value).strip().replace(',','')
    if not text:return None
    try:
        n=float(text)
        return n if math.isfinite(n) else None
    except Exception:return None


def _summarize_rows(rows,columns,total_seen,truncated):
    result={'rows_analyzed':len(rows),'rows_seen':total_seen,'truncated':bool(truncated),'columns':[]}
    for col in columns[:80]:
        vals=[row.get(col) for row in rows];missing=sum(1 for v in vals if v is None or str(v).strip()=='')
        nonempty=[v for v in vals if v is not None and str(v).strip()!=''];nums=[_to_number(v) for v in nonempty];nums=[x for x in nums if x is not None]
        item={'name':col,'missing':missing,'non_missing':len(nonempty)}
        if nonempty and len(nums)/max(1,len(nonempty))>=0.85:
            item['type']='number'
            if nums:
                item['min']=min(nums);item['max']=max(nums);item['mean']=round(statistics.fmean(nums),6);item['median']=round(statistics.median(nums),6)
        else:
            item['type']='text';common=Counter(str(v)[:300] for v in nonempty).most_common(8);item['top_values']=[{'value':k,'count':v} for k,v in common]
        result['columns'].append(item)
    return result


def analyze_data(ws,path,max_rows=5000):
    try:p=ws.safe(path)
    except Exception as e:return {'ok':False,'error':str(e)}
    if not p.is_file():return {'ok':False,'error':'Data file does not exist.'}
    if p.stat().st_size>20_000_000:return {'ok':False,'error':'Data file >20MB blocked for safe local analysis.'}
    limit=max(50,min(int(max_rows or 5000),10000));ext=p.suffix.lower()
    if ext=='.csv':
        rows=[];total=0;columns=[]
        try:
            with p.open('r',encoding='utf-8-sig',errors='replace',newline='') as f:
                reader=csv.DictReader(f);columns=[str(x) for x in (reader.fieldnames or [])]
                for row in reader:
                    total+=1
                    if len(rows)<limit:rows.append(dict(row))
        except Exception as e:return {'ok':False,'error':f'CSV read failed: {e}'}
        out=_summarize_rows(rows,columns,total,total>limit);return {'ok':True,'path':ws.rel(p),'kind':'csv',**out}
    if ext=='.json':
        try:data=json.loads(p.read_text(encoding='utf-8',errors='replace'))
        except Exception as e:return {'ok':False,'error':f'JSON read failed: {e}'}
        if isinstance(data,list) and all(isinstance(x,dict) for x in data[:min(len(data),50)]):
            rows=[dict(x) for x in data[:limit]];cols=[]
            for row in rows:
                for k in row:
                    k=str(k)
                    if k not in cols:cols.append(k)
            out=_summarize_rows(rows,cols,len(data),len(data)>limit);return {'ok':True,'path':ws.rel(p),'kind':'json-records',**out}
        if isinstance(data,dict):
            keys=list(data.keys())[:200];return {'ok':True,'path':ws.rel(p),'kind':'json-object','keys':[str(x) for x in keys],'key_count':len(data),'preview':json.dumps(data,ensure_ascii=False)[:12000]}
        return {'ok':True,'path':ws.rel(p),'kind':'json-value','preview':json.dumps(data,ensure_ascii=False)[:12000]}
    return {'ok':False,'error':'Supported data files: .csv and .json'}


def execute(ws,name,args):
    try:
        if name=='deep_research':return deep_research(args.get('question',''),args.get('queries') or [],int(args.get('max_sources',8)))
        if name=='knowledge_search':return knowledge_search(ws,args.get('query',''),int(args.get('max_files',12)))
        if name=='analyze_data':return analyze_data(ws,args.get('path',''),int(args.get('max_rows',5000)))
        return None
    except Exception as e:return {'ok':False,'error':f'{type(e).__name__}: {e}'}
