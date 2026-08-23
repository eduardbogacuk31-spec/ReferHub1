
/* ReferHub Lottery v1.5 — completely rebuilt game UI.
   This file intentionally overrides legacy gamesPage/openGameDetail. */

const GAMEV2 = [
  {id:"roulette",icon:"🎡",name:"Neon Roulette",kind:"ЩОДЕННА",accent:"violet",reward:"1–15 ⭐",desc:"Одне колесо, дванадцять секторів і чесний серверний результат."},
  {id:"daily_case",icon:"🎁",name:"Daily Vault",kind:"ЩОДЕННА",accent:"emerald",reward:"до 25 RH",desc:"Щоденний контейнер із випадковою RH-нагородою."},
  {id:"slot",icon:"🎰",name:"Neon Slots",kind:"РИЗИК",accent:"crimson",reward:"до x10",desc:"Три барабани, ставка RH і комбінації з різними множниками."},
  {id:"coin_flip",icon:"🪙",name:"Coin Duel",kind:"ШВИДКА",accent:"amber",reward:"x1.85",desc:"Обери сторону монети та перевір інтуїцію за кілька секунд."},
  {id:"number_guess",icon:"🔢",name:"Code Guess",kind:"ЛОГІКА",accent:"azure",reward:"8 RH",desc:"Система загадує число від 1 до 5. Твоя задача — влучити."},
  {id:"scratch",icon:"✨",name:"Scratch Neon",kind:"ЩОДЕННА",accent:"magenta",reward:"до 20 RH",desc:"Стирай захисний шар пальцем і відкривай прихований результат."},
  {id:"safe_crack",icon:"🔐",name:"Vault Break",kind:"ЛОГІКА",accent:"steel",reward:"12 RH",desc:"Одна правильна комірка з шести. Знайди код сейфа."},
];

function gv2Meta(id){ return GAMEV2.find(x=>x.id===id)||GAMEV2[0]; }

function gv2Balance(){
  const n=document.getElementById("balance");
  if(n)n.textContent=String(me.balance??0);
}

async function gamesPage(){
  let games=[];
  try{ games=await api("/api/games"); }catch(_){}
  const map=Object.fromEntries((games||[]).map(x=>[x.game_key,x]));

  content.innerHTML=`
    <section class="gv2-catalog-hero">
      <div>
        <span>REFERHUB ARCADE</span>
        <h1>Game Center</h1>
        <p>Обери режим. Кожна гра відкривається на власній сторінці — без старого загального екрана.</p>
      </div>
      <div class="gv2-wallet"><small>БАЛАНС</small><b>${Number(me.balance||0)} RH</b><em>для квитків у розіграшах</em></div>
    </section>

    <section class="gv2-catalog">
      ${GAMEV2.map((g,i)=>{
        const s=map[g.id]||{};
        const locked=Number(s.cooldown_remaining||0)>0;
        const left=s.daily_limit?Math.max(0,Number(s.daily_limit)-Number(s.plays_today||0)):"∞";
        return `
          <button class="gv2-tile ${g.accent}" onclick="openGameDetail('${g.id}')">
            <div class="gv2-tile-art">
              <span>${g.icon}</span>
              <i></i><i></i>
            </div>
            <div class="gv2-tile-info">
              <div class="gv2-kicker"><span>${g.kind}</span><em>${locked?"COOLDOWN":"READY"}</em></div>
              <h2>${g.name}</h2>
              <p>${g.desc}</p>
              <footer><b>${g.reward}</b><small>${left} спроб</small><strong>Відкрити →</strong></footer>
            </div>
          </button>`;
      }).join("")}
    </section>`;
}

