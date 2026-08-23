
/* ReferHub v4.31 — navigation isolation */
(()=>{
  let currentPage="";
  const originalOpen=window.openPage;
  if(typeof originalOpen!=="function")return;

  window.openPage=async function(page){
    currentPage=page;

    // Immediately clear any leftover legacy lottery-specific transient state
    // when leaving lottery.
    if(page!=="lotteries"){
      window.rh29Current=null;
    }

    return await originalOpen(page);
  };

  // lottery-v29 renderer checks the active nav before touching #content.
  const originalRh29=window.rh29Open;
  if(typeof originalRh29==="function"){
    window.rh29Open=async function(){
      const active=document.querySelector('nav button[data-page="lotteries"].active');
      if(!active && currentPage && currentPage!=="lotteries")return;
      return await originalRh29();
    };
  }
})();
