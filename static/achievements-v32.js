
/* ReferHub v3.2 — Achievements 2.0 */
(()=>{
 let rh32Data=null, rh32Tab="all";
 const esc32=v=>typeof esc==="function"?esc(v):String(v??"");
 const cats={
   all:["ALL","Усі"],
   games:["GAMES","Ігри"],
   economy:["ECONOMY","RH"],
   lottery:["LOTTERY","Лотерея"],
   social:["SOCIAL","Соціальне"],
   daily:["DAILY","Streak"]
 };

 function card(x){
   const cls=x.claimed?"claimed":x.unlocked?"ready":"locked";
   return `<article class="rh32-card ${x.rarity} ${cls}">
     <div class="rh32-icon"><span>${x.icon}</span><i></i></div>
     <div class="rh32-copy">
       <div class="rh32-topline">
         <span class="rh32-rarity">${x.rarity.toUpperCase()}</span>
         <small>${x.hidden&&!x.unlocked?"HIDDEN":"+"+x.reward_rh+" RH"}</small>
       </div>
       <h3>${esc32(x.title)}</h3>
       <p>${esc32(x.description)}</p>
       <div class="rh32-progress"><i style="width:${x.progress}%"></i></div>
       <div class="rh32-foot"><span>${Math.min(x.value,x.goal)}/${x.goal}</span><b>${x.progress}%</b></div>
     </div>
     <button ${x.unlocked&&!x.claimed?`onclick="rh32Claim('${x.key}')"`:"disabled"}>
       ${x.claimed?"✓ ОТРИМАНО":x.unlocked?"ЗАБРАТИ":"🔒"}
     </button>
   </article>`;
 }

 function render(){
   const c=document.getElementById("content"); if(!c||!rh32Data)return;
   const list=rh32Tab==="all"?rh32Data.items:rh32Data.items.filter(x=>x.category===rh32Tab);

   c.innerHTML=`<main class="rh32">
     <section class="rh32-hero">
       <div class="rh32-hero-grid"></div>
       <div class="rh32-emblem">🏆</div>
       <div class="rh32-hero-copy">
         <span>ACHIEVEMENTS 2.0</span>
         <h1>Колекція досягнень</h1>
         <p>Грай, вигравай, запрошуй друзів і відкривай рідкісні ачивки.</p>
       </div>
       <div class="rh32-summary">
         <article><small>ВІДКРИТО</small><b>${rh32Data.summary.unlocked}/${rh32Data.summary.total}</b></article>
         <article><small>ОТРИМАНО</small><b>${rh32Data.summary.claimed}</b></article>
       </div>
     </section>

     <nav class="rh32-tabs">
       ${Object.entries(cats).map(([k,v])=>`<button class="${rh32Tab===k?"active":""}" onclick="rh32Switch('${k}')"><span>${v[0]}</span><b>${v[1]}</b></button>`).join("")}
     </nav>

     <section class="rh32-rarity-legend">
       <span class="common">COMMON</span>
       <span class="rare">RARE</span>
       <span class="epic">EPIC</span>
       <span class="legendary">LEGENDARY</span>
     </section>

     <section class="rh32-grid">
       ${list.length?list.map(card).join(""):`<div class="rh32-empty"><span>🏆</span><h3>Немає досягнень</h3><p>У цій категорії поки порожньо.</p></div>`}
     </section>
   </main>`;
 }

 async function open(){
   try{rh32Data=await api("/api/achievements-v32")}catch(e){toast(e.message,"error");return}
   render();
 }

 window.rh32Open=open;
 window.rh32Switch=k=>{rh32Tab=k;render()};
 window.rh32Claim=async key=>{
   try{
     const r=await api(`/api/achievements-v32/claim/${encodeURIComponent(key)}`,{method:"POST"});
     me.balance=Number(r.balance||me.balance||0);
     const b=document.getElementById("balance"); if(b)b.textContent=me.balance;
     rewardToast?.("Achievement unlocked",`+${r.reward} RH`,"🏆");
     await open();
   }catch(e){toast(e.message,"error")}
 };

 function injectEntry(){
   if(document.querySelector(".rh32-entry"))return;
   const host=document.querySelector(".rh22-profile,.rh221-showcase,.pc82-shell");
   if(!host)return;
   const btn=document.createElement("button");
   btn.className="rh32-entry";
   btn.innerHTML='<span>🏆</span><section><small>ACHIEVEMENTS 2.0</small><b>Досягнення</b><i>Прогрес · рідкість · нагороди</i></section><em>→</em>';
   btn.onclick=open;
   host.appendChild(btn);
 }

 new MutationObserver(()=>requestAnimationFrame(injectEntry)).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener("DOMContentLoaded",injectEntry);
 setTimeout(injectEntry,300);
})();
