
/* ReferHub v4.4.1 — Settings Admin Repair */
(()=>{
 window.showSettings44Tab=async function(tab,btn){
   document.querySelectorAll(".settings44-tabs button").forEach(x=>x.classList.toggle("active",x===btn));
   document.querySelectorAll(".settings44-panel").forEach(x=>x.classList.toggle("active",x.id===`settings44-${tab}`));
   if(tab==="admin") await loadSettings44Admin();
 };

 window.loadSettings44Admin=async function(force=false){
   const host=document.getElementById("settings44AdminStats");
   if(!host)return;
   if(host.dataset.loaded==="1"&&!force)return;
   host.innerHTML='<div class="loader"></div>';
   try{
     const d=await api("/api/admin/dashboard");
     host.dataset.loaded="1";
     host.innerHTML=`
       <article><small>КОРИСТУВАЧІ</small><b>${Number(d.total_users||0)}</b></article>
       <article><small>АКТИВНІ 24Г</small><b>${Number(d.active_today||0)}</b></article>
       <article><small>RH В ОБІГУ</small><b>${Number(d.total_balance||0)}</b></article>
       <article><small>ЗАВДАННЯ</small><b>${Number(d.active_tasks||0)}</b></article>`;
   }catch(e){
     host.innerHTML=`<p>${e?.message||"Не вдалося завантажити адмінку"}</p>`;
   }
 };

 function syncAdminSettings(){
   const tab=document.getElementById("settings44AdminTab");
   if(!tab)return;
   tab.hidden=!Boolean(window.me?.is_admin);
 }

 function install(){
   if(window.__settings441Installed)return;
   if(typeof window.openPolish91Settings!=="function")return;
   window.__settings441Installed=true;
   const original=window.openPolish91Settings;
   window.openPolish91Settings=function(...args){
     const result=original.apply(this,args);
     setTimeout(()=>{
       syncAdminSettings();
       const general=document.querySelector('.settings44-tabs [data-settings44="general"]');
       if(general)window.showSettings44Tab("general",general);
     },0);
     return result;
   };
 }

 window.openSettingsAdmin441=function(){
   if(typeof window.openPolish91Settings==="function")window.openPolish91Settings();
   setTimeout(()=>{
     syncAdminSettings();
     const tab=document.getElementById("settings44AdminTab");
     if(tab&&!tab.hidden)window.showSettings44Tab("admin",tab);
   },30);
 };

 document.addEventListener("DOMContentLoaded",()=>{install();syncAdminSettings()});
 setTimeout(()=>{install();syncAdminSettings()},150);
 setTimeout(()=>{install();syncAdminSettings()},800);
})();
