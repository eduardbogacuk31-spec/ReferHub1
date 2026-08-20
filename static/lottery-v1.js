
function lotteryTimeLeft(ts){
  const seconds=Math.max(0,Number(ts||0)-Math.floor(Date.now()/1000));
  if(seconds<=0)return "Завершено";
  const d=Math.floor(seconds/86400);
  const h=Math.floor((seconds%86400)/3600);
  const m=Math.floor((seconds%3600)/60);
  if(d)return `${d}д ${h}г ${m}хв`;
  if(h)return `${h}г ${m}хв`;
  return `${m} хв`;
}

function lotteryStatusLabel(status){
  return ({
    active:"ПРИЙМАЄ КВИТКИ",
    upcoming:"СКОРО",
    awaiting_draw:"ОЧІКУЄ ЖЕРЕБКУВАННЯ",
    drawn:"ЗАВЕРШЕНО"
  })[status]||status;
}

function lotteryCard(item,featured=false){
  const canBuy=item.status==="active";
  const chance=Number(item.my_chance_percent||0);
  const winner=item.winner_username
    ? `@${esc(item.winner_username)}`
    : esc(item.winner_first_name||"—");

  return `
    <article class="lotv1-card ${featured?"featured":""} ${item.status==="drawn"?"drawn":""}">
      <div class="lotv1-prize">
        <div class="lotv1-prize-art">${esc(item.prize_emoji||"🎁")}</div>
        <div>
          <span class="lotv1-status">${lotteryStatusLabel(item.status)}</span>
          <h3>${esc(item.title)}</h3>
          <p>${esc(item.prize_name)}</p>
        </div>
      </div>

      <div class="lotv1-metrics">
        <div><span>Квиток</span><b>${Number(item.ticket_price)} RH</b></div>
        <div><span>Всього</span><b>${Number(item.total_tickets)} 🎟</b></div>
        <div><span>У тебе</span><b>${Number(item.my_tickets)} 🎟</b></div>
        <div><span>Твій шанс</span><b>${chance.toFixed(chance>=1?2:4)}%</b></div>
      </div>

      <div class="lotv1-timer">
        <span>${item.status==="drawn"?"Переможець":"До завершення"}</span>
        <strong>${item.status==="drawn"?winner:lotteryTimeLeft(item.ends_at)}</strong>
      </div>

      ${canBuy ? `
        <div class="lotv1-buy">
          <div class="lotv1-stepper">
            <button onclick="lotteryStep(${item.id},-1)">−</button>
            <input id="lotCount${item.id}" value="1" inputmode="numeric" min="1" max="500">
            <button onclick="lotteryStep(${item.id},1)">+</button>
          </div>
          <button class="lotv1-buy-button" onclick="buyLotteryTickets(${item.id},${item.ticket_price})">
            КУПИТИ КВИТКИ
          </button>
        </div>` : ""}

      <button class="lotv1-proof" onclick="showLotteryProof(${item.id})">
        🔎 ${item.status==="drawn"?"Перевірити результат":"Seed hash до розіграшу"}
      </button>
    </article>`;
}

async function lotteryPage(){
  const draws=await api("/api/lotteries");
  const active=draws.filter(x=>x.status!=="drawn");
  const finished=draws.filter(x=>x.status==="drawn");

  content.innerHTML=`
    <section class="lotv1-hero lot11-lottery-hero">
      <span>REFERHUB LOTTERY</span>
      <h2>Твій квиток.<br><span>Твій шанс.</span></h2>
      <p>RH не продаються за гроші. Заробляй їх у застосунку та використовуй тільки для участі в прозорих розіграшах.</p>
      <div class="lotv1-hero-balance">
        <small>Твій баланс</small>
        <strong>${Number(me.balance||0)} RH</strong>
      </div>
    </section>

    ${active.length
      ? `<div class="lotv1-grid lot11-lottery-grid">${active.map((x,i)=>lotteryCard(x,i===0)).join("")}</div>`
      : `<div class="card empty">Активних розіграшів поки немає.</div>`}

    ${finished.length ? `
      ${section("Переможці","Завершені та перевіряємі розіграші")}
      <div class="lotv1-grid finished">${finished.map(x=>lotteryCard(x)).join("")}</div>` : ""}

    ${me.is_admin ? lotteryAdminPanel() : ""}
  `;
}

