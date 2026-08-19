(() => {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;

  function syncTelegramViewport(){
    const h = tg.viewportHeight || window.innerHeight;
    const sh = tg.viewportStableHeight || h;
    document.documentElement.style.setProperty('--tg-viewport-height', `${h}px`);
    document.documentElement.style.setProperty('--tg-viewport-stable-height', `${sh}px`);
  }

  try {
    tg.ready();
    tg.expand();
    document.documentElement.classList.add('telegram-miniapp');
    document.body?.classList.add('telegram-miniapp-body');
    window.REFERHUB_TG_INIT_DATA = tg.initData || '';
    syncTelegramViewport();

    tg.onEvent?.('viewportChanged', syncTelegramViewport);
    tg.onEvent?.('themeChanged', () => {
      const p=tg.themeParams||{};
      if(p.bg_color) document.documentElement.style.setProperty('--tg-theme-bg',p.bg_color);
      if(p.text_color) document.documentElement.style.setProperty('--tg-theme-text',p.text_color);
    });
  } catch (e) {
    console.warn('Telegram Mini App init failed:', e);
  }
})();
