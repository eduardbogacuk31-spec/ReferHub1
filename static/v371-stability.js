
/* ReferHub v3.7.1 — Community/Profile layout repair */
(()=>{
 function repairCommunity(){
   document.querySelectorAll(".rh37-players>article").forEach(card=>{
     card.classList.add("rh371-player-card");
   });
   document.querySelectorAll(".rh37-p-copy,.rh37-feed-copy,.rh37-public-cover>div:last-child").forEach(x=>{
     x.classList.add("rh371-min0");
   });
 }
 function repairProfile(){
   const p=document.querySelector(".rh36");
   if(!p)return;
   p.classList.add("rh371-profile-stable");
 }
 function run(){
   requestAnimationFrame(()=>{
     repairCommunity();
     repairProfile();
   });
 }
 new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener("DOMContentLoaded",run);
 setTimeout(run,200);
})();
