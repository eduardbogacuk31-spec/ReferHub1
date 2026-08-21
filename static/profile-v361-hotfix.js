
/* ReferHub v3.7.1 — stable Profile 3.0 hotfix */
(()=>{
 let busy=false;

 async function openStableProfile(){
   if(busy)return;
   busy=true;
   try{
     if(typeof window.openProfileV36==="function") return await window.openProfileV36();
     if(typeof window.rh36Open==="function") return await window.rh36Open();
   }catch(e){
     console.error("Profile 3.0 error",e);
     if(typeof toast==="function") toast(e?.message||"Не вдалося відкрити профіль","error");
   }finally{
     busy=false;
   }
 }

 function cleanup(){
   const root=document.querySelector(".rh36");
   if(!root)return;

   root.classList.add("rh371-profile-stable");

   // Remove only duplicate legacy profile blocks that are actually inside the currently rendered content.
   const content=document.getElementById("content");
   if(content){
     [...content.children].forEach(el=>{
       if(el===root)return;
       if(el.matches?.(".rh22-profile,.rh221-showcase,.profile-page,.profile-shell-old")){
         el.remove();
       }
     });
   }

   if(!document.body.classList.contains("rh25-lock")){
     document.documentElement.style.removeProperty("overflow");
     document.body.style.removeProperty("overflow");
   }
 }

 window.rh371OpenProfile=openStableProfile;

 // Repair only after DOM changes; do not mutate every descendant.
 new MutationObserver(()=>requestAnimationFrame(cleanup))
   .observe(document.documentElement,{childList:true,subtree:true});

 document.addEventListener("DOMContentLoaded",cleanup);
 setTimeout(cleanup,250);
})();
