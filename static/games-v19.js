
/* v1.9 game UX polish: compact cards, preserve separate game pages/instructions */
(()=> {
 function polish(){
   const v=document.querySelector("#gameProView");
   if(!v)return;
   v.querySelectorAll(".gp-card").forEach((c,i)=>{
     c.setAttribute("data-game-card",String(i+1));
     c.setAttribute("role","group");
     const img=c.querySelector(".gp-card-art img");
     if(img){img.loading="lazy";img.decoding="async";}
   });
 }
 new MutationObserver(()=>requestAnimationFrame(polish)).observe(document.documentElement,{subtree:true,childList:true});
 document.addEventListener("DOMContentLoaded",polish); setTimeout(polish,100);
})();
