#!/usr/bin/env python3
from __future__ import annotations
import json

VERSION='6.2.0-work-max'


def finalize(core,base,model,system_prompt,user,draft,evidence,review,critic,workspace_state):
    """Produce a concise evidence-grounded final response after execution.

    This is deliberately non-tool-using: all mutations already happened in the
    worker phase. The finalizer can improve clarity and honesty without causing
    duplicate edits or actions.
    """
    system=system_prompt+'''\n\nYou are NOVA Work MAX Final Evidence Synthesizer.
You run AFTER all tool execution, build/checks, reviewer and critic passes.
Use ONLY the supplied evidence and persistent workspace state. Never invent a build, deployment, file, PR, test result, browser action, or completion claim.
Return the owner's final answer in concise Roman Urdu unless the owner's request clearly needs another language.
Structure naturally: what was completed, important outputs/paths, what remains/blockers. Do not expose secrets. If verification failed, say so plainly.'''
    payload={
      'owner_request':str(user)[:14000],
      'worker_draft':str(draft)[:24000],
      'evidence':(evidence or [])[-100:],
      'review':review or {},'critic':critic or {},
      'workspace':workspace_state or {},
    }
    try:
        r=core.http_json(base+'/api/chat',{
            'model':model,
            'messages':[{'role':'system','content':system},{'role':'user','content':json.dumps(payload,ensure_ascii=False)}],
            'stream':False,'options':{'temperature':0.03}
        },timeout=720)
        text=str((r.get('message') or {}).get('content') or '').strip()
        return text or str(draft or '')
    except Exception:return str(draft or '')
