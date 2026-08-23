
/* ReferHub v4.22 — Live availability timer
   Current game stays mounted; cooldown and daily reset both count down live. */
(()=>{
 let timer=null;
 let currentGame=null;
 let endsAt=0;
 let currentReason="cooldown";

 const READY_LABELS={
   roulette:"🎡 КРУТИТИ РУЛЕТКУ",
   daily_case:"ВІДКРИТИ КЕЙС",
   slot:"Грати зараз",
   reaction:"START"
 };

 const page=()=>document.querySelector(".gc14-page[data-game-id]");
 const gameId=()=>page()?.dataset.gameId||null;

 function format(sec){
   sec=Math.max(0,Math.ceil(Number(sec||0)));
   const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
   if(h>=24){
     const d=Math.floor(h/24),hh=h%24;
     return `${d}д ${String(hh).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
   }
   if(h)return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
   return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
 }

 function controls(){
   const shell=document.querySelector(".gc14-game-shell");
   if(!shell)return [];
   return [...shell.querySelectorAll("button")].filter(b=>!b.closest(".gc14-game-head"));
 }

 function setControlsDisabled(disabled){
   controls().forEach(b=>{
     if(b.dataset.gc422BaseDisabled===undefined)b.dataset.gc422BaseDisabled=b.disabled?"1":"0";
     b.disabled=disabled ? true : b.dataset.gc422BaseDisabled==="1";
   });
   const surface=document.getElementById("scratchSurface");
   if(surface){
     surface.classList.toggle("gc418-disabled",disabled);
     surface.style.pointerEvents=disabled?"none":"";
   }
 }

 function ensurePanel(){
   const shell=document.querySelector(".gc14-game-shell");
   if(!shell)return null;
   let panel=shell.querySelector(".gc418-cooldown");
   if(!panel){
     panel=document.createElement("section");
     panel.className="gc418-cooldown";
     panel.innerHTML=`
       <div class="gc418-ring"><span id="gc418Timer">00:00</span></div>
       <div>
         <small id="gc422WaitKind">COOLDOWN</small>
         <b id="gc418CooldownTitle">Наступна гра скоро</b>
         <p id="gc422WaitText">Таймер іде наживо. Екран гри не перезавантажується.</p>
       </div>`;
     shell.querySelector(".gc14-game-head")?.insertAdjacentElement("afterend",panel);
   }
   return panel;
 }

 const removePanel=()=>document.querySelector(".gc418-cooldown")?.remove();

 function setStatus(text,ready=false){
   for(const el of [document.getElementById("gc418TopStatus"),document.getElementById("gc418HeadStatus")]){
     if(el){el.textContent=text;el.classList.toggle("ready",ready)}
   }
 }

 function resetSpecialControl(id){
   if(id==="roulette"){
     const b=document.getElementById("rhcRouletteButton");if(b)b.textContent=READY_LABELS.roulette;
   }else if(id==="daily_case"){
     const b=document.getElementById("rhcCaseButton");if(b)b.textContent=READY_LABELS.daily_case;
   }else if(id==="slot"){
     const b=document.querySelector(".gc3-slot-controls button");if(b)b.textContent=READY_LABELS.slot;
   }else if(id==="reaction"){
     const b=document.getElementById("reaction44Button");
     if(b){b.textContent=READY_LABELS.reaction;b.disabled=false}
     const text=document.getElementById("reaction44Text");
     if(text)text.textContent="Натисни START і дочекайся зеленого сигналу.";
     document.getElementById("reaction44Lamp")?.classList.remove("ready");
   }else if(id==="scratch"){
     const surface=document.getElementById("scratchSurface");
     if(surface){
       delete surface.dataset.ready;
       surface.innerHTML="СТИРАЙ ПАЛЬЦЕМ";
       surface.classList.remove("disabled","gc418-disabled");
       surface.style.pointerEvents="";
       if(typeof startScratchInteraction==="function")startScratchInteraction(surface);
     }
   }
 }

 function finish(id){
   if(timer){clearInterval(timer);timer=null}
   endsAt=0;
   removePanel();
   setStatus("Готово",true);
   setControlsDisabled(false);
   resetSpecialControl(id);

   const shell=document.querySelector(".gc14-game-shell");
   shell?.classList.remove("gc418-waiting");
   shell?.classList.add("gc418-ready-flash");
   setTimeout(()=>shell?.classList.remove("gc418-ready-flash"),650);
   toast?.("Можна грати ще раз 🎮","success");
 }

 function tick(){
   const id=gameId();
   if(!id||id!==currentGame){
     if(timer){clearInterval(timer);timer=null}
     return;
   }
   const left=Math.max(0,Math.ceil((endsAt-Date.now())/1000));
   const text=format(left);
   setStatus(text,false);
   const node=document.getElementById("gc418Timer");
   if(node)node.textContent=text;
   if(left<=0)finish(id);
 }

 function start(id,seconds,reason="cooldown"){
   seconds=Math.max(0,Number(seconds||0));
   currentGame=id;
   currentReason=reason;
   if(timer){clearInterval(timer);timer=null}

   if(seconds<=0){finish(id);return}

   endsAt=Date.now()+seconds*1000;
   ensurePanel();
   setControlsDisabled(true);
   document.querySelector(".gc14-game-shell")?.classList.add("gc418-waiting");

   const kind=document.getElementById("gc422WaitKind");
   const title=document.getElementById("gc418CooldownTitle");
   const text=document.getElementById("gc422WaitText");

   if(reason==="daily"){
     if(kind)kind.textContent="DAILY RESET";
     if(title)title.textContent="Наступна спроба після оновлення ліміту";
     if(text)text.textContent="Це живий таймер до наступного денного циклу. На 00:00 гра розблокується.";
   }else{
     if(kind)kind.textContent="COOLDOWN";
     if(title)title.textContent="Наступний раунд скоро";
     if(text)text.textContent="Таймер іде наживо. Екран гри не перезавантажується.";
   }

   tick();
   timer=setInterval(tick,250);
 }

 async function fetchAvailability(id){
   const games=await api("/api/games");
   const g=Array.isArray(games)?games.find(x=>x.game_key===id):null;
   if(!g)return {remaining:0,reason:"cooldown",playsToday:0,dailyLimit:0};

   const dailyReached=Boolean(g.daily_limit_reached) ||
     Boolean(g.daily_limit && Number(g.plays_today||0)>=Number(g.daily_limit));

   const cooldown=Number(g.cooldown_remaining||0);
   const daily=Number(g.daily_reset_remaining||0);
   const remaining=Number(g.availability_remaining ?? Math.max(cooldown,dailyReached?daily:0));

   return {
     remaining,
     reason:dailyReached && daily>=cooldown ? "daily" : "cooldown",
     playsToday:Number(g.plays_today||0),
     dailyLimit:Number(g.daily_limit||0)
   };
 }

 function addHistory(resultText,reward){
   if(!resultText)return;
   const list=document.querySelector(".gc14-history-list");if(!list)return;
   [...list.children].find(x=>x.tagName==="P")?.remove();

   const id=gameId();
   const icon=(typeof gc13Meta==="function"?gc13Meta(id)?.icon:"🎮")||"🎮";
   const row=document.createElement("div");
   row.className="gc418-new-result";
   const safe=typeof esc==="function"?esc(resultText):String(resultText);
   row.innerHTML=`<i>${icon}</i><span><b>${safe}</b><small>щойно</small></span><strong class="${Number(reward)>0?"win":""}">${Number(reward)>0?`+${Number(reward)} RH`:"0 RH"}</strong>`;
   list.prepend(row);
   while(list.children.length>6)list.lastElementChild?.remove();
 }

 function updateBalance(){
   const b=document.getElementById("gc418Balance");
   if(b)b.textContent=`${Number(window.me?.balance||0)} RH`;
 }

 window.gc418AfterPlay=async function(id,resultText="",reward=0){
   updateBalance();
   addHistory(resultText,reward);

   try{
     const info=await fetchAvailability(id);

     const attempts=[...document.querySelectorAll(".gc14-stats>div")]
       .find(x=>(x.querySelector("small")?.textContent||"").includes("Спроб"));
     if(attempts&&info.dailyLimit){
       const b=attempts.querySelector("b");
       if(b)b.textContent=Math.max(0,info.dailyLimit-info.playsToday);
     }

     start(id,info.remaining,info.reason);
   }catch(error){
     // Even a status refresh failure must not remount the game.
     setControlsDisabled(false);
     setStatus("Готово",true);
     console.warn("Live availability refresh failed",error);
   }
 };

 async function syncCurrent(){
   const id=gameId();if(!id)return;
   currentGame=id;
   try{
     const info=await fetchAvailability(id);
     if(info.remaining>0)start(id,info.remaining,info.reason);
     else{
       removePanel();
       setStatus("Готово",true);
       setControlsDisabled(false);
     }
   }catch(_){}
 }

 document.addEventListener("DOMContentLoaded",()=>setTimeout(syncCurrent,500));
 document.addEventListener("click",()=>setTimeout(()=>{
   const id=gameId();
   if(id&&id!==currentGame)syncCurrent();
 },80));
})();
