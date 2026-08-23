
/* ReferHub v4.26 — Seasons + Streaks
   Uses existing real account/referral/task data; no economy mutation. */
(()=>{
 const E=v=>typeof esc==="function"?esc(v):String(v??"");
 const DAY=86400000;
 const SEASON_START=Date.UTC(2026,7,23);
 const SEASON_END=Date.UTC(2026,8,22,23,59,59);
 const REWARDS=[
   {lv:1,name:"Старт сезону",icon:"✦"},
   {lv:3,name:"150 Season XP",icon:"⚡"},
   {lv:5,name:"Бейдж · Першопроходець",icon:"◆"},
   {lv:8,name:"Профільна рамка I",icon:"▣"},
   {lv:10,name:"Титул · Recruiter",icon:"♛"},
   {lv:15,name:"Профільна рамка II",icon:"◈"},
   {lv:20,name:"Бейдж · Elite",icon:"✪"},
   {lv:25,name:"Титул · Vanguard",icon:"♜"},
   {lv:30,name:"Season I Master",icon:"★"}
 ];

 function seasonXP(summary={}){
   const referrals=Number(summary.referrals_count||0);
   const active=Number(summary.active_count||0);
   const accountXP=Number(window.me?.xp||0);
   // Referrals intentionally dominate the season score.
   return Math.max(0,referrals*500 + active*180 + Math.floor(accountXP*.25));
 }
 function levelFromXP(xp){ return Math.min(30,Math.floor(xp/600)+1); }
 function levelProgress(xp){
   const lv=levelFromXP(xp),base=(lv-1)*600;
   return lv>=30?100:Math.min(100,Math.floor((xp-base)/600*100));
 }
 function daysLeft(){
   return Math.max(0,Math.ceil((SEASON_END-Date.now())/DAY));
 }
 function streak(){
   // Existing account data does not expose a reliable historical daily-login ledger.
   // Present a safe current streak indicator rather than inventing history.
   const last=Number(window.me?.last_seen||window.me?.last_active||0);
   if(!last)return 1;
   const ms=last>1e12?last:last*1000;
   return Date.now()-ms<DAY*1.5?1:0;
 }
 function rewardCard(r,lv){
   const state=lv>=r.lv?"unlocked":lv+1>=r.lv?"next":"locked";
   return `<article class="${state}">
     <span>${r.icon}</span><div><small>LEVEL ${r.lv}</small><b>${E(r.name)}</b></div>
     <strong>${state==="unlocked"?"✓":state==="next"?"NEXT":"🔒"}</strong>
   </article>`;
 }

 window.seasonHub426=async function(){
   const c=document.getElementById("content");
   if(!c)return;
   c.innerHTML='<div class="loader"></div>';
   try{
     let summary={};
     try{summary=await api("/api/referrals/summary")}catch(_){}
     const xp=seasonXP(summary);
     const lv=levelFromXP(xp);
     const pct=levelProgress(xp);
     const nextXP=lv>=30?xp:lv*600;
     const currentBase=(lv-1)*600;
     const currentInto=xp-currentBase;
     const streakDays=streak();
     const referrals=Number(summary.referrals_count||0);

     c.innerHTML=`
       <section class="s426">
         <header class="s426-hero">
           <div class="s426-orbit"><i></i><b>${lv}</b><small>LEVEL</small></div>
           <div class="s426-title">
             <span>REFERHUB · SEASON I</span>
             <h1>Genesis Season</h1>
             <p>Прокачуй сезон активністю. Найбільше XP дають реферали.</p>
             <div class="s426-timer"><i></i>${daysLeft()} днів до завершення</div>
           </div>
           <div class="s426-rank"><small>SEASON XP</small><b>${xp.toLocaleString()}</b><span>${lv>=30?"MAX LEVEL":`${Math.max(0,nextXP-xp)} XP до LVL ${lv+1}`}</span></div>
         </header>

         <section class="s426-progress">
           <header><div><span>LEVEL ${lv}</span><b>${lv>=30?"Season Master":`${currentInto}/600 XP`}</b></div><strong>${pct}%</strong></header>
           <div><i style="width:${pct}%"></i></div>
         </section>

         <section class="s426-stats">
           <article class="fire"><span>🔥</span><div><small>DAILY STREAK</small><b>${streakDays} день</b><i>Заходь щодня</i></div></article>
           <article><span>👥</span><div><small>РЕФЕРАЛИ</small><b>${referrals}</b><i>+500 XP / запрошення</i></div></article>
           <article><span>⚡</span><div><small>АКТИВНА КОМАНДА</small><b>${Number(summary.active_count||0)}</b><i>+180 XP / активного</i></div></article>
           <article><span>✦</span><div><small>ACCOUNT XP</small><b>${Number(window.me?.xp||0)}</b><i>25% іде в сезон</i></div></article>
         </section>

         <section class="s426-grid">
           <section class="s426-card rewards">
             <header><div><span>SEASON PATH</span><h2>Нагороди сезону</h2></div><b>${lv}/30</b></header>
             <div class="s426-rewards">${REWARDS.map(r=>rewardCard(r,lv)).join("")}</div>
           </section>

           <section class="s426-side">
             <article class="s426-card multiplier">
               <span>REFERRAL BOOST</span>
               <h2>Реферали = головний XP</h2>
               <b>+500 <small>XP</small></b>
               <p>Кожен новий реферал просуває тебе майже на цілий сезонний рівень.</p>
               <button onclick="openPage('referrals')">ЗАПРОСИТИ ДРУГА →</button>
             </article>

             <article class="s426-card streak">
               <header><div><span>STREAK</span><h2>Серія активності</h2></div><b>🔥 ${streakDays}</b></header>
               <div class="s426-week">
                 ${["Пн","Вт","Ср","Чт","Пт","Сб","Нд"].map((d,i)=>`<div class="${i<streakDays?"done":""}"><i>${i<streakDays?"✓":i+1}</i><small>${d}</small></div>`).join("")}
               </div>
               <p>Повна історія streak буде рахуватися сервером у наступному етапі. Зараз ми не вигадуємо дні, яких немає в даних.</p>
             </article>
           </section>
         </section>

         <section class="s426-bottom">
           <div><span>SEASON OBJECTIVE</span><h2>Побудуй найсильнішу команду ReferHub</h2><p>Реферали → Season XP → рівні → косметичні нагороди → статус у профілі.</p></div>
           <button onclick="openPage('referrals')">REFERRAL HUB</button>
         </section>
       </section>`;
     document.querySelector("main")?.scrollTo({top:0,behavior:"auto"});
   }catch(err){
     c.innerHTML=`<section class="s426-error"><span>⚠️</span><h2>Season Hub не завантажився</h2><p>${E(err.message)}</p><button onclick="seasonHub426()">ПОВТОРИТИ</button></section>`;
   }
 };
})();
