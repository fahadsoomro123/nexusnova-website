(()=>{
  'use strict';
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  if(page!=='index.html'||document.querySelector('.nn-home-app-promo')) return;

  const miningShot='assets/images/nvx-mining-real-420.webp?v=20260902-2';
  const section=document.createElement('section');
  section.className='nn-home-app-promo';
  section.dataset.homeAppPromo='';
  section.setAttribute('aria-label','NexusNova Web Mining feature');
  section.innerHTML=`
    <div class="container">
      <div class="nn-home-mining-showcase">
        <div class="nn-home-mining-copy">
          <span class="nn-home-mining-kicker">NEXUSNOVA FEATURE // WEB MINING</span>
          <h2>NVX mining.<span>Live on the web.</span></h2>
          <p>Open your real 24-hour NVX mining session in the secure NexusNova Web App. Firebase-linked, server-synced and manual.</p>
          <div class="nn-home-mining-trust" aria-label="Mining trust details">
            <span>FIREBASE-LINKED</span><span>SERVER-SYNCED</span><span>MANUAL 24H SESSION</span>
          </div>
          <div class="nn-home-mining-actions">
            <a class="primary" href="account.html">OPEN WEB MINING →</a>
            <a href="account.html#earn-nvx-title">How NVX Mining Works</a>
          </div>
          <p class="nn-home-mining-disclosure">Real NexusNova mining session screenshot. Balance, rate and session values shown belong to that live session and vary by account and session.</p>
        </div>
        <div class="nn-home-mining-visual" aria-label="Real NexusNova NVX mining screen">
          <div class="nn-tactical-device">
            <i class="nn-tactical-bolt b1"></i><i class="nn-tactical-bolt b2"></i><i class="nn-tactical-bolt b3"></i><i class="nn-tactical-bolt b4"></i>
            <div class="nn-tactical-screen">
              <img src="${miningShot}" width="420" height="864" loading="eager" fetchpriority="high" decoding="async" alt="Real NexusNova NVX mining screen showing a live manual 24-hour server-synced mining session">
            </div>
            <span class="nn-tactical-live"><i></i> SERVER SYNCED</span>
          </div>
        </div>
      </div>

      <div class="nn-home-app-shell">
        <div class="nn-home-app-copy">
          <span class="nn-home-app-kicker">NEXUSNOVA APP + WEB MINING</span>
          <h2>57+ smart tools.<span>One connected NexusNova account.</span></h2>
          <p>Use the NexusNova Android app or secure website Web App with the same Firebase-linked identity. NVX mining is available on the website too, with manual 24-hour sessions and real account state.</p>
          <div class="nn-home-app-points">
            <div class="nn-home-app-point"><strong>57+</strong><small>TOOLS & UTILITIES</small></div>
            <div class="nn-home-app-point"><strong>WEB</strong><small>FIREBASE-LINKED MINING</small></div>
            <div class="nn-home-app-point"><strong>24H</strong><small>MANUAL MINING SESSION</small></div>
          </div>
          <div class="nn-home-app-actions"><a href="account.html">Open Web App + NVX Mining →</a><a href="app.html">Explore Android App</a><a href="register.html?mode=register">Create account</a></div>
          <div class="nn-home-app-socials" aria-label="Official NexusNova social profiles">
            <a class="x" href="https://x.com/NexusNovaTools" target="_blank" rel="me noopener noreferrer" aria-label="NexusNova on X"><svg viewBox="0 0 24 24"><path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.39L6.48 22H3.36l7.25-8.29L2.96 2h6.4l4.42 5.84L18.9 2Zm-1.1 18h1.73L8.42 3.9H6.56L17.8 20Z"/></svg></a>
            <a class="fb" href="https://www.facebook.com/NexusNovaTools/" target="_blank" rel="me noopener noreferrer" aria-label="NexusNova on Facebook"><svg viewBox="0 0 24 24"><path d="M13.5 22v-8h2.8l.4-3h-3.2V9.1c0-.9.3-1.6 1.6-1.6h1.8V4.8c-.3 0-1.4-.1-2.6-.1-2.6 0-4.3 1.6-4.3 4.5V11H7v3h3v8h3.5Z"/></svg></a>
            <a class="ig" href="https://www.instagram.com/nexusnovatools/" target="_blank" rel="me noopener noreferrer" aria-label="NexusNova on Instagram"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.7"/><circle cx="17.2" cy="6.9" r="1" class="dot"/></svg></a>
            <a class="tg" href="https://t.me/NexusNovaTools" target="_blank" rel="me noopener noreferrer" aria-label="NexusNova on Telegram"><svg viewBox="0 0 24 24"><path d="M21.7 3.5 3.8 10.4c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 1.8 5.5c.2.7.1.9.8.9.5 0 .8-.2 1.1-.5l2.2-2.1 4.6 3.4c.8.5 1.4.3 1.6-.8L23 5c.3-1.3-.5-1.9-1.3-1.5ZM9.2 13l8.9-5.6c.4-.2.8-.1.5.2l-7.4 6.7-.3 3.3L9.2 13Z"/></svg></a>
            <span>OFFICIAL NEXUSNOVA CHANNELS</span>
          </div>
        </div>

        <div class="nn-home-phone-stage" aria-label="Two NexusNova mobile previews">
          <div class="nn-home-phone tools" aria-label="Nova Hub tools preview">
            <div class="nn-home-phone-screen">
              <div class="nn-home-phone-top"><div><small>NEXUSNOVA OS</small><strong>Nova Hub</strong></div><span class="nn-home-phone-online">● ONLINE</span></div>
              <div class="nn-home-phone-title"><strong>Your tools</strong><span>12 of 57+</span></div>
              <div class="nn-home-phone-grid">
                <div class="nn-home-phone-tool"><img src="ota/files/assets/icons/nova-hub/profile.webp" alt="Profile"><b>Profile</b></div>
                <div class="nn-home-phone-tool"><img src="ota/files/assets/icons/nova-hub/notes.webp" alt="Notes"><b>Notes</b></div>
                <div class="nn-home-phone-tool"><img src="ota/files/assets/icons/nova-hub/todo.webp" alt="To-Do"><b>To-Do</b></div>
                <div class="nn-home-phone-tool"><img src="ota/files/assets/icons/nova-hub/calculator.webp" alt="Calculator"><b>Calc</b></div>
                <div class="nn-home-phone-tool"><img src="ota/files/assets/icons/nova-hub/unit-converter.webp" alt="Converter"><b>Convert</b></div>
                <div class="nn-home-phone-tool"><img src="ota/files/assets/icons/nova-hub/expenses.webp" alt="Expenses"><b>Expenses</b></div>
                <div class="nn-home-phone-tool"><img src="ota/files/assets/icons/nova-hub/pomodoro.webp" alt="Focus"><b>Focus</b></div>
                <div class="nn-home-phone-tool"><img src="ota/files/assets/icons/nova-hub/bmi.webp" alt="BMI"><b>BMI</b></div>
                <div class="nn-home-phone-tool"><img src="ota/files/assets/icons/nova-hub/tip.webp" alt="Tip"><b>Tip</b></div>
                <div class="nn-home-phone-tool"><img src="ota/files/assets/icons/nova-hub/world-clock.webp" alt="World Clock"><b>Clock</b></div>
                <div class="nn-home-phone-tool"><img src="ota/files/assets/icons/nova-hub/qr.webp" alt="QR Tools"><b>QR</b></div>
                <div class="nn-home-phone-tool"><img src="ota/files/assets/icons/nova-hub/weather.webp" alt="Weather"><b>Weather</b></div>
              </div>
              <div class="nn-home-phone-dock"><span class="active">Hub</span><span>AI</span><span>Wallet</span><span>Profile</span></div>
            </div>
          </div>

          <div class="nn-home-phone mining real-mining" aria-label="Real NexusNova NVX mining preview">
            <div class="nn-home-phone-screen nn-real-mining-screen">
              <img src="${miningShot}" width="420" height="864" loading="lazy" decoding="async" alt="Real NexusNova mining session screen in the mobile preview">
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const hero=document.querySelector('.nn-command-hero');
  const quickAccess=document.querySelector('.command-dock-wrap');
  if(hero) hero.insertAdjacentElement('afterend',section);
  else if(quickAccess) quickAccess.insertAdjacentElement('beforebegin',section);
  else document.querySelector('main')?.prepend(section);
})();
