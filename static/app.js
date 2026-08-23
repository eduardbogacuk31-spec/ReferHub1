
const tg=window.Telegram?.WebApp;
tg?.ready();
tg?.expand();
tg?.setHeaderColor?.("#06070a");
tg?.setBackgroundColor?.("#06070a");

function telegramInitData(){
  return window.Telegram?.WebApp?.initData
    || window.REFERHUB_TG_INIT_DATA
    || "";
}

function apiHeaders(extra={}){
  return {
    "Content-Type":"application/json",
    "X-Telegram-Init-Data":telegramInitData(),
    ...extra
  };
}

let me;
let rotation=0;
let activeTaskCategory="all";
let taskCountdowns={};
const content=document.getElementById("content");
const toastBox=document.getElementById("toast");

async function api(path,options={}){
  const response=await fetch(path,{
    ...options,
    headers:apiHeaders(options.headers||{})
  });

  let data={};
  try{data=await response.json()}catch{}

  if(!response.ok){
    throw new Error(typeof data.detail==="string"?data.detail:"Помилка сервера");
  }

  return data;
}

function toast(text,type="success"){
  if(!toastBox)return;
  clearTimeout(window.__polish91ToastTimer);
  toastBox.className="";
  toastBox.innerHTML=`
    <span class="polish91-toast-icon">${type==="error"?"!":type==="info"?"i":"✓"}</span>
    <span class="polish91-toast-copy">${esc(text)}</span>
    <span class="polish91-toast-line"></span>`;
  toastBox.classList.add("show",`toast-${type}`);
  window.__polish91ToastTimer=setTimeout(()=>toastBox.classList.remove("show"),2700);
  if(window.polish91Prefs?.haptics!==false){
    tg?.HapticFeedback?.notificationOccurred?.(type==="error"?"error":"success");
  }
}

function section(title,note=""){
  return `<div class="section-head"><h2>${title}</h2><small>${note}</small></div>`;
}

