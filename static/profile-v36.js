
/* ReferHub v3.6 — Profile 3.0 */
(()=>{
 let data=null, tab="overview";
 const e=v=>typeof esc==="function"?esc(v):String(v??"");

 function overview(){
   return `<section class="rh36-overview">
    <div class="rh36-stat-grid">
      <article><span>🎮</span><small>ІГОР</small><b>${data.games.plays}</b><i>${data.games.earned} RH зароблено</i></article>
      <article><span>🎟️</span><small>БІЛЕТІВ</small><b>${data.lottery.tickets}</b><i>${data.lottery.wins} перемог</i></article>
      <article><span>🏆</span><small>ДОСЯГНЕНЬ</small><b>${data.achievements}</b><i>у колекції</i></article>
      <article><span>✦</span><small>ВСЬОГО RH</small><b>${data.total_earned}</b><i>за весь час</i></article>
    </div>

    <section class="rh36-showcase">
      <div class="rh36-section-head"><div><span>SHOWCASE</span><h2>Вітрина гравця</h2></div><button onclick="openPage('cosmetics')">Змінити →</button></div>
      <div class="rh36-show-grid">
        <article><span>◈</span><div><small>ТИТУЛ</small><b>${e(data.cosmetics.title)}</b></div></article>
        <article><span>▣</span><div><small>РАМКА</small><b>${e(data.cosmetics.frame)}</b></div></article>
        <article><span>▤</span><div><small>ФОН</small><b>${e(data.cosmetics.background)}</b></div></article>
      </div>
    </section>

    <section class="rh36-progress-card">
      <div><span>ACCOUNT LEVEL</span><h2>Рівень ${data.level}</h2><p>${data.level_progress}/100 XP до наступного рівня</p></div>
      <b>${data.level_progress}%</b>
      <div class="rh36-track"><i style="width:${data.level_progress}%"></i></div>
    </section>
   </section>`;
 }

 function stats(){
   return `<section class="rh36-stats-page">
    <article><header><span>🎮</span><div><small>ARCADE</small><h3>Ігрова статистика</h3></div></header><div><span>Зіграно раундів</span><b>${data.games.plays}</b></div><div><span>Зароблено</span><b>${data.games.earned} RH</b></div><div><span>Найкраща нагорода</span><b>${data.games.best} RH</b></div></article>
    <article><header><span>🎟️</span><div><small>LOTTERY</small><h3>Розіграші</h3></div></header><div><span>Білетів</span><b>${data.lottery.tickets}</b></div><div><span>Перемог</span><b>${data.lottery.wins}</b></div><div><span>Win rate</span><b>${data.lottery.tickets?((data.lottery.wins/data.lottery.tickets)*100).toFixed(1):"0.0"}%</b></div></article>
    <article><header><span>👥</span><div><small>SOCIAL</small><h3>Спільнота</h3></div></header><div><span>Підписники</span><b>${data.social.followers}</b></div><div><span>Підписки</span><b>${data.social.following}</b></div><div><span>Досягнення</span><b>${data.achievements}</b></div></article>
   </section>`;
 }

 function collection(){
   return `<section class="rh36-collection">
    <button onclick="rh32Open()"><span>🏆</span><div><small>ACHIEVEMENTS</small><b>Досягнення</b><p>Колекція, прогрес та рідкісні ачивки</p></div><i>→</i></button>
    <button onclick="rh35Open()"><span>♛</span><div><small>JOURNEY</small><b>Мій шлях</b><p>Rookie → Master та етапи розвитку</p></div><i>→</i></button>
    <button onclick="rh33Open()"><span>🎁</span><div><small>REWARDS</small><b>Центр нагород</b><p>Забери доступні RH-нагороди</p></div><i>→</i></button>
    <button onclick="openPage('cosmetics')"><span>◈</span><div><small>COSMETICS</small><b>Стилі профілю</b><p>Рамки, фони, титули та оформлення</p></div><i>→</i></button>
   </section>`;
 }

 function render(){
   const c=document.getElementById("content");if(!c||!data)return;
   const name=e(data.first_name||data.username||"Player");
   c.innerHTML=`<main class="rh36">
    <section class="rh36-cover">
      <div class="rh36-cover-grid"></div>
      <div class="rh36-profile-main">
        <div class="rh36-avatar ${e(data.cosmetics.frame)}"><span>${name.slice(0,1).toUpperCase()}</span><i>${data.rank.icon}</i></div>
        <div class="rh36-ident">
          <span>${e(data.rank.name)} PLAYER</span>
          <h1>${name}</h1>
          <p>${data.username?"@"+e(data.username):"ReferHub Player"} · LVL ${data.level}</p>
          <div><b>${e(data.cosmetics.title)}</b><small>ID ${data.id}</small></div>
        </div>
      </div>
      <div class="rh36-cover-side">
        <article><small>RH BALANCE</small><b>${data.balance}</b><i>✦ RH Stars</i></article>
        <article><small>RANK</small><b>${e(data.rank.name)}</b><i>Level ${data.level}</i></article>
      </div>
    </section>

    <nav class="rh36-tabs">
      <button class="${tab==="overview"?"active":""}" onclick="rh36Tab('overview')"><span>◈</span><b>Огляд</b></button>
      <button class="${tab==="stats"?"active":""}" onclick="rh36Tab('stats')"><span>▥</span><b>Статистика</b></button>
      <button class="${tab==="collection"?"active":""}" onclick="rh36Tab('collection')"><span>♛</span><b>Колекція</b></button>
    </nav>
    ${tab==="overview"?overview():tab==="stats"?stats():collection()}
   </main>`;
 }

 async function open(){
   try{data=await api("/api/profile-v36");render()}
   catch(err){toast(err.message,"error")}
 }
 window.rh36Open=open;
 window.rh36Tab=x=>{tab=x;render()};

 // Replace only the profile navigation destination, while preserving other systems.
 

 // v3.6.1 hotfix: safe profile routing without capture-phase click interception.
 function installProfileRoute(){
   if(window.__rh361ProfileRouteInstalled)return;
   window.__rh361ProfileRouteInstalled=true;

   const original=window.openPage;
   if(typeof original==="function"){
     window.openPage=async function(page,...args){
       if(page==="profile"){
         return open();
       }
       return original.call(this,page,...args);
     };
   }
 }
 window.openProfileV36=open;
 document.addEventListener("DOMContentLoaded",installProfileRoute);
 setTimeout(installProfileRoute,100);
 setTimeout(installProfileRoute,700);

})();
