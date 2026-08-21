
/* ReferHub v3.3 — Reward Center */
(()=>{
 let data=null,tab="ready";
 const e=v=>typeof esc==="function"?esc(v):String(v??"");

 function rewardCards(){
   const a=data.achievements||[];
   if(!a.length)return `<div class="rh33-empty"><span>✓</span><h3>Усе забрано</h3><p>Нові нагороди з'являться після виконання цілей.</p></div>`;
   return a.map(x=>`<article class="rh33-reward ${x.rarity}">
      <div class="rh33-r-icon">${x.icon}</div>
      <div><small>${String(x.rarity).toUpperCase()} ACHIEVEMENT</small><h3>${e(x.title)}</h3><p>Нагорода за виконане досягнення</p></div>
      <section><b>+${x.reward} RH</b><button onclick="rh33Claim('${x.key}')">ЗАБРАТИ</button></section>
   </article>`).join("");
 }

 function overview(){
   const lot=data.lottery, s=data.season, d=data.daily;
   return `<section class="rh33-overview">
     <article onclick="openPage('home')"><span>🔥</span><div><small>DAILY</small><h3>${d.ready?"Нагорода готова":"Сьогодні виконано"}</h3><p>Streak: ${d.streak} дн.</p></div><b>→</b></article>
     <article onclick="openPage('season')"><span>✦</span><div><small>SEASON</small><h3>${s?e(s.title):"Немає сезону"}</h3><p>${s?`LVL ${s.level} · ${s.xp} XP`:"Очікуй новий сезон"}</p></div><b>→</b></article>
     <article onclick="openPage('lotteries')"><span>🎟️</span><div><small>LOTTERY</small><h3>${lot?e(lot.prize_title||lot.title||"Активний розіграш"):"Скоро"}</h3><p>${lot?`${Number(lot.my_tickets||0)} твоїх білетів`:"Новий розіграш готується"}</p></div><b>→</b></article>
     <article onclick="rh32Open()"><span>🏆</span><div><small>ACHIEVEMENTS</small><h3>${data.achievements.length} нагород</h3><p>Переглянути всі досягнення</p></div><b>→</b></article>
   </section>`;
 }

 function render(){
   const c=document.getElementById("content"); if(!c||!data)return;
   c.innerHTML=`<main class="rh33">
     <section class="rh33-hero">
       <div>
         <span>REWARD CENTER · v3.3</span>
         <h1>Твої нагороди</h1>
         <p>Одне місце для Daily, сезону, лотереї та досягнень.</p>
       </div>
       <section class="rh33-balance"><small>RH BALANCE</small><b>${data.balance}</b><i>✦ RH Stars</i></section>
       <section class="rh33-ready"><small>ГОТОВО</small><b>${data.ready_count}</b><i>нагород</i></section>
     </section>

     <nav class="rh33-tabs">
       <button class="${tab==="ready"?"active":""}" onclick="rh33Tab('ready')"><span>🎁</span><b>Готові</b></button>
       <button class="${tab==="overview"?"active":""}" onclick="rh33Tab('overview')"><span>◈</span><b>Огляд</b></button>
       <button onclick="rh32Open()"><span>🏆</span><b>Досягнення</b></button>
     </nav>

     ${tab==="ready"?`<section class="rh33-section-title"><div><small>CLAIMABLE</small><h2>Можна забрати зараз</h2></div><b>${data.achievements.length}</b></section><section class="rh33-list">${rewardCards()}</section>`:overview()}
   </main>`;
 }

 async function open(){
   try{data=await api("/api/reward-center-v33");render()}
   catch(err){toast(err.message,"error")}
 }

 window.rh33Open=open;
 window.rh33Tab=x=>{tab=x;render()};
 window.rh33Claim=async key=>{
   try{
     const r=await api(`/api/achievements-v32/claim/${encodeURIComponent(key)}`,{method:"POST"});
     me.balance=Number(r.balance||me.balance||0);
     rewardToast?.("Нагороду отримано",`+${r.reward} RH`,"🎁");
     await open();
   }catch(err){toast(err.message,"error")}
 };

 function addEntry(){
   if(document.querySelector(".rh33-entry"))return;
   const host=document.querySelector(".rh30-actions");
   if(!host)return;
   const b=document.createElement("button");
   b.className="rh33-entry";
   b.innerHTML='<span>🎁</span><div><small>REWARDS</small><b>Нагороди</b></div><i>→</i>';
   b.onclick=open;
   host.appendChild(b);
 }
 new MutationObserver(()=>requestAnimationFrame(addEntry)).observe(document.documentElement,{childList:true,subtree:true});
 setTimeout(addEntry,350);
})();
