#!/usr/bin/env python3
from __future__ import annotations
import datetime as dt, json, queue, threading, time, uuid
from pathlib import Path

VERSION='6.2.0-work-max'
TERMINAL={'completed','failed','cancelled','interrupted'}


def _now(): return dt.datetime.now(dt.timezone.utc).isoformat()


def _clean_text(value, limit=14000):
    return ' '.join(str(value or '').strip().split())[:limit]


class WorkRuntime:
    """Persistent single-worker queue for delegated NOVA Work tasks.

    Jobs keep running while the gateway/PC stays alive. Queued jobs survive a
    gateway restart. A job that was actively running when the process stopped
    is marked interrupted rather than blindly replayed, avoiding duplicate
    writes or Git operations.
    """
    def __init__(self, state_dir: Path, runner):
        self.root=Path(state_dir)/'work-jobs'
        self.root.mkdir(parents=True, exist_ok=True)
        self.index=self.root/'jobs.json'
        self.runner=runner
        self.lock=threading.RLock()
        self.q=queue.Queue()
        self.cancel_flags={}
        self.jobs=self._load()
        self._recover()
        self.thread=threading.Thread(target=self._loop,name='nova-work-max',daemon=True)
        self.thread.start()

    def _load(self):
        try:
            data=json.loads(self.index.read_text(encoding='utf-8'))
            return data if isinstance(data,dict) else {}
        except Exception:return {}

    def _save(self):
        tmp=self.index.with_suffix('.tmp')
        tmp.write_text(json.dumps(self.jobs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        tmp.replace(self.index)

    def _recover(self):
        changed=False
        for jid,row in list(self.jobs.items()):
            status=row.get('status')
            if status=='running':
                row['status']='interrupted'; row['finished_at']=_now()
                row['error']='Gateway stopped while this task was running. Work state was preserved; submit a continuation task to resume safely.'
                changed=True
            elif status=='queued':
                self.q.put(jid)
        if changed:self._save()

    def submit(self, body:dict):
        request=_clean_text(body.get('message'),14000)
        if not request:return {'ok':False,'error':'Message required.'}
        jid='work-'+uuid.uuid4().hex[:12]
        workspace=_clean_text(body.get('work_workspace') or 'NexusNova Work',140)
        safe_body={
            'message':request,'mode':'work','work_workspace':workspace,
            'history':body.get('history') if isinstance(body.get('history'),list) else [],
            'app_context':str(body.get('app_context') or '')[:9000],
            'reasoning':'deep','work_background':False,
        }
        row={
            'id':jid,'workspace':workspace,'request':request,'status':'queued',
            'created_at':_now(),'started_at':None,'finished_at':None,
            'progress':[{'at':_now(),'stage':'queued','message':'Task queued'}],
            'result':None,'error':None,'body':safe_body,
        }
        with self.lock:
            self.jobs[jid]=row; self._save(); self.q.put(jid)
        return {'ok':True,'queued':True,'job':self.public(row)}

    def public(self,row):
        if not row:return None
        return {k:row.get(k) for k in ('id','workspace','request','status','created_at','started_at','finished_at','progress','result','error')}

    def get(self,jid):
        with self.lock:return self.public(self.jobs.get(str(jid or '').strip()))

    def list(self,workspace='',limit=30):
        ws=_clean_text(workspace,140).lower()
        with self.lock:
            rows=[self.public(x) for x in self.jobs.values() if not ws or str(x.get('workspace','')).lower()==ws]
        rows.sort(key=lambda x:x.get('created_at') or '',reverse=True)
        return rows[:max(1,min(int(limit or 30),100))]

    def cancel(self,jid):
        jid=str(jid or '').strip()
        with self.lock:
            row=self.jobs.get(jid)
            if not row:return {'ok':False,'error':'Job not found.'}
            if row.get('status') in TERMINAL:return {'ok':False,'error':'Job already finished.','job':self.public(row)}
            flag=self.cancel_flags.setdefault(jid,threading.Event()); flag.set()
            if row.get('status')=='queued':
                row['status']='cancelled';row['finished_at']=_now();self._progress_locked(row,'cancelled','Cancelled before execution');self._save()
            return {'ok':True,'job':self.public(row)}

    def _progress_locked(self,row,stage,message):
        rows=row.setdefault('progress',[])
        rows.append({'at':_now(),'stage':str(stage)[:80],'message':str(message)[:700]})
        if len(rows)>80:del rows[:-80]

    def progress(self,jid,stage,message):
        with self.lock:
            row=self.jobs.get(jid)
            if not row:return
            self._progress_locked(row,stage,message);self._save()

    def _loop(self):
        while True:
            jid=self.q.get()
            try:self._run(jid)
            except Exception:
                pass
            finally:self.q.task_done()

    def _run(self,jid):
        with self.lock:
            row=self.jobs.get(jid)
            if not row or row.get('status')!='queued':return
            flag=self.cancel_flags.setdefault(jid,threading.Event())
            if flag.is_set():return
            row['status']='running';row['started_at']=_now();self._progress_locked(row,'starting','NOVA Work MAX started');self._save()
            body=dict(row.get('body') or {})
        def cb(stage,message):self.progress(jid,stage,message)
        try:
            status,payload=self.runner(body,cb,flag)
            with self.lock:
                row=self.jobs.get(jid)
                if not row:return
                if flag.is_set() and row.get('status') not in TERMINAL:
                    row['status']='cancelled';row['error']='Cancelled by owner.';self._progress_locked(row,'cancelled','Task cancelled')
                elif int(status)>=400 or not isinstance(payload,dict) or not payload.get('ok'):
                    row['status']='failed';row['error']=str((payload or {}).get('error') if isinstance(payload,dict) else payload)[:4000]
                    self._progress_locked(row,'failed',row['error'] or 'Task failed')
                else:
                    row['status']='completed';row['result']={
                        'reply':str(payload.get('reply') or '')[:50000],
                        'work':payload.get('work'),
                        'power':payload.get('power'),
                    }
                    self._progress_locked(row,'completed','Task completed and verified')
                row['finished_at']=_now();self._save()
        except Exception as e:
            with self.lock:
                row=self.jobs.get(jid)
                if row:
                    row['status']='failed';row['error']=f'{type(e).__name__}: {e}'[:4000];row['finished_at']=_now()
                    self._progress_locked(row,'failed',row['error']);self._save()

    def stats(self):
        with self.lock:
            vals=list(self.jobs.values())
        return {s:sum(1 for x in vals if x.get('status')==s) for s in ('queued','running','completed','failed','cancelled','interrupted')}
