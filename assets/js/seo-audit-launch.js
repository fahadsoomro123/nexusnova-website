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
  const claimPanel=document.getElementById('nnAuditClaimPanel');
  const claimForm=document.getElementById('nnAuditClaimForm');
  const claimRequirementsNode=document.getElementById('nnAuditClaimRequirements');
  const proofUrlInput=document.getElementById('nnAuditProofUrl');
  const proofNoteInput=document.getElementById('nnAuditProofNote');
  const termsAcceptedInput=document.getElementById('nnAuditTermsAccepted');
  const submitClaimButton=document.getElementById('nnAuditSubmitClaim');
  const checkClaimButton=document.getElementById('nnAuditCheckClaim');
  const claimReviewStatus=document.getElementById('nnAuditClaimReviewStatus');
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
  const CLAIM_KEY='nexusnova_voucher_claim_request_v1';
  let voucherServiceReady=false;
  let voucherAlreadyClaimed=false;
  let activeCampaign=null;
  let pendingClaimId='';
  try{const savedClaim=window.sessionStorage.getItem(CLAIM_KEY)||'';if(/^[0-9a-f-]{36}$/i.test(savedClaim))pendingClaimId=savedClaim;}catch{}
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
  const showOfferUnavailable=(heading,detail)=>{
    offerBox.replaceChildren();
    const label=document.createElement('span');
    label.className='nn-audit-launch-offer-label';
    label.textContent='NEXUSNOVA | LAUNCH PRIVILEGE';
    const title=document.createElement('strong');
    title.className='nn-audit-launch-offer-detail';
    title.textContent=heading;
    const explanation=document.createElement('span');
    explanation.className='nn-audit-launch-offer-availability';
    explanation.textContent=detail;
    offerBox.append(label,title,explanation);
    offerBox.hidden=false;
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
  const claimStatus=(message,tone='')=>{
    if(!claimReviewStatus)return;
    claimReviewStatus.hidden=false;
    claimReviewStatus.textContent=message;
    if(tone)claimReviewStatus.dataset.tone=tone;else delete claimReviewStatus.dataset.tone;
  };
  function renderClaimRequirements(items){
    if(!claimRequirementsNode)return;
    claimRequirementsNode.replaceChildren();
    (Array.isArray(items)?items:[]).forEach(item=>{
      if(!item||typeof item.id!=='string'||typeof item.label!=='string')return;
      const li=document.createElement('li'),label=document.createElement('label'),check=document.createElement('input'),span=document.createElement('span');
      check.type='checkbox';check.name='completedRequirements';check.value=item.id;check.required=true;
      span.textContent=item.label;
      label.className='nn-audit-claim-step';label.append(check,span);li.append(label);claimRequirementsNode.append(li);
    });
  }
  function clearPendingClaim(){
    pendingClaimId='';
    try{window.sessionStorage.removeItem(CLAIM_KEY);}catch{}
  }
  function showVoucherCode(payload){
    if(typeof payload.code!=='string'||!/^NN-[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{8}$/.test(payload.code))throw new Error('The approved voucher response was invalid.');
    voucherAlreadyClaimed=true;
    try{window.sessionStorage.setItem(VOUCHER_KEY,payload.code);}catch{}
    codeNode.textContent=payload.code;
    const ends=displayDate(payload.expiresAt);
    if(expiryNode)expiryNode.textContent=ends?'Owner-approved. Valid until '+ends+'. Saved in this browser tab.':'Owner-approved. Saved in this browser tab for your audit.';
    resultBox.hidden=false;
    cta.textContent='Start your audit with this voucher →';
    cta.href='/seo-audit-studio.html';
    claimButton.disabled=true;
    claimButton.querySelector('span').textContent='Voucher approved';
    if(claimForm)claimForm.hidden=true;
    if(checkClaimButton)checkClaimButton.hidden=true;
    claimStatus('Your post was verified by the owner. Your voucher is now unlocked. Apply it in Audit Studio for this browser session.','success');
    status('Voucher unlocked after owner verification.','success');
    clearPendingClaim();
  }
  async function checkClaimStatus(){
    if(!pendingClaimId)return;
    if(checkClaimButton)checkClaimButton.disabled=true;
    try{
      const token=await getSessionToken();
      const response=await fetch(API_BASE_URL+'/api/promotions/claim-status?claimId='+encodeURIComponent(pendingClaimId),{
        method:'GET',mode:'cors',credentials:'omit',cache:'no-store',
        headers:{Accept:'application/json',Authorization:'Bearer '+token}
      });
      const payload=await response.json().catch(()=>({}));
      if(!response.ok||payload.ok!==true)throw new Error(payload.error||'Could not check verification status.');
      if(payload.status==='approved'&&typeof payload.code==='string'){
        showVoucherCode(payload);
      }else if(payload.status==='approved'){
        claimStatus(payload.message||'The request was approved, but no active voucher is available. Contact the site owner.','error');
      }else if(payload.status==='rejected'){
        claimStatus(payload.reviewNote||'The submitted proof was not approved. Review the required steps and submit new proof.','error');
        clearPendingClaim();
        if(claimForm)claimForm.hidden=false;
        if(submitClaimButton)submitClaimButton.disabled=false;
        if(checkClaimButton)checkClaimButton.hidden=true;
        claimButton.disabled=false;
        claimButton.querySelector('span').textContent='Review and resubmit proof';
      }else if(payload.status==='expired'){
        claimStatus('This verification request expired before approval. No voucher was issued. Submit proof again if the campaign is still active.','error');
        clearPendingClaim();
        if(claimForm)claimForm.hidden=false;
        if(checkClaimButton)checkClaimButton.hidden=true;
        if(submitClaimButton)submitClaimButton.disabled=false;
        claimButton.disabled=false;
        claimButton.querySelector('span').textContent='Submit proof for verification';
      }else if(payload.status==='pending'){
        claimStatus(payload.message||'Your request is waiting for owner verification. No voucher code has been issued yet.');
        if(checkClaimButton)checkClaimButton.hidden=false;
      }else{
        claimStatus('The verification service returned an unknown request status. No voucher code was issued.','error');
      }
    }catch(error){
      claimStatus(error.message||'Verification status is temporarily unavailable. No voucher was issued.','error');
    }finally{
      if(checkClaimButton)checkClaimButton.disabled=false;
    }
  }
  async function submitClaimRequest(event){
    event.preventDefault();
    if(!voucherServiceReady||!activeCampaign||activeCampaign.claimEnabled!==true){
      claimStatus('The owner has not configured voucher verification for this campaign. No code was issued.','error');return;
    }
    const requirements=[...claimRequirementsNode.querySelectorAll('input[name="completedRequirements"]')];
    const completedRequirements=requirements.filter(item=>item.checked).map(item=>item.value);
    if(requirements.length===0||completedRequirements.length!==requirements.length){
      claimStatus('Complete every required step before you submit your public post proof.','error');return;
    }
    const proofUrl=proofUrlInput.value.trim();
    let parsed;
    try{parsed=new URL(proofUrl);}catch{claimStatus('Enter the public post/proof URL.','error');proofUrlInput.focus();return;}
    if(parsed.protocol!=='https:'||parsed.username||parsed.password||!parsed.hostname.includes('.')){
      claimStatus('Use a public HTTPS post/proof URL without credentials.','error');proofUrlInput.focus();return;
    }
    if(!termsAcceptedInput.checked){claimStatus('Confirm that you completed the steps and agree to these voucher terms.','error');return;}
    submitClaimButton.disabled=true;
    claimButton.disabled=true;
    try{
      const token=await getSessionToken();
      const response=await fetch(API_BASE_URL+'/api/promotions/claim',{
        method:'POST',mode:'cors',credentials:'omit',cache:'no-store',
        headers:{Accept:'application/json',Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({
          campaignId:activeCampaign.id,
          completedRequirements,
          proofUrl:parsed.href,
          proofNote:proofNoteInput.value.trim(),
          termsAccepted:termsAcceptedInput.checked
        })
      });
      const payload=await response.json().catch(()=>({}));
      if(!response.ok||payload.ok!==true)throw new Error(payload.error||'Could not submit voucher verification. No code was issued.');
      if(typeof payload.code==='string'){
        showVoucherCode(payload);
        return;
      }
      if(payload.status!=='pending'||typeof payload.claimId!=='string')throw new Error('The verification service returned an invalid request state. No code was issued.');
      pendingClaimId=payload.claimId;
      try{window.sessionStorage.setItem(CLAIM_KEY,pendingClaimId);}catch{}
      claimForm.hidden=true;
      checkClaimButton.hidden=false;
      claimButton.querySelector('span').textContent='Verification pending';
      claimButton.disabled=true;
      claimStatus('Proof submitted. Your voucher stays locked until the owner opens your public post, checks every required step, and approves this request.','success');
      status('Proof submitted for owner verification. No voucher code has been issued yet.');
    }catch(error){
      claimStatus(error.message||'Could not submit proof. No voucher code was issued.','error');
      submitClaimButton.disabled=false;
      claimButton.disabled=false;
      claimButton.querySelector('span').textContent='Try submitting proof again';
    }
  }
  if(claimForm)claimForm.addEventListener('submit',submitClaimRequest);
  if(checkClaimButton)checkClaimButton.addEventListener('click',checkClaimStatus);
  claimButton.addEventListener('click',()=>{
    if(!voucherServiceReady||!activeCampaign){
      status(window.location.origin===REVIEW_ORIGIN
        ?'The isolated voucher service is unavailable. No voucher was issued.'
        :'Voucher availability has not been confirmed. No code was issued.');
      return;
    }
    if(activeCampaign.claimEnabled!==true){
      status(activeCampaign.disabledReason||'Voucher verification steps and public-post review have not been configured. No code can be issued.','error');
      claimButton.disabled=true;
      return;
    }
    if(claimPanel)claimPanel.hidden=false;
    if(claimForm)claimForm.hidden=Boolean(pendingClaimId);
    if(pendingClaimId){
      if(checkClaimButton)checkClaimButton.hidden=false;
      void checkClaimStatus();
    }else{
      claimPanel.scrollIntoView({behavior:'smooth',block:'nearest'});
      if(proofUrlInput)proofUrlInput.focus({preventScroll:true});
    }
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
        showOfferUnavailable('No active launch campaign is confirmed.','No voucher was issued. Offers will appear here when the audit service confirms an active campaign.');
        claimButton.disabled=true;
        claimButton.querySelector('span').textContent='No voucher available right now';
        status('There is no active voucher campaign at the moment. You can still open Audit Studio and run the available audit preview.');
      }
      return;
    }
    activeCampaign=campaign;
    const requirements=Array.isArray(campaign.claimRequirements)?campaign.claimRequirements:[];
    renderClaimRequirements(requirements);
    const label=offerLabel(campaign);
    if(!label){
      if(!voucherAlreadyClaimed){
        showOfferUnavailable('Launch offer details are unavailable.','The backend did not return a valid offer. No voucher was issued.');
        claimButton.disabled=true;
        claimButton.querySelector('span').textContent='Voucher offer unavailable';
        status('The audit service did not return a usable voucher offer. No voucher was issued.');
      }
      return;
    }
    const labelNode=document.createElement('span');labelNode.className='nn-audit-launch-offer-label';labelNode.textContent='NEXUSNOVA | LAUNCH PRIVILEGE';
    const detail=document.createElement('strong');detail.className='nn-audit-launch-offer-detail';detail.textContent=label;
    const remaining=document.createElement('span');remaining.className='nn-audit-launch-offer-availability';remaining.textContent=Number(campaign.remainingClaims)+' vouchers available';
    offerBox.append(labelNode,detail,remaining);
    const ends=displayDate(campaign.endsAt);
    if(ends){const expiry=document.createElement('span');expiry.className='nn-audit-launch-offer-expiry';expiry.textContent='Offer ends '+ends;offerBox.append(expiry);}
    if(campaign.terms&&typeof campaign.terms==='string'){const terms=document.createElement('span');terms.className='nn-audit-launch-terms';terms.textContent=campaign.terms;offerBox.append(terms);}
    offerBox.hidden=false;
    if(!voucherAlreadyClaimed){
      claimButton.disabled=campaign.claimEnabled!==true;
      claimButton.querySelector('span').textContent=campaign.claimEnabled===true?'Complete steps & submit proof':'Voucher verification not configured';
      if(campaign.claimEnabled!==true){
        if(claimPanel)claimPanel.hidden=false;
        if(claimForm)claimForm.hidden=true;
        claimStatus(campaign.disabledReason||'The owner has not configured the required steps and post verification. No code can be issued yet.','error');
        status('Voucher claims are paused until the owner configures the requirements and proof-review rules. No voucher was issued.','error');
      }else if(pendingClaimId){
        if(claimPanel)claimPanel.hidden=false;
        if(claimForm)claimForm.hidden=true;
        if(checkClaimButton)checkClaimButton.hidden=false;
        claimButton.disabled=true;
        claimButton.querySelector('span').textContent='Verification pending';
        void checkClaimStatus();
      }
    }
  }).catch(()=>{
    voucherServiceReady=false;
    if(voucherAlreadyClaimed)return;
    showOfferUnavailable('Launch offers are temporarily unavailable.','The isolated voucher service is not responding in this preview. No voucher was issued.');
    claimButton.disabled=true;
    claimButton.querySelector('span').textContent='Voucher service unavailable';
    status(window.location.origin===REVIEW_ORIGIN
      ?'The isolated voucher service is not responding in this preview. No voucher was issued. The preview backend must be restored before voucher claims can be tested.'
      :'Could not reach the voucher service. No voucher was issued. Please retry when the service is available.');
  });
})();
