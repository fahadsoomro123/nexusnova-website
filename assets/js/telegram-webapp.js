// NexusNova Telegram Mini App Integration
(function(){
  if (!window.Telegram || !Telegram.WebApp) return;

  const tg = Telegram.WebApp;
  tg.ready();
  tg.expand();

  const user = tg.initDataUnsafe && tg.initDataUnsafe.user;

  if (user) {
    localStorage.setItem('telegramUser', JSON.stringify(user));
    console.log('NexusNova Telegram User:', user);
  }

  window.NexusNovaTelegram = {
    app: tg,
    user: user || null
  };
})();
