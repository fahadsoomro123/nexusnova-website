(()=>{
  'use strict';
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  if(page!=='app.html') return;

  const visual=document.querySelector('.app-visual');
  if(!visual||visual.querySelector('.app-device-mining')) return;

  const miningShot='assets/images/nvx-mining-real-420.webp?v=20260902-3';
  visual.classList.add('app-visual-duo');
  visual.setAttribute('aria-label','Two premium NexusNova mobile previews: Nova Hub and NVX Mining');

  const toolsPhone=visual.querySelector('.app-device');
  if(toolsPhone) toolsPhone.classList.add('app-device-tools');

  const miningPhone=document.createElement('div');
  miningPhone.className='app-device app-device-mining app-device-mining-real';
  miningPhone.setAttribute('aria-label','NexusNova NVX Mining session preview');
  miningPhone.innerHTML=`
    <div class="app-device-glow"></div>
    <div class="app-screen app-mining-screen app-mining-real-screen">
      <img src="${miningShot}" width="420" height="864" loading="eager" fetchpriority="high" decoding="async" alt="NexusNova NVX mining screen showing a manual 24-hour session">
    </div>`;

  visual.appendChild(miningPhone);
})();