async function openGameDetail(id){
  const g=gv2Meta(id);
  content.innerHTML=`<div class="loader"></div>`;

  let games=[],history=[];
  try{
    [games,history]=await Promise.all([api("/api/games"),api("/api/games/history")]);
  }catch(error){
    content.innerHTML=`<div class="gv2-error"><b>⚠️</b><h2>Не вдалося завантажити гру</h2><p>${esc(error.message)}</p><button onclick="gamesPage()">Назад</button></div>`;
    return;
  }

  const game=games.find(x=>x.game_key===id)||{};
  const h=history.filter(x=>x.game_key===id);
  const left=game.daily_limit?Math.max(0,Number(game.daily_limit)-Number(game.plays_today||0)):"∞";
  const record=Math.max(0,...h.map(x=>Number(x.reward||0)));
  const cooldown=Number(game.cooldown_remaining||0);

  content.innerHTML=`
    <section class="gv2-page ${g.accent}">
      <header class="gv2-top">
        <button onclick="gamesPage()">← Ігри</button>
        <div><span>${Number(me.balance||0)} RH</span><i></i><small>${cooldown?formatCooldown(cooldown):"READY"}</small></div>
      </header>

      <section class="gv2-game-hero">
        <div class="gv2-hero-art"><span>${g.icon}</span><i></i><i></i><i></i></div>
        <div class="gv2-hero-copy">
          <em>${g.kind} · ${g.reward}</em>
          <h1>${g.name}</h1>
          <p>${g.desc}</p>
          <div>
            <span><small>Спроб</small><b>${left}</b></span>
            <span><small>Рекорд</small><b>${record}</b></span>
            <span><small>Зіграно</small><b>${h.length}</b></span>
          </div>
        </div>
      </section>

      <section class="gv2-rules">
        <article><b>01</b><div><span>ЯК ГРАТИ</span><p>${gv2How(id)}</p></div></article>
        <article><b>02</b><div><span>ЩО МОЖНА ВИГРАТИ</span><p>${gv2Reward(id)}</p></div></article>
        <article><b>03</b><div><span>ПОРАДА</span><p>${gv2Tip(id)}</p></div></article>
      </section>

      <section class="gv2-stage">
        ${gv2Stage(id,game)}
      </section>

      <section class="gv2-after">
        <div class="gv2-history">
          <div class="gv2-section-title"><span>ОСТАННІ ІГРИ</span><small>${h.length} результатів</small></div>
          ${h.length?h.slice(0,5).map(x=>`
            <div class="gv2-history-row">
              <i>${g.icon}</i><span><b>${esc(x.result_text)}</b><small>${new Date(x.created_at*1000).toLocaleString("uk-UA")}</small></span>
              <strong class="${Number(x.reward)>0?"win":""}">${Number(x.reward)>0?`+${x.reward}`:"0"}</strong>
            </div>`).join(""):`<p class="gv2-empty">Поки немає результатів.</p>`}
        </div>
        <div class="gv2-more">
          <div class="gv2-section-title"><span>ЩЕ РЕЖИМИ</span><small>перемкнути гру</small></div>
          <div>${GAMEV2.filter(x=>x.id!==id).slice(0,4).map(x=>`<button onclick="openGameDetail('${x.id}')"><i>${x.icon}</i><span>${x.name}</span></button>`).join("")}</div>
        </div>
      </section>
    </section>`;

  if(id==="scratch"&&!cooldown) setTimeout(gv2InitScratch,50);
}

