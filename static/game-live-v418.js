
/* ReferHub v4.18 — Live Game Cooldown
   Keeps the current game screen mounted after a round. */
(()=>{
 let timer=null;
 let currentGame=null;
 let endsAt=0;

 const READY_LABELS={
   roulette:"🎡 КРУТИТИ РУЛЕТКУ",
   daily_case:"ВІДКРИТИ КЕЙС",
   slot:"Грати зараз",
   reaction:"START"
 };

 function page(){
   return document.querySelector(".gc14-page[data-game-id]");
 }

 function gameId(){
   return page()?.dataset.gameId||null;
 }

 function format(sec){
   sec=Math.max(0,Math.ceil(Number(sec||0)));
   const h=Math.floor(sec/3600);
   const m=Math.floor((sec%3600)/60);
   const s=sec%60;
   if(h)return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
   return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
 }

 function controls(id){
   const shell=document.querySelector(".gc14-game-shell");
   if(!shell)return [];
   return [...shell.querySelectorAll("button")].filter(b=>!b.closest(".gc14-game-head"));
 }

 function setControlsDisabled(id,disabled){
   controls(id).forEach(b=>{
     // Remember initial disabled state only once.
     if(b.dataset.gc418InitialDisabled===undefined){
       b.dataset.gc418InitialDisabled=b.disabled?"1":"0";
     }
     if(disabled)b.disabled=true;
     else b.disabled=b.dataset.gc418InitialDisabled==="1";
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
         <small>COOLDOWN</small>
         <b id="gc418CooldownTitle">Наступна гра скоро</b>
         <p>Екран не оновлюється. Коли таймер дійде до нуля — можна одразу грати ще раз.</p>
       </div>`;
     const body=shell.querySelector(".gc14-game-head");
     body?.insertAdjacentElement("afterend",panel);
   }
   return panel;
 }

 function removePanel(){
   document.querySelector(".gc418-cooldown")?.remove();
 }

 function setStatus(text,ready=false){
   const top=document.getElementById("gc418TopStatus");
   const head=document.getElementById("gc418HeadStatus");
   if(top)top.textContent=text;
   if(head)head.textContent=text;
   top?.classList.toggle("ready",ready);
   head?.classList.toggle("ready",ready);
 }

 function resetSpecialControl(id){
   if(id==="roulette"){
     const b=document.getElementById("rhcRouletteButton");
     if(b)b.textContent=READY_LABELS.roulette;
   }else if(id==="daily_case"){
     const b=document.getElementById("rhcCaseButton");
     if(b)b.textContent=READY_LABELS.daily_case;
     const stage=document.getElementById("rhcCaseStage");
     stage?.classList.remove("opened");
   }else if(id==="slot"){
     const b=document.querySelector(".gc3-slot-controls button");
     if(b)b.textContent=READY_LABELS.slot;
   }else if(id==="reaction"){
     const b=document.getElementById("reaction44Button");
     if(b){b.textContent=READY_LABELS.reaction;b.disabled=false}
     const text=document.getElementById("reaction44Text");
     if(text)text.textContent="Натисни START і дочекайся зеленого сигналу.";
     document.getElementById("reaction44Lamp")?.classList.remove("ready");
   }else if(id==="scratch"){
     const surface=document.getElementById("scratchSurface");
     if(surface){
       surface.dataset.ready="";
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
   setControlsDisabled(id,false);
   resetSpecialControl(id);

   const shell=document.querySelector(".gc14-game-shell");
   shell?.classList.remove("gc418-waiting");
   shell?.classList.add("gc418-ready-flash");
   setTimeout(()=>shell?.classList.remove("gc418-ready-flash"),650);

   toast?.("Можна грати ще раз 🎮","success");
 }

 function tick(){
   const id=gameId();
   if(!id || id!==currentGame){
     if(timer){clearInterval(timer);timer=null}
     return;
   }

   const left=Math.max(0,Math.ceil((endsAt-Date.now())/1000));
   const text=format(left);
   setStatus(text,false);

   const timerText=document.getElementById("gc418Timer");
   if(timerText)timerText.textContent=text;

   if(left<=0)finish(id);
 }

 function start(id,seconds){
   seconds=Math.max(0,Number(seconds||0));
   currentGame=id;

   if(timer){clearInterval(timer);timer=null}

   if(seconds<=0){
     finish(id);
     return;
   }

   endsAt=Date.now()+seconds*1000;
   const panel=ensurePanel();
   panel?.classList.add("show");

   setControlsDisabled(id,true);
   document.querySelector(".gc14-game-shell")?.classList.add("gc418-waiting");

   tick();
   timer=setInterval(tick,250);
 }

 async function fetchCooldown(id){
   try{
     const games=await api("/api/games");
     const game=Array.isArray(games)?games.find(x=>x.game_key===id):null;
     return {
       remaining:Number(game?.cooldown_remaining||0),
       playsToday:Number(game?.plays_today||0),
       dailyLimit:Number(game?.daily_limit||0)
     };
   }catch(_){
     return {remaining:0,playsToday:0,dailyLimit:0};
   }
 }

 function addHistory(resultText,reward){
   if(!resultText)return;
   const list=document.querySelector(".gc14-history-list");
   if(!list)return;

   const empty=[...list.children].find(x=>x.tagName==="P");
   empty?.remove();

   const id=gameId();
   const icon=(typeof gc13Meta==="function"?gc13Meta(id)?.icon:"🎮")||"🎮";
   const row=document.createElement("div");
   row.className="gc418-new-result";
   row.innerHTML=`
     <i>${icon}</i>
     <span><b>${typeof esc==="function"?esc(resultText):resultText}</b><small>щойно</small></span>
     <strong class="${Number(reward)>0?"win":""}">${Number(reward)>0?`+${Number(reward)} RH`:"0 RH"}</strong>`;
   list.prepend(row);

   while(list.children.length>6)list.lastElementChild?.remove();
 }

 function updateBalance(){
   const b=document.getElementById("gc418Balance");
   if(b)b.textContent=`${Number(window.me?.balance||0)} RH`;
 }

 async function afterPlay(id,resultText="",reward=0){
   // Crucial: do NOT call openGameDetail here.
   updateBalance();
   addHistory(resultText,reward);

   const info=await fetchCooldown(id);

   // Update attempts text without remounting the screen.
   const statBlocks=[...document.querySelectorAll(".gc14-stats>div")];
   const attempts=statBlocks.find(x=>(x.querySelector("small")?.textContent||"").includes("Спроб"));
   if(attempts && info.dailyLimit){
     const left=Math.max(0,info.dailyLimit-info.playsToday);
     const b=attempts.querySelector("b");
     if(b)b.textContent=left;
   }

   if(info.dailyLimit && info.playsToday>=info.dailyLimit){
     if(timer){clearInterval(timer);timer=null}
     removePanel();
     setControlsDisabled(id,true);
     setStatus("Ліміт",false);
     return;
   }

   start(id,info.remaining);
 }

 window.gc418AfterPlay=afterPlay;

 async function syncCurrent(){
   const id=gameId();
   if(!id)return;

   currentGame=id;
   const info=await fetchCooldown(id);

   if(info.dailyLimit && info.playsToday>=info.dailyLimit){
     setControlsDisabled(id,true);
     setStatus("Ліміт",false);
     return;
   }

   if(info.remaining>0)start(id,info.remaining);
   else{
     removePanel();
     setStatus("Готово",true);
     setControlsDisabled(id,false);
   }
 }

 function decorate(){
   if(page())syncCurrent();
   else{
     if(timer){clearInterval(timer);timer=null}
     currentGame=null;
   }
 }

 document.addEventListener("DOMContentLoaded",()=>setTimeout(decorate,500));
 document.addEventListener("click",()=>setTimeout(()=>{
   const id=gameId();
   if(id && id!==currentGame)decorate();
 },80));
})();
