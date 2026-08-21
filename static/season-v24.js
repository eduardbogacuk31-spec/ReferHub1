
/* ReferHub v2.4 Seasons */
(()=>{
 const fmt=s=>{const d=Math.floor(s/86400),h=Math.floor((s%86400)/3600);return `${d}д ${h}г`};
 function lv(x){
   return `<article class="rh24-level ${x.unlocked?"open":"locked"} ${x.claimed?"claimed":""} ${x.special?"special":""}">
    <div class="rh24-lvnum"><small>LVL</small><b>${x.level}</b></div>
    <div class="rh24-reward"><span>${x.special?"🎁":"✦"}</span><b>+${x.reward} RH</b><small>${x.required_xp} XP</small></div>
    ${x.claimed?`<button disabled>✓</button>`:x.unlocked?`<button onclick="rh24Claim(${x.level})">ЗАБРАТИ</button>`:`<button disabled>🔒</button>`}
   </article>`
 }
 async function render(){
   let s;try{s=await api("/api/season-v24")}catch(_){return} if(!s.active)return;
   document.querySelectorAll(".rh24-root").forEach(x=>x.remove());
   const next=Math.min(2000,(Math.floor(s.xp/100)+1)*100), pct=s.xp>=2000?100:Math.max(0,Math.min(100,(s.xp%100)));
   const root=document.createElement("section");root.className="rh24-root";
   root.innerHTML=`<section class="rh24-hero">
    <div class="rh24-noise"></div><div class="rh24-orb a"></div><div class="rh24-orb b"></div>
    <div class="rh24-emblem"><span>✦</span><b>01</b></div>
    <div class="rh24-copy"><span>REFERHUB SEASON</span><h1>${esc(s.subtitle)}</h1><p>Грай, виконуй активності та відкривай сезонні нагороди.</p>
      <div class="rh24-xp"><div><i style="width:${pct}%"></i></div><small>${s.xp} XP · ${s.xp>=2000?"MAX LEVEL":`${next-s.xp} XP до наступного`}</small></div>
    </div>
    <div class="rh24-time"><small>ДО КІНЦЯ</small><b>${fmt(s.seconds_left)}</b><span>LVL ${s.level}/20</span></div>
   </section>
   <div class="rh24-head"><div><span>SEASON ROAD</span><h2>Шлях нагород</h2></div><small>20 рівнів</small></div>
   <div class="rh24-road">${s.levels.map(lv).join("")}</div>`;
   const c=document.getElementById("content")||document.querySelector(".content")||document.querySelector("main"); if(c)c.prepend(root);
 }
 window.rh24Claim=async l=>{try{const r=await api(`/api/season-v24/claim/${l}`,{method:"POST"});me.balance=+r.balance;const b=document.getElementById("balance");if(b)b.textContent=me.balance;rewardToast?.("Season Reward",`+${r.reward} RH`,"✦");await render()}catch(e){toast(e.message,"error")}};
 window.rh251RenderSeason=render;
 const old=window.homePage;
 document.addEventListener("DOMContentLoaded",()=>setTimeout(render,340));
})();
