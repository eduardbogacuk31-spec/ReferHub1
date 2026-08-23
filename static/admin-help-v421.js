
/* ReferHub v4.21 — Admin scroll + Help render repair */
(()=>{
  function fixAdminScroll(){
    const admin=document.querySelector(".a46,.admin6,.admin444-user-page");
    if(!admin)return;

    // Remove inline vertical scroll traps that old builds may have left behind.
    admin.querySelectorAll("*").forEach(el=>{
      const style=el.style;
      if(!style)return;

      const oy=style.overflowY;
      const mh=style.maxHeight;
      const h=style.height;

      if(oy==="auto" || oy==="scroll"){
        // Keep horizontal tab/table scrolling, but remove vertical nesting.
        if(!el.classList.contains("a46-tabs") &&
           !el.classList.contains("admin6-tabs") &&
           !el.classList.contains("a46-table-wrap") &&
           !el.classList.contains("admin-table-wrap")){
          style.overflowY="visible";
        }
      }

      if(mh && mh!=="none"){
        // Don't touch explicit tiny controls; only admin container/list elements.
        const cls=String(el.className||"");
        if(/admin|a46|support48/i.test(cls))style.maxHeight="none";
      }

      if(h && /vh|calc/i.test(h)){
        const cls=String(el.className||"");
        if(/admin|a46/i.test(cls))style.height="auto";
      }
    });
  }

  function fixHelpOverlay(){
    const overlay=document.getElementById("ux47Overlay");
    if(!overlay)return;

    if(overlay.classList.contains("show")){
      overlay.style.visibility="visible";
      overlay.style.opacity="1";
      overlay.style.pointerEvents="auto";

      const modal=overlay.querySelector(".ux47-modal");
      if(modal){
        modal.style.opacity="1";
        modal.style.visibility="visible";
        modal.style.transform="none";
      }
    }
  }

  // Patch help openers so paint happens synchronously.
  const oldHelp=window.ux47Help;
  if(typeof oldHelp==="function"){
    window.ux47Help=function(...args){
      const result=oldHelp.apply(this,args);
      fixHelpOverlay();
      requestAnimationFrame(fixHelpOverlay);
      return result;
    };
  }

  const oldWhatsNew=window.ux47WhatsNew;
  if(typeof oldWhatsNew==="function"){
    window.ux47WhatsNew=function(...args){
      const result=oldWhatsNew.apply(this,args);
      fixHelpOverlay();
      requestAnimationFrame(fixHelpOverlay);
      return result;
    };
  }

  document.addEventListener("DOMContentLoaded",()=>{
    setTimeout(fixAdminScroll,300);
    setTimeout(fixHelpOverlay,300);
  });

  document.addEventListener("click",()=>{
    setTimeout(fixAdminScroll,60);
    setTimeout(fixHelpOverlay,0);
  });

  // Re-run after dynamic admin/help rendering without introducing observers.
  setTimeout(fixAdminScroll,900);
})();
