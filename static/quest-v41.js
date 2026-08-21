
(()=>{
 let q=null; const e=v=>typeof esc==="function"?esc(v):String(v??"");
 function quest(x){const p=Math.min(100,Math.round(x.progress/x.target*100));return `<article class="rh41-q ${p===100?"done":""}">
   <div class="rh41-icon">${x.icon}</div><section><small>${p===100?"COMPLETED":"WEEKLY QUEST"}</small><h3>${e(x.title)}</h3><p>${e(x.desc)}</p>
   <div class="rh41-track"><i style="width:${p}%"></i></div><div class="rh41-meta"><span>${x.progress}/${x.target}</span><b>+${x.xp} XP</b></div></section></article>`}
 function chest(x){const ready=q.xp>=x.need&&!x.claimed;return `<article class="rh41-chest ${ready?"ready":""} ${x.claimed?"claimed":""}">
   <span>${x.level===3?"👑":"🎁"}</span><small>CHEST ${x.level}</small><b>${x.reward} RH</b><i>${x.need} XP</i>
   <button ${!ready?"disabled":""} onclick="rh41Claim(${x.level})">${x.claimed?"✓":ready?"ЗАБРАТИ":"🔒"}</button></article>`}
 function render(){const c=document.getElementById("content");if(!c||!q)return;const pct=Math.min(100,q.xp);
 c.innerHTML=`<main class="rh41"><section class="rh41-hero"><div><span>QUEST CENTER · v4.1</span><h1>Тижневі квести</h1><p>Виконуй завдання протягом тижня, накопичуй Quest XP та відкривай скрині.</p></div><section><small>QUEST XP</small><b>${q.xp}</b><i>${e(q.week)}</i></section></section>
 <section class="rh41-progress"><div><small>WEEKLY PROGRESS</small><b>${q.xp}/100 XP</b></div><div class="rh41-bigtrack"><i style="width:${pct}%"></i></div></section>
 <section class="rh41-head"><div><span>REWARD ROAD</span><h2>Скрині тижня</h2></div><small>До 205 RH</small></section><section class="rh41-chests">${q.chests.map(chest).join("")}</section>
 <section class="rh41-head"><div><span>QUESTS</span><h2>Завдання</h2></div><small>${q.quests.filter(x=>x.progress>=x.target).length}/${q.quests.length} виконано</small></section>
 <section class="rh41-grid">${q.quests.map(quest).join("")}</section></main>`}
 async function open(){try{q=await api("/api/quest-center-v41");render()}catch(err){toast(err.message,"error")}}
 window.rh41Open=open;
 window.rh41Claim=async l=>{try{const r=await api(`/api/quest-center-v41/chest/${l}`,{method:"POST"});toast(`🎁 +${r.reward} RH`,"success");await open()}catch(err){toast(err.message,"error")}};
 function entry(){if(document.querySelector(".rh41-entry"))return;const host=document.querySelector(".rh30-actions");if(!host)return;const b=document.createElement("button");b.className="rh41-entry";b.innerHTML='<span>🧭</span><div><small>WEEKLY</small><b>Quest Center</b></div><i>→</i>';b.onclick=open;host.appendChild(b)}
 new MutationObserver(()=>requestAnimationFrame(entry)).observe(document.documentElement,{childList:true,subtree:true});setTimeout(entry,450);
})();
