
/* ReferHub v4.16 — Game Center visual rework
   Styling + presentation helpers only. */
(()=>{
 const classMap={
   roulette:"casino",daily_case:"daily",slot:"casino",coin_flip:"quick",
   number_guess:"logic",scratch:"daily",safe_crack:"logic",dice_duel:"quick",
   rps:"quick",treasure_grid:"risk",reaction:"skill",color_pick:"quick",
   high_low:"quick",lucky_card:"casino",triple_pick:"risk"
 };

 const tagMap={
   casino:"CASINO",daily:"DAILY",quick:"QUICK",logic:"LOGIC",risk:"RISK",skill:"SKILL"
 };

 function decorateCards(){
   document.querySelectorAll(".gc433-card").forEach(card=>{
     const id=card.dataset.gameId || card.getAttribute("onclick")?.match(/openGameDetail\('([^']+)'\)/)?.[1];
     if(!id)return;
     const type=classMap[id]||"other";
     card.classList.add("gc416-card",`gc416-${type}`);
     card.dataset.type=type;

     if(!card.querySelector(".gc416-badge")){
       const art=card.querySelector(".gc433-art");
       if(art){
         const badge=document.createElement("span");
         badge.className="gc416-badge";
         badge.textContent=tagMap[type]||"GAME";
         art.appendChild(badge);
       }
     }
   });
 }

 function decorateShell(){
   const shell=document.querySelector(".gc433-shell");
   if(!shell)return;
   shell.classList.add("gc416-shell");

   const head=shell.querySelector(".gc433-head");
   if(head && !head.querySelector(".gc416-kicker")){
     const kicker=document.createElement("div");
     kicker.className="gc416-kicker";
     kicker.innerHTML='<span>PLAY · EARN · COMPETE</span><b>REFERHUB ARCADE</b>';
     head.prepend(kicker);
   }

   const tabs=shell.querySelector(".gc433-tabs");
   if(tabs)tabs.classList.add("gc416-tabs");
 }

 function decorateDetail(){
   const page=document.querySelector(".gc14-page");
   if(!page)return;
   page.classList.add("gc416-detail");

   const shell=page.querySelector(".gc14-game-shell");
   if(shell)shell.classList.add("gc416-game-shell");

   const hero=page.querySelector(".gc14-hero");
   if(hero)hero.classList.add("gc416-game-hero");
 }

 function decorate(){
   decorateShell();
   decorateCards();
   decorateDetail();
 }

 document.addEventListener("DOMContentLoaded",decorate);
 document.addEventListener("click",()=>setTimeout(decorate,60));
 setTimeout(decorate,500);
})();
