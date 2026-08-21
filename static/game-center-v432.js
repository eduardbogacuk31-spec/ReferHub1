
/* ReferHub v4.3.2 — Game Center Repair */
(()=>{
 let data=null, filter="all";
 const E=v=>typeof esc==="function"?esc(v):String(v??"");
 const cats={all:["Усі","◈"],popular:["Популярні","🔥"],new:["Нові","🟢"],casino:["Казино","🎰"],quick:["Швидкі","⚡"],skill:["Скіл","🎯"],risk:["Ризик","💣"]};

 const art=id=>`/static/assets/game-v432/${encodeURIComponent(id)}.svg`;

 function currentGames(){
   if(!data)return[];
   if(filter==="all")return data.games;
   if(filter==="popular")return data.games.filter(g=>g.tag==="HOT"||Number(g.stats?.plays||0)>=5);
   if(filter==="new")return data.games.filter(g=>g.tag==="NEW");
   return data.games.filter(g=>g.category===filter);
 }

 function cleanGlobal(page){
   document.body.classList.toggle("rh432-games-mode",page==="games");
   if(page==="games"){
     document.querySelectorAll(".rh42-dashboard,.rh30,.rh29-shell,.rh29-detail").forEach(el=>el.remove());
   }
 }

 function card(g){
   return `<button type="button" class="g432-card" data-game="${E(g.id)}">
      <div class="g432-art">
        <img src="${art(g.id)}" alt="${E(g.name)}" loading="lazy">
        ${g.tag?`<span class="g432-tag ${String(g.tag).toLowerCase()}">${E(g.tag)}</span>`:""}
      </div>
      <div class="g432-copy">
        <h3>${E(g.name)}</h3>
        <p>${E(g.desc)}</p>
        <div><span>до ${Number(g.max_reward||0).toLocaleString("uk-UA")} RH</span><span>🎮 ${Number(g.stats?.plays||0)}</span></div>
      </div>
   </button>`;
 }

 function render(){
   const c=document.getElementById("content");if(!c||!data)return;
   cleanGlobal("games");
   c.innerHTML=`<main class="g432">
     <section class="g432-head">
       <div><span>GAME CENTER · 4.3.2</span><h1>Ігри</h1><p>Обирай гру — тепер без зайвих блоків головної.</p></div>
       <article><small>RH BALANCE</small><b>${Number(data.balance||0).toLocaleString("uk-UA")}</b></article>
     </section>
     <nav class="g432-tabs" id="g432Tabs">
       ${Object.entries(cats).map(([k,v])=>`<button type="button" data-filter="${k}" class="${filter===k?"active":""}"><span>${v[1]}</span><b>${v[0]}</b></button>`).join("")}
     </nav>
     <section class="g432-grid" id="g432Grid">${currentGames().map(card).join("")}</section>
   </main>`;
   bind();
   const main=document.querySelector("body > main"); if(main) main.scrollTop=0;
 }

 function bind(){
   document.getElementById("g432Tabs")?.addEventListener("click",ev=>{
     const b=ev.target.closest("[data-filter]"); if(!b)return;
     filter=b.dataset.filter||"all"; render();
   });
   document.getElementById("g432Grid")?.addEventListener("click",ev=>{
     const b=ev.target.closest("[data-game]"); if(!b)return;
     openDetail(b.dataset.game);
   });
 }

 function engine(id){
   if(typeof window.openGameDetail==="function") return window.openGameDetail(id);
   if(typeof window.openGame==="function") return window.openGame(id);
   if(typeof window.gamePage==="function") return window.gamePage(id);
   toast?.("Не вдалося відкрити гру","error");
 }

 function openDetail(id){
   const g=data?.games.find(x=>x.id===id); if(!g)return;
   const c=document.getElementById("content"); if(!c)return;
   c.innerHTML=`<main class="g432-detail">
      <button class="g432-back" id="g432Back">← Ігри</button>
      <section class="g432-detail-top">
        <img src="${art(g.id)}" alt="${E(g.name)}">
        <div><span>${E(g.category).toUpperCase()}</span><h1>${E(g.name)}</h1><p>${E(g.desc)}</p></div>
      </section>
      <section class="g432-stats">
        <article><small>ЗІГРАНО</small><b>${Number(g.stats?.plays||0)}</b></article>
        <article><small>ЗАРОБЛЕНО</small><b>${Number(g.stats?.earned||0)} RH</b></article>
        <article><small>РЕКОРД</small><b>${Number(g.stats?.best||0)} RH</b></article>
      </section>
      <button class="g432-play" id="g432Play">▶ ГРАТИ</button>
   </main>`;
   document.getElementById("g432Back")?.addEventListener("click",render);
   document.getElementById("g432Play")?.addEventListener("click",()=>engine(id));
   const main=document.querySelector("body > main"); if(main) main.scrollTop=0;
 }

 async function open(){
   cleanGlobal("games");
   try{
     data=await api("/api/game-center-v43");
     render();
   }catch(err){
     toast?.(err?.message||"Game Center не завантажився","error");
   }
 }
 window.gc432Open=open;

 // Bind only Games nav. No openPage wrapping.
 function bindNav(){
   document.querySelectorAll('[data-page="games"],[data-nav="games"]').forEach(btn=>{
     if(btn.dataset.g432)return;
     btn.dataset.g432="1";
     btn.addEventListener("click",ev=>{
       ev.preventDefault();
       ev.stopImmediatePropagation();
       document.querySelectorAll("[data-page].active,[data-nav].active").forEach(x=>x.classList.remove("active"));
       btn.classList.add("active");
       open();
     },true);
   });
 }
 new MutationObserver(()=>requestAnimationFrame(bindNav)).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener("DOMContentLoaded",bindNav);
 setTimeout(bindNav,250);
})();
