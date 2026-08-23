
/* ReferHub v4.14 — Live Events Center */
(()=>{
 const E=v=>typeof esc==="function"?esc(v):String(v??"");
 let events=[];

 function fmt(sec){
   sec=Math.max(0,Number(sec||0));
   const d=Math.floor(sec/86400),h=Math.floor(sec%86400/3600),m=Math.floor(sec%3600/60);
   if(d)return `${d}д ${h}г`;
   if(h)return `${h}г ${m}хв`;
   return `${m} хв`;
 }
 function kind(e){
   return {claim:"BONUS",game:"GAME EVENT",boost:"BOOST",lottery:"LOTTERY",info:"LIVE"}[e.event_type]||"LIVE";
 }
 function modal(inner){
   let o=document.getElementById("ev414Overlay");
   if(!o){o=document.createElement("div");o.id="ev414Overlay";o.className="ev414-overlay";document.body.appendChild(o)}
   o.innerHTML=`<section class="ev414-modal">${inner}</section>`;o.classList.add("show");
 }
 window.ev414Close=()=>document.getElementById("ev414Overlay")?.classList.remove("show");

 async function load(){events=await api("/api/live-events");return events}

 function action(e){
   if(e.event_type==="claim"){
     return `<button class="claim" ${e.claimed?"disabled":""} onclick="event.stopPropagation();ev414Claim(${e.id})">${e.claimed?"✓ ОТРИМАНО":`ЗАБРАТИ ${Number(e.reward_amount||0)} RH`}</button>`;
   }
   if(e.event_type==="game"&&e.game_key){
     return `<button onclick="event.stopPropagation();ev414Game('${E(e.game_key)}')">ГРАТИ →</button>`;
   }
   if(e.event_type==="lottery"){
     return `<button onclick="event.stopPropagation();ev414Go('lotteries')">ДО РОЗІГРАШУ →</button>`;
   }
   return "";
 }

 function card(e){
   return `<article class="ev414-card type-${E(e.event_type)}">
     <header><span>${E(e.icon||"⚡")}</span><div><small>${kind(e)}</small><h3>${E(e.title)}</h3><p>${E(e.subtitle||"")}</p></div><i>ще ${fmt(e.seconds_left)}</i></header>
     <p class="ev414-desc">${E(e.description||"")}</p>
     ${e.multiplier>1?`<div class="ev414-boost">×${Number(e.multiplier)} <span>множник події</span></div>`:""}
     ${action(e)}
   </article>`;
 }

 window.ev414Open=async()=>{
   modal('<div class="loader"></div>');
   try{
     await load();
     modal(`<header class="ev414-head"><div><small>LIVE · REFERHUB</small><h2>Події</h2><p>${events.length} активних зараз</p></div><button onclick="ev414Close()">×</button></header>
       <div class="ev414-list">${events.length?events.map(card).join(""):`<div class="ev414-empty"><span>⚡</span><b>Активних подій немає</b><p>Нові івенти з’являться тут.</p></div>`}</div>`);
   }catch(e){toast?.(e.message,"error");ev414Close()}
 };

 window.ev414Claim=async id=>{
   try{
     const old=Number(me?.balance||0);
     const r=await api(`/api/live-events/${id}/claim`,{method:"POST"});
     if(window.me)me.balance=Number(r.balance??me.balance);
     motionBalanceUpdate?.(old,Number(r.balance||old));
     toast?.(`+${Number(r.reward||0)} RH`,"success");
     await ev414Open();
   }catch(e){toast?.(e.message,"error")}
 };

 window.ev414Game=key=>{
   ev414Close();
   if(typeof openPage==="function")openPage("games");
   setTimeout(()=>{
     if(typeof openGameDetail==="function")openGameDetail(key);
   },180);
 };

 window.ev414Go=page=>{
   ev414Close();
   if(typeof openPage==="function")openPage(page);
 };

 function addBolt(){
   if(document.getElementById("ev414Bolt"))return;
   const host=document.querySelector(".topbar")||document.querySelector(".premium-topbar")||document.querySelector("header");
   if(!host)return;
   const b=document.createElement("button");
   b.id="ev414Bolt";b.className="ev414-bolt";b.innerHTML='⚡<i id="ev414Count" hidden></i>';b.onclick=ev414Open;
   host.appendChild(b);
 }

 async function badge(){
   try{
     await load();addBolt();
     const n=document.getElementById("ev414Count");
     if(n){n.textContent=events.length;n.hidden=!events.length}
   }catch(_){}
 }

 // Admin
 function adminModal(inner){
   modal(inner);
 }

 window.ev414Admin=async()=>{
   adminModal('<div class="loader"></div>');
   try{
     const list=await api("/api/admin/live-events-v414");
     window.__ev414Admin=list;
     const now=Math.floor(Date.now()/1000);
     adminModal(`<header class="ev414-head"><div><small>ADMIN · LIVE EVENTS</small><h2>Керування подіями</h2></div><button onclick="ev414Close()">×</button></header>
       <button class="ev414-new" onclick="ev414AdminCreate()">＋ НОВА ПОДІЯ</button>
       <div class="ev414-admin-list">${list.length?list.map(e=>`
         <article>
           <span>${E(e.icon||"⚡")}</span>
           <div><small>${E(e.event_type)} · #${e.id}</small><b>${E(e.title)}</b><p>${Number(e.claims_count||0)} отримань · ${Number(e.total_claimed||0)} RH · ${Number(e.ends_at)>now?"активна":"завершена"}</p></div>
           <i class="${e.active?"on":"off"}">${e.active?"ON":"OFF"}</i>
           <button onclick="ev414AdminToggle(${e.id},${e.active?0:1})">${e.active?"ВИМКНУТИ":"УВІМКНУТИ"}</button>
         </article>`).join(""):`<div class="ev414-empty">Подій немає</div>`}</div>`);
   }catch(e){toast?.(e.message,"error");ev414Close()}
 };

 window.ev414AdminCreate=()=>{
   adminModal(`<header class="ev414-head"><div><small>NEW EVENT</small><h2>Створити подію</h2></div><button onclick="ev414Close()">×</button></header>
     <div class="ev414-form">
       <div class="ev414-form-grid"><input id="ev414Icon" value="⚡" placeholder="Emoji"><input id="ev414Title" placeholder="Назва"></div>
       <input id="ev414Subtitle" placeholder="Короткий підзаголовок">
       <textarea id="ev414Desc" placeholder="Опис події"></textarea>
       <select id="ev414Type" onchange="ev414TypeChanged()">
         <option value="info">Інформаційна</option>
         <option value="claim">Бонус RH (забрати один раз)</option>
         <option value="game">Гра дня</option>
         <option value="lottery">Розіграш</option>
         <option value="boost">Boost / інформація</option>
       </select>
       <div class="ev414-form-grid">
         <input id="ev414Hours" type="number" value="24" min="1" placeholder="Тривалість, год">
         <input id="ev414Reward" type="number" value="0" min="0" placeholder="Нагорода RH">
       </div>
       <input id="ev414Game" placeholder="game_key, напр. reaction" hidden>
       <button onclick="ev414AdminSave()">СТВОРИТИ</button>
     </div>`);
 };

 window.ev414TypeChanged=()=>{
   const type=document.getElementById("ev414Type")?.value;
   const g=document.getElementById("ev414Game");
   if(g)g.hidden=type!=="game";
 };

 window.ev414AdminSave=async()=>{
   const now=Math.floor(Date.now()/1000);
   const hours=Math.max(1,Number(document.getElementById("ev414Hours")?.value||24));
   try{
     await api("/api/admin/live-events-v414",{method:"POST",body:JSON.stringify({
       title:(document.getElementById("ev414Title")?.value||"").trim(),
       subtitle:(document.getElementById("ev414Subtitle")?.value||"").trim(),
       description:(document.getElementById("ev414Desc")?.value||"").trim(),
       icon:(document.getElementById("ev414Icon")?.value||"⚡").trim(),
       event_type:document.getElementById("ev414Type")?.value||"info",
       starts_at:now,ends_at:now+hours*3600,multiplier:1,
       reward_amount:Number(document.getElementById("ev414Reward")?.value||0),
       game_key:(document.getElementById("ev414Game")?.value||"").trim()||null,
       lottery_id:null
     })});
     toast?.("Подію створено","success");await ev414Admin();
   }catch(e){toast?.(e.message,"error")}
 };

 window.ev414AdminToggle=async(id,active)=>{
   try{
     await api(`/api/admin/live-events-v414/${id}`,{method:"PATCH",body:JSON.stringify({active:Boolean(active)})});
     toast?.(active?"Подію увімкнено":"Подію вимкнено","success");await ev414Admin();
   }catch(e){toast?.(e.message,"error")}
 };

 function addAdminButton(){
   const quick=document.querySelector(".a46-quick");
   if(!quick||quick.querySelector("[data-ev414]"))return;
   const b=document.createElement("button");b.dataset.ev414="1";b.innerHTML='<span>⚡</span><b>Live Events</b><i>→</i>';b.onclick=ev414Admin;quick.appendChild(b);
 }

 document.addEventListener("DOMContentLoaded",()=>{setTimeout(badge,900);setTimeout(addAdminButton,1000)});
 document.addEventListener("click",()=>setTimeout(()=>{addBolt();addAdminButton()},80));
 setInterval(badge,60000);
})();