function gv2How(id){
  return {
    roulette:"Натисни «Крутити». Сервер обере один із 12 секторів, а колесо зупиниться саме на ньому.",
    daily_case:"Натисни на контейнер або кнопку відкриття. Один запит — один зафіксований результат.",
    slot:"Вкажи ставку RH та запусти барабани. Однакові символи дають більший множник.",
    coin_flip:"Вкажи ставку, обери орла або решку та підкинь монету.",
    number_guess:"Натисни одне число від 1 до 5. Після вибору система відкриє правильну відповідь.",
    scratch:"Проводи пальцем по срібному покриттю. На першому русі сервер одразу фіксує нагороду.",
    safe_crack:"Обери одну з шести комірок. Система відкриє справжній код після твого вибору."
  }[id];
}
function gv2Reward(id){
  return {
    roulette:"Від 1 до 15 зірок. Зірковий сектор — джекпот.",
    daily_case:"Випадкова RH-нагорода з щоденного пулу.",
    slot:"Виграш залежить від ставки та комбінації символів.",
    coin_flip:"При успіху повертається нагорода приблизно x1.85 від ставки.",
    number_guess:"8 RH за правильну відповідь.",
    scratch:"Від 0 до 20 RH залежно від прихованого результату.",
    safe_crack:"12 RH за правильну комірку."
  }[id];
}
function gv2Tip(id){
  return {
    roulette:"Не закривай Mini App під час обертання — дочекайся результату.",
    daily_case:"Відкривай щодня, щоб не втрачати безкоштовну спробу.",
    slot:"Невелика ставка дозволяє зробити більше спроб.",
    coin_flip:"Шанс не залежить від попередніх випадінь.",
    number_guess:"Кожна спроба незалежна — попередня відповідь не підказує наступну.",
    scratch:"Стирати всю картку не обов'язково: достатньо відкрити більшу частину.",
    safe_crack:"Кожна з 6 комірок має однаковий шанс."
  }[id];
}

function gv2Stage(id,game){
  const cd=Number(game.cooldown_remaining||0);
  if(id==="roulette") return `
    <div class="gv2-stage-head"><div><span>LIVE WHEEL</span><h2>Крути колесо</h2></div><b>${cd?formatCooldown(cd):"ГОТОВО"}</b></div>
    <div class="gv2-wheel-zone">
      <div class="gv2-pointer"></div>
      <div id="gv2Wheel" class="gv2-wheel">${gv2WheelSvg()}</div>
      <div id="gv2RouletteResult" class="gv2-result"><small>РЕЗУЛЬТАТ</small><strong>—</strong></div>
    </div>
    <button id="gv2RouletteBtn" class="gv2-primary" onclick="gv2PlayRoulette()" ${cd?"disabled":""}>${cd?formatCooldown(cd):"КРУТИТИ"}</button>`;

  if(id==="daily_case") return `
    <div class="gv2-stage-head"><div><span>DAILY DROP</span><h2>Відкрий контейнер</h2></div><b>${cd?formatCooldown(cd):"ГОТОВО"}</b></div>
    <button id="gv2CaseBox" class="gv2-case-box" onclick="gv2OpenCase()" ${cd?"disabled":""}>
      <div class="lid"></div><div class="box">🎁</div><span>REFERHUB DAILY</span>
    </button>
    <div id="gv2CaseResult" class="gv2-center-result">Нагорода прихована</div>
    <button id="gv2CaseBtn" class="gv2-primary" onclick="gv2OpenCase()" ${cd?"disabled":""}>${cd?formatCooldown(cd):"ВІДКРИТИ"}</button>`;

  if(id==="slot") return `
    <div class="gv2-stage-head"><div><span>NEON REELS</span><h2>Запусти барабани</h2></div><b>${cd?formatCooldown(cd):"ГОТОВО"}</b></div>
    <div class="gv2-slot-machine">
      <div id="gv2Reel1" class="gv2-reel">❔</div><div id="gv2Reel2" class="gv2-reel">❔</div><div id="gv2Reel3" class="gv2-reel">❔</div>
    </div>
    <div id="gv2SlotResult" class="gv2-center-result">Збери комбінацію</div>
    <label class="gv2-field"><span>СТАВКА RH</span><input id="gv2SlotBet" type="number" value="${game.min_bet||5}" min="${game.min_bet||5}" max="${game.max_bet||100}"></label>
    <button id="gv2SlotBtn" class="gv2-primary" onclick="gv2PlaySlot()" ${cd?"disabled":""}>ЗАПУСТИТИ</button>`;

  if(id==="coin_flip") return `
    <div class="gv2-stage-head"><div><span>COIN DUEL</span><h2>Обери сторону</h2></div><b>${cd?formatCooldown(cd):"ГОТОВО"}</b></div>
    <div id="gv2Coin" class="gv2-coin">🪙</div>
    <div id="gv2CoinResult" class="gv2-center-result">Орел чи решка?</div>
    <label class="gv2-field"><span>СТАВКА RH</span><input id="gv2CoinBet" type="number" value="${game.min_bet||5}" min="${game.min_bet||5}" max="${game.max_bet||50}"></label>
    <div class="gv2-two"><button onclick="gv2PlayCoin('heads')" ${cd?"disabled":""}>🦅 ОРЕЛ</button><button onclick="gv2PlayCoin('tails')" ${cd?"disabled":""}>🪙 РЕШКА</button></div>`;

  if(id==="number_guess") return `
    <div class="gv2-stage-head"><div><span>CODE GUESS</span><h2>Вгадай число</h2></div><b>${cd?formatCooldown(cd):"ГОТОВО"}</b></div>
    <div id="gv2GuessDisplay" class="gv2-guess-display">?</div>
    <div id="gv2GuessResult" class="gv2-center-result">Система загадала число від 1 до 5</div>
    <div class="gv2-five">${[1,2,3,4,5].map(n=>`<button onclick="gv2PlayGuess(${n})" ${cd?"disabled":""}>${n}</button>`).join("")}</div>`;

  if(id==="scratch") return `
    <div class="gv2-stage-head"><div><span>SCRATCH NEON</span><h2>Стирай покриття</h2></div><b>${cd?formatCooldown(cd):"ГОТОВО"}</b></div>
    <div id="gv2Scratch" class="gv2-scratch ${cd?"disabled":""}">
      <div id="gv2ScratchPrize" class="gv2-scratch-prize">${cd?formatCooldown(cd):"RH ?"}</div>
      ${cd?"":'<canvas id="gv2ScratchCanvas"></canvas>'}
    </div>
    <div id="gv2ScratchResult" class="gv2-center-result">${cd?"Сьогодні вже зіграно":"Проведи пальцем по картці"}</div>`;

  if(id==="safe_crack") return `
    <div class="gv2-stage-head"><div><span>VAULT BREAK</span><h2>Знайди код сейфа</h2></div><b>${cd?formatCooldown(cd):"ГОТОВО"}</b></div>
    <div class="gv2-safe-door"><div class="ring"><span>🔐</span></div><b>RH VAULT</b></div>
    <div id="gv2SafeResult" class="gv2-center-result">Одна комірка відкриє сейф</div>
    <div class="gv2-six">${[1,2,3,4,5,6].map(n=>`<button onclick="gv2PlaySafe(${n})" ${cd?"disabled":""}>${n}</button>`).join("")}</div>`;

  return "";
}

