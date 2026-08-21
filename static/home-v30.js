
/* ReferHub v3.0 — Home 2.0 */
(()=>{
 const esc30=v=>typeof esc==="function"?esc(v):String(v??"");
 const meta=id=>typeof gpMeta==="function"?gpMeta(id):({id,name:id,icon:"🎮",desc:"Гра дня"});
 function timeLeft(sec){
   sec=Math.max(0,Number(sec||0));
   const d=Math.floor(sec/86400),h=Math.floor((sec%86400)/3600),m=Math.floor((sec%3600)/60);
   return d?`${d}д ${h}г`:`${h}г ${m}хв`;
 }

 async function render(){
   let d;
   try{d=await api("/api/home-v30")}catch(e){return}
   const c=document.getElementById("content"); if(!c)return;

   const game=meta(d.featured_game);
   const lot=d.active_lottery;
   const season=d.season;
   const levelPct=Math.max(0,Math.min(100,(Number(d.xp||0)%100)));

   c.innerHTML=`<main class="rh30">
     <section class="rh30-top">
       <div class="rh30-user">
         <div class="rh30-avatar">${esc30((me.first_name||me.username||"R").slice(0,1).toUpperCase())}</div>
         <div><span>WELCOME BACK</span><h1>${esc30(me.first_name||me.username||"Player")}</h1><p>LVL ${d.level} · ${d.xp} XP</p></div>
       </div>
       <div class="rh30-wallet">
         <small>МІЙ БАЛАНС</small><b>${d.balance} RH</b><span>✦ ReferHub Stars</span>
       </div>
     </section>

     <section class="rh30-hero ${lot?"live":"empty"}" ${lot?`onclick="rh29OpenLottery(${Number(lot.id)})"`:""}>
       <div class="rh30-hero-grid"></div>
       <div class="rh30-hero-copy">
         <span>${lot?"● LIVE DRAW":"LOTTERY"}</span>
         <h2>${lot?esc30(lot.prize_title||lot.title||"Активний розіграш"):"Новий розіграш скоро"}</h2>
         <p>${lot?esc30(lot.description||"Купуй білети та збільшуй свій шанс на перемогу."):"Готуй RH Stars до наступного розіграшу."}</p>
         ${lot?`<button onclick="event.stopPropagation();rh29OpenLottery(${Number(lot.id)})">ВІДКРИТИ РОЗІГРАШ →</button>`:""}
       </div>
       ${lot?`<div class="rh30-hero-stats">
         <article><small>ТВОЇ БІЛЕТИ</small><b>${Number(lot.my_tickets||0)}</b></article>
         <article><small>ВСЬОГО</small><b>${Number(lot.total_tickets||0)}</b></article>
         <article><small>УЧАСНИКИ</small><b>${Number(lot.participants||0)}</b></article>
       </div>`:""}
     </section>

     <section class="rh30-grid">
       <article class="rh30-card daily" onclick="openPage('home')">
         <div class="rh30-card-icon">🔥</div>
         <div><span>DAILY STREAK</span><h3>${d.streak} днів</h3><p>${d.daily_claimed?"Сьогодні вже отримано":"Нагорода чекає на тебе"}</p></div>
         <b>→</b>
       </article>

       <article class="rh30-card season" onclick="openPage('season')">
         <div class="rh30-card-icon">✦</div>
         <div><span>SEASON</span><h3>${season?esc30(season.subtitle||season.title):"No active season"}</h3><p>${season?`LVL ${season.level}/20 · ${season.xp} XP`:"Сезон скоро"}</p></div>
         <b>→</b>
       </article>

       <article class="rh30-card game" onclick="openGameDetail('${game.id}')">
         <div class="rh30-card-icon">${game.icon}</div>
         <div><span>GAME OF THE DAY</span><h3>${esc30(game.name)}</h3><p>${d.game_stats.plays} ігор · ${d.game_stats.earned} RH</p></div>
         <b>→</b>
       </article>

       <article class="rh30-card task" onclick="openPage('tasks')">
         <div class="rh30-card-icon">⚡</div>
         <div><span>MISSIONS</span><h3>${d.tasks.done}/${d.tasks.total}</h3><p>Виконані завдання</p></div>
         <b>→</b>
       </article>
     </section>

     <section class="rh30-progress">
       <div class="rh30-progress-head">
         <div><span>ACCOUNT PROGRESS</span><h2>До наступного рівня</h2></div>
         <b>${levelPct}/100 XP</b>
       </div>
       <div class="rh30-track"><i style="width:${levelPct}%"></i></div>
       <div class="rh30-progress-bottom">
         <span>LVL ${d.level}</span>
         <span>${100-levelPct} XP залишилось</span>
       </div>
     </section>

     <section class="rh30-actions">
       <button onclick="openPage('lotteries')"><span>🎟</span><div><small>LOTTERY</small><b>Розіграші</b></div><i>→</i></button>
       <button onclick="openPage('games')"><span>🎮</span><div><small>ARCADE</small><b>Ігри</b></div><i>→</i></button>
       <button onclick="openPage('tasks')"><span>⚡</span><div><small>EARN</small><b>Заробити</b></div><i>→</i></button>
       <button onclick="openPage('profile')"><span>👤</span><div><small>ACCOUNT</small><b>Профіль</b></div><i>→</i></button>
     </section>

     <section class="rh30-social">
       <div>
         <span>COMMUNITY</span>
         <h2>ReferHub живе разом з гравцями</h2>
         <p>${d.social.followers} підписників · ${d.social.following} підписок</p>
       </div>
       <button onclick="rh26Page?.()">SOCIAL HUB →</button>
     </section>
   </main>`;
 }

 window.rh30Home=render;

 // Override home page after legacy code has loaded, without touching other pages.
 const bind=()=>{
   if(typeof window.homePage==="function" && !window.homePage.__rh30){
     const f=async function(){await render()};
     f.__rh30=true;
     window.homePage=f;
   }
 };

 new MutationObserver(bind).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener("DOMContentLoaded",()=>{bind();setTimeout(()=>{bind(); if(document.querySelector("[data-page='home'].active"))render()},400)});
 setTimeout(bind,700);
})();
