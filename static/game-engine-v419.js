
/* ReferHub v4.19 — single game engine guard */
(()=>{
  let canonicalOpen=null;

  function capture(){
    if(typeof window.openGameDetail==="function" && !canonicalOpen){
      canonicalOpen=window.openGameDetail;
    }
  }

  function verify(){
    if(!canonicalOpen && typeof window.openGameDetail==="function"){
      canonicalOpen=window.openGameDetail;
    }
    if(canonicalOpen && window.openGameDetail!==canonicalOpen){
      window.openGameDetail=canonicalOpen;
    }
  }

  // app.js is loaded before this file, so capture the current canonical renderer.
  capture();
  document.addEventListener("DOMContentLoaded",verify);
  setTimeout(verify,100);
  setTimeout(verify,700);
})();
