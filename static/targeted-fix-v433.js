
/* ReferHub v4.33 — targeted fix only.
   Keeps the original lottery-v29 UI exactly as shipped in v4.31. */
(()=>{
  const baseOpen=window.openPage;
  if(typeof baseOpen==="function"){
    window.openPage=async function(page,...args){
      document.querySelectorAll(".premium-bottom-nav button[data-page]").forEach(b=>{
        b.classList.toggle("active",b.dataset.page===page);
      });
      // Clear lottery detail state when leaving, without replacing lottery renderer.
      if(page!=="lotteries")window.rh29Current=null;
      return baseOpen.call(this,page,...args);
    };
  }

  // Fix scrolling on Games without replacing its renderer or game screens.
  function repairGameScroll(){
    const gamesActive=document.querySelector('.premium-bottom-nav button[data-page="games"].active');
    if(!gamesActive)return;
    const main=document.querySelector("body > main");
    const content=document.getElementById("content");
    if(main){
      main.style.setProperty("overflow-y","auto","important");
      main.style.setProperty("overflow-x","hidden","important");
      main.style.setProperty("-webkit-overflow-scrolling","touch","important");
      main.style.setProperty("touch-action","pan-y","important");
    }
    if(content){
      content.style.setProperty("height","auto","important");
      content.style.setProperty("min-height","100%","important");
      content.style.setProperty("overflow","visible","important");
      content.style.setProperty("touch-action","pan-y","important");
    }
    document.querySelectorAll(
      ".gc14-shell,.gc14-detail,.gc416-shell,.gc416-detail,.gc417-shell,.gc418-shell,.gc423-shell,.gc423-detail"
    ).forEach(el=>{
      el.style.setProperty("height","auto","important");
      el.style.setProperty("max-height","none","important");
      el.style.setProperty("overflow","visible","important");
      el.style.setProperty("touch-action","pan-y","important");
    });
  }

  new MutationObserver(()=>requestAnimationFrame(repairGameScroll))
    .observe(document.getElementById("content")||document.body,{childList:true,subtree:true});

  document.addEventListener("DOMContentLoaded",repairGameScroll);
  document.addEventListener("click",e=>{
    if(e.target.closest('[data-page="games"],[onclick*="openGameDetail"]')){
      setTimeout(repairGameScroll,30);
      setTimeout(repairGameScroll,180);
    }
  },false);
})();
