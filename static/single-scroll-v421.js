
/* ReferHub v4.2.1 — force one document scroll */
(()=>{
 const PAGE_SELECTORS=[
  "#app",".app",".app-shell",".main","main",".page",".page-wrap",".page-container",
  ".content-wrap","#content",".rp372",".rh37",".rh38",".rh38-detail",".rh39",".rh40",".rh41",
  ".rh30-actions",".games-grid",".game-grid",".games-list",".achievements-grid",".achievement-grid",
  ".profile-content",".profile-body"
 ].join(",");

 function normalize(){
   document.documentElement.style.removeProperty("height");
   document.body.style.removeProperty("height");
   document.body.style.removeProperty("max-height");

   document.querySelectorAll(PAGE_SELECTORS).forEach(el=>{
     // Modal panels are the only deliberate nested scroll area.
     if(el.closest(".rh42-overlay")) return;
     el.style.setProperty("height","auto","important");
     el.style.setProperty("max-height","none","important");
     el.style.setProperty("overflow-y","visible","important");
   });
 }

 // Catch legacy renderers that re-apply height/overflow after page navigation.
 const obs=new MutationObserver(()=>requestAnimationFrame(normalize));
 obs.observe(document.documentElement,{
   childList:true,
   subtree:true,
   attributes:true,
   attributeFilter:["class","style"]
 });

 document.addEventListener("DOMContentLoaded",normalize);
 window.addEventListener("load",normalize);
 setTimeout(normalize,100);
 setTimeout(normalize,500);
 setTimeout(normalize,1200);
})();
