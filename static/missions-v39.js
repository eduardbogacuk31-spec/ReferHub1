
(()=>{
 let d=null; const e=v=>typeof esc==="function"?esc(v):String(v??"");
 function card(m){const pct=Math.min(100,Math.round(m.progress/m.target*100));return `<article class="rh39-card ${m.done?"done":""} ${m.claimed?"claimed":""}">
 <div class="rh39-icon">${m.icon}</div><section><small>${m.claimed?"COMPLETED":m.done?"READY":"DAILY MISSION"}</small><h3>${e(m.title)}</h3><p>${e(m.desc)}</p>
 <div class="rh39-track"><i style="width:${pct}%"></i></div><div class="rh39-meta"><span>${m.progress}/${m.target}</span><b>+${m.reward} RH</b></div></section>
 <button ${!m.done||m.claimed?"disabled":""} onclick="event.stopPropagation();rh39Claim('${m.key}')">${m.claimed?"✓":m.done?"ЗАБРАТИ":"…"}</button></article>`}
 function render(){const c=document.getElementById("content");if(!c||!d)return;c.innerHTML=`<main class="rh39"><section class="rh39-hero"><div><span>DAILY MISSIONS · v3.9</span><h1>Щоденні завдання</h1><p>Грай, виконуй цілі та забирай RH. Новий набір — щодня.</p></div><section><small>ВИКОНАНО</small><b>${d.complete}/${d.missions.length}</b><i>${d.claimed} нагород забрано</i></section></section><section class="rh39-head"><div><span>TODAY</span><h2>Місії на сьогодні</h2></div><small>${e(d.day)}</small></section><section class="rh39-grid">${d.missions.map(card).join("")}</section></main>`}
 async function open(){try{d=await api("/api/daily-missions-v39");render()}catch(err){toast(err.message,"error")}}
 window.rh39Open=open;
 window.rh39Claim=async key=>{try{const r=await api(`/api/daily-missions-v39/${key}/claim`,{method:"POST"});toast(`+${r.reward} RH отримано`,"success");await open()}catch(err){toast(err.message,"error")}};
 function entry(){if(document.querySelector(".rh39-entry"))return;const host=document.querySelector(".rh30-actions");if(!host)return;const b=document.createElement("button");b.className="rh39-entry";b.innerHTML='<span>📋</span><div><small>DAILY</small><b>Щоденні місії</b></div><i>→</i>';b.onclick=open;host.appendChild(b)}
 new MutationObserver(()=>requestAnimationFrame(entry)).observe(document.documentElement,{childList:true,subtree:true});setTimeout(entry,350);
})();
