
/* ReferHub v2.2 — SINGLE premium profile */
(()=>{
 function pct(a,b){return Math.max(0,Math.min(100,b?Math.round(a/b*100):0))}
 function levelText(p){
   const l=p.level||{};
   return `${l.icon||"✦"} LVL ${l.number||1} · ${l.name||"Новачок"}`;
 }
 function badgeCard(b){
   return `<article class="rh21-badge ${b.unlocked?"unlocked":"locked"}">
     <div class="rh21-badge-icon">${b.unlocked?b.icon:"🔒"}</div>
     <div><span>${b.unlocked?"ВІДКРИТО":"ЗАБЛОКОВАНО"}</span><h3>${esc(b.title)}</h3><p>${esc(b.description)}</p></div>
   </article>`;
 }
 function milestoneCard(m){
   const progress=pct(m.current,m.target);
   return `<article class="rh21-milestone ${m.done?"done":""}">
     <div class="rh21-ms-top"><span>${m.icon} ${esc(m.title)}</span><b>${m.current}/${m.target}</b></div>
     <div class="rh21-ms-track"><i style="width:${progress}%"></i></div>
   </article>`;
 }

 async function renderProfile(){
   content.innerHTML=`<div class="loader"></div>`;

   let p;
   try{
     p=await api("/api/progression-v21");
   }catch(error){
     content.innerHTML=`<div class="rh22-error"><span>⚠️</span><h2>Не вдалося відкрити профіль</h2><p>${esc(error.message)}</p></div>`;
     return;
   }

   const next=p.level?.next;
   const start=Number(p.level?.start||0);
   const xp=Number(p.xp||0);
   const progress=next?Math.max(0,Math.min(100,Math.round((xp-start)/(next-start)*100))):100;
   const unlocked=(p.badges||[]).filter(x=>x.unlocked).length;

   content.innerHTML=`
     <section class="rh22-profile">
       <section class="rh21-hero rh22-hero rh221-hero">
         <div class="rh221-hero-orb one"></div>
         <div class="rh221-hero-orb two"></div>
         <div class="rh221-hero-lines"></div>
         <div class="rh21-avatar rh221-avatar">
           <div class="rh221-avatar-halo"></div>
           <div class="rh221-avatar-frame">
             <div class="rh21-avatar-ring">
               ${(me.photo_url||window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url) ? `<img class="rh221-profile-photo" src="${esc(me.photo_url||window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url)}" alt="">` : `<span>${esc((me.first_name||me.username||"R").slice(0,1).toUpperCase())}</span>`}
             </div>
           </div>
           <div class="rh221-level-gem">${p.level?.number||1}</div>
           <img class="rh21-rank-sticker" src="/static/assets/stickers/rh.svg" alt="">
         </div>

         <div class="rh21-identity">
           <span class="rh21-eyebrow">REFERHUB ACCOUNT</span>
           <h1>${esc(me.first_name||me.username||"Player")}</h1>
           <p>${levelText(p)}</p>
           <div class="rh21-levelbar"><i style="width:${progress}%"></i></div>
           <div class="rh21-levelmeta">
             <span>${xp} XP</span>
             <span>${next?`${next-xp} XP до наступного рівня`:"MAX LEVEL"}</span>
           </div>
         </div>

         <div class="rh22-rank-box">
           <div class="rh22-rank-top">
             <span>🔥</span>
             <div><b>${p.streak}</b><small>днів streak</small></div>
           </div>
           <div class="rh22-rank-line"></div>
           <div class="rh22-rank-bottom"><span>🏅</span><b>${unlocked}/${(p.badges||[]).length}</b><small>бейджів</small></div>
         </div>
       </section>

       <section class="rh22-wallet-row">
         <article class="rh22-wallet rh">
           <img src="/static/assets/stickers/rh.svg" alt="">
           <div><span>ПОТОЧНИЙ БАЛАНС</span><b>${p.balance} RH</b><small>${p.total_earned} RH зароблено за весь час</small></div>
         </article>
         <article class="rh22-wallet ticket">
           <img src="/static/assets/stickers/ticket.svg" alt="">
           <div><span>КВИТКИ</span><b>${p.tickets}</b><small>${p.draws_joined} розіграшів з участю</small></div>
         </article>
         <article class="rh22-wallet win">
           <img src="/static/assets/stickers/winner.svg" alt="">
           <div><span>ПЕРЕМОГИ</span><b>${p.wins}</b><small>виграних розіграшів</small></div>
         </article>
       </section>

       <section class="rh22-dashboard">
         <div class="rh21-panel rh22-progress-panel">
           <div class="rh21-title"><div><span>PROGRESSION</span><h2>Наступні цілі</h2></div><small>Твій шлях</small></div>
           <div class="rh21-milestones">${(p.milestones||[]).map(milestoneCard).join("")}</div>
         </div>

         <div class="rh21-panel rh22-career-panel">
           <div class="rh21-title"><div><span>CAREER</span><h2>Статистика</h2></div><small>${p.account_age_days} днів</small></div>
           <div class="rh22-career-grid">
             <div><i>🎮</i><span><small>Мініігор</small><b>${p.games_played}</b></span></div>
             <div><i>🏆</i><span><small>Виграшних ігор</small><b>${p.games_won}</b></span></div>
             <div><i>⚡</i><span><small>Завдань</small><b>${p.tasks_completed}</b></span></div>
             <div><i>👥</i><span><small>Запрошено друзів</small><b>${p.referrals}</b></span></div>
             <div><i>💰</i><span><small>RH з ігор</small><b>${p.games_earned}</b></span></div>
             <div><i>⭐</i><span><small>Зірки</small><b>${p.stars}</b></span></div>
           </div>
         </div>
       </section>

       <section class="rh221-showcase">
         <article class="rh221-showcase-card purple"><div class="rh221-sc-icon">✦</div><div><span>ПОТОЧНИЙ РАНГ</span><b>${esc(p.level?.name||"Новачок")}</b><small>LVL ${p.level?.number||1}</small></div></article>
         <article class="rh221-showcase-card gold"><div class="rh221-sc-icon">🔥</div><div><span>АКТИВНА СЕРІЯ</span><b>${p.streak} днів</b><small>Не втрать streak</small></div></article>
         <article class="rh221-showcase-card blue"><div class="rh221-sc-icon">🎮</div><div><span>GAME RECORD</span><b>${p.games_won}</b><small>переможних ігор</small></div></article>
         <article class="rh221-showcase-card green"><div class="rh221-sc-icon">👑</div><div><span>LOTTERY WINS</span><b>${p.wins}</b><small>великих перемог</small></div></article>
       </section>

       <section class="rh21-badges-panel rh22-badges">
         <div class="rh21-title">
           <div><span>BADGE COLLECTION</span><h2>Колекція бейджів</h2></div>
           <small>${unlocked}/${(p.badges||[]).length} відкрито</small>
         </div>
         <div class="rh21-badges">${(p.badges||[]).map(badgeCard).join("")}</div>
       </section>

       <section class="rh22-summary">
         <div class="rh22-summary-copy">
           <span>YOUR REFERHUB JOURNEY</span>
           <h2>${p.account_age_days} днів у ReferHub</h2>
           <p>Грай, накопичуй RH, купуй квитки та відкривай нові бейджі й рівні.</p>
         </div>
         <div class="rh22-summary-number">
           <small>ЗАГАЛЬНИЙ XP</small>
           <b>${p.xp}</b>
         </div>
       </section>
     </section>
   `;
 }

 window.profilePage=renderProfile;
})();
