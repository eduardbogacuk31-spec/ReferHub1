
/* ReferHub v3.6.1 — Profile stability hotfix */
(()=>{
 let loading=false;

 async function safeProfile(){
   if(loading)return;
   loading=true;
   try{
     if(typeof window.openProfileV36==="function"){
       await window.openProfileV36();
     }else if(typeof window.rh36Open==="function"){
       await window.rh36Open();
     }
   }finally{
     loading=false;
   }
 }

 function repair(){
   const root=document.querySelector(".rh36");
   if(!root)return;

   root.classList.add("rh361-stable");

   // Remove stale duplicate profile shells if an older profile renderer survived.
   document.querySelectorAll(
     ".rh22-profile,.rh221-showcase,.pc82-shell"
   ).forEach(el=>{
     if(!el.closest(".rh36")) el.remove();
   });

   // Ensure the active profile screen never traps page scrolling.
   document.documentElement.style.removeProperty("overflow");
   if(!document.body.classList.contains("rh25-lock")){
     document.body.style.removeProperty("overflow");
   }

   // Keep every profile section inside viewport width.
   root.querySelectorAll("*").forEach(el=>{
     if(el instanceof HTMLElement){
       el.style.maxWidth=el.style.maxWidth||"100%";
     }
   });
 }

 window.rh361Open=safeProfile;
 new MutationObserver(()=>requestAnimationFrame(repair))
   .observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener("DOMContentLoaded",repair);
 setTimeout(repair,250);
})();
