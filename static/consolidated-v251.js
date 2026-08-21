
/* ReferHub v2.5.1 — deterministic feature bootstrap */
(()=>{
 const V="25101";
 const scripts=[
   "draw-v20.js","games-v19.js","profile-v21.js",
   "events-v22.js","daily-v23.js","season-v24.js","lottery-v25.js"
 ];
 function load(src){
   return new Promise((ok,bad)=>{
     const s=document.createElement("script");
     s.src=`/static/${src}?v=${V}`; s.async=false;
     s.onload=ok; s.onerror=bad; document.body.appendChild(s);
   });
 }
 async function start(){
   // Remove stale generated surfaces before reconstructing.
   document.querySelectorAll(".rh20-fair-chip").forEach(x=>x.remove());
   for(const s of scripts){try{await load(s)}catch(e){console.error("ReferHub feature load failed",s,e)}}

   // Rebuild wrappers after every script has registered its renderers.
   const baseHome=window.homePage;
   window.homePage=async function(){
     if(typeof baseHome==="function") await baseHome.apply(this,arguments);
     // Explicit calls guarantee visibility even if older wrappers were overwritten.
     if(typeof window.rh251RenderEvents==="function") await window.rh251RenderEvents();
     if(typeof window.rh251RenderDaily==="function") await window.rh251RenderDaily();
     if(typeof window.rh251RenderSeason==="function") await window.rh251RenderSeason();
   };

   // Initial route can already be Home before bootstrap finishes.
   setTimeout(async()=>{
     const c=document.getElementById("content");
     if(c && !document.querySelector(".rh23-root,.rh24-root,.rh22-events-root")){
       try{await window.homePage?.()}catch(e){console.error(e)}
     }
   },120);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
