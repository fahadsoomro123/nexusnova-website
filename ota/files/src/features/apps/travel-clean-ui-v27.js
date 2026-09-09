const STYLE_ID='nn-travel-clean-ui-v27';
const ROOT_SELECTOR='.nn-travel-v19';

function ensureStyle(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`${ROOT_SELECTOR} .nn-ota-badge{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}`;
  document.head.appendChild(style);
}

function clean(root){
  if(!(root instanceof HTMLElement))return;
  root.dataset.cleanUiV27='true';
  root.querySelectorAll('.nn-ota-badge').forEach(node=>node.remove());
}

function scan(node=document){
  if(node instanceof HTMLElement&&node.matches(ROOT_SELECTOR))clean(node);
  node.querySelectorAll?.(ROOT_SELECTOR).forEach(clean);
}

ensureStyle();
scan();
new MutationObserver(records=>{
  for(const record of records){
    for(const node of record.addedNodes){
      if(node instanceof HTMLElement)scan(node);
    }
  }
}).observe(document.documentElement,{childList:true,subtree:true});

const OTA23_ID='nx-hub-ota-proof-23';
function showOta23HubProof(){
  if(document.getElementById(OTA23_ID))return;
  const badge=document.createElement('div');
  badge.id=OTA23_ID;
  badge.textContent='NOVA HUB · OTA 23 LIVE';
  Object.assign(badge.style,{
    position:'fixed',
    top:'calc(env(safe-area-inset-top, 0px) + 10px)',
    right:'10px',
    zIndex:'2147483647',
    padding:'8px 11px',
    borderRadius:'999px',
    background:'#ffd826',
    color:'#111',
    font:'900 11px/1 system-ui,-apple-system,Segoe UI,sans-serif',
    letterSpacing:'.45px',
    boxShadow:'0 5px 18px rgba(0,0,0,.42)',
    border:'1px solid rgba(255,255,255,.78)',
    pointerEvents:'none'
  });
  document.body.appendChild(badge);
  setTimeout(()=>badge.remove(),60000);
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',showOta23HubProof,{once:true});
}else{
  showOta23HubProof();
}
