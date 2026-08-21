
/* ReferHub v3.7.3 — Profile nav active state + smooth mobile scroll */
(()=>{
  const PROFILE_SELECTORS=[
    "[data-page='profile']",
    "[data-nav='profile']",
    ".profile-nav",
    ".nav-profile",
    "#navProfile"
  ];

  function allNavItems(){
    return [...document.querySelectorAll(
      "[data-page],[data-nav],.bottom-nav button,.premium-bottom-nav button,.nav-item"
    )];
  }

  function markProfileActive(){
    const nav=allNavItems();
    nav.forEach(el=>{
      const isProfile=
        el.matches?.("[data-page='profile'],[data-nav='profile'],.profile-nav,.nav-profile,#navProfile") ||
        /проф(іль|иль)|profile/i.test(el.textContent||"");
      el.classList.toggle("active",!!isProfile);
      if(isProfile){
        el.setAttribute("aria-current","page");
      }else{
        el.removeAttribute("aria-current");
      }
    });
  }

  function resetProfileScroll(){
    const content=document.getElementById("content");
    const profile=document.querySelector(".rp372");
    if(!profile)return;

    // The page itself should scroll, not a nested profile container.
    profile.style.removeProperty("overflow");
    profile.style.removeProperty("height");
    profile.style.removeProperty("max-height");

    if(content){
      content.style.removeProperty("overflow-y");
      content.style.removeProperty("height");
      content.style.removeProperty("max-height");
      content.scrollTop=0;
    }

    // Telegram WebView may keep previous nested-scroll position.
    window.scrollTo({top:0,left:0,behavior:"auto"});
  }

  function onProfileRendered(){
    if(!document.querySelector(".rp372"))return;
    markProfileActive();
    resetProfileScroll();
    document.body.classList.add("rp373-profile-open");
  }

  // Wrap the single stable profile renderer.
  function install(){
    if(window.__rp373Installed)return;
    if(typeof window.rp372Open!=="function")return;
    window.__rp373Installed=true;

    const old=window.rp372Open;
    window.rp372Open=async function(...args){
      const result=await old.apply(this,args);
      requestAnimationFrame(()=>{
        markProfileActive();
        resetProfileScroll();
      });
      return result;
    };

    // Profile v3.7.2 routes through openPage('profile').
    const oldOpenPage=window.openPage;
    if(typeof oldOpenPage==="function" && !oldOpenPage.__rp373){
      const wrapped=async function(page,...args){
        if(page==="profile"){
          const result=await window.rp372Open();
          markProfileActive();
          resetProfileScroll();
          return result;
        }
        document.body.classList.remove("rp373-profile-open");
        return oldOpenPage.call(this,page,...args);
      };
      wrapped.__rp373=true;
      window.openPage=wrapped;
    }
  }

  new MutationObserver(()=>requestAnimationFrame(()=>{
    install();
    onProfileRendered();
  })).observe(document.documentElement,{childList:true,subtree:true});

  document.addEventListener("DOMContentLoaded",()=>{
    install();
    onProfileRendered();
  });

  setTimeout(install,120);
  setTimeout(install,700);
})();
