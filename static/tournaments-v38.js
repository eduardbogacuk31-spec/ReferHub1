
/* ReferHub v3.8 — Tournaments 2.0 */
(()=>{
 let data=null;
 const e=v=>typeof esc==="function"?esc(v):String(v??"");

 const fmt=s=>{
   s=Math.max(0,Number(s||0));
   const d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60);
   if(d)return `${d}д ${h}г`;
   if(h)return `${h}г ${m}хв`;
   return `${m} хв`;
 };

 function medal(i){return i===1?"🥇":i===2?"🥈":i===3?"🥉":"#"+i}

 function card(t){
   const live=t.status==="live";
   return `<article class="rh38-card ${t.status}" onclick="rh38Detail(${t.id})">
     <div class="rh38-art">
       <div class="rh38-gridfx"></div>
       <span class="rh38-status ${t.status}">${live?"● LIVE":t.status==="upcoming"?"СКОРО":"ЗАВЕРШЕНО"}</span>
       <div class="rh38-icon">${t.icon}</div>
       <small>${t.game_key==="all"?"ALL GAMES":e(t.game_key).toUpperCase()}</small>
     </div>
     <div class="rh38-copy">
       <span>TOURNAMENT</span>
       <h3>${e(t.title)}</h3>
       <p>${e(t.subtitle)}</p>
       <div class="rh38-prizes">
         <b>🥇 ${t.prizes[0]} RH</b>
         <b>🥈 ${t.prizes[1]} RH</b>
         <b>🥉 ${t.prizes[2]} RH</b>
       </div>
       <div class="rh38-foot">
         <span>${live?`⏱ ${fmt(t.seconds_left)}`:"Статус: "+t.status}</span>
         <b>${t.my_place?`Ти #${t.my_place}`:"Без місця"}</b>
       </div>
     </div>
   </article>`;
 }

 function render(){
   const c=document.getElementById("content");if(!c||!data)return;
   const live=data.items.filter(x=>x.status==="live").length;
   c.innerHTML=`<main class="rh38">
     <section class="rh38-hero">
       <div class="rh38-hero-grid"></div>
       <div>
         <span>TOURNAMENTS 2.0 · v3.8</span>
         <h1>Змагайся за RH</h1>
         <p>Грай у мініігри, піднімайся в рейтингу та забирай призові місця.</p>
       </div>
       <section>
         <small>LIVE NOW</small>
         <b>${live}</b>
         <i>активних турнірів</i>
       </section>
     </section>

     <section class="rh38-head">
       <div><span>COMPETITIONS</span><h2>Активні турніри</h2></div>
       <small>${data.items.length} турнірів</small>
     </section>

     <section class="rh38-grid">
       ${data.items.map(card).join("")}
     </section>
   </main>`;
 }

 async function open(){
   try{data=await api("/api/tournaments-v38");render()}
   catch(err){toast(err.message,"error")}
 }

 window.rh38Open=open;

 window.rh38Detail=async id=>{
   let t;try{t=await api(`/api/tournaments-v38/${id}`)}catch(err){toast(err.message,"error");return}
   const c=document.getElementById("content");if(!c)return;
   c.innerHTML=`<main class="rh38-detail">
     <button class="rh38-back" onclick="rh38Open()">← Назад</button>

     <section class="rh38-detail-hero">
       <div class="rh38-detail-icon">${t.icon}</div>
       <div>
         <span>${t.status==="live"?"● LIVE TOURNAMENT":"TOURNAMENT"}</span>
         <h1>${e(t.title)}</h1>
         <p>${e(t.subtitle)}</p>
       </div>
       <section>
         <small>ЗАЛИШИЛОСЬ</small>
         <b>${fmt(t.seconds_left)}</b>
         <i>${t.my_place?`Твоє місце #${t.my_place}`:"Ще без місця"}</i>
       </section>
     </section>

     <section class="rh38-podium">
       ${[0,1,2].map((i)=>`
         <article class="p${i+1}">
           <span>${medal(i+1)}</span>
           <b>${t.prizes[i]} RH</b>
           <small>${i===0?"ПЕРЕМОЖЕЦЬ":"ПРИЗОВЕ МІСЦЕ"}</small>
         </article>`).join("")}
     </section>

     <section class="rh38-board-head">
       <div><span>LIVE RANKING</span><h2>Таблиця лідерів</h2></div>
       <small>${t.leaderboard.length} гравців</small>
     </section>

     <section class="rh38-board">
       ${t.leaderboard.length?t.leaderboard.map(p=>`
         <article class="${p.self?"self":""}">
           <em>${medal(p.place)}</em>
           <div class="rh38-avatar">${e((p.first_name||p.username||"R").slice(0,1).toUpperCase())}</div>
           <section><b>${e(p.first_name||p.username||"Гравець")}</b><small>${p.plays} ігор · best ${p.best} RH</small></section>
           <strong>${p.score} RH</strong>
         </article>`).join(""):`<div class="rh38-empty">Ще немає результатів</div>`}
     </section>

     ${t.game_key!=="all"?`<button class="rh38-play" onclick="openGameDetail('${e(t.game_key)}')">🎮 ГРАТИ В ТУРНІРНУ ГРУ</button>`:`<button class="rh38-play" onclick="openPage('games')">🎮 ВІДКРИТИ GAME CENTER</button>`}
   </main>`;
 };

 function addEntry(){
   if(document.querySelector(".rh38-entry"))return;
   const host=document.querySelector(".rh30-actions");
   if(!host)return;
   const b=document.createElement("button");
   b.className="rh38-entry";
   b.innerHTML='<span>🏆</span><div><small>COMPETE</small><b>Турніри</b></div><i>→</i>';
   b.onclick=open;host.appendChild(b);
 }

 new MutationObserver(()=>requestAnimationFrame(addEntry)).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener("DOMContentLoaded",addEntry);
 setTimeout(addEntry,350);
})();
