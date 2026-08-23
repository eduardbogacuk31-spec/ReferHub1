
/* ReferHub v4.25 referral route rescue */
(()=>{
  function bind(){
    const btn=document.querySelector('button[data-page="referrals"]');
    if(!btn || btn.dataset.ref425Bound)return;
    btn.dataset.ref425Bound="1";
    btn.addEventListener("click",async(e)=>{
      // openPage normally handles it. This only rescues missing/failed route bindings.
      setTimeout(async()=>{
        const c=document.getElementById("content");
        const active=document.querySelector('nav button[data-page="referrals"].active');
        const referralVisible=c?.querySelector(".ref424");
        if(active && !referralVisible && typeof window.referralHub424==="function"){
          try{ await window.referralHub424(); }catch(err){ console.error(err); }
        }
      },180);
    });
  }
  document.addEventListener("DOMContentLoaded",bind);
  setTimeout(bind,300);
})();
