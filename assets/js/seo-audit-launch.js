/* Data-driven launch voucher and offer display for NexusNova SEO Audit Studio. Offer availability and expiry must come from the backend. */
(() => {
  'use strict';
  const claimButton=document.getElementById('nnAuditClaimVoucher');
  const offerBox=document.getElementById('nnAuditLaunchOffer');
  const cta=document.getElementById('nnAuditLaunchCta');
  const resultBox=document.getElementById('nnAuditVoucherResult');
  const codeNode=document.getElementById('nnAuditVoucherCode');
  const expiryNode=document.getElementById('nnAuditVoucherExpiry');
  const statusNode=document.getElementById('nnAuditVoucherStatus');
  const copyButton=document.getElementById('nnAuditCopyVoucher');
  const homeForm=document.getElementById('nnAuditHomeForm');
  const homeUrl=document.getElementById('nnAuditLaunchUrl');
  const homeError=document.getElementById('nnAuditHomeError');
  if(homeForm&&homeUrl){
    homeForm.addEventListener('submit',event=>{
      event.preventDefault();
      if(homeError){homeError.hidden=true;homeError.textContent='';}
      const raw=homeUrl.value.trim();
      try{
        if(!raw)throw new Error('Enter the website URL you want to check.');
        const candidate=/^https?:/i.test(raw)?raw:'https://'+raw;
        const parsed=new URL(candidate);
        if(!['http:','https:'].includes(parsed.protocol)||!parsed.hostname||parsed.username||parsed.password)throw new Error('Enter a valid website URL starting with https:// or http://.');
        if(!parsed.hostname.includes('.')&&parsed.hostname!=='localhost')throw new Error('Enter a complete website domain, such as example.com.');
        parsed.hash='';
        homeUrl.value=parsed.href;
        const target=new URL('/seo-audit-studio.html',window.location.origin);
        target.searchParams.set('url',parsed.href);
        window.location.href=target.pathname+target.search;
      }catch(error){
        if(homeError){homeError.textContent=error.message||'Enter a valid website URL.';homeError.hidden=false;}
        homeUrl.focus();
      }
    });
  }
  if(!claimButton||!offerBox||!cta||!resultBox||!codeNode||!statusNode)return;

  const REVIEW_ORIGIN='https://review.nexusnova-seo-audit-studio-review.pages.dev';
  const API_BASE_URL=window.location.origin===REVIEW_ORIGIN
    ?'https://nexusnova-audit-studio-review.fahadsoomro123.workers.dev'
    :'https://nexusnova-audit-studio.fahadsoomro123.workers.dev';
  const API_BASE_ORIGIN=new URL(API_BASE_URL).origin;
  const ALLOWED_ORIGINS=new Set(['https://nexusnovatools.com','https://www.nexusnovatools.com',REVIEW_ORIGIN]);
  const SESSION_KEY='nexusnova_audit_session_v1';
  const VOUCHER_KEY='nexusnova_audit_voucher_v1';
  let voucherServiceReady=false;
  let voucherAlreadyClaimed=false;
  try{
    const existing=window.sessionStorage.getItem(VOUCHER_KEY)||'';
    if(/^[A-Z0-9-]{8,40}$/.test(existing)){
      voucherAlreadyClaimed=true;
      codeNode.textContent=existing;resultBox.hidden=false;
      if(expiryNode)expiryNode.textContent='Saved in this browser tab for your audit.';
      claimButton.disabled=true;claimButton.querySelector('span').textContent='Voucher already claimed';
      cta.textContent='Continue to your audit →';cta.href='/seo-audit-studio.html';
    }else{
      claimButton.disabled=true;
      claimButton.querySelector('span').textContent='Checking voucher availability…';
    }
  }catch{
    claimButton.disabled=true;
    claimButton.querySelector('span').textContent='Voucher storage unavailable';
  }
  if(!ALLOWED_ORIGINS.has(window.location.origin))return;

  const status=(message,tone='')=>{
    statusNode.hidden=false;
    statusNode.className='nn-audit-voucher-status'+(tone?' '+tone:'');
    statusNode.textContent=message;
  };
  const offerLabel=(campaign)=>{
    const type=String(campaign.offerType||''),value=Number(campaign.offerValue);
    if(type==='free_report')return 'FREE full technical report';
    if(type==='percent'&&Number.isInteger(value)&&value>0&&value<=100)return value+'% off the full report';
    if(type==='fixed'&&Number.isInteger(value)&&value>0)return '$'+(value/100).toFixed(2)+' off the full report';
    return '';
  };
  const displayDate=(value)=>{
    const date=new Date(value);
    if(!Number.isFinite(date.getTime()))return '';
    return date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
  };
  async function getSessionToken(){
    let token='';
    try{token=window.sessionStorage.getItem(SESSION_KEY)||'';}catch{}
    if(/^[a-f0-9]{64}$/i.test(token))return token;
    const response=await fetch(API_BASE_URL+'/api/session',{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',headers:{Accept:'application/json'}});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok||typeof payload.token!=='string'||!/^[a-f0-9]{64}$/i.test(payload.token))throw new Error(payload.error||'Could not start a secure audit session. Please try again.');
    token=payload.token;
    try{window.sessionStorage.setItem(SESSION_KEY,token);}catch{}
    return token;
  }
  async function apiGet(path){
    const response=await fetch(API_BASE_URL+path,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',headers:{Accept:'application/json'}});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||'The launch offer could not be checked.');
    return payload;
  }
  async function claimVoucher(){
    claimButton.disabled=true;
    claimButton.querySelector('span').textContent='Checking your voucher…';
    try{
      const token=await getSessionToken();
      const response=await fetch(API_BASE_URL+'/api/promotions/claim',{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',headers:{Accept:'application/json',Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}'});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok||payload.ok!==true||typeof payload.code!=='string')throw new Error(payload.error||'Free launch vouchers are temporarily unavailable. You can still run a free audit preview.');
      try{window.sessionStorage.setItem(VOUCHER_KEY,payload.code);}catch{}
      codeNode.textContent=payload.code;
      const ends=displayDate(payload.expiresAt);
      if(expiryNode)expiryNode.textContent=ends?'Valid until '+ends+'. Saved in this browser tab.':'Saved in this browser tab for your audit.';
      resultBox.hidden=false;
      cta.textContent='Start your audit with this voucher →';
      cta.href='/seo-audit-studio.html';
      status('Voucher claimed. Open Audit Studio and run your website audit; the voucher will be applied to that report.','success');
      claimButton.querySelector('span').textContent='Voucher claimed';
    }catch(error){
      const networkError=error&&error.message==='Failed to fetch';
      status(networkError
        ?(window.location.origin===REVIEW_ORIGIN
          ?'The isolated voucher service stopped responding. No code was issued; this preview will not contact the production voucher service.'
          :'The voucher service could not be reached. No code was issued. Please retry shortly.')
        :(error.message||'Could not claim the voucher. No code was issued.'));
      claimButton.querySelector('span').textContent=voucherServiceReady?'Try claiming your voucher again':'Voucher service unavailable';
      claimButton.disabled=!voucherServiceReady;
    }
  }
  claimButton.addEventListener('click',()=>{
    if(!voucherServiceReady){
      status(window.location.origin===REVIEW_ORIGIN
        ?'Voucher claims are not connected to the isolated review service yet. No voucher was issued; this preview will not create a production voucher.'
        :'Voucher availability has not been confirmed. No code was issued.');
      return;
    }
    claimVoucher();
  });
  copyButton?.addEventListener('click',async()=>{
    const code=codeNode.textContent.trim();
    if(!code)return;
    try{
      await navigator.clipboard.writeText(code);
      copyButton.textContent='Copied';
      status('Voucher copied. It is also saved for this browser tab.','success');
    }catch{
      const range=document.createRange();range.selectNodeContents(codeNode);
      const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);
      status('Select the highlighted voucher and copy it.','');
    }
  });
  apiGet('/api/promotions/active').then(payload=>{
    voucherServiceReady=true;
    const campaign=payload&&payload.ok===true?payload.campaign:null;
    if(!campaign||!campaign.id||Number(campaign.remainingClaims)<=0){
      if(!voucherAlreadyClaimed){
        claimButton.disabled=true;
        claimButton.querySelector('span').textContent='No voucher available right now';
        status('There is no active voucher campaign at the moment. You can still open Audit Studio and run the available audit preview.');
      }
      return;
    }
    const label=offerLabel(campaign);
    if(!label){
      if(!voucherAlreadyClaimed){
        claimButton.disabled=true;
        claimButton.querySelector('span').textContent='Voucher offer unavailable';
        status('The audit service did not return a usable voucher offer. No voucher was issued.');
      }
      return;
    }
    const labelNode=document.createElement('span');labelNode.className='nn-audit-launch-offer-label';labelNode.textContent='LIVE LAUNCH OFFER';
    const detail=document.createElement('strong');detail.className='nn-audit-launch-offer-detail';detail.textContent=label;
    const remaining=document.createElement('span');remaining.textContent=Number(campaign.remainingClaims)+' vouchers available';
    offerBox.append(labelNode,detail,remaining);
    const ends=displayDate(campaign.endsAt);
    if(ends){const expiry=document.createElement('span');expiry.textContent='Offer ends '+ends;offerBox.append(expiry);}
    if(campaign.terms&&typeof campaign.terms==='string'){const terms=document.createElement('span');terms.className='nn-audit-launch-terms';terms.textContent=campaign.terms;offerBox.append(terms);}
    offerBox.hidden=false;
    if(!voucherAlreadyClaimed){
      claimButton.disabled=false;
      claimButton.querySelector('span').textContent='Claim your free full-audit voucher';
    }
  }).catch(()=>{
    voucherServiceReady=false;
    if(voucherAlreadyClaimed)return;
    claimButton.disabled=true;
    claimButton.querySelector('span').textContent='Voucher service unavailable';
    status(window.location.origin===REVIEW_ORIGIN
      ?'The isolated voucher service is not responding in this preview. No voucher was issued. The preview backend must be restored before voucher claims can be tested.'
      :'Could not reach the voucher service. No voucher was issued. Please retry when the service is available.');
  });
})();
