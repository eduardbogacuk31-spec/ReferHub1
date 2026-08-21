
/* ReferHub v3.5 — Player Journey */
(()=>{
 let d=null;
 const esc35=v=>typeof esc==="function"?esc(v):String(v??"");

 function render(){
   const c=document.getElementById("content"); if(!c||!d)return;
   const pct=Math.round(d.done/Math.max(1,d.total)*100);
   c.innerHTML=`<main class="rh35">
    <section class="rh35-hero">
      <div class="rh35-orbit"><i></i><span>♛</span></div>
      <div class="rh35-hero-copy">
        <span>PLAYER JOURNEY · v3.5</span>
        <h1>Твій шлях у ReferHub</h1>
        <p>Прогрес акаунта тепер зібраний у зрозумілу карту — від першого рівня до Master.</p>
        <div class="rh35-maintrack"><i style="width:${pct}%"></i></div>
        <small>${d.done}/${d.total} етапів завершено · ${pct}%</small>
      </div>
      <div class="rh35-level"><small>LEVEL</small><b>${d.level}</b><i>${d.xp} XP</i></div>
    </section>

    <section class="rh35-stats">
      <article><span>🎮</span><div><small>ARCADE</small><b>${d.plays}</b><i>ігор</i></div></article>
      <article><span>🎟️</span><div><small>LOTTERY</small><b>${d.tickets}</b><i>білетів</i></div></article>
      <article><span>🏆</span><div><small>ACHIEVEMENTS</small><b>${d.achievements}</b><i>отримано</i></div></article>
    </section>

    <section class="rh35-title"><div><span>ROADMAP</span><h2>Етапи розвитку</h2></div><small>від Rookie до Master</small></section>
    <section class="rh35-road">
      ${d.milestones.map((m,i)=>`
       <article class="${m.done?"done":""}">
         <div class="rh35-node"><span>${m.done?"✓":m.icon}</span><i></i></div>
         <div class="rh35-card">
           <div><small>STAGE ${String(i+1).padStart(2,"0")}</small><em>${m.done?"COMPLETED":"IN PROGRESS"}</em></div>
           <h3>${esc35(m.title)}</h3>
           <p>${esc35(m.subtitle)}</p>
           <section><span>${Math.min(m.value,m.need)}/${m.need}</span><b>${m.progress}%</b></section>
           <div class="rh35-track"><i style="width:${m.progress}%"></i></div>
           <footer><span>Нагорода</span><b>${esc35(m.reward)}</b></footer>
         </div>
       </article>`).join("")}
    </section>

    <section class="rh35-links">
      <button onclick="rh32Open()"><span>🏆</span><div><small>COLLECTION</small><b>Досягнення</b></div><i>→</i></button>
      <button onclick="rh33Open()"><span>🎁</span><div><small>REWARDS</small><b>Центр нагород</b></div><i>→</i></button>
      <button onclick="openPage('games')"><span>🎮</span><div><small>ARCADE</small><b>Продовжити грати</b></div><i>→</i></button>
    </section>
   </main>`;
 }

 async function open(){
   try{d=await api("/api/journey-v35");render()}
   catch(e){toast(e.message,"error")}
 }
 window.rh35Open=open;

 function entry(){
   if(document.querySelector(".rh35-entry"))return;
   const host=document.querySelector(".rh30-actions");
   if(!host)return;
   const b=document.createElement("button");
   b.className="rh35-entry";
   b.innerHTML='<span>♛</span><div><small>JOURNEY</small><b>Мій шлях</b></div><i>→</i>';
   b.onclick=open; host.appendChild(b);
 }
 new MutationObserver(()=>requestAnimationFrame(entry)).observe(document.documentElement,{childList:true,subtree:true});
 setTimeout(entry,350);
})();