function gv2WheelSvg(){
  const vals=[1,2,3,4,5,5,6,7,8,9,10,15], colors=["#7447d7","#d8497d","#3b83ce","#d89d2a","#39ab79","#6c45cf","#d84870","#3c82cb","#38aa76","#d74a7e","#6844cf","#d99c29"];
  const cx=250,cy=250,r=222,ir=78,rad=d=>d*Math.PI/180,p=(rr,d)=>[cx+rr*Math.sin(rad(d)),cy-rr*Math.cos(rad(d))];
  const parts=vals.map((v,i)=>{
    const a0=i*30-15,a1=(i+1)*30-15,[x0,y0]=p(r,a0),[x1,y1]=p(r,a1),[q0,w0]=p(ir,a0),[q1,w1]=p(ir,a1),[tx,ty]=p(157,i*30);
    return `<path d="M${q0},${w0} L${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1} L${q1},${w1} A${ir},${ir} 0 0 0 ${q0},${w0}Z" fill="${colors[i]}"/><text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle">${v===15?"★":v}</text>`;
  }).join("");
  return `<svg viewBox="0 0 500 500"><circle cx="250" cy="250" r="240" fill="#0b0e14" stroke="#c99a35" stroke-width="8"/>${parts}<circle cx="250" cy="250" r="80" fill="#10131a" stroke="#d0a340" stroke-width="6"/><text x="250" y="245" class="hub" text-anchor="middle">RH</text><text x="250" y="274" class="sub" text-anchor="middle">LOTTERY</text></svg>`;
}

