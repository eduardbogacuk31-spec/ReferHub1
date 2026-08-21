
/* ReferHub v2.7 — Games 2.0 */
(()=>{
 const meta=id=>typeof gpMeta==="function"?gpMeta(id):({id,name:id,icon:"🎮"});
 const name=u=>u.first_name||u.username||"Гравець";
 function escSafe(v){return typeof esc==="function"?esc(v):String(v||"")}
 function avatar(u){return escSafe((name(u)||"R").slice(0,1).toUpperCase())}

 async function stats(){
   try{return await api("/api/game-center-v27")}catch(_){return null}
 }

 async function injectHome(){
   const d=await stats();
   const hero=document.querySelector(".gp-hero");
   if(!d||!hero||document.querySelector(".rh27-stats"))return;

   const featured=meta(d.featured_game);
   const box=document.createElement("section");
   box.className="rh27-stats";
   box.innerHTML=`
     <article><small>ЗІГРАНО</small><b>${d.stats.plays}</b><span>раундів</span></article>
     <article><small>ЗАРОБЛЕНО</small><b>${d.stats.earned} RH</b><span>з ігор</span></article>
     <article><small>РЕКОРД</small><b>${d.stats.best} RH</b><span>за раунд</span></article>
     <article><small>РЕЖИМИ</small><b>${d.stats.modes}/11</b><span>зіграно</span></article>`;
   hero.insertAdjacentElement("afterend",box);

   const feature=document.createElement("section");
   feature.className="rh27-featured";
   feature.innerHTML=`
     <div class="rh27-featured-art">
       <img src="/static/assets/game-art/${featured.id}.svg" alt="">
       <i>GAME OF THE DAY</i>
     </div>
     <div class="rh27-featured-copy">
       <span>ЩОДЕННИЙ ВИБІР</span>
       <h2>${escSafe(featured.name)}</h2>
       <p>${escSafe(featured.desc||"Сьогодні цей режим у центрі уваги.")}</p>
       <button onclick="openGameDetail('${featured.id}')">ГРАТИ ЗАРАЗ →</button>
     </div>`;
   box.insertAdjacentElement("afterend",feature);

   if(d.leaderboard?.length){
     const leader=document.createElement("section");
     leader.className="rh27-leader";
     leader.innerHTML=`
       <div class="rh27-head"><div><span>ARCADE RANKING</span><h2>Топ гравців</h2></div><small>за заробленими RH</small></div>
       <div class="rh27-leader-grid">${d.leaderboard.slice(0,5).map((u,i)=>`
         <article class="${i<3?"top":""}">
           <em>#${i+1}</em>
           <div class="rh27-avatar">${avatar(u)}</div>
           <section><b>${escSafe(name(u))}</b><small>${u.plays} ігор · рекорд ${u.best} RH</small></section>
           <strong>${u.earned} RH</strong>
         </article>`).join("")}</div>`;
     document.querySelector(".gp-grid")?.insertAdjacentElement("afterend",leader);
   }
 }

 async function injectGame(){
   const page=document.querySelector(".gp-game");
   if(!page||document.querySelector(".rh27-detail-strip"))return;
   const d=await stats();
   if(!d)return;

   const title=page.querySelector(".gp-game-title h1")?.textContent?.trim();
   const current=(window.GP_GAMES||[]).find(g=>g.name===title);
   const recent=(d.recent||[]).filter(x=>!current||x.game_key===current.id).slice(0,4);

   const strip=document.createElement("section");
   strip.className="rh27-detail-strip";
   strip.innerHTML=`
     <div><span>PLAYER PERFORMANCE</span><h3>Твій прогрес у Game Center</h3></div>
     <section>
       <article><small>ВСІ РАУНДИ</small><b>${d.stats.plays}</b></article>
       <article><small>RH З ІГОР</small><b>${d.stats.earned}</b></article>
       <article><small>НАЙКРАЩИЙ</small><b>${d.stats.best}</b></article>
     </section>`;
   page.querySelector(".gp-game-hero")?.insertAdjacentElement("afterend",strip);

   if(recent.length){
     const pulse=document.createElement("div");
     pulse.className="rh27-recent-pulse";
     pulse.innerHTML=`<span>LIVE HISTORY</span>${recent.map(x=>`
       <i class="${x.reward>0?"win":""}">${x.reward>0?`+${x.reward} RH`:"0 RH"}</i>`).join("")}`;
     strip.insertAdjacentElement("afterend",pulse);
   }
 }

 function run(){
   requestAnimationFrame(()=>{
     if(document.querySelector(".gp-hero"))injectHome();
     if(document.querySelector(".gp-game"))injectGame();
   });
 }

 new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener("DOMContentLoaded",run);
 setTimeout(run,250);
})();
