
/* ReferHub v4.9 — Notification Center */
(()=>{
 const E=v=>typeof esc==="function"?esc(v):String(v??"");
 let notes=[];
 const icons={info:"💬",reward:"✦",event:"🎉",warning:"⚠️",update:"✧"};

 function overlay(inner){
   let o=document.getElementById("n49Overlay");
   if(!o){o=document.createElement("div");o.id="n49Overlay";o.className="n49-overlay";document.body.appendChild(o)}
   o.innerHTML=`<section class="n49-modal">${inner}</section>`;o.classList.add("show");
 }
 window.n49Close=()=>document.getElementById("n49Overlay")?.classList.remove("show");

 async function load(){notes=await api("/api/notifications-v49");return notes}
 function unread(){return notes.filter(n=>!Number(n.is_read)).length}
 function updateBadge(){
   let b=document.getElementById("n49Badge");
   const n=unread();
   if(b){b.textContent=n>99?"99+":n;b.hidden=!n}
 }

 window.n49Open=async()=>{
   overlay('<div class="loader"></div>');
   try{
     await load();
     overlay(`<header class="n49-head"><div><small>INBOX · REFERHUB</small><h2>Сповіщення</h2><p>${unread()} непрочитаних</p></div><button onclick="n49Close()">×</button></header>
       <div class="n49-tools"><button onclick="n49ReadAll()">✓ ПРОЧИТАТИ ВСЕ</button></div>
       <div class="n49-list">${notes.length?notes.map(n=>`
        <article class="${Number(n.is_read)?"":"unread"}" onclick="n49Read(${n.id},'${E(n.action_page||"")}')">
          <span>${icons[n.kind]||"💬"}</span><div><small>${E(n.kind||"info")}</small><b>${E(n.title)}</b><p>${E(n.message)}</p></div>${Number(n.is_read)?"":"<i></i>"}
        </article>`).join(""):`<div class="n49-empty"><span>✓</span><b>Тут поки тихо</b><p>Нові нагороди, події та важливі повідомлення з’являться тут.</p></div>`}</div>`);
     updateBadge();
   }catch(e){toast?.(e.message,"error");n49Close()}
 };

 window.n49Read=async(id,page)=>{
   try{await api(`/api/notifications-v49/${id}/read`,{method:"POST"})}catch(_){}
   if(page && typeof openPage==="function"){n49Close();openPage(page)}
   else await n49Open();
 };

 window.n49ReadAll=async()=>{
   try{await api("/api/notifications-v49/read-all",{method:"POST"});await n49Open()}catch(e){toast?.(e.message,"error")}
 };

 function addBell(){
   if(document.getElementById("n49Bell"))return;
   const candidates=[document.querySelector(".topbar"),document.querySelector(".premium-topbar"),document.querySelector("header")];
   const host=candidates.find(Boolean); if(!host)return;
   const b=document.createElement("button");b.id="n49Bell";b.className="n49-bell";b.innerHTML='🔔<i id="n49Badge" hidden></i>';b.onclick=n49Open;host.appendChild(b);
 }

 async function refreshBadge(){
   try{await load();addBell();updateBadge()}catch(_){}
 }

 // Admin composer
 window.n49AdminComposer=()=>{
   overlay(`<header class="n49-head"><div><small>ADMIN BROADCAST</small><h2>Нове сповіщення</h2></div><button onclick="n49Close()">×</button></header>
    <div class="n49-form">
      <select id="n49Kind"><option value="info">Інформація</option><option value="reward">Нагорода</option><option value="event">Подія</option><option value="update">Оновлення</option><option value="warning">Важливе</option></select>
      <input id="n49Title" placeholder="Заголовок">
      <textarea id="n49Message" placeholder="Текст повідомлення"></textarea>
      <select id="n49Page"><option value="">Без переходу</option><option value="earn">Заробити</option><option value="games">Ігри</option><option value="lottery">Розіграш</option><option value="friends">Друзі</option><option value="profile">Профіль</option></select>
      <input id="n49User" type="number" placeholder="Telegram ID (порожньо = всім)">
      <button onclick="n49AdminSend()">ВІДПРАВИТИ</button>
    </div>`);
 };

 window.n49AdminSend=async()=>{
   const title=(document.getElementById("n49Title")?.value||"").trim(),message=(document.getElementById("n49Message")?.value||"").trim();
   if(title.length<2||message.length<2)return toast?.("Заповни заголовок і текст","error");
   const raw=(document.getElementById("n49User")?.value||"").trim();
   try{
     const r=await api("/api/admin/notifications-v49",{method:"POST",body:JSON.stringify({
       title,message,kind:document.getElementById("n49Kind")?.value||"info",
       action_page:document.getElementById("n49Page")?.value||null,user_id:raw?Number(raw):null
     })});
     toast?.(`Відправлено: ${r.sent}`,"success");n49Close();
   }catch(e){toast?.(e.message,"error")}
 };

 function addAdminButton(){
   const quick=document.querySelector(".a46-quick");
   if(!quick||quick.querySelector("[data-n49]"))return;
   const b=document.createElement("button");b.dataset.n49="1";b.innerHTML='<span>🔔</span><b>Сповіщення</b><i>→</i>';b.onclick=n49AdminComposer;quick.appendChild(b);
 }

 document.addEventListener("DOMContentLoaded",()=>{setTimeout(refreshBadge,800);setTimeout(addAdminButton,1000)});
 document.addEventListener("click",()=>setTimeout(()=>{addBell();addAdminButton()},80));
 setInterval(refreshBadge,60000);
})();