async function gv2PlayRoulette(){
  const btn=document.getElementById("gv2RouletteBtn"), wheel=document.getElementById("gv2Wheel");
  if(!btn||!wheel)return;
  btn.disabled=true;
  try{
    const result=await api("/api/games/roulette",{method:"POST",body:JSON.stringify({bet:0})});
    const idx=Number(result.sector_index||0), target=1800+(360-idx*30);
    wheel.style.setProperty("--to",`${target}deg`);
    wheel.classList.remove("spin"); void wheel.offsetWidth; wheel.classList.add("spin");
    setTimeout(()=>{
      const box=document.getElementById("gv2RouletteResult");
      if(box){box.querySelector("strong").textContent=result.is_jackpot?`★ +${result.reward}`:`+${result.reward} ⭐`;box.classList.add("show");}
      toast(result.result_text);
    },3000);
    setTimeout(()=>gp423AfterPlay("roulette"),4200);
  }catch(e){btn.disabled=false;toast(e.message,"error");}
}

let gv2CaseBusy=false;
async function gv2OpenCase(){
  if(gv2CaseBusy)return; gv2CaseBusy=true;
  const box=document.getElementById("gv2CaseBox"),btn=document.getElementById("gv2CaseBtn");
  if(box)box.disabled=true;if(btn)btn.disabled=true;
  try{
    const old=me.balance,result=await api("/api/games/daily-case",{method:"POST",body:JSON.stringify({bet:0})});
    box?.classList.add("open");
    me.balance=Number(result.balance||0);gv2Balance();
    const r=document.getElementById("gv2CaseResult");if(r){r.textContent=`+${result.reward} RH`;r.classList.add("win");}
    toast(result.result_text);
    setTimeout(()=>gp423AfterPlay("daily_case"),2600);
  }catch(e){gv2CaseBusy=false;if(box)box.disabled=false;if(btn)btn.disabled=false;toast(e.message,"error");}
}

async function gv2PlaySlot(){
  const btn=document.getElementById("gv2SlotBtn");if(!btn)return;btn.disabled=true;
  const reels=[1,2,3].map(n=>document.getElementById(`gv2Reel${n}`));
  const symbols=["🍒","🍋","🔔","⭐","💎"];let tick=0;
  const timer=setInterval(()=>{reels.forEach((r,i)=>r.textContent=symbols[(tick+i)%symbols.length]);tick++;},80);
  try{
    const bet=Number(document.getElementById("gv2SlotBet")?.value||0),result=await api("/api/games/slot",{method:"POST",body:JSON.stringify({bet})});
    setTimeout(()=>{clearInterval(timer);reels.forEach((r,i)=>r.textContent=result.symbols[i]);document.getElementById("gv2SlotResult").textContent=result.reward?`Виграш +${result.reward} RH`:"Без виграшу";me.balance=Number(result.balance);gv2Balance();},1200);
    setTimeout(()=>gp423AfterPlay("slot"),2500);
  }catch(e){clearInterval(timer);btn.disabled=false;toast(e.message,"error");}
}

async function gv2PlayCoin(choice){
  document.querySelectorAll(".gv2-two button").forEach(b=>b.disabled=true);
  const coin=document.getElementById("gv2Coin");coin?.classList.add("flip");
  try{
    const bet=Number(document.getElementById("gv2CoinBet")?.value||0),result=await api("/api/games/coin-flip",{method:"POST",body:JSON.stringify({bet,choice})});
    setTimeout(()=>{coin?.classList.remove("flip");if(coin)coin.textContent=result.result==="heads"?"🦅":"🪙";document.getElementById("gv2CoinResult").textContent=result.win?`Перемога +${result.reward} RH`:`Випала ${result.result==="heads"?"орел":"решка"}`;me.balance=Number(result.balance);gv2Balance();},900);
    setTimeout(()=>gp423AfterPlay("coin_flip"),2100);
  }catch(e){coin?.classList.remove("flip");document.querySelectorAll(".gv2-two button").forEach(b=>b.disabled=false);toast(e.message,"error");}
}