function lotteryStep(id,delta){
  const input=document.getElementById(`lotCount${id}`);
  if(!input)return;
  const next=Math.max(1,Math.min(500,Number(input.value||1)+delta));
  input.value=String(next);
}

async function buyLotteryTickets(id,price){
  const input=document.getElementById(`lotCount${id}`);
  const count=Math.max(1,Math.min(500,Number(input?.value||1)));
  const cost=count*Number(price||0);

  if(!confirm(`Купити ${count} квитків за ${cost} RH?`))return;

  try{
    const result=await api(`/api/lotteries/${id}/tickets`,{
      method:"POST",
      body:JSON.stringify({count})
    });
    me.balance=Number(result.balance||0);
    const balanceNode=document.getElementById("balance");
    if(balanceNode)balanceNode.textContent=String(me.balance);
    rewardToast("Квитки придбано",`+${count} шансів у розіграші`,"🎟️");
    await lotteryPage();
  }catch(error){
    toast(error.message,"error");
  }
}

async function showLotteryProof(id){
  try{
    const data=await api(`/api/lotteries/${id}/verify`);
    if(!data.drawn){
      alert(
        `Розіграш ще триває.\n\nSeed hash:\n${data.seed_hash}\n\n`+
        `Після завершення seed буде відкритий, і результат можна буде перевірити.`
      );
      return;
    }

    alert(
      `ПЕРЕВІРКА РОЗІГРАШУ #${data.lottery_id}\n\n`+
      `Виграшний квиток: #${data.winning_ticket_id??"—"}\n`+
      `Кількість квитків: ${data.total_tickets}\n\n`+
      `Seed hash:\n${data.seed_hash}\n\n`+
      `Revealed seed:\n${data.revealed_seed}\n\n`+
      `Tickets hash:\n${data.tickets_hash}\n\n`+
      `Формула:\n${data.formula}`
    );
  }catch(error){
    toast(error.message,"error");
  }
}

function lotteryAdminPanel(){
  const now=new Date();
  const start=new Date(now.getTime()+5*60*1000);
  const end=new Date(now.getTime()+3*86400000);
  const local=x=>{
    const p=n=>String(n).padStart(2,"0");
    return `${x.getFullYear()}-${p(x.getMonth()+1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
  };

  return `
    ${section("Адмін · Новий розіграш","Seed hash створюється автоматично до продажу квитків")}
    <div class="lotv1-admin">
      <input id="lotAdminTitle" placeholder="Назва розіграшу">
      <input id="lotAdminPrize" placeholder="Назва призу">
      <input id="lotAdminEmoji" value="🎁" placeholder="Emoji">
      <input id="lotAdminPrice" type="number" value="100" min="1" placeholder="Ціна квитка RH">
      <textarea id="lotAdminDescription" placeholder="Опис"></textarea>
      <label>Старт<input id="lotAdminStart" type="datetime-local" value="${local(start)}"></label>
      <label>Завершення<input id="lotAdminEnd" type="datetime-local" value="${local(end)}"></label>
      <button onclick="createLottery()">СТВОРИТИ РОЗІГРАШ</button>
    </div>`;
}

async function createLottery(){
  try{
    const payload={
      title:document.getElementById("lotAdminTitle").value,
      description:document.getElementById("lotAdminDescription").value,
      prize_name:document.getElementById("lotAdminPrize").value,
      prize_emoji:document.getElementById("lotAdminEmoji").value||"🎁",
      ticket_price:Number(document.getElementById("lotAdminPrice").value||100),
      starts_at:Math.floor(new Date(document.getElementById("lotAdminStart").value).getTime()/1000),
      ends_at:Math.floor(new Date(document.getElementById("lotAdminEnd").value).getTime()/1000)
    };
    await api("/api/admin/lotteries",{method:"POST",body:JSON.stringify(payload)});
    toast("Розіграш створено");
    await lotteryPage();
  }catch(error){
    toast(error.message,"error");
  }
}