function esc(value){
  return String(value??"").replace(/[&<>"']/g,s=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  })[s]);
}

function animateBalance(from,to){
  const el=document.getElementById("balance");
  const start=performance.now();
  const duration=650;
  function frame(now){
    const p=Math.min(1,(now-start)/duration);
    const eased=1-Math.pow(1-p,3);
    el.textContent=Math.round(from+(to-from)*eased);
    if(p<1)requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}



const polish91Defaults={
  haptics:true,
  motion:true,
  particles:true,
  compact:false
};

function loadPolish91Settings(){
  try{
    window.polish91Prefs={
      ...polish91Defaults,
      ...JSON.parse(localStorage.getItem("rh_polish91")||"{}")
    };
  }catch{
    window.polish91Prefs={...polish91Defaults};
  }
  applyPolish91Settings();
}

function applyPolish91Settings(){
  const prefs=window.polish91Prefs||polish91Defaults;
  document.documentElement.classList.toggle("polish91-no-motion",!prefs.motion);
  document.documentElement.classList.toggle("polish91-no-particles",!prefs.particles);
  document.documentElement.classList.toggle("polish91-compact",!!prefs.compact);

  const map={
    polish91Haptics:prefs.haptics,
    polish91Motion:prefs.motion,
    polish91Particles:prefs.particles,
    polish91Compact:prefs.compact
  };
  Object.entries(map).forEach(([id,value])=>{
    const node=document.getElementById(id);
    if(node)node.checked=!!value;
  });
}

function savePolish91Settings(){
  window.polish91Prefs={
    haptics:document.getElementById("polish91Haptics")?.checked??true,
    motion:document.getElementById("polish91Motion")?.checked??true,
    particles:document.getElementById("polish91Particles")?.checked??true,
    compact:document.getElementById("polish91Compact")?.checked??false
  };
  localStorage.setItem("rh_polish91",JSON.stringify(window.polish91Prefs));
  applyPolish91Settings();
  toast("Налаштування збережено","info");
}

function openPolish91Settings(){
  const modal=document.getElementById("polish91Settings");
  if(!modal)return;
  applyPolish91Settings();
  modal.hidden=false;
  document.documentElement.classList.add("settings-open");
  document.body.classList.add("settings-open");
  modal.scrollTop=0;
  requestAnimationFrame(()=>modal.classList.add("show"));
  if(window.polish91Prefs?.haptics!==false){
    tg?.HapticFeedback?.impactOccurred?.("light");
  }
}

function closePolish91Settings(){
  const modal=document.getElementById("polish91Settings");
  if(!modal)return;
  modal.classList.remove("show");
  document.documentElement.classList.remove("settings-open");
  document.body.classList.remove("settings-open");
  setTimeout(()=>modal.hidden=true,220);
}

function polish91ResetSettings(){
  window.polish91Prefs={...polish91Defaults};
  localStorage.setItem("rh_polish91",JSON.stringify(window.polish91Prefs));
  applyPolish91Settings();
  toast("Налаштування скинуто","info");
}

function polish91Reload(){
  toast("Оновлюємо застосунок…","info");
  setTimeout(()=>location.reload(),450);
}

function polish91Skeleton(type="cards",count=4){
  if(type==="hero"){
    return `<div class="polish91-skeleton hero"><i></i><i></i><i></i></div>`;
  }
  return `<div class="polish91-skeleton-grid">${Array.from({length:count},()=>`
    <div class="polish91-skeleton card"><i></i><i></i><i></i></div>`).join("")}</div>`;
}

function updatePolish91Network(){
  const node=document.getElementById("polish91Network");
  if(!node)return;
  const online=navigator.onLine;
  node.classList.toggle("offline",!online);
  node.querySelector("span").textContent=online?"ONLINE":"OFFLINE";
  if(!online)toast("Немає підключення до мережі","error");
}

function polish91PressFeedback(event){
  const button=event.target.closest("button");
  if(!button||button.disabled)return;
  button.classList.remove("polish91-press");
  void button.offsetWidth;
  button.classList.add("polish91-press");
  setTimeout(()=>button.classList.remove("polish91-press"),280);
  if(window.polish91Prefs?.haptics!==false){
    tg?.HapticFeedback?.impactOccurred?.("light");
  }
}

loadPolish91Settings();
window.addEventListener("online",updatePolish91Network);
window.addEventListener("offline",updatePolish91Network);
window.addEventListener("DOMContentLoaded",updatePolish91Network);
document.addEventListener("pointerdown",polish91PressFeedback,{passive:true});

let activePageName="home";
let pageTransitionLock=false;

function triggerHaptic(type="light"){
  try{
    tg?.HapticFeedback?.impactOccurred?.(type);
  }catch{}
}

function animatePress(element){
  if(!element)return;
  element.classList.remove("press-pop");
  void element.offsetWidth;
  element.classList.add("press-pop");
}

function initGlobalMotion(){
  document.addEventListener("pointerdown",event=>{
    const target=event.target.closest("button,.card,.ultra-game-card,.profile-action-button");
    if(target){
      target.classList.add("touch-active");
      triggerHaptic("light");
    }
  });

  document.addEventListener("pointerup",event=>{
    const target=event.target.closest("button,.card,.ultra-game-card,.profile-action-button");
    target?.classList.remove("touch-active");
  });

  document.addEventListener("pointercancel",()=>{
    document.querySelectorAll(".touch-active").forEach(el=>el.classList.remove("touch-active"));
  });


  window.addEventListener("scroll",()=>{
    document.documentElement.style.setProperty("--scroll-y",`${window.scrollY}px`);
  },{passive:true});
}

function preparePageMotion(){
  content.classList.remove("page-enter","page-exit");
  void content.offsetWidth;
  content.classList.add("page-enter");
  requestAnimationFrame(()=>staggerVisibleItems());
}

function staggerVisibleItems(){
  const items=content.querySelectorAll(
    ".card,.ultra-game-card,.profile-stat-pro,.achievement-pro,.timeline-item,.game-history-row,.task,.row"
  );
  items.forEach((item,index)=>{
    item.style.setProperty("--stagger-index",Math.min(index,18));
    item.classList.add("stagger-item");
  });
}

function pulseBalance(){
  const card=document.querySelector(".balance-card");
  if(!card)return;
  card.classList.remove("balance-pulse");
  void card.offsetWidth;
  card.classList.add("balance-pulse");
}

function cinematicWin(kind="normal"){
  const layer=document.createElement("div");
  layer.className=`cinematic-win cinematic-${kind}`;
  layer.innerHTML=`
    <div class="win-ring ring-one"></div>
    <div class="win-ring ring-two"></div>
    <div class="win-flash"></div>
    <div class="win-stars">
      ${Array.from({length:18},(_,i)=>`<i style="--star:${i}">✦</i>`).join("")}
    </div>`;
  document.body.appendChild(layer);
  triggerHaptic(kind==="jackpot"?"heavy":"medium");
  setTimeout(()=>layer.remove(),1500);
}

function coinAnimation(result){
  const coin=document.createElement("div");
  coin.className="floating-coin";
  coin.innerHTML=`<div>${result==="heads"?"👑":"⭐"}</div>`;
  document.body.appendChild(coin);
  setTimeout(()=>coin.remove(),1400);
}

function safeUnlockAnimation(){
  const overlay=document.createElement("div");
  overlay.className="safe-unlock-overlay";
  overlay.innerHTML=`<div class="safe-door"><span>🔐</span><i></i></div>`;
  document.body.appendChild(overlay);
  setTimeout(()=>overlay.classList.add("open"),80);
  setTimeout(()=>overlay.remove(),1500);
}

function rouletteAnimation(){
  const wheel=document.createElement("div");
  wheel.className="roulette-overlay";
  wheel.innerHTML=`<div class="roulette-wheel-big">🎡</div>`;
  document.body.appendChild(wheel);
  setTimeout(()=>wheel.remove(),1500);
}

function caseOpenAnimation(){
  const overlay=document.createElement("div");
  overlay.className="case-open-overlay";
  overlay.innerHTML=`<div class="case-box"><span>🎁</span><i></i></div>`;
  document.body.appendChild(overlay);
  setTimeout(()=>overlay.classList.add("open"),80);
  setTimeout(()=>overlay.remove(),1500);
}


function addCrispMotion(){
  const selector=[
    ".card",".profile-highlight",".profile-stat-pro",
    ".achievement-pro",".ultra-game-card",
    ".season-reward-node",".season-mission-card",
    ".timeline-item",".game-history-row"
  ].join(",");

  document.querySelectorAll(selector).forEach((element,index)=>{
    element.style.setProperty("--motion-order",Math.min(index,20));
    element.classList.add("crisp-motion-item");
  });
}

function crispTap(element){
  if(!element)return;
  element.classList.remove("crisp-tap");
  void element.offsetWidth;
  element.classList.add("crisp-tap");
  setTimeout(()=>element.classList.remove("crisp-tap"),320);
}

document.addEventListener("click",event=>{
  const target=event.target.closest("button,.quick-card,.profile-action-button,.ultra-game-card");
  if(target)crispTap(target);
});


let motionEngineReady=false;

function initMotionEngine(){
  if(motionEngineReady)return;
  motionEngineReady=true;

  document.addEventListener("pointerdown",event=>{
    const target=event.target.closest("button,.home3-action,.gc3-card,.profile-action-button");
    if(!target)return;
    createRipple(target,event);
  });

  document.addEventListener("click",event=>{
    const target=event.target.closest("button,.home3-action,.gc3-card,.profile-action-button");
    if(!target)return;
    target.classList.remove("motion-press");
    void target.offsetWidth;
    target.classList.add("motion-press");
    setTimeout(()=>target.classList.remove("motion-press"),320);
  });
}

function createRipple(target,event){
  const rect=target.getBoundingClientRect();
  const ripple=document.createElement("span");
  ripple.className="motion-ripple";
  const size=Math.max(rect.width,rect.height)*1.25;
  ripple.style.width=`${size}px`;
  ripple.style.height=`${size}px`;
  ripple.style.left=`${event.clientX-rect.left-size/2}px`;
  ripple.style.top=`${event.clientY-rect.top-size/2}px`;
  target.appendChild(ripple);
  setTimeout(()=>ripple.remove(),650);
}

function animateNumber(element,from,to,duration=650){
  if(!element||from===to)return;
  const start=performance.now();
  const formatter=new Intl.NumberFormat("uk-UA");

  function frame(now){
    const progress=Math.min(1,(now-start)/duration);
    const eased=1-Math.pow(1-progress,3);
    element.textContent=formatter.format(Math.round(from+(to-from)*eased));
    if(progress<1)requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function flyCoinsToBalance(amount=6){
  const target=document.querySelector("#balance,#home3Balance,.balance-card strong,.balance strong");
  if(!target)return;

  const end=target.getBoundingClientRect();
  const originX=window.innerWidth/2;
  const originY=window.innerHeight*.58;

  for(let index=0;index<Math.min(10,Math.max(4,amount));index++){
    const coin=document.createElement("div");
    coin.className="motion-coin";
    coin.textContent="★";
    coin.style.left=`${originX+(index-3)*10}px`;
    coin.style.top=`${originY+(index%2)*8}px`;
    document.body.appendChild(coin);

    requestAnimationFrame(()=>{
      coin.style.setProperty("--coin-x",`${end.left+end.width/2-originX}px`);
      coin.style.setProperty("--coin-y",`${end.top+end.height/2-originY}px`);
      coin.classList.add("motion-coin-fly");
    });
    setTimeout(()=>coin.remove(),900+index*35);
  }
}

function rewardToast(title,subtitle,icon="🏆"){
  const old=document.querySelector(".motion-reward-toast");
  old?.remove();

  const toast=document.createElement("div");
  toast.className="motion-reward-toast";
  toast.innerHTML=`
    <div class="motion-reward-icon">${icon}</div>
    <div>
      <span>REWARD UNLOCKED</span>
      <b>${esc(title)}</b>
      <small>${esc(subtitle||"")}</small>
    </div>`;
  document.body.appendChild(toast);
  setTimeout(()=>toast.classList.add("show"),30);
  setTimeout(()=>toast.classList.remove("show"),2800);
  setTimeout(()=>toast.remove(),3300);
}

function motionBalanceUpdate(oldValue,newValue,rewardText=""){
  const homeBalance=document.getElementById("home3Balance");
  animateNumber(homeBalance,oldValue,newValue,700);
  animateBalance(oldValue,newValue);
  if(newValue>oldValue){
    flyCoinsToBalance(Math.min(10,newValue-oldValue));
    rewardToast(
      `+${newValue-oldValue} RH ⭐`,
      rewardText||"Нагороду зараховано",
      "⭐"
    );
  }
}


function coinFlipCinematic(side="heads"){
  const overlay=document.createElement("div");
  overlay.className="premium-game-cinematic coin-cinematic";
  overlay.innerHTML=`
    <div class="coin-stage">
      <div class="coin-shadow"></div>
      <div class="coin-3d ${side}"><img src="/static/assets/games/coin.svg" alt="Coin flip"></div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(()=>overlay.classList.add("show"));
  setTimeout(()=>overlay.remove(),1500);
}

function slotCinematic(){
  const overlay=document.createElement("div");
  overlay.className="premium-game-cinematic slot-cinematic";
  overlay.innerHTML=`
    <div class="slot-stage">
      <img class="cinematic-slot-art" src="/static/assets/games/slot.svg" alt="Slot Neon">
      <div class="slot-crown">SLOT NEON</div>
      <div class="slot-reels">
        ${[0,1,2].map(index=>`
          <div class="slot-reel reel-${index}">
            <span>7</span><span>★</span><span>🍒</span><span>💎</span><span>7</span>
          </div>`).join("")}
      </div>
      <div class="slot-payline"></div>
      <div class="slot-lights">${Array.from({length:14},(_,i)=>`<i style="--light:${i}"></i>`).join("")}</div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(()=>overlay.classList.add("show"));
  setTimeout(()=>overlay.remove(),1650);
}

function scratchDustBurst(x,y){
  const layer=document.createElement("div");
  layer.className="scratch-dust-layer";
  for(let i=0;i<8;i++){
    const dust=document.createElement("i");
    dust.style.left=`${x}px`;
    dust.style.top=`${y}px`;
    dust.style.setProperty("--dx",`${(Math.random()-.5)*70}px`);
    dust.style.setProperty("--dy",`${(Math.random()-.5)*45}px`);
    layer.appendChild(dust);
  }
  document.body.appendChild(layer);
  setTimeout(()=>layer.remove(),650);
}

function rouletteCinematic(){
  const overlay=document.createElement("div");
  overlay.className="premium-game-cinematic roulette-cinematic";
  overlay.innerHTML=`
    <div class="roulette-stage">
      <img class="cinematic-roulette-art" src="/static/assets/games/roulette.svg" alt="Рулетка">
      <div class="roulette-pointer-pro"></div>
      <div class="roulette-wheel-pro">
        ${Array.from({length:16},(_,i)=>`
          <i style="--segment:${i}">
            <span>${i%4===0?"100":i%4===1?"25":i%4===2?"★":"0"}</span>
          </i>`).join("")}
        <div class="roulette-hub">RH</div>
      </div>
      <div class="roulette-ground-glow"></div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(()=>overlay.classList.add("show"));
  setTimeout(()=>overlay.remove(),1900);
}

function caseCinematic(reward=0,resultText=""){
  const overlay=document.createElement("div");
  overlay.className="motion-game-overlay real-case-overlay";
  overlay.innerHTML=`
    <div class="real-case-stage">
      <img class="cinematic-case-art" src="/static/assets/games/case.svg" alt="Daily Case">
      <div class="real-case-box">
        <div class="real-case-lid">🎁</div>
        <div class="real-case-light"></div>
        <div class="real-case-reward">
          <span>${reward>0?"⭐":"○"}</span>
          <strong>${reward>0?`+${reward} RH`:"ПУСТО"}</strong>
          <small>${esc(resultText||"Daily Case")}</small>
        </div>
      </div>
      <div class="real-case-particles">
        ${Array.from({length:18},(_,i)=>`<i style="--particle:${i}">✦</i>`).join("")}
      </div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(()=>overlay.classList.add("show","real-open"));
  return overlay;
}

function startScratchInteraction(surface){
  if(!surface||surface.dataset.ready)return;
  surface.dataset.ready="1";
  surface.innerHTML=`
    <div class="scratch-reward-under">ТРИ ПОКРИТТЯ</div>
    <canvas class="scratch-canvas"></canvas>
    <div class="scratch-hint">СТИРАЙ МИШКОЮ АБО ПАЛЬЦЕМ</div>`;

  const canvas=surface.querySelector(".scratch-canvas");
  const under=surface.querySelector(".scratch-reward-under");
  const hint=surface.querySelector(".scratch-hint");
  const context=canvas.getContext("2d",{willReadFrequently:true});
  let drawing=false;
  let scratchResult=null;
  let requestStarted=false;
  let finished=false;

  function resizeCanvas(){
    const rect=surface.getBoundingClientRect();
    canvas.width=Math.max(1,Math.round(rect.width*devicePixelRatio));
    canvas.height=Math.max(1,Math.round(rect.height*devicePixelRatio));
    canvas.style.width=`${rect.width}px`;
    canvas.style.height=`${rect.height}px`;
    context.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
    context.globalCompositeOperation="source-over";
    const gradient=context.createLinearGradient(0,0,rect.width,rect.height);
    gradient.addColorStop(0,"#d6dbe4");
    gradient.addColorStop(.5,"#9ca4b2");
    gradient.addColorStop(1,"#c7cdd7");
    context.fillStyle=gradient;
    context.fillRect(0,0,rect.width,rect.height);
    context.fillStyle="#242832";
    context.font="900 13px Arial";
    context.textAlign="center";
    context.textBaseline="middle";
    context.fillText("СТИРАЙ",rect.width/2,rect.height/2);
  }

  resizeCanvas();

  async function beginGame(){
    if(requestStarted)return;
    requestStarted=true;
    hint.textContent="НАГОРОДА ВЖЕ ВСЕРЕДИНІ";
    try{
      const old=me.balance;
      scratchResult=await api("/api/games/scratch",{
        method:"POST",
        body:JSON.stringify({bet:0})
      });
      me.balance=scratchResult.balance;
      under.textContent=scratchResult.reward
        ? `+${scratchResult.reward} RH ⭐`
        : "ПУСТО";
      under.classList.toggle("win",scratchResult.reward>0);
      motionBalanceUpdate(old,scratchResult.balance,"Скретч-картка");
      gc418AfterPlay?.("scratch",scratchResult.result_text||"Скретч-картка",Number(scratchResult.reward||0));
    }catch(error){
      scratchResult={error:error.message};
      under.textContent=error.message;
      hint.textContent="ПОМИЛКА";
    }
  }

  function scratchAt(clientX,clientY){
    const rect=canvas.getBoundingClientRect();
    const x=clientX-rect.left;
    const y=clientY-rect.top;
    context.globalCompositeOperation="destination-out";
    context.beginPath();
    context.arc(x,y,24,0,Math.PI*2);
    context.fill();
    checkScratchPercent();
  }

  function checkScratchPercent(){
    if(finished)return;
    const data=context.getImageData(0,0,canvas.width,canvas.height).data;
    let transparent=0;
    const step=4*20;
    for(let i=3;i<data.length;i+=step){
      if(data[i]===0)transparent++;
    }
    const total=Math.ceil(data.length/step);
    const percent=transparent/total;

    if(percent>=.42){
      finished=true;
      canvas.classList.add("scratch-finished");
      hint.textContent=scratchResult?.error
        ? "НЕ ВДАЛОСЯ"
        : scratchResult?.reward
          ? `ЗНАЙДЕНО ${scratchResult.reward} RH`
          : "КАРТКА ПОРОЖНЯ";
      if(scratchResult?.reward>=5)celebrateUltra("scratch"); luxuryWinBurst("win");
      setTimeout(()=>{
        canvas.style.pointerEvents="none";
      },500);
    }
  }

  surface.addEventListener("pointerdown",async event=>{
    drawing=true;
    await beginGame();
    surface.setPointerCapture?.(event.pointerId);
    scratchAt(event.clientX,event.clientY);
    scratchDustBurst(event.clientX,event.clientY);
  });

  surface.addEventListener("pointermove",event=>{
    if(drawing){
      scratchAt(event.clientX,event.clientY);
      if(Math.random()>.68)scratchDustBurst(event.clientX,event.clientY);
    }
  });

  surface.addEventListener("pointerup",()=>drawing=false);
  surface.addEventListener("pointercancel",()=>drawing=false);
}


function startVisibleMotion(){
  document.querySelectorAll(
    ".home3-action,.gc3-card,.home3-stat-grid>div,.profile-stat-pro,.season-reward-node"
  ).forEach((item,index)=>{
    item.style.setProperty("--float-delay",`${(index%8)*.18}s`);
    item.classList.add("visible-float-card");
  });

  document.querySelectorAll(
    ".home3-balance strong,.gc3-hero-stats strong,.home3-stat-grid strong,.profile-highlight strong"
  ).forEach((counter,index)=>{
    counter.classList.add("visible-counter");
    counter.style.setProperty("--counter-delay",`${index*.08}s`);
  });

  document.querySelectorAll(
    ".home3-action>span,.gc3-icon,.gc3-controller span,.home3-avatar,.profile-avatar-ring"
  ).forEach((icon,index)=>{
    icon.style.setProperty("--icon-delay",`${(index%6)*.2}s`);
    icon.classList.add("visible-icon-motion");
  });
}


function applyDesignSystem(){
  document.querySelectorAll(
    ".section-head,.home3-section-title,.gc3-section-title,.shop3-section-title,.profile5-section-title,.admin6-section-title"
  ).forEach(header=>header.classList.add("ds-section-head"));

  document.querySelectorAll(
    "button.primary,.ultra-button,.shop3-buy-button,.profile5-claim,.admin6-section-title>button"
  ).forEach(button=>button.classList.add("ds-primary-button"));

  document.querySelectorAll(
    "input,select,textarea"
  ).forEach(field=>field.classList.add("ds-field"));

  document.querySelectorAll(
    ".card,.home3-action,.gc3-card,.shop3-product,.profile5-stat-grid article,.admin6-stat-grid article"
  ).forEach(card=>card.classList.add("ds-card"));

  document.querySelectorAll(
    ".empty,.gc3-error,.season-road-empty"
  ).forEach(empty=>empty.classList.add("ds-empty-state"));
}


function applyLuxuryEdition(){
  document.querySelectorAll(
    ".home3-hero,.gc3-hero,.shop3-hero,.profile5-hero,.admin6-hero,.season-hero-pro"
  ).forEach(hero=>hero.classList.add("lux-hero"));

  document.querySelectorAll(
    ".home3-action,.gc3-card,.shop3-product,.profile5-frame,.profile5-achievement,.admin6-stat-grid article"
  ).forEach((card,index)=>{
    card.classList.add("lux-card");
    card.style.setProperty("--lux-delay",`${(index%10)*.08}s`);
  });

  document.querySelectorAll(
    ".gc3-featured,.shop3-featured-card,.profile5-featured-badge,.home3-season"
  ).forEach(block=>block.classList.add("lux-featured"));

  document.querySelectorAll(
    ".profile5-frame"
  ).forEach(frame=>frame.classList.add("lux-frame"));

  document.querySelectorAll(
    ".gc3-card .gc3-icon,.home3-action>span,.shop3-bag span,.profile5-badge-icon"
  ).forEach((icon,index)=>{
    icon.classList.add("lux-icon");
    icon.style.setProperty("--lux-icon-delay",`${(index%8)*.12}s`);
  });
}

function luxuryWinBurst(type="win"){
  const layer=document.createElement("div");
  layer.className=`lux-win-burst ${type}`;
  layer.innerHTML=`
    <div class="lux-win-core">${type==="jackpot"?"👑":"⭐"}</div>
    ${Array.from({length:24},(_,i)=>`<i style="--lux-p:${i}">${i%3===0?"✦":i%3===1?"★":"◆"}</i>`).join("")}`;
  document.body.appendChild(layer);
  requestAnimationFrame(()=>layer.classList.add("show"));
  setTimeout(()=>layer.remove(),1800);
}

function setupMotionForPage(){
  initMotionEngine();
  applyDesignSystem();
  applyLuxuryEdition();
  startVisibleMotion();
  document.querySelectorAll(".gc3-scratch-surface:not(.disabled),#scratchSurface:not(.disabled)").forEach(startScratchInteraction);
}

async function loadMe(){
  me=await api("/api/me");
  document.getElementById("balance").textContent=me.balance;
  document.getElementById("hello").textContent=`Привіт, ${me.first_name}!`;
  document.getElementById("avatar").textContent=me.first_name?.[0]||"R";
  document.getElementById("online").textContent=`${me.online_count} онлайн`;
}

async function homePage(){
  const summary=await api("/api/lottery-summary");
  const active=summary.active;
  const last=summary.last_winner;

  content.innerHTML=`
    <section class="lot11-home-hero">
      <div class="lot11-hero-copy">
        <span class="lot11-live"><i></i> REFERHUB LOTTERY LIVE</span>
        <h1>${active?esc(active.title):"Новий розіграш скоро"}</h1>
        <p>${active
          ? esc(active.prize_name)
          : "Заробляй RH, збирай квитки та готуйся до наступного розіграшу."}</p>

        <div class="lot11-hero-stats">
          <div>
            <small>Твій баланс</small>
            <strong>${Number(summary.balance||0)} RH</strong>
          </div>
          <div>
            <small>Твої квитки</small>
            <strong>${Number(summary.my_total_tickets||0)} 🎟</strong>
          </div>
          <div>
            <small>Розіграшів</small>
            <strong>${Number(summary.total_draws||0)}</strong>
          </div>
        </div>

        <div class="lot11-hero-actions">
          <button class="primary" onclick="openPage('lotteries')">🎟 ВЗЯТИ УЧАСТЬ</button>
          <button onclick="openPage('games')">🎮 ЗАРОБИТИ RH</button>
        </div>
      </div>

      <div class="lot11-hero-prize ${active?'':'empty'}">
        <span class="lot11-prize-orbit"></span>
        <div class="lot11-prize-icon">${active?esc(active.prize_emoji||"🎁"):"✨"}</div>
        <small>${active?"ГОЛОВНИЙ ПРИЗ":"НАСТУПНИЙ РОЗІГРАШ"}</small>
        <strong>${active?esc(active.prize_name):"Скоро"}</strong>
        ${active?`
          <div class="lot11-countdown">
            <span>До завершення</span>
            <b>${lotteryTimeLeft(active.ends_at)}</b>
          </div>`:""}
      </div>
    </section>

    <section class="lot11-strip">
      <button onclick="openPage('lotteries')">
        <i>🎟</i><span><b>Розіграші</b><small>Купити квитки</small></span><strong>→</strong>
      </button>
      <button onclick="openPage('games')">
        <i>🎮</i><span><b>Мініігри</b><small>Заробити RH</small></span><strong>→</strong>
      </button>
      <button onclick="openPage('tasks')">
        <i>⚡</i><span><b>Завдання</b><small>Швидкі нагороди</small></span><strong>→</strong>
      </button>
    </section>

    ${active?`
      <section class="lot11-active">
        <div class="lot11-section-head">
          <div><span>АКТИВНИЙ РОЗІГРАШ</span><h2>Твій шанс уже тут</h2></div>
          <button onclick="openPage('lotteries')">Відкрити →</button>
        </div>

        <div class="lot11-active-card">
          <div class="lot11-active-left">
            <div class="lot11-big-prize">${esc(active.prize_emoji||"🎁")}</div>
            <div>
              <span>${lotteryStatusLabel(active.status)}</span>
              <h3>${esc(active.title)}</h3>
              <p>${esc(active.description||"")}</p>
            </div>
          </div>

          <div class="lot11-active-right">
            <div><small>Квиток</small><b>${Number(active.ticket_price)} RH</b></div>
            <div><small>У тебе</small><b>${Number(active.my_tickets)} 🎟</b></div>
            <div><small>Всього</small><b>${Number(active.total_tickets)} 🎟</b></div>
            <div><small>Шанс</small><b>${Number(active.my_chance_percent||0).toFixed(4)}%</b></div>
          </div>
        </div>
      </section>`:""}

    <section class="lot11-bottom-grid">
      <div class="lot11-winner-card">
        <span>ОСТАННІЙ ПЕРЕМОЖЕЦЬ</span>
        ${last?`
          <div class="lot11-winner-main">
            <div class="lot11-winner-crown">👑</div>
            <div>
              <h3>${last.winner_username?`@${esc(last.winner_username)}`:esc(last.winner_first_name||"Переможець")}</h3>
              <p>${esc(last.prize_name)}</p>
              <small>Квиток #${last.winning_ticket_id??"—"}</small>
            </div>
          </div>
          <button onclick="showLotteryProof(${last.id})">Перевірити результат</button>
        `:`
          <div class="lot11-empty-winner">Перший переможець ще попереду ✨</div>
        `}
      </div>

      <div class="lot11-progress-card">
        <span>НАСТУПНИЙ КВИТОК</span>
        <h3>${active?`${Number(active.ticket_price)} RH`:"—"}</h3>
        ${active?`
          <div class="lot11-progress-line">
            <i style="width:${Math.min(100,(Number(summary.balance||0)/Number(active.ticket_price||1))*100)}%"></i>
          </div>
          <p>${Number(summary.balance||0)>=Number(active.ticket_price||0)
            ?"У тебе вже вистачає RH на квиток 🔥"
            :`Ще ${Math.max(0,Number(active.ticket_price||0)-Number(summary.balance||0))} RH до наступного квитка`}</p>
          <button onclick="openPage('games')">Заробити RH</button>
        `:`<p>Очікуємо новий розіграш.</p>`}
      </div>
    </section>
  `;
}


/* ReferHub v2.6.1 — Earn / Progression Center recovery */
const progress82Achievements=[
  {id:"games10",icon:"🎮",title:"Перші 10 ігор",description:"Зіграй 10 раундів у мінііграх",goal:10,type:"games"},
  {id:"games50",icon:"⚡",title:"Аркадник",description:"Зіграй 50 раундів",goal:50,type:"games"},
  {id:"rh100",icon:"✦",title:"RH Hunter",description:"Зароби 100 RH у мінііграх",goal:100,type:"earned"},
  {id:"rh500",icon:"💎",title:"Великий мисливець",description:"Зароби 500 RH у мінііграх",goal:500,type:"earned"},
  {id:"wins10",icon:"🏆",title:"Серія перемог",description:"Отримай нагороду у 10 іграх",goal:10,type:"wins"},
  {id:"wins25",icon:"👑",title:"Чемпіон",description:"Отримай нагороду у 25 іграх",goal:25,type:"wins"}
];

function progress82Value(item,history){
  history=Array.isArray(history)?history:[];
  if(item.type==="games") return history.length;
  if(item.type==="earned") return history.reduce((s,x)=>s+Math.max(0,Number(x.reward||0)),0);
  if(item.type==="wins") return history.filter(x=>Number(x.reward||0)>0).length;
  return 0;
}
function progress82AchievementCard(item,history){
  const value=progress82Value(item,history);
  const done=value>=item.goal;
  const percent=Math.max(0,Math.min(100,Math.round(value/item.goal*100)));
  return `<article class="pc82-achievement ${done?"unlocked":"locked"}">
    <div class="pc82-achievement-icon">${done?item.icon:"🔒"}</div>
    <div>
      <span>${done?"ДОСЯГНЕННЯ ВІДКРИТО":"ПРОГРЕС"}</span>
      <h3>${esc(item.title)}</h3>
      <p>${esc(item.description)}</p>
      <div class="pc82-achievement-track"><i style="width:${percent}%"></i></div>
      <small>${Math.min(value,item.goal)}/${item.goal}</small>
    </div>
  </article>`;
}
function progress82MissionCard(mission){
  const progress=Number(mission.progress||0);
  const target=Math.max(1,Number(mission.target_value||mission.target||1));
  const percent=Math.max(0,Math.min(100,Math.round(progress/target*100)));
  const ready=progress>=target&&!mission.claimed;
  return `<article class="pc82-mission ${mission.claimed?"claimed":ready?"ready":""}">
    <div class="pc82-mission-icon">${mission.icon||"⚡"}</div>
    <div class="pc82-mission-copy">
      <span>${mission.claimed?"ВИКОНАНО":ready?"НАГОРОДА ГОТОВА":"ЩОДЕННА МІСІЯ"}</span>
      <h3>${esc(mission.title||"Місія")}</h3>
      <p>${esc(mission.description||"Виконай умову та отримай RH.")}</p>
      <div class="pc82-mission-track"><i style="width:${percent}%"></i></div>
      <small>${progress}/${target}</small>
    </div>
    ${mission.claimed?`<button disabled>✓</button>`:ready&&mission.id?`<button onclick="claimMission(${Number(mission.id)})">ЗАБРАТИ</button>`:`<button disabled>${mission.reward||mission.reward_amount||0} RH</button>`}
  </article>`;
}
function switchProgress82Tab(name,button){
  document.querySelectorAll(".pc82-tabs button").forEach(b=>b.classList.toggle("active",b===button));
  document.querySelectorAll("[data-pc82-panel]").forEach(p=>p.classList.toggle("active",p.dataset.pc82Panel===name));
}


function task82OpenLink(link){
  if(!link)return;
  try{
    if(window.Telegram?.WebApp?.openLink){
      window.Telegram.WebApp.openLink(link);
    }else{
      window.open(link,"_blank","noopener,noreferrer");
    }
  }catch(_){
    window.open(link,"_blank","noopener,noreferrer");
  }
}

async function openTask82(id,link){
  try{
    const result=await api(`/api/tasks/${id}/open`,{method:"POST"});
    task82OpenLink(result.link||link);
    toast(result.wait_seconds?`Відкрито. Перевірка через ${result.wait_seconds} сек.`:"Посилання відкрито");
    setTimeout(()=>tasksPage(),350);
  }catch(error){
    toast(error.message,"error");
  }
}

async function verifyTask82(id){
  try{
    const old=Number(me.balance||0);
    const result=await api(`/api/tasks/${id}/claim`,{method:"POST"});
    me.balance=Number(result.balance||me.balance||0);
    motionBalanceUpdate?.(old,me.balance);
    rewardToast?.("Завдання виконано",`+${result.reward} RH`,"📋");
    toast(`+${result.reward} RH`);
    await tasksPage();
  }catch(error){
    toast(error.message,"error");
  }
}

function task82Actions(task){
  if(task.claimed){
    return `<button disabled>✓ ВИКОНАНО</button>`;
  }
  if(task.available===false){
    return `<button disabled title="${esc(task.availability_message||"Недоступно")}">НЕДОСТУПНО</button>`;
  }

  const type=task.verification_type||"visit";
  const link=task.link||"";

  if(type==="visit"){
    if(task.action==="open" || !task.opened_at){
      return `<button onclick="openTask82(${task.id},'${esc(link)}')">ВІДКРИТИ</button>`;
    }
    if(Number(task.remaining_wait||0)>0){
      return `<button disabled>ЩЕ ${Number(task.remaining_wait)} СЕК.</button>`;
    }
    return `<button onclick="verifyTask82(${task.id})">ПЕРЕВІРИТИ</button>`;
  }

  if(type==="telegram_member"){
    return `<div class="pc82-task-actions">
      ${link?`<button class="secondary" onclick="openTask82(${task.id},'${esc(link)}')">КАНАЛ</button>`:""}
      <button onclick="verifyTask82(${task.id})">ПЕРЕВІРИТИ</button>
    </div>`;
  }

  if(type==="referral"){
    return `<button onclick="verifyTask82(${task.id})">ПЕРЕВІРИТИ</button>`;
  }

  return `<button onclick="verifyTask82(${task.id})">ЗАБРАТИ</button>`;
}

async function tasksPage(){
  content.innerHTML=`<div class="loader"></div>`;

  const [tasksResult,missionsResult,historyResult]=await Promise.allSettled([
    api("/api/tasks"),
    api("/api/missions"),
    api("/api/games/history")
  ]);
  const tasks=tasksResult.status==="fulfilled"&&Array.isArray(tasksResult.value)?tasksResult.value:[];
  const missions=missionsResult.status==="fulfilled"&&Array.isArray(missionsResult.value)?missionsResult.value:[];
  const history=historyResult.status==="fulfilled"&&Array.isArray(historyResult.value)?historyResult.value:[];
  if(tasksResult.status==="rejected"&&missionsResult.status==="rejected"){
    throw new Error(tasksResult.reason?.message||missionsResult.reason?.message||"Не вдалося завантажити завдання");
  }

  const unlockedAchievements=progress82Achievements.filter(item=>progress82Value(item,history)>=item.goal).length;
  const activeMissions=missions.filter(mission=>!mission.claimed).length;
  const completedTasks=tasks.filter(task=>task.claimed).length;

  content.innerHTML=`
    <section class="pc82-shell">
      <header class="pc82-hero">
        <div>
          <span>PROGRESSION CENTER</span>
          <h1>Місії та досягнення</h1>
          <p>Виконуй реальні завдання, відкривай медалі та розвивай профіль.</p>
        </div>
        <div class="pc82-hero-stats">
          <div><span>Досягнення</span><strong>${unlockedAchievements}/${progress82Achievements.length}</strong></div>
          <div><span>Активні місії</span><strong>${activeMissions}</strong></div>
          <div><span>Завдання</span><strong>${completedTasks}/${tasks.length}</strong></div>
        </div>
      </header>

      <nav class="pc82-tabs">
        <button class="active" onclick="switchProgress82Tab('missions',this)">Місії</button>
        <button onclick="switchProgress82Tab('achievements',this)">Досягнення</button>
        <button onclick="switchProgress82Tab('tasks',this)">Завдання</button>
      </nav>

      <div class="pc82-panel active" data-pc82-panel="missions">
        <div class="pc82-section-title">
          <div><span>DAILY PROGRESS</span><h2>Щоденні місії</h2></div>
          <small>${missions.filter(m=>m.claimed).length}/${missions.length} виконано</small>
        </div>
        <div class="pc82-list">
          ${missions.length?missions.map(progress82MissionCard).join(""):`
            <div class="pc82-empty"><span>✦</span><h3>Нові місії скоро</h3><p>Список оновлюється автоматично.</p></div>`}
        </div>
      </div>

      <div class="pc82-panel" data-pc82-panel="achievements">
        <div class="pc82-section-title">
          <div><span>PERMANENT PROGRESS</span><h2>Досягнення</h2></div>
          <small>${unlockedAchievements}/${progress82Achievements.length} відкрито</small>
        </div>
        <div class="pc82-achievement-grid">
          ${progress82Achievements.map(item=>progress82AchievementCard(item,history)).join("")}
        </div>
      </div>

      <div class="pc82-panel" data-pc82-panel="tasks">
        <div class="pc82-section-title">
          <div><span>REFERHUB TASKS</span><h2>Основні завдання</h2></div>
          <small>${completedTasks}/${tasks.length} виконано</small>
        </div>
        <div class="pc82-list">
          ${tasks.length?tasks.map(task=>`
            <article class="pc82-task ${task.claimed?"claimed":""}">
              <div class="pc82-mission-icon">${task.icon||"◆"}</div>
              <div>
                <span>${task.claimed?"ВИКОНАНО":"ЗАВДАННЯ"}</span>
                <h3>${esc(task.title||task.name||"Завдання")}</h3>
                <p>${esc(task.description||"Виконай умову та забери RH")}</p>
                <strong>+${task.reward||0} RH</strong>
              </div>
              ${task82Actions(task)}
            </article>`).join(""):`
            <div class="pc82-empty"><span>◆</span><h3>Усі завдання виконано</h3><p>Нові завдання з'являться пізніше.</p></div>`}
        </div>
      </div>
    </section>
  `;

  addCrispMotion();
  setupMotionForPage();
}

async function claimTask(id){ return verifyTask82(id); }



async function social441Search(){
  const input=document.getElementById("social441Query");
  const box=document.getElementById("social441Results");
  const q=(input?.value||"").trim();
  if(!box)return;
  if(q.length<2){
    box.innerHTML=`<div class="social831-empty"><span>⌕</span><h3>Замало символів</h3><p>Введи хоча б 2 символи.</p></div>`;
    return;
  }

  box.innerHTML=`<div class="social441-loading"><div class="loader"></div><span>Шукаємо…</span></div>`;

  try{
    const result=await api(`/api/social-v26/search?q=${encodeURIComponent(q)}`);
    const users=Array.isArray(result?.users)?result.users:[];
    box.innerHTML=users.length?users.map(user=>`
      <article class="social441-user">
        <div class="social831-avatar"><span>${esc((user.first_name||user.username||"R").slice(0,1).toUpperCase())}</span></div>
        <div class="grow">
          <b>${esc(user.first_name||user.username||"Користувач")}</b>
          <small>${user.username?"@"+esc(user.username):"ID "+user.id} · ${user.is_online?"🟢 Онлайн":"⚪ Неактивний"}</small>
          <span>LVL / XP ${Number(user.xp||0)} · ${Number(user.total_earned||0)} RH</span>
        </div>
        <button class="${user.followed?"active":""}" onclick="social441Follow(${user.id},this)">
          ${user.followed?"✓ ДОДАНО":"+ ДОДАТИ"}
        </button>
      </article>`).join(""):`
      <div class="social831-empty"><span>⌕</span><h3>Нікого не знайдено</h3><p>Перевір ім’я або username.</p></div>`;
  }catch(error){
    box.innerHTML=`<div class="social831-empty"><span>!</span><h3>Помилка пошуку</h3><p>${esc(error.message)}</p></div>`;
  }
}

async function social441Follow(id,button){
  try{
    const result=await api(`/api/social-v26/follow/${id}`,{method:"POST"});
    button.classList.toggle("active",Boolean(result.followed));
    button.textContent=result.followed?"✓ ДОДАНО":"+ ДОДАТИ";
    toast(result.followed?"Гравця додано":"Підписку скасовано");
  }catch(error){
    toast(error.message,"error");
  }
}


function social831LeagueClass(league){
  return String(league||"Silver").toLowerCase();
}

function social831Name(player){
  return player?.first_name||player?.username||"Користувач";
}

function social831Avatar(player){
  return `<span>${esc(social831Name(player).slice(0,1).toUpperCase())}</span>`;
}

function social831SwitchTab(name,button){
  document.querySelectorAll(".social831-tabs button").forEach(node=>node.classList.remove("active"));
  document.querySelectorAll(".social831-panel").forEach(node=>node.classList.remove("active"));
  button.classList.add("active");
  document.querySelector(`[data-social831-panel="${name}"]`)?.classList.add("active");
  if(name==="invite")setTimeout(()=>ref413LoadTeam(),30);
}

function social831ShowPlayer(telegramId){
  const player=(window.__social831Players||[]).find(
    item=>Number(item.telegram_id)===Number(telegramId)
  );
  if(!player)return;

  document.querySelector(".social831-modal")?.remove();
  const level=player.level||{number:1,name:"Новачок"};

  const modal=document.createElement("div");
  modal.className="social831-modal";
  modal.innerHTML=`
    <div class="social831-modal-card">
      <button class="social831-close" onclick="this.closest('.social831-modal').remove()">×</button>
      <div class="social831-profile-avatar">${social831Avatar(player)}</div>
      <span class="social831-league league-${social831LeagueClass(player.league)}">${esc(player.league||"Silver")}</span>
      <h2>${esc(social831Name(player))}</h2>
      <p>${player.is_online?"🟢 Онлайн":"⚪ Неактивний"} · LVL ${level.number}</p>
      <div class="social831-profile-stats">
        <div><span>Рейтинг</span><strong>#${player.rank||"—"}</strong></div>
        <div><span>Баланс</span><strong>${Number(player.balance||0)} RH</strong></div>
        <div><span>Зароблено</span><strong>${Number(player.total_earned||0)} RH</strong></div>
        <div><span>Друзі</span><strong>${Number(player.referrals_count||0)}</strong></div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  requestAnimationFrame(()=>modal.classList.add("show"));
}

function social831Podium(player,place){
  if(!player){
    return `<div class="social831-podium-player empty"></div>`;
  }
  return `
    <button class="social831-podium-player place-${place}" onclick="social831ShowPlayer(${player.telegram_id})">
      <div class="social831-medal">${place===1?"♛":place===2?"◆":"◇"}</div>
      <div class="social831-podium-avatar">${social831Avatar(player)}</div>
      <strong>${esc(social831Name(player))}</strong>
      <span>${Number(player.total_earned||0)} RH</span>
      <small>${esc(player.league||"Silver")}</small>
    </button>`;
}
async function friendsPage(){
  content.innerHTML=`<div class="loader"></div>`;

  let friends=[];
  let summary={
    referrals_count:0,
    active_count:0,
    total_reward:0,
    reward_per_friend:0,
    milestones:[],
    next_milestone:null
  };
  let leaderboard={players:[],my_rank:null,total_players:0};
  let leaderboardError=false;

  try{
    [friends,summary]=await Promise.all([
      api("/api/friends"),
      api("/api/referrals/summary")
    ]);
  }catch(error){
    content.innerHTML=`
      <div class="social831-error">
        <span>!</span>
        <h2>Не вдалося завантажити друзів</h2>
        <p>${esc(error.message)}</p>
        <button onclick="friendsPage()">Спробувати ще раз</button>
      </div>`;
    return;
  }

  try{
    leaderboard=await api("/api/leaderboard");
  }catch(error){
    leaderboardError=true;
    console.error("Leaderboard unavailable:",error);
  }

  friends=Array.isArray(friends)?friends:[];
  summary=summary||{};
  summary.milestones=Array.isArray(summary.milestones)?summary.milestones:[];
  leaderboard.players=Array.isArray(leaderboard.players)?leaderboard.players:[];

  window.__social831Players=leaderboard.players;

  const top1=leaderboard.players[0];
  const top2=leaderboard.players[1];
  const top3=leaderboard.players[2];
  const myEntry=leaderboard.players.find(player=>player.is_me);
  const nextPlayer=myEntry&&myEntry.rank>1
    ?leaderboard.players.find(player=>player.rank===myEntry.rank-1)
    :null;
  const gap=nextPlayer&&myEntry
    ?Math.max(0,Number(nextPlayer.total_earned||0)-Number(myEntry.total_earned||0))
    :0;

  const nextText=summary.next_milestone
    ?`${Number(summary.referrals_count||0)}/${summary.next_milestone.count} до «${summary.next_milestone.label}»`
    :"Усі реферальні рівні відкрито";

  content.innerHTML=`
    <section class="social831-shell">
      <header class="social831-hero">
        <div>
          <span>SOCIAL HUB</span>
          <h1>Друзі та рейтинг</h1>
          <p>Запрошуй людей, отримуй RH і піднімайся у глобальній таблиці.</p>
        </div>
        <div class="social831-rank-card">
          <small>ТВОЄ МІСЦЕ</small>
          <strong>${leaderboardError?"—":`#${leaderboard.my_rank||me.rank||"—"}`}</strong>
          <span>${myEntry?.league||"Silver League"}</span>
        </div>
      </header>

      <nav class="social831-tabs">
        <button class="active" onclick="social831SwitchTab('friends',this)">Мої друзі</button>
        <button onclick="social831SwitchTab('search',this)">Пошук</button>
        <button onclick="social831SwitchTab('leaderboard',this)">Рейтинг</button>
        <button onclick="social831SwitchTab('invite',this)">Запрошення</button>
      </nav>

      <div class="social831-panel active" data-social831-panel="friends">
        <div class="social831-stats">
          <div><span>Усього друзів</span><strong>${Number(summary.referrals_count||0)}</strong></div>
          <div><span>Активні 7 днів</span><strong>${Number(summary.active_count||0)}</strong></div>
          <div><span>Зароблено</span><strong>${Number(summary.total_reward||0)} RH</strong></div>
          <div><span>За одного</span><strong>${Number(summary.reward_per_friend||0)} RH</strong></div>
        </div>

        <div class="social831-title">
          <div><span>YOUR NETWORK</span><h2>Мої реферали</h2></div>
          <small>${friends.length} користувачів</small>
        </div>

        <div class="social831-friend-list">
          ${friends.length?friends.map((friend,index)=>`
            <article class="social831-friend">
              <div class="social831-place">${index+1}</div>
              <div class="social831-avatar">${social831Avatar(friend)}</div>
              <div>
                <h3>${esc(social831Name(friend))}</h3>
                <p>${friend.is_online?"🟢 Онлайн":"⚪ Неактивний"} · приєднався ${new Date(Number(friend.created_at||0)*1000).toLocaleDateString("uk-UA")}</p>
              </div>
              <strong>${Number(friend.total_earned||0)} RH</strong>
            </article>`).join(""):`
            <div class="social831-empty">
              <span>♟</span>
              <h3>Ти ще нікого не запросив</h3>
              <p>Надішли своє посилання другу та отримай першу нагороду.</p>
              <button onclick="shareReferral()">Запросити друга</button>
            </div>`}
        </div>
      </div>


      <div class="social831-panel" data-social831-panel="search">
        <div class="social831-title">
          <div><span>DISCOVER</span><h2>Знайти людей</h2></div>
          <small>ім’я · @username · Telegram ID</small>
        </div>

        <div class="social441-search">
          <span>⌕</span>
          <input id="social441Query" placeholder="Наприклад @username або ім’я"
            onkeydown="if(event.key==='Enter')social441Search()">
          <button onclick="social441Search()">ЗНАЙТИ</button>
        </div>

        <div id="social441Results" class="social441-results">
          <div class="social831-empty">
            <span>⌕</span>
            <h3>Пошук гравців</h3>
            <p>Введи щонайменше 2 символи.</p>
          </div>
        </div>
      </div>

      <div class="social831-panel" data-social831-panel="leaderboard">
        ${leaderboardError?`
          <div class="social831-warning">
            <span>!</span>
            <div><h3>Рейтинг тимчасово недоступний</h3><p>Список друзів працює. Онови сторінку трохи пізніше.</p></div>
            <button onclick="friendsPage()">Оновити</button>
          </div>`:`
          <section class="social831-podium">
            ${social831Podium(top2,2)}
            ${social831Podium(top1,1)}
            ${social831Podium(top3,3)}
          </section>

          ${myEntry?`
            <article class="social831-my-position">
              <div>#${myEntry.rank}</div>
              <section>
                <span>ТВОЯ ПОЗИЦІЯ</span>
                <h3>${esc(social831Name(myEntry))}</h3>
                <p>${gap?`Ще ${gap} RH до наступного місця`:"Ти на вершині рейтингу"}</p>
              </section>
              <strong>${Number(myEntry.total_earned||0)} RH</strong>
            </article>`:""}

          <div class="social831-title">
            <div><span>GLOBAL LEADERBOARD</span><h2>Топ гравців</h2></div>
            <small>${Number(leaderboard.total_players||0)} учасників</small>
          </div>

          <div class="social831-ranking">
            ${leaderboard.players.map(player=>`
              <button class="${player.is_me?"me":""}" onclick="social831ShowPlayer(${player.telegram_id})">
                <span class="rank">#${player.rank}</span>
                <span class="social831-avatar">${social831Avatar(player)}</span>
                <span class="copy">
                  <b>${esc(social831Name(player))}</b>
                  <small>${player.is_online?"🟢 Онлайн":"⚪ Неактивний"} · LVL ${player.level?.number||1}</small>
                </span>
                <span class="social831-league league-${social831LeagueClass(player.league)}">${esc(player.league)}</span>
                <strong>${Number(player.total_earned||0)} RH</strong>
              </button>`).join("")}
          </div>`}
      </div>

      <div class="social831-panel referral413-panel" data-social831-panel="invite">
        <article class="ref413-hero">
          <div class="ref413-hero-icon">♟</div>
          <div class="grow">
            <span>REFERRAL CENTER · 2.0</span>
            <h2>Запрошуй і розвивай команду</h2>
            <p>Кожен новий користувач приносить <b>${Number(summary.reward_per_friend||0)} RH</b>.</p>
          </div>
          <div class="ref413-reward"><small>ЗАРОБЛЕНО</small><b>${Number(summary.total_reward||0)} RH</b></div>
        </article>

        <section class="ref413-stats">
          <article><span>👥</span><div><small>ЗАПРОШЕНО</small><b>${Number(summary.referrals_count||0)}</b></div></article>
          <article><span>🟢</span><div><small>АКТИВНІ 7 ДНІВ</small><b>${Number(summary.active_count||0)}</b></div></article>
          <article><span>✦</span><div><small>RH З РЕФЕРАЛІВ</small><b>${Number(summary.total_reward||0)}</b></div></article>
        </section>

        <section class="ref413-linkbox">
          <div><small>ТВОЄ ПОСИЛАННЯ</small><b>${esc(summary.referral_link||me.referral_link||"")}</b></div>
          <div class="ref413-link-actions">
            <button onclick="shareReferral()">↗ ЗАПРОСИТИ</button>
            <button class="secondary" onclick="copyReferralLink()">⧉ КОПІЮВАТИ</button>
          </div>
        </section>

        <section class="ref413-next">
          <div class="ref413-next-copy">
            <span>NEXT MILESTONE</span>
            <h3>${summary.next_milestone?esc(summary.next_milestone.label):"Максимальний рівень"}</h3>
            <p>${summary.next_milestone?`${Math.max(0,Number(summary.next_milestone.count||0)-Number(summary.referrals_count||0))} друзів залишилось`:"Усі рівні програми відкрито"}</p>
          </div>
          <strong>${summary.next_milestone?`${Number(summary.referrals_count||0)}/${Number(summary.next_milestone.count||0)}`:"MAX"}</strong>
          <div class="ref413-progress"><i style="width:${summary.next_milestone?Math.min(100,Math.round(Number(summary.referrals_count||0)/Math.max(1,Number(summary.next_milestone.count||1))*100)):100}%"></i></div>
        </section>

        <div class="social831-title">
          <div><span>REFERRAL PATH</span><h2>Рівні програми</h2></div>
          <small>${esc(nextText)}</small>
        </div>

        <div class="social831-milestones ref413-milestones">
          ${summary.milestones.length?summary.milestones.map((item,index)=>`
            <article class="${item.completed?"done":""}">
              <span>${item.completed?"✓":index+1}</span>
              <div><h3>${esc(item.label)}</h3><p>${item.count} друзів</p></div>
              <strong>${item.completed?"Відкрито":"Закрито"}</strong>
            </article>`).join(""):`
            <div class="social831-empty"><span>◇</span><h3>Рівні ще не налаштовані</h3><p>Реферальне посилання вже працює.</p></div>`}
        </div>

        <div class="social831-title ref413-team-title">
          <div><span>MY TEAM</span><h2>Запрошені користувачі</h2></div>
          <button onclick="ref413LoadTeam(true)">↻ Оновити</button>
        </div>

        <div id="ref413Team" class="ref413-team">
          <div class="ref413-team-loading"><div class="loader"></div><span>Завантажуємо команду…</span></div>
        </div>
      </div>
    </section>
  `;

  addCrispMotion();
  setupMotionForPage();
}

function referral413CurrentLink(){
  const node=document.querySelector(".ref413-linkbox b");
  return (node?.textContent||me.referral_link||"").trim();
}

function copyReferralLink(){
  const link=referral413CurrentLink();
  if(!link)return toast("Реферальне посилання недоступне","error");
  navigator.clipboard?.writeText(link)
    .then(()=>toast("Посилання скопійовано","success"))
    .catch(()=>prompt("Скопіюй посилання:",link));
}

function shareReferral(){
  const link=referral413CurrentLink();
  if(!link)return toast("Реферальне посилання недоступне","error");
  const url=encodeURIComponent(link);
  const text=encodeURIComponent("Приєднуйся до ReferHub!");
  if(tg?.openTelegramLink){
    tg.openTelegramLink(`https://t.me/share/url?url=${url}&text=${text}`);
  }else{
    navigator.clipboard?.writeText(link);
    toast("Посилання скопійовано","success");
  }
}

async function ref413LoadTeam(force=false){
  const host=document.getElementById("ref413Team");
  if(!host)return;
  if(host.dataset.loaded==="1"&&!force)return;

  host.innerHTML=`<div class="ref413-team-loading"><div class="loader"></div><span>Завантажуємо команду…</span></div>`;

  try{
    const data=await api("/api/referrals/v413");
    const users=Array.isArray(data.users)?data.users:[];
    host.dataset.loaded="1";
    host.innerHTML=users.length?`
      <section class="ref413-team-summary">
        <span>${Number(data.total||0)} у команді</span>
        <span>🟢 ${Number(data.online_now||0)} онлайн</span>
        <span>⚡ ${Number(data.active_7d||0)} активні</span>
      </section>
      <div class="ref413-team-list">
        ${users.map((u,index)=>`
          <article>
            <span class="ref413-avatar">${esc((u.first_name||u.username||"U").slice(0,1).toUpperCase())}</span>
            <div class="grow">
              <b>${esc(u.first_name||u.username||"Користувач")}</b>
              <small>${u.username?"@"+esc(u.username):"ID "+u.telegram_id} · ${u.is_online?"🟢 Онлайн":u.is_active_7d?"⚡ Активний":"⚪ Неактивний"}</small>
              <i>XP ${Number(u.xp||0)} · заробив ${Number(u.total_earned||0)} RH</i>
            </div>
            <strong>+${Number(u.reward_generated||0)} RH</strong>
          </article>`).join("")}
      </div>`:
      `<div class="social831-empty ref413-empty"><span>👥</span><h3>Команда ще порожня</h3><p>Надішли своє посилання першому другу.</p></div>`;
  }catch(error){
    host.innerHTML=`<div class="social831-empty ref413-empty"><span>!</span><h3>Не вдалося завантажити</h3><p>${esc(error.message)}</p></div>`;
  }
}


function gameName(key){
  return {
    roulette:"Рулетка RH",
    slot:"Слот",
    daily_case:"Щоденний кейс",
    coin_flip:"Орел чи решка",
    number_guess:"Вгадай число",
    scratch:"Скретч-картка",
    safe_crack:"Злам сейфа"
  }[key]||key;
}

function formatCooldown(seconds){
  if(seconds<=0)return "Готово";
  const h=Math.floor(seconds/3600);
  const m=Math.floor((seconds%3600)/60);
  const s=seconds%60;
  if(h)return `${h}г ${m}хв`;
  if(m)return `${m}хв ${s}с`;
  return `${s}с`;
}


function premiumRewardLabel(value){
  const number=Number(value||0);
  if(number>=1000)return `${number/1000}K`;
  return String(number);
}

function rouletteSegments(){
  const values=[1,2,3,4,5,5,6,7,8,9,10,15];
  const colors=["#6b45cf","#d3487b","#397fca","#d79a28","#36a873","#6543cc","#d24670","#3a80c7","#35a774","#d4487b","#6844ce","#d79b29"];
  const cx=250,cy=250,r=218,ir=84;
  const rad=d=>d*Math.PI/180;
  const p=(rr,d)=>[cx+rr*Math.sin(rad(d)),cy-rr*Math.cos(rad(d))];
  const slices=values.map((v,i)=>{
    const a0=i*30-15,a1=(i+1)*30-15;
    const [x0,y0]=p(r,a0),[x1,y1]=p(r,a1),[ix0,iy0]=p(ir,a0),[ix1,iy1]=p(ir,a1);
    const d=`M ${ix0} ${iy0} L ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} L ${ix1} ${iy1} A ${ir} ${ir} 0 0 0 ${ix0} ${iy0} Z`;
    const [tx,ty]=p(157,i*30);
    return `<path d="${d}" fill="${colors[i]}" class="rr99-sector"/><text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle" class="rr99-number">${v===15?"★":v}</text>`;
  }).join("");
  return `<svg class="rr99-svg" viewBox="0 0 500 500">
    <circle cx="250" cy="250" r="238" fill="#0b0e14" stroke="#c99730" stroke-width="8"/>
    <circle cx="250" cy="250" r="225" fill="#11151d" stroke="#4c3273" stroke-width="3"/>
    ${slices}
    <circle cx="250" cy="250" r="85" fill="#10131a" stroke="#d0a03b" stroke-width="6"/>
    <circle cx="250" cy="250" r="72" fill="#17131f" stroke="#6e3ca5" stroke-width="2"/>
    <text x="250" y="240" text-anchor="middle" class="rr99-hub-rh">RH</text>
    <text x="250" y="264" text-anchor="middle" class="rr99-hub-sub">DAILY</text>
    <text x="250" y="281" text-anchor="middle" class="rr99-hub-mini">ROULETTE</text>
  </svg>`;
}

function roulettePrizeRows(game){
  const rewards=(game?.config?.rewards||[0,1,2,5]).map(Number);
  const weights=(game?.config?.weights||[]).map(Number);
  return rewards.map((reward,index)=>{
    const chance=weights.length
      ? Math.round(weights[index]/weights.reduce((a,b)=>a+b,0)*100)
      : 0;
    return `
      <div class="rhc-prize-row">
        <i class="${reward>=5?"gold":reward>=2?"violet":"blue"}"></i>
        <span>${Number(reward)===15?"⭐ ДЖЕКПОТ · 15 зірок":`+${reward} зірок`}</span>
        <small>${chance?`${chance}%`:""}</small>
      </div>`;
  }).join("");
}

function casePrizeRows(game){
  const rewards=(game?.config?.rewards||[1,2,5]).map(Number);
  const weights=(game?.config?.weights||[]).map(Number);
  const total=weights.reduce((a,b)=>a+b,0)||1;
  return rewards.map((reward,index)=>{
    const chance=Math.round((weights[index]||0)/total*100);
    const rarity=reward>=5?"EPIC":reward>=2?"RARE":"COMMON";
    return `
      <article class="rhc-case-reward rarity-${rarity.toLowerCase()}">
        <div>${reward>=5?"👑":reward>=2?"💎":"⭐"}</div>
        <b>+${reward} RH</b>
        <span>${rarity}</span>
        <small>${chance}%</small>
      </article>`;
  }).join("");
}

function premiumRouletteSpin(reward,game,sectorIndex=null){
  const wheel=document.getElementById("rw97Wheel");
  if(!wheel)return Promise.resolve();
  const sectors=[1,2,3,4,5,5,6,7,8,9,10,15];
  let chosen=Number(sectorIndex);
  if(!Number.isInteger(chosen)||chosen<0||chosen>=sectors.length){
    chosen=Math.max(0,sectors.findIndex(v=>v===Number(reward)));
  }
  const current=Number(wheel.dataset.rotation||0);
  const norm=((current%360)+360)%360;
  const desired=(360-chosen*30)%360;
  const correction=(desired-norm+360)%360;
  const target=current+1800+correction;
  wheel.style.setProperty("--rr99-from",`${current}deg`);
  wheel.style.setProperty("--rr99-to",`${target}deg`);
  wheel.classList.remove("spinning");
  void wheel.offsetWidth;
  wheel.classList.add("spinning");
  wheel.dataset.rotation=String(target);
  return new Promise(resolve=>setTimeout(resolve,3100));
}

function premiumCaseOpen(reward,text){
  const stage=document.getElementById("rhcCaseStage");
  const result=document.getElementById("rhcCaseResult");
  const numericReward=Number(reward||0);
  if(!stage)return Promise.resolve();

  stage.classList.remove("charging","opening","opened","rare","epic","legendary");
  stage.classList.add(numericReward>=10?"legendary":numericReward>=5?"epic":numericReward>=2?"rare":"common");
  void stage.offsetWidth;
  stage.classList.add("charging");

  return new Promise(resolve=>{
    setTimeout(()=>stage.classList.add("opening"),520);
    setTimeout(()=>{
      stage.classList.add("opened");
      if(result){
        const rarity=numericReward>=10?"LEGENDARY":numericReward>=5?"EPIC":numericReward>=2?"RARE":"COMMON";
        const icon=numericReward>=10?"♛":numericReward>=5?"◆":numericReward>=2?"✦":"◇";
        result.innerHTML=`<span class="case81-result-icon">${icon}</span><small>${rarity} DROP</small><strong>+${numericReward} RH</strong><p>${esc(text||"Daily Case")}</p>`;
      }
      launchCaseCoins(numericReward);
    },1120);
    setTimeout(resolve,2850);
  });
}

function launchCaseCoins(reward){
  const stage=document.getElementById("rhcCaseStage");
  const wallet=document.getElementById("balance");
  if(!stage||!wallet)return;
  const source=stage.getBoundingClientRect();
  const target=wallet.getBoundingClientRect();
  const count=Math.min(14,Math.max(6,Number(reward||0)+4));
  for(let index=0;index<count;index++){
    const coin=document.createElement("i");
    coin.className="case81-flying-coin";
    coin.textContent="◆";
    coin.style.left=`${source.left+source.width/2+(Math.random()-.5)*90}px`;
    coin.style.top=`${source.top+source.height*.48+(Math.random()-.5)*35}px`;
    coin.style.setProperty("--coin-x",`${target.left+target.width/2-(source.left+source.width/2)}px`);
    coin.style.setProperty("--coin-y",`${target.top+target.height/2-(source.top+source.height*.48)}px`);
    coin.style.animationDelay=`${index*35}ms`;
    document.body.appendChild(coin);
    setTimeout(()=>coin.remove(),1400+index*35);
  }
}


function gc90GameIcon(key){
  return {roulette:"◉",daily_case:"▣",slot:"♜",coin_flip:"◆",number_guess:"?",scratch:"✦",safe_crack:"⌾"}[key]||"◇";
}

function gc90GameLabel(key){
  return {roulette:"Premium Roulette",daily_case:"Daily Case",slot:"Royal Slots",coin_flip:"Coin Flip",number_guess:"Number Hunt",scratch:"Scratch Lab",safe_crack:"Vault Breaker"}[key]||gameName(key);
}

function gc90ScrollToGame(key){
  const target=document.querySelector(`[data-premium-game="${key}"]`)||document.querySelector(`[data-game-key="${key}"]`);
  if(target)target.scrollIntoView({behavior:"smooth",block:"start"});
}

function gc90UniqueDays(history){
  return new Set(history.map(item=>new Date(Number(item.created_at||0)*1000).toISOString().slice(0,10))).size;
}

function gc90CurrentStreak(history){
  const days=[...new Set(history.map(item=>new Date(Number(item.created_at||0)*1000).toISOString().slice(0,10)))].sort().reverse();
  if(!days.length)return 0;
  let streak=0;
  const cursor=new Date();
  cursor.setHours(0,0,0,0);
  for(let i=0;i<31;i++){
    const key=cursor.toISOString().slice(0,10);
    if(days.includes(key))streak++;
    else if(i>0)break;
    cursor.setDate(cursor.getDate()-1);
  }
  return streak;
}

function gc90League(winRate,totalPlayed){
  if(totalPlayed>=300&&winRate>=70)return {name:"LEGEND",icon:"♛",next:"MAX LEAGUE"};
  if(totalPlayed>=180&&winRate>=62)return {name:"MASTER",icon:"★",next:"До Legend: 300 ігор / 70% WR"};
  if(totalPlayed>=100&&winRate>=55)return {name:"DIAMOND",icon:"◆",next:"До Master: 180 ігор / 62% WR"};
  if(totalPlayed>=50)return {name:"GOLD",icon:"◇",next:"До Diamond: 100 ігор / 55% WR"};
  if(totalPlayed>=20)return {name:"SILVER",icon:"✦",next:"До Gold: 50 ігор"};
  return {name:"BRONZE",icon:"◈",next:"До Silver: 20 ігор"};
}

function gc90RenderCalendar(history){
  const played=new Set(history.map(item=>new Date(Number(item.created_at||0)*1000).toISOString().slice(0,10)));
  return Array.from({length:14},(_,index)=>{
    const date=new Date(); date.setDate(date.getDate()-(13-index));
    const key=date.toISOString().slice(0,10);
    const active=played.has(key);
    const today=index===13;
    return `<div class="gc90-day ${active?"active":""} ${today?"today":""}"><span>${date.getDate()}</span><small>${active?"✓":today?"TODAY":""}</small></div>`;
  }).join("");
}

function gc90Achievements(totalPlayed,totalWon,biggestWin,streak,history){
  const list=[
    {icon:"◆",title:"Перша перемога",value:totalWon,goal:1},
    {icon:"★",title:"25 перемог",value:totalWon,goal:25},
    {icon:"♛",title:"100 ігор",value:totalPlayed,goal:100},
    {icon:"✦",title:"Серія 7 днів",value:streak,goal:7},
    {icon:"◇",title:"Виграш 10 RH",value:biggestWin,goal:10},
    {icon:"▣",title:"Майстер усіх режимів",value:new Set(history.map(item=>item.game_key)).size,goal:7}
  ];
  return list.map(item=>{
    const progress=Math.min(100,Math.round(Number(item.value||0)/item.goal*100));
    return `<article class="gc90-achievement ${progress>=100?"done":""}"><span>${item.icon}</span><div><h3>${item.title}</h3><div><i style="width:${progress}%"></i></div><small>${Math.min(item.value,item.goal)} / ${item.goal}</small></div><strong>${progress>=100?"✓":`${progress}%`}</strong></article>`;
  }).join("");
}

function initGC90Motion(){
  const shell=document.querySelector('.gc90-shell');
  if(!shell)return;
  shell.addEventListener('pointermove',event=>{
    const r=shell.getBoundingClientRect();
    shell.style.setProperty('--gc90-x',`${((event.clientX-r.left)/r.width-.5)*12}px`);
    shell.style.setProperty('--gc90-y',`${((event.clientY-r.top)/r.height-.5)*8}px`);
  },{passive:true});
  shell.addEventListener('pointerleave',()=>{shell.style.setProperty('--gc90-x','0px');shell.style.setProperty('--gc90-y','0px')});
}

const gc13Catalog = [
  {id:"roulette", icon:"🎡", name:"Premium Roulette", type:"КАЗИНО", tag:"HOT", desc:"Крути колесо й забирай випадкову нагороду.", reward:"до 15 ★", cls:"purple"},
  {id:"daily_case", icon:"🎁", name:"Daily Case", type:"ЩОДЕННА", tag:"DROP", desc:"Щоденний кейс із серверною нагородою.", reward:"daily drop", cls:"green"},
  {id:"slot", icon:"🎰", name:"Neon Slots", type:"КАЗИНО", tag:"HOT", desc:"Слоти зі ставками та виграшними комбінаціями.", reward:"combo RH", cls:"red"},
  {id:"coin_flip", icon:"🪙", name:"Coin Flip", type:"ШВИДКА", tag:"50 / 50", desc:"Орел або решка — один вибір.", reward:"x2 шанс", cls:"gold"},
  {id:"number_guess", icon:"🔢", name:"Вгадай число", type:"ЛОГІКА", tag:"GUESS", desc:"Обери число від 1 до 5.", reward:"за точність", cls:"blue"},
  {id:"scratch", icon:"🎫", name:"Scratch", type:"ЩОДЕННА", tag:"REVEAL", desc:"Стирай картку та відкривай нагороду.", reward:"рандом RH", cls:"pink"},
  {id:"safe_crack", icon:"🔐", name:"Злам сейфа", type:"ЛОГІКА", tag:"VAULT", desc:"Знайди правильну комірку сейфа.", reward:"12 RH", cls:"steel"},
  {id:"dice_duel", icon:"🎲", name:"Dice Duel", type:"ШВИДКА", tag:"DICE", desc:"Вибери низький або високий кидок.", reward:"4 RH", cls:"blue"},
  {id:"rps", icon:"✊", name:"RPS Arena", type:"ДУЕЛЬ", tag:"ARENA", desc:"Камінь, ножиці або папір проти бота.", reward:"до 5 RH", cls:"steel"},
  {id:"treasure_grid", icon:"🧭", name:"Treasure Grid", type:"РИЗИК", tag:"TREASURE", desc:"Обери одну з 9 клітинок і знайди скарб.", reward:"15 RH", cls:"green"},
  {id:"reaction", icon:"⚡", name:"Reaction", type:"СКІЛ", tag:"SPEED", desc:"Дочекайся сигналу та натисни якнайшвидше.", reward:"до 10 RH", cls:"blue"},
  {id:"color_pick", icon:"🎨", name:"Color Pick", type:"ШВИДКА", tag:"NEW", desc:"Вгадай один із трьох кольорів.", reward:"6 RH", cls:"pink"},
  {id:"high_low", icon:"↕️", name:"High / Low", type:"ШВИДКА", tag:"NEW", desc:"Вгадай, число буде 1–5 чи 6–10.", reward:"5 RH", cls:"gold"},
  {id:"lucky_card", icon:"🃏", name:"Lucky Card", type:"КАРТИ", tag:"NEW", desc:"Вгадай колір випадкової масті.", reward:"7 RH", cls:"red"},
  {id:"triple_pick", icon:"🔺", name:"Triple Pick", type:"РИЗИК", tag:"NEW", desc:"Обери ліво, центр або право.", reward:"8 RH", cls:"purple"},
];

function gc13Meta(id){
  return gc13Catalog.find(x=>x.id===id)||gc13Catalog[0];
}


let gc433Filter="all";

const gc433Catalog=[
  {id:"roulette",name:"Рулетка",type:"casino",label:"Казино",tag:"HOT",desc:"Крути колесо та забирай нагороду.",reward:"до 15 ★"},
  {id:"daily_case",name:"Daily Case",type:"daily",label:"Щоденні",tag:"HOT",desc:"Щоденний серверний кейс.",reward:"daily drop"},
  {id:"slot",name:"Слоти",type:"casino",label:"Казино",tag:"HOT",desc:"Ставки та виграшні комбінації.",reward:"combo RH"},
  {id:"coin_flip",name:"Coin Flip",type:"quick",label:"Швидкі",tag:"",desc:"Орел або решка.",reward:"50 / 50"},
  {id:"number_guess",name:"Вгадай число",type:"logic",label:"Логіка",tag:"",desc:"Вгадай число від 1 до 5.",reward:"за точність"},
  {id:"scratch",name:"Scratch",type:"daily",label:"Щоденні",tag:"",desc:"Стирай картку.",reward:"рандом RH"},
  {id:"safe_crack",name:"Злам сейфа",type:"logic",label:"Логіка",tag:"",desc:"Знайди правильний код.",reward:"12 RH"},
  {id:"dice_duel",name:"Dice Duel",type:"quick",label:"Швидкі",tag:"",desc:"Low або High на кубику.",reward:"4 RH"},
  {id:"rps",name:"RPS Arena",type:"quick",label:"Дуель",tag:"",desc:"Камінь, ножиці, папір.",reward:"до 5 RH"},
  {id:"treasure_grid",name:"Treasure Grid",type:"risk",label:"Ризик",tag:"",desc:"Знайди скарб на полі 3×3.",reward:"15 RH"},
  {id:"reaction",name:"Reaction",type:"skill",label:"Скіл",tag:"",desc:"Перевір швидкість реакції.",reward:"до 10 RH"},
  {id:"color_pick",name:"Color Pick",type:"quick",label:"Швидкі",tag:"NEW",desc:"Вгадай колір.",reward:"6 RH"},
  {id:"high_low",name:"High / Low",type:"quick",label:"Швидкі",tag:"NEW",desc:"Низьке чи високе число?",reward:"5 RH"},
  {id:"lucky_card",name:"Lucky Card",type:"casino",label:"Карти",tag:"NEW",desc:"Червона чи чорна масть?",reward:"7 RH"},
  {id:"triple_pick",name:"Triple Pick",type:"risk",label:"Ризик",tag:"NEW",desc:"Ліво, центр чи право?",reward:"8 RH"}
];

function gc433VisibleGames(){
  if(gc433Filter==="all")return gc433Catalog;
  if(gc433Filter==="popular")return gc433Catalog.filter(x=>x.tag==="HOT");
  return gc433Catalog.filter(x=>x.type===gc433Filter);
}

window.gc433SetFilter=function(value){
  gc433Filter=value||"all";
  gamesPage();
};

async function gamesPage(){
  let status={};
  try{status=await api("/api/game-status")}catch(_){}

  const filters=[
    ["all","Усі"],
    ["popular","Популярні"],
    ["casino","Казино"],
    ["daily","Щоденні"],
    ["quick","Швидкі"],
    ["logic","Логіка"],
    ["skill","Скіл"],
    ["risk","Ризик"]
  ];

  const visible=gc433VisibleGames();

  content.innerHTML=`
    <section class="gc433-shell">
      <header class="gc433-head">
        <div>
          <span>GAME CENTER · 4.3.3</span>
          <h1>Ігри</h1>
          <p>Тільки реальні режими, які вже працюють у ReferHub.</p>
        </div>
        <article><small>БАЛАНС</small><b>${Number(me.balance||0)} RH</b></article>
      </header>

      <nav class="gc433-tabs">
        ${filters.map(([key,label])=>`
          <button class="${gc433Filter===key?"active":""}" onclick="gc433SetFilter('${key}')">${label}</button>
        `).join("")}
      </nav>

      <section class="gc433-grid">
        ${visible.map(g=>`
          <button class="gc433-card" onclick="openGameDetail('${g.id}')">
            <div class="gc433-art">
              <img src="/static/assets/games-v44/${g.id}.svg" alt="${esc(g.name)}">
              ${g.tag?`<span class="${g.tag.toLowerCase()}">${g.tag}</span>`:""}
            </div>
            <div class="gc433-copy">
              <small>${g.label}</small>
              <h3>${g.name}</h3>
              <p>${g.desc}</p>
              <footer><b>${g.reward}</b><i>${g.label||"GAME"}</i></footer>
            </div>
          </button>
        `).join("")}
      </section>
    </section>
  `;

  document.querySelector("main")?.scrollTo({top:0,behavior:"auto"});
}


async function openGameDetail(gameId){
  const g=gc13Meta(gameId);

  content.innerHTML=`<div class="loader"></div>`;

  let games=[],history=[];
  try{
    [games,history]=await Promise.all([
      api("/api/games"),
      api("/api/games/history")
    ]);
  }catch(error){
    content.innerHTML=`<div class="gc3-error"><div>⚠️</div><h2>Не вдалося завантажити гру</h2><p>${esc(error.message)}</p><button onclick="gamesPage()">Назад</button></div>`;
    return;
  }

  const map=Object.fromEntries(games.map(item=>[item.game_key,item]));
  const game=map[gameId]||{};
  const gameHistory=history.filter(item=>item.game_key===gameId);
  const left=game?.daily_limit ? Math.max(0,Number(game.daily_limit)-Number(game.plays_today||0)) : "∞";
  const record=Math.max(0,...gameHistory.map(item=>Number(item.reward||0)));
  const status=game?.cooldown_remaining
    ? formatCooldown(game.cooldown_remaining)
    : (game?.daily_limit&&Number(game.plays_today||0)>=Number(game.daily_limit) ? "Ліміт" : "Готово");

  content.innerHTML=`
    <section class="gc14-page ${g.cls}" data-game-id="${gameId}">
      <div class="gc14-topbar">
        <button onclick="gamesPage()">← Каталог ігор</button>
        <div><span id="gc418Balance">${Number(me.balance||0)} RH</span><small id="gc418TopStatus">${status}</small></div>
      </div>

      <section class="gc14-hero">
        <div class="gc14-cover"><i>${g.icon}</i><em></em></div>
        <div class="gc14-copy">
          <span>${g.type} · ${g.tag}</span>
          <h1>${g.name}</h1>
          <p>${g.desc}</p>
          <div class="gc14-stats">
            <div><small>Спроб</small><b>${left}</b></div>
            <div><small>Рекорд</small><b>${record} RH</b></div>
            <div><small>Зіграно</small><b>${gameHistory.length}</b></div>
          </div>
        </div>
      </section>

      <section class="gc14-guide">
        <article><i>①</i><div><span>ЯК ГРАТИ</span><p>${gc13HowTo(gameId)}</p></div></article>
        <article><i>②</i><div><span>НАГОРОДИ</span><p>${gc13Reward(gameId)}</p></div></article>
        <article><i>③</i><div><span>ПОРАДА</span><p>${gc14Tip(gameId)}</p></div></article>
      </section>

      <section class="gc14-game-shell">
        <div class="gc14-game-head">
          <div><span>LIVE GAME</span><h2>${g.name}</h2></div>
          <b id="gc418HeadStatus">${status}</b>
        </div>
        ${gc14GameMarkup(gameId,game,gameHistory)}
      </section>

      <section class="gc14-history">
        <div class="gc14-section-head"><span>ОСТАННІ РЕЗУЛЬТАТИ</span><small>${gameHistory.length} ігор</small></div>
        <div class="gc14-history-list">
          ${gameHistory.length ? gameHistory.slice(0,6).map(item=>`
            <div>
              <i>${g.icon}</i>
              <span><b>${esc(item.result_text)}</b><small>${new Date(item.created_at*1000).toLocaleString("uk-UA")}</small></span>
              <strong class="${Number(item.reward||0)>0?"win":""}">${Number(item.reward||0)>0?`+${item.reward} RH`:"0 RH"}</strong>
            </div>`).join("") : `<p>Ще немає зіграних партій.</p>`}
        </div>
      </section>

      <section class="gc14-more">
        <div class="gc14-section-head"><span>ЩЕ ІГРИ</span><small>Зміни режим</small></div>
        <div>
          ${gc13Catalog.filter(x=>x.id!==gameId).slice(0,5).map(x=>`
            <button onclick="openGameDetail('${x.id}')"><i>${x.icon}</i><span>${x.name}</span></button>
          `).join("")}
        </div>
      </section>
    </section>
  `;

  if(gameId==="scratch" && !game?.cooldown_remaining){
    const surface=document.getElementById("scratchSurface");
    if(surface) startScratchInteraction(surface);
  }

  addCrispMotion?.();
  setupMotionForPage?.();
}

function gc14Tip(id){
  return ({
    roulette:"Кожен сектор має свій результат. Після старту просто дочекайся повної зупинки колеса.",
    daily_case:"Daily Case доступний раз на добу — не пропускай щоденне відкриття.",
    slot:"Не піднімай ставку вище балансу, який готовий витратити за кілька обертів.",
    coin_flip:"Це швидкий режим: обери сторону, ставку та одразу отримай результат.",
    number_guess:"У тебе одна з п’яти відповідей — обирай число й перевір інтуїцію.",
    scratch:"Проведи пальцем по картці. Результат визначає сервер на першому стиранні.",
    safe_crack:"Обери одну з шести комірок. Правильний код прихований до вибору.",
    dice_duel:"Low — 1–3, High — 4–6. Один вибір на раунд.",
    rps:"Камінь б'є ножиці, ножиці — папір, папір — камінь.",
    treasure_grid:"На полі тільки одна виграшна клітинка — обирай інтуїтивно.",
    reaction:"Не тисни раніше сигналу. Чим швидше реакція — тим більша нагорода.",
    color_pick:"Три кольори мають однаковий шанс. Обери один.",
    high_low:"Low — 1–5, High — 6–10.",
    lucky_card:"Червоні масті ♥ ♦, чорні ♣ ♠.",
    triple_pick:"Три позиції, одна виграшна."
  })[id]||"Грай уважно та слідкуй за денним лімітом.";
}

function gc14GameMarkup(id,game,history){
  if(id==="roulette"){
    const rouletteHistory=history;
    return `
      <div class="gc14-roulette">
        <div class="rr99-wheel-wrap">
          <div class="rr99-pointer"><span></span></div>
          <div id="rw97Wheel" class="rr99-wheel">${rouletteSegments()}</div>
        </div>
        <div id="premium71Result" class="rr99-result"><span>ВИГРАШ</span><strong>+0 ⭐</strong><small>Зірки зарахуються автоматично</small></div>
        <button id="rhcRouletteButton" class="gc14-main-button" onclick="playRoulette()" ${game?.cooldown_remaining?'disabled':''}>
          ${game?.cooldown_remaining?formatCooldown(game.cooldown_remaining):"🎡 КРУТИТИ РУЛЕТКУ"}
        </button>
      </div>`;
  }

  if(id==="daily_case"){
    return `
      <div class="gc14-case">
        <div id="rhcCaseStage" class="gc14-case-box">
          <div class="gc14-case-icon">🎁</div>
          <span>DAILY CASE</span>
          <strong>${game?.cooldown_remaining?"Наступний кейс пізніше":"Нагорода вже всередині"}</strong>
          <div id="rhcCaseResult" class="case81-result">
            <span class="case81-result-icon">◆</span><small>DAILY REWARD</small><strong>ВІДКРИЙ КЕЙС</strong><p>Сервер визначить нагороду</p>
          </div>
        </div>
        <button id="rhcCaseButton" class="gc14-main-button" onclick="openDailyCase()" ${game?.cooldown_remaining?'disabled':''}>
          ${game?.cooldown_remaining?formatCooldown(game.cooldown_remaining):"🎁 ВІДКРИТИ КЕЙС"}
        </button>
      </div>`;
  }

  if(id==="slot"){
    return `
      <div class="gc14-slot">
        <div class="gc14-slot-machine">
          <div id="slotResult" class="gc3-slot-preview">❔ ❔ ❔</div>
          <small>NEON SLOT</small>
        </div>
        <div class="gc14-control-row">
          <label><span>Ставка RH</span><input id="slotBet" type="number" value="${game?.min_bet||5}" min="${game?.min_bet||5}" max="${game?.max_bet||100}"></label>
          <button class="gc14-main-button" onclick="playSlot()" ${game?.cooldown_remaining?'disabled':''}>
            ${game?.cooldown_remaining?formatCooldown(game.cooldown_remaining):"🎰 ЗАПУСТИТИ"}
          </button>
        </div>
      </div>`;
  }

  if(id==="coin_flip"){
    return `
      <div class="gc14-coin">
        <div class="gc14-coin-art">🪙</div>
        <label class="gc14-input"><span>Ставка RH</span><input id="coinBet" type="number" value="${game?.min_bet||5}" min="${game?.min_bet||5}" max="${game?.max_bet||50}"></label>
        <div class="gc3-double gc14-choice">
          <button onclick="playCoinFlip('heads')">ОРЕЛ</button>
          <button onclick="playCoinFlip('tails')">РЕШКА</button>
        </div>
      </div>`;
  }

  if(id==="number_guess"){
    return `
      <div class="gc14-guess">
        <div class="gc14-question">?</div>
        <p>Яке число загадала система?</p>
        <div class="gc3-number-row gc14-numbers">
          ${[1,2,3,4,5].map(n=>`<button onclick="playNumberGuess(${n})">${n}</button>`).join("")}
        </div>
      </div>`;
  }

  if(id==="scratch"){
    return `
      <div class="gc14-scratch">
        <div id="scratchSurface" class="gc3-scratch-surface gc14-scratch-surface ${game?.cooldown_remaining?"disabled":""}">
          ${game?.cooldown_remaining?`ДОСТУПНО ЧЕРЕЗ ${formatCooldown(game.cooldown_remaining)}`:"СТИРАЙ ПАЛЬЦЕМ"}
        </div>
        <p>${game?.cooldown_remaining?"Сьогоднішню картку вже використано.":"Стирай покриття прямо тут — результат визначиться сервером."}</p>
      </div>`;
  }

  if(id==="safe_crack"){
    return `
      <div class="gc14-safe">
        <div class="gc14-safe-door"><span>🔐</span><b>RH VAULT</b></div>
        <p>Обери одну комірку:</p>
        <div class="gc3-safe-grid gc14-safe-grid">
          ${[1,2,3,4,5,6].map(n=>`<button onclick="playSafeCrack(${n})">${n}</button>`).join("")}
        </div>
      </div>`;
  }


  if(id==="dice_duel"){
    return `<div class="gc14-choicegame"><div class="gc44-symbol">🎲</div><p>Що випаде?</p>
      <div class="gc3-double gc44-picks"><button onclick="playDiceDuel('low')">LOW · 1–3</button><button onclick="playDiceDuel('high')">HIGH · 4–6</button></div></div>`;
  }

  if(id==="rps"){
    return `<div class="gc14-choicegame"><div class="gc44-symbol">⚔️</div><p>Обери свій хід:</p>
      <div class="gc44-triple"><button onclick="playRps('rock')">✊<span>Камінь</span></button><button onclick="playRps('paper')">✋<span>Папір</span></button><button onclick="playRps('scissors')">✌️<span>Ножиці</span></button></div></div>`;
  }

  if(id==="treasure_grid"){
    return `<div class="gc14-choicegame"><div class="gc44-symbol">🧭</div><p>Знайди скарб:</p>
      <div class="gc44-treasure">${Array.from({length:9},(_,i)=>`<button onclick="playTreasureGrid(${i+1})">?</button>`).join("")}</div></div>`;
  }

  if(id==="reaction"){
    return `<div class="gc14-choicegame"><div id="reaction44Lamp" class="gc44-reaction-lamp">⚡</div>
      <p id="reaction44Text">Натисни START і дочекайся зеленого сигналу.</p>
      <button id="reaction44Button" class="gc14-main-button" onclick="startReaction44()">START</button></div>`;
  }

  if(id==="color_pick"){
    return `<div class="gc14-choicegame"><div class="gc44-symbol">🎨</div><p>Який колір випаде?</p>
      <div class="gc44-colors"><button class="red" onclick="playColorPick('red')">RED</button><button class="blue" onclick="playColorPick('blue')">BLUE</button><button class="green" onclick="playColorPick('green')">GREEN</button></div></div>`;
  }

  if(id==="high_low"){
    return `<div class="gc14-choicegame"><div class="gc44-symbol">↕️</div><p>Число від 1 до 10:</p>
      <div class="gc3-double gc44-picks"><button onclick="playHighLow('low')">LOW · 1–5</button><button onclick="playHighLow('high')">HIGH · 6–10</button></div></div>`;
  }

  if(id==="lucky_card"){
    return `<div class="gc14-choicegame"><div class="gc44-cardart">🃏</div><p>Якого кольору буде масть?</p>
      <div class="gc3-double gc44-picks"><button class="gc44-red" onclick="playLuckyCard('red')">♥ ♦ RED</button><button onclick="playLuckyCard('black')">♣ ♠ BLACK</button></div></div>`;
  }

  if(id==="triple_pick"){
    return `<div class="gc14-choicegame"><div class="gc44-symbol">🔺</div><p>Де схована нагорода?</p>
      <div class="gc44-triple"><button onclick="playTriplePick('left')">←<span>Ліво</span></button><button onclick="playTriplePick('center')">◆<span>Центр</span></button><button onclick="playTriplePick('right')">→<span>Право</span></button></div></div>`;
  }

  return `<div class="empty">Гру не знайдено.</div>`;
}


async function gc44SimplePlay(endpoint,body,gameId){
  try{
    const result=await api(endpoint,{method:"POST",body:JSON.stringify(body||{})});
    if(result.balance!==undefined){
      me.balance=Number(result.balance);
      const bal=document.getElementById("balance"); if(bal)bal.textContent=me.balance;
    }
    const reward=Number(result.reward||0);
    toast(reward>0?`+${reward} RH 🎉`:(result.result_text||"Цього разу без нагороди"),reward>0?"success":"info");
    gc418AfterPlay?.(gameId,result.result_text||"",Number(result.reward||0));
    return result;
  }catch(error){toast(error.message,"error")}
}
function playDiceDuel(choice){return gc44SimplePlay("/api/games/dice-duel",{choice},"dice_duel")}
function playRps(choice){return gc44SimplePlay("/api/games/rps",{choice},"rps")}
function playTreasureGrid(cell){return gc44SimplePlay("/api/games/treasure-grid",{cell},"treasure_grid")}
function playColorPick(choice){return gc44SimplePlay("/api/games/color-pick",{choice},"color_pick")}
function playHighLow(choice){return gc44SimplePlay("/api/games/high-low",{choice},"high_low")}
function playLuckyCard(choice){return gc44SimplePlay("/api/games/lucky-card",{choice},"lucky_card")}
function playTriplePick(choice){return gc44SimplePlay("/api/games/triple-pick",{choice},"triple_pick")}

let reaction44Token=null,reaction44Ready=false,reaction44StartedAt=0;
async function startReaction44(){
  const btn=document.getElementById("reaction44Button");
  const lamp=document.getElementById("reaction44Lamp");
  const text=document.getElementById("reaction44Text");
  if(reaction44Ready){
    const reaction_ms=Math.max(0,Math.round(performance.now()-reaction44StartedAt));
    try{
      const result=await api("/api/games/reaction/finish",{method:"POST",body:JSON.stringify({token:reaction44Token,reaction_ms})});
      me.balance=Number(result.balance??me.balance);
      toast(`⚡ ${reaction_ms} ms · +${Number(result.reward||0)} RH`,Number(result.reward||0)>0?"success":"info");
      reaction44Token=null; reaction44Ready=false;
      gc418AfterPlay?.("reaction",`Reaction: ${reaction_ms} ms`,Number(result.reward||0));
    }catch(error){toast(error.message,"error")}
    return;
  }
  try{
    const r=await api("/api/games/reaction/start",{method:"POST",body:JSON.stringify({})});
    reaction44Token=r.token; reaction44Ready=false;
    if(btn){btn.disabled=true;btn.textContent="ЧЕКАЙ…"}
    if(lamp)lamp.classList.remove("ready");
    if(text)text.textContent="Не натискай завчасно…";
    setTimeout(()=>{
      reaction44Ready=true;reaction44StartedAt=performance.now();
      if(btn){btn.disabled=false;btn.textContent="⚡ ТИСНИ!"}
      if(lamp)lamp.classList.add("ready");
      if(text)text.textContent="ЗАРАЗ!";
    },Number(r.delay_ms||1500));
  }catch(error){toast(error.message,"error")}
}


async function gamesLegacyPage(){
  content.innerHTML=`<div class="loader"></div>`;

  let games=[];
  let history=[];

  try{
    [games,history]=await Promise.all([
      api("/api/games"),
      api("/api/games/history")
    ]);
  }catch(error){
    content.innerHTML=`
      <div class="gc3-error">
        <div>⚠️</div>
        <h2>Не вдалося завантажити Game Center</h2>
        <p>${esc(error.message)}</p>
        <button onclick="gamesPage()">Повторити</button>
      </div>`;
    return;
  }

  const map=Object.fromEntries(games.map(game=>[game.game_key,game]));
  const roulette=map.roulette;
  const slot=map.slot;
  const dailyCase=map.daily_case;
  const coin=map.coin_flip;
  const guess=map.number_guess;
  const scratch=map.scratch;
  const safe=map.safe_crack;

  const totalPlayed=history.length;
  const totalWon=history.filter(item=>Number(item.reward||0)>0).length;
  const winRate=totalPlayed?Math.round(totalWon*100/totalPlayed):0;
  const biggestWin=Math.max(0,...history.map(item=>Number(item.reward||0)));
  const currentStreak=gc90CurrentStreak(history);
  const activeDays=gc90UniqueDays(history);
  const totalEarnedInGames=history.reduce((sum,item)=>sum+Number(item.reward||0),0);
  const league=gc90League(winRate,totalPlayed);
  const bestGame=Object.entries(history.reduce((acc,item)=>{acc[item.game_key]=(acc[item.game_key]||0)+1;return acc;},{})).sort((a,b)=>b[1]-a[1])[0]?.[0]||"roulette";


  const rouletteHistory=history.filter(item=>item.game_key==="roulette");
  const slotHistory=history.filter(item=>item.game_key==="slot");
  const caseHistory=history.filter(item=>item.game_key==="daily_case");
  const coinHistory=history.filter(item=>item.game_key==="coin_flip");
  const guessHistory=history.filter(item=>item.game_key==="number_guess");
  const scratchHistory=history.filter(item=>item.game_key==="scratch");
  const safeHistory=history.filter(item=>item.game_key==="safe_crack");

  const leftToday=game=>{
    if(!game)return "—";
    if(!game.daily_limit)return "∞";
    return Math.max(0,game.daily_limit-game.plays_today);
  };

  const statusText=game=>{
    if(!game)return "Недоступно";
    if(game.cooldown_remaining)return formatCooldown(game.cooldown_remaining);
    if(game.daily_limit&&game.plays_today>=game.daily_limit)return "Ліміт";
    return "Готово";
  };

  content.innerHTML=`
    <section class="gc90-shell">
      <div class="gc90-live-bg" aria-hidden="true"><i></i><i></i><i></i><b></b></div>

      <header class="gc90-hero">
        <div class="gc90-hero-copy">
          <span>REFERHUB GAME NETWORK · SEASON 01</span>
          <h1>Game Center Ultimate</h1>
          <p>Сім ігрових режимів, щоденні нагороди, ліги, рекорди та події в одному центрі.</p>
          <div class="gc90-hero-actions">
            <button onclick="gc90ScrollToGame('roulette')">Грати в рулетку</button>
            <button class="secondary" onclick="gc90ScrollToGame('daily_case')">Відкрити кейс</button>
          </div>
        </div>
        <div class="gc90-league-card">
          <small>ПОТОЧНА ЛІГА</small>
          <div><span>${league.icon}</span><strong>${league.name}</strong></div>
          <p>${league.next}</p>
          <i style="--league-progress:${Math.min(100,totalPlayed)}%"></i>
        </div>
      </header>

      <section class="gc90-dashboard">
        <article><span>ЗІГРАНО</span><strong>${totalPlayed}</strong><small>усіх ігор</small></article>
        <article><span>ПЕРЕМОГИ</span><strong>${totalWon}</strong><small>${winRate}% win rate</small></article>
        <article class="streak"><span>WIN STREAK</span><strong>${currentStreak} 🔥</strong><small>днів активності</small></article>
        <article><span>ЗАРОБЛЕНО</span><strong>${totalEarnedInGames}</strong><small>RH у 50 іграх</small></article>
        <article><span>РЕКОРД</span><strong>${biggestWin}</strong><small>найбільший виграш</small></article>
      </section>

      <section class="gc90-featured">
        <div class="gc90-title"><div><span>FEATURED MODES</span><h2>Головні режими</h2></div><small>Натисни, щоб перейти до гри</small></div>
        <div class="gc90-featured-grid gc12-featured-grid">
          <button class="roulette gc12-cover" onclick="gc90ScrollToGame('roulette')">
            <i class="gc12-art"><b>🎡</b><em></em></i>
            <div><span>DAILY SPIN</span><h3>Premium Roulette</h3><p>${statusText(roulette)} · ${leftToday(roulette)} спінів</p></div>
            <strong>Грати →</strong>
          </button>
          <button class="case gc12-cover" onclick="gc90ScrollToGame('daily_case')">
            <i class="gc12-art"><b>🎁</b><em></em></i>
            <div><span>DAILY DROP</span><h3>Daily Case</h3><p>${statusText(dailyCase)} · шанс Epic Drop</p></div>
            <strong>Відкрити →</strong>
          </button>
          <button class="best gc12-cover" onclick="gc90ScrollToGame('${bestGame}')">
            <i class="gc12-art"><b>${gc90GameIcon(bestGame)}</b><em></em></i>
            <div><span>YOUR FAVORITE</span><h3>${gc90GameLabel(bestGame)}</h3><p>Найчастіше обраний режим</p></div>
            <strong>Продовжити →</strong>
          </button>
        </div>
      </section>

      <section class="gc90-event">
        <div class="gc90-event-badge">LIVE EVENT</div>
        <div><span>ARCADE RUSH</span><h2>Зіграй у 3 різні режими</h2><p>Відкрий усі зали Game Center і підніми прогрес ігрової ліги.</p></div>
        <div class="gc90-event-progress"><strong>${Math.min(3,new Set(history.map(item=>item.game_key)).size)} / 3</strong><i><b style="width:${Math.min(100,new Set(history.map(item=>item.game_key)).size/3*100)}%"></b></i></div>
      </section>

      <section class="gc90-calendar-block">
        <div class="gc90-title"><div><span>ACTIVITY CALENDAR</span><h2>Щоденна активність</h2></div><small>${activeDays} активних днів у історії</small></div>
        <div class="gc90-calendar">${gc90RenderCalendar(history)}</div>
      </section>

      <section class="gc90-achievements-block">
        <div class="gc90-title"><div><span>GAME ACHIEVEMENTS</span><h2>Ігрові досягнення</h2></div><small>Прогрес оновлюється автоматично</small></div>
        <div class="gc90-achievement-grid">${gc90Achievements(totalPlayed,totalWon,biggestWin,currentStreak,history)}</div>
      </section>
    </section>

    <section class="gc12-game-shelf">
      <div class="gc90-title">
        <div><span>ARCADE COLLECTION</span><h2>Обери свою гру</h2></div>
        <small>Кожен режим має свій стиль і нагороди RH</small>
      </div>
      <div class="gc12-shelf-grid">
        <button onclick="gc90ScrollToGame('roulette')" class="spin"><i>🎡</i><b>Рулетка</b><span>Daily Spin</span></button>
        <button onclick="gc90ScrollToGame('daily_case')" class="case"><i>🎁</i><b>Daily Case</b><span>Lucky Drop</span></button>
        <button onclick="gc90ScrollToGame('slot')" class="slot"><i>🎰</i><b>Slots</b><span>Risk Mode</span></button>
        <button onclick="gc90ScrollToGame('coin_flip')" class="coin"><i>🪙</i><b>Coin Flip</b><span>50 / 50</span></button>
        <button onclick="gc90ScrollToGame('number_guess')" class="guess"><i>🔢</i><b>Вгадай число</b><span>Logic</span></button>
        <button onclick="gc90ScrollToGame('scratch')" class="scratch"><i>✨</i><b>Scratch</b><span>Reveal</span></button>
        <button onclick="gc90ScrollToGame('safe_crack')" class="safe"><i>🔐</i><b>Злам сейфа</b><span>Vault</span></button>
      </div>
    </section>

    <section class="gc3-hero gc90-legacy-hero">
      <div class="gc3-grid"></div>
      <div class="gc3-orbit orbit-a"></div>
      <div class="gc3-orbit orbit-b"></div>

      <div class="gc3-hero-copy">
        <span>REFERHUB ARCADE</span>
        <h1>Game Center</h1>
        <p>Сім режимів, унікальні стилі та чесна економіка без нескінченного фарму.</p>
        <div class="gc3-hero-stats">
          <div><strong>${totalPlayed}</strong><span>ігор</span></div>
          <div><strong>${winRate}%</strong><span>win rate</span></div>
          <div><strong>${biggestWin}</strong><span>макс. виграш</span></div>
        </div>
      </div>

      <div class="gc3-controller">
        <span>🎮</span>
        <i></i>
      </div>
    </section>

    <section class="gc3-tabs">
      <button class="active" onclick="filterGameCards('all',this)">Усі</button>
      <button onclick="filterGameCards('free',this)">Безкоштовні</button>
      <button onclick="filterGameCards('risk',this)">Зі ставкою</button>
      <button onclick="filterGameCards('daily',this)">Щоденні</button>
    </section>

    <section class="rr99" data-premium-game="roulette">
      <header class="rr99-head">
        <div><span>DAILY SPIN</span><h2>Рулетка</h2><p>Число на секторі = кількість зірок.</p></div>
        <div class="rr99-stars"><small>ТВОЇ ЗІРКИ</small><strong>${Number(me.stars||0)} ★</strong></div>
      </header>

      <div class="rr99-layout">
        <aside class="rr99-prizes">
          <h3>Нагороди</h3>
          ${[1,2,3,4,5,6,7,8,9,10].map(v=>`<div><span>${v}</span><b>★ ${v}</b></div>`).join("")}
          <div class="jackpot"><span>★</span><b>15 зірок</b></div>
        </aside>

        <main class="rr99-game">
          <div class="rr99-state"><span><i></i> DAILY SPIN</span><b>${roulette?.cooldown_remaining?"НЕ ГОТОВО":"ГОТОВО"}</b></div>
          <div class="rr99-wheel-wrap">
            <div class="rr99-pointer"><span></span></div>
            <div id="rw97Wheel" class="rr99-wheel">${rouletteSegments()}</div>
          </div>
          <button id="rhcRouletteButton" class="rr99-spin" onclick="playRoulette()" ${roulette?.cooldown_remaining?'disabled':''}>
            <span>★ 1</span><b>${roulette?.cooldown_remaining?"ЗАЧЕКАЙ":"КРУТИТИ"}</b><i>›</i>
          </button>
          <div id="premium71Result" class="rr99-result"><span>ВИГРАШ</span><strong>+0 ⭐</strong><small>Зірки зарахуються автоматично</small></div>
        </main>

        <aside class="rr99-stats">
          <h3>Статистика</h3>
          <div><span>Всього спінів</span><b>${rouletteHistory.length}</b></div>
          <div><span>Виграно зірок</span><b>${rouletteHistory.reduce((s,x)=>s+Number(x.reward||0),0)}</b></div>
          <div><span>Джекпотів</span><b>${rouletteHistory.filter(x=>Number(x.reward||0)===15).length}</b></div>
          <div><span>Сьогодні</span><b>${rouletteHistory.length?1:0}/1</b></div>
        </aside>
      </div>
    </section>

    <section class="case81-shell" data-premium-game="case">
      <header class="case81-header">
        <div>
          <span>DAILY VAULT · 24H</span>
          <h2>Daily Case</h2>
          <p>Відкривай один раз на добу. Нагорода визначається сервером і одразу зараховується на баланс.</p>
        </div>
        <div class="case81-status ${dailyCase?.cooldown_remaining?'cooldown':'ready'}">
          <small>СТАТУС</small>
          <strong>${statusText(dailyCase)}</strong>
        </div>
      </header>

      <div class="case81-layout">
        <aside class="case81-panel case81-odds-panel">
          <div class="case81-panel-title"><span>DROP TABLE</span><b>Шанси нагород</b></div>
          <div class="case81-odds-list">
            ${casePrizeRows(dailyCase).replaceAll('class="rhc-case-reward','class="case81-odds-item')}
          </div>
          <div class="case81-security"><i>✓</i><span>Результат надходить із сервера</span></div>
        </aside>

        <div class="case81-stage-wrap">
          <div class="case81-stage-aura"></div>
          <div id="rhcCaseStage" class="case81-stage">
            <div class="case81-beam beam-left"></div>
            <div class="case81-beam beam-right"></div>
            <div class="case81-rays"></div>
            <div class="case81-platform">
              <span></span><i></i><b>RH VAULT</b><i></i><span></span>
            </div>
            <div class="case81-chest">
              <div class="case81-lid">
                <span class="case81-corner c1"></span><span class="case81-corner c2"></span>
                <i></i><b>RH</b><i></i>
              </div>
              <div class="case81-body">
                <span class="case81-band"></span>
                <div class="case81-emblem"><b>R</b><small>REWARDS</small></div>
                <span class="case81-band"></span>
              </div>
              <div class="case81-lock"><i></i></div>
            </div>
            <div class="case81-particles">${Array.from({length:18},(_,i)=>`<i style="--p:${i}"></i>`).join('')}</div>
            <div id="rhcCaseResult" class="case81-result">
              <span class="case81-result-icon">◆</span>
              <small>DAILY REWARD</small>
              <strong>НАГОРОДА ВСЕРЕДИНІ</strong>
              <p>Натисни кнопку, щоб відкрити кейс</p>
            </div>
          </div>
        </div>

        <aside class="case81-panel case81-stats-panel">
          <div class="case81-panel-title"><span>PLAYER DATA</span><b>Статистика</b></div>
          <div class="case81-stat"><span>Відкрито кейсів</span><strong>${caseHistory.length}</strong></div>
          <div class="case81-stat"><span>Кращий дроп</span><strong>${Math.max(0,...caseHistory.map(item=>Number(item.reward||0)))} RH</strong></div>
          <div class="case81-stat"><span>Вартість</span><strong>FREE</strong></div>
          <div class="case81-streak">
            <span>DAILY ACCESS</span>
            <div><i style="width:${Math.min(100,(caseHistory.length%7)/7*100)}%"></i></div>
            <small>${caseHistory.length%7}/7 відкриттів</small>
          </div>
        </aside>
      </div>

      <footer class="case81-footer">
        <div class="case81-foot-note"><i>24H</i><span>Одне відкриття на добу</span></div>
        <button id="rhcCaseButton" class="case81-open-button" onclick="openDailyCase()" ${dailyCase?.cooldown_remaining?'disabled':''}>
          <span class="case81-button-shine"></span>
          <i>▣</i>
          <div><b>ВІДКРИТИ КЕЙС</b><small>${dailyCase?.cooldown_remaining?formatCooldown(dailyCase.cooldown_remaining):'БЕЗКОШТОВНО'}</small></div>
          <strong>›</strong>
        </button>
        <div class="case81-foot-note align-right"><span>Автоматичне зарахування</span><i>✓</i></div>
      </footer>
    </section>

    <section class="gc3-featured">
      <div class="gc3-featured-copy">
        <span class="gc3-hot">HOT GAME</span>
        <h2>Slot Neon</h2>
        <p>Грай обережно: більшість прокрутів програшні, а великий виграш трапляється рідко.</p>
        <div class="gc3-featured-meta">
          <div><span>Спроб сьогодні</span><strong>${leftToday(slot)}</strong></div>
          <div><span>Статус</span><strong>${statusText(slot)}</strong></div>
          <div><span>Твій рекорд</span><strong>${Math.max(0,...slotHistory.map(item=>Number(item.reward||0)))}</strong></div>
        </div>
        <div class="gc3-slot-preview" id="slotResult">❔ ❔ ❔</div>
        <div class="gc3-slot-controls">
          <input id="slotBet" type="number" value="${slot?.min_bet||5}" min="${slot?.min_bet||5}" max="${slot?.max_bet||100}">
          <button onclick="playSlot()" ${slot?.cooldown_remaining?"disabled":""}>
            ${slot?.cooldown_remaining?formatCooldown(slot.cooldown_remaining):"Грати зараз"}
          </button>
        </div>
      </div>
      <div class="gc3-machine">
        <div class="gc3-machine-screen">
          <span>7</span><span>★</span><span>7</span>
        </div>
        <div class="gc3-machine-lights">
          ${Array.from({length:8},(_,i)=>`<i style="--light:${i}"></i>`).join("")}
        </div>
      </div>
    </section>

    <section class="gc3-grid-cards">

      <article class="gc3-card gc3-coin" data-game-type="risk">
        <div class="gc3-card-head">
          <span class="gc3-tag">RISK</span>
          <div class="gc3-icon">🪙</div>
        </div>
        <h3>Орел чи решка</h3>
        <p>Шанс виграшу нижче 50%. Обирай сторону.</p>
        <div class="gc3-info-row">
          <div><span>Спроб</span><strong>${leftToday(coin)}</strong></div>
          <div><span>Рекорд</span><strong>${Math.max(0,...coinHistory.map(item=>Number(item.reward||0)))}</strong></div>
        </div>
        <input id="coinBet" class="gc3-input" type="number" value="${coin?.min_bet||5}" min="${coin?.min_bet||5}" max="${coin?.max_bet||50}">
        <div class="gc3-double">
          <button onclick="playCoinFlip('heads')">Орел</button>
          <button onclick="playCoinFlip('tails')">Решка</button>
        </div>
      </article>

      <article class="gc3-card gc3-guess" data-game-type="free">
        <div class="gc3-card-head">
          <span class="gc3-tag">SKILL</span>
          <div class="gc3-icon">🔢</div>
        </div>
        <h3>Вгадай число</h3>
        <p>Обери правильне число від 1 до 5.</p>
        <div class="gc3-info-row">
          <div><span>Спроб</span><strong>${leftToday(guess)}</strong></div>
          <div><span>Рекорд</span><strong>${Math.max(0,...guessHistory.map(item=>Number(item.reward||0)))}</strong></div>
        </div>
        <div class="gc3-number-row">
          ${[1,2,3,4,5].map(n=>`<button onclick="playNumberGuess(${n})">${n}</button>`).join("")}
        </div>
      </article>

      <article class="gc3-card gc3-scratch" data-game-type="free daily">
        <div class="gc3-card-head">
          <span class="gc3-tag">DAILY</span>
          <div class="gc3-icon">🎟️</div>
        </div>
        <h3>Скретч-картка</h3>
        <p>Одна картка на добу. Може бути порожньою.</p>
        <div class="gc3-info-row">
          <div><span>Статус</span><strong>${statusText(scratch)}</strong></div>
          <div><span>Рекорд</span><strong>${Math.max(0,...scratchHistory.map(item=>Number(item.reward||0)))}</strong></div>
        </div>
        <div id="scratchSurface" class="gc3-scratch-surface ${scratch?.cooldown_remaining?"disabled":""}">
          ${scratch?.cooldown_remaining?`ДОСТУПНО ЧЕРЕЗ ${formatCooldown(scratch.cooldown_remaining)}`:""}
        </div>
        <button type="button" disabled>${scratch?.cooldown_remaining?"Недоступно":"Стирай картку вище"}</button>
      </article>

      <article class="gc3-card gc3-safe" data-game-type="free">
        <div class="gc3-card-head">
          <span class="gc3-tag">PUZZLE</span>
          <div class="gc3-icon">🔐</div>
        </div>
        <h3>Злам сейфа</h3>
        <p>Одна правильна комірка з шести.</p>
        <div class="gc3-info-row">
          <div><span>Спроб</span><strong>${leftToday(safe)}</strong></div>
          <div><span>Рекорд</span><strong>${Math.max(0,...safeHistory.map(item=>Number(item.reward||0)))}</strong></div>
        </div>
        <div class="gc3-safe-grid">
          ${[1,2,3,4,5,6].map(n=>`<button onclick="playSafeCrack(${n})">${n}</button>`).join("")}
        </div>
      </article>
    </section>

    <section class="gc3-history">
      <div class="gc3-section-title">
        <div><span>RECENT RESULTS</span><h2>Останні ігри</h2></div>
        <small>${history.length} записів</small>
      </div>
      <div class="gc3-history-list">
        ${history.length?history.slice(0,20).map((item,index)=>`
          <div class="gc3-history-item" style="--history-index:${index}">
            <div class="gc3-history-icon">${gameIcon(item.game_key)}</div>
            <div class="grow">
              <b>${gameName(item.game_key)}</b>
              <p>${esc(item.result_text)}</p>
            </div>
            <div class="gc3-history-result ${Number(item.reward||0)>0?"win":"lose"}">
              <strong>${Number(item.reward||0)>0?`+${item.reward}`:"0"}</strong>
              <span>${new Date(item.created_at*1000).toLocaleTimeString("uk-UA",{hour:"2-digit",minute:"2-digit"})}</span>
            </div>
          </div>`).join(""):`<div class="empty">Ігор ще не було</div>`}
      </div>
    </section>
  `;

  addCrispMotion(); setupMotionForPage();
}

function gameIcon(key){
  return {
    roulette:"🎡",slot:"🎰",daily_case:"🎁",
    coin_flip:"🪙",number_guess:"🔢",
    scratch:"🎟️",safe_crack:"🔐"
  }[key]||"🎮";
}

function filterGameCards(type,button){
  document.querySelectorAll(".gc3-tabs button").forEach(item=>item.classList.remove("active"));
  button?.classList.add("active");
  document.querySelectorAll(".gc3-card").forEach(card=>{
    const tags=(card.dataset.gameType||"").split(/\s+/);
    card.hidden=!(type==="all"||tags.includes(type));
  });
  document.querySelectorAll("[data-premium-game]").forEach(section=>{
    const premiumType=section.dataset.premiumGame;
    section.hidden=!(
      type==="all" ||
      type==="daily" ||
      type==="free" ||
      (type==="risk" && false)
    );
  });
}

async function playCoinFlip(choice){
  const buttons=[...document.querySelectorAll(".gc3-double button")];
  buttons.forEach(button=>button.disabled=true);
  try{
    const bet=Number(document.getElementById("coinBet")?.value||0);
    const old=me.balance;
    const result=await api("/api/games/coin-flip",{
      method:"POST",
      body:JSON.stringify({bet,choice})
    });
    me.balance=result.balance;
    motionBalanceUpdate(old,result.balance);
    if(typeof coinAnimation==="function")coinAnimation(result.result);
    if(result.win&&typeof celebrateUltra==="function")celebrateUltra("coin");
    toast(result.win?`Виграш ${result.reward} RH ⭐`:`Випала ${result.result==="heads"?"орел":"решка"}`);
    gc418AfterPlay?.("coin_flip",result.win?`Виграш ${result.reward} RH`:`Випала ${result.result==="heads"?"орел":"решка"}`,Number(result.reward||0));
  }catch(error){
    buttons.forEach(button=>button.disabled=false);
    toast(error.message);
  }
}

async function playNumberGuess(number){
  const buttons=[...document.querySelectorAll(".gc3-number-row button")];
  buttons.forEach(button=>button.disabled=true);
  try{
    const old=me.balance;
    const result=await api("/api/games/number-guess",{
      method:"POST",
      body:JSON.stringify({number})
    });
    me.balance=result.balance;
    motionBalanceUpdate(old,result.balance);
    buttons.forEach(button=>{
      const value=Number(button.textContent);
      button.classList.toggle("guess-answer",value===Number(result.answer));
      button.classList.toggle("guess-wrong",value===Number(number)&&!result.win);
    });
    if(result.win&&typeof celebrateUltra==="function")celebrateUltra("guess");
    toast(result.win?`Вгадав! +${result.reward} RH ⭐`:`Правильне число: ${result.answer}`);
    gc418AfterPlay?.("number_guess",result.win?`Вгадав число ${result.answer}`:`Правильне число: ${result.answer}`,Number(result.reward||0));
  }catch(error){
    buttons.forEach(button=>button.disabled=false);
    toast(error.message);
  }
}

async function playScratch(){
  const surface=document.getElementById("scratchSurface");
  if(surface){
    startScratchInteraction(surface);
    toast("Стирай захисний шар мишкою або пальцем");
  }
}

async function playSafeCrack(number){
  const buttons=[...document.querySelectorAll(".gc3-safe-grid button")];
  buttons.forEach(button=>button.disabled=true);
  try{
    const old=me.balance;
    const result=await api("/api/games/safe-crack",{
      method:"POST",
      body:JSON.stringify({number})
    });
    me.balance=result.balance;
    motionBalanceUpdate(old,result.balance);
    buttons.forEach(button=>{
      const value=Number(button.textContent);
      button.classList.toggle("safe-answer",value===Number(result.correct));
      button.classList.toggle("safe-wrong",value===Number(number)&&!result.win);
    });
    if(result.win&&typeof safeUnlockAnimation==="function")safeUnlockAnimation();
    if(result.win&&typeof celebrateUltra==="function")celebrateUltra("safe");
    toast(result.win?`Сейф відкрито! +${result.reward} RH ⭐`:`Код був у комірці ${result.correct}`);
    gc418AfterPlay?.("safe_crack",result.win?`Сейф відкрито`:`Код був у комірці ${result.correct}`,Number(result.reward||0));
  }catch(error){
    buttons.forEach(button=>button.disabled=false);
    toast(error.message);
  }
}

function celebrateUltra(kind="normal"){
  document.body.classList.remove("ultra-win");
  void document.body.offsetWidth;
  document.body.classList.add("ultra-win");
  cinematicWin(kind);
  pulseBalance();
  setTimeout(()=>document.body.classList.remove("ultra-win"),1100);
}

async function playRoulette(){
  const button=document.getElementById("rhcRouletteButton");
  if(button)button.disabled=true;

  try{
    const games=await api("/api/games");
    const rouletteGame=games.find(item=>item.game_key==="roulette");
    const result=await api("/api/games/roulette",{
      method:"POST",
      body:JSON.stringify({bet:0})
    });

    await premiumRouletteSpin(result.reward,rouletteGame,result.sector_index);

    const rouletteResult=document.getElementById("premium71Result");
    if(rouletteResult){
      rouletteResult.querySelector("span").textContent=result.is_jackpot?"ДЖЕКПОТ":"ВИГРАШ";
      rouletteResult.querySelector("strong").textContent=`+${Number(result.reward||0)} ⭐`;
      rouletteResult.querySelector("small").textContent=result.is_jackpot
        ?"Сектор ★ приніс 15 зірок"
        :"Зірки додані до профілю";
      rouletteResult.classList.toggle("jackpot",Boolean(result.is_jackpot));
      rouletteResult.classList.add("show");
    }

    me.stars=Number(result.stars||0);
    if(result.is_jackpot){
      luxuryWinBurst("jackpot");
    }else{
      luxuryWinBurst("win");
    }
    toast(result.result_text);
    gc418AfterPlay?.("roulette",result.result_text||"Рулетка завершена",Number(result.reward||0));
  }catch(error){
    if(button)button.disabled=false;
    toast(error.message);
  }
}

async function playSlot(){
  const button=document.querySelector(".gc3-slot-controls button");
  const slotResult=document.getElementById("slotResult");
  if(button)button.disabled=true;
  slotResult?.classList.add("slot-spinning");
  try{
    const bet=Number(document.getElementById("slotBet")?.value||0);
    const old=me.balance;
    const result=await api("/api/games/slot",{
      method:"POST",
      body:JSON.stringify({bet})
    });
    slotResult?.classList.remove("slot-spinning");
    if(slotResult){
      slotResult.textContent=result.symbols.join(" ");
      slotResult.classList.add("slot-reveal");
    }
    me.balance=result.balance;
    motionBalanceUpdate(old,result.balance);
    if(result.reward>=bet*4&&typeof celebrateUltra==="function")celebrateUltra("jackpot");
    else if(result.reward&&typeof celebrateUltra==="function")celebrateUltra("slot");
    toast(result.reward?`Виграш: ${result.reward} RH ⭐`:"Цього разу без виграшу");
    gc418AfterPlay?.("slot",result.reward?`Виграш: ${result.reward} RH`:"Без виграшу",Number(result.reward||0));
  }catch(error){
    slotResult?.classList.remove("slot-spinning");
    if(button)button.disabled=false;
    toast(error.message);
  }
}

async function openDailyCase(){
  const button=document.getElementById("rhcCaseButton");
  if(button)button.disabled=true;

  try{
    const old=me.balance;
    const result=await api("/api/games/daily-case",{
      method:"POST",
      body:JSON.stringify({bet:0})
    });

    await premiumCaseOpen(Number(result.reward||0),result.result_text);

    me.balance=result.balance;
    motionBalanceUpdate(old,result.balance,"Daily Case");
    if(Number(result.reward)>=5)luxuryWinBurst("jackpot");
    else luxuryWinBurst("win");
    toast(result.result_text);
    gc418AfterPlay?.("daily_case",result.result_text||"Daily Case відкрито",Number(result.reward||0));
  }catch(error){
    if(button)button.disabled=false;
    toast(error.message);
  }
}

async function spin(){
  const button=document.getElementById("spinButton");
  button.disabled=true;

  try{
    const old=me.balance;
    const result=await api("/api/spin",{method:"POST"});
    rotation+=1440+Math.floor(Math.random()*360);
    document.getElementById("wheel").style.transform=`rotate(${rotation}deg)`;

    setTimeout(()=>{
      me.balance=result.balance;
      me.next_spin_in=result.next_spin_in;
      animateBalance(old,result.balance);
      toast(result.reward?`Виграш: ${result.reward} RH ⭐`:"Без нагороди");
      button.textContent="Повернись через 24 години";
    },3300);
  }catch(error){
    button.disabled=false;
    toast(error.message);
  }
}

async function topPage(){
  content.innerHTML=`<div class="loader"></div>`;
  const users=await api("/api/top");

  content.innerHTML=section("Рейтинг","За весь час")+`
    <div class="card">
      ${users.map((user,index)=>`
        <div class="row">
          <div class="rank-num">${index<3?["🥇","🥈","🥉"][index]:index+1}</div>
          <div class="grow">
            <b>${esc(user.first_name||user.username||"Користувач")}</b>
            <div class="muted">${user.referrals_count} друзів</div>
          </div>
          <strong>${user.total_earned} ★</strong>
        </div>`).join("")}
    </div>
  `;
}

function orderStatus(status){
  return {
    pending:"Очікує",
    completed:"Виконано",
    rejected:"Відхилено"
  }[status]||status;
}


function shop84CategoryIcon(category){
  const value=String(category||"").toLowerCase();
  if(value.includes("рам"))return "♛";
  if(value.includes("фон"))return "◈";
  if(value.includes("тит"))return "◆";
  if(value.includes("telegram")||value.includes("premium"))return "✦";
  if(value.includes("подар"))return "▣";
  return "◇";
}

function shop84Status(status){
  return {
    pending:"Очікує",
    completed:"Отримано",
    rejected:"Відхилено"
  }[status]||status||"Нове";
}

function shop84StatusClass(status){
  return {
    pending:"pending",
    completed:"completed",
    rejected:"rejected"
  }[status]||"pending";
}

function switchShop84Tab(name,button){
  document.querySelectorAll(".shop84-tabs button").forEach(node=>node.classList.remove("active"));
  document.querySelectorAll(".shop84-panel").forEach(node=>node.classList.remove("active"));
  button.classList.add("active");
  document.querySelector(`[data-shop84-panel="${name}"]`)?.classList.add("active");
}

function setShop84Category(category,button){
  window.shop84Category=category;
  document.querySelectorAll(".shop84-category-row button").forEach(node=>node.classList.remove("active"));
  button?.classList.add("active");
  filterShop84();
}

function filterShop84(){
  const query=(document.getElementById("shop84Search")?.value||"").trim().toLowerCase();
  const category=window.shop84Category||"all";
  let visible=0;

  document.querySelectorAll(".shop84-product").forEach(card=>{
    const matchCategory=category==="all"||card.dataset.category===category;
    const matchQuery=!query||card.dataset.title.includes(query);
    const show=matchCategory&&matchQuery;
    card.hidden=!show;
    if(show)visible++;
  });

  const count=document.getElementById("shop84Count");
  if(count)count.textContent=`${visible} товарів`;
}

function openShop84Preview(id){
  const gift=(window.shop84Gifts||[]).find(item=>Number(item.id)===Number(id));
  if(!gift)return;

  document.querySelector(".shop84-modal")?.remove();

  const stock=Number(gift.stock||0);
  const canBuy=Number(me.balance||0)>=Number(gift.price||0)&&(stock!==0);
  const modal=document.createElement("div");
  modal.className="shop84-modal";
  modal.innerHTML=`
    <div class="shop84-modal-backdrop" onclick="this.closest('.shop84-modal').remove()"></div>
    <div class="shop84-modal-card">
      <button class="shop84-modal-close" onclick="this.closest('.shop84-modal').remove()">×</button>
      <div class="shop84-modal-visual">
        ${gift.image_url
          ?`<img src="${esc(gift.image_url)}" alt="${esc(gift.title)}">`
          :`<span>${shop84CategoryIcon(gift.category)}</span>`}
        <i></i>
      </div>
      <div class="shop84-modal-copy">
        <span>${esc(gift.category||"Нагорода")}</span>
        <h2>${esc(gift.title)}</h2>
        <p>${esc(gift.description||"Ексклюзивна нагорода ReferHub Rewards.")}</p>
        <div class="shop84-modal-info">
          <div><small>Ціна</small><strong>${Number(gift.price||0)} RH</strong></div>
          <div><small>Залишок</small><strong>${stock>0?stock:"∞"}</strong></div>
          <div><small>Баланс</small><strong>${Number(me.balance||0)} RH</strong></div>
        </div>
        <button class="shop84-buy" ${canBuy?"":"disabled"}
          onclick="buyGift(${gift.id});this.closest('.shop84-modal').remove()">
          ${stock===0?"Немає в наявності":canBuy?`Купити за ${gift.price} RH`:"Недостатньо RH"}
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  requestAnimationFrame(()=>modal.classList.add("show"));
}
async function shopPage(){
  content.innerHTML=`<div class="loader"></div>`;

  let gifts=[];
  let orders=[];

  try{
    [gifts,orders]=await Promise.all([
      api("/api/gifts"),
      api("/api/orders")
    ]);
  }catch(error){
    content.innerHTML=`
      <div class="shop84-error">
        <span>!</span>
        <h2>Магазин не завантажився</h2>
        <p>${esc(error.message)}</p>
        <button onclick="shopPage()">Спробувати ще раз</button>
      </div>`;
    return;
  }

  gifts=Array.isArray(gifts)?gifts:[];
  orders=Array.isArray(orders)?orders:[];

  const available=gifts.filter(item=>item.is_active!==0&&Number(item.stock||0)!==0);
  const categories=[...new Set(available.map(item=>item.category||"Інше"))];
  const featured=[...available].sort((a,b)=>Number(b.price||0)-Number(a.price||0)).slice(0,3);
  const inventory=orders.filter(order=>["pending","completed"].includes(order.status));
  const completed=orders.filter(order=>order.status==="completed");
  const spent=orders.reduce((sum,order)=>sum+Number(order.price||0),0);

  window.shop84Gifts=gifts;
  window.shop84Category="all";

  const productCard=gift=>{
    const stock=Number(gift.stock||0);
    const owned=inventory.some(order=>Number(order.gift_id)===Number(gift.id));
    const affordable=Number(me.balance||0)>=Number(gift.price||0);
    return `
      <article class="shop84-product ${owned?"owned":""}"
        data-category="${esc(gift.category||"Інше")}"
        data-title="${esc(String(gift.title||"").toLowerCase())}">
        <div class="shop84-product-visual">
          ${gift.image_url
            ?`<img src="${esc(gift.image_url)}" alt="${esc(gift.title)}">`
            :`<span>${shop84CategoryIcon(gift.category)}</span>`}
          <i></i>
          <b>${esc(gift.category||"Інше")}</b>
          ${owned?`<em>У майні</em>`:""}
          ${stock>0&&stock<=3?`<small>Залишилось ${stock}</small>`:""}
        </div>
        <div class="shop84-product-copy">
          <h3>${esc(gift.title)}</h3>
          <p>${esc(gift.description||"Ексклюзивна нагорода ReferHub.")}</p>
          <div>
            <strong>${Number(gift.price||0)} <span>RH</span></strong>
            <button onclick="openShop84Preview(${gift.id})">
              ${owned?"Переглянути":affordable?"Відкрити":"Переглянути"}
            </button>
          </div>
        </div>
      </article>`;
  };

  content.innerHTML=`
    <section class="shop84-shell">
      <header class="shop84-hero">
        <div class="shop84-hero-copy">
          <span>REFERHUB MARKETPLACE</span>
          <h1>Магазин нагород</h1>
          <p>Рамки, фони, титули, цифрові подарунки та ексклюзивні предмети.</p>
          <div class="shop84-wallet">
            <div><small>Твій баланс</small><strong>${Number(me.balance||0)} RH</strong></div>
            <div><small>Придбано</small><strong>${inventory.length}</strong></div>
            <div><small>Витрачено</small><strong>${spent} RH</strong></div>
          </div>
        </div>
        <div class="shop84-hero-art">
          <div class="shop84-chest">
            <span>RH</span>
            <i></i>
            <b></b>
          </div>
          <div class="shop84-orbit orbit-a">◆</div>
          <div class="shop84-orbit orbit-b">✦</div>
          <div class="shop84-orbit orbit-c">◇</div>
        </div>
      </header>

      <nav class="shop84-tabs">
        <button class="active" onclick="switchShop84Tab('store',this)">Магазин</button>
        <button onclick="switchShop84Tab('inventory',this)">Моє майно <span>${inventory.length}</span></button>
        <button onclick="switchShop84Tab('orders',this)">Замовлення <span>${orders.length}</span></button>
      </nav>

      <div class="shop84-panel active" data-shop84-panel="store">
        ${featured.length?`
          <section class="shop84-featured">
            <div class="shop84-title">
              <div><span>FEATURED</span><h2>Головні пропозиції</h2></div>
              <small>Обрано для тебе</small>
            </div>
            <div class="shop84-featured-grid">
              ${featured.map((gift,index)=>`
                <button class="shop84-featured-card feature-${index+1}" onclick="openShop84Preview(${gift.id})">
                  <span class="shop84-featured-index">0${index+1}</span>
                  <div class="shop84-featured-visual">
                    ${gift.image_url?`<img src="${esc(gift.image_url)}" alt="">`:`<strong>${shop84CategoryIcon(gift.category)}</strong>`}
                  </div>
                  <div>
                    <small>${esc(gift.category||"Нагорода")}</small>
                    <h3>${esc(gift.title)}</h3>
                    <p>${esc(gift.description||"Ексклюзивна пропозиція ReferHub.")}</p>
                    <b>${Number(gift.price||0)} RH</b>
                  </div>
                </button>`).join("")}
            </div>
          </section>`:""}

        <section class="shop84-catalog">
          <div class="shop84-title">
            <div><span>STORE CATALOG</span><h2>Усі товари</h2></div>
            <small id="shop84Count">${available.length} товарів</small>
          </div>

          <div class="shop84-toolbar">
            <div class="shop84-search">
              <span>⌕</span>
              <input id="shop84Search" placeholder="Пошук товару..." oninput="filterShop84()">
            </div>
            <div class="shop84-category-row">
              <button class="active" onclick="setShop84Category('all',this)">Усі</button>
              ${categories.map(category=>`
                <button onclick="setShop84Category('${esc(category)}',this)">
                  ${shop84CategoryIcon(category)} ${esc(category)}
                </button>`).join("")}
            </div>
          </div>

          <div class="shop84-product-grid">
            ${available.length?available.map(productCard).join(""):`
              <div class="shop84-empty"><span>◇</span><h3>Магазин порожній</h3><p>Адміністратор ще не додав товари.</p></div>`}
          </div>
        </section>
      </div>

      <div class="shop84-panel" data-shop84-panel="inventory">
        <div class="shop84-title">
          <div><span>MY COLLECTION</span><h2>Моє майно</h2></div>
          <small>${completed.length} отримано · ${inventory.length-completed.length} очікує</small>
        </div>

        <div class="shop84-inventory-grid">
          ${inventory.length?inventory.map(order=>`
            <article class="shop84-inventory-card status-${shop84StatusClass(order.status)}">
              <div class="shop84-inventory-icon">${shop84CategoryIcon(order.category||"")}</div>
              <div>
                <span>${shop84Status(order.status)}</span>
                <h3>${esc(order.gift_title||order.title||"Нагорода")}</h3>
                <p>Придбано ${new Date(Number(order.created_at||0)*1000).toLocaleDateString("uk-UA")}</p>
              </div>
              <strong>${Number(order.price||0)} RH</strong>
            </article>`).join(""):`
            <div class="shop84-empty">
              <span>▣</span>
              <h3>Майно ще порожнє</h3>
              <p>Куплені товари та нагороди з'являться тут.</p>
              <button onclick="switchShop84Tab('store',document.querySelector('.shop84-tabs button'))">До магазину</button>
            </div>`}
        </div>
      </div>

      <div class="shop84-panel" data-shop84-panel="orders">
        <div class="shop84-title">
          <div><span>ORDER HISTORY</span><h2>Історія замовлень</h2></div>
          <small>${orders.length} записів</small>
        </div>

        <div class="shop84-order-list">
          ${orders.length?orders.map(order=>`
            <article class="shop84-order status-${shop84StatusClass(order.status)}">
              <div class="shop84-order-status">${shop84Status(order.status)}</div>
              <div>
                <h3>${esc(order.gift_title||order.title||"Замовлення")}</h3>
                <p>${new Date(Number(order.created_at||0)*1000).toLocaleString("uk-UA")}</p>
              </div>
              <strong>${Number(order.price||0)} RH</strong>
            </article>`).join(""):`
            <div class="shop84-empty"><span>◇</span><h3>Замовлень ще немає</h3><p>Після покупки вони з'являться тут.</p></div>`}
        </div>
      </div>
    </section>
  `;

  addCrispMotion();
  setupMotionForPage();
}

function setShop3Category(category,button){
  window.shop3ActiveCategory=category;
  document.querySelectorAll(".shop3-categories button").forEach(item=>item.classList.remove("active"));
  button?.classList.add("active");
  filterShop3();
}

function filterShop3(){
  const query=(document.getElementById("shop3Search")?.value||"").trim().toLowerCase();
  const category=window.shop3ActiveCategory||"all";
  let visible=0;

  document.querySelectorAll(".shop3-product").forEach(card=>{
    const matchesCategory=category==="all"||card.dataset.shopCategory===category;
    const matchesQuery=!query||card.dataset.shopTitle.includes(query);
    const show=matchesCategory&&matchesQuery;
    card.style.display=show?"":"none";
    if(show)visible++;
  });

  const counter=document.getElementById("shop3Count");
  if(counter)counter.textContent=`${visible} позицій`;
}


function openGiftDetails(id){
  const gift=(window.shop3Gifts||[]).find(item=>Number(item.id)===Number(id));
  if(!gift)return;

  const modal=document.createElement("div");
  modal.className="shop3-modal";
  modal.innerHTML=`
    <div class="shop3-modal-card promo412-card">
      <button class="shop3-modal-close" onclick="this.closest('.shop3-modal').remove()">×</button>
      <div class="shop3-modal-visual">
        ${gift.image_url?`<img src="${esc(gift.image_url)}">`:`<span>🎁</span>`}
        <i></i>
      </div>
      <span class="shop3-modal-category">${esc(gift.category||"Інше")}</span>
      <h2>${esc(gift.title)}</h2>
      <p>${esc(gift.description||"Подарунок ReferHub Rewards")}</p>

      <div class="shop3-modal-meta">
        <div><span>Ціна</span><strong id="promo412Price-${gift.id}">${gift.price} RH ⭐</strong></div>
        <div><span>Залишок</span><strong>${Number(gift.stock||0)>0?gift.stock:"∞"}</strong></div>
      </div>

      <div class="promo412-box">
        <div class="promo412-input">
          <input id="promo412Code-${gift.id}" placeholder="Є промокод?">
          <button onclick="promo412Check(${gift.id},${gift.price})">ПЕРЕВІРИТИ</button>
        </div>
        <div id="promo412State-${gift.id}" class="promo412-state">Промокод необов’язковий</div>
      </div>

      <button class="shop3-buy-button" onclick="promo412Buy(${gift.id});this.closest('.shop3-modal').remove()">
        КУПИТИ
      </button>
    </div>`;
  document.body.appendChild(modal);
  requestAnimationFrame(()=>modal.classList.add("show"));
}



async function promo412Check(id,originalPrice){
  const input=document.getElementById(`promo412Code-${id}`);
  const state=document.getElementById(`promo412State-${id}`);
  const price=document.getElementById(`promo412Price-${id}`);
  const code=(input?.value||"").trim();

  if(!code){
    if(state){state.textContent="Промокод необов’язковий";state.className="promo412-state";}
    if(price)price.textContent=`${originalPrice} RH ⭐`;
    return;
  }

  if(state){state.textContent="Перевіряємо…";state.className="promo412-state loading";}

  try{
    const r=await api("/api/promos-v412/validate",{
      method:"POST",
      body:JSON.stringify({code,gift_id:id})
    });
    if(price)price.innerHTML=`<del>${r.original_price} RH</del> ${r.final_price} RH ⭐`;
    if(state){
      state.textContent=`✓ ${r.code}: −${r.discount_percent}%${r.remaining_uses!==null?` · залишилось ${r.remaining_uses}`:""}`;
      state.className="promo412-state success";
    }
    if(input)input.dataset.valid="1";
  }catch(error){
    if(price)price.textContent=`${originalPrice} RH ⭐`;
    if(state){state.textContent=error.message;state.className="promo412-state error";}
    if(input)delete input.dataset.valid;
  }
}

async function promo412Buy(id){
  const code=(document.getElementById(`promo412Code-${id}`)?.value||"").trim();

  if(!confirm("Створити заявку і списати RH ⭐?"))return;

  try{
    const old=me.balance;
    const endpoint=code?`/api/gifts/${id}/buy-with-promo`:`/api/gifts/${id}/buy`;
    const options=code?{method:"POST",body:JSON.stringify({code})}:{method:"POST"};
    const result=await api(endpoint,options);

    me.balance=result.balance;
    motionBalanceUpdate?.(old,result.balance);
    toast(code?`Заявку створено за ${result.final_price} RH ⭐`:(result.message||"Заявку створено"),"success");
    shopPage();
  }catch(error){
    toast(error.message,"error");
  }
}

async function buyGiftPro(id){
  const code=prompt("Промокод (можна залишити порожнім):")||"";
  if(!confirm("Створити заявку і списати RH ⭐?"))return;
  try{
    const old=me.balance;
    const result=await api(`/api/gifts/${id}/buy-with-promo`,{
      method:"POST",
      body:JSON.stringify({code})
    });
    me.balance=result.balance;
    motionBalanceUpdate(old,result.balance);
    toast(`Заявку створено за ${result.final_price} RH ⭐`);
    shopPage();
  }catch(error){toast(error.message)}
}

async function buyGift(id){
  if(!confirm("Створити заявку і списати RH ⭐?"))return;

  try{
    const old=me.balance;
    const result=await api(`/api/gifts/${id}/buy`,{method:"POST"});
    me.balance=result.balance;
    motionBalanceUpdate(old,result.balance);
    toast(result.message);
    shopPage();
  }catch(error){
    toast(error.message);
  }
}


function tournamentStatus(status){
  return {
    active:"🟢 Активний",
    upcoming:"🔵 Запланований",
    finished:"🏁 Завершений",
    cancelled:"❌ Скасований"
  }[status]||status;
}

function tournamentTimer(seconds){
  seconds=Math.max(0,Number(seconds||0));
  const days=Math.floor(seconds/86400);
  const hours=Math.floor((seconds%86400)/3600);
  const minutes=Math.floor((seconds%3600)/60);
  const secs=seconds%60;
  return `${days?days+"д ":""}${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
}

async function tournamentsPage(){
  content.innerHTML=`<div class="loader"></div>`;
  const tournaments=await api("/api/tournaments");
  const live=tournaments.filter(t=>["active","upcoming"].includes(t.status));
  const archive=tournaments.filter(t=>["finished","cancelled"].includes(t.status));

  const card=t=>`
    <div class="card tournament-pro ${t.status}">
      <div class="tournament-head">
        <div>
          <div class="status-pill">${tournamentStatus(t.status)}</div>
          <h3>${esc(t.title)}</h3>
          <p class="muted">${esc(t.description)}</p>
        </div>
        <div class="trophy">🏆</div>
      </div>

      ${["active","upcoming"].includes(t.status)?`
        <div class="tournament-countdown" data-tournament-seconds="${t.seconds_remaining}">
          ${t.status==="active"?"До завершення":"До початку"}:
          <b>${tournamentTimer(t.seconds_remaining)}</b>
        </div>`:""}

      <div class="podium">
        <div>🥇<br><b>${t.prize_1} ★</b></div>
        <div>🥈<br><b>${t.prize_2} ★</b></div>
        <div>🥉<br><b>${t.prize_3} ★</b></div>
      </div>

      <div class="my-score">Твій результат: <b>${t.my_score}</b></div>

      <div class="leaderboard-pro">
        ${t.leaderboard.length?t.leaderboard.map((u,i)=>`
          <div class="row">
            <div class="rank-num">${u.place||i+1}</div>
            <div class="grow">
              <b>${esc(u.first_name||u.username||String(u.telegram_id))}</b>
              ${u.reward!==undefined?`<div class="muted">Приз: ${u.reward} RH ⭐</div>`:""}
            </div>
            <strong>${u.score}</strong>
          </div>`).join(""):`<div class="empty">Учасників ще немає</div>`}
      </div>
    </div>`;

  content.innerHTML=`
    ${section("Турніри PRO",`${live.length} активних`)}
    ${live.length?live.map(card).join(""):`<div class="card empty">Активних турнірів немає</div>`}
    ${section("Архів",`${archive.length}`)}
    ${archive.length?archive.map(card).join(""):`<div class="card empty">Архів порожній</div>`}
  `;
  startTournamentTimers();
}

function startTournamentTimers(){
  document.querySelectorAll("[data-tournament-seconds]").forEach(element=>{
    let seconds=Number(element.dataset.tournamentSeconds||0);
    const label=element.querySelector("b");
    const timer=setInterval(()=>{
      seconds=Math.max(0,seconds-1);
      if(label)label.textContent=tournamentTimer(seconds);
      if(seconds<=0){
        clearInterval(timer);
        setTimeout(()=>tournamentsPage(),700);
      }
    },1000);
  });
}



function profileFrameAsset(key){
  const safe=String(key||"violet").replace(/[^a-z0-9_-]/gi,"");
  return `/static/assets/frames/${safe}.webp`;
}

function gameArtAsset(key){
  const map={roulette:"roulette",coin_flip:"coin",slot:"slot",daily_case:"case"};
  return map[key]?`/static/assets/games/${map[key]}.svg`:"";
}

function profileAvatar(){
  if(me.photo_url){
    return `<img src="${esc(me.photo_url)}" alt="${esc(me.first_name)}">`;
  }
  return `<span>${esc(me.first_name?.[0]||"R")}</span>`;
}

function profileTitle(){
  const level=me.level.number;
  if(level>=5)return "Легенда ReferHub";
  if(level>=4)return "Елітний майстер";
  if(level>=3)return "Мисливець за нагородами";
  if(level>=2)return "Активний шукач";
  return "Новий учасник";
}

function renderActivityChart(activity){
  const max=Math.max(1,...activity.map(item=>item.actions));
  return activity.map(item=>`
    <div class="activity-column" title="${item.label}: ${item.actions} дій, +${item.earned} RH">
      <div class="activity-value">${item.actions||""}</div>
      <div class="activity-bar"><i style="height:${Math.max(7,item.actions/max*100)}%"></i></div>
      <small>${item.label.slice(0,2)}</small>
    </div>`).join("");
}

function copyProfileLink(){
  navigator.clipboard.writeText(me.referral_link);
  toast("Реферальне посилання скопійовано");
}

function shareProfile(){
  const text=`Приєднуйся до ReferHub разом зі мною! ${me.referral_link}`;
  if(navigator.share){
    navigator.share({title:"ReferHub Rewards",text,url:me.referral_link});
  }else{
    navigator.clipboard.writeText(text);
    toast("Текст запрошення скопійовано");
  }
}

async function selectProfileFrame(frame){
  try{
    await api("/api/profile-pro/style",{
      method:"PATCH",
      body:JSON.stringify({frame})
    });
    await loadMe();
    toast("Рамку профілю змінено");
    profilePage();
  }catch(error){toast(error.message)}
}

async function featureAchievement(id){
  try{
    await api("/api/profile-pro/style",{
      method:"PATCH",
      body:JSON.stringify({featured_achievement_id:id})
    });
    await loadMe();
    toast("Досягнення закріплено у профілі");
    profilePage();
  }catch(error){toast(error.message)}
}


function seasonCountdown(seconds){
  seconds=Math.max(0,Number(seconds||0));
  const days=Math.floor(seconds/86400);
  const hours=Math.floor((seconds%86400)/3600);
  const minutes=Math.floor((seconds%3600)/60);
  return `${days}д ${String(hours).padStart(2,"0")}г ${String(minutes).padStart(2,"0")}хв`;
}

function season85RewardRarity(reward){
  if(Number(reward.level)%20===0)return "ultimate";
  if(Number(reward.level)%5===0)return "legendary";
  if(Number(reward.reward_value)>=35)return "epic";
  if(Number(reward.reward_value)>=18)return "rare";
  return "common";
}

function season85RewardCard(reward,data,track){
  const unlocked=Number(reward.level)<=Number(data.current_level);
  const current=Number(reward.level)===Number(data.current_level);
  const rarity=season85RewardRarity(reward);
  return `
    <article class="season85-reward ${unlocked?"unlocked":"locked"} ${current?"current":""} ${reward.claimed?"claimed":""} rarity-${rarity}"
      onclick="season85Preview(${reward.id})">
      <div class="season85-level">LVL ${reward.level}</div>
      <div class="season85-reward-art">
        <span>${reward.icon||"◆"}</span><i></i>
      </div>
      <small>${track}</small>
      <h3>${esc(reward.title)}</h3>
      <strong>+${Number(reward.reward_value||0)} RH</strong>
      <button onclick="event.stopPropagation();claimSeasonReward(${reward.id})"
        ${!unlocked||reward.claimed?"disabled":""}>
        ${reward.claimed?"✓ Отримано":unlocked?"Забрати":"🔒"}
      </button>
    </article>`;
}

function season85Scroll(direction){
  document.querySelector('.season85-road')?.scrollBy({left:direction*420,behavior:'smooth'});
}

function season85Preview(id){
  const reward=window.__season85Rewards?.find(item=>Number(item.id)===Number(id));
  if(!reward)return;
  const data=window.__season85Data;
  const unlocked=Number(reward.level)<=Number(data.current_level);
  const rarity=season85RewardRarity(reward);
  document.querySelector('.season85-preview')?.remove();
  const node=document.createElement('div');
  node.className=`season85-preview rarity-${rarity}`;
  node.innerHTML=`
    <div class="season85-preview-backdrop" onclick="this.closest('.season85-preview').remove()"></div>
    <div class="season85-preview-card">
      <button onclick="this.closest('.season85-preview').remove()">×</button>
      <span class="season85-preview-tag">${rarity.toUpperCase()} REWARD</span>
      <div class="season85-preview-icon">${reward.icon||'◆'}</div>
      <small>SEASON LEVEL ${reward.level}</small>
      <h2>${esc(reward.title)}</h2>
      <p>Сезонна нагорода за проходження доріжки прогресу.</p>
      <strong>+${Number(reward.reward_value||0)} RH</strong>
      <button class="claim" ${!unlocked||reward.claimed?'disabled':''}
        onclick="claimSeasonReward(${reward.id});this.closest('.season85-preview').remove()">
        ${reward.claimed?'Вже отримано':unlocked?'Забрати нагороду':`Потрібен LVL ${reward.level}`}
      </button>
    </div>`;
  document.body.appendChild(node);
  requestAnimationFrame(()=>node.classList.add('show'));
}

function season85Reveal(title,value,icon='⚡',kind='legendary'){
  document.querySelector('.season85-reveal')?.remove();
  const node=document.createElement('div');
  node.className=`season85-reveal rarity-${kind}`;
  node.innerHTML=`<div class="season85-reveal-bg"></div><div class="season85-reveal-card"><span>SEASON REWARD</span><div>${icon}</div><h2>${esc(title)}</h2><strong>+${value} RH</strong></div>`;
  document.body.appendChild(node);
  requestAnimationFrame(()=>node.classList.add('show'));
  setTimeout(()=>node.classList.remove('show'),1900);
  setTimeout(()=>node.remove(),2300);
}

async function seasonPage(){
  content.innerHTML=`<div class="loader"></div>`;
  const data=await api('/api/season');

  if(!data.active){
    content.innerHTML=`<div class="season85-empty"><span>⚡</span><h2>Сезон готується</h2><p>Новий Season Pass скоро відкриється.</p></div>`;
    return;
  }

  window.__season85Data=data;
  window.__season85Rewards=data.rewards||[];
  const season=data.season;
  const availableRewards=data.rewards.filter(r=>r.level<=data.current_level&&!r.claimed);
  const progress=Math.min(100,Number(data.level_progress||0)/Number(data.xp_per_level||1)*100);
  const freeRewards=data.rewards.filter(r=>Number(r.level)%2===1);
  const eliteRewards=data.rewards.filter(r=>Number(r.level)%2===0);
  const ultimate=data.rewards[data.rewards.length-1];

  content.innerHTML=`
    <section class="season85-shell">
      <header class="season85-hero">
        <div class="season85-hero-copy">
          <span>SEASON 01 · PREMIUM PASS</span>
          <h1>${esc(season.title)}</h1>
          <p>${esc(season.description)}</p>
          <div class="season85-countdown"><small>До завершення</small><strong id="seasonTimer">${seasonCountdown(data.seconds_remaining)}</strong></div>
          <div class="season85-actions">
            <button onclick="claimAllSeasonRewards()" ${availableRewards.length?'':'disabled'}>Забрати все · ${availableRewards.length}</button>
            <button class="secondary" onclick="document.querySelector('.season85-road')?.scrollIntoView({behavior:'smooth'})">Усі нагороди</button>
          </div>
        </div>
        <div class="season85-emblem"><div><span>⚡</span><b>${data.current_level}</b></div><i></i><em></em></div>
      </header>

      <section class="season85-progress-card">
        <div class="season85-level"><small>SEASON LEVEL</small><strong>${data.current_level}</strong><span>із ${season.max_level}</span></div>
        <div class="season85-progress-copy">
          <div><b>${Number(data.season_xp||0)} Season XP</b><span>${data.level_progress}/${data.xp_per_level} до LVL ${Math.min(season.max_level,data.current_level+1)}</span></div>
          <div class="season85-xp-track"><i style="width:${progress}%"></i><b style="left:${progress}%"></b></div>
        </div>
        <div class="season85-ready"><strong>${availableRewards.length}</strong><span>доступно</span></div>
      </section>

      <div class="season85-title"><div><span>REWARD ROAD</span><h2>Доріжка нагород</h2></div><div><button onclick="season85Scroll(-1)">←</button><button onclick="season85Scroll(1)">→</button></div></div>

      <section class="season85-road-wrap">
        <div class="season85-track-labels"><span>FREE</span><span>ELITE</span></div>
        <div class="season85-road">
          ${data.rewards.map((reward,index)=>season85RewardCard(reward,data,index%2===0?'FREE':'ELITE')).join('')}
          ${ultimate?`<article class="season85-ultimate" onclick="season85Preview(${ultimate.id})"><span>ULTIMATE PRIZE</span><div>${ultimate.icon}</div><h3>${esc(ultimate.title)}</h3><strong>LVL ${ultimate.level}</strong></article>`:''}
        </div>
      </section>

      <div class="season85-title"><div><span>SEASON QUESTS</span><h2>Місії сезону</h2></div><small>Заробляй Season XP</small></div>
      <div class="season85-missions">
        ${data.missions.map(mission=>{
          const pct=Math.min(100,Number(mission.progress||0)/Number(mission.target_value||1)*100);
          const ready=mission.progress>=mission.target_value&&!mission.claimed;
          const icon=mission.mission_type==='tasks'?'▤':mission.mission_type==='games'?'✦':mission.mission_type==='friends'?'♟':'⚡';
          return `<article class="season85-mission ${ready?'ready':''} ${mission.claimed?'claimed':''}"><div class="season85-mission-icon">${icon}</div><div><span>+${mission.season_xp_reward} XP</span><h3>${esc(mission.title)}</h3><p>${esc(mission.description)}</p><div class="season85-mission-track"><i style="width:${pct}%"></i></div><small>${mission.progress}/${mission.target_value}</small></div><button onclick="claimSeasonMission(${mission.id})" ${ready?'':'disabled'}>${mission.claimed?'✓':ready?'Забрати':`${Math.round(pct)}%`}</button></article>`;
        }).join('')}
      </div>
    </section>`;

  startSeasonTimer(data.seconds_remaining);
  addCrispMotion();
  setupMotionForPage();
  requestAnimationFrame(()=>document.querySelector('.season85-reward.current')?.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'}));
}

function startSeasonTimer(seconds){
  const element=document.getElementById('seasonTimer');
  if(!element)return;
  const timer=setInterval(()=>{
    seconds=Math.max(0,seconds-60);
    element.textContent=seasonCountdown(seconds);
    if(seconds<=0){clearInterval(timer);seasonPage()}
  },60000);
}

async function claimSeasonMission(id){
  try{
    const result=await api(`/api/season/missions/${id}/claim`,{method:'POST'});
    cinematicWin('season');
    toast(`+${result.season_xp_reward} Season XP`);
    seasonPage();
  }catch(error){toast(error.message)}
}

async function claimSeasonReward(id){
  try{
    const reward=window.__season85Rewards?.find(item=>Number(item.id)===Number(id));
    const old=me.balance;
    const result=await api(`/api/season/rewards/${id}/claim`,{method:'POST'});
    me.balance=result.balance;
    motionBalanceUpdate(old,result.balance);
    season85Reveal(reward?.title||'Сезонна нагорода',result.reward_value,reward?.icon||'⚡',reward?season85RewardRarity(reward):'rare');
    seasonPage();
  }catch(error){toast(error.message)}
}

async function claimAllSeasonRewards(){
  try{
    const old=me.balance;
    const result=await api('/api/season/rewards/claim-all',{method:'POST'});
    me.balance=result.balance;
    motionBalanceUpdate(old,result.balance);
    season85Reveal(`${result.claimed_count} нагород`,result.reward_value,'♛','ultimate');
    toast(`Отримано ${result.claimed_count} нагород`);
    seasonPage();
  }catch(error){toast(error.message)}
}

function goProfileSection(id){
  const section=document.getElementById(id);
  const main=document.querySelector("main");
  if(!section||!main)return;

  const mainRect=main.getBoundingClientRect();
  const sectionRect=section.getBoundingClientRect();
  const target=main.scrollTop+(sectionRect.top-mainRect.top)-16;
  main.scrollTo({top:target,behavior:"smooth"});

  section.classList.remove("profile5-section-flash");
  void section.offsetWidth;
  section.classList.add("profile5-section-flash");
  setTimeout(()=>section.classList.remove("profile5-section-flash"),900);
}


function adminGameLabel(key){
  return gameName(key)||key;
}

function adminTime(timestamp){
  if(!timestamp)return "—";
  return new Date(timestamp*1000).toLocaleString("uk-UA");
}

async function adminPanelPage(){
  content.innerHTML=`<div class="loader"></div>`;

  const [dashboard,users,orders,tasks,gifts]=await Promise.all([
    api("/api/admin/dashboard"),
    api("/api/admin/users"),
    api("/api/admin/orders"),
    api("/api/admin/tasks"),
    api("/api/admin/gifts")
  ]);

  window.adminUsersCache=users;
  window.adminOrdersCache=orders;
  window.adminTasksCache=tasks;
  window.adminGiftsCache=gifts;

  const maxGamePlays=Math.max(1,...dashboard.game_stats.map(item=>item.plays));
  const maxLedger=Math.max(
    1,
    ...dashboard.ledger_days.map(item=>Math.max(item.issued,item.spent))
  );

  content.innerHTML=`
    <section class="admin6-hero">
      <div class="admin6-grid"></div>
      <div class="admin6-copy">
        <span>REFERHUB CONTROL CENTER</span>
        <h1>Admin Panel PRO</h1>
        <p>Користувачі, економіка, замовлення, контент і модерація в одному місці.</p>
        <div class="admin6-live">
          <i></i>
          <b>${dashboard.active_today}</b>
          <span>активних сьогодні</span>
        </div>
      </div>
      <div class="admin6-shield">
        <span>🛡️</span>
        <i></i>
      </div>
    </section>

    <nav class="admin6-tabs">
      <button class="active" onclick="showAdmin6Tab('overview',this)">Огляд</button>
      <button onclick="showAdmin6Tab('users',this)">Користувачі</button>
      <button onclick="showAdmin6Tab('orders',this)">Замовлення</button>
      <button onclick="showAdmin6Tab('tasks',this)">Завдання</button>
      <button onclick="showAdmin6Tab('shop',this)">Магазин</button>
    </nav>

    <section id="admin6-overview" class="admin6-tab active">
      <div class="admin6-stat-grid">
        <article><span>Усього людей</span><strong>${dashboard.total_users}</strong><small>${dashboard.active_week} активних за 7 днів</small></article>
        <article><span>Баланс системи</span><strong>${dashboard.total_balance}</strong><small>RH у користувачів</small></article>
        <article><span>Видано сьогодні</span><strong>+${dashboard.issued_today}</strong><small>RH</small></article>
        <article><span>Витрачено сьогодні</span><strong>-${dashboard.spent_today}</strong><small>RH</small></article>
        <article><span>Ігрових сесій</span><strong>${dashboard.total_games}</strong><small>за весь час</small></article>
        <article><span>Очікує обробки</span><strong>${dashboard.pending_orders}</strong><small>замовлень</small></article>
        <article><span>Активних завдань</span><strong>${dashboard.active_tasks}</strong><small>зараз</small></article>
        <article><span>Заблоковано</span><strong>${dashboard.banned_users}</strong><small>користувачів</small></article>
      </div>

      <div class="admin6-section-title">
        <div><span>ECONOMY</span><h2>Рух RH за 7 днів</h2></div>
      </div>
      <div class="admin6-chart-card">
        <div class="admin6-chart-legend">
          <span><i class="issued"></i> Видано</span>
          <span><i class="spent"></i> Витрачено</span>
        </div>
        <div class="admin6-ledger-chart">
          ${dashboard.ledger_days.map(item=>`
            <div>
              <span>${item.day.slice(5)}</span>
              <div class="admin6-bars">
                <i class="issued" style="height:${Math.max(5,item.issued/maxLedger*100)}%"></i>
                <i class="spent" style="height:${Math.max(5,item.spent/maxLedger*100)}%"></i>
              </div>
            </div>`).join("")}
        </div>
      </div>

      <div class="admin6-section-title">
        <div><span>GAMES</span><h2>Популярність ігор</h2></div>
      </div>
      <div class="admin6-game-stats">
        ${dashboard.game_stats.map(item=>`
          <article>
            <div class="admin6-game-icon">${gameIcon(item.game_key)}</div>
            <div class="grow">
              <div><b>${adminGameLabel(item.game_key)}</b><span>${item.plays} ігор</span></div>
              <div class="admin6-game-track"><i style="width:${item.plays/maxGamePlays*100}%"></i></div>
              <small>Видано ${item.rewards} RH</small>
            </div>
          </article>`).join("")}
      </div>

      <div class="admin6-two-column">
        <div>
          <div class="admin6-section-title">
            <div><span>NEW USERS</span><h2>Нові користувачі</h2></div>
          </div>
          <div class="admin6-list">
            ${dashboard.recent_users.map(item=>`
              <button onclick="openAdminUser(${item.telegram_id})">
                <span class="admin6-user-avatar">${esc(item.first_name?.[0]||"U")}</span>
                <div class="grow">
                  <b>${esc(item.first_name||"Користувач")}</b>
                  <small>${item.username?"@"+esc(item.username):item.telegram_id}</small>
                </div>
                <strong>${item.balance} RH</strong>
              </button>`).join("")}
          </div>
        </div>

        <div>
          <div class="admin6-section-title">
            <div><span>RECENT ORDERS</span><h2>Останні замовлення</h2></div>
          </div>
          <div class="admin6-list">
            ${dashboard.recent_orders.map(item=>`
              <button onclick="showAdmin6Tab('orders',document.querySelector('.admin6-tabs button:nth-child(3)'))">
                <span class="admin6-user-avatar">📦</span>
                <div class="grow">
                  <b>${esc(item.gift_title||"Подарунок")}</b>
                  <small>${esc(item.first_name||String(item.user_id))}</small>
                </div>
                <strong>${esc(item.status)}</strong>
              </button>`).join("")}
          </div>
        </div>
      </div>
    </section>

    <section id="admin6-users" class="admin6-tab">
      <div class="admin6-section-title">
        <div><span>USERS</span><h2>Керування користувачами</h2></div>
        <small>${users.length}</small>
      </div>
      <div class="admin6-search">
        <span>⌕</span>
        <input id="admin6UserSearch" placeholder="Ім’я, username або Telegram ID..." oninput="filterAdminUsers()">
      </div>
      <div id="admin6UsersList" class="admin6-users-table">
        ${users.map(item=>`
          <article class="admin444-user-item" data-admin-user-search="${esc(`${item.first_name||""} ${item.username||""} ${item.telegram_id}`.toLowerCase())}" onclick="if(!event.target.closest('button'))openAdminUser(${item.telegram_id})">
            <div class="admin6-user-avatar">${esc(item.first_name?.[0]||"U")}</div>
            <div class="grow">
              <b>${esc(item.first_name||"Користувач")}</b>
              <small>${item.username?"@"+esc(item.username):item.telegram_id}</small>
            </div>
            <div class="admin6-user-balance"><strong>${item.balance}</strong><span>RH</span></div>
            <span class="admin6-status ${item.is_banned?"banned":"active"}">${item.is_banned?"BAN":"ACTIVE"}</span>
            <button onclick="openAdminUser(${item.telegram_id})">Керувати</button>
          </article>`).join("")}
      </div>
    </section>

    <section id="admin6-orders" class="admin6-tab">
      <div class="admin6-section-title">
        <div><span>ORDERS</span><h2>Замовлення</h2></div>
        <small>${orders.length}</small>
      </div>
      <div class="admin6-orders-grid">
        ${orders.map(order=>`
          <article>
            <div class="admin6-order-top">
              <span>#${order.id}</span>
              <b>${esc(order.status)}</b>
            </div>
            <h3>${esc(order.gift_title||order.title||"Подарунок")}</h3>
            <p>Користувач: ${order.user_id}</p>
            <div class="admin6-order-meta">
              <span>${order.price||0} RH</span>
              <small>${adminTime(order.created_at)}</small>
            </div>
            <select onchange="updateAdminOrderStatus(${order.id},this.value)">
              ${["new","pending","approved","sent","completed","cancelled"].map(status=>`
                <option value="${status}" ${String(order.status).toLowerCase()===status?"selected":""}>${status}</option>`).join("")}
            </select>
          </article>`).join("")}
      </div>
    </section>

    <section id="admin6-tasks" class="admin6-tab">
      <div class="admin6-section-title">
        <div><span>TASKS</span><h2>Завдання</h2></div>
        <button onclick="openAdminTaskCreator()">+ Створити</button>
      </div>
      <div id="admin6TaskCreator" class="admin441-creator" hidden>
        <div class="admin6-section-title">
          <div><span>NEW TASK</span><h2>Нове завдання</h2></div>
          <button onclick="document.getElementById('admin6TaskCreator').hidden=true">×</button>
        </div>
        <input id="admin441Title" placeholder="Назва">
        <textarea id="admin441Description" placeholder="Опис"></textarea>
        <div class="admin441-grid">
          <input id="admin441Reward" type="number" value="10" min="0" placeholder="RH">
          <input id="admin441Icon" value="⭐" placeholder="Іконка">
        </div>
        <div class="admin441-grid">
          <select id="admin441Verification">
            <option value="visit">Перехід + таймер</option>
            <option value="telegram_member">Підписка Telegram</option>
            <option value="referral">Запрошений друг</option>
            <option value="instant">Миттєве</option>
          </select>
          <input id="admin441Wait" type="number" value="5" min="0" placeholder="Очікування, сек">
        </div>
        <input id="admin441Link" placeholder="Посилання">
        <input id="admin441Chat" placeholder="@канал / chat_id для Telegram-перевірки">
        <button class="primary full" onclick="createAdmin441Task()">СТВОРИТИ ЗАВДАННЯ</button>
      </div>

      <div class="admin6-content-grid">
        ${tasks.map(task=>`
          <article>
            <div class="admin6-content-icon">📋</div>
            <div class="grow">
              <b>${esc(task.title)}</b>
              <p>${esc(task.description||"")}</p>
              <small>${task.reward} RH • ${task.is_active?"Активне":"Вимкнено"}</small>
            </div>
            <button onclick="toggleAdminTask(${task.id},${task.is_active?0:1})">${task.is_active?"Вимкнути":"Увімкнути"}</button>
          </article>`).join("")}
      </div>
    </section>

    <section id="admin6-shop" class="admin6-tab">
      <div class="admin6-section-title">
        <div><span>SHOP</span><h2>Товари</h2></div>
        <button onclick="openAdminGiftCreator()">+ Додати</button>
      </div>
      <div class="admin6-content-grid">
        ${gifts.map(gift=>`
          <article>
            <div class="admin6-content-icon">${gift.image_url?`<img src="${esc(gift.image_url)}">`:"🎁"}</div>
            <div class="grow">
              <b>${esc(gift.title)}</b>
              <p>${esc(gift.category||"Інше")}</p>
              <small>${gift.price} RH • залишок ${gift.stock||"∞"}</small>
            </div>
            <button onclick="editAdminGift(${gift.id})">Редагувати</button>
          </article>`).join("")}
      </div>
    </section>
  `;

  addCrispMotion();
  setupMotionForPage();
}

function showAdmin6Tab(name,button){
  document.querySelectorAll(".admin6-tab").forEach(tab=>tab.classList.remove("active"));
  document.querySelector(`#admin6-${name}`)?.classList.add("active");
  document.querySelectorAll(".admin6-tabs button").forEach(item=>item.classList.remove("active"));
  button?.classList.add("active");
  document.querySelector("main")?.scrollTo({top:0,behavior:"smooth"});
}

function filterAdminUsers(){
  const query=(document.getElementById("admin6UserSearch")?.value||"").trim().toLowerCase();
  document.querySelectorAll("[data-admin-user-search]").forEach(item=>{
    item.style.display=!query||item.dataset.adminUserSearch.includes(query)?"":"none";
  });
}

async function openAdminUser444(id){
  try{
    content.innerHTML=`<div class="loader"></div>`;
    const data=await api(`/api/admin/users/${id}`);
    const user=data.profile||{};
    const history=Array.isArray(data.history)?data.history:[];
    const orders=Array.isArray(data.orders)?data.orders:[];
    const achievements=Array.isArray(data.achievements)?data.achievements:[];

    content.innerHTML=`
      <section class="admin444-user-page">
        <button class="admin444-back" onclick="adminPanelPage().then(()=>setTimeout(()=>showAdmin6Tab('users',document.querySelector('.admin6-tabs button:nth-child(2)')),60))">← Учасники</button>

        <section class="admin444-user-hero">
          <div class="admin444-avatar">${esc((user.first_name||user.username||"U").slice(0,1).toUpperCase())}</div>
          <div class="grow">
            <span>USER CONTROL</span>
            <h1>${esc(user.first_name||"Користувач")}</h1>
            <p>${user.username?"@"+esc(user.username):"Без username"} · ID ${user.telegram_id}</p>
          </div>
          <div class="admin444-state ${user.is_banned?"banned":"active"}">${user.is_banned?"BANNED":"ACTIVE"}</div>
        </section>

        <section class="admin444-stats">
          <article><small>БАЛАНС</small><b>${Number(user.balance||0)} RH</b></article>
          <article><small>XP</small><b>${Number(user.xp||0)}</b></article>
          <article><small>ЗАРОБЛЕНО</small><b>${Number(user.total_earned||0)} RH</b></article>
          <article><small>РЕФЕРАЛИ</small><b>${Number(user.referrals_count||0)}</b></article>
        </section>

        <section class="admin444-control">
          <div class="admin6-section-title">
            <div><span>BALANCE CONTROL</span><h2>Керування балансом</h2></div>
          </div>
          <div class="admin444-balance-row">
            <input id="admin444BalanceAmount" type="number" min="1" value="100">
            <input id="admin444BalanceNote" placeholder="Причина зміни" value="Admin Panel">
          </div>
          <div class="admin444-balance-buttons">
            <button class="plus" onclick="admin444Balance(${user.telegram_id},1)">+ ДОДАТИ RH</button>
            <button class="minus" onclick="admin444Balance(${user.telegram_id},-1)">− ЗНЯТИ RH</button>
          </div>
        </section>

        <section class="admin444-control admin411-level-control">
          <div class="admin6-section-title">
            <div><span>LEVEL & XP</span><h2>Рівень і досвід</h2></div>
          </div>

          <div class="admin411-level-current">
            <article><small>ПОТОЧНИЙ РІВЕНЬ</small><b>${Number(user.level||1)}</b></article>
            <article><small>ПОТОЧНИЙ XP</small><b>${Number(user.xp||0)}</b></article>
          </div>

          <div class="admin411-level-grid">
            <div>
              <label>Встановити рівень</label>
              <input id="admin411LevelValue" type="number" min="1" value="${Number(user.level||1)}">
              <button onclick="admin411SetLevel(${user.telegram_id})">ЗБЕРЕГТИ РІВЕНЬ</button>
            </div>

            <div>
              <label>Змінити XP</label>
              <input id="admin411XpValue" type="number" value="100" placeholder="+100 або -100">
              <button onclick="admin411ChangeXp(${user.telegram_id})">ЗМІНИТИ XP</button>
            </div>
          </div>
        </section>

        <section class="admin444-control">
          <div class="admin6-section-title">
            <div><span>MODERATION</span><h2>Модерація</h2></div>
          </div>
          <button class="admin444-ban ${user.is_banned?"unban":""}" onclick="admin444Ban(${user.telegram_id},${user.is_banned?0:1})">
            ${user.is_banned?"✓ РОЗБЛОКУВАТИ КОРИСТУВАЧА":"⛔ ЗАБЛОКУВАТИ КОРИСТУВАЧА"}
          </button>
        </section>

        <section class="admin444-tabs">
          <button class="active" onclick="admin444Switch('history',this)">Історія</button>
          <button onclick="admin444Switch('orders',this)">Замовлення</button>
          <button onclick="admin444Switch('achievements',this)">Досягнення</button>
        </section>

        <section id="admin444-history" class="admin444-panel active">
          ${history.length?history.map(item=>`
            <article class="admin444-row">
              <span class="${Number(item.amount)>=0?"plus":"minus"}">${Number(item.amount)>=0?"+":""}${Number(item.amount)} RH</span>
              <div><b>${esc(item.note||"Операція")}</b><small>${adminTime(item.created_at)}</small></div>
            </article>`).join(""):`<div class="admin444-empty">Історія порожня</div>`}
        </section>

        <section id="admin444-orders" class="admin444-panel">
          ${orders.length?orders.map(item=>`
            <article class="admin444-row">
              <span>📦</span>
              <div><b>${esc(item.emoji||"🎁")} ${esc(item.title||"Подарунок")}</b><small>${esc(item.status||"—")} · ${Number(item.price||0)} RH · ${adminTime(item.created_at)}</small></div>
            </article>`).join(""):`<div class="admin444-empty">Замовлень немає</div>`}
        </section>

        <section id="admin444-achievements" class="admin444-panel">
          ${achievements.length?achievements.map(item=>`
            <article class="admin444-row">
              <span>${esc(item.icon||"🏆")}</span>
              <div><b>${esc(item.title||"Досягнення")}</b><small>${item.unlocked?"Відкрито":"Не відкрито"} · +${Number(item.reward||0)} RH</small></div>
            </article>`).join(""):`<div class="admin444-empty">Досягнень немає</div>`}
        </section>
      </section>
    `;
    document.querySelector("main")?.scrollTo({top:0,behavior:"auto"});
  }catch(error){
    const message=error?.message||"Не вдалося відкрити користувача";
    content.innerHTML=`
      <section class="admin445-error">
        <span>⚠️</span>
        <h2>Не вдалося відкрити учасника</h2>
        <p>${esc(message)}</p>
        <button onclick="adminPanelPage().then(()=>setTimeout(()=>showAdmin6Tab('users',document.querySelector('.admin6-tabs button:nth-child(2)')),60))">← Назад до учасників</button>
      </section>`;
    toast(message,"error");
  }
}

function admin444Switch(name,button){
  document.querySelectorAll(".admin444-panel").forEach(x=>x.classList.remove("active"));
  document.getElementById(`admin444-${name}`)?.classList.add("active");
  document.querySelectorAll(".admin444-tabs button").forEach(x=>x.classList.remove("active"));
  button?.classList.add("active");
}

async function admin444Balance(userId,direction){
  const amount=Math.abs(Number(document.getElementById("admin444BalanceAmount")?.value||0))*direction;
  const note=(document.getElementById("admin444BalanceNote")?.value||"Admin Panel").trim();
  if(!amount)return toast("Вкажи суму","error");
  try{
    const result=await api(`/api/admin/users/${userId}/balance`,{
      method:"POST",
      body:JSON.stringify({amount,note})
    });
    toast(`Баланс: ${result.balance} RH`,"success");
    await openAdminUser(userId);
  }catch(error){toast(error.message,"error")}
}


async function admin411SetLevel(userId){
  const level=Math.max(1,Math.floor(Number(document.getElementById("admin411LevelValue")?.value||0)));
  if(!level)return toast("Вкажи рівень","error");

  try{
    const result=await api(`/api/admin/users/${userId}/level`,{
      method:"POST",
      body:JSON.stringify({
        level,
        note:"Рівень змінено через Admin Center"
      })
    });
    toast(`Рівень встановлено: ${result.level??level}`,"success");
    await openAdminUser(userId);
  }catch(error){
    toast(error.message,"error");
  }
}

async function admin411ChangeXp(userId){
  const amount=Math.trunc(Number(document.getElementById("admin411XpValue")?.value||0));
  if(!amount)return toast("Вкажи кількість XP","error");

  try{
    const result=await api(`/api/admin/users/${userId}/xp`,{
      method:"POST",
      body:JSON.stringify({
        amount,
        note:"XP змінено через Admin Center"
      })
    });
    toast(`XP оновлено: ${result.xp??"готово"}`,"success");
    await openAdminUser(userId);
  }catch(error){
    toast(error.message,"error");
  }
}

async function admin444Ban(userId,isBanned){
  try{
    await api(`/api/admin/users/${userId}/ban`,{
      method:"PATCH",
      body:JSON.stringify({is_banned:Boolean(isBanned)})
    });
    toast(isBanned?"Користувача заблоковано":"Користувача розблоковано","success");
    await openAdminUser(userId);
  }catch(error){toast(error.message,"error")}
}


async function createAdmin441Task(){
  try{
    const verification=document.getElementById("admin441Verification")?.value||"visit";
    await api("/api/admin/tasks",{
      method:"POST",
      body:JSON.stringify({
        title:(document.getElementById("admin441Title")?.value||"").trim(),
        description:(document.getElementById("admin441Description")?.value||"").trim(),
        reward:Number(document.getElementById("admin441Reward")?.value||0),
        icon:(document.getElementById("admin441Icon")?.value||"⭐").trim(),
        category:"other",
        verification_type:verification,
        link:(document.getElementById("admin441Link")?.value||"").trim()||null,
        telegram_chat_id:(document.getElementById("admin441Chat")?.value||"").trim()||null,
        wait_seconds:Number(document.getElementById("admin441Wait")?.value||0),
        sort_order:0,
        max_claims:0,
        starts_at:0,
        ends_at:0
      })
    });
    toast("Завдання створено");
    await adminPanelPage();
    setTimeout(()=>showAdmin6Tab("tasks",document.querySelector('.admin6-tabs button:nth-child(4)')),100);
  }catch(error){toast(error.message,"error")}
}

async function adminBalanceChange(userId,direction){
  const amount=Math.abs(Number(document.getElementById("admin6BalanceAmount")?.value||0))*direction;
  if(!amount)return toast("Вкажи суму");

  try{
    await api(`/api/admin/users/${userId}/balance`,{
      method:"POST",
      body:JSON.stringify({amount,note:"Admin Panel PRO"})
    });
    document.querySelector(".admin6-modal")?.remove();
    toast("Баланс оновлено");
    adminPanelPage();
  }catch(error){toast(error.message)}
}

async function adminBanUser(userId,isBanned){
  try{
    await api(`/api/admin/users/${userId}/ban`,{
      method:"PATCH",
      body:JSON.stringify({is_banned:Boolean(isBanned)})
    });
    document.querySelector(".admin6-modal")?.remove();
    toast(isBanned?"Користувача заблоковано":"Користувача розблоковано");
    adminPanelPage();
  }catch(error){toast(error.message)}
}

async function updateAdminOrderStatus(orderId,status){
  try{
    await api(`/api/admin/orders/${orderId}`,{
      method:"PATCH",
      body:JSON.stringify({status})
    });
    toast("Статус оновлено");
  }catch(error){toast(error.message)}
}

function openAdminTaskCreator(){
  showAdmin6Tab("tasks",document.querySelector('.admin6-tabs button:nth-child(4)'));
  const host=document.getElementById("admin6TaskCreator");
  if(host){ host.hidden=false; host.scrollIntoView({behavior:"smooth",block:"start"}); }
}

function openAdminGiftCreator(){
  openPage("admin");
  setTimeout(()=>showAdmin6Tab("shop",document.querySelector('.admin6-tabs button:nth-child(5)')),120);
  toast("Керування товарами відкрито");
}

async function toggleAdminTask(id,isActive){
  try{
    if(isActive){
      await api(`/api/admin/tasks/${id}/restore`,{method:"POST"});
    }else{
      await api(`/api/admin/tasks/${id}`,{method:"DELETE"});
    }
    toast(isActive?"Завдання увімкнено":"Завдання вимкнено");
    adminPanelPage();
  }catch(error){toast(error.message,"error")}
}

function editAdminGift(id){
  openPage("admin");
  setTimeout(()=>showAdmin6Tab("shop",document.querySelector('.admin6-tabs button:nth-child(5)')),120);
  toast(`Товар #${id} — відкрито розділ магазину`);
}


const profile2Backgrounds=[
  {key:"forest",name:"Ancient Forest",icon:"🌿",unlock:1},
  {key:"galaxy",name:"Galaxy Prime",icon:"🌌",unlock:3},
  {key:"royal",name:"Royal Hall",icon:"👑",unlock:5},
  {key:"aurora",name:"Aurora Sky",icon:"✨",unlock:7},
  {key:"crystal",name:"Crystal Cave",icon:"💎",unlock:10},
  {key:"ember",name:"Ember Throne",icon:"🔥",unlock:14}
];

function getProfile2Background(){
  return localStorage.getItem("referhub_profile_background")||"forest";
}

function setProfile2Background(key){
  const item=profile2Backgrounds.find(bg=>bg.key===key);
  if(!item)return;
  if(me.level.number<item.unlock){toast(`Відкриється на LVL ${item.unlock}`);return;}
  localStorage.setItem("referhub_profile_background",key);
  const hero=document.querySelector(".profile2-hero");
  if(hero){
    hero.dataset.profileBackground=key;
    hero.style.setProperty("--profile2-bg",`url('/static/assets/profile-backgrounds/${key}.svg')`);
  }
  document.querySelectorAll(".profile2-bg-option").forEach(node=>node.classList.toggle("selected",node.dataset.bg===key));
  toast(`Фон «${item.name}» застосовано`);
}

function profile2Medals(profilePro,achievements){
  const medals=[];
  if(profilePro.account_age_days>=30)medals.push({icon:"🛡️",title:"Veteran",text:"30+ днів у ReferHub"});
  if(me.referrals_count>=10)medals.push({icon:"👥",title:"Referral King",text:"10+ друзів"});
  if(profilePro.games_won>=25)medals.push({icon:"🎰",title:"Lucky",text:"25+ перемог"});
  if(me.balance>=1000)medals.push({icon:"💎",title:"Collector",text:"1000+ RH на балансі"});
  if(achievements.filter(item=>item.unlocked).length>=5)medals.push({icon:"🏆",title:"Champion",text:"5+ досягнень"});
  if(profilePro.tasks_completed>=20)medals.push({icon:"⚡",title:"Active",text:"20+ завдань"});
  return medals.length?medals:[{icon:"🌟",title:"Rising Star",text:"Твоя історія лише починається"}];
}

function profile2BackgroundOptions(){
  const active=getProfile2Background();
  return profile2Backgrounds.map(bg=>`
    <button class="profile2-bg-option ${active===bg.key?"selected":""}" data-bg="${bg.key}"
      onclick="setProfile2Background('${bg.key}')" ${me.level.number<bg.unlock?"disabled":""}>
      <i style="background-image:url('/static/assets/profile-backgrounds/${bg.key}.svg')"></i>
      <span>${bg.icon} ${bg.name}</span>
      <small>${me.level.number>=bg.unlock?(active===bg.key?"Активний":"Обрати"):`LVL ${bg.unlock}`}</small>
    </button>`).join("");
}


function frame92Rarity(frame){
  const level=Number(frame.min_level||1);
  if(level>=18)return {key:"divine",label:"DIVINE",stars:5};
  if(level>=14)return {key:"mythic",label:"MYTHIC",stars:5};
  if(level>=9)return {key:"legendary",label:"LEGENDARY",stars:4};
  if(level>=5)return {key:"epic",label:"EPIC",stars:3};
  return {key:"rare",label:"RARE",stars:2};
}

function frame92Meta(key){
  const map={
    violet:{power:"Arcane Glow",effect:"Фіолетова енергія",symbol:"◆"},
    tree:{power:"Nature Pulse",effect:"Живі гілки та листя",symbol:"❦"},
    horned:{power:"Demon Core",effect:"Роги та темне полум’я",symbol:"♠"},
    angel:{power:"Divine Wings",effect:"Світлі крила й пір’я",symbol:"✦"},
    dragon:{power:"Dragon Soul",effect:"Луска та вогняна аура",symbol:"♛"},
    frost:{power:"Frozen Crown",effect:"Крига й холодні кристали",symbol:"❄"},
    crown:{power:"Royal Legacy",effect:"Золота корона та сяйво",symbol:"♚"},
    galaxy:{power:"Cosmic Rift",effect:"Зорі та космічна пилюка",symbol:"✧"},
    sakura:{power:"Bloom Spirit",effect:"Пелюстки сакури",symbol:"✿"},
    mythic:{power:"Mythic Force",effect:"Руни та міфічна енергія",symbol:"◈"},
    founder:{power:"Founder Mark",effect:"Ексклюзивний знак засновника",symbol:"R"}
  };
  return map[key]||{power:"Profile Aura",effect:"Унікальний ефект рамки",symbol:"◇"};
}

function frame92Filter(rarity,button){
  document.querySelectorAll(".frame92-filters button").forEach(node=>node.classList.remove("active"));
  button?.classList.add("active");
  document.querySelectorAll(".frame92-card").forEach(card=>{
    card.hidden=rarity!=="all"&&card.dataset.rarity!==rarity;
  });
}

function openFrame92Preview(key){
  const frame=(window.__frame92Catalog||[]).find(item=>item.key===key);
  if(!frame)return;
  const rarity=frame92Rarity(frame);
  const meta=frame92Meta(frame.key);
  const unlocked=Number(me.level.number)>=Number(frame.min_level||1);
  const active=me.profile_frame===frame.key;
  document.querySelector(".frame92-modal")?.remove();
  const modal=document.createElement("div");
  modal.className=`frame92-modal rarity-${rarity.key}`;
  modal.innerHTML=`
    <div class="frame92-modal-backdrop" onclick="this.closest('.frame92-modal').remove()"></div>
    <section class="frame92-modal-card">
      <button class="frame92-close" onclick="this.closest('.frame92-modal').remove()">×</button>
      <div class="frame92-stage skin-${esc(frame.key)}">
        <div class="frame92-stage-aura"></div>
        <div class="frame92-avatar">${profileAvatar()}</div>
        <img src="${profileFrameAsset(frame.key)}" alt="${esc(frame.name)}">
        <div class="frame92-stage-particles">${Array.from({length:18},(_,i)=>`<i style="--f92:${i}"></i>`).join("")}</div>
        <span class="frame92-symbol">${meta.symbol}</span>
      </div>
      <div class="frame92-modal-copy">
        <span class="frame92-rarity">${rarity.label}</span>
        <h2>${esc(frame.name)}</h2>
        <p>${esc(meta.effect)}</p>
        <div class="frame92-stars">${"★".repeat(rarity.stars)}${"☆".repeat(5-rarity.stars)}</div>
        <div class="frame92-specs">
          <div><small>Сила рамки</small><strong>${esc(meta.power)}</strong></div>
          <div><small>Відкриття</small><strong>LVL ${frame.min_level}</strong></div>
          <div><small>Статус</small><strong>${active?"Активна":unlocked?"Доступна":"Закрита"}</strong></div>
        </div>
        <button class="frame92-apply" ${!unlocked||active?"disabled":""}
          onclick="selectProfileFrame('${frame.key}');this.closest('.frame92-modal').remove()">
          ${active?"Використовується":unlocked?"Застосувати рамку":`Потрібен LVL ${frame.min_level}`}
        </button>
      </div>
    </section>`;
  document.body.appendChild(modal);
  requestAnimationFrame(()=>modal.classList.add("show"));
  if(window.polish91Prefs?.haptics!==false)tg?.HapticFeedback?.impactOccurred?.("medium");
}

const profileXTitleCatalog=[
  {key:"newcomer",name:"Новий учасник",minLevel:1,icon:"◆"},
  {key:"seeker",name:"Мисливець за нагородами",minLevel:2,icon:"◇"},
  {key:"master",name:"Елітний майстер",minLevel:4,icon:"✦"},
  {key:"legend",name:"Легенда ReferHub",minLevel:5,icon:"♛"},
  {key:"veteran",name:"Ветеран спільноти",minLevel:10,icon:"★"}
];

function profileXPower(profilePro,unlockedCount){
  return Math.round(
    Number(me.level?.number||1)*180+
    Number(me.referrals_count||0)*65+
    Number(profilePro.games_won||0)*18+
    Number(unlockedCount||0)*140+
    Math.min(2500,Number(me.balance||0)/4)
  );
}

function getProfileXTitle(){
  const saved=localStorage.getItem("referhub_profile_title");
  const allowed=profileXTitleCatalog.filter(item=>Number(me.level?.number||1)>=item.minLevel);
  return allowed.find(item=>item.key===saved)||allowed[allowed.length-1]||profileXTitleCatalog[0];
}

function setProfileXTitle(key){
  const item=profileXTitleCatalog.find(entry=>entry.key===key);
  if(!item||Number(me.level?.number||1)<item.minLevel){
    toast("Цей титул ще не відкритий","error");
    return;
  }
  localStorage.setItem("referhub_profile_title",key);
  document.querySelectorAll(".px94-title-option").forEach(node=>node.classList.toggle("active",node.dataset.title===key));
  const active=document.getElementById("px94ActiveTitle");
  if(active)active.innerHTML=`<i>${item.icon}</i>${esc(item.name)}`;
  toast("Титул застосовано","success");
}

function openProfileXTitleStudio(){
  document.querySelector(".px94-title-modal")?.remove();
  const active=getProfileXTitle();
  const modal=document.createElement("div");
  modal.className="px94-title-modal";
  modal.innerHTML=`
    <div class="px94-modal-backdrop" onclick="this.closest('.px94-title-modal').remove()"></div>
    <section class="px94-title-card">
      <button class="px94-close" onclick="this.closest('.px94-title-modal').remove()">×</button>
      <span>TITLE STUDIO</span><h2>Обери титул</h2><p>Титул показується під іменем у профілі.</p>
      <div class="px94-title-options">
        ${profileXTitleCatalog.map(item=>{
          const unlocked=Number(me.level?.number||1)>=item.minLevel;
          return `<button data-title="${item.key}" class="px94-title-option ${active.key===item.key?'active':''} ${unlocked?'':'locked'}"
            ${unlocked?`onclick="setProfileXTitle('${item.key}')"`:'disabled'}>
            <i>${item.icon}</i><div><b>${esc(item.name)}</b><small>${unlocked?'Доступно':`Потрібен LVL ${item.minLevel}`}</small></div><strong>${active.key===item.key?'✓':'›'}</strong>
          </button>`;
        }).join('')}
      </div>
    </section>`;
  document.body.appendChild(modal);
  requestAnimationFrame(()=>modal.classList.add("show"));
}

function toggleProfileXPublicPreview(){
  const page=document.querySelector(".px94-shell");
  if(!page)return;
  const enabled=page.classList.toggle("public-preview");
  document.querySelectorAll(".px94-owner-only").forEach(node=>node.hidden=enabled);
  const button=document.getElementById("px94PreviewButton");
  if(button)button.textContent=enabled?"Повернути керування":"Як бачать інші";
  toast(enabled?"Увімкнено публічний перегляд":"Режим власника повернуто","info");
}

function profileXJump(id){
  document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});
}

async function profilePage(){
  content.innerHTML=`<div class="loader"></div>`;
  const [history,achievements,tournaments,profilePro,gamesHistory]=await Promise.all([
    api("/api/history"),
    api("/api/achievements"),
    api("/api/tournaments"),
    api("/api/profile-pro"),
    api("/api/games/history")
  ]);
  window.__frame92Catalog=profilePro.available_frames||[];
  let adminBlock="";

  if(me.is_admin){
    const [summary,adminTasks,adminGifts,adminOrders,adminDashboard,adminUsers,referralsTop,adminGames,adminLogs,adminTournaments]=await Promise.all([
      api("/api/admin/summary"),
      api("/api/admin/tasks"),
      api("/api/admin/gifts"),
      api("/api/admin/orders"),
      api("/api/admin/dashboard"),
      api("/api/admin/users"),
      api("/api/admin/referrals-top"),
      api("/api/admin/games"),
      api("/api/admin/logs"),
      api("/api/admin/tournaments")
    ]);

    adminBlock=`
      ${section("Адмін-панель","Повне керування завданнями")}
      <div class="stats">
        <div class="card stat-card"><span>Користувачів</span><strong>${summary.users}</strong></div>
        <div class="card stat-card"><span>Онлайн</span><strong>${summary.online}</strong></div>
        <div class="card stat-card"><span>Завдань</span><strong>${summary.tasks}</strong></div>
        <div class="card stat-card"><span>Заявок</span><strong>${summary.orders}</strong></div>
      </div>

      ${section("Огляд адмінки","Ключові показники")}
      <div class="stats admin-stats">
        <div class="card stat-card"><span>Усього користувачів</span><strong>${adminDashboard.users}</strong></div>
        <div class="card stat-card"><span>Активні 24 год</span><strong>${adminDashboard.active_day}</strong></div>
        <div class="card stat-card"><span>Активні 7 днів</span><strong>${adminDashboard.active_week}</strong></div>
        <div class="card stat-card"><span>Заблоковано</span><strong>${adminDashboard.banned_users}</strong></div>
        <div class="card stat-card"><span>RH на балансах</span><strong>${adminDashboard.total_balance}</strong></div>
        <div class="card stat-card"><span>Усього зароблено</span><strong>${adminDashboard.total_earned}</strong></div>
        <div class="card stat-card"><span>Виконань завдань</span><strong>${adminDashboard.task_claims}</strong></div>
        <div class="card stat-card"><span>Заявок очікує</span><strong>${adminDashboard.pending_orders}</strong></div>
      </div>

      ${section("Користувачі",`${adminUsers.length} показано`)}
      <div class="card admin-search">
        <input id="adminUserSearch" placeholder="ID, ім’я або username">
        <button class="primary" onclick="searchAdminUsers()">Знайти</button>
      </div>
      <div id="adminUsersList" class="card">
        ${adminUsers.length?adminUsers.map(adminUserRow).join(""):`<div class="empty">Користувачів немає</div>`}
      </div>
      <div id="adminUserDetail"></div>

      ${section("Топ за рефералами","20 найкращих")}
      <div class="card">
        ${referralsTop.slice(0,20).map((item,index)=>`
          <div class="row">
            <div class="rank-num">${index+1}</div>
            <div class="grow">
              <b>${esc(item.first_name||item.username||String(item.telegram_id))}</b>
              <div class="muted">${item.referrals_count} друзів • ${item.referral_earned} RH ⭐</div>
            </div>
          </div>`).join("")}
      </div>

      ${section("Налаштування ігор")}
      <div class="card">
        ${adminGames.map(game=>`
          <div class="admin-game">
            <div class="row">
              <div class="feed-icon">${game.game_key==="slot"?"🎰":game.game_key==="roulette"?"🎡":"🎁"}</div>
              <div class="grow">
                <b>${gameName(game.game_key)}</b>
                <div class="muted">${game.plays_count} ігор • ставки ${game.total_bets} • виплати ${game.total_rewards}</div>
              </div>
              <button class="${game.is_active?"danger":"primary"} admin-mini" onclick="toggleAdminGame('${game.game_key}',${game.is_active?0:1})">
                ${game.is_active?"×":"↻"}
              </button>
            </div>

            <div class="admin-grid">
              <input id="gameMin${game.game_key}" type="number" value="${game.min_bet}" placeholder="Мін. ставка">
              <input id="gameMax${game.game_key}" type="number" value="${game.max_bet}" placeholder="Макс. ставка">
            </div>
            <div class="admin-grid">
              <input id="gameLimit${game.game_key}" type="number" value="${game.daily_limit}" placeholder="Ліміт на день">
              <input id="gameCooldown${game.game_key}" type="number" value="${game.cooldown_seconds}" placeholder="Кулдаун, сек">
            </div>
            <textarea id="gameConfig${game.game_key}">${esc(JSON.stringify(game.config))}</textarea>
            <button class="secondary full" onclick="saveAdminGame('${game.game_key}')">Зберегти гру</button>
          </div>`).join("")}
      </div>

      ${section("Новий промокод")}
      <div class="card admin-form">
        <input id="promoCode" placeholder="Код">
        <div class="admin-grid">
          <input id="promoDiscount" type="number" placeholder="Знижка %">
          <input id="promoUses" type="number" value="0" placeholder="Макс. використань">
        </div>
        <button class="primary full" onclick="createPromoCode()">Створити промокод</button>
      </div>

      ${section("Керування турнірами",`${adminTournaments.length}`)}
      <div class="card">
        ${adminTournaments.length?adminTournaments.map(t=>`
          <div class="admin-tournament">
            <div class="row">
              <div class="feed-icon">🏆</div>
              <div class="grow">
                <b>${esc(t.title)}</b>
                <div class="muted">
                  ${t.is_cancelled?"Скасований":t.is_finalized?"Завершений":Date.now()/1000<t.starts_at?"Запланований":"Активний"}
                  • ${t.participants_count} учасників • топ ${t.top_score}
                </div>
              </div>
              ${!t.is_finalized&&!t.is_cancelled?`
                <div class="admin-actions">
                  <button class="primary admin-mini" onclick="finishTournament(${t.id})">🏁</button>
                  <button class="danger admin-mini" onclick="cancelTournament(${t.id})">×</button>
                </div>`:""}
            </div>
          </div>`).join(""):`<div class="empty">Турнірів немає</div>`}
      </div>

      ${section("Новий турнір")}
      <div class="card admin-form">
        <input id="tourTitle" placeholder="Назва">
        <textarea id="tourDescription" placeholder="Опис"></textarea>
        <div class="admin-grid">
          <input id="tourStart" type="datetime-local">
          <input id="tourEnd" type="datetime-local">
        </div>
        <div class="admin-grid">
          <input id="tourP1" type="number" placeholder="1 місце">
          <input id="tourP2" type="number" placeholder="2 місце">
        </div>
        <input id="tourP3" type="number" placeholder="3 місце">
        <button class="primary full" onclick="createTournament()">Створити турнір</button>
      </div>

      ${section("Журнал дій адміністраторів",`${adminLogs.length} останніх`)}
      <div class="card admin-log-list">
        ${adminLogs.length?adminLogs.map(log=>`
          <div class="row">
            <div class="feed-icon">🛡️</div>
            <div class="grow">
              <b>${esc(log.admin_name||String(log.admin_id))}: ${esc(log.action)}</b>
              <div class="muted">${esc(log.details||"")}${log.target_user_id?` • користувач ${esc(log.target_name||String(log.target_user_id))}`:""}</div>
              <div class="muted">${new Date(log.created_at*1000).toLocaleString("uk-UA")}</div>
            </div>
          </div>`).join(""):`<div class="empty">Дій ще не було</div>`}
      </div>

      ${section("Створити завдання")}
      <div class="card admin-form">
        <input id="newTaskTitle" placeholder="Назва">
        <textarea id="newTaskDescription" placeholder="Опис"></textarea>

        <div class="admin-grid">
          <input id="newTaskReward" type="number" placeholder="Нагорода">
          <input id="newTaskIcon" value="⭐" placeholder="Іконка">
        </div>

        <select id="newTaskCategory">
          <option value="telegram">Telegram</option>
          <option value="youtube">YouTube</option>
          <option value="tiktok">TikTok</option>
          <option value="instagram">Instagram</option>
          <option value="discord">Discord</option>
          <option value="referral">Реферали</option>
          <option value="other">Інше</option>
        </select>

        <select id="newTaskVerification">
          <option value="visit">Посилання + таймер</option>
          <option value="telegram_member">Перевірка Telegram-підписки</option>
          <option value="referral">Перевірка реферала</option>
          <option value="instant">Миттєво</option>
        </select>

        <input id="newTaskLink" placeholder="Посилання">
        <div class="channel-check-row">
          <input id="newTaskChat" placeholder="@канал, -100... або посилання t.me">
          <button class="secondary" type="button" onclick="checkTelegramChannel('newTaskChat','newTaskChannelResult')">Перевірити</button>
        </div>
        <div id="newTaskChannelResult" class="channel-check-result"></div>

        <div class="admin-grid">
          <input id="newTaskWait" type="number" value="5" placeholder="Секунд">
          <input id="newTaskSort" type="number" value="0" placeholder="Порядок">
        </div>

        <div class="admin-grid">
          <input id="newTaskMaxClaims" type="number" value="0" placeholder="Ліміт виконань (0 = безліміт)">
          <input id="newTaskEndsAt" type="datetime-local" title="Дата завершення">
        </div>

        <button class="primary full" onclick="createAdminTask()">Додати завдання</button>
      </div>

      ${section("Усі завдання",`${adminTasks.length}`)}
      <div class="card">
        ${adminTasks.length?adminTasks.map(task=>`
          <div class="admin-task-row">
            <div class="feed-icon">${task.icon||"⭐"}</div>
            <div class="grow">
              <b>${esc(task.title)}</b>
              <div class="muted">
                ${esc(task.category)} • ${task.reward} RH ⭐ •
                ${task.claims_count} виконань •
                ${task.is_active?"активне":"архів"}
              </div>
            </div>
            <div class="admin-actions">
              <button class="secondary admin-mini" onclick="editAdminTask(${task.id})">✎</button>
              ${task.is_active
                ? `<button class="danger admin-mini" onclick="disableAdminTask(${task.id})">×</button>`
                : `<button class="primary admin-mini" onclick="restoreAdminTask(${task.id})">↻</button>`}
            </div>
          </div>`).join(""):`<div class="empty">Завдань немає</div>`}
      </div>

      <div id="taskEditor"></div>

      ${section("Створити товар")}
      <div class="card admin-form">
        <input id="newGiftTitle" placeholder="Назва товару">
        <textarea id="newGiftDescription" placeholder="Опис"></textarea>
        <div class="admin-grid">
          <input id="newGiftPrice" type="number" placeholder="Ціна RH ⭐">
          <input id="newGiftEmoji" value="🎁" placeholder="Іконка">
        </div>
        <div class="admin-grid">
          <input id="newGiftStock" type="number" value="0" placeholder="Залишок (0 = безліміт)">
          <input id="newGiftSort" type="number" value="0" placeholder="Порядок">
        </div>
        <button class="primary full" onclick="createAdminGift()">Додати товар</button>
      </div>

      ${section("Товари",`${adminGifts.length}`)}
      <div class="card">
        ${adminGifts.length?adminGifts.map(gift=>`
          <div class="admin-task-row">
            <div class="feed-icon">${gift.emoji}</div>
            <div class="grow">
              <b>${esc(gift.title)}</b>
              <div class="muted">${gift.price} RH ⭐ • ${gift.orders_count} заявок • ${gift.stock>0?gift.stock+" шт.":"безліміт"}</div>
            </div>
            <button class="${gift.is_active?"danger":"primary"} admin-mini" onclick="toggleAdminGift(${gift.id},${gift.is_active?0:1})">
              ${gift.is_active?"×":"↻"}
            </button>
          </div>`).join(""):`<div class="empty">Товарів немає</div>`}
      </div>

      ${section("Заявки на подарунки",`${adminOrders.filter(o=>o.status==="pending").length} очікують`)}
      <div class="card order-filter">
        <select id="adminOrderFilter" onchange="filterAdminOrders()">
          <option value="all">Усі заявки</option>
          <option value="pending">⏳ Очікують</option>
          <option value="processing">🛠 В обробці</option>
          <option value="completed">✅ Виконані</option>
          <option value="rejected">❌ Відхилені</option>
        </select>
      </div>
      <div id="adminOrdersList" class="card">
        ${adminOrders.length?adminOrders.map(order=>`
          <div class="admin-order" data-order-status="${order.status}">
            <div class="feed-icon">${order.emoji}</div>
            <div class="grow">
              <b>${esc(order.first_name||order.username||order.user_id)} — ${esc(order.title)}</b>
              <div class="muted">#${order.id} • ${order.price} RH ⭐ • ${orderStatus(order.status)}</div>
              ${order.admin_note?`<div class="muted">💬 ${esc(order.admin_note)}</div>`:""}
              <button class="link-button" onclick="showOrderHistory(${order.id})">
                Історія статусів (${order.status_changes||0})
              </button>
            </div>
            ${order.status==="pending"?`
              <div class="admin-actions">
                <button class="secondary admin-mini" onclick="processOrder(${order.id})">🛠</button>
                <button class="primary admin-mini" onclick="completeOrder(${order.id})">✓</button>
                <button class="danger admin-mini" onclick="rejectOrder(${order.id})">×</button>
              </div>`:order.status==="processing"?`
              <div class="admin-actions">
                <button class="primary admin-mini" onclick="completeOrder(${order.id})">✓</button>
                <button class="danger admin-mini" onclick="rejectOrder(${order.id})">×</button>
              </div>`:""}
          </div>`).join(""):`<div class="empty">Заявок немає</div>`}
      </div>
      <div id="orderHistoryBlock"></div>
    `;
  }

  const favorite=profilePro.favorite_achievement;
  const qrUrl=`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(me.referral_link)}`;
  const unlocked=achievements.filter(item=>item.unlocked);
  const mostPlayedKey=Object.entries(
    gamesHistory.reduce((acc,item)=>{
      acc[item.game_key]=(acc[item.game_key]||0)+1;
      return acc;
    },{})
  ).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const bestGame=[...gamesHistory].sort(
    (a,b)=>Number(b.reward||0)-Number(a.reward||0)
  )[0];

  const profile2Bg=getProfile2Background();
  const profile2MedalList=profile2Medals(profilePro,achievements);
  const profileXPowerValue=profileXPower(profilePro,unlocked.length);
  const profileXTitle=getProfileXTitle();
  const profileXAchievementPct=achievements.length?Math.round(unlocked.length/achievements.length*100):0;
  const profileXLeague=me.rank<=3?"LEGEND":me.rank<=10?"DIAMOND":me.rank<=25?"PLATINUM":me.rank<=50?"GOLD":"SILVER";
  const activeFrame=profilePro.available_frames.find(frame=>frame.key===me.profile_frame)||profilePro.available_frames[0];

  content.innerHTML=`
    <main class="px94-shell" data-profile-background="${profile2Bg}" style="--px94-bg:url('/static/assets/profile-backgrounds/${profile2Bg}.svg')">
      <section class="px94-hero frame-${esc(me.profile_frame||"violet")}">
        <div class="px94-hero-bg"></div>
        <div class="px94-grid-glow"></div>
        <header class="px94-topbar">
          <div><span>REFERHUB IDENTITY</span><b>PROFILE X · 9.4</b></div>
          <div class="px94-top-actions px94-owner-only">
            <button id="px94PreviewButton" onclick="toggleProfileXPublicPreview()">Як бачать інші</button>
            <button onclick="shareProfile()">Поділитися</button>
          </div>
        </header>

        <div class="px94-hero-main">
          <div class="px94-avatar-zone skin-${esc(me.profile_frame||"violet")}">
            <div class="px94-avatar-halo"></div>
            <div class="px94-avatar-photo">${profileAvatar()}</div>
            <img class="px94-frame-art" src="${profileFrameAsset(me.profile_frame)}" alt="Активна рамка">
            <div class="px94-avatar-particles">${Array.from({length:16},(_,i)=>`<i style="--pxp:${i}"></i>`).join("")}</div>
            <span class="px94-online"></span>
            <div class="px94-level"><small>LVL</small><strong>${me.level.number}</strong></div>
          </div>

          <div class="px94-identity">
            <span class="px94-status"><i></i> ONLINE PLAYER</span>
            <h1>${esc(me.first_name)}</h1>
            <p>${me.username?"@"+esc(me.username):"ID "+me.id}</p>
            <button id="px94ActiveTitle" class="px94-active-title px94-owner-only" onclick="openProfileXTitleStudio()"><i>${profileXTitle.icon}</i>${esc(profileXTitle.name)}</button>
            <div class="px94-public-title"><i>${profileXTitle.icon}</i>${esc(profileXTitle.name)}</div>
            <div class="px94-xp-copy"><span>${esc(me.level.name)} · ${me.xp} XP</span><b>${Math.round(me.level.progress)}%</b></div>
            <div class="px94-xp"><i style="width:${me.level.progress}%"></i></div>
          </div>

          <aside class="px94-power-card">
            <span>PROFILE POWER</span>
            <strong>${profileXPowerValue.toLocaleString("uk-UA")}</strong>
            <small>${profileXLeague} LEAGUE</small>
            <div><b>#${me.rank}</b><span>global rank</span></div>
          </aside>
        </div>

        <div class="px94-primary-stats">
          <article><span>RH BALANCE</span><strong>${Number(me.balance||0).toLocaleString("uk-UA")}</strong><small>доступно зараз</small></article>
          <article><span>FRIENDS</span><strong>${me.referrals_count}</strong><small>у твоїй мережі</small></article>
          <article><span>WIN RATE</span><strong>${profilePro.win_rate}%</strong><small>${profilePro.games_won} перемог</small></article>
          <article><span>ACHIEVEMENTS</span><strong>${profileXAchievementPct}%</strong><small>${unlocked.length} із ${achievements.length}</small></article>
        </div>
      </section>

      <nav class="px94-nav px94-owner-only">
        <button onclick="profileXJump('px94Overview')"><span>01</span>Огляд</button>
        <button onclick="profileXJump('px94Frames')"><span>02</span>Рамки</button>
        <button onclick="profileXJump('px94Backgrounds')"><span>03</span>Фони</button>
        <button onclick="profileXJump('px94Achievements')"><span>04</span>Досягнення</button>
        <button onclick="profileXJump('px94Timeline')"><span>05</span>Історія</button>
      </nav>

      <section id="px94Overview" class="px94-section">
        <div class="px94-section-head"><div><span>CAREER OVERVIEW</span><h2>Твоя кар’єра</h2></div><small>${profilePro.account_age_days} днів у ReferHub</small></div>
        <div class="px94-career-grid">
          <article><i>01</i><span>Завдань виконано</span><strong>${profilePro.tasks_completed}</strong></article>
          <article><i>02</i><span>Ігор зіграно</span><strong>${profilePro.games_played}</strong></article>
          <article><i>03</i><span>Турнірів</span><strong>${profilePro.tournaments_count}</strong></article>
          <article><i>04</i><span>Покупок</span><strong>${profilePro.orders_count}</strong></article>
          <article><i>05</i><span>Ігрових RH</span><strong>${profilePro.game_rewards}</strong></article>
          <article><i>06</i><span>Краще місце</span><strong>${profilePro.best_tournament_place?"#"+profilePro.best_tournament_place:"—"}</strong></article>
        </div>

        <div class="px94-performance-grid">
          <article class="px94-performance-card">
            <span>УЛЮБЛЕНА ГРА</span><div class="px94-performance-icon">${mostPlayedKey?gameIcon(mostPlayedKey):"◆"}</div>
            <h3>${mostPlayedKey?gameName(mostPlayedKey):"Ще не визначено"}</h3><p>${mostPlayedKey?`${gamesHistory.filter(item=>item.game_key===mostPlayedKey).length} ігор`:"Зіграй кілька раундів"}</p>
          </article>
          <article class="px94-performance-card gold">
            <span>НАЙКРАЩИЙ ВИГРАШ</span><div class="px94-performance-icon">♛</div>
            <h3>${bestGame?`+${bestGame.reward} RH`:"0 RH"}</h3><p>${bestGame?gameName(bestGame.game_key):"Рекорд ще попереду"}</p>
          </article>
          <article class="px94-performance-card wide">
            <span>АКТИВНІСТЬ · 14 ДНІВ</span>
            <div class="px94-chart">${renderActivityChart(profilePro.activity)}</div>
          </article>
        </div>

        <div class="px94-medal-shelf">
          <div class="px94-section-head compact"><div><span>MEDAL SHELF</span><h3>Медалі профілю</h3></div></div>
          <div>${profile2MedalList.slice(0,6).map(medal=>`<article title="${esc(medal.text)}"><i>${medal.icon}</i><b>${esc(medal.title)}</b><small>${esc(medal.text)}</small></article>`).join("")}</div>
        </div>
      </section>

      <section id="px94Frames" class="px94-section px94-owner-only">
        <div class="px94-section-head"><div><span>FRAME STUDIO</span><h2>Рамки профілю</h2></div><small>${profilePro.available_frames.filter(frame=>me.level.number>=frame.min_level).length}/${profilePro.available_frames.length} доступно</small></div>
        <div class="px94-active-frame">
          <div class="px94-active-frame-stage skin-${esc(me.profile_frame||"violet")}"><div>${profileAvatar()}</div><img src="${profileFrameAsset(me.profile_frame)}" alt="${esc(activeFrame?.name||"Frame")}"></div>
          <div><span>АКТИВНА РАМКА</span><h3>${esc(activeFrame?.name||"Violet")}</h3><p>Натисни на будь-яку рамку нижче, щоб відкрити велику примірку.</p></div>
        </div>
        <div class="frame92-filters px94-frame-filters">
          <button class="active" onclick="frame92Filter('all',this)">Усі</button><button onclick="frame92Filter('rare',this)">Rare</button><button onclick="frame92Filter('epic',this)">Epic</button><button onclick="frame92Filter('legendary',this)">Legendary</button><button onclick="frame92Filter('mythic',this)">Mythic</button><button onclick="frame92Filter('divine',this)">Divine</button>
        </div>
        <div class="frame92-grid px94-frame-grid">
          ${profilePro.available_frames.map(frame=>{
            const rarity=frame92Rarity(frame);const meta=frame92Meta(frame.key);const isUnlocked=me.level.number>=frame.min_level;
            return `<button class="frame92-card rarity-${rarity.key} ${me.profile_frame===frame.key?"selected":""} ${!isUnlocked?"locked":""}" data-rarity="${rarity.key}" onclick="openFrame92Preview('${frame.key}')">
              <div class="frame92-card-stage skin-${frame.key}"><span class="frame92-card-backdrop"></span><em>${esc(me.first_name?.[0]||"R")}</em><img src="${profileFrameAsset(frame.key)}" alt="${esc(frame.name)}"><div class="frame92-card-particles">${Array.from({length:8},(_,i)=>`<i style="--f92p:${i}"></i>`).join("")}</div><b>${meta.symbol}</b></div>
              <div class="frame92-card-copy"><span>${rarity.label}</span><h3>${esc(frame.name)}</h3><p>${esc(meta.effect)}</p><div><small>${isUnlocked?me.profile_frame===frame.key?"АКТИВНА":"ПРИМІРЯТИ":`LVL ${frame.min_level}`}</small><strong>${"★".repeat(rarity.stars)}</strong></div></div>
            </button>`;
          }).join("")}
        </div>
      </section>

      <section id="px94Backgrounds" class="px94-section px94-owner-only">
        <div class="px94-section-head"><div><span>BACKGROUND STUDIO</span><h2>Атмосфера профілю</h2></div><small>${profile2Backgrounds.filter(bg=>me.level.number>=bg.unlock).length}/${profile2Backgrounds.length}</small></div>
        <p class="px94-description">Фон змінює всю сцену профілю та зберігається автоматично.</p>
        <div class="profile2-background-grid px94-background-grid">${profile2BackgroundOptions()}</div>
      </section>

      <section id="px94Achievements" class="px94-section">
        <div class="px94-section-head"><div><span>ACHIEVEMENT WALL</span><h2>Досягнення</h2></div><small>${unlocked.length}/${achievements.length}</small></div>
        ${favorite?`<article class="px94-featured"><div>${favorite.icon}</div><section><span>FEATURED ACHIEVEMENT</span><h3>${esc(favorite.title)}</h3><p>${esc(favorite.description)}</p></section><i></i></article>`:""}
        <div class="px94-achievement-grid">
          ${achievements.map(item=>`<article class="px94-achievement ${item.unlocked?"unlocked":"locked"} ${me.featured_achievement_id===item.id?"featured":""}"><div class="px94-achievement-icon">${item.icon}</div><div><b>${esc(item.title)}</b><p>${esc(item.description)}</p><div class="px94-achievement-track"><i style="width:${Math.min(100,item.progress/item.condition_value*100)}%"></i></div><small>${Math.min(item.progress,item.condition_value)}/${item.condition_value}</small></div><section class="px94-owner-only">${item.unlocked?`<button onclick="featureAchievement(${item.id})">${me.featured_achievement_id===item.id?"Закріплено":"Закріпити"}</button>`:""}<button class="claim" ${!item.unlocked||item.claimed?"disabled":""} onclick="claimAchievement(${item.id})">${item.claimed?"✓":`+${item.reward} RH`}</button></section></article>`).join("")}
        </div>
      </section>

      <section class="px94-section px94-owner-only">
        <div class="px94-section-head"><div><span>REFERRAL IDENTITY</span><h2>Поділитися профілем</h2></div></div>
        <div class="px94-referral"><div class="px94-qr"><img src="${qrUrl}" alt="QR ReferHub"></div><div><h3>Будуй свою команду</h3><p>Запрошуй друзів і отримуй нагороди за активність мережі.</p><code>${esc(me.referral_link)}</code><section><button onclick="copyProfileLink()">Копіювати</button><button onclick="shareProfile()">Поділитися</button></section></div></div>
      </section>

      <section id="px94Timeline" class="px94-section">
        <div class="px94-section-head"><div><span>PLAYER TIMELINE</span><h2>Історія активності</h2></div><small>${history.length}</small></div>
        <div class="px94-timeline">${history.length?history.slice(0,18).map((item,index)=>`<article style="--pxi:${index}"><i class="${item.amount>=0?"positive":"negative"}"></i><div><b>${esc(item.note)}</b><span>${new Date(item.created_at*1000).toLocaleString("uk-UA")}</span></div><strong class="${item.amount>=0?"plus":"minus"}">${item.amount>=0?"+":""}${item.amount}</strong></article>`).join(""):`<div class="empty">Історія порожня</div>`}</div>
      </section>

      <div class="px94-footer-actions"><button onclick="tournamentsPage()"><span>♛</span><div><b>Турніри PRO</b><small>Рейтинг, призи й архів</small></div><i>›</i></button>${me.is_admin?`<button onclick="openPage('admin')"><span>◆</span><div><b>Admin Panel PRO</b><small>Керування застосунком</small></div><i>›</i></button>`:""}</div>
      ${adminBlock}
    </main>
  `;

  addCrispMotion();
  setupMotionForPage();
}


function adminUserRow(user){
  return `
    <div class="admin-user-row">
      <div class="feed-icon">${user.first_name?.[0]||"U"}</div>
      <div class="grow">
        <b>${esc(user.first_name||user.username||String(user.telegram_id))}</b>
        <div class="muted">
          ID ${user.telegram_id} • ${user.balance} RH ⭐ • ${user.xp||0} XP •
          ${user.referrals_count} друзів •
          ${user.is_online?"🟢 онлайн":"⚪ офлайн"}
        </div>
      </div>
      <button class="secondary admin-mini" onclick="openAdminUser(${user.telegram_id})">Відкрити</button>
    </div>`;
}

async function searchAdminUsers(){
  try{
    const q=document.getElementById("adminUserSearch").value.trim();
    const users=await api(`/api/admin/users?q=${encodeURIComponent(q)}`);
    document.getElementById("adminUsersList").innerHTML=users.length
      ? users.map(adminUserRow).join("")
      : `<div class="empty">Нічого не знайдено</div>`;
  }catch(error){toast(error.message)}
}

async function openAdminUser(userId){
  return openAdminUser444(userId);
}

async function changeUserBalance(userId){
  const amount=Number(document.getElementById(`balanceAmount${userId}`).value);
  const note=document.getElementById(`balanceNote${userId}`).value||"Корекція адміністратором";

  try{
    await api(`/api/admin/users/${userId}/balance`,{
      method:"POST",
      body:JSON.stringify({amount,note})
    });
    toast("Баланс змінено");
    openAdminUser(userId);
  }catch(error){toast(error.message)}
}

async function toggleUserBan(userId,isBanned){
  if(!confirm(isBanned?"Заблокувати користувача?":"Розблокувати користувача?"))return;

  try{
    await api(`/api/admin/users/${userId}/ban`,{
      method:"PATCH",
      body:JSON.stringify({is_banned:Boolean(isBanned)})
    });
    toast(isBanned?"Користувача заблоковано":"Користувача розблоковано");
    openAdminUser(userId);
  }catch(error){toast(error.message)}
}


async function changeUserXP(userId){
  const amount=Number(document.getElementById(`xpAmount${userId}`).value);
  const note=document.getElementById(`xpNote${userId}`).value||"Корекція XP адміністратором";
  try{
    await api(`/api/admin/users/${userId}/xp`,{method:"POST",body:JSON.stringify({amount,note})});
    toast("XP змінено"); openAdminUser(userId);
  }catch(error){toast(error.message)}
}

async function setUserLevel(userId){
  const level=Number(document.getElementById(`levelValue${userId}`).value);
  try{
    await api(`/api/admin/users/${userId}/level`,{method:"POST",body:JSON.stringify({level,note:"Рівень змінено через Admin PRO"})});
    toast("Рівень встановлено"); openAdminUser(userId);
  }catch(error){toast(error.message)}
}

async function grantUserAchievement(userId){
  const achievementId=Number(document.getElementById(`achievement${userId}`).value);
  const claimReward=document.getElementById(`achievementReward${userId}`).checked;
  try{
    await api(`/api/admin/users/${userId}/achievement`,{method:"POST",body:JSON.stringify({achievement_id:achievementId,claim_reward:claimReward})});
    toast("Досягнення видано"); openAdminUser(userId);
  }catch(error){toast(error.message)}
}

async function toggleAdminGame(gameKey,isActive){
  try{
    await api(`/api/admin/games/${gameKey}`,{
      method:"PATCH",
      body:JSON.stringify({is_active:Boolean(isActive)})
    });
    toast(isActive?"Гру увімкнено":"Гру вимкнено");
    profilePage();
  }catch(error){toast(error.message)}
}

async function saveAdminGame(gameKey){
  try{
    await api(`/api/admin/games/${gameKey}`,{
      method:"PATCH",
      body:JSON.stringify({
        min_bet:Number(document.getElementById(`gameMin${gameKey}`).value||0),
        max_bet:Number(document.getElementById(`gameMax${gameKey}`).value||0),
        daily_limit:Number(document.getElementById(`gameLimit${gameKey}`).value||0),
        cooldown_seconds:Number(document.getElementById(`gameCooldown${gameKey}`).value||0),
        config_json:document.getElementById(`gameConfig${gameKey}`).value
      })
    });
    toast("Налаштування гри збережено");
    profilePage();
  }catch(error){toast(error.message)}
}

async function checkTelegramChannel(inputId,resultId){
  const chatId=document.getElementById(inputId)?.value.trim();
  const resultBox=document.getElementById(resultId);

  if(!chatId){
    if(resultBox){
      resultBox.className="channel-check-result bad";
      resultBox.textContent="Спочатку вкажи канал";
    }
    return;
  }

  if(resultBox){
    resultBox.className="channel-check-result";
    resultBox.textContent="Перевіряю канал...";
  }

  try{
    const result=await api(`/api/admin/telegram-channel/check?chat_id=${encodeURIComponent(chatId)}`);

    if(resultBox){
      resultBox.className=`channel-check-result ${result.can_check_members?"good":"warn"}`;
      resultBox.innerHTML=`
        <b>${esc(result.title)}</b><br>
        ${result.username?"@"+esc(result.username)+" • ":""}${esc(result.type)}<br>
        Статус бота: ${esc(result.bot_status)}<br>
        ${esc(result.message)}
      `;
    }
  }catch(error){
    if(resultBox){
      resultBox.className="channel-check-result bad";
      resultBox.textContent=error.message;
    }
  }
}

async function createAdminTask(){
  try{
    await api("/api/admin/tasks",{
      method:"POST",
      body:JSON.stringify({
        title:document.getElementById("newTaskTitle").value,
        description:document.getElementById("newTaskDescription").value,
        reward:Number(document.getElementById("newTaskReward").value),
        icon:document.getElementById("newTaskIcon").value||"⭐",
        category:document.getElementById("newTaskCategory").value,
        verification_type:document.getElementById("newTaskVerification").value,
        link:document.getElementById("newTaskLink").value||null,
        telegram_chat_id:document.getElementById("newTaskChat").value||null,
        wait_seconds:Number(document.getElementById("newTaskWait").value||0),
        sort_order:Number(document.getElementById("newTaskSort").value||0),
        max_claims:Number(document.getElementById("newTaskMaxClaims").value||0),
        starts_at:0,
        ends_at:document.getElementById("newTaskEndsAt").value
          ? Math.floor(new Date(document.getElementById("newTaskEndsAt").value).getTime()/1000)
          : 0
      })
    });
    toast("Завдання створено");
    profilePage();
  }catch(error){toast(error.message)}
}


async function editAdminTask(id){
  try{
    const task=await api(`/api/admin/tasks/${id}`);
    const editor=document.getElementById("taskEditor");

    editor.innerHTML=`
      ${section("Редагування",`Завдання #${task.id}`)}
      <div class="card admin-form">
        <input id="editTaskTitle" value="${esc(task.title)}">
        <textarea id="editTaskDescription">${esc(task.description)}</textarea>

        <div class="admin-grid">
          <input id="editTaskReward" type="number" value="${task.reward}">
          <input id="editTaskIcon" value="${esc(task.icon||"⭐")}">
        </div>

        <select id="editTaskCategory">
          ${["telegram","youtube","tiktok","instagram","discord","referral","other"].map(value=>
            `<option value="${value}" ${task.category===value?"selected":""}>${value}</option>`
          ).join("")}
        </select>

        <select id="editTaskVerification">
          ${["visit","telegram_member","referral","instant"].map(value=>
            `<option value="${value}" ${task.verification_type===value?"selected":""}>${value}</option>`
          ).join("")}
        </select>

        <input id="editTaskLink" value="${esc(task.link||"")}" placeholder="Посилання">
        <div class="channel-check-row">
          <input id="editTaskChat" value="${esc(task.telegram_chat_id||"")}" placeholder="@канал, -100... або t.me">
          <button class="secondary" type="button" onclick="checkTelegramChannel('editTaskChat','editTaskChannelResult')">Перевірити</button>
        </div>
        <div id="editTaskChannelResult" class="channel-check-result"></div>

        <div class="admin-grid">
          <input id="editTaskWait" type="number" value="${task.wait_seconds}">
          <input id="editTaskSort" type="number" value="${task.sort_order}">
        </div>

        <div class="admin-grid">
          <input id="editTaskMaxClaims" type="number" value="${task.max_claims}">
          <input id="editTaskEndsAt" type="datetime-local" value="${task.ends_at?new Date(task.ends_at*1000).toISOString().slice(0,16):""}">
        </div>

        <button class="primary full" onclick="saveAdminTask(${task.id})">Зберегти зміни</button>
        <button class="secondary full" onclick="showTaskChecks(${task.id})">Журнал перевірок</button>
      </div>
      <div id="taskChecks"></div>
    `;

    editor.scrollIntoView({behavior:"smooth"});
  }catch(error){
    toast(error.message);
  }
}

async function saveAdminTask(id){
  try{
    await api(`/api/admin/tasks/${id}`,{
      method:"PATCH",
      body:JSON.stringify({
        title:document.getElementById("editTaskTitle").value,
        description:document.getElementById("editTaskDescription").value,
        reward:Number(document.getElementById("editTaskReward").value),
        icon:document.getElementById("editTaskIcon").value||"⭐",
        category:document.getElementById("editTaskCategory").value,
        verification_type:document.getElementById("editTaskVerification").value,
        link:document.getElementById("editTaskLink").value||null,
        telegram_chat_id:document.getElementById("editTaskChat").value||null,
        wait_seconds:Number(document.getElementById("editTaskWait").value||0),
        sort_order:Number(document.getElementById("editTaskSort").value||0),
        max_claims:Number(document.getElementById("editTaskMaxClaims").value||0),
        ends_at:document.getElementById("editTaskEndsAt").value
          ? Math.floor(new Date(document.getElementById("editTaskEndsAt").value).getTime()/1000)
          : 0
      })
    });

    toast("Завдання оновлено");
    profilePage();
  }catch(error){
    toast(error.message);
  }
}

async function showTaskChecks(id){
  try{
    const checks=await api(`/api/admin/tasks/${id}/checks`);
    const target=document.getElementById("taskChecks");

    target.innerHTML=`
      ${section("Журнал перевірок",`${checks.length} записів`)}
      <div class="card">
        ${checks.length?checks.map(check=>`
          <div class="row">
            <div class="feed-icon">${check.success?"✓":"×"}</div>
            <div class="grow">
              <b>${esc(check.first_name||check.username||String(check.user_id))}</b>
              <div class="muted">${esc(check.message||"Успішно")} • ${new Date(check.checked_at*1000).toLocaleString("uk-UA")}</div>
            </div>
          </div>`).join(""):`<div class="empty">Перевірок ще не було</div>`}
      </div>`;
  }catch(error){
    toast(error.message);
  }
}

async function restoreAdminTask(id){
  try{
    await api(`/api/admin/tasks/${id}/restore`,{method:"POST"});
    toast("Завдання відновлено");
    profilePage();
  }catch(error){
    toast(error.message);
  }
}

async function disableAdminTask(id){
  if(!confirm("Вимкнути це завдання?"))return;
  try{
    await api(`/api/admin/tasks/${id}`,{method:"DELETE"});
    toast("Завдання вимкнено");
    profilePage();
  }catch(error){toast(error.message)}
}


async function createAdminGift(){
  try{
    await api("/api/admin/gifts",{
      method:"POST",
      body:JSON.stringify({
        title:document.getElementById("newGiftTitle").value,
        description:document.getElementById("newGiftDescription").value,
        price:Number(document.getElementById("newGiftPrice").value),
        emoji:document.getElementById("newGiftEmoji").value||"🎁",
        stock:Number(document.getElementById("newGiftStock").value||0),
        sort_order:Number(document.getElementById("newGiftSort").value||0)
      })
    });
    toast("Товар створено");
    profilePage();
  }catch(error){toast(error.message)}
}

async function toggleAdminGift(id,isActive){
  try{
    await api(`/api/admin/gifts/${id}`,{
      method:"PATCH",
      body:JSON.stringify({is_active:Boolean(isActive)})
    });
    toast(isActive?"Товар відновлено":"Товар вимкнено");
    profilePage();
  }catch(error){toast(error.message)}
}

function filterAdminOrders(){
  const status=document.getElementById("adminOrderFilter")?.value||"all";
  document.querySelectorAll("[data-order-status]").forEach(row=>{
    row.style.display=status==="all"||row.dataset.orderStatus===status?"":"none";
  });
}

async function processOrder(id){
  const note=prompt("Примітка для користувача:","Ми почали обробляти вашу заявку.")||null;
  try{
    const result=await api(`/api/admin/orders/${id}`,{
      method:"PATCH",
      body:JSON.stringify({
        status:"processing",
        admin_note:note,
        notify_user:true
      })
    });
    toast(result.notified?"Заявка в обробці, повідомлення надіслано":"Заявка в обробці");
    profilePage();
  }catch(error){toast(error.message)}
}

async function showOrderHistory(id){
  try{
    const history=await api(`/api/admin/orders/${id}/history`);
    const block=document.getElementById("orderHistoryBlock");
    block.innerHTML=`
      ${section(`Історія заявки #${id}`,`${history.length} змін`)}
      <div class="card">
        ${history.length?history.map(item=>`
          <div class="row">
            <div class="feed-icon">🕒</div>
            <div class="grow">
              <b>${orderStatus(item.old_status||"pending")} → ${orderStatus(item.new_status)}</b>
              <div class="muted">${item.note?esc(item.note):"Без примітки"}</div>
              <div class="muted">${new Date(item.created_at*1000).toLocaleString("uk-UA")}</div>
            </div>
          </div>`).join(""):`<div class="empty">Історії ще немає</div>`}
      </div>`;
    block.scrollIntoView({behavior:"smooth"});
  }catch(error){toast(error.message)}
}

async function completeOrder(id){
  const note=prompt("Примітка для користувача (необов'язково):")||null;
  try{
    await api(`/api/admin/orders/${id}`,{
      method:"PATCH",
      body:JSON.stringify({status:"completed",admin_note:note,notify_user:true})
    });
    toast("Заявку виконано");
    profilePage();
  }catch(error){toast(error.message)}
}

async function rejectOrder(id){
  const note=prompt("Причина відмови:")||"Заявку відхилено";
  try{
    await api(`/api/admin/orders/${id}`,{
      method:"PATCH",
      body:JSON.stringify({status:"rejected",admin_note:note,notify_user:true})
    });
    toast("Заявку відхилено, баланс повернено");
    profilePage();
  }catch(error){toast(error.message)}
}


async function claimAchievement(id){
  try{
    await api(`/api/achievements/${id}/claim`,{method:"POST"});
    await loadMe();
    rewardToast("Досягнення відкрито","Нагороду додано","🏆");
    toast("Нагороду досягнення отримано");
    profilePage();
  }catch(error){toast(error.message)}
}

async function createPromoCode(){
  try{
    await api("/api/admin/promos",{
      method:"POST",
      body:JSON.stringify({
        code:document.getElementById("promoCode").value,
        discount_percent:Number(document.getElementById("promoDiscount").value),
        max_uses:Number(document.getElementById("promoUses").value||0)
      })
    });
    toast("Промокод створено");
    profilePage();
  }catch(error){toast(error.message)}
}

async function finishTournament(id){
  if(!confirm("Достроково завершити турнір і видати призи?"))return;
  try{
    const result=await api(`/api/admin/tournaments/${id}/finish`,{method:"POST"});
    toast(`Завершено. Переможців: ${result.winners_count}`);
    profilePage();
  }catch(error){toast(error.message)}
}

async function cancelTournament(id){
  if(!confirm("Скасувати турнір без видачі призів?"))return;
  try{
    await api(`/api/admin/tournaments/${id}/cancel`,{method:"POST"});
    toast("Турнір скасовано");
    profilePage();
  }catch(error){toast(error.message)}
}

async function createTournament(){
  try{
    await api("/api/admin/tournaments",{
      method:"POST",
      body:JSON.stringify({
        title:document.getElementById("tourTitle").value,
        description:document.getElementById("tourDescription").value,
        starts_at:Math.floor(new Date(document.getElementById("tourStart").value).getTime()/1000),
        ends_at:Math.floor(new Date(document.getElementById("tourEnd").value).getTime()/1000),
        prize_1:Number(document.getElementById("tourP1").value||0),
        prize_2:Number(document.getElementById("tourP2").value||0),
        prize_3:Number(document.getElementById("tourP3").value||0)
      })
    });
    toast("Турнір створено");
    profilePage();
  }catch(error){toast(error.message)}
}

async function openPage(page){
  document.body.classList.toggle("rhx-home-active",page==="home");
  const pages={
    home:homePage,
    lotteries:lotteryPage,
    tasks:tasksPage,
    friends:friendsPage,
    referrals:()=>window.referralHub424(),
    games:gamesPage,
    shop:shopPage,
    tournaments:tournamentsPage,
    season:seasonPage,
    admin:()=>window.adminCenter46(),
    profile:profilePage
  };

  if(!pages[page]){
    toast("Сторінку не знайдено");
    return;
  }

  if(pageTransitionLock)return;
  pageTransitionLock=true;

  document.querySelectorAll("nav button").forEach(button=>{
    button.classList.toggle("active",button.dataset.page===page);
  });

  const nextButton=document.querySelector(`nav button[data-page="${page}"]`);
  nextButton?.classList.add("nav-bounce");
  setTimeout(()=>nextButton?.classList.remove("nav-bounce"),500);

  content.classList.remove("page-enter","page-exit");
  content.classList.add("page-fade-out");

  try{
    await new Promise(resolve=>setTimeout(resolve,90));
    activePageName=page;
    await pages[page]();

    content.classList.remove("page-fade-out");
    content.classList.add("page-fade-in");
    staggerVisibleItems(); addCrispMotion(); setupMotionForPage();
    document.querySelector("main")?.scrollTo({top:0,behavior:"smooth"});
  }catch(error){
    console.error(`Page ${page} error:`,error);
    content.classList.remove("page-fade-out");
    content.innerHTML=`
      <div class="card page-error-card">
        <div class="page-error-icon">⚠️</div>
        <h3>Не вдалося відкрити сторінку</h3>
        <p>${esc(error.message||"Невідома помилка")}</p>
        <button class="primary full" onclick="openPage('${page}')">Спробувати ще раз</button>
      </div>`;
    toast(error.message||"Помилка сторінки");
  }finally{
    setTimeout(()=>{
      pageTransitionLock=false;
      content.classList.remove("page-fade-in");
    },280);
  }
}



(async()=>{
  initMotionEngine();
  initGlobalMotion();
  try{
    await loadMe();
    await homePage();
    preparePageMotion(); addCrispMotion(); setupMotionForPage();
  }catch(error){
    content.innerHTML=`<div class="card" style="margin-top:24px"><b>Помилка запуску</b><br><br>${esc(error.message)}</div>`;
  }
})();
