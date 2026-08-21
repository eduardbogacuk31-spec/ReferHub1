
/* ReferHub v2.2 — Draw Experience without FAIR DRAW labels */
(()=>{
 function text(e){return (e?.innerText||"").trim()}
 function polish(){
   document.querySelectorAll(".rh20-fair-chip").forEach(x=>x.remove());

   document.querySelectorAll("button").forEach(b=>{
     if(/квит|ticket|взяти участь|купити/i.test(text(b))){
       b.classList.add("rh20-ticket-btn");
     }
   });

   document.querySelectorAll("[class*='winner'],[class*='Winner']").forEach(e=>{
     e.classList.add("rh20-winner");
   });

   document.querySelectorAll("[class*='timer'],[class*='countdown']").forEach(e=>{
     e.classList.add("rh20-timer");
   });
 }
 new MutationObserver(()=>requestAnimationFrame(polish))
   .observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener("DOMContentLoaded",polish);
 setTimeout(polish,120);
})();
