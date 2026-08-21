
/* ReferHub v4.2.3 — Profile Clean Mode */
(()=>{
 let profileOpen=false;

 function navIsProfile(){
   const p=document.querySelector(
     '.bottom-nav [data-page="profile"].active,'+
     '.premium-bottom-nav [data-page="profile"].active,'+
     '[data-nav="profile"].active,.profile-nav.active'
   );
   return !!p || !!document.querySelector(".rp372");
 }

 function apply(){
   profileOpen=navIsProfile();
   document.body.classList.toggle("rh423-profile-mode",profileOpen);

   if(profileOpen){
     // Home/dashboard fragments must never survive in Profile.
     document.querySelectorAll(
       ".rh42-dashboard,.rh30,.rh29-shell,.rh29-detail"
     ).forEach(el=>{
       if(!el.closest(".rp372")) el.remove();
     });

     // Ensure profile is the content renderer. If route was opened but old home content
     // survived, request the single stable profile renderer again.
     const content=document.getElementById("content");
     if(content && !content.querySelector(".rp372") && typeof window.rp372Open==="function"){
       window.rp372Open();
     }
   }
 }

 function wrapOpenPage(){
   if(window.__rh423Wrapped || typeof window.openPage!=="function")return;
   window.__rh423Wrapped=true;
   const original=window.openPage;

   window.openPage=async function(page,...args){
     if(page==="profile"){
       profileOpen=true;
       document.body.classList.add("rh423-profile-mode");

       // Clear old page immediately so the user never sees home/lottery behind Profile.
       const c=document.getElementById("content");
       if(c) c.innerHTML='<div class="loader"></div>';

       if(typeof window.rp372Open==="function"){
         const r=await window.rp372Open();
         requestAnimationFrame(apply);
         return r;
       }
     }

     document.body.classList.remove("rh423-profile-mode");
     profileOpen=false;
     const r=await original.call(this,page,...args);
     requestAnimationFrame(apply);
     return r;
   };
 }

 new MutationObserver(()=>requestAnimationFrame(()=>{
   wrapOpenPage();
   apply();
 })).observe(document.documentElement,{
   childList:true,
   subtree:true,
   attributes:true,
   attributeFilter:["class"]
 });

 document.addEventListener("DOMContentLoaded",()=>{
   wrapOpenPage();
   apply();
 });

 setTimeout(()=>{wrapOpenPage();apply()},150);
 setTimeout(apply,600);
})();
