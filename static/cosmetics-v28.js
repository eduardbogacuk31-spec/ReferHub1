
/* ReferHub v2.8 — Cosmetics & Profile Customization */
(()=>{
 let rh28Data=null;

 const esc28=v=>typeof esc==="function"?esc(v):String(v||"");
 const rarityLabel={common:"COMMON",rare:"RARE",epic:"EPIC",legendary:"LEGENDARY"};

 function unlockText(x){
   if(x.unlocked)return "ВІДКРИТО";
   if(x.unlock_type==="level")return `LVL ${x.unlock_value}`;
   if(x.unlock_type==="wins")return `${x.unlock_value} ПЕРЕМОГА`;
   if(x.unlock_type==="games")return `${x.unlock_value} ІГОР`;
   return "LOCKED";
 }


 function previewCard(x){
   const cls=esc28(x.css_class||"");
   const type=esc28(x.type||"");
   const icon=esc28(x.icon||"✦");

   if(x.type==="frame"){
     return `<div class="rh31-preview frame ${cls}">
       <div class="rh31-frame-stage">
         <div class="rh31-avatar"><span>R</span></div>
       </div>
       <small>РАМКА АВАТАРА</small>
     </div>`;
   }

   if(x.type==="background"){
     return `<div class="rh31-preview background ${cls}">
       <div class="rh31-bg-sample">
         <i></i><i></i><i></i>
       </div>
       <small>ФОН ПРОФІЛЮ</small>
     </div>`;
   }

   if(x.type==="title"){
     return `<div class="rh31-preview title ${cls}">
       <div class="rh31-name"><span>R</span><div><b>Player</b><em>${esc28(x.title)}</em></div></div>
       <small>ТИТУЛ</small>
     </div>`;
   }

   if(x.type==="effect"){
     return `<div class="rh31-preview effect ${cls}">
       <div class="rh31-effect-orb"><span>R</span><i></i></div>
       <small>ЕФЕКТ ПРОФІЛЮ</small>
     </div>`;
   }

   if(x.type==="badge"){
     return `<div class="rh31-preview badge ${cls}">
       <div class="rh31-name badge-name"><span>R</span><div><b>Player</b><em>${icon} ${esc28(x.title)}</em></div></div>
       <small>ЗНАЧОК БІЛЯ НІКУ</small>
     </div>`;
   }

   if(x.type==="accent"){
     return `<div class="rh31-preview accent ${cls}">
       <div class="rh31-accent-card"><i></i><b></b><em></em></div>
       <small>КОЛІР АКЦЕНТУ</small>
     </div>`;
   }

   if(x.type==="cardstyle"){
     return `<div class="rh31-preview cardstyle ${cls}">
       <div class="rh31-mini-cards"><i></i><i></i><i></i></div>
       <small>СТИЛЬ КАРТОК</small>
     </div>`;
   }

   return `<div class="rh31-preview generic ${cls}"><b>${icon}</b><small>ПРЕДМЕТ</small></div>`;
 }

 function itemCard(x){
   return `<article class="rh28-item ${x.rarity} ${x.unlocked?"open":"locked"} ${x.equipped?"equipped":""}">
${previewCard(x)}
     <div class="rh28-item-copy">
       <span>${rarityLabel[x.rarity]||x.rarity.toUpperCase()}</span>
       <h3>${esc28(x.title)}</h3>
       <p>${esc28(x.subtitle)}</p>
       <small>${unlockText(x)}</small>
     </div>
     <button ${x.unlocked&&!x.equipped?`onclick="rh28Equip('${x.key}')"`:"disabled"}>
       ${x.equipped?"✓ ВИБРАНО":x.unlocked?"ВИКОРИСТАТИ":"🔒"}
     </button>
   </article>`;
 }

 function section(title,sub,type,items){
   return `<section class="rh28-section">
     <div class="rh28-head">
       <div><span>${sub}</span><h2>${title}</h2></div>
       <small>${items.filter(x=>x.unlocked).length}/${items.length}</small>
     </div>
     <div class="rh28-grid">${items.map(itemCard).join("")}</div>
   </section>`;
 }

 async function open(){
   try{rh28Data=await api("/api/cosmetics-v28")}catch(e){toast(e.message,"error");return}
   const c=document.getElementById("content");if(!c)return;

   const groups={frame:[],background:[],title:[],effect:[],badge:[],accent:[],cardstyle:[]};
   rh28Data.items.forEach(x=>groups[x.type]?.push(x));

   c.innerHTML=`<section class="rh28-shell rh281-shell">
     <section class="rh28-hero">
       <div class="rh28-hero-grid"></div>
       <div class="rh28-hero-mark">◈</div>
       <div class="rh28-hero-copy">
         <span>PROFILE CUSTOMIZATION</span>
         <h1>Твій стиль у ReferHub</h1>
         <p>Прев’ю показує, як кожен предмет виглядатиме у профілі до відкриття.</p>
       </div>
       <div class="rh28-stats">
         <article><small>LEVEL</small><b>${rh28Data.level}</b></article>
         <article><small>WINS</small><b>${rh28Data.wins}</b></article>
         <article><small>GAMES</small><b>${rh28Data.games}</b></article>
       </div>
     </section>

     <nav class="rh281-tabs">
       <button class="active" onclick="rh281SwitchTab('frame',this)"><span>◈</span><b>Рамки</b><small>${groups.frame.filter(x=>x.unlocked).length}/${groups.frame.length}</small></button>
       <button onclick="rh281SwitchTab('background',this)"><span>▦</span><b>Фони</b><small>${groups.background.filter(x=>x.unlocked).length}/${groups.background.length}</small></button>
       <button onclick="rh281SwitchTab('title',this)"><span>R</span><b>Титули</b><small>${groups.title.filter(x=>x.unlocked).length}/${groups.title.length}</small></button>
       <button onclick="rh281SwitchTab('effect',this)"><span>✦</span><b>Ефекти</b><small>${groups.effect.filter(x=>x.unlocked).length}/${groups.effect.length}</small></button>
       <button onclick="rh281SwitchTab('badge',this)"><span>★</span><b>Значки</b><small>${groups.badge.filter(x=>x.unlocked).length}/${groups.badge.length}</small></button>
       <button onclick="rh281SwitchTab('accent',this)"><span>●</span><b>Акцент</b><small>${groups.accent.filter(x=>x.unlocked).length}/${groups.accent.length}</small></button>
       <button onclick="rh281SwitchTab('cardstyle',this)"><span>▤</span><b>Картки</b><small>${groups.cardstyle.filter(x=>x.unlocked).length}/${groups.cardstyle.length}</small></button>
     </nav>

     <div class="rh281-tab-wrap">
       <section class="rh281-panel active" data-rh281-tab="frame">
         ${section("Рамки аватарки","AVATAR FRAMES","frame",groups.frame)}
       </section>

       <section class="rh281-panel" data-rh281-tab="background">
         ${section("Фони профілю","PROFILE BACKGROUNDS","background",groups.background)}
       </section>

       <section class="rh281-panel" data-rh281-tab="title">
         ${section("Титули","PLAYER TITLES","title",groups.title)}
       </section>

       <section class="rh281-panel" data-rh281-tab="effect">${section("Ефекти","PROFILE EFFECTS","effect",groups.effect)}</section>
       <section class="rh281-panel" data-rh281-tab="badge">${section("Значки біля ніку","NAME BADGES","badge",groups.badge)}</section>
       <section class="rh281-panel" data-rh281-tab="accent">${section("Кольоровий акцент","PROFILE ACCENTS","accent",groups.accent)}</section>
       <section class="rh281-panel" data-rh281-tab="cardstyle">${section("Стиль карток","PROFILE CARDS","cardstyle",groups.cardstyle)}</section>
     </div>
   </section>`;
 }

 window.rh28OpenCosmetics=open;

 window.rh281SwitchTab=(name,button)=>{
   document.querySelectorAll(".rh281-tabs button").forEach(b=>b.classList.toggle("active",b===button));
   document.querySelectorAll(".rh281-panel").forEach(p=>p.classList.toggle("active",p.dataset.rh281Tab===name));
   const shell=document.querySelector(".rh281-shell");
   shell?.classList.add("rh427-tab-switch");
   setTimeout(()=>shell?.classList.remove("rh427-tab-switch"),140);
 };

 window.rh28Equip=async key=>{
   try{
     await api(`/api/cosmetics-v28/equip/${encodeURIComponent(key)}`,{method:"POST"});
     rewardToast?.("Profile Style","Косметику застосовано","✦");
     await open();
     await applyEquipped();
   }catch(e){toast(e.message,"error")}
 };

 async function applyEquipped(){
   let d;
   try{d=await api("/api/cosmetics-v28/equipped")}catch(_){return}

   const targets=[
     document.querySelector(".rh22-profile,.rp372,.p434"),
     document.querySelector(".rh21-hero,.rp372-cover,.p434-cover"),
     document.querySelector(".rh221-avatar-frame,.rp372-avatar,.p434-avatar")
   ].filter(Boolean);

   const all=[
     "rh28-frame-default","rh28-frame-neon","rh28-frame-gold","rh28-frame-aurora",
     "rh28-bg-night","rh28-bg-neon","rh28-bg-gold","rh28-bg-cosmic",
     "rh28-effect-none","rh28-effect-glow","rh28-effect-sparks","rh28-effect-prism",
     "rh428-frame-void","rh428-frame-crimson","rh428-frame-royal",
     "rh428-bg-matrix","rh428-bg-crimson","rh428-bg-genesis",
     "rh428-effect-scan","rh428-effect-crimson","rh428-effect-genesis",
     "rh428-accent-default","rh428-accent-blue","rh428-accent-gold","rh428-accent-crimson",
     "rh428-card-classic","rh428-card-glass","rh428-card-terminal","rh428-card-royal"
   ];

   targets.forEach(t=>t.classList.remove(...all));

   const hero=document.querySelector(".rh21-hero,.rp372-cover,.p434-cover");
   const avatar=document.querySelector(".rh221-avatar-frame,.rp372-avatar,.p434-avatar");
   const profile=document.querySelector(".rh22-profile,.rp372,.p434");

   if(avatar&&d.frame?.css_class)avatar.classList.add(d.frame.css_class);
   if(hero&&d.background?.css_class)hero.classList.add(d.background.css_class);
   if(profile&&d.effect?.css_class)profile.classList.add(d.effect.css_class);
   if(profile&&d.accent?.css_class)profile.classList.add(d.accent.css_class);
   if(profile&&d.cardstyle?.css_class)profile.classList.add(d.cardstyle.css_class);

   const identity=document.querySelector(".rh21-identity,.rp372-id,.p434-id");
   let badge=document.querySelector(".rh428-equipped-badge");
   if(identity&&d.badge&&d.badge.key!=="badge_none"){
     if(!badge){
       badge=document.createElement("span");
       badge.className="rh428-equipped-badge";
       identity.querySelector("h1")?.insertAdjacentElement("afterend",badge);
     }
     badge.innerHTML=`${d.badge.icon||"★"} ${esc28(d.badge.title||"")}`;
   }else badge?.remove();

   let title=document.querySelector(".rh28-equipped-title");
   if(profile&&d.title){
     if(!title){
       title=document.createElement("div");
       title.className="rh28-equipped-title";
       const identity=document.querySelector(".rh21-identity,.rp372-id,.p434-id");
       identity?.appendChild(title);
     }
     if(title)title.innerHTML=`<i>${d.title.icon||"✦"}</i><span>${esc28(d.title.title||"ReferHub Player")}</span>`;
   }
 }

 function addButton(){
   if(document.querySelector(".rh28-entry"))return;
   const host=document.querySelector(".rh221-showcase,.rh22-profile");
   if(!host)return;

   const b=document.createElement("button");
   b.className="rh28-entry";
   b.innerHTML=`<span>◈</span><section><small>PROFILE STYLE</small><b>Кастомізація</b><i>Рамки · фони · титули · ефекти</i></section><em>→</em>`;
   b.onclick=open;
   host.appendChild(b);
 }

 function run(){
   requestAnimationFrame(()=>{
     addButton();
     applyEquipped();
   });
 }

 new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener("DOMContentLoaded",run);
 setTimeout(run,350);
})();
