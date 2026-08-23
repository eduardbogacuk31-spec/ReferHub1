
/* ReferHub v2.9 — Lottery 2.0 */
(()=>{
 const E=s=>document.querySelector(s);
 const EA=s=>[...document.querySelectorAll(s)];
 const esc29=v=>typeof esc==="function"?esc(v):String(v??"");
 let data29=null, filter29="active";

 function n(v){return Number(v||0)}
 function fmtTime(ts){
   if(!ts)return "—";
   const d=new Date(n(ts)*1000);
   return d.toLocaleString("uk-UA",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
 }
 function left(ts){
   const s=Math.max(0,n(ts)-Math.floor(Date.now()/1000));
   const d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60),sec=s%60;
   return d?`${d}д ${h}г ${m}хв`:`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
 }
 function lotteryStatus(x){
   if(x.status==="drawn")return ["ЗАВЕРШЕНО","done"];
   if(x.status==="cancelled")return ["СКАСОВАНО","off"];
   return ["LIVE","live"];
 }
 function prize(x){
   return x.prize_title || x.title || "Розіграш ReferHub";
 }
 function ticketPrice(x){
   return n(x.ticket_price || x.price || 0);
 }
 function myTickets(x){
   return n(x.my_tickets || x.user_tickets || 0);
 }
 function totalTickets(x){
   return n(x.total_tickets || x.tickets_count || 0);
 }
 function participants(x){
   return n(x.participants || x.participants_count || 0);
 }

 function card(x){
   const [st,cl]=lotteryStatus(x);
   const total=Math.max(1,totalTickets(x));
   const mine=myTickets(x);
   const chance=mine?Math.min(99.99,(mine/total)*100):0;
   return `<article class="rh29-card ${cl}" onclick="rh29OpenLottery(${n(x.id)})">
     <div class="rh29-card-art">
       <div class="rh29-gridfx"></div>
       <span class="rh29-status ${cl}"><i></i>${st}</span>
       <div class="rh29-prize-icon">🎁</div>
       <div class="rh29-card-number">#${String(n(x.id)).padStart(4,"0")}</div>
     </div>
     <div class="rh29-card-copy">
       <small>REFERHUB DRAW</small>
       <h3>${esc29(prize(x))}</h3>
       <p>${esc29(x.description || "Чесний розіграш серед власників білетів.")}</p>
       <div class="rh29-meta">
         <span><b>🎟 ${totalTickets(x)}</b><small>білетів</small></span>
         <span><b>👥 ${participants(x)}</b><small>учасників</small></span>
         <span><b>⭐ ${ticketPrice(x)}</b><small>за білет</small></span>
       </div>
       ${x.status==="active"||!x.status?`<div class="rh29-timer"><small>ДО ЗАВЕРШЕННЯ</small><b data-rh29-end="${n(x.ends_at || x.end_at)}">${left(x.ends_at || x.end_at)}</b></div>`:""}
       <div class="rh29-you">
         <span>Твої білети <b>${mine}</b></span>
         <span>Шанс зараз <b>${chance.toFixed(chance<1?2:1)}%</b></span>
       </div>
     </div>
   </article>`;
 }

 function hero(active){
   const x=active?.[0];
   if(!x)return `<section class="rh29-hero empty"><div><span>LOTTERY 2.0</span><h1>Нові розіграші скоро</h1><p>Слідкуй за новинами ReferHub.</p></div></section>`;
   return `<section class="rh29-hero" onclick="rh29OpenLottery(${n(x.id)})">
     <div class="rh29-hero-grid"></div>
     <div class="rh29-hero-glow"></div>
     <div class="rh29-hero-copy">
       <span><i></i> ГОЛОВНИЙ РОЗІГРАШ</span>
       <h1>${esc29(prize(x))}</h1>
       <p>${esc29(x.description || "Купуй білети за RH Stars. Кожен білет бере участь у чесному випадковому виборі.")}</p>
       <div class="rh29-hero-actions">
         <button onclick="event.stopPropagation();rh29OpenLottery(${n(x.id)})">Детальніше <b>→</b></button>
         <small>🎟 ${totalTickets(x)} білетів · 👥 ${participants(x)} учасників</small>
       </div>
     </div>
     <div class="rh29-hero-side">
       <small>ЗАЛИШИЛОСЬ</small>
       <strong data-rh29-end="${n(x.ends_at || x.end_at)}">${left(x.ends_at || x.end_at)}</strong>
       <div><span>ТВОЇ БІЛЕТИ</span><b>${myTickets(x)}</b></div>
     </div>
   </section>`;
 }


 function render(){
   const c=E("#content"); if(!c||!data29)return;
   const active=data29.active||[];
   const history=data29.history||[];
   const mine=[...active,...history].filter(x=>myTickets(x)>0);

   const arr=filter29==="history"?history:filter29==="mine"?mine:active;

   c.innerHTML=`<main class="lot436">
     <header class="lot436-head">
       <div>
         <small>РОЗІГРАШІ</small>
         <h1>Розіграші</h1>
       </div>
       ${window.me?.is_admin?`<button class="lot436-create" onclick="admin46Tab?.('lottery')">+ Створити</button>`:""}
     </header>

     <nav class="lot436-tabs">
       <button class="${filter29==="active"?"active":""}" onclick="rh29Filter('active')">Активні <span>${active.length}</span></button>
       <button class="${filter29==="mine"?"active":""}" onclick="rh29Filter('mine')">Мої <span>${mine.length}</span></button>
       <button class="${filter29==="history"?"active":""}" onclick="rh29Filter('history')">Завершені <span>${history.length}</span></button>
     </nav>

     <section class="lot436-list">
       ${arr.length?arr.map(x=>`
         <article class="lot436-card" onclick="rh29OpenLottery(${n(x.id)})">
           <div class="lot436-card-main">
             <span class="lot436-ticket">🎟</span>
             <div>
               <small>#${String(n(x.id)).padStart(4,"0")}</small>
               <h2>${esc29(prize(x))}</h2>
               <p>${x.status==="drawn"?"Розіграш завершено":`До завершення: ${left(x.ends_at||x.end_at)}`}</p>
             </div>
           </div>

           <div class="lot436-card-info">
             <div><span>Ціна</span><b>${ticketPrice(x)} RH</b></div>
             <div><span>Мої білети</span><b>${myTickets(x)}</b></div>
             <div><span>Всього</span><b>${totalTickets(x)}</b></div>
           </div>

           <button type="button">${x.status==="drawn"?"Результат":"Відкрити"} →</button>
         </article>
       `).join(""):`<div class="lot436-empty">
         <span>🎟</span>
         <b>${filter29==="history"?"Завершених розіграшів ще немає":filter29==="mine"?"Ти ще не береш участь у розіграшах":"Активних розіграшів зараз немає"}</b>
       </div>`}
     </section>
   </main>`;
 }

 async function load(){
   try{
     data29=await api("/api/lottery-v29");
     render();
   }catch(e){toast(e.message||"Не вдалося завантажити розіграші","error")}
 }

 window.rh29Filter=x=>{filter29=x;render()};
 window.rh29Open=load;

 window.rh29OpenLottery=async id=>{
   let x=[...(data29?.active||[]),...(data29?.history||[])].find(v=>n(v.id)===n(id));
   if(!x)return;
   const c=E("#content"); if(!c)return;
   const total=Math.max(1,totalTickets(x)),mine=myTickets(x),chance=mine/total*100;
   const done=x.status==="drawn";
   c.innerHTML=`<main class="lot436-detail">
     <button class="lot436-back" onclick="rh29Open()">← Назад</button>

     <header class="lot436-detail-head">
       <div>
         <small>РОЗІГРАШ #${String(n(x.id)).padStart(4,"0")}</small>
         <h1>${esc29(prize(x))}</h1>
       </div>
       <span class="${done?"done":"live"}">${done?"Завершено":"Активний"}</span>
     </header>

     <section class="lot436-detail-grid">
       <article class="lot436-mainbox">
         <div class="lot436-stats">
           <div><span>Мої білети</span><b>${mine}</b></div>
           <div><span>Всього білетів</span><b>${totalTickets(x)}</b></div>
           <div><span>Ціна білета</span><b>${ticketPrice(x)} RH</b></div>
         </div>

         ${!done?`
           <div class="lot436-end">
             <span>До завершення</span>
             <b data-rh29-end="${n(x.ends_at||x.end_at)}">${left(x.ends_at||x.end_at)}</b>
           </div>

           <div class="lot436-buy">
             <label>Кількість білетів</label>
             <div class="lot436-step">
               <button onclick="rh29Step(-1)">−</button>
               <b id="rh29Qty">1</b>
               <button onclick="rh29Step(1)">+</button>
             </div>

             <div class="lot436-quick">
               <button onclick="rh29Set(1)">1</button>
               <button onclick="rh29Set(5)">5</button>
               <button onclick="rh29Set(10)">10</button>
               <button onclick="rh29Set(25)">25</button>
             </div>

             <button class="lot436-buybtn" onclick="rh29Buy(${n(x.id)})">
               Купити білети
               <b id="rh29Cost">${ticketPrice(x)} RH</b>
             </button>
           </div>
         `:`
           <div class="lot436-winner">
             <span>Переможець</span>
             <b>${esc29(x.winner_name || x.winner_username || "Визначено")}</b>
           </div>
         `}
       </article>

       <aside class="lot436-side">
         <div><span>Учасників</span><b>${participants(x)}</b></div>
         <div><span>Твої білети</span><b>${mine}</b></div>
         <div><span>Твій шанс</span><b>${chance.toFixed(chance<1?2:1)}%</b></div>
         <div><span>Завершення</span><b>${fmtTime(x.ends_at||x.end_at)}</b></div>
       </aside>
     </section>
   </main>`;
   window.rh29Current=x;
 }

 window.rh29Step=d=>{
   const e=E("#rh29Qty");if(!e)return;
   const v=Math.max(1,Math.min(100,n(e.textContent)+d));e.textContent=v;
   const cost=E("#rh29Cost");if(cost)cost.textContent=`${v*ticketPrice(window.rh29Current)} ⭐`;
 };
 window.rh29Set=v=>{const e=E("#rh29Qty");if(e){e.textContent=v;const cost=E("#rh29Cost");if(cost)cost.textContent=`${v*ticketPrice(window.rh29Current)} ⭐`}};
 window.rh29Buy=async id=>{
   const qty=n(E("#rh29Qty")?.textContent)||1;
   try{
     const r=await api(`/api/lottery-v29/${id}/buy`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({quantity:qty})});
     rewardToast?.("Білети придбано",`+${qty} білетів у розіграші`,"🎟");
     await load(); await rh29OpenLottery(id);
   }catch(e){toast(e.message||"Не вдалося придбати білети","error")}
 };

 setInterval(()=>EA("[data-rh29-end]").forEach(e=>e.textContent=left(e.dataset.rh29End)),1000);
})();
