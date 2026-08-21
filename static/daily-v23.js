
/* ReferHub v2.3 — Daily System */
(()=>{
 function fmt(s){s=Math.max(0,+s||0);const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return h?`${h}г ${m}хв`:`${m} хв`}
 function dayCard(d){
   return `<article class="rh23-day ${d.current?"current":""} ${d.claimed?"claimed":""} ${d.final?"final":""}">
     <div class="rh23-day-top"><span>ДЕНЬ ${d.day}</span>${d.claimed?"<i>✓</i>":""}</div>
     <div class="rh23-gift">${d.final?"🎁":"✦"}</div>
     <b>+${d.reward} RH</b>
     <small>${d.final?"ВЕЛИКИЙ ФІНАЛ":"DAILY REWARD"}</small>
   </article>`;
 }
 async function render(){
   let d;try{d=await api("/api/daily-v23")}catch(_){return}
   document.querySelectorAll(".rh23-root").forEach(x=>x.remove());
   const root=document.createElement("section");root.className="rh23-root";
   const drop=d.drops?.[0];
   root.innerHTML=`
     <section class="rh23-hero">
       <div class="rh23-fire">🔥</div>
       <div class="rh23-copy"><span>DAILY STREAK</span><h2>${d.streak} днів поспіль</h2><p>Заходь щодня — нагорода росте до великого бонусу на 7-й день.</p></div>
       <button ${d.claimed_today?"disabled":""} onclick="rh23ClaimDaily()">${d.claimed_today?"✓ СЬОГОДНІ ОТРИМАНО":`ЗАБРАТИ +${d.today_reward} RH`}</button>
     </section>
     <div class="rh23-calendar">${d.calendar.map(dayCard).join("")}</div>
     ${drop?`<section class="rh23-drop">
       <div class="rh23-drop-art"><div>?</div><span>MYSTERY</span></div>
       <div class="rh23-drop-copy"><span>LIMITED DROP</span><h2>${esc(drop.title)}</h2><p>Випадковий бонус активний лише обмежений час.</p><small>⏱ Ще ${fmt(drop.seconds_left)}</small></div>
       <button ${drop.claimed?"disabled":""} onclick="rh23ClaimDrop(${drop.id})">${drop.claimed?"✓ ОТРИМАНО":`ВІДКРИТИ · +${drop.reward} RH`}</button>
     </section>`:""}
   `;
   const c=document.getElementById("content")||document.querySelector(".content")||document.querySelector("main");
   if(c)c.prepend(root);
 }
 window.rh23ClaimDaily=async()=>{try{const r=await api("/api/daily-v23/claim",{method:"POST"});me.balance=+r.balance;const b=document.getElementById("balance");if(b)b.textContent=me.balance;rewardToast?.("Daily Reward",`+${r.reward} RH`,"🔥");await render()}catch(e){toast(e.message,"error")}};
 window.rh23ClaimDrop=async id=>{try{const r=await api(`/api/mystery-drop-v23/${id}/claim`,{method:"POST"});me.balance=+r.balance;const b=document.getElementById("balance");if(b)b.textContent=me.balance;rewardToast?.("Mystery Drop",`+${r.reward} RH`,"🎁");await render()}catch(e){toast(e.message,"error")}};
 window.rh251RenderDaily=render;
 const old=window.homePage;
 document.addEventListener("DOMContentLoaded",()=>setTimeout(render,260));
})();
