
/* ReferHub v2.0 — Draw Experience */
(()=>{
 const words=/розіграш|лотере|draw|prize|квит|ticket|перемож|winner/i;
 function txt(e){return (e?.innerText||"").trim()}
 function decorate(){
   document.querySelectorAll("section,article,.card,.panel,[class*='lot']").forEach(el=>{
     if(words.test(txt(el)) && !el.closest(".gp-card") && txt(el).length<1600) el.classList.add("rh20-draw-surface");
   });
   document.querySelectorAll("button").forEach(b=>{
     if(/квит|ticket|взяти участь|купити/i.test(txt(b))) b.classList.add("rh20-ticket-btn");
   });
   document.querySelectorAll("[class*='winner'],[class*='Winner']").forEach(e=>e.classList.add("rh20-winner"));
   document.querySelectorAll("[class*='timer'],[class*='countdown']").forEach(e=>e.classList.add("rh20-timer"));
   document.querySelectorAll("img").forEach(img=>{
     const p=img.closest(".rh20-draw-surface");
     if(p){img.loading="lazy";img.decoding="async";p.classList.add("rh20-has-art")}
   });
   // Add premium fairness chip once on likely lottery detail screens.
   document.querySelectorAll(".rh20-draw-surface").forEach(el=>{
     if(el.dataset.rh20 || txt(el).length<80)return;
     el.dataset.rh20="1";
     const chip=document.createElement("div");
     chip.className="rh20-fair-chip";
     chip.innerHTML='<img src="/static/assets/stickers/verified.svg"><span><b>FAIR DRAW</b><small>результат фіксується системою</small></span>';
     el.appendChild(chip);
   });
 }
 new MutationObserver(()=>requestAnimationFrame(decorate)).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener("DOMContentLoaded",decorate);setTimeout(decorate,120);
})();
