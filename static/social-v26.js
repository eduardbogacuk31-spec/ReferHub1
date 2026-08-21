
/* ReferHub v2.6 — Social Hub */
(()=>{
 const avatar=u=>{
   const photo=window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url;
   return photo?`<img src="${esc(photo)}" alt="">`:`<span>${esc((u?.first_name||u?.username||"R")[0].toUpperCase())}</span>`;
 };
 async function openSocial(){
   let d;try{d=await api("/api/social-v26")}catch(e){toast(e.message,"error");return}
   const c=document.getElementById("content");if(!c)return;
   c.innerHTML=`<section class="rh26">
    <div class="rh26-hero">
      <div class="rh26-grid"></div>
      <div class="rh26-avatar">${avatar(d)}<i></i></div>
      <div class="rh26-id"><span>SOCIAL HUB</span><h1>${esc(d.first_name||d.username||"Гравець")}</h1><p>${d.username?"@"+esc(d.username):"ReferHub member"}</p></div>
      <div class="rh26-stats">
        <article><b>${d.friends}</b><small>ДРУЗІ</small></article>
        <article><b>${d.followers}</b><small>ПІДПИСНИКИ</small></article>
        <article><b>${d.following}</b><small>ПІДПИСКИ</small></article>
      </div>
    </div>
    <div class="rh26-layout">
      <section class="rh26-find">
        <div class="rh26-title"><div><span>DISCOVER</span><h2>Знайти гравців</h2></div><i>⌕</i></div>
        <div class="rh26-search"><span>⌕</span><input id="rh26q" placeholder="Нікнейм або ім’я..." autocomplete="off"><button onclick="rh26Search()">ЗНАЙТИ</button></div>
        <div id="rh26results" class="rh26-results"><div class="rh26-empty"><b>Знайди своїх друзів</b><small>Введи щонайменше 2 символи</small></div></div>
      </section>
      <section class="rh26-feed">
        <div class="rh26-title"><div><span>YOUR ACTIVITY</span><h2>Активність</h2></div><i>✦</i></div>
        <div class="rh26-activity">${d.activity.map(a=>`<article><div>${a.icon}</div><section><b>${esc(a.title)}</b><small>${esc(a.subtitle)}</small></section><i>›</i></article>`).join("")}</div>
      </section>
    </div>
    <section class="rh26-banner"><div><span>REFERHUB COMMUNITY</span><h2>Грай не один</h2><p>Знаходь знайомих, порівнюй активність і збирай своє коло гравців.</p></div><div class="rh26-people"><i>R</i><i>H</i><i>+</i></div></section>
   </section>`;
 }
 window.rh26Search=async()=>{
   const q=document.getElementById("rh26q")?.value?.trim();if(!q||q.length<2)return;
   const box=document.getElementById("rh26results");box.innerHTML='<div class="rh26-loading">Пошук...</div>';
   try{
     const r=await api(`/api/social-v26/search?q=${encodeURIComponent(q)}`);
     box.innerHTML=r.users.length?r.users.map(u=>`<article class="rh26-user">
       <div class="rh26-mini">${esc((u.first_name||u.username||"R")[0].toUpperCase())}</div>
       <section><b>${esc(u.first_name||u.username||"Гравець")}</b><small>${u.username?"@"+esc(u.username):"ReferHub"} · ${u.xp} XP</small></section>
       <button class="${u.followed?"on":""}" onclick="rh26Follow(${u.id},this)">${u.followed?"✓ ПІДПИСКА":"+ ДОДАТИ"}</button>
     </article>`).join(""):'<div class="rh26-empty"><b>Нікого не знайдено</b><small>Спробуй інший нікнейм</small></div>';
   }catch(e){box.innerHTML=`<div class="rh26-empty"><b>Помилка</b><small>${esc(e.message)}</small></div>`}
 };
 window.rh26Follow=async(id,b)=>{
   try{const r=await api(`/api/social-v26/follow/${id}`,{method:"POST"});b.classList.toggle("on",r.followed);b.textContent=r.followed?"✓ ПІДПИСКА":"+ ДОДАТИ";rewardToast?.("Social Hub",r.followed?"Гравця додано":"Підписку скасовано","👥")}catch(e){toast(e.message,"error")}
 };
 window.rh26Page=openSocial;
 function addEntry(){
   if(document.querySelector(".rh26-entry"))return;
   // Add a premium Social Hub entry into profile surface without disturbing its existing frames/backgrounds.
   const host=document.querySelector(".rh221-showcase,.rh22-profile,.profile-page");
   if(!host)return;
   const b=document.createElement("button");b.className="rh26-entry";
   b.innerHTML='<span>👥</span><section><small>COMMUNITY</small><b>Social Hub</b><i>Друзі та активність</i></section><em>→</em>';
   b.onclick=openSocial;host.appendChild(b);
 }
 new MutationObserver(()=>requestAnimationFrame(addEntry)).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener("DOMContentLoaded",addEntry);setTimeout(addEntry,300);
})();
