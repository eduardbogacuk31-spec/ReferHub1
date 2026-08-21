
/* ReferHub v3.1 — Global Quality / Scroll / Classification cleanup */
(()=>{
 const ROOTS=[
   "#content","main",".rh30",".rh29-shell",".rh29-detail",".rh28-shell",".rh26",
   ".pc82-shell",".gp-page",".gp-game",".rh24-root",".rh23-root",".rh22-profile"
 ];

 function normalizeScroll(){
   document.documentElement.classList.add("rh31-scroll-root");
   document.body.classList.add("rh31-scroll-root");
   ROOTS.forEach(sel=>document.querySelectorAll(sel).forEach(el=>{
     el.classList.add("rh31-scroll-safe");
   }));

   // Any active panel must remain scrollable and visible.
   document.querySelectorAll(
     ".active,[class*='panel'].active,[data-rh281-tab].active,[data-pc82-panel].active"
   ).forEach(el=>{
     el.classList.add("rh31-active-panel");
   });
 }

 function normalizeClassification(){
   // Cosmetics rarity/classification badges
   document.querySelectorAll(".rh28-item").forEach(card=>{
     const badge=card.querySelector(".rh28-item-copy>span");
     if(!badge)return;
     const cls=["common","rare","epic","legendary"].find(x=>card.classList.contains(x))||"common";
     badge.classList.add("rh31-class-badge",`rh31-${cls}`);
   });

   // Generic status pills across lottery / games / tasks.
   document.querySelectorAll(
     ".rh29-status,.gp-state,.status-pill,.pc82-mission>div>span,.rh28-item-copy>small"
   ).forEach(x=>x.classList.add("rh31-pill"));

   // Keep tab labels aligned and clamp impossible widths.
   document.querySelectorAll(
     ".rh281-tabs button,.pc82-tabs button,.rh29-toolbar nav button,.social831-tabs button"
   ).forEach(x=>x.classList.add("rh31-tab"));
 }

 function fixOverflow(){
   document.querySelectorAll("h1,h2,h3,h4,p,span,b,strong,small,label,button,a").forEach(el=>{
     if(!el.closest("svg")) el.classList.add("rh31-wrap");
   });

   document.querySelectorAll(
     ".rh30-card,.rh29-card,.rh28-item,.rh26-user,.pc82-mission,.pc82-task,.gp-card,.rh24-level,.rh23-day"
   ).forEach(el=>el.classList.add("rh31-card-safe"));
 }

 function run(){
   requestAnimationFrame(()=>{
     normalizeScroll();
     normalizeClassification();
     fixOverflow();
   });
 }

 new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener("DOMContentLoaded",run);
 setTimeout(run,180);
})();
