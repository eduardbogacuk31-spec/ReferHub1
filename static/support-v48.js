
/* ReferHub v4.8 — Support & Feedback Center */
(()=>{
 const E=v=>typeof esc==="function"?esc(v):String(v??"");
 const statusName={open:"Відкрите",in_progress:"В роботі",resolved:"Вирішено",closed:"Закрито"};
 const catName={question:"Питання",bug:"Баг",idea:"Пропозиція",complaint:"Скарга",other:"Інше"};
 let tickets=[];

 function supportModal(inner){
   let o=document.getElementById("support48Overlay");
   if(!o){
     o=document.createElement("div");
     o.id="support48Overlay";
     o.className="support48-overlay";
     document.body.appendChild(o);
   }
   o.innerHTML=`<section class="support48-modal">${inner}</section>`;
   o.classList.add("show");
 }

 window.support48Close=()=>{
   document.getElementById("support48Overlay")?.classList.remove("show");
 };

 async function loadMine(){
   tickets=await api("/api/support-v48");
   return tickets;
 }

 function ticketCard(t){
   return `<article class="support48-ticket" onclick="support48View(${t.id})">
     <div class="support48-ticket-icon">${t.category==="bug"?"🐞":t.category==="idea"?"💡":t.category==="complaint"?"⚠️":"💬"}</div>
     <div>
       <small>${E(catName[t.category]||t.category)}</small>
       <b>${E(t.subject)}</b>
       <p>${E(t.message)}</p>
     </div>
     <span class="status-${E(t.status)}">${E(statusName[t.status]||t.status)}</span>
   </article>`;
 }

 window.support48Open=async()=>{
   supportModal(`<div class="loader"></div>`);
   try{
     await loadMine();
     const o=document.getElementById("support48Overlay");
     if(!o)return;
     o.innerHTML=`<section class="support48-modal">
       <header class="support48-head">
         <div><small>SUPPORT CENTER · v4.8</small><h2>Підтримка</h2><p>Питання, баги та пропозиції — прямо в боті.</p></div>
         <button onclick="support48Close()">×</button>
       </header>

       <button class="support48-new" onclick="support48New()">＋ НОВЕ ЗВЕРНЕННЯ</button>

       <section class="support48-list">
         ${tickets.length?tickets.map(ticketCard).join(""):`<div class="support48-empty"><span>💬</span><b>Звернень ще немає</b><p>Якщо щось не працює — напиши нам тут.</p></div>`}
       </section>
     </section>`;
   }catch(e){
     toast?.(e.message,"error");
     support48Close();
   }
 };

 window.support48New=()=>{
   supportModal(`<header class="support48-head"><div><small>NEW TICKET</small><h2>Нове звернення</h2></div><button onclick="support48Close()">×</button></header>
     <div class="support48-form">
       <select id="support48Category">
         <option value="question">Питання</option>
         <option value="bug">Повідомити про баг</option>
         <option value="idea">Запропонувати ідею</option>
         <option value="complaint">Скарга</option>
         <option value="other">Інше</option>
       </select>
       <input id="support48Subject" placeholder="Коротка тема">
       <textarea id="support48Message" placeholder="Опиши ситуацію детальніше"></textarea>
       <button onclick="support48Send()">ВІДПРАВИТИ →</button>
     </div>`);
 };

 window.support48Send=async()=>{
   const category=document.getElementById("support48Category")?.value||"question";
   const subject=(document.getElementById("support48Subject")?.value||"").trim();
   const message=(document.getElementById("support48Message")?.value||"").trim();

   if(subject.length<2)return toast?.("Вкажи тему","error");
   if(message.length<5)return toast?.("Опиши звернення детальніше","error");

   try{
     await api("/api/support-v48",{method:"POST",body:JSON.stringify({category,subject,message})});
     toast?.("Звернення відправлено","success");
     await support48Open();
   }catch(e){toast?.(e.message,"error")}
 };

 window.support48View=id=>{
   const t=tickets.find(x=>Number(x.id)===Number(id)); if(!t)return;
   supportModal(`<header class="support48-head"><div><small>#${t.id} · ${E(catName[t.category]||t.category)}</small><h2>${E(t.subject)}</h2></div><button onclick="support48Close()">×</button></header>
     <div class="support48-view">
       <span class="status-${E(t.status)}">${E(statusName[t.status]||t.status)}</span>
       <p>${E(t.message)}</p>
       ${t.admin_reply?`<section><small>ВІДПОВІДЬ ПІДТРИМКИ</small><b>${E(t.admin_reply)}</b></section>`:""}
       <button onclick="support48Open()">← ДО МОЇХ ЗВЕРНЕНЬ</button>
     </div>`);
 };

 // Add Support card to Help Center without rebuilding the whole settings page.
 function addHelpCard(){
   const grid=document.querySelector(".ux47-help-grid");
   if(!grid || grid.querySelector("[data-support48]"))return;
   const b=document.createElement("button");
   b.type="button";
   b.dataset.support48="1";
   b.innerHTML='<span>💬</span><div><b>Підтримка</b><small>Питання, баги, пропозиції</small></div><i>→</i>';
   b.onclick=()=>support48Open();
   grid.appendChild(b);
 }

 // Admin Center integration: add Support tab and route via lightweight patch.
 const oldAdminCenter=window.adminCenter46;
 const oldAdminTab=window.admin46Tab;

 async function adminSupportPage(){
   const c=document.getElementById("content"); if(!c)return;
   c.innerHTML='<div class="loader"></div>';
   try{
     const list=await api("/api/admin/support-v48");
     c.innerHTML=`<section class="a46">
       <header class="a46-hero">
         <div><span>REFERHUB CONTROL · v4.8</span><h1>Підтримка</h1><p>Звернення користувачів у реальному часі.</p></div>
         <article><small>ВІДКРИТІ</small><b>${list.filter(x=>x.status==="open").length}</b><i>${list.length} всього</i></article>
       </header>
       <nav class="a46-tabs">
         <button onclick="adminCenter46()"><span>⌂</span><b>Admin Center</b></button>
         <button class="active"><span>💬</span><b>Підтримка</b></button>
       </nav>
       <main class="a46-body">
         <section class="a46-section">
           <header><div><span>SUPPORT INBOX</span><h2>Звернення</h2></div><button onclick="adminSupport48()">↻ ОНОВИТИ</button></header>
           <div class="support48-admin-list">
             ${list.length?list.map(t=>`<article onclick="support48AdminTicket(${t.id})">
               <span>${t.category==="bug"?"🐞":t.category==="idea"?"💡":t.category==="complaint"?"⚠️":"💬"}</span>
               <div><small>${E(t.first_name||t.username||"Користувач")} · #${t.id}</small><b>${E(t.subject)}</b><p>${E(t.message)}</p></div>
               <i class="status-${E(t.status)}">${E(statusName[t.status]||t.status)}</i>
             </article>`).join(""):`<div class="support48-empty">Звернень немає</div>`}
           </div>
         </section>
       </main>
     </section>`;
     window.__support48AdminTickets=list;
   }catch(e){toast?.(e.message,"error")}
 }

 window.adminSupport48=adminSupportPage;

 window.support48AdminTicket=id=>{
   const t=(window.__support48AdminTickets||[]).find(x=>Number(x.id)===Number(id)); if(!t)return;
   supportModal(`<header class="support48-head"><div><small>ADMIN · #${t.id}</small><h2>${E(t.subject)}</h2></div><button onclick="support48Close()">×</button></header>
     <div class="support48-admin-ticket">
       <p><b>${E(t.first_name||t.username||"Користувач")}</b> · ${t.username?"@"+E(t.username):"ID "+t.user_id}</p>
       <blockquote>${E(t.message)}</blockquote>
       <select id="support48AdminStatus">
         <option value="open" ${t.status==="open"?"selected":""}>Відкрите</option>
         <option value="in_progress" ${t.status==="in_progress"?"selected":""}>В роботі</option>
         <option value="resolved" ${t.status==="resolved"?"selected":""}>Вирішено</option>
         <option value="closed" ${t.status==="closed"?"selected":""}>Закрито</option>
       </select>
       <textarea id="support48AdminReply" placeholder="Відповідь користувачу">${E(t.admin_reply||"")}</textarea>
       <button onclick="support48AdminSave(${t.id})">ЗБЕРЕГТИ ВІДПОВІДЬ</button>
     </div>`);
 };

 window.support48AdminSave=async id=>{
   try{
     await api(`/api/admin/support-v48/${id}`,{method:"PATCH",body:JSON.stringify({
       status:document.getElementById("support48AdminStatus")?.value||"open",
       admin_reply:(document.getElementById("support48AdminReply")?.value||"").trim()
     })});
     toast?.("Звернення оновлено","success");
     support48Close();
     await adminSupport48();
   }catch(e){toast?.(e.message,"error")}
 };

 function addAdminSupportButton(){
   const tabs=document.querySelector(".a46-tabs");
   if(!tabs || tabs.querySelector("[data-support48-admin]"))return;
   const b=document.createElement("button");
   b.dataset.support48Admin="1";
   b.innerHTML="<span>💬</span><b>Підтримка</b>";
   b.onclick=()=>adminSupport48();
   tabs.appendChild(b);
 }

 document.addEventListener("click",()=>{
   setTimeout(()=>{
     addHelpCard();
     addAdminSupportButton();
   },50);
 });

 document.addEventListener("DOMContentLoaded",()=>{
   setTimeout(addHelpCard,300);
   setTimeout(addAdminSupportButton,500);
 });
})();
