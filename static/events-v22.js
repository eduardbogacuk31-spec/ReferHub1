
/* ReferHub v2.2 — Live Events */
(()=>{
 function fmt(sec){
   sec=Math.max(0,Number(sec||0));
   const d=Math.floor(sec/86400),h=Math.floor((sec%86400)/3600),m=Math.floor((sec%3600)/60);
   if(d)return `${d}д ${h}г`;
   if(h)return `${h}г ${m}хв`;
   return `${m} хв`;
 }

 function card(e){
   let action="";
   if(e.event_type==="claim"){
     action=e.claimed
       ? `<button disabled>✓ ОТРИМАНО</button>`
       : `<button onclick="rh22ClaimEvent(${e.id})">ЗАБРАТИ +${e.reward_amount} RH</button>`;
   }else if(e.event_type==="game" && e.game_key){
     action=`<button onclick="openGameDetail('${e.game_key}')">ГРАТИ ЗАРАЗ</button>`;
   }else if(e.event_type==="boost"){
     action=`<div class="rh22-event-boost">x${Number(e.multiplier).toFixed(1)}</div>`;
   }

   return `<article class="rh22-event-card ${e.event_type}">
     <div class="rh22-event-glow"></div>
     <div class="rh22-event-icon">${e.icon}</div>
     <div class="rh22-event-copy">
       <span>${esc(e.title)}</span>
       <h3>${esc(e.subtitle||e.title)}</h3>
       <p>${esc(e.description||"")}</p>
       <div class="rh22-event-timer"><i></i><small>Ще ${fmt(e.seconds_left)}</small></div>
     </div>
     <div class="rh22-event-action">${action}</div>
   </article>`;
 }

 async function inject(){
   let events=[];
   try{events=await api("/api/live-events")}catch(_){return}
   document.querySelectorAll(".rh22-events-root").forEach(x=>x.remove());
   if(!events.length)return;

   const root=document.createElement("section");
   root.className="rh22-events-root";
   root.innerHTML=`
     <div class="rh22-events-head">
       <div><span>LIVE EVENTS</span><h2>Події зараз</h2></div>
       <div class="rh22-live-pill"><i></i> LIVE</div>
     </div>
     <div class="rh22-events-track">${events.map(card).join("")}</div>
   `;

   const c=document.getElementById("content")||document.querySelector(".content")||document.querySelector("main");
   if(c)c.prepend(root);
 }

 window.rh22ClaimEvent=async function(id){
   try{
     const r=await api(`/api/live-events/${id}/claim`,{method:"POST"});
     me.balance=Number(r.balance||me.balance||0);
     const b=document.getElementById("balance");if(b)b.textContent=String(me.balance);
     rewardToast?.("Live Event",`+${r.reward} RH`,"🎁");
     await inject();
   }catch(e){toast(e.message,"error")}
 };

 const oldHome=window.homePage;
 if(typeof oldHome==="function"){
   window.homePage=async function(){
     await oldHome.apply(this,arguments);
     await inject();
   };
 }

 document.addEventListener("DOMContentLoaded",()=>setTimeout(inject,200));
})();
