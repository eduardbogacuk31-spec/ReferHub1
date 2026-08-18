/* ReferHub Beta 9.3 — Readability */
(function(){
  const allowed=new Set(['compact','comfort','large']);
  function current(){
    const value=localStorage.getItem('rh_ui_scale')||'comfort';
    return allowed.has(value)?value:'comfort';
  }
  window.setRead93Scale=function(mode){
    if(!allowed.has(mode))mode='comfort';
    localStorage.setItem('rh_ui_scale',mode);
    document.documentElement.dataset.uiScale=mode;
    document.querySelectorAll('[data-read93-scale]').forEach(button=>{
      button.classList.toggle('active',button.dataset.read93Scale===mode);
      button.setAttribute('aria-pressed',button.dataset.read93Scale===mode?'true':'false');
    });
    if(typeof toast==='function')toast(`Розмір інтерфейсу: ${mode==='large'?'Large':mode==='compact'?'Compact':'Comfort'}`,'info');
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
  };
  function apply(){
    window.setRead93Scale(current());
    document.documentElement.classList.add('read93-ready');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);
  else apply();
})();
