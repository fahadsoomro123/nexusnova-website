(()=>{
  'use strict';
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  if(page!=='app.html') return;

  const visual=document.querySelector('.app-visual');
  if(!visual||visual.querySelector('.app-device-mining')) return;

  visual.classList.add('app-visual-duo');
  visual.setAttribute('aria-label','Two premium NexusNova mobile previews: Nova Hub and NVX Mining');

  const toolsPhone=visual.querySelector('.app-device');
  if(toolsPhone) toolsPhone.classList.add('app-device-tools');

  const miningPhone=document.createElement('div');
  miningPhone.className='app-device app-device-mining';
  miningPhone.setAttribute('aria-label','NVX Mining mobile preview');
  miningPhone.innerHTML=`
    <div class="app-device-glow"></div>
    <div class="app-screen app-mining-screen">
      <div class="app-screen-top">
        <div class="app-screen-brand"><small>NEXUSNOVA OS</small><strong>NVX Mining</strong></div>
        <span class="app-online">● SECURE</span>
      </div>
      <div class="app-mining-hero">
        <div class="app-mining-icon-wrap"><img data-app-mining-icon src="ota/files/assets/icons/nova-hub/growth.webp" alt="NexusNova NVX mining icon"></div>
        <small>NVX MINING SESSION</small>
        <strong>Ready when you are.</strong>
      </div>
      <div class="app-mining-state">
        <div><small>SESSION</small><b>Not started</b></div>
        <div><small>DURATION</small><b>24H manual</b></div>
      </div>
      <div class="app-mining-start">START MINING • MANUAL</div>
      <p class="app-mining-note">Preview only. No fake balance, rate or countdown. Real mining state appears only when available from the app/backend.</p>
      <div class="app-phone-dock"><span>Hub</span><span>Earn</span><span class="active">Mining</span><span>Profile</span></div>
    </div>`;

  visual.appendChild(miningPhone);

  const miningIcon=miningPhone.querySelector('[data-app-mining-icon]');
  if(miningIcon){
    const candidates=[
      'ota/files/assets/icons/nova-hub/mining.webp',
      'ota/files/assets/icons/nova-hub/nvx-mining.webp',
      'ota/files/assets/icons/nova-hub/mining-boost.webp',
      'ota/files/assets/icons/nova-hub/growth.webp'
    ];
    let index=0;
    const tryNext=()=>{
      if(index>=candidates.length) return;
      const src=candidates[index++];
      const probe=new Image();
      probe.onload=()=>{miningIcon.src=src};
      probe.onerror=tryNext;
      probe.src=src;
    };
    tryNext();
  }
})();
