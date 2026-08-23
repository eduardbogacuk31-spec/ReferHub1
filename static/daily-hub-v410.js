
/* ReferHub v4.10 — Daily Hub
   Front-end engagement layer. Does not replace existing reward/game logic. */
(()=>{
 const E=v=>typeof esc==="function"?esc(v):String(v??"");
 const KEY="referhub_daily_hub_v410";
 let state={};

 function today(){
   const d=new Date();
   return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
 }
 function load(){
   try{state=JSON.parse(localStorage.getItem(KEY)||"{}")}catch(_){state={}}
   if(state.date!==today())state={date:today(),visited:{},opened:false};
   state.visited=state.visited||{};
   return state;
 }
 function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(_){}}
 function mark(page){
   load();
   const map={earn:"tasks",games:"games",lottery:"lottery",friends:"friends",profile:"profile"};
   if(map[page]){state.visited[map[page]]=true;save()}
 }
 const missions=[
   {key:"tasks",icon:"📋",title:"Перевір завдання",desc:"Зазирни у доступні способи заробити RH.",page:"earn"},
   {key:"games",icon:"🎮",title:"Зайди в Game Center",desc:"Обери одну з ігор на сьогодні.",page:"games"},
   {key:"lottery",icon:"🎟️",title:"Перевір розіграш",desc:"Подивись активні розіграші та білети.",page:"lottery"},
   {key:"friends",icon:"👥",title:"Зазирни до друзів",desc:"Пошук людей, друзі та соціальна активність.",page:"friends"}
 ];
 function progress(){
   load(); return missions.filter(m=>state.visited[m.key]).length;
 }
 function modal(inner){
   let o=document.getElementById("dh410Overlay");
   if(!o){o=document.createElement("div");o.id="dh410Overlay";o.className="dh410-overlay";document.body.appendChild(o)}
   o.innerHTML=`<section class="dh410-modal">${inner}</section>`;o.classList.add("show");
 }
 window.dh410Close=()=>document.getElementById("dh410Overlay")?.classList.remove("show");

 window.dh410Open=()=>{
   load();
   const done=progress(), pct=Math.round(done/missions.length*100);
   modal(`<header class="dh410-head">
      <div><small>DAILY HUB · ${today()}</small><h2>Твій день у ReferHub</h2><p>${done}/${missions.length} активностей переглянуто</p></div>
      <button onclick="dh410Close()">×</button>
    </header>
    <section class="dh410-progress"><div><span style="width:${pct}%"></span></div><b>${pct}%</b></section>
    <div class="dh410-missions">
      ${missions.map(m=>`<button class="${state.visited[m.key]?"done":""}" onclick="dh410Go('${m.page}')">
        <span>${state.visited[m.key]?"✓":m.icon}</span>
        <div><small>${state.visited[m.key]?"ПЕРЕГЛЯНУТО":"НА СЬОГОДНІ"}</small><b>${E(m.title)}</b><p>${E(m.desc)}</p></div><i>→</i>
      </button>`).join("")}
    </div>
    <section class="dh410-tip"><span>✦</span><div><small>DAILY TIP</small><b>${done===missions.length?"Маршрут на сьогодні завершено":"Не знаєш, з чого почати?"}</b><p>${done===missions.length?"Тепер можеш повернутись до улюблених активностей.":"Почни із завдань, а потім переходь у Game Center."}</p></div></section>`);
   state.opened=true;save();
 };

 window.dh410Go=page=>{
   mark(page);dh410Close();
   if(typeof openPage==="function")openPage(page);
 };

 function addLauncher(){
   if(document.getElementById("dh410Launcher"))return;
   const content=document.getElementById("content"); if(!content)return;
   const b=document.createElement("button");
   b.id="dh410Launcher";b.className="dh410-launcher";
   b.innerHTML='<span>✦</span><div><small>DAILY HUB</small><b>План на сьогодні</b></div><i>→</i>';
   b.onclick=dh410Open;
   content.insertAdjacentElement("afterbegin",b);
 }
 function updateLauncher(){
   const b=document.getElementById("dh410Launcher");if(!b)return;
   const done=progress();
   const title=b.querySelector("b");const sm=b.querySelector("small");
   if(title)title.textContent=done===missions.length?"День завершено":`План на сьогодні · ${done}/${missions.length}`;
   if(sm)sm.textContent=done===missions.length?"DAILY COMPLETE":"DAILY HUB";
   b.classList.toggle("complete",done===missions.length);
 }
 function pageKey(){
   const c=document.getElementById("content");if(!c)return null;
   if(c.querySelector(".gc433-shell,.gc14-page"))return "games";
   if(c.querySelector(".pc82-shell"))return "earn";
   if(c.querySelector(".lot11-active,.lot11-history,.lot11-bottom-grid"))return "lottery";
   if(c.querySelector(".rh37,.social831"))return "friends";
   if(c.querySelector(".p434"))return "profile";
   return null;
 }
 function sync(){
   const p=pageKey();if(p)mark(p);
   addLauncher();updateLauncher();
 }
 document.addEventListener("DOMContentLoaded",()=>{load();setTimeout(sync,700)});
 document.addEventListener("click",()=>setTimeout(sync,100));
})();
