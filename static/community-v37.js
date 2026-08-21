
/* ReferHub v3.7 — Community / Activity Feed / Public Profiles */
(()=>{
 let d=null,tab="feed";
 const e=v=>typeof esc==="function"?esc(v):String(v??"");
 const ago=(ts)=>{
   const s=Math.max(0,Math.floor(Date.now()/1000-ts));
   if(s<60)return "щойно";
   if(s<3600)return `${Math.floor(s/60)} хв`;
   if(s<86400)return `${Math.floor(s/3600)} год`;
   return `${Math.floor(s/86400)} дн`;
 };

 function feed(){
   if(!d.feed.length)return '<div class="rh37-empty">Активності поки немає</div>';
   return `<section class="rh37-feed">${d.feed.map(x=>`
     <article onclick="rh37Profile(${x.user.id})">
       <div class="rh37-avatar"><span>${e(x.user.first_name).slice(0,1).toUpperCase()}</span><i>${x.user.rank.icon}</i></div>
       <div class="rh37-feed-copy">
         <div><b>${e(x.user.first_name)}</b><small>${ago(x.created_at)}</small></div>
         <h3>${x.icon} ${e(x.title)}</h3>
         <p>${e(x.detail)}</p>
       </div>
       <em>→</em>
     </article>`).join("")}</section>`;
 }

 function players(){
   return `<section class="rh37-players">${d.players.map(p=>`
    <article onclick="rh37Profile(${p.id})">
      <div class="rh37-p-cover"><div class="rh37-p-avatar"><span>${e(p.first_name).slice(0,1).toUpperCase()}</span><i>${p.rank.icon}</i></div></div>
      <div class="rh37-p-copy">
       <small>${e(p.rank.name)} · LVL ${p.level}</small>
       <h3>${e(p.first_name)}</h3>
       <p>${p.username?"@"+e(p.username):e(p.title)}</p>
       <section><span>🎮 ${p.games}</span><span>🏆 ${p.achievements}</span><span>🎟️ ${p.lottery_wins}</span></section>
      </div>
      <button ${p.self?"disabled":""}>${p.self?"ЦЕ ТИ":p.following?"ПІДПИСАНИЙ":"ПРОФІЛЬ"}</button>
    </article>`).join("")}</section>`;
 }

 function render(){
   const c=document.getElementById("content");if(!c||!d)return;
   c.innerHTML=`<main class="rh37">
    <section class="rh37-hero">
      <div><span>COMMUNITY · v3.7</span><h1>ReferHub живе</h1><p>Дивись активність спільноти, знаходь гравців і відкривай їхні профілі.</p></div>
      <div class="rh37-live"><i></i><small>COMMUNITY</small><b>${d.players.length}</b><span>активних профілів</span></div>
    </section>
    <nav class="rh37-tabs">
      <button class="${tab==="feed"?"active":""}" onclick="rh37Tab('feed')"><span>⚡</span><b>Активність</b></button>
      <button class="${tab==="players"?"active":""}" onclick="rh37Tab('players')"><span>👥</span><b>Гравці</b></button>
    </nav>
    <div class="rh37-title"><div><small>${tab==="feed"?"LIVE FEED":"DISCOVER"}</small><h2>${tab==="feed"?"Останні події":"Знайти гравців"}</h2></div></div>
    ${tab==="feed"?feed():players()}
   </main>`;
 }

 async function open(){
   try{d=await api("/api/community-v37");render()}catch(err){toast(err.message,"error")}
 }
 window.rh37Open=open;
 window.rh37Tab=x=>{tab=x;render()};

 window.rh37Profile=async id=>{
   try{
     const p=await api(`/api/public-profile-v37/${id}`);
     const c=document.getElementById("content");if(!c)return;
     if(p.self && typeof rh36Open==="function"){return rh36Open()}
     c.innerHTML=`<main class="rh37-public">
       <button class="rh37-back" onclick="rh37Open()">← Назад</button>
       <section class="rh37-public-cover">
         <div class="rh37-big-avatar"><span>${e(p.first_name).slice(0,1).toUpperCase()}</span><i>${p.rank.icon}</i></div>
         <div><span>${e(p.rank.name)} PLAYER</span><h1>${e(p.first_name)}</h1><p>${p.username?"@"+e(p.username):"ReferHub Player"}</p><b>${e(p.title)}</b></div>
       </section>
       <section class="rh37-public-stats">
         <article><small>LEVEL</small><b>${p.level}</b></article>
         <article><small>ІГРИ</small><b>${p.games}</b></article>
         <article><small>ДОСЯГНЕННЯ</small><b>${p.achievements}</b></article>
         <article><small>ПЕРЕМОГИ</small><b>${p.lottery_wins}</b></article>
       </section>
       <section class="rh37-social-card">
         <div><span>👥</span><section><small>FOLLOWERS</small><b>${p.followers}</b></section></div>
         <div><span>→</span><section><small>FOLLOWING</small><b>${p.following_count}</b></section></div>
         <button onclick="openPage('social')">${p.is_following?"В СОЦІАЛЬНОМУ ХАБІ":"ВІДКРИТИ SOCIAL HUB"}</button>
       </section>
     </main>`;
   }catch(err){toast(err.message,"error")}
 };

 function entry(){
   if(document.querySelector(".rh37-entry"))return;
   const host=document.querySelector(".rh30-actions");
   if(!host)return;
   const b=document.createElement("button");
   b.className="rh37-entry";
   b.innerHTML='<span>👥</span><div><small>COMMUNITY</small><b>Спільнота</b></div><i>→</i>';
   b.onclick=open;host.appendChild(b);
 }
 new MutationObserver(()=>requestAnimationFrame(entry)).observe(document.documentElement,{childList:true,subtree:true});
 setTimeout(entry,350);
})();
