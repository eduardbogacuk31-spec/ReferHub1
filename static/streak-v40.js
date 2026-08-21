
(()=>{
 let s=null;
 function render(){
  const c=document.getElementById("content");if(!c||!s)return;
  c.innerHTML=`<main class="rh40">
   <section class="rh40-hero">
    <div class="rh40-fire">🔥</div>
    <div><span>DAILY STREAK · v4.0</span><h1>${s.current} днів поспіль</h1><p>Заходь щодня. Чим довша серія — тим цінніша нагорода.</p></div>
    <section><small>BEST STREAK</small><b>${s.best}</b><i>днів</i></section>
   </section>
   <section class="rh40-head"><div><span>7 DAY CYCLE</span><h2>Щоденні нагороди</h2></div><small>${s.claimed_today?"Сьогодні ✓":"Нагорода готова"}</small></section>
   <section class="rh40-week">${s.week.map(x=>`<article class="${x.active?"active":""} ${s.claimed_today&&x.active?"claimed":""}">
    <small>ДЕНЬ ${x.day}</small><span>${x.day===7?"👑":"✦"}</span><b>${x.reward} RH</b>${x.active?"<i>СЬОГОДНІ</i>":""}
   </article>`).join("")}</section>
   <section class="rh40-claim">
    <div><small>NEXT REWARD</small><h2>${s.claimed_today?"Нагороду отримано":`+${s.next_reward} RH`}</h2><p>${s.claimed_today?"Повертайся завтра, щоб не втратити серію.":"Забери нагороду та продовж свою серію."}</p></div>
    <button ${s.claimed_today?"disabled":""} onclick="rh40Claim()">${s.claimed_today?"✓ ОТРИМАНО":"🔥 ЗАБРАТИ НАГОРОДУ"}</button>
   </section>
   <section class="rh40-stats"><article><small>ПОТОЧНА СЕРІЯ</small><b>${s.current}</b><span>🔥 днів</span></article><article><small>РЕКОРД</small><b>${s.best}</b><span>🏆 днів</span></article><article><small>ВСЬОГО ВХОДІВ</small><b>${s.total_claims}</b><span>✓ нагород</span></article></section>
  </main>`;
 }
 async function open(){try{s=await api("/api/streak-v40");render()}catch(err){toast(err.message,"error")}}
 window.rh40Open=open;
 window.rh40Claim=async()=>{try{const r=await api("/api/streak-v40/claim",{method:"POST"});toast(`🔥 Серія ${r.streak} · +${r.reward} RH`,"success");await open()}catch(err){toast(err.message,"error")}};
 function entry(){if(document.querySelector(".rh40-entry"))return;const host=document.querySelector(".rh30-actions");if(!host)return;const b=document.createElement("button");b.className="rh40-entry";b.innerHTML='<span>🔥</span><div><small>STREAK</small><b>Щоденна серія</b></div><i>→</i>';b.onclick=open;host.appendChild(b)}
 new MutationObserver(()=>requestAnimationFrame(entry)).observe(document.documentElement,{childList:true,subtree:true});setTimeout(entry,400);
})();
