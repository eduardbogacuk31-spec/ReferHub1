
/* ReferHub v3.4 — Games Expansion + compact Achievements */
(()=>{
 async function injectArcade(){
   const hero=document.querySelector(".gp-hero");
   if(!hero||document.querySelector(".rh34-challenges"))return;
   let d;try{d=await api("/api/arcade-v34")}catch(_){return}

   const box=document.createElement("section");
   box.className="rh34-challenges";
   box.innerHTML=`
     <div class="rh34-head">
       <div><span>DAILY ARCADE</span><h2>Щоденні виклики</h2></div>
       <small>оновлюються щодня</small>
     </div>
     <div class="rh34-ch-grid">
       ${d.challenges.map(c=>`
         <article class="${c.claimed?"claimed":c.ready?"ready":""}">
           <div class="rh34-ch-icon">${c.key==="play5"?"🎮":c.key==="earn50"?"✦":"⚡"}</div>
           <div>
             <span>+${c.reward} RH</span>
             <h3>${c.title}</h3>
             <p>${c.description}</p>
             <div class="rh34-track"><i style="width:${c.progress}%"></i></div>
             <small>${Math.min(c.value,c.goal)}/${c.goal}</small>
           </div>
           <button ${c.ready&&!c.claimed?`onclick="rh34Claim('${c.key}')"`:"disabled"}>${c.claimed?"✓":c.ready?"ЗАБРАТИ":"🔒"}</button>
         </article>`).join("")}
     </div>`;
   hero.insertAdjacentElement("afterend",box);
 }

 window.rh34Claim=async key=>{
   try{
     const r=await api(`/api/arcade-v34/claim/${encodeURIComponent(key)}`,{method:"POST"});
     me.balance=Number(r.balance||me.balance||0);
     rewardToast?.("Arcade Challenge",`+${r.reward} RH`,"🎮");
     document.querySelector(".rh34-challenges")?.remove();
     await injectArcade();
   }catch(e){toast(e.message,"error")}
 };

 function compactAchievements(){
   document.querySelectorAll(".rh32-grid").forEach(grid=>grid.classList.add("rh34-ach-grid"));
   document.querySelectorAll(".rh32-card").forEach(card=>{
     card.classList.add("rh34-ach-card");
     const p=card.querySelector(".rh32-copy p");
     if(p)p.classList.add("rh34-clamp");
   });
 }

 function run(){
   requestAnimationFrame(()=>{
     injectArcade();
     compactAchievements();
   });
 }
 new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener("DOMContentLoaded",run);
 setTimeout(run,250);
})();