async function gv2PlayGuess(n){
  document.querySelectorAll(".gv2-five button").forEach(b=>b.disabled=true);
  try{
    const result=await api("/api/games/number-guess",{method:"POST",body:JSON.stringify({number:n})});
    document.getElementById("gv2GuessDisplay").textContent=result.answer;
    document.getElementById("gv2GuessResult").textContent=result.win?`Точно! +${result.reward} RH`:`Ти обрав ${n}. Правильно: ${result.answer}`;
    document.querySelectorAll(".gv2-five button").forEach(b=>{if(Number(b.textContent)===Number(result.answer))b.classList.add("correct");else if(Number(b.textContent)===n)b.classList.add("wrong");});
    me.balance=Number(result.balance);gv2Balance();
    setTimeout(()=>gp423AfterPlay("number_guess"),2200);
  }catch(e){document.querySelectorAll(".gv2-five button").forEach(b=>b.disabled=false);toast(e.message,"error");}
}

function gv2InitScratch(){
  const canvas=document.getElementById("gv2ScratchCanvas"),host=document.getElementById("gv2Scratch");if(!canvas||!host)return;
  const ctx=canvas.getContext("2d",{willReadFrequently:true});let started=false,down=false,result=null;
  const resize=()=>{const r=host.getBoundingClientRect();canvas.width=Math.round(r.width*devicePixelRatio);canvas.height=Math.round(r.height*devicePixelRatio);canvas.style.width=r.width+"px";canvas.style.height=r.height+"px";ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);const g=ctx.createLinearGradient(0,0,r.width,r.height);g.addColorStop(0,"#e2e5eb");g.addColorStop(.5,"#8993a0");g.addColorStop(1,"#d2d6dd");ctx.fillStyle=g;ctx.fillRect(0,0,r.width,r.height);ctx.fillStyle="#242a31";ctx.font="900 16px Arial";ctx.textAlign="center";ctx.fillText("СТИРАЙ",r.width/2,r.height/2);};
  resize();
  async function start(){if(started)return;started=true;try{result=await api("/api/games/scratch",{method:"POST",body:JSON.stringify({bet:0})});document.getElementById("gv2ScratchPrize").textContent=result.reward?`+${result.reward} RH`:"ПУСТО";me.balance=Number(result.balance);gv2Balance();}catch(e){document.getElementById("gv2ScratchResult").textContent=e.message;}}
  function pos(e){const r=canvas.getBoundingClientRect(),p=e.touches?e.touches[0]:e;return [p.clientX-r.left,p.clientY-r.top];}
  function scratch(e){if(!down)return;e.preventDefault();start();const [x,y]=pos(e);ctx.globalCompositeOperation="destination-out";ctx.beginPath();ctx.arc(x,y,22,0,Math.PI*2);ctx.fill();}
  canvas.addEventListener("pointerdown",e=>{down=true;scratch(e)});canvas.addEventListener("pointermove",scratch);window.addEventListener("pointerup",()=>down=false);
  setTimeout(()=>document.getElementById("gv2ScratchResult").textContent="Стирай срібний шар пальцем",50);
}

async function gv2PlaySafe(n){
  document.querySelectorAll(".gv2-six button").forEach(b=>b.disabled=true);
  try{
    const result=await api("/api/games/safe-crack",{method:"POST",body:JSON.stringify({number:n})});
    document.querySelectorAll(".gv2-six button").forEach(b=>{if(Number(b.textContent)===Number(result.correct))b.classList.add("correct");else if(Number(b.textContent)===n)b.classList.add("wrong");});
    document.getElementById("gv2SafeResult").textContent=result.win?`Сейф відкрито! +${result.reward} RH`:`Код був ${result.correct}`;
    me.balance=Number(result.balance);gv2Balance();
    setTimeout(()=>gp423AfterPlay("safe_crack"),2200);
  }catch(e){document.querySelectorAll(".gv2-six button").forEach(b=>b.disabled=false);toast(e.message,"error");}
}
