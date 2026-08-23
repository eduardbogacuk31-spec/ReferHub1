
(()=>{
 const FAVORITES_KEY="rh_game_favorites_v417";
 const RECENT_KEY="rh_game_recent_v417";
 const CATALOG=[
   ["roulette","Рулетка","casino","🎡"],["daily_case","Daily Case","daily","🎁"],["slot","Слоти","casino","🎰"],
   ["coin_flip","Coin Flip","quick","🪙"],["number_guess","Вгадай число","logic","🔢"],["scratch","Scratch","daily","🎫"],
   ["safe_crack","Злам сейфа","logic","🔐"],["dice_duel","Dice Duel","quick","🎲"],["rps","RPS Arena","quick","✊"],
   ["treasure_grid","Treasure Grid","risk","🧭"],["reaction","Reaction","skill","⚡"],["color_pick","Color Pick","quick","🎨"],
   ["high_low","High / Low","quick","↕️"],["lucky_card","Lucky Card","casino","🃏"],["triple_pick","Triple Pick","risk","🔺"]
 ].map(([id,name,type,icon])=>({id,name,type,icon}));

 const read=k=>{try{return JSON.parse(localStorage.getItem(k)||"[]")}catch(_){return[]}};
 const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
 const favorites=()=>read(FAVORITES_KEY);
 const recent=()=>read(RECENT_KEY);

 function todayIndex(){
   const d=new Date(),start=new Date(d.getFullYear(),0,0);
   return Math.floor((d-start)/86400000)%CATALOG.length;
 }
 const gameOfDay=()=>CATALOG[todayIndex()];

 function markRecent(id){
   let list=recent().filter(x=>x!==id);
   list.unshift(id);
   write(RECENT_KEY,list.slice(0,5));
 }

 window.gc417ToggleFavorite=(id,event)=>{
   event?.stopPropagation?.();
   let list=favorites();
   if(list.includes(id))list=list.filter(x=>x!==id); else list.unshift(id);
   write(FAVORITES_KEY,list);
   decorate();
 };

 window.gc417Open=id=>{
   markRecent(id);
   if(typeof openGameDetail==="function")openGameDetail(id);
   setTimeout(decorate,80);
 };

 window.gc417Search=q=>{
   q=String(q||"").trim().toLowerCase();
   document.querySelectorAll(".gc433-card").forEach(card=>{
     const name=(card.dataset.gameName||card.textContent||"").toLowerCase();
     card.hidden=Boolean(q&&!name.includes(q));
   });
 };

 window.gc417FilterMode=mode=>{
   document.querySelectorAll(".gc417-mode button").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
   const fav=favorites(),rec=recent();
   document.querySelectorAll(".gc433-card").forEach(card=>{
     const id=card.dataset.gameId;
     card.hidden=mode==="favorites"?!fav.includes(id):mode==="recent"?!rec.includes(id):false;
   });
 };

 function addToolbar(shell){
   if(shell.querySelector(".gc417-toolbar"))return;
   const tabs=shell.querySelector(".gc433-tabs"); if(!tabs)return;
   const got=gameOfDay();
   const block=document.createElement("section");
   block.className="gc417-toolbar";
   block.innerHTML=`
     <article class="gc417-daily">
       <span>${got.icon}</span>
       <div><small>GAME OF THE DAY</small><b>${got.name}</b><p>Сьогодні рекомендуємо саме цю гру.</p></div>
       <button onclick="gc417Open('${got.id}')">ГРАТИ →</button>
     </article>
     <div class="gc417-controls">
       <div class="gc417-search"><span>⌕</span><input placeholder="Знайти гру..." oninput="gc417Search(this.value)"></div>
       <nav class="gc417-mode">
         <button class="active" data-mode="all" onclick="gc417FilterMode('all')">Усі</button>
         <button data-mode="favorites" onclick="gc417FilterMode('favorites')">★ Улюблені</button>
         <button data-mode="recent" onclick="gc417FilterMode('recent')">↻ Недавні</button>
       </nav>
     </div>`;
   tabs.insertAdjacentElement("afterend",block);
 }

 function decorateCards(){
   const fav=favorites();
   document.querySelectorAll(".gc433-card").forEach(card=>{
     const id=card.dataset.gameId;if(!id)return;
     if(card.dataset.gc417!=="1"){card.dataset.gc417="1";card.onclick=()=>gc417Open(id)}
     card.classList.toggle("gc417-favorite",fav.includes(id));
     const art=card.querySelector(".gc433-art");
     if(art&&!art.querySelector(".gc417-fav")){
       const b=document.createElement("button");b.type="button";b.className="gc417-fav";b.innerHTML="★";
       b.onclick=e=>gc417ToggleFavorite(id,e);art.appendChild(b);
     }
     if(!card.querySelector(".gc417-play")){
       const copy=card.querySelector(".gc433-copy");
       if(copy){
         const quick=document.createElement("button");quick.type="button";quick.className="gc417-play";quick.textContent="▶";
         quick.onclick=e=>{e.stopPropagation();gc417Open(id)};copy.appendChild(quick);
       }
     }
   });
 }

 function addRecentRow(shell){
   let host=shell.querySelector(".gc417-recent");
   const ids=recent();
   if(!ids.length){host?.remove();return}
   if(!host){
     host=document.createElement("section");host.className="gc417-recent";
     shell.querySelector(".gc433-grid")?.insertAdjacentElement("beforebegin",host);
   }
   host.innerHTML=`<header><div><span>CONTINUE PLAYING</span><b>Недавні ігри</b></div></header>
     <div>${ids.map(id=>{const g=CATALOG.find(x=>x.id===id);return g?`<button onclick="gc417Open('${g.id}')"><span>${g.icon}</span><b>${g.name}</b><i>→</i></button>`:""}).join("")}</div>`;
 }

 function decorateDetail(){
   const page=document.querySelector(".gc14-page");if(!page)return;
   if(page.querySelector(".gc417-detail-tip"))return;
   const shell=page.querySelector(".gc14-game-shell");if(!shell)return;
   const tip=document.createElement("section");tip.className="gc417-detail-tip";
   tip.innerHTML='<span>✦</span><div><small>QUICK TIP</small><b>Результат фіксується сервером</b><p>Ліміт та cooldown залежать від конкретної гри.</p></div>';
   shell.insertAdjacentElement("beforebegin",tip);
 }

 function decorate(){
   const shell=document.querySelector(".gc433-shell");
   if(shell){addToolbar(shell);decorateCards();addRecentRow(shell)}
   decorateDetail();
 }

 document.addEventListener("DOMContentLoaded",decorate);
 document.addEventListener("click",()=>setTimeout(decorate,50));
 setTimeout(decorate,500);
})();
