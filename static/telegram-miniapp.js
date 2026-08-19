(() => {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;

  try {
    tg.ready();
    tg.expand();

    if (typeof tg.setHeaderColor === "function") tg.setHeaderColor("#06070a");
    if (typeof tg.setBackgroundColor === "function") tg.setBackgroundColor("#06070a");

    document.documentElement.classList.add("is-telegram-webapp");

    window.REFERHUB_TG_INIT_DATA = tg.initData || "";

    // Telegram changes viewport while opening/expanding.
    const syncViewport = () => {
      const h = tg.viewportStableHeight || tg.viewportHeight || window.innerHeight;
      document.documentElement.style.setProperty("--tg-app-height", `${h}px`);
    };

    syncViewport();
    tg.onEvent?.("viewportChanged", syncViewport);
  } catch (error) {
    console.warn("Telegram bootstrap error", error);
  }
})();
