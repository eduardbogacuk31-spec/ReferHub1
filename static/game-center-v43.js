
/* ReferHub v4.3 — Game Center Rebuild */
(()=>{
 let data=null;
 let filter="all";
 const esc43=v=>typeof esc==="function"?esc(v):String(v??"");

 const cats={
   all:["Усі ігри","◈"],
   popular:["Популярні","🔥"],
   new:["Нові","🟢"],
   casino:["Казино","🎰"],
   quick:["Швидкі","⚡"],
   skill:["Скіл","🎯"],
   risk:["Ризик","💣"]
 };

 const rules={
   roulette:[
     "Обери тип ставки: число, колір або діапазон.",
     "Зроби ставку та натисни «Грати».",
     "Якщо випаде твій варіант — отримуєш нагороду."
   ],
   slot:[
     "Запусти барабани.",
     "Однакові символи дають більший множник.",
     "Результат фіксується після кожного спіну."
   ],
   coin_flip:[
     "Обери орел або решка.",
     "Підтверди гру.",
     "Вгадав — отримуєш нагороду."
   ],
   dice_duel:[
     "Запусти кидок кубиків.",
     "Чим кращий результат — тим більша нагорода.",
     "Рекорд зберігається у статистиці."
   ],
   reaction:[
     "Натисни старт і дочекайся сигналу.",
     "Тисни якнайшвидше після зміни стану.",
     "Чим менше мс — тим кращий результат."
   ],
   mines:[
     "Відкривай клітинки без міни.",
     "Кожна безпечна клітинка збільшує потенційну нагороду.",
     "Зупинись вчасно або ризикуй далі."
   ],
   number_guess:[
     "Система загадує число.",
     "Вводь варіанти й отримуй підказки.",
     "Менше спроб — кращий результат."
   ],
   safe_crack:[
     "Підбирай правильний код.",
     "Використовуй підказки системи.",
     "Відкрий сейф до завершення спроб."
   ],
   scratch:[
     "Запусти скретч-картку.",
     "Відкрий поле.",
     "Нагорода залежить від результату картки."
   ],
   treasure_grid:[
     "Обирай клітинки на полі.",
     "Шукай скарб і уникай пасток.",
     "Можеш забрати нагороду раніше."
   ],
   rps:[
     "Обери камінь, ножиці або папір.",
     "Бот робить свій вибір.",
     "Перемога дає RH."
   ]
 };

 function filtered(){
   if(!data)return[];
   if(filter==="all")return data.games;
   if(filter==="popular")return data.games.filter(g=>g.stats.plays>=5 || g.tag==="HOT");
   if(filter==="new")return data.games.filter(g=>g.tag==="NEW");
   return data.games.filter(g=>g.category===filter);
 }

 function gameCard(g){
   return `<article class="gc43-card ${g.theme}" onclick="gc43OpenGame('${g.id}')">
     <div class="gc43-visual">
       <div class="gc43-glow"></div>
       ${g.tag?`<span class="gc43-tag ${g.tag.toLowerCase()}">${g.tag}</span>`:""}
       <div class="gc43-icon">${g.icon}</div>
       <small>${esc43(cats[g.category]?.[0]||"GAME")}</small>
     </div>
     <div class="gc43-body">
       <h3>${esc43(g.name)}</h3>
       <p>${esc43(g.desc)}</p>
       <div class="gc43-row">
         <span>🏆 до ${Number(g.max_reward).toLocaleString("uk-UA")} RH</span>
         <span>🎮 ${g.stats.plays}</span>
       </div>
     </div>
   </article>`;
 }

 function render(){
   const c=document.getElementById("content"); if(!c||!data)return;
   const list=filtered();
   c.innerHTML=`<main class="gc43">
     <section class="gc43-wallet">
       <div>
         <small>МІЙ БАЛАНС</small>
         <b>${Number(data.balance||0).toLocaleString("uk-UA")} RH</b>
         <span>✦ ReferHub Stars</span>
       </div>
       <div class="gc43-wallet-art">◈</div>
     </section>

     <section class="gc43-head">
       <div><span>GAME CENTER · v4.3</span><h1>Ігровий хаб</h1><p>Обирай гру, дивись рекорди та грай без довгих списків.</p></div>
       <section><small>РАУНДІВ</small><b>${data.total_plays}</b><i>${data.total_earned} RH зароблено</i></section>
     </section>

     <nav class="gc43-cats">
       ${Object.entries(cats).map(([k,v])=>`<button class="${filter===k?"active":""}" onclick="gc43Filter('${k}')"><span>${v[1]}</span><b>${v[0]}</b></button>`).join("")}
     </nav>

     <section class="gc43-grid">
       ${list.map(gameCard).join("")}
     </section>

     <button class="gc43-history-btn" onclick="gc43History()"><span>↶</span><div><small>HISTORY</small><b>Історія моїх ігор</b></div><i>→</i></button>
   </main>`;
 }

 async function open(){
   try{data=await api("/api/game-center-v43");render()}
   catch(err){toast(err.message||"Не вдалося завантажити Game Center","error")}
 }

 window.gc43Open=open;
 window.gc43Filter=k=>{filter=k;render()};

 window.gc43OpenGame=id=>{
   const g=data?.games.find(x=>x.id===id); if(!g)return;
   const c=document.getElementById("content"); if(!c)return;
   const recent=data.recent.filter(x=>x.game_key===id).slice(0,6);

   c.innerHTML=`<main class="gc43-detail">
     <button class="gc43-back" onclick="gc43Open()">← Game Center</button>
     <section class="gc43-detail-hero ${g.theme}">
       <div class="gc43-detail-icon">${g.icon}</div>
       <div>
         <span>${g.tag||"GAME"}</span>
         <h1>${esc43(g.name)}</h1>
         <p>${esc43(g.desc)}</p>
       </div>
       <section>
         <small>МІЙ РЕКОРД</small>
         <b>${g.stats.best} RH</b>
         <i>${g.stats.plays} ігор зіграно</i>
       </section>
     </section>

     <section class="gc43-detail-grid">
       <article class="gc43-rules">
         <header><span>?</span><div><small>HOW TO PLAY</small><h2>Як грати</h2></div></header>
         <ol>${(rules[id]||["Запусти гру.","Виконай умову.","Отримай результат."]).map((x,i)=>`<li><b>${i+1}</b><span>${esc43(x)}</span></li>`).join("")}</ol>
       </article>

       <article class="gc43-statbox">
         <header><small>MY STATS</small><h2>Статистика</h2></header>
         <div><span>Зіграно</span><b>${g.stats.plays}</b></div>
         <div><span>Зароблено</span><b>${g.stats.earned} RH</b></div>
         <div><span>Рекорд</span><b>${g.stats.best} RH</b></div>
         <div><span>Макс. нагорода</span><b>${g.max_reward} RH</b></div>
       </article>
     </section>

     <section class="gc43-recent">
       <header><div><small>RECENT</small><h2>Останні раунди</h2></div></header>
       <div>${recent.length?recent.map(x=>`<article><span>${x.reward>0?"✦":"•"}</span><b>${x.reward>=0?"+":""}${x.reward} RH</b></article>`).join(""):`<p>У цій грі ще немає історії.</p>`}</div>
     </section>

     <button class="gc43-play" onclick="openGameDetail('${id}')"><span>▶</span><b>ГРАТИ В ${esc43(g.name).toUpperCase()}</b><i>→</i></button>
   </main>`;
 };

 window.gc43History=()=>{
   const c=document.getElementById("content"); if(!c)return;
   c.innerHTML=`<main class="gc43-history">
     <button class="gc43-back" onclick="gc43Open()">← Game Center</button>
     <section class="gc43-history-head"><span>HISTORY</span><h1>Останні ігри</h1><p>Твої останні результати з усіх мініігор.</p></section>
     <section class="gc43-history-list">
      ${data.recent.length?data.recent.map(x=>{
       const g=data.games.find(y=>y.id===x.game_key);
       return `<article><span>${g?.icon||"🎮"}</span><div><b>${esc43(g?.name||x.game_key)}</b><small>${new Date(x.created_at*1000).toLocaleString("uk-UA")}</small></div><strong>${x.reward>=0?"+":""}${x.reward} RH</strong></article>`
      }).join(""):`<div class="gc43-empty">Історія поки порожня</div>`}
     </section>
   </main>`;
 };

 // Safe route replacement only for Games.
 function install(){
   if(window.__gc43Installed || typeof window.openPage!=="function")return;
   window.__gc43Installed=true;
   const old=window.openPage;
   window.openPage=async function(page,...args){
     if(page==="games") return open();
     return old.call(this,page,...args);
   };
 }
 document.addEventListener("DOMContentLoaded",install);
 setTimeout(install,120);
 setTimeout(install,700);
})();
