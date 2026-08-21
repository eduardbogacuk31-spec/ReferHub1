
/* ReferHub v2.5 — Lottery Experience 2.0 */
(()=>{
  let rh25Active=null;

  function money(n){return new Intl.NumberFormat("uk-UA").format(Number(n||0))}
  function pct(x){return Number(x||0).toFixed(Number(x||0)>=1?2:4)}
  function shortName(x){
    if(x.winner_username)return "@"+x.winner_username;
    if(x.winner_first_name)return x.winner_first_name;
    return "Переможець";
  }

  function enhanceCards(){
    document.querySelectorAll(".lotv1-card").forEach(card=>{
      if(card.dataset.rh25)return;
      card.dataset.rh25="1";
      card.classList.add("rh25-card");
      const title=card.querySelector("h3")?.textContent?.trim()||"Розіграш";
      const proof=[...card.querySelectorAll("button")].find(b=>/перевірити|seed/i.test(b.textContent||""));
      if(proof){
        const m=(proof.getAttribute("onclick")||"").match(/\((\d+)\)/);
        if(m){
          const id=Number(m[1]);
          const btn=document.createElement("button");
          btn.className="rh25-open-btn";
          btn.innerHTML='<span>🎟</span><b>ВІДКРИТИ РОЗІГРАШ</b><i>→</i>';
          btn.onclick=()=>rh25OpenDraw(id);
          proof.parentNode.insertBefore(btn,proof);
        }
      }
      const prize=card.querySelector(".lotv1-prize-art");
      if(prize) prize.classList.add("rh25-prize-art");
    });
  }

  async function rh25OpenDraw(id){
    let d;
    try{d=await api(`/api/lotteries/${id}`)}catch(e){toast(e.message,"error");return}
    rh25Active=d;
    let overlay=document.getElementById("rh25Overlay");
    if(!overlay){
      overlay=document.createElement("div");
      overlay.id="rh25Overlay";
      overlay.className="rh25-overlay";
      document.body.appendChild(overlay);
    }
    overlay.innerHTML=drawScreen(d);
    requestAnimationFrame(()=>overlay.classList.add("show"));
    document.body.classList.add("rh25-lock");
  }

  function drawScreen(d){
    const drawn=d.status==="drawn";
    const chance=pct(d.my_chance_percent);
    const winner=drawn?shortName(d):"—";
    return `
      <div class="rh25-backdrop" onclick="rh25Close()"></div>
      <section class="rh25-modal">
        <header class="rh25-modal-top">
          <button onclick="rh25Close()">← Назад</button>
          <div><span>${drawn?"DRAW COMPLETE":"LIVE DRAW"}</span><i></i></div>
        </header>

        <section class="rh25-hero">
          <div class="rh25-hero-glow"></div>
          <div class="rh25-prize">
            <div class="rh25-prize-frame">${d.prize_emoji||"🎁"}</div>
            <span>ГОЛОВНИЙ ПРИЗ</span>
            <h1>${esc(d.prize_name)}</h1>
            <p>${esc(d.title)}</p>
          </div>

          <div class="rh25-ticket-stats">
            <article><small>ТВОЇ КВИТКИ</small><b>${money(d.my_tickets)}</b></article>
            <article><small>ВСЬОГО КВИТКІВ</small><b>${money(d.total_tickets)}</b></article>
            <article><small>ТВІЙ ШАНС</small><b>${chance}%</b></article>
          </div>
        </section>

        ${drawn?winnerBlock(d,winner):liveBlock(d)}

        <section class="rh25-proofbox">
          <div class="rh25-proof-head"><span>ПРОЗОРІСТЬ РЕЗУЛЬТАТУ</span><button onclick="showLotteryProof(${d.id})">Перевірити дані</button></div>
          <div class="rh25-hash"><small>SEED HASH</small><code>${esc((d.seed_hash||"").slice(0,28))}${d.seed_hash?"…":""}</code></div>
        </section>
      </section>`;
  }

  function liveBlock(d){
    return `<section class="rh25-livebox">
      <div class="rh25-machine">
        <div class="rh25-ball b1">#</div><div class="rh25-ball b2">#</div><div class="rh25-ball b3">#</div><div class="rh25-ball b4">#</div>
        <div class="rh25-machine-core"><span>🎟️</span><b>${money(d.total_tickets)}</b><small>КВИТКІВ У DRAW</small></div>
      </div>
      <div class="rh25-livecopy"><span>РОЗІГРАШ ТРИВАЄ</span><h2>Твій квиток уже в системі</h2><p>Після завершення продаж квитків закриється, список буде зафіксовано і система визначить один виграшний ticket ID.</p></div>
    </section>`;
  }

  function winnerBlock(d,winner){
    return `<section class="rh25-winnerbox">
      <div class="rh25-confetti">${Array.from({length:18},(_,i)=>`<i style="--i:${i}"></i>`).join("")}</div>
      <div class="rh25-crown"><img src="/static/assets/stickers/winner.svg" alt=""></div>
      <span>WINNING TICKET</span>
      <h2>#${d.winning_ticket_id??"—"}</h2>
      <p>${esc(winner)}</p>
      <button onclick="rh25Replay(${d.id})">▶ ПОВТОРИТИ МОМЕНТ</button>
    </section>`;
  }

  window.rh25Replay=async function(id){
    let d=rh25Active;
    if(!d||Number(d.id)!==Number(id)){try{d=await api(`/api/lotteries/${id}`)}catch(e){return}}
    const box=document.querySelector(".rh25-winnerbox");
    if(!box)return;
    box.classList.remove("reveal");
    box.innerHTML=`
      <div class="rh25-draw-stage">
        <span>ВИБІР ВИГРАШНОГО КВИТКА</span>
        <div class="rh25-number-runner" id="rh25Runner">#000000</div>
        <small>Система фіксує результат...</small>
      </div>`;
    let n=0, total=Math.max(1,Number(d.total_tickets||9999));
    const timer=setInterval(()=>{
      n++;
      const fake=1+Math.floor(Math.random()*Math.max(total,999));
      const r=document.getElementById("rh25Runner");
      if(r)r.textContent="#"+String(fake).padStart(6,"0");
      if(n>28){
        clearInterval(timer);
        setTimeout(()=>{
          box.innerHTML=winnerBlock(d,shortName(d)).replace('<section class="rh25-winnerbox">','').replace('</section>','');
          box.classList.add("reveal");
        },220);
      }
    },70);
  };

  window.rh25Close=()=>{
    const o=document.getElementById("rh25Overlay");
    if(o){o.classList.remove("show");setTimeout(()=>o.remove(),180)}
    document.body.classList.remove("rh25-lock");
  };
  window.rh25OpenDraw=rh25OpenDraw;

  function polish(){
    enhanceCards();
    document.querySelectorAll(".lotv1-buy-button").forEach(b=>b.classList.add("rh25-buy"));
  }
  new MutationObserver(()=>requestAnimationFrame(polish)).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener("DOMContentLoaded",polish);setTimeout(polish,150);
})();
