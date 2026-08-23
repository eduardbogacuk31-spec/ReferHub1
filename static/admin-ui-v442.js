
(()=>{
 function sync(){
   const adminTab=document.getElementById("settings44AdminTab");
   if(!adminTab)return;
   const allowed=Boolean(window.me?.is_admin);
   adminTab.hidden=!allowed;
   const adminPanel=document.getElementById("settings44-admin");
   if(!allowed && adminPanel?.classList.contains("active")){
     const general=document.querySelector('.settings44-tabs [data-settings44="general"]');
     if(general && typeof window.showSettings44Tab==="function"){
       window.showSettings44Tab("general",general);
     }
   }
 }
 document.addEventListener("DOMContentLoaded",sync);
 setTimeout(sync,150);
 setTimeout(sync,700);
})();
