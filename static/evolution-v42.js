
(()=>{
 function overlay(){let o=document.querySelector(".rh42-overlay");if(!o){o=document.createElement("div");o.className="rh42-overlay";document.body.appendChild(o)}return o}
 window.rh42Close=()=>document.querySelector(".rh42-overlay")?.classList.remove("show");
 const actions=[
 ["🏠","Головна",()=>openPage?.("home")],["🎮","Ігри",()=>openPage?.("games")],["🏆","Турніри",()=>rh38Open?.()],
 ["📋","Daily Missions",()=>rh39Open?.()],["🔥","Daily Streak",()=>rh40Open?.()],["🧭","Quest Center",()=>rh41Open?.()],
 ["👤","Профіль",()=>openPage?.("profile")],["👥","Community",()=>rh37Open?.()]
 ];
 window.rh42Go=i=>{rh42Close();actions[i]?.[2]?.()};
 window.rh42Command=()=>{const o=overlay();o.innerHTML=`<section class="rh42-panel"><header><div><small>QUICK ACCESS</small><h2>Швидкий перехід</h2></div><button onclick="rh42Close()">×</button></header><div class="rh42-command-grid">${actions.map((a,i)=>`<button onclick="rh42Go(${i})"><span>${a[0]}</span><b>${a[1]}</b><i>→</i></button>`).join("")}</div></section>`;o.classList.add("show")};
 window.rh42Notifications=()=>{const o=overlay();o.innerHTML=`<section class="rh42-panel"><header><div><small>NOTIFICATION CENTER</small><h2>Сповіщення</h2></div><button onclick="rh42Close()">×</button></header><div class="rh42-notices"><article><span>🔥</span><div><b>Daily Streak</b><p>Забери щоденну нагороду.</p></div></article><article><span>🏆</span><div><b>Live Tournaments</b><p>Перевір своє місце в рейтингу.</p></div></article><article><span>🧭</span><div><b>Quest Center</b><p>Тижневі квести та скрині вже доступні.</p></div></article></div></section>`;o.classList.add("show")};

 function topbar(){
  if(document.querySelector(".rh42-topbar"))return;
  const c=document.getElementById("content");if(!c?.parentNode)return;
  const x=document.createElement("header");x.className="rh42-topbar";x.innerHTML=`<button class="rh42-brand" onclick="openPage?.('home')"><i>R</i><span><b>REFERHUB</b><small>EVOLUTION 4.2</small></span></button><div><button class="rh42-search" onclick="rh42Command()">⌕ <b>Швидкий перехід</b></button><button class="rh42-bell" onclick="rh42Notifications()">🔔<i>3</i></button></div>`;c.parentNode.insertBefore(x,c)
 }
 function dashboard(){
  if(document.querySelector(".rh42-dashboard"))return;
  if(document.querySelector(".rp372,.rh38,.rh38-detail,.rh39,.rh40,.rh41,.rh37"))return;
  const host=document.querySelector(".rh30-actions");if(!host)return;
  const x=document.createElement("section");x.className="rh42-dashboard";x.innerHTML=`<div class="rh42-welcome"><div><span>REFERHUB NETWORK</span><h2>Твій центр активності</h2><p>Ігри, турніри, квести та нагороди в одному місці.</p></div><button onclick="openPage?.('games')">ГРАТИ ЗАРАЗ →</button></div><div class="rh42-livegrid"><button onclick="rh38Open?.()"><span>🏆</span><div><small>LIVE</small><b>Турніри</b><p>Рейтинг і призи</p></div><i>→</i></button><button onclick="rh39Open?.()"><span>📋</span><div><small>DAILY</small><b>Місії</b><p>Щоденні RH</p></div><i>→</i></button><button onclick="rh40Open?.()"><span>🔥</span><div><small>STREAK</small><b>Серія</b><p>7-денні нагороди</p></div><i>→</i></button><button onclick="rh41Open?.()"><span>🧭</span><div><small>WEEKLY</small><b>Quest Center</b><p>Квести та скрині</p></div><i>→</i></button></div>`;host.parentNode.insertBefore(x,host)
 }
 function polish(){topbar();dashboard();document.querySelectorAll(".game-card,.rh38-card,.rh39-card,.rh41-q,.rh40-week article").forEach(x=>x.classList.add("rh42-card"))}
 new MutationObserver(()=>requestAnimationFrame(polish)).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener("DOMContentLoaded",polish);setTimeout(polish,250);
})();
