
/* ReferHub v3.7.2 — Single Stable Profile */
(()=>{
 let cache=null;
 const escP=v=>typeof esc==="function"?esc(v):String(v??"");

 function photoMarkup(){
   const url = me?.photo_url || window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url;
   return url
     ? `<img class="rp372-photo" src="${escP(url)}" alt="">`
     : `<span>${escP((me?.first_name||me?.username||"R").slice(0,1).toUpperCase())}</span>`;
 }

 function overview(d){
   return `
    <section class="rp372-stats">
      <article><span>🎮</span><div><small>ІГРИ</small><b>${d.games.plays}</b><i>${d.games.earned} RH зароблено</i></div></article>
      <article><span>🎟️</span><div><small>БІЛЕТИ</small><b>${d.lottery.tickets}</b><i>${d.lottery.wins} перемог</i></div></article>
      <article><span>🏆</span><div><small>ДОСЯГНЕННЯ</small><b>${d.achievements}</b><i>у колекції</i></div></article>
      <article><span>✦</span><div><small>ЗАРОБЛЕНО</small><b>${d.total_earned}</b><i>RH за весь час</i></div></article>
    </section>
    <section class="rp372-level">
      <div><span>ACCOUNT PROGRESS</span><h2>Рівень ${d.level}</h2><p>${d.level_progress}/100 XP до наступного рівня</p></div>
      <b>${d.level_progress}%</b>
      <div class="rp372-track"><i style="width:${d.level_progress}%"></i></div>
    </section>
    <section class="rp372-shortcuts">
      <button onclick="rh32Open?.()"><span>🏆</span><div><small>ACHIEVEMENTS</small><b>Досягнення</b></div><i>→</i></button>
      <button onclick="rh35Open?.()"><span>♛</span><div><small>JOURNEY</small><b>Мій шлях</b></div><i>→</i></button>
      <button onclick="rh33Open?.()"><span>🎁</span><div><small>REWARDS</small><b>Нагороди</b></div><i>→</i></button>
      <button onclick="rh28OpenCosmetics?.()"><span>◈</span><div><small>STYLE</small><b>Кастомізація</b></div><i>→</i></button>
    </section>`;
 }

 function stats(d){
   return `<section class="rp372-statcards">
      <article><header><span>🎮</span><div><small>ARCADE</small><h3>Мініігри</h3></div></header>
        <div><span>Раундів</span><b>${d.games.plays}</b></div><div><span>Зароблено</span><b>${d.games.earned} RH</b></div><div><span>Рекорд</span><b>${d.games.best} RH</b></div></article>
      <article><header><span>🎟️</span><div><small>LOTTERY</small><h3>Розіграші</h3></div></header>
        <div><span>Білетів</span><b>${d.lottery.tickets}</b></div><div><span>Перемог</span><b>${d.lottery.wins}</b></div><div><span>Досягнень</span><b>${d.achievements}</b></div></article>
      <article><header><span>👥</span><div><small>COMMUNITY</small><h3>Соціальне</h3></div></header>
        <div><span>Підписники</span><b>${d.social.followers}</b></div><div><span>Підписки</span><b>${d.social.following}</b></div><div><span>Ранг</span><b>${escP(d.rank.name)}</b></div></article>
   </section>`;
 }

 function render(tab="overview"){
   const c=document.getElementById("content"); if(!c||!cache)return;
   const d=cache;
   c.innerHTML=`<main class="rp372">
      <section class="rp372-cover">
        <div class="rp372-gridfx"></div>
        <div class="rp372-main">
          <div class="rp372-avatar">${photoMarkup()}<i>${escP(d.rank.icon)}</i></div>
          <div class="rp372-id">
            <span>${escP(d.rank.name)} PLAYER</span>
            <h1>${escP(d.first_name||d.username||"Player")}</h1>
            <p>${d.username?"@"+escP(d.username):"ReferHub Player"} · LVL ${d.level}</p>
            <div><b>${escP(d.cosmetics.title||"Player")}</b><small>ID ${d.id}</small></div>
          </div>
        </div>
        <div class="rp372-balance"><small>RH BALANCE</small><b>${d.balance}</b><span>✦ ReferHub Stars</span></div>
      </section>
      <nav class="rp372-tabs">
        <button class="${tab==="overview"?"active":""}" onclick="rp372Tab('overview')">Огляд</button>
        <button class="${tab==="stats"?"active":""}" onclick="rp372Tab('stats')">Статистика</button>
      </nav>
      ${tab==="overview"?overview(d):stats(d)}
   </main>`;
 }

 async function open(){
   const c=document.getElementById("content");
   if(c)c.innerHTML='<div class="loader"></div>';
   try{
     cache=await api("/api/profile-v36");
     render("overview");
   }catch(err){
     if(c)c.innerHTML=`<div class="rp372-error"><span>⚠️</span><h2>Профіль не завантажився</h2><p>${escP(err?.message||"Невідома помилка")}</p></div>`;
   }
 }

 window.rp372Open=open;
 window.rp372Tab=tab=>render(tab);

 function install(){
   if(window.__rp372Installed)return;
   const oldOpenPage=window.openPage;
   if(typeof oldOpenPage!=="function")return;
   window.__rp372Installed=true;
   window.openPage=async function(page,...args){
     if(page==="profile") return open();
     return oldOpenPage.call(this,page,...args);
   };
 }

 document.addEventListener("DOMContentLoaded",install);
 setTimeout(install,100);
 setTimeout(install,600);
})();
