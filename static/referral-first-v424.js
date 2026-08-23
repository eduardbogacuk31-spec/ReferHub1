
/* ReferHub v4.24 — Referral First */
(()=>{
 const E=v=>typeof esc==="function"?esc(v):String(v??"");
 let lastSummary=null;
 let lastTeam=null;

 function link(){
   return (lastSummary?.referral_link || window.me?.referral_link || "").trim();
 }

 window.ref424Copy=async()=>{
   const value=link();
   if(!value)return toast?.("Реферальне посилання недоступне","error");
   try{
     await navigator.clipboard.writeText(value);
     toast?.("Посилання скопійовано","success");
   }catch(_){
     prompt("Скопіюй посилання:",value);
   }
 };

 window.ref424Share=()=>{
   const value=link();
   if(!value)return toast?.("Реферальне посилання недоступне","error");
   const url=encodeURIComponent(value);
   const text=encodeURIComponent("Приєднуйся до ReferHub за моїм посиланням!");
   if(window.tg?.openTelegramLink){
     window.tg.openTelegramLink(`https://t.me/share/url?url=${url}&text=${text}`);
   }else{
     ref424Copy();
   }
 };

 function teamRow(u){
   return `<article class="ref424-person">
     <span class="ref424-avatar">${E((u.first_name||u.username||"U").slice(0,1).toUpperCase())}</span>
     <div class="grow">
       <b>${E(u.first_name||u.username||"Користувач")}</b>
       <small>${u.username?"@"+E(u.username):"ID "+u.telegram_id}</small>
       <i>${u.is_online?"🟢 Онлайн":u.is_active_7d?"⚡ Активний":"⚪ Неактивний"} · XP ${Number(u.xp||0)}</i>
     </div>
     <strong>+${Number(u.reward_generated||0)} RH</strong>
   </article>`;
 }

 function milestoneRow(item,index){
   return `<article class="${item.completed?"done":""}">
     <span>${item.completed?"✓":index+1}</span>
     <div><b>${E(item.label)}</b><small>${Number(item.count||0)} друзів</small></div>
     <strong>${item.completed?"ВІДКРИТО":"ЗАКРИТО"}</strong>
   </article>`;
 }

 window.referralHub424=async function(){
   const c=document.getElementById("content");
   if(!c)return;
   c.innerHTML='<div class="loader"></div>';

   try{
     const summary=await api("/api/referrals/summary");
     let team={users:[],active_7d:0,online_now:0,generated_reward:0};
     try{
       team=await api("/api/referrals/v413");
     }catch(teamError){
       console.warn("Referral team endpoint unavailable, using friends fallback",teamError);
       try{
         const friends=await api("/api/friends");
         const rows=Array.isArray(friends)?friends:[];
         team={
           users:rows,
           active_7d:rows.filter(x=>x.is_active_7d||x.is_online).length,
           online_now:rows.filter(x=>x.is_online).length,
           generated_reward:Number(summary?.total_reward||0)
         };
       }catch(_){}
     }

     lastSummary=summary||{};
     lastTeam=team||{users:[]};

     const milestones=Array.isArray(summary?.milestones)?summary.milestones:[];
     const users=Array.isArray(team?.users)?team.users:[];
     const current=Number(summary?.referrals_count||0);
     const next=summary?.next_milestone;
     const nextCount=Math.max(1,Number(next?.count||current||1));
     const progress=next?Math.min(100,Math.round(current/nextCount*100)):100;

     c.innerHTML=`
       <section class="ref424">
         <header class="ref424-hero">
           <div class="ref424-brand">
             <div class="ref424-mark">R</div>
             <div>
               <span>CORE FEATURE · REFERHUB</span>
               <h1>Referral Hub</h1>
               <p>Запрошуй людей. Будуй команду. Заробляй RH.</p>
             </div>
           </div>
           <article>
             <small>ЗАРОБЛЕНО З РЕФЕРАЛІВ</small>
             <b>${Number(summary?.total_reward||0)} RH</b>
             <i>${Number(summary?.reward_per_friend||0)} RH за нового користувача</i>
           </article>
         </header>

         <section class="ref424-main-stats">
           <article><span>👥</span><div><small>ЗАПРОШЕНО</small><b>${current}</b></div></article>
           <article><span>⚡</span><div><small>АКТИВНІ</small><b>${Number(team?.active_7d||summary?.active_count||0)}</b></div></article>
           <article><span>🟢</span><div><small>ОНЛАЙН ЗАРАЗ</small><b>${Number(team?.online_now||0)}</b></div></article>
           <article><span>✦</span><div><small>RH ВІД КОМАНДИ</small><b>${Number(team?.generated_reward||summary?.total_reward||0)}</b></div></article>
         </section>

         <section class="ref424-invite">
           <div class="ref424-invite-copy">
             <span>ТВОЄ РЕФЕРАЛЬНЕ ПОСИЛАННЯ</span>
             <b>${E(summary?.referral_link||window.me?.referral_link||"Посилання ще не створено")}</b>
             <p>Надішли його другу. Новий користувач має перейти саме за цим посиланням.</p>
           </div>
           <div class="ref424-actions">
             <button class="primary" onclick="ref424Share()">↗ ЗАПРОСИТИ ДРУГА</button>
             <button onclick="ref424Copy()">⧉ КОПІЮВАТИ</button>
           </div>
         </section>

         <section class="ref424-progress">
           <header>
             <div><span>NEXT LEVEL</span><h2>${next?E(next.label):"Максимальний рівень"}</h2></div>
             <strong>${next?`${current}/${Number(next.count||0)}`:"MAX"}</strong>
           </header>
           <div class="ref424-progressbar"><i style="width:${progress}%"></i></div>
           <p>${next?`Ще ${Math.max(0,Number(next.count||0)-current)} запрошень до наступного рівня.`:"Усі доступні реферальні рівні відкрито."}</p>
         </section>

         <section class="ref424-columns">
           <section class="ref424-card">
             <header><div><span>REFERRAL PATH</span><h2>Рівні програми</h2></div><small>${milestones.filter(x=>x.completed).length}/${milestones.length}</small></header>
             <div class="ref424-milestones">
               ${milestones.length?milestones.map(milestoneRow).join(""):`<div class="ref424-empty">Рівні ще не налаштовані</div>`}
             </div>
           </section>

           <section class="ref424-card">
             <header><div><span>MY TEAM</span><h2>Твоя команда</h2></div><button onclick="referralHub424()">↻</button></header>
             <div class="ref424-team">
               ${users.length?users.map(teamRow).join(""):`<div class="ref424-empty"><span>👥</span><b>Поки нікого</b><p>Перший реферал з’явиться тут.</p></div>`}
             </div>
           </section>
         </section>

         <section class="ref424-how">
           <span>?</span>
           <div>
             <small>ЯК ЦЕ ПРАЦЮЄ</small>
             <b>Реферальна система — центр ReferHub</b>
             <p>Користувач переходить за твоїм посиланням → реєструється → система прив’язує його до твоєї команди → ти отримуєш реферальні нагороди за правилами проекту.</p>
           </div>
         </section>
       </section>`;

     document.querySelector("main")?.scrollTo({top:0,behavior:"auto"});
   }catch(error){
     c.innerHTML=`<section class="ref424-error">
       <span>⚠️</span><h2>Referral Hub не завантажився</h2>
       <p>${E(error.message)}</p>
       <button onclick="referralHub424()">СПРОБУВАТИ ЩЕ РАЗ</button>
     </section>`;
   }
 };
})();
