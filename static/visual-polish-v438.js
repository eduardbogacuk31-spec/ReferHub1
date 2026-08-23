
/* ReferHub v4.38 — visual polish only */
(()=>{
  function pulseLottery(){
    document.querySelectorAll(".lot436-card").forEach((card,i)=>{
      card.style.setProperty("--lot-delay",`${i*45}ms`);
      card.classList.add("lot438-ready");
    });
  }

  function decorateModernGames(){
    const page=document.querySelector(".mg435-page");
    if(!page)return;

    page.querySelectorAll(".mg435-choices button").forEach(btn=>{
      if(btn.dataset.v438Bound)return;
      btn.dataset.v438Bound="1";

      btn.addEventListener("pointerdown",()=>{
        btn.classList.remove("v438-press");
        void btn.offsetWidth;
        btn.classList.add("v438-press");
      });

      btn.addEventListener("click",()=>{
        page.querySelectorAll(".mg435-choices button").forEach(x=>x.classList.remove("v438-selected"));
        btn.classList.add("v438-selected");

        const stage=page.querySelector(".mg435-stage");
        stage?.classList.remove("v438-stage-pulse");
        void stage?.offsetWidth;
        stage?.classList.add("v438-stage-pulse");
      });
    });
  }

  function resultWatcher(){
    const result=document.getElementById("mg435Result");
    if(!result || result.dataset.v438Observed)return;
    result.dataset.v438Observed="1";

    let last=result.textContent;
    new MutationObserver(()=>{
      const now=result.textContent;
      if(now===last)return;
      last=now;

      result.classList.remove("v438-result-pop","v438-result-win","v438-result-lose");
      void result.offsetWidth;
      result.classList.add("v438-result-pop");

      if(result.classList.contains("win") || /\+\d+\s*RH/i.test(now)){
        result.classList.add("v438-result-win");
      }else if(!/ГОТОВО|ГРАЄМО|ПОМИЛКА/i.test(now)){
        result.classList.add("v438-result-lose");
      }
    }).observe(result,{childList:true,subtree:true,characterData:true});
  }

  function decorateCooldown(){
    const box=document.querySelector(".mg435-cooldown.show");
    if(!box)return;
    box.classList.add("v438-live");
  }

  function globalPolish(){
    document.querySelectorAll(
      ".lot436-card,.lot436-mainbox,.lot436-side,.s426-card,.ref424-card,.rh28-section,.rh32-card,.mg435-stage,.mg435-history"
    ).forEach(el=>el.classList.add("v438-panel"));

    pulseLottery();
    decorateModernGames();
    resultWatcher();
    decorateCooldown();
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(globalPolish));
  observer.observe(document.getElementById("content")||document.body,{childList:true,subtree:true});

  document.addEventListener("DOMContentLoaded",globalPolish);
  setTimeout(globalPolish,300);
})();
