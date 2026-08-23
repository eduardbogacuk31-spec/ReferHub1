
(()=>{
  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));
  function markActiveNav(){
    const content=$("#content"); if(!content)return;
    let page=null;
    if(content.querySelector(".gc433-shell,.gc14-page"))page="games";
    else if(content.querySelector(".p434"))page="profile";
    else if(content.querySelector(".admin6,.admin444-user-page"))page="settings";
    else if(content.querySelector(".pc82-shell"))page="earn";
    else if(content.querySelector(".lot11-active,.lot11-history,.lot11-bottom-grid"))page="lottery";
    else if(content.querySelector(".rh37,.social831"))page="friends";
    if(!page)return;
    $$("[data-page],[data-nav]").forEach(btn=>{
      const key=btn.dataset.page||btn.dataset.nav;
      btn.classList.toggle("active",key===page);
    });
  }
  function polish(){
    markActiveNav();
    $$("button, .gc433-copy h3, .p434-id h1, .social441-user b, .pc82-task h3, .admin6-card b").forEach(el=>el.classList.add("v45-safe-text"));
    $$(".empty").forEach(el=>{
      if(el.dataset.v45)return;
      el.dataset.v45="1"; el.classList.add("v45-empty");
      if(!el.querySelector("span"))el.insertAdjacentHTML("afterbegin","<span>◇</span>");
    });
    $$(".loader").forEach(el=>el.classList.add("v45-loader"));
  }
  document.addEventListener("DOMContentLoaded",polish);
  document.addEventListener("click",()=>setTimeout(polish,40));
  setTimeout(polish,250);
  setTimeout(polish,900);
})();
