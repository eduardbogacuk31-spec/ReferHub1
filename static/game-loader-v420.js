
/* Game loader watchdog */
(()=>{
  let seq=0;
  const oldOpen=window.openGameDetail;
  if(typeof oldOpen!=="function")return;

  window.openGameDetail=async function(...args){
    const my=++seq;
    const timer=setTimeout(()=>{
      if(my!==seq)return;
      const c=document.getElementById("content");
      if(c && c.querySelector(":scope > .loader")){
        c.innerHTML=`
          <section class="gc420-load-error">
            <span>⚠️</span>
            <h2>Гра завантажується занадто довго</h2>
            <p>Спробуй відкрити її ще раз.</p>
            <button onclick="openGameDetail('${String(args[0]).replace(/'/g,"")}')">ПОВТОРИТИ</button>
            <button class="secondary" onclick="gamesPage()">← ДО ІГОР</button>
          </section>`;
      }
    },5000);
    try{
      return await oldOpen.apply(this,args);
    }finally{
      clearTimeout(timer);
    }
  };
})();
