
/* ReferHub v4.2.2 — main is the sole application scroller */
(()=>{
 const innerSelectors=[
   "#content",
   ".rp372",".rh30",".rh32",".rh33",".rh35",".rh37",".rh37-public",
   ".rh38",".rh38-detail",".rh39",".rh40",".rh41",
   ".gp-page",".gp-game",".pc82-shell",".rh28-shell",".rh29-shell",".rh29-detail",
   ".rh37-feed",".rh37-players",".rh38-grid",".rh38-board",".rh39-grid",
   ".rh40-week",".rh41-grid",".rh41-chests",".rh42-livegrid",".gp-grid",
   ".rh32-grid",".rh34-ch-grid",".rh28-grid",".pc82-list",".rh29-list"
 ].join(",");

 function repair(){
   const main=document.querySelector("body > main");
   if(!main)return;

   // Clear any inline rules added by older feature scripts.
   main.style.setProperty("overflow-y","auto","important");
   main.style.setProperty("overflow-x","hidden","important");

   main.querySelectorAll(innerSelectors).forEach(el=>{
     // Overlay content is intentionally allowed to scroll separately.
     if(el.closest(".rh42-overlay,.polish91-settings"))return;
     el.style.setProperty("height","auto","important");
     el.style.setProperty("max-height","none","important");
     el.style.setProperty("overflow-y","visible","important");
   });

   document.documentElement.style.setProperty("overflow","hidden","important");
   document.body.style.setProperty("overflow","hidden","important");
 }

 // After opening a new page, keep that page in the same main scroller.
 function installOpenPageHook(){
   if(window.__rh422OpenPageHook || typeof window.openPage!=="function")return;
   window.__rh422OpenPageHook=true;
   const original=window.openPage;
   window.openPage=async function(...args){
     const result=await original.apply(this,args);
     requestAnimationFrame(()=>{
       repair();
       const main=document.querySelector("body > main");
       if(main)main.scrollTop=0;
     });
     return result;
   };
 }

 const observer=new MutationObserver(()=>requestAnimationFrame(()=>{
   repair();
   installOpenPageHook();
 }));
 observer.observe(document.documentElement,{
   childList:true,
   subtree:true,
   attributes:true,
   attributeFilter:["class"]
 });

 document.addEventListener("DOMContentLoaded",()=>{
   repair();
   installOpenPageHook();
 });
 setTimeout(()=>{repair();installOpenPageHook()},150);
 setTimeout(repair,700);
})();
