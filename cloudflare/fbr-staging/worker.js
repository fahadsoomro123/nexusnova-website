const TARGET='https://nexusnova-telegram-bot.fahadsoomro123.workers.dev/api/fbr/atl-status';
const ALLOWED=new Set(['https://rawcdn.githack.com','https://raw.githack.com','https://nexusnovatools.com','https://www.nexusnovatools.com']);
export default { async fetch(request) {
  const url=new URL(request.url), origin=String(request.headers.get('Origin')||'');
  if(url.pathname!=='/api/fbr/atl-status') return new Response('Not Found',{status:404});
  if(!ALLOWED.has(origin)) return json(origin,{ok:false,error:'Request origin is not allowed.'},403);
  if(request.method==='OPTIONS') return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600','Vary':'Origin'}});
  if(request.method!=='POST') return json(origin,{ok:false,error:'Method not allowed.'},405,{'Allow':'POST, OPTIONS'});
  let body='';
  try { body=await request.text(); if(body.length>4096) return json(origin,{ok:false,error:'The verification request is too large.'},413); JSON.parse(body||'{}'); } catch { return json(origin,{ok:false,error:'The verification request is invalid.'},400); }
  try {
    const upstream=await fetch(TARGET,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://nexusnovatools.com',Accept:'application/json'},body});
    const text=await upstream.text();
    return new Response(text,{status:upstream.status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':origin,'Vary':'Origin'}});
  } catch { return json(origin,{ok:false,error:'FBR verification service is temporarily unavailable.'},503); }
}};
function json(origin,data,status=200,extra={}) { return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':origin,'Vary':'Origin',...extra}}); }