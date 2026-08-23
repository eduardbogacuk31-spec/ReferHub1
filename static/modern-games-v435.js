
/* ReferHub v4.35 — direct repair for the four newer games only */
(()=>{
  const MODERN={
    color_pick:{
      name:"Color Pick",icon:"🎨",endpoint:"/api/games/color-pick",
      description:"Обери колір. Сервер випадково визначає результат.",
      choices:[
        {v:"red",t:"RED",c:"red"},
        {v:"blue",t:"BLUE",c:"blue"},
        {v:"green",t:"GREEN",c:"green"}
      ]
    },
    high_low:{
      name:"High / Low",icon:"↕️",endpoint:"/api/games/high-low",
      description:"Вгадай: число буде 1–5 чи 6–10.",
      choices:[
        {v:"low",t:"LOW · 1–5",c:"low"},
        {v:"high",t:"HIGH · 6–10",c:"high"}
      ]
    },
    lucky_card:{
      name:"Lucky Card",icon:"🃏",endpoint:"/api/games/lucky-card",
      description:"Обери колір масті випадкової карти.",
      choices:[
        {v:"red",t:"♥ ♦ RED",c:"red"},
        {v:"black",t:"♣ ♠ BLACK",c:"black"}
      ]
    },
    triple_pick:{
      name:"Triple Pick",icon:"🔺",endpoint:"/api/games/triple-pick",
      description:"Обери одну з трьох позицій із прихованою нагородою.",
      choices:[
        {v:"left",t:"← ЛІВО",c:"left"},
        {v:"center",t:"◆ ЦЕНТР",c:"center"},
        {v:"right",t:"ПРАВО →",c:"right"}
      ]
    }
  };

  const previousOpen=window.openGameDetail;
  let timer=null;
  let currentId=null;

  function esc435(v){
    if(typeof window.esc==="function")return window.esc(v);
    return String(v??"").replace(/[&<>"']/g,m=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }

  function stopTimer(){
    if(timer){clearInterval(timer);timer=null}
    currentId=null;
  }

  function mainScroller(){
    return document.querySelector("body > main") || document.querySelector("main");
  }

  function scrollTop(){
    const main=mainScroller();
    if(main){
      main.style.setProperty("overflow-y","auto","important");
      main.style.setProperty("overflow-x","hidden","important");
      main.style.setProperty("touch-action","pan-y","important");
      main.scrollTop=0;
    }
  }

  async function getGameStatus(id){
    const games=await api("/api/games");
    return Array.isArray(games)?games.find(g=>g.game_key===id):null;
  }

  function availability(g){
    if(!g)return 0;
    if(g.availability_remaining!==undefined)return Number(g.availability_remaining||0);
    const cooldown=Number(g.cooldown_remaining||0);
    const dailyReached=Boolean(g.daily_limit && Number(g.plays_today||0)>=Number(g.daily_limit));
    const daily=Number(g.daily_reset_remaining||0);
    return Math.max(cooldown,dailyReached?daily:0);
  }

  function formatTime(sec){
    sec=Math.max(0,Math.ceil(Number(sec||0)));
    const h=Math.floor(sec/3600);
    const m=Math.floor((sec%3600)/60);
    const s=sec%60;
    return h
      ?`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
      :`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }

  function disable(disabled){
    document.querySelectorAll(".mg435-choices button").forEach(b=>b.disabled=disabled);
  }

  async function liveCooldown(id){
    stopTimer();

    let g;
    try{g=await getGameStatus(id)}catch(_){g=null}

    const seconds=availability(g);
    const panel=document.getElementById("mg435Cooldown");
    const clock=document.getElementById("mg435Clock");

    if(seconds<=0){
      panel?.classList.remove("show");
      disable(false);
      return;
    }

    disable(true);
    panel?.classList.add("show");

    const end=Date.now()+seconds*1000;
    currentId=id;

    const tick=()=>{
      if(currentId!==id){
        if(timer)clearInterval(timer);
        timer=null;
        return;
      }
      const left=Math.max(0,Math.ceil((end-Date.now())/1000));
      if(clock)clock.textContent=formatTime(left);

      if(left<=0){
        stopTimer();
        panel?.classList.remove("show");
        disable(false);
        toast?.("Можна грати ще раз 🎮","success");
      }
    };

    tick();
    timer=setInterval(tick,250);
  }

  function historyRow(meta,x,now=false){
    const reward=Number(x.reward||0);
    return `<article>
      <span>${meta.icon}</span>
      <div>
        <b>${esc435(x.result_text||"Раунд завершено")}</b>
        <small>${now?"щойно":new Date(Number(x.created_at||0)*1000).toLocaleString("uk-UA")}</small>
      </div>
      <strong class="${reward>0?"win":""}">${reward>0?"+":""}${reward} RH</strong>
    </article>`;
  }

  async function openModern(id){
    const meta=MODERN[id];
    if(!meta)return;

    stopTimer();

    const content=document.getElementById("content");
    if(!content)return;

    content.innerHTML='<div class="loader"></div>';

    let game=null;
    let history=[];

    try{
      const [games,h]=await Promise.all([
        api("/api/games"),
        api("/api/games/history")
      ]);
      game=Array.isArray(games)?games.find(g=>g.game_key===id):null;
      history=Array.isArray(h)?h.filter(x=>x.game_key===id).slice(0,6):[];
    }catch(error){
      console.warn("v4.35 modern game preload:",error);
    }

    const limit=Number(game?.daily_limit||0);
    const plays=Number(game?.plays_today||0);
    const attempts=limit?`${plays} / ${limit}`:`${plays}`;

    content.innerHTML=`<section class="mg435-page" data-game="${id}">
      <button class="mg435-back" onclick="openPage('games')">← <span>ДО ІГОР</span></button>

      <header class="mg435-hero">
        <div class="mg435-icon">${meta.icon}</div>
        <div class="mg435-title">
          <small>REFERHUB · MINI GAME</small>
          <h1>${meta.name}</h1>
          <p>${meta.description}</p>
        </div>
        <div class="mg435-attempts">
          <small>СПРОБИ СЬОГОДНІ</small>
          <b id="mg435Attempts">${attempts}</b>
        </div>
      </header>

      <section id="mg435Cooldown" class="mg435-cooldown">
        <div class="mg435-clock"><b id="mg435Clock">00:00</b></div>
        <div>
          <small>LIVE COOLDOWN</small>
          <h3>Наступний раунд</h3>
          <p>Таймер іде прямо тут. Сторінка не перезавантажується.</p>
        </div>
      </section>

      <section class="mg435-stage">
        <header>
          <div><small>ЗРОБИ ВИБІР</small><h2>${meta.name}</h2></div>
          <b id="mg435Result">ГОТОВО</b>
        </header>

        <div class="mg435-choices">
          ${meta.choices.map(x=>`
            <button class="${x.c}" onclick="mg435Play('${id}','${x.v}',this)">
              <b>${x.t}</b>
              <small>ОБРАТИ</small>
            </button>
          `).join("")}
        </div>
      </section>

      <section class="mg435-history">
        <header><div><small>HISTORY</small><h2>Останні раунди</h2></div></header>
        <div id="mg435History">
          ${history.length?history.map(x=>historyRow(meta,x)).join(""):`<p class="mg435-empty">Поки немає зіграних раундів.</p>`}
        </div>
      </section>
    </section>`;

    requestAnimationFrame(scrollTop);
    await liveCooldown(id);
  }

  window.mg435Play=async function(id,choice,button){
    const meta=MODERN[id];
    if(!meta || button?.disabled)return;

    disable(true);

    const resultBox=document.getElementById("mg435Result");
    if(resultBox){
      resultBox.textContent="ГРАЄМО…";
      resultBox.classList.remove("win");
    }

    try{
      const result=await api(meta.endpoint,{
        method:"POST",
        body:JSON.stringify({choice})
      });

      const reward=Number(result.reward||0);

      if(result.balance!==undefined && window.me){
        window.me.balance=Number(result.balance);
        const bal=document.getElementById("balance");
        if(bal)bal.textContent=window.me.balance;
      }

      if(resultBox){
        resultBox.textContent=result.result_text || (reward>0?`+${reward} RH`:"Без виграшу");
        resultBox.classList.toggle("win",reward>0);
      }

      const history=document.getElementById("mg435History");
      if(history){
        history.querySelector(".mg435-empty")?.remove();
        history.insertAdjacentHTML("afterbegin",historyRow(meta,result,true));
      }

      toast?.(
        reward>0?`+${reward} RH 🎉`:(result.result_text||"Раунд завершено"),
        reward>0?"success":"info"
      );

      try{
        const g=await getGameStatus(id);
        const limit=Number(g?.daily_limit||0);
        const plays=Number(g?.plays_today||0);
        const a=document.getElementById("mg435Attempts");
        if(a)a.textContent=limit?`${plays} / ${limit}`:`${plays}`;
      }catch(_){}

      await liveCooldown(id);

    }catch(error){
      if(resultBox)resultBox.textContent=error?.message||"ПОМИЛКА";
      toast?.(error?.message||"Не вдалося зіграти","error");

      try{
        const g=await getGameStatus(id);
        if(availability(g)>0)await liveCooldown(id);
        else disable(false);
      }catch(_){
        disable(false);
      }
    }
  };

  // Only intercept these four games. Everything else stays exactly on its old engine.
  window.openGameDetail=async function(id,...args){
    if(MODERN[id])return openModern(id);
    if(typeof previousOpen==="function")return previousOpen.call(this,id,...args);
  };
})();
