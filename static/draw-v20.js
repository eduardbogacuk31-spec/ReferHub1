
/* ReferHub v2.0.1 — Draw bugfix */
(()=>{
 const words=/розіграш|лотере|draw|prize|квит|ticket|перемож|winner/i;
 function text(e){return (e?.innerText||"").trim()}
 function logicalDrawSurfaces(){
   const candidates=[...document.querySelectorAll("section,article,.card,.panel,[class*='lot']")]
     .filter(el=>!el.closest(".gp-card") && words.test(text(el)) && text(el).length>=80 && text(el).length<1600);
   return candidates.filter(el=>!candidates.some(other=>other!==el && other.contains(el) && text(other).length < text(el).length*1.35));
 }
 function fix(){
   // First wipe every generated chip, then add exactly one to each top-level logical draw card.
   document.querySelectorAll(".rh20-fair-chip").forEach(x=>x.remove());
   document.querySelectorAll(".rh20-draw-surface").forEach(x=>x.classList.remove("rh20-draw-surface"));
   const surfaces=logicalDrawSurfaces();
   surfaces.forEach(el=>{
     el.classList.add("rh20-draw-surface");
     const chip=document.createElement("div");
     chip.className="rh20-fair-chip";
     chip.innerHTML='<img src="/static/assets/stickers/verified.svg" alt=""><span><b>FAIR DRAW</b><small>результат фіксується системою</small></span>';
     el.appendChild(chip);
   });
   document.querySelectorAll("button").forEach(b=>{
     if(/квит|ticket|взяти участь|купити/i.test(text(b))) b.classList.add("rh20-ticket-btn");
   });
 }
 let queued=false;
 const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;fix()})};
 new MutationObserver(m=>{if(m.some(x=>[...x.addedNodes].some(n=>n.nodeType===1 && !n.classList?.contains("rh20-fair-chip"))))schedule()})
 .observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener("DOMContentLoaded",schedule);setTimeout(schedule,150);
})();
