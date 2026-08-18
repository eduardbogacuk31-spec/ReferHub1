(() => {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    document.documentElement.classList.add('telegram-miniapp');
    window.REFERHUB_TG_INIT_DATA = tg.initData || '';
  } catch (e) {
    console.warn('Telegram Mini App init failed:', e);
  }
})();
