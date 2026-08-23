
/* ReferHub v4.6 — Admin Center */
(()=>{
 let A={tab:"overview",dashboard:null,users:[],tasks:[],games:[],orders:[],lotteries:[],logs:[],referrals:[]};
 const E=v=>typeof esc==="function"?esc(v):String(v??"");
 const C=()=>document.getElementById("content");

 function time(ts){
   if(!ts)return "—";
   try{return new Date(Number(ts)*1000).toLocaleString("uk-UA")}catch(_){return "—"}
 }

 function nav(){
   return `<nav class="a46-tabs">
    ${[
      ["overview","⌂","Огляд"],["users","👥","Учасники"],["tasks","📋","Завдання"],
      ["games","🎮","Ігри"],["orders","📦","Замовлення"],["lottery","🎟️","Лотерея"],["logs","≡","Логи"]
    ].map(([k,i,n])=>`<button class="${A.tab===k?"active":""}" onclick="admin46Tab('${k}')"><span>${i}</span><b>${n}</b></button>`).join("")}
   </nav>`;
 }

 function shell(body){
   const d=A.dashboard||{};
   return `<section class="a46">
     <header class="a46-hero">
       <div><span>REFERHUB CONTROL · v4.6</span><h1>Admin Center</h1><p>Повне керування ботом в одному місці.</p></div>
       <article><small>КОРИСТУВАЧІ</small><b>${Number(d.total_users||0)}</b><i>${Number(d.active_today||0)} активні сьогодні</i></article>
     </header>
     ${nav()}
     <main class="a46-body">${body}</main>
   </section>`;
 }

 function stat(icon,label,value,note=""){
   return `<article class="a46-stat"><span>${icon}</span><div><small>${label}</small><b>${value}</b>${note?`<i>${note}</i>`:""}</div></article>`;
 }

 async function loadBase(){
   const [dashboard,summary]=await Promise.all([
     api("/api/admin/dashboard"),
     api("/api/admin/summary").catch(()=>({}))
   ]);
   A.dashboard={...dashboard,...summary};
 }

 async function overview(){
   const d=A.dashboard||{};
   const referrals=await api("/api/admin/referrals-top").catch(()=>[]);
   A.referrals=Array.isArray(referrals)?referrals:[];
   return `<section class="a46-overview">
     <div class="a46-stats">
       ${stat("👥","УСЬОГО УЧАСНИКІВ",Number(d.total_users||0),`${Number(d.active_week||0)} активні за 7 днів`)}
       ${stat("✦","RH В ОБІГУ",Number(d.total_balance||0).toLocaleString("uk-UA"),`+${Number(d.issued_today||0)} сьогодні`)}
       ${stat("🎮","ІГРОВИХ РАУНДІВ",Number(d.total_games||0),`${Number(d.active_tasks||0)} активних завдань`)}
       ${stat("📦","ЗАМОВЛЕННЯ",Number(d.pending_orders||0),"очікують обробки")}
     </div>

     <section class="a46-section">
       <header><div><span>QUICK CONTROL</span><h2>Швидкі дії</h2></div></header>
       <div class="a46-quick">
         <button onclick="admin46Tab('users')"><span>👥</span><b>Керувати учасниками</b><i>→</i></button>
         <button onclick="admin46Tab('tasks')"><span>＋</span><b>Створити завдання</b><i>→</i></button>
         <button onclick="admin46Tab('games')"><span>🎮</span><b>Налаштувати ігри</b><i>→</i></button>
         <button onclick="admin46Tab('lottery')"><span>🎟️</span><b>Новий розіграш</b><i>→</i></button>
       </div>
     </section>

     <section class="a46-section">
       <header><div><span>TOP REFERRALS</span><h2>Топ по запрошеннях</h2></div></header>
       <div class="a46-list">
         ${A.referrals.length?A.referrals.slice(0,8).map((x,i)=>`
          <article><span class="a46-rank">${i+1}</span><div><b>${E(x.first_name||x.username||"Користувач")}</b><small>${x.username?"@"+E(x.username):"ID "+x.telegram_id}</small></div><strong>${Number(x.referrals_count||0)} 👥</strong></article>
         `).join(""):`<div class="a46-empty">Поки немає даних</div>`}
       </div>
     </section>
   </section>`;
 }

 async function users(){
   A.users=await api("/api/admin/users?limit=100");
   return `<section class="a46-section">
     <header><div><span>USER MANAGEMENT</span><h2>Учасники</h2></div><small>${A.users.length} завантажено</small></header>
     <div class="a46-search"><span>⌕</span><input id="a46UserSearch" placeholder="Ім’я, @username або Telegram ID" oninput="admin46FilterUsers(this.value)"></div>
     <div id="a46Users" class="a46-users">
       ${A.users.map(userCard).join("")}
     </div>
   </section>`;
 }

 function userCard(u){
   return `<article class="a46-user" data-search="${E(`${u.first_name||""} ${u.username||""} ${u.telegram_id}`.toLowerCase())}" onclick="openAdminUser(${u.telegram_id})">
     <div class="a46-avatar">${E((u.first_name||u.username||"U").slice(0,1).toUpperCase())}</div>
     <div><b>${E(u.first_name||u.username||"Користувач")}</b><small>${u.username?"@"+E(u.username):"ID "+u.telegram_id} · ${Number(u.balance||0)} RH</small></div>
     <span class="${u.is_banned?"bad":"good"}">${u.is_banned?"BANNED":(u.is_online?"ONLINE":"ACTIVE")}</span>
     <button>КЕРУВАТИ →</button>
   </article>`;
 }

 async function tasks(){
   A.tasks=await api("/api/admin/tasks");
   return `<section class="a46-section">
     <header><div><span>TASK CONTROL</span><h2>Завдання</h2></div><button class="a46-primary" onclick="admin46ToggleCreator()">＋ НОВЕ</button></header>
     <div id="a46TaskCreator" class="a46-form" hidden>
       <input id="a46TaskTitle" placeholder="Назва завдання">
       <textarea id="a46TaskDesc" placeholder="Опис"></textarea>
       <div class="a46-form-grid"><input id="a46TaskReward" type="number" value="10" min="0" placeholder="RH"><input id="a46TaskIcon" value="⭐" placeholder="Іконка"></div>
       <select id="a46TaskType"><option value="visit">Перехід + таймер</option><option value="telegram_member">Підписка Telegram</option><option value="referral">Реферал</option><option value="instant">Миттєве</option></select>
       <input id="a46TaskLink" placeholder="Посилання">
       <div class="a46-form-grid"><input id="a46TaskChat" placeholder="@channel / chat_id"><input id="a46TaskWait" type="number" value="5" min="0" placeholder="Очікування сек."></div>
       <button class="a46-primary full" onclick="admin46CreateTask()">СТВОРИТИ</button>
     </div>
     <div class="a46-cardgrid">
      ${A.tasks.map(t=>`<article class="a46-task">
       <div class="a46-bigicon">${E(t.icon||"⭐")}</div>
       <div><small>${E(t.verification_type||"task")}</small><h3>${E(t.title)}</h3><p>${E(t.description||"")}</p><span>+${Number(t.reward||0)} RH · ${Number(t.claims_count||0)} виконань</span></div>
       <button class="${t.is_active?"danger":"success"}" onclick="event.stopPropagation();admin46ToggleTask(${t.id},${t.is_active?1:0})">${t.is_active?"ВИМКНУТИ":"УВІМКНУТИ"}</button>
      </article>`).join("")}
     </div>
   </section>`;
 }

 async function games(){
   A.games=await api("/api/admin/games");
   return `<section class="a46-section">
     <header><div><span>GAME CONTROL</span><h2>Ігри</h2></div><small>${A.games.length} режимів</small></header>
     <div class="a46-games">
       ${A.games.map(g=>`<article class="a46-game">
        <header><div><span>🎮</span><div><small>${E(g.game_key)}</small><h3>${E(typeof gameName==="function"?gameName(g.game_key):g.game_key)}</h3></div></div><b class="${g.is_active?"good":"bad"}">${g.is_active?"ACTIVE":"OFF"}</b></header>
        <div class="a46-game-fields">
          <label>Денний ліміт<input id="a46limit-${E(g.game_key)}" type="number" value="${Number(g.daily_limit||0)}"></label>
          <label>Cooldown, сек<input id="a46cool-${E(g.game_key)}" type="number" value="${Number(g.cooldown_seconds||0)}"></label>
          <label>Мін. ставка<input id="a46min-${E(g.game_key)}" type="number" value="${Number(g.min_bet||0)}"></label>
          <label>Макс. ставка<input id="a46max-${E(g.game_key)}" type="number" value="${Number(g.max_bet||0)}"></label>
        </div>
        <div class="a46-game-actions">
          <button onclick="admin46SaveGame('${E(g.game_key)}')">ЗБЕРЕГТИ</button>
          <button class="${g.is_active?"danger":"success"}" onclick="admin46GameActive('${E(g.game_key)}',${g.is_active?0:1})">${g.is_active?"ВИМКНУТИ":"УВІМКНУТИ"}</button>
        </div>
       </article>`).join("")}
     </div>
   </section>`;
 }

 async function orders(){
   A.orders=await api("/api/admin/orders");
   return `<section class="a46-section">
     <header><div><span>ORDER CENTER</span><h2>Замовлення</h2></div><small>${A.orders.length} записів</small></header>
     <div class="a46-list">
       ${A.orders.length?A.orders.map(o=>`<article class="a46-order">
        <span>${E(o.gift_emoji||o.emoji||"📦")}</span>
        <div><b>#${o.id} · ${E(o.gift_title||o.title||"Замовлення")}</b><small>${E(o.first_name||"Користувач")} · ${Number(o.price||0)} RH · ${time(o.created_at)}</small></div>
        <strong class="status-${E(o.status||"pending")}">${E(o.status||"pending")}</strong>
        <select onchange="admin46Order(${o.id},this.value)"><option value="">Статус…</option><option value="pending">pending</option><option value="processing">processing</option><option value="completed">completed</option><option value="cancelled">cancelled</option></select>
       </article>`).join(""):`<div class="a46-empty">Замовлень немає</div>`}
     </div>
   </section>`;
 }

 async function lottery(){
   A.lotteries=await api("/api/lotteries").catch(()=>[]);
   const list=Array.isArray(A.lotteries)?A.lotteries:(A.lotteries?.lotteries||[]);
   return `<section class="a46-section">
     <header><div><span>LOTTERY CONTROL</span><h2>Розіграші</h2></div></header>
     <div class="a46-form">
       <input id="a46LotTitle" placeholder="Назва розіграшу">
       <textarea id="a46LotDesc" placeholder="Опис"></textarea>
       <div class="a46-form-grid"><input id="a46LotPrize" placeholder="Назва призу"><input id="a46LotEmoji" value="🎁" placeholder="Emoji"></div>
       <div class="a46-form-grid"><input id="a46LotPrice" type="number" value="10" min="1" placeholder="Ціна білета"><input id="a46LotHours" type="number" value="24" min="1" placeholder="Тривалість, год"></div>
       <button class="a46-primary full" onclick="admin46CreateLottery()">＋ СТВОРИТИ РОЗІГРАШ</button>
     </div>
     <div class="a46-list a46-lot-list">
       ${list.length?list.map(l=>`<article>
        <span>🎟️</span><div><b>${E(l.title||"Розіграш")}</b><small>#${l.id} · ${E(l.status||"active")} · ${Number(l.ticket_price||0)} RH/білет</small></div>
        <button onclick="admin46DrawLottery(${l.id})">РОЗІГРАТИ</button>
       </article>`).join(""):`<div class="a46-empty">Активних розіграшів немає</div>`}
     </div>
   </section>`;
 }

 async function logs(){
   A.logs=await api("/api/admin/logs?limit=100");
   return `<section class="a46-section">
     <header><div><span>AUDIT LOG</span><h2>Журнал дій</h2></div><button onclick="admin46Tab('logs')">↻ ОНОВИТИ</button></header>
     <div class="a46-logs">
       ${A.logs.length?A.logs.map(l=>`<article><span>•</span><div><b>${E(l.action||l.action_type||"Admin action")}</b><p>${E(l.details||l.description||l.note||"")}</p><small>${time(l.created_at)}${l.admin_id?" · admin "+l.admin_id:""}</small></div></article>`).join(""):`<div class="a46-empty">Логів немає</div>`}
     </div>
   </section>`;
 }

 const loaders={overview,users,tasks,games,orders,lottery,logs};

 window.adminCenter46=async function(){
   const c=C(); if(!c)return;
   c.innerHTML='<div class="loader"></div>';
   try{
     await loadBase();
     const body=await loaders[A.tab]();
     c.innerHTML=shell(body);
     document.querySelector("main")?.scrollTo({top:0,behavior:"auto"});
   }catch(error){
     c.innerHTML=`<section class="a46-error"><span>⚠️</span><h2>Admin Center не завантажився</h2><p>${E(error.message)}</p><button onclick="adminCenter46()">Спробувати ще раз</button></section>`;
   }
 };

 window.admin46Tab=async function(tab){
   A.tab=tab;
   const c=C(); if(c)c.innerHTML='<div class="loader"></div>';
   try{
     const body=await loaders[tab]();
     c.innerHTML=shell(body);
     document.querySelector("main")?.scrollTo({top:0,behavior:"auto"});
   }catch(error){toast(error.message,"error")}
 };

 window.admin46FilterUsers=q=>{
   q=String(q||"").trim().toLowerCase();
   document.querySelectorAll(".a46-user").forEach(x=>x.hidden=q&&!x.dataset.search.includes(q));
 };

 window.admin46ToggleCreator=()=>{
   const el=document.getElementById("a46TaskCreator"); if(el)el.hidden=!el.hidden;
 };

 window.admin46CreateTask=async()=>{
   try{
     await api("/api/admin/tasks",{method:"POST",body:JSON.stringify({
       title:(document.getElementById("a46TaskTitle")?.value||"").trim(),
       description:(document.getElementById("a46TaskDesc")?.value||"").trim(),
       reward:Number(document.getElementById("a46TaskReward")?.value||0),
       icon:(document.getElementById("a46TaskIcon")?.value||"⭐").trim(),
       category:"other",
       verification_type:document.getElementById("a46TaskType")?.value||"visit",
       link:(document.getElementById("a46TaskLink")?.value||"").trim()||null,
       telegram_chat_id:(document.getElementById("a46TaskChat")?.value||"").trim()||null,
       wait_seconds:Number(document.getElementById("a46TaskWait")?.value||0),
       sort_order:0,max_claims:0,starts_at:0,ends_at:0
     })});
     toast("Завдання створено","success"); await admin46Tab("tasks");
   }catch(e){toast(e.message,"error")}
 };

 window.admin46ToggleTask=async(id,active)=>{
   try{
     if(active)await api(`/api/admin/tasks/${id}`,{method:"DELETE"});
     else await api(`/api/admin/tasks/${id}/restore`,{method:"POST"});
     toast(active?"Завдання вимкнено":"Завдання увімкнено","success");
     await admin46Tab("tasks");
   }catch(e){toast(e.message,"error")}
 };

 window.admin46SaveGame=async key=>{
   try{
     await api(`/api/admin/games/${encodeURIComponent(key)}`,{method:"PATCH",body:JSON.stringify({
       daily_limit:Number(document.getElementById(`a46limit-${key}`)?.value||0),
       cooldown_seconds:Number(document.getElementById(`a46cool-${key}`)?.value||0),
       min_bet:Number(document.getElementById(`a46min-${key}`)?.value||0),
       max_bet:Number(document.getElementById(`a46max-${key}`)?.value||0)
     })});
     toast("Налаштування гри збережено","success");
   }catch(e){toast(e.message,"error")}
 };

 window.admin46GameActive=async(key,enabled)=>{
   try{
     await api(`/api/admin/games/${encodeURIComponent(key)}`,{method:"PATCH",body:JSON.stringify({is_active:Boolean(enabled)})});
     toast(enabled?"Гру увімкнено":"Гру вимкнено","success"); await admin46Tab("games");
   }catch(e){toast(e.message,"error")}
 };

 window.admin46Order=async(id,status)=>{
   if(!status)return;
   try{
     await api(`/api/admin/orders/${id}`,{method:"PATCH",body:JSON.stringify({status,notify_user:true})});
     toast("Статус замовлення оновлено","success"); await admin46Tab("orders");
   }catch(e){toast(e.message,"error")}
 };

 window.admin46CreateLottery=async()=>{
   const now=Math.floor(Date.now()/1000);
   const hours=Math.max(1,Number(document.getElementById("a46LotHours")?.value||24));
   try{
     await api("/api/admin/lotteries",{method:"POST",body:JSON.stringify({
       title:(document.getElementById("a46LotTitle")?.value||"").trim(),
       description:(document.getElementById("a46LotDesc")?.value||"").trim(),
       prize_name:(document.getElementById("a46LotPrize")?.value||"").trim(),
       prize_emoji:(document.getElementById("a46LotEmoji")?.value||"🎁").trim(),
       ticket_price:Number(document.getElementById("a46LotPrice")?.value||10),
       starts_at:now,ends_at:now+hours*3600
     })});
     toast("Розіграш створено","success"); await admin46Tab("lottery");
   }catch(e){toast(e.message,"error")}
 };

 window.admin46DrawLottery=async id=>{
   if(!confirm("Провести розіграш зараз?"))return;
   try{
     await api(`/api/admin/lotteries/${id}/draw`,{method:"POST"});
     toast("Переможця визначено","success"); await admin46Tab("lottery");
   }catch(e){toast(e.message,"error")}
 };
})();
