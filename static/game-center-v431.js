
/* ReferHub v4.3.1 — Game Center Hotfix */
(()=>{
 let data=null;
 let filter="all";
 const E=v=>typeof esc==="function"?esc(v):String(v??"");
 const cats={
   all:["Усі","◈"],
   popular:["Популярні","🔥"],
   new:["Нові","🟢"],
   casino:["Казино","🎰"],
   quick:["Швидкі","⚡"],
   skill:["Скіл","🎯"],
   risk:["Ризик","💣"]
 };

 function list(){
   if(!data)return[];
   if(filter==="all") return data.games;
   if(filter==="popular") return data.games.filter(g=>g.tag==="HOT" || Number(g.stats?.plays||0)>=5);
   if(filter==="new") return data.games.filter(g=>g.tag==="NEW");
   return data.games.filter(g=>g.category===filter);
 }

 function card(g){
   return `<button type="button" class="g431-card ${g.theme||""}" data-game="${E(g.id)}">
     <div class="g431-visual">
       ${g.tag?`<span class="g431-tag ${String(g.tag).toLowerCase()}">${E(g.tag)}</span>`:""}
       <span class="g431-icon">${g.icon}</span>
     </div>
     <div class="g431-copy">
       <h3>${E(g.name)}</h3>
       <p>${E(g.desc)}</p>
       <div><span>🏆 до ${Number(g.max_reward||0).toLocaleString("uk-UA")} RH</span><span>🎮 ${Number(g.stats?.plays||0)}</span></div>
     </div>
   </button>`;
 }

 function render(){
   const c=document.getElementById("content");
   if(!c||!data)return;
   c.innerHTML=`<main class="g431">
     <section class="g431-head">
       <div><span>GAME CENTER · 4.3.1</span><h1>Ігровий хаб</h1><p>Обери категорію та гру.</p></div>
       <article><small>BALANCE</small><b>${Number(data.balance||0).toLocaleString("uk-UA")} RH</b></article>
     </section>

     <nav class="g431-tabs" id="g431Tabs">
       ${Object.entries(cats).map(([k,v])=>`
         <button type="button" data-filter="${k}" class="${filter===k?"active":""}">
           <span>${v[1]}</span><b>${v[0]}</b>
         </button>`).join("")}
     </nav>

     <section class="g431-grid" id="g431Grid">
       ${list().map(card).join("")}
     </section>
   </main>`;

   bind();
 }

 function bind(){
   const tabs=document.getElementById("g431Tabs");
   if(tabs && !tabs.dataset.bound){
     tabs.dataset.bound="1";
     tabs.addEventListener("click",ev=>{
       const b=ev.target.closest("button[data-filter]");
       if(!b)return;
       filter=b.dataset.filter||"all";
       render();
     });
   }

   const grid=document.getElementById("g431Grid");
   if(grid && !grid.dataset.bound){
     grid.dataset.bound="1";
     grid.addEventListener("click",ev=>{
       const b=ev.target.closest("[data-game]");
       if(!b)return;
       openDetail(b.dataset.game);
     });
   }
 }

 function oldEngine(id){
   // Use the project's existing game engine only.
   if(typeof window.openGameDetail==="function"){
     return window.openGameDetail(id);
   }
   if(typeof window.openGame==="function"){
     return window.openGame(id);
   }
   if(typeof window.gamePage==="function"){
     return window.gamePage(id);
   }
   if(typeof toast==="function") toast("Ігровий engine не знайдено","error");
 }

 function openDetail(id){
   const g=data?.games.find(x=>x.id===id);
   if(!g)return;
   const c=document.getElementById("content"); if(!c)return;

   c.innerHTML=`<main class="g431-detail">
     <button type="button" class="g431-back" id="g431Back">← Назад</button>
     <section class="g431-detail-hero">
       <div class="g431-bigicon">${g.icon}</div>
       <div><span>${E(g.category).toUpperCase()}</span><h1>${E(g.name)}</h1><p>${E(g.desc)}</p></div>
       <article><small>РЕКОРД</small><b>${Number(g.stats?.best||0)} RH</b><i>${Number(g.stats?.plays||0)} ігор</i></article>
     </section>
     <section class="g431-info">
       <article><small>MAX REWARD</small><b>${Number(g.max_reward||0).toLocaleString("uk-UA")} RH</b></article>
       <article><small>ЗАРОБЛЕНО</small><b>${Number(g.stats?.earned||0)} RH</b></article>
       <article><small>ЗІГРАНО</small><b>${Number(g.stats?.plays||0)}</b></article>
     </section>
     <button type="button" class="g431-play" id="g431Play">▶ ГРАТИ</button>
   </main>`;

   document.getElementById("g431Back")?.addEventListener("click",render);
   document.getElementById("g431Play")?.addEventListener("click",()=>oldEngine(id));
 }

 async function open(){
   try{
     data=await api("/api/game-center-v43");
     render();
   }catch(err){
     if(typeof toast==="function")toast(err?.message||"Game Center не завантажився","error");
   }
 }

 window.gc431Open=open;

 // Do NOT wrap openPage repeatedly. Instead intercept only the existing Games nav click.
 function bindMainNav(){
   document.querySelectorAll('[data-page="games"],[data-nav="games"]').forEach(btn=>{
     if(btn.dataset.g431Bound)return;
     btn.dataset.g431Bound="1";
     btn.addEventListener("click",ev=>{
       ev.preventDefault();
       ev.stopImmediatePropagation();
       document.querySelectorAll("[data-page].active,[data-nav].active").forEach(x=>x.classList.remove("active"));
       btn.classList.add("active");
       open();
     },true);
   });
 }

 new MutationObserver(()=>requestAnimationFrame(bindMainNav))
   .observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener("DOMContentLoaded",bindMainNav);
 setTimeout(bindMainNav,200);
})();
