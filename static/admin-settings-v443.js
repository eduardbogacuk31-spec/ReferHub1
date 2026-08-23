
/* ReferHub v4.4.3 — real Admin tab detection */
(()=>{
  let admin443State = null;
  let admin443Checking = false;

  function els(){
    return {
      tabs: document.querySelector(".settings44-tabs"),
      admin: document.getElementById("settings44AdminTab"),
      general: document.querySelector('.settings44-tabs [data-settings44="general"]'),
      adminPanel: document.getElementById("settings44-admin")
    };
  }

  function applyState(allowed){
    const {tabs,admin,general,adminPanel}=els();
    if(!tabs || !admin)return;

    admin443State = Boolean(allowed);
    admin.hidden = !admin443State;
    tabs.classList.toggle("admin443-enabled", admin443State);

    if(!admin443State && adminPanel?.classList.contains("active")){
      if(general && typeof window.showSettings44Tab==="function"){
        window.showSettings44Tab("general", general);
      }else{
        adminPanel.classList.remove("active");
        document.getElementById("settings44-general")?.classList.add("active");
        general?.classList.add("active");
      }
    }
  }

  async function checkAdmin(force=false){
    if(admin443Checking)return admin443State;
    if(admin443State!==null && !force){
      applyState(admin443State);
      return admin443State;
    }

    admin443Checking=true;
    // Safe default while checking: one full-width General tab, no empty black slot.
    applyState(false);

    try{
      // This endpoint is protected by require_admin on the backend.
      // 200 = current Telegram user is admin; 403 = not admin.
      await api("/api/admin/dashboard");
      applyState(true);
      return true;
    }catch(_){
      applyState(false);
      return false;
    }finally{
      admin443Checking=false;
    }
  }

  function installSettingsHook(){
    if(window.__admin443HookInstalled)return;
    if(typeof window.openPolish91Settings!=="function")return;

    window.__admin443HookInstalled=true;
    const original=window.openPolish91Settings;

    window.openPolish91Settings=function(...args){
      const result=original.apply(this,args);

      // Always open General first; then ask backend whether Admin is available.
      const {general}=els();
      if(general && typeof window.showSettings44Tab==="function"){
        window.showSettings44Tab("general",general);
      }

      checkAdmin(true);
      return result;
    };
  }

  // Replace old helper behavior too.
  window.openSettingsAdmin441=async function(){
    if(typeof window.openPolish91Settings==="function"){
      window.openPolish91Settings();
    }
    const allowed=await checkAdmin(true);
    if(allowed){
      const {admin}=els();
      if(admin && typeof window.showSettings44Tab==="function"){
        window.showSettings44Tab("admin",admin);
      }
    }else{
      toast?.("Адмін-доступ недоступний","error");
    }
  };

  document.addEventListener("DOMContentLoaded",()=>{
    installSettingsHook();
    applyState(false);
  });

  // app.js may define settings functions after this file depending on cache/order.
  setTimeout(()=>{installSettingsHook(); applyState(admin443State===true);},150);
  setTimeout(()=>{installSettingsHook();},700);
})();
