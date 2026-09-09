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

const OTA24_ID='nx-global-ota-proof-24';
function showOta24Proof(){
  if(document.getElementById(OTA24_ID))return;
  const badge=document.createElement('div');
  badge.id=OTA24_ID;
  badge.textContent='OTA 24 LIVE';
  badge.setAttribute('aria-label','OTA 24 live proof');
  Object.assign(badge.style,{
    position:'fixed',
    top:'calc(env(safe-area-inset-top, 0px) + 8px)',
    left:'50%',
    transform:'translateX(-50%)',
    zIndex:'2147483647',
    padding:'10px 18px',
    borderRadius:'999px',
    background:'#ffd826',
    color:'#111',
    font:'900 13px/1 system-ui,-apple-system,Segoe UI,sans-serif',
    letterSpacing:'.7px',
    boxShadow:'0 6px 22px rgba(0,0,0,.48)',
    border:'2px solid #fff7b8',
    pointerEvents:'none'
  });
  document.body.appendChild(badge);
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',showOta24Proof,{once:true});
}else{
  showOta24Proof();
}
