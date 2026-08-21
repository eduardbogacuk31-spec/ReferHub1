
/* ReferHub v4.4 — Release expansion / settings admin */
(()=>{
 window.showSettings44Tab=async function(tab,btn){
   document.querySelectorAll(".settings44-tabs button").forEach(x=>x.classList.toggle("active",x===btn));
   document.querySelectorAll(".settings44-panel").forEach(x=>x.classList.toggle("active",x.id===`settings44-${tab}`));
   if(tab==="admin") await loadSettings44Admin();
 };

 window.loadSettings44Admin=async function(){
   const host=document.getElementById("settings44AdminStats");
   if(!host||host.dataset.loaded==="1")return;
   host.innerHTML='<div class="loader"></div>';
   try{
     const d=await api("/api/admin/dashboard");
     host.dataset.loaded="1";
     host.innerHTML=`
       <article><small>КОРИСТУВАЧІ</small><b>${Number(d.total_users||d.users||0)}</b></article>
       <article><small>АКТИВНІ</small><b>${Number(d.active_today||d.active_day||0)}</b></article>
       <article><small>RH В ОБІГУ</small><b>${Number(d.total_balance||0)}</b></article>
       <article><small>ЗАЯВКИ</small><b>${Number(d.pending_orders||0)}</b></article>`;
   }catch(e){host.innerHTML=`<p>${e?.message||"Не вдалося завантажити адмінку"}</p>`}
 };

 const oldOpenSettings=window.openPolish91Settings;
 if(typeof oldOpenSettings==="function"){
   window.openPolish91Settings=function(){
     oldOpenSettings();
     const admin=document.getElementById("settings44AdminTab");
     if(admin)admin.hidden=!Boolean(me?.is_admin);
     const general=document.querySelector('.settings44-tabs [data-settings44="general"]');
     if(general)showSettings44Tab("general",general);
   };
 }
})();
