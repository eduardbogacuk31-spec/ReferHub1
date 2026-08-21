
/* ReferHub v4.3.4 — Stable Profile */
(()=>{
 let pdata=null;
 const E=v=>typeof esc==="function"?esc(v):String(v??"");

 function fallbackAvatar(name){
   return `<span>${E((name||"R").slice(0,1).toUpperCase())}</span>`;
 }

 function photo(name){
   const url=window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url || me?.photo_url;
   return url ? `<img src="${E(url)}" alt="">` : fallbackAvatar(name);
 }

 function overview(d){
   return `
    <section class="p434-grid">
      <article><span>🎮</span><div><small>ІГРИ</small><b>${d.games.plays}</b><i>${d.games.earned} RH</i></div></article>
      <article><span>🎟️</span><div><small>БІЛЕТИ</small><b>${d.lottery.tickets}</b><i>${d.lottery.wins} перемог</i></div></article>
      <article><span>🏆</span><div><small>ДОСЯГНЕННЯ</small><b>${d.achievements}</b><i>отримано</i></div></article>
      <article><span>✦</span><div><small>ЗАРОБЛЕНО</small><b>${d.total_earned}</b><i>RH всього</i></div></article>
    </section>

    <section class="p434-progress">
      <div><small>ACCOUNT LEVEL</small><h2>Рівень ${d.level}</h2><p>${d.level_progress}/100 XP до наступного рівня</p></div>
      <b>${d.level_progress}%</b>
      <div class="p434-track"><i style="width:${d.level_progress}%"></i></div>
    </section>

    <section class="p434-actions">
      <button onclick="rh32Open?.()"><span>🏆</span><div><small>ACHIEVEMENTS</small><b>Досягнення</b></div><i>→</i></button>
      <button onclick="rh35Open?.()"><span>♛</span><div><small>JOURNEY</small><b>Мій шлях</b></div><i>→</i></button>
      <button onclick="rh33Open?.()"><span>🎁</span><div><small>REWARDS</small><b>Нагороди</b></div><i>→</i></button>
      <button onclick="rh28OpenCosmetics?.()"><span>◈</span><div><small>STYLE</small><b>Кастомізація</b></div><i>→</i></button>
    </section>`;
 }

 function stats(d){
   return `<section class="p434-statcards">
      <article><header><span>🎮</span><div><small>ARCADE</small><h3>Мініігри</h3></div></header>
        <div><span>Раундів</span><b>${d.games.plays}</b></div>
        <div><span>Зароблено</span><b>${d.games.earned} RH</b></div>
        <div><span>Рекорд</span><b>${d.games.best} RH</b></div>
      </article>
      <article><header><span>🎟️</span><div><small>LOTTERY</small><h3>Розіграші</h3></div></header>
        <div><span>Білетів</span><b>${d.lottery.tickets}</b></div>
        <div><span>Перемог</span><b>${d.lottery.wins}</b></div>
        <div><span>Досягнень</span><b>${d.achievements}</b></div>
      </article>
      <article><header><span>👥</span><div><small>COMMUNITY</small><h3>Соціальне</h3></div></header>
        <div><span>Підписники</span><b>${d.social.followers}</b></div>
        <div><span>Підписки</span><b>${d.social.following}</b></div>
        <div><span>Ранг</span><b>${E(d.rank.name)}</b></div>
      </article>
   </section>`;
 }

 function render(tab="overview"){
   const c=document.getElementById("content");
   if(!c||!pdata)return;
   const d=pdata;
   const name=d.first_name||d.username||"Player";

   c.innerHTML=`<section class="p434">
      <header class="p434-cover">
        <div class="p434-avatar">${photo(name)}<i>${E(d.rank.icon)}</i></div>
        <div class="p434-id">
          <span>${E(d.rank.name)} PLAYER</span>
          <h1>${E(name)}</h1>
          <p>${d.username?"@"+E(d.username):"ReferHub Player"} · LVL ${d.level}</p>
          <div><b>${E(d.cosmetics.title||"Player")}</b><small>ID ${d.id}</small></div>
        </div>
        <article class="p434-balance">
          <small>RH BALANCE</small>
          <b>${d.balance}</b>
          <i>✦ RH Stars</i>
        </article>
      </header>

      <nav class="p434-tabs">
        <button class="${tab==="overview"?"active":""}" onclick="p434Tab('overview')">Огляд</button>
        <button class="${tab==="stats"?"active":""}" onclick="p434Tab('stats')">Статистика</button>
      </nav>

      ${tab==="overview"?overview(d):stats(d)}
   </section>`;

   document.querySelector("body > main")?.scrollTo({top:0,behavior:"auto"});
 }

 async function load(){
   const c=document.getElementById("content");
   if(c)c.innerHTML='<div class="loader"></div>';
   try{
     pdata=await api("/api/profile-v36");
     render("overview");
   }catch(err){
     if(c)c.innerHTML=`<section class="p434-error"><span>⚠️</span><h2>Профіль не завантажився</h2><p>${E(err?.message||"Помилка")}</p></section>`;
   }
 }

 window.profilePage=load;
 window.p434Tab=t=>render(t);

 // If core app uses another known profile function name, expose aliases only.
 window.openProfile=load;
 window.openProfilePage=load;
})();
