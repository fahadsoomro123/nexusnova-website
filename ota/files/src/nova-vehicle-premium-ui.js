// Approved Nova Drive + Vehicle Tracking owner runtime.
// Keep the installed approved Drive/History baseline intact; Gold v14 is only
// the visible layer and binds to the native smart-drive + owner tracker data.
import './nova-drive-approved-ui-v2.js?ota=drive-responsive-v3';
import './nova-drive-history-v2.js?ota=drive-history-v2';
import './nova-drive-history-v2-hotfix.js?ota=drive-history-v2-hotfix-4';

import './nova-drive-gold-maptiler-v14-ui.js?ota=drive-gold-maptiler-v14';
import './nova-drive-gold-maptiler-v14-production.js?ota=drive-gold-maptiler-v14';

const OTA_PROOF_ID='nx-ota-proof-21';
function showOtaProof21(){
  if(document.getElementById(OTA_PROOF_ID))return;
  const badge=document.createElement('div');
  badge.id=OTA_PROOF_ID;
  badge.textContent='OTA 21 LIVE';
  Object.assign(badge.style,{
    position:'fixed',
    top:'calc(env(safe-area-inset-top, 0px) + 8px)',
    right:'8px',
    zIndex:'2147483646',
    padding:'7px 10px',
    borderRadius:'999px',
    background:'#ffd826',
    color:'#111',
    font:'900 11px/1 system-ui,-apple-system,Segoe UI,sans-serif',
    letterSpacing:'.6px',
    boxShadow:'0 4px 18px rgba(0,0,0,.35)',
    border:'1px solid rgba(255,255,255,.75)',
    pointerEvents:'none'
  });
  document.body.appendChild(badge);
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',showOtaProof21,{once:true});
}else{
  showOtaProof21();
}
