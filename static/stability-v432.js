
/* ReferHub v4.32 — single navigation authority + direct modern games */
(()=>{
  const MODERN={
    color_pick:{
      icon:"🎨",name:"Color Pick",label:"ШВИДКА ГРА",
      desc:"Обери один із трьох кольорів. Сервер випадково визначить результат.",
      choices:[["red","RED","red"],["blue","BLUE","blue"],["green","GREEN","green"]],
      endpoint:"/api/games/color-pick"
    },
    high_low:{
      icon:"↕️",name:"High / Low",label:"ШВИДКА ГРА",
      desc:"Вгадай, у якій половині діапазону буде число від 1 до 10.",
      choices:[["low","LOW · 1–5","low"],["high","HIGH · 6–10","high"]],
      endpoint:"/api/games/high-low"
    },
    lucky_card:{
      icon:"🃏",name:"Lucky Card",label:"КАРТИ",
      desc:"Обери колір масті випадкової карти.",
      choices:[["red","♥ ♦ RED","red"],["black","♣ ♠ BLACK","black"]],
      endpoint:"/api/games/lucky-card"
    },
    triple_pick:{
      icon:"🔺",name:"Triple Pick",label:"РИЗИК",
      desc:"Нагорода ховається в одній із трьох позицій.",
      choices:[["left","← ЛІВО","left"],["center","◆ ЦЕНТР","center"],["right","ПРАВО →","right"]],
      endpoint:"/api/games/triple-pick"
    }
  };

  const LEGACY=new Set([
    "roulette","daily_case","slot","coin_flip","number_guess","scratch",
    "safe_crack","dice_duel","rps","treasure_grid","reaction"
  ]);

  const legacyOpen=window.__gp423LegacyOpenGameDetail || window.__rh427LegacyGameOpen;
  const catalogPage=window.__rh427ModernGamesPage || window.gamesPage;
  let modernTimer=null;
  let modernCurrent=null;

  function esc432(v){
    if(typeof window.esc==="function")return window.esc(v);
    return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  }

  function markNav(page){
    document.querySelectorAll(".premium-bottom-nav button[data-page]").forEach(btn=>{
      const active=btn.dataset.page===page;
      btn.classList.toggle("active",active);
      btn.setAttribute("aria-current",active?"page":"false");
    });
  }

  function top(){
    const main=document.querySelector("body > main")||document.querySelector("main");
    if(main)main.scrollTop=0;
  }

  function clearModernTimer(){
    if(modernTimer){clearInterval(modernTimer);modernTimer=null}
    modernCurrent=null;
  }

  async function route(page){
    clearModernTimer();

    const routes={
      home:()=>window.homePage?.(),
      referrals:()=>window.referralHub424?.(),
      season:()=>window.seasonHub426?.(),
      lotteries:()=>window.rh29Open?.(),
      games:()=>catalogPage?.(),
      tasks:()=>window.tasksPage?.(),
      profile:()=>window.rp372Open?.() || window.profilePage?.()
    };

    const fn=routes[page];
    if(!fn)throw new Error("Сторінку не знайдено");

    markNav(page);
    document.body.dataset.rh432Page=page;

    try{
      const r=await fn();
      markNav(page);
      requestAnimationFrame(top);
      return r;
    }catch(error){
      console.error("v4.32 route",page,error);
      const c=document.getElementById("content");
      if(c)c.innerHTML=`<section class="rh432-page-error"><span>⚠️</span><h2>Не вдалося відкрити сторінку</h2><p>${esc432(error?.message||error)}</p><button onclick="openPage('${page}')">ПОВТОРИТИ</button></section>`;
      markNav(page);
    }
  }

  // This is the final, authoritative navigator loaded after all old wrappers.
  window.openPage=route;

  // Keep Settings separate, but remove active state from normal pages while modal is open only if desired.
  document.querySelectorAll(".premium-bottom-nav button[data-page]").forEach(btn=>{
    btn.addEventListener("pointerdown",()=>{
      markNav(btn.dataset.page);
    },{passive:true});
  });

  async function statusFor(id){
    try{
      const games=await api("/api/games");
      return Array.isArray(games)?games.find(g=>g.game_key===id):null;
    }catch(_){return null}
  }

  function fmt(sec){
    sec=Math.max(0,Math.ceil(Number(sec||0)));
    const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
    return h?`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`:`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }

  function setModernDisabled(disabled){
    document.querySelectorAll(".rh432-modern-choices button").forEach(b=>b.disabled=disabled);
  }

  async function startModernCooldown(id){
    if(modernTimer)clearInterval(modernTimer);
    const g=await statusFor(id);
    const remaining=Number(g?.availability_remaining ?? g?.cooldown_remaining ?? 0);
    const daily=Boolean(g?.daily_limit_reached);

    const box=document.getElementById("rh432Wait");
    const clock=document.getElementById("rh432Clock");

    if(remaining<=0){
      box?.classList.remove("show");
      setModernDisabled(false);
      return;
    }

    setModernDisabled(true);
    box?.classList.add("show");
    const title=document.getElementById("rh432WaitTitle");
    if(title)title.textContent=daily?"До відновлення денного ліміту":"Наступний раунд";
    const end=Date.now()+remaining*1000;
    modernCurrent=id;

    const tick=()=>{
      if(modernCurrent!==id){clearInterval(modernTimer);modernTimer=null;return}
      const left=Math.max(0,Math.ceil((end-Date.now())/1000));
      if(clock)clock.textContent=fmt(left);
      if(left<=0){
        clearInterval(modernTimer);modernTimer=null;
        box?.classList.remove("show");
        setModernDisabled(false);
        toast?.("Можна грати ще раз 🎮","success");
      }
    };
    tick();
    modernTimer=setInterval(tick,250);
  }

  async function modernOpen(id){
    const meta=MODERN[id];
    if(!meta)return;
    clearModernTimer();
    const c=document.getElementById("content");
    if(!c)return;

    let game=null,history=[];
    try{
      const [games,h]=await Promise.all([api("/api/games"),api("/api/games/history")]);
      game=Array.isArray(games)?games.find(x=>x.game_key===id):null;
      history=Array.isArray(h)?h.filter(x=>x.game_key===id).slice(0,5):[];
    }catch(error){
      console.warn("modern game status",error);
    }

    c.innerHTML=`<main class="rh432-modern" data-modern-game="${id}">
      <button class="rh432-back" onclick="openPage('games')">← <span>GAME CENTER</span></button>

      <section class="rh432-modern-hero">
        <div class="rh432-modern-icon">${meta.icon}</div>
        <div><small>${meta.label} · REFERHUB</small><h1>${meta.name}</h1><p>${meta.desc}</p></div>
        <article><span>СПРОБ СЬОГОДНІ</span><b>${Number(game?.plays_today||0)} / ${Number(game?.daily_limit||"∞")}</b></article>
      </section>

      <section id="rh432Wait" class="rh432-wait">
        <div class="rh432-clock"><b id="rh432Clock">00:00</b></div>
        <div><small>LIVE TIMER</small><h3 id="rh432WaitTitle">Наступний раунд</h3><p>Екран гри не перезавантажується.</p></div>
      </section>

      <section class="rh432-modern-stage">
        <header><span>ЗРОБИ ВИБІР</span><b id="rh432Result">Готово до гри</b></header>
        <div class="rh432-modern-choices">
          ${meta.choices.map(([value,label,cls])=>`<button class="${cls}" onclick="rh432ModernPlay('${id}','${value}',this)"><i>${label}</i><small>ОБРАТИ</small></button>`).join("")}
        </div>
      </section>

      <section class="rh432-history">
        <header><span>ОСТАННІ РАУНДИ</span><b>${history.length}</b></header>
        <div id="rh432History">
          ${history.length?history.map(x=>`<article><span>${meta.icon}</span><div><b>${esc432(x.result_text||"Раунд")}</b><small>${new Date(Number(x.created_at||0)*1000).toLocaleString("uk-UA")}</small></div><strong class="${Number(x.reward||0)>0?"win":""}">${Number(x.reward||0)>0?"+":""}${Number(x.reward||0)} RH</strong></article>`).join(""):`<p>Історія цієї гри поки порожня.</p>`}
        </div>
      </section>
    </main>`;

    requestAnimationFrame(top);
    await startModernCooldown(id);
  }

  window.rh432ModernPlay=async function(id,choice,button){
    const meta=MODERN[id];
    if(!meta||button?.disabled)return;

    setModernDisabled(true);
    const resultEl=document.getElementById("rh432Result");
    if(resultEl)resultEl.textContent="Визначаємо результат…";

    try{
      const result=await api(meta.endpoint,{
        method:"POST",
        body:JSON.stringify({choice})
      });

      if(result.balance!==undefined && window.me)window.me.balance=Number(result.balance);
      const reward=Number(result.reward||0);

      if(resultEl){
        resultEl.textContent=result.result_text || (reward>0?`+${reward} RH`:"Без виграшу");
        resultEl.classList.toggle("win",reward>0);
      }

      const list=document.getElementById("rh432History");
      if(list){
        const empty=list.querySelector(":scope > p");empty?.remove();
        const row=document.createElement("article");
        row.innerHTML=`<span>${meta.icon}</span><div><b>${esc432(result.result_text||"Раунд")}</b><small>щойно</small></div><strong class="${reward>0?"win":""}">${reward>0?"+":""}${reward} RH</strong>`;
        list.prepend(row);
      }

      toast?.(reward>0?`+${reward} RH 🎉`:(result.result_text||"Раунд завершено"),reward>0?"success":"info");
      await startModernCooldown(id);
    }catch(error){
      if(resultEl)resultEl.textContent=error?.message||"Помилка гри";
      toast?.(error?.message||"Помилка гри","error");
      // Fetch real status: if server says cooldown, keep disabled; otherwise unlock.
      try{
        await startModernCooldown(id);
        const g=await statusFor(id);
        const left=Number(g?.availability_remaining ?? g?.cooldown_remaining ?? 0);
        if(left<=0)setModernDisabled(false);
      }catch(_){setModernDisabled(false)}
    }
  };

  window.openGameDetail=async function(id){
    clearModernTimer();
    if(MODERN[id])return modernOpen(id);
    if(LEGACY.has(id)&&typeof legacyOpen==="function")return legacyOpen(id);
    throw new Error("Гру не знайдено");
  };

  // Reassert after late mutation-based wrappers have finished installing.
  setTimeout(()=>{window.openPage=route;},900);
  setTimeout(()=>{window.openPage=route;},1800);
})();
