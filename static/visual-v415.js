
/* ReferHub v4.15 — Visual Overhaul
   Pure presentation layer: no navigation/backend/game logic replacement. */
(()=>{
 function decorate(){
   const content=document.getElementById("content");
   if(content)content.classList.add("v415-content");

   // Give the current main screen a subtle top fade instead of changing its structure.
   document.body.classList.add("v415");

   // Normalize button affordances without touching click handlers.
   document.querySelectorAll("button").forEach(b=>{
     if(!b.dataset.v415){
       b.dataset.v415="1";
       b.classList.add("v415-interactive");
     }
   });

   // Add visual identity to common cards, but don't wrap/reparent anything.
   document.querySelectorAll(
     ".home-card,.premium-card,.game-card,.gc433-card,.pc82-card,.p434-card,.social831-panel article,.a46-section,.admin444-control,.shop3-card,.ev414-card,.support48-ticket"
   ).forEach(el=>el.classList.add("v415-surface"));

   // Mark page headings for consistent spacing.
   document.querySelectorAll(
     "#content h1,#content h2,.a46 h1,.a46 h2,.p434 h1,.gc433-shell h1,.pc82-shell h1"
   ).forEach(el=>el.classList.add("v415-title"));
 }

 function observe(){
   const root=document.getElementById("content")||document.body;
   const mo=new MutationObserver(()=>requestAnimationFrame(decorate));
   mo.observe(root,{childList:true,subtree:true});
 }

 document.addEventListener("DOMContentLoaded",()=>{
   decorate();
   observe();
 });
 document.addEventListener("click",()=>setTimeout(decorate,60));
})();
