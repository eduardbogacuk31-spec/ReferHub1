
/* ReferHub v4.23 — Hybrid Game Engine
   11 classic games use Game Pro visuals.
   4 newer games stay on current app engine.
   No full page remount after a classic round. */
(()=>{
 const LEGACY=new Set([
   "roulette","daily_case","slot","coin_flip","number_guess","scratch",
   "safe_crack","dice_duel","rps","treasure_grid","reaction"
 ]);
 const MODERN=new Set(["color_pick","high_low","lucky_card","triple_pick"]);

 const legacyOpen=window.__gp423LegacyOpenGameDetail;
 const modernOpen=window.openGameDetail;
 const modernGamesPage=window.gamesPage;

 let countdown=null;
 let countdownGame=null;
 let countdownEnds=0;

 function currentLegacyPage(){
   return document.querySelector(".gp-game");
 }

 function fmt(sec){
   sec=Math.max(0,Math.ceil(Number(sec||0)));
   const d=Math.floor(sec/86400);
   const h=Math.floor((sec%86400)/3600);
   const m=Math.floor((sec%3600)/60);
   const s=sec%60;
   if(d)return `${d}д ${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
   if(h)return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
   return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
 }

 async function status(id){
   const games=await api("/api/games");
   const g=Array.isArray(games)?games.find(x=>x.game_key===id):null;
   if(!g)return {game:null,remaining:0,reason:"cooldown"};

   const dailyReached=Boolean(g.daily_limit_reached) ||
     Boolean(g.daily_limit && Number(g.plays_today||0)>=Number(g.daily_limit));
   const cd=Number(g.cooldown_remaining||0);
   const daily=Number(g.daily_reset_remaining||0);
   const remaining=Number(g.availability_remaining ?? Math.max(cd,dailyReached?daily:0));
   return {
     game:g,
     remaining,
     reason:dailyReached&&daily>=cd?"daily":"cooldown"
   };
 }

 function disableStage(disabled){
   const stage=document.querySelector(".gp-stage-card");
   if(!stage)return;
   stage.querySelectorAll("button,input").forEach(el=>{
     if(el.dataset.gp423BaseDisabled===undefined)
       el.dataset.gp423BaseDisabled=el.disabled?"1":"0";
     el.disabled=disabled?true:el.dataset.gp423BaseDisabled==="1";
   });
   const scratch=document.getElementById("gv2Scratch");
   if(scratch)scratch.style.pointerEvents=disabled?"none":"";
 }

 function ensureTimer(reason){
   const stage=document.querySelector(".gp-stage-card");
   if(!stage)return null;
   let box=stage.querySelector(".gp423-live-wait");
   if(!box){
     box=document.createElement("section");
     box.className="gp423-live-wait";
     box.innerHTML=`
       <div class="gp423-clock"><b id="gp423Timer">00:00</b></div>
       <div><small id="gp423Kind">COOLDOWN</small>
       <h3 id="gp423WaitTitle">Наступний раунд скоро</h3>
       <p>Екран не перезавантажується. Після нуля можна одразу грати далі.</p></div>`;
     stage.querySelector(".gp-stage-title")?.insertAdjacentElement("afterend",box);
   }
   const k=document.getElementById("gp423Kind");
   const title=document.getElementById("gp423WaitTitle");
   if(reason==="daily"){
     if(k)k.textContent="DAILY RESET";
     if(title)title.textContent="До відновлення денного ліміту";
   }else{
     if(k)k.textContent="COOLDOWN";
     if(title)title.textContent="Наступний раунд скоро";
   }
   return box;
 }

 function updateTopStatus(text,ready=false){
   const small=document.querySelector(".gp-stage-title>small");
   if(small){
     small.textContent=text;
     small.classList.toggle("gp423-ready",ready);
   }
   const chip=document.querySelector(".gp-game-actions>span");
   if(chip){
     chip.classList.toggle("ready",ready);
     chip.classList.toggle("cool",!ready);
     const dot=chip.querySelector("i");
     chip.innerHTML="";
     if(dot)chip.appendChild(dot);
     chip.append(document.createTextNode(text));
   }
 }

 async function rerenderStage(id){
   const info=await status(id);
   const s=info.game||{};
   const stage=document.querySelector(".gp-stage-card");
   if(!stage || typeof window.gpStage!=="function")return;

   const meta=typeof window.gpMeta==="function"?window.gpMeta(id):{name:id};
   stage.innerHTML=`
     <div class="gp-stage-title">
       <div><span>LIVE MODE</span><h2>${meta.name||id}</h2></div>
       <small>Готово до запуску</small>
     </div>
     ${window.gpStage(id,s)}`;

   if(id==="scratch" && typeof window.gv2InitScratch==="function"){
     setTimeout(window.gv2InitScratch,30);
   }

   updateTopStatus("Готово",true);
 }

 async function finish(id){
   if(countdown){clearInterval(countdown);countdown=null}
   countdownEnds=0;
   document.querySelector(".gp423-live-wait")?.remove();
   disableStage(false);
   await rerenderStage(id);
   document.querySelector(".gp-stage-card")?.classList.add("gp423-ready-flash");
   setTimeout(()=>document.querySelector(".gp-stage-card")?.classList.remove("gp423-ready-flash"),650);
   toast?.("Можна грати ще раз 🎮","success");
 }

 function tick(){
   if(!currentLegacyPage() || !countdownGame){
     if(countdown){clearInterval(countdown);countdown=null}
     return;
   }
   const left=Math.max(0,Math.ceil((countdownEnds-Date.now())/1000));
   const text=fmt(left);
   const t=document.getElementById("gp423Timer");
   if(t)t.textContent=text;
   updateTopStatus(text,false);
   if(left<=0)finish(countdownGame);
 }

 async function startAvailability(id){
   const info=await status(id);
   countdownGame=id;

   if(info.remaining<=0){
     await finish(id);
     return;
   }

   if(countdown){clearInterval(countdown)}
   countdownEnds=Date.now()+info.remaining*1000;
   ensureTimer(info.reason);
   disableStage(true);
   tick();
   countdown=setInterval(tick,250);
 }

 window.gp423AfterPlay=function(id){
   // Called only after the legacy animation has had time to show its result.
   startAvailability(id).catch(err=>{
     console.warn("gp423AfterPlay",err);
     disableStage(false);
   });
 };

 window.openGameDetail=function(id){
   if(countdown){clearInterval(countdown);countdown=null}
   countdownGame=null;

   if(LEGACY.has(id) && typeof legacyOpen==="function"){
     return legacyOpen(id);
   }
   if(typeof modernOpen==="function"){
     return modernOpen(id);
   }
 };

 // Keep the modern 15-game catalog, but route its cards through hybrid openGameDetail.
 window.gamesPage=function(){
   return modernGamesPage?.();
 };

 // When a classic screen is opened while already cooling down, start live timer immediately.
 const oldOpen=window.openGameDetail;
 window.openGameDetail=async function(id){
   const result=await oldOpen(id);
   if(LEGACY.has(id)){
     setTimeout(async()=>{
       try{
         const info=await status(id);
         if(info.remaining>0){
           countdownGame=id;
           countdownEnds=Date.now()+info.remaining*1000;
           ensureTimer(info.reason);
           disableStage(true);
           tick();
           if(countdown)clearInterval(countdown);
           countdown=setInterval(tick,250);
         }
       }catch(_){}
     },80);
   }
   return result;
 };
})();
