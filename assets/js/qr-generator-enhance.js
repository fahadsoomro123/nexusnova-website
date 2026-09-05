(()=>{
  'use strict';
  const root=document.querySelector('[data-tool-ui]');
  if(!root)return;
  const ensureButton=()=>{
    const box=root.querySelector('[data-qr]');
    if(!box||root.querySelector('#qr-download'))return;
    const source=box.querySelector('canvas,img');
    if(!source)return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.id='qr-download';
    btn.className='trend-action';
    btn.textContent='DOWNLOAD QR PNG';
    btn.addEventListener('click',()=>{
      const current=box.querySelector('canvas,img');
      if(!current)return;
      const a=document.createElement('a');
      a.download='nexusnova-qr.png';
      a.href=current.tagName==='CANVAS'?current.toDataURL('image/png'):current.src;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
    const actions=root.querySelector('.trend-actions')||box.parentElement;
    actions.appendChild(btn);
  };
  const observer=new MutationObserver(ensureButton);
  observer.observe(root,{subtree:true,childList:true});
  ensureButton();
})();
