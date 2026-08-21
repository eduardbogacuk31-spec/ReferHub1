
/* ReferHub v2.1 — Profile & Progression */
(()=>{
 const originalProfilePage=window.profilePage;
 if(typeof originalProfilePage!=="function") return;

 function levelText(p){
   const l=p.level||{};
   return `${l.icon||"✦"} LVL ${l.number||1} · ${l.name||"Новачок"}`;
 }
 function pct(a,b){return Math.max(0,Math.min(100,b?Math.round(a/b*100):0))}
 function renderBadge(b){
   return `<article class="rh21-badge ${b.unlocked?"unlocked":"locked"}">
      <div class="rh21-badge-icon">${b.unlocked?b.icon:"🔒"}</div>
      <div><span>${b.unlocked?"ВІДКРИТО":"ЗАБЛОКОВАНО"}</span><h3>${esc(b.title)}</h3><p>${esc(b.description)}</p></div>
    </article>`;
 }
 function renderMilestone(m){
   const progress=pct(m.current,m.target);
   return `<article class="rh21-milestone ${m.done?"done":""}">
     <div class="rh21-ms-top"><span>${m.icon} ${esc(m.title)}</span><b>${m.current}/${m.target}</b></div>
     <div class="rh21-ms-track"><i style="width:${progress}%"></i></div>
   </article>`;
 }

 async function inject(){
   let p;
   try{p=await api("/api/progression-v21")}catch(_){return}
   const old=document.querySelector(".rh21-progress-root"); if(old) old.remove();

   const host=document.createElement("section");
   host.className="rh21-progress-root";
   const next=p.level?.next;
   const start=Number(p.level?.start||0);
   const xp=Number(p.xp||0);
   const lp=next?Math.max(0,Math.min(100,Math.round((xp-start)/(next-start)*100))):100;

   host.innerHTML=`
     <section class="rh21-hero">
       <div class="rh21-avatar">
         <div class="rh21-avatar-ring">
           <span>${esc((me.first_name||me.username||"R").slice(0,1).toUpperCase())}</span>
         </div>
         <img class="rh21-rank-sticker" src="/static/assets/stickers/rh.svg" alt="">
       </div>
       <div class="rh21-identity">
         <span class="rh21-eyebrow">REFERHUB PROFILE</span>
         <h1>${esc(me.first_name||me.username||"Player")}</h1>
         <p>${levelText(p)}</p>
         <div class="rh21-levelbar"><i style="width:${lp}%"></i></div>
         <div class="rh21-levelmeta">
           <span>${xp} XP</span>
           <span>${next?`${next-xp} XP до наступного рівня`:"MAX LEVEL"}</span>
         </div>
       </div>
       <div class="rh21-streak">
         <span>🔥</span><b>${p.streak}</b><small>днів streak</small>
       </div>
     </section>

     <section class="rh21-stats">
       <article><img src="/static/assets/stickers/rh.svg"><span><small>ЗАРОБЛЕНО</small><b>${p.total_earned} RH</b></span></article>
       <article><img src="/static/assets/stickers/ticket.svg"><span><small>КВИТКИ</small><b>${p.tickets}</b></span></article>
       <article><img src="/static/assets/stickers/winner.svg"><span><small>ПЕРЕМОГИ</small><b>${p.wins}</b></span></article>
       <article><div class="rh21-stat-emoji">🎮</div><span><small>МІНІІГРИ</small><b>${p.games_played}</b></span></article>
       <article><div class="rh21-stat-emoji">⚡</div><span><small>ЗАВДАННЯ</small><b>${p.tasks_completed}</b></span></article>
       <article><div class="rh21-stat-emoji">👥</div><span><small>ДРУЗІ</small><b>${p.referrals}</b></span></article>
     </section>

     <section class="rh21-grid">
       <div class="rh21-panel">
         <div class="rh21-title"><div><span>PROGRESSION</span><h2>Наступні цілі</h2></div><small>Твій шлях</small></div>
         <div class="rh21-milestones">${(p.milestones||[]).map(renderMilestone).join("")}</div>
       </div>
       <div class="rh21-panel rh21-career">
         <div class="rh21-title"><div><span>CAREER</span><h2>Статистика</h2></div><small>${p.account_age_days} днів</small></div>
         <div class="rh21-career-grid">
           <div><small>Розіграшів</small><b>${p.draws_joined}</b></div>
           <div><small>Переможних ігор</small><b>${p.games_won}</b></div>
           <div><small>RH з ігор</small><b>${p.games_earned}</b></div>
           <div><small>Досягнень</small><b>${p.achievements_unlocked}</b></div>
         </div>
       </div>
     </section>

     <section class="rh21-badges-panel">
       <div class="rh21-title"><div><span>BADGE COLLECTION</span><h2>Твої бейджі</h2></div><small>${(p.badges||[]).filter(x=>x.unlocked).length}/${(p.badges||[]).length}</small></div>
       <div class="rh21-badges">${(p.badges||[]).map(renderBadge).join("")}</div>
     </section>
   `;

   const contentNode=document.getElementById("content")||document.querySelector(".content")||document.querySelector("main");
   if(contentNode) contentNode.prepend(host);
 }

 window.profilePage=async function(){
   await originalProfilePage.apply(this,arguments);
   await inject();
 };
})();
