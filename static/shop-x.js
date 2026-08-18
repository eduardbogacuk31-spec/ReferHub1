
/* ============================================================
   REFERHUB BETA 9.5 — SHOP X
   Isolated storefront override. Existing purchase API preserved.
   ============================================================ */

function shopXIcon(category=""){
  const value=String(category).toLowerCase();
  if(value.includes("рам"))return "♛";
  if(value.includes("фон"))return "◈";
  if(value.includes("тит"))return "◆";
  if(value.includes("premium")||value.includes("telegram"))return "✦";
  if(value.includes("подар"))return "▣";
  return "◇";
}

function shopXStatus(status){
  const map={
    pending:{label:"Очікує",className:"pending"},
    completed:{label:"Отримано",className:"completed"},
    rejected:{label:"Відхилено",className:"rejected"}
  };
  return map[status]||{label:status||"Нове",className:"pending"};
}

function shopXSwitchTab(name,button){
  document.querySelectorAll(".shopx95-tabs button").forEach(node=>node.classList.remove("active"));
  document.querySelectorAll(".shopx95-panel").forEach(node=>node.classList.remove("active"));
  button?.classList.add("active");
  document.querySelector(`[data-shopx95-panel="${name}"]`)?.classList.add("active");
}

function shopXSetCategory(index,button){
  window.shopX95Category=(window.shopX95Categories||[])[index]||"all";
  document.querySelectorAll(".shopx95-categories button").forEach(node=>node.classList.remove("active"));
  button?.classList.add("active");
  shopXFilter();
}

function shopXFilter(){
  const query=(document.getElementById("shopX95Search")?.value||"").trim().toLowerCase();
  const category=window.shopX95Category||"all";
  let visible=0;

  document.querySelectorAll(".shopx95-product").forEach(card=>{
    const categoryMatch=category==="all"||card.dataset.category===category;
    const queryMatch=!query||card.dataset.search.includes(query);
    const show=categoryMatch&&queryMatch;
    card.hidden=!show;
    if(show)visible++;
  });

  const counter=document.getElementById("shopX95Counter");
  if(counter)counter.textContent=`${visible} товарів`;
}

function shopXClosePreview(){
  const modal=document.querySelector(".shopx95-modal");
  if(!modal)return;
  modal.classList.remove("show");
  setTimeout(()=>modal.remove(),220);
}

function shopXOpenPreview(id){
  const gift=(window.shopX95Gifts||[]).find(item=>Number(item.id)===Number(id));
  if(!gift)return;

  document.querySelector(".shopx95-modal")?.remove();

  const stock=Number(gift.stock||0);
  const price=Number(gift.price||0);
  const balance=Number(me.balance||0);
  const owned=(window.shopX95Inventory||[]).some(order=>Number(order.gift_id)===Number(gift.id));
  const canBuy=stock!==0&&balance>=price&&!owned;
  const shortage=Math.max(0,price-balance);

  const modal=document.createElement("div");
  modal.className="shopx95-modal";
  modal.innerHTML=`
    <div class="shopx95-modal-backdrop" onclick="shopXClosePreview()"></div>
    <article class="shopx95-modal-card">
      <button class="shopx95-modal-close" onclick="shopXClosePreview()" aria-label="Закрити">×</button>
      <div class="shopx95-modal-art">
        ${gift.image_url
          ?`<img src="${esc(gift.image_url)}" alt="${esc(gift.title)}">`
          :`<span>${shopXIcon(gift.category)}</span>`}
        <div class="shopx95-art-aura"></div>
        <b>${esc(gift.category||"Нагорода")}</b>
      </div>

      <div class="shopx95-modal-content">
        <span class="shopx95-eyebrow">ITEM PREVIEW</span>
        <h2>${esc(gift.title||"Нагорода")}</h2>
        <p>${esc(gift.description||"Ексклюзивний предмет ReferHub Rewards.")}</p>

        <div class="shopx95-modal-stats">
          <div><small>Ціна</small><strong>${price} RH</strong></div>
          <div><small>Баланс</small><strong>${balance} RH</strong></div>
          <div><small>Залишок</small><strong>${stock>0?stock:"∞"}</strong></div>
        </div>

        ${owned?`
          <div class="shopx95-owned-note"><span>✓</span><div><b>Предмет уже у твоєму майні</b><small>Статус можна переглянути у вкладці «Моє майно».</small></div></div>
        `:shortage?`
          <div class="shopx95-shortage"><span>!</span><div><b>Не вистачає ${shortage} RH</b><small>Зароби більше RH у місіях та іграх.</small></div></div>
        `:""}

        <div class="shopx95-modal-actions">
          <button class="primary" ${canBuy?"":"disabled"}
            onclick="shopXClosePreview();buyGift(${gift.id})">
            ${owned?"Уже придбано":stock===0?"Немає в наявності":canBuy?`Купити за ${price} RH`:"Недостатньо RH"}
          </button>
          <button class="secondary" ${owned||stock===0?"disabled":""}
            onclick="shopXClosePreview();buyGiftPro(${gift.id})">
            Використати промокод
          </button>
        </div>
      </div>
    </article>`;
  document.body.appendChild(modal);
  requestAnimationFrame(()=>modal.classList.add("show"));
}

async function shopPage(){
  content.innerHTML=`
    <section class="shopx95-loading">
      <div class="shopx95-skeleton hero"></div>
      <div class="shopx95-skeleton-row">
        <div class="shopx95-skeleton"></div>
        <div class="shopx95-skeleton"></div>
        <div class="shopx95-skeleton"></div>
      </div>
    </section>`;

  let gifts=[];
  let orders=[];
  let ordersUnavailable=false;

  try{
    gifts=await api("/api/gifts");
  }catch(error){
    content.innerHTML=`
      <div class="shopx95-error">
        <span>!</span>
        <h2>Магазин не завантажився</h2>
        <p>${esc(error.message)}</p>
        <button onclick="shopPage()">Спробувати ще раз</button>
      </div>`;
    return;
  }

  try{
    orders=await api("/api/orders");
  }catch(error){
    ordersUnavailable=true;
    console.error("Orders unavailable:",error);
  }

  gifts=Array.isArray(gifts)?gifts:[];
  orders=Array.isArray(orders)?orders:[];

  const available=gifts.filter(item=>item.is_active!==0&&Number(item.stock||0)!==0);
  const inventory=orders.filter(order=>["pending","completed"].includes(order.status));
  const completed=orders.filter(order=>order.status==="completed");
  const pending=orders.filter(order=>order.status==="pending");
  const spent=orders
    .filter(order=>order.status!=="rejected")
    .reduce((sum,order)=>sum+Number(order.price||0),0);

  const categories=[...new Set(available.map(item=>item.category||"Інше"))];
  const featured=[...available]
    .sort((a,b)=>{
      const featureDiff=Number(b.is_featured||0)-Number(a.is_featured||0);
      return featureDiff||Number(b.price||0)-Number(a.price||0);
    })
    .slice(0,3);

  window.shopX95Gifts=gifts;
  window.shopX95Inventory=inventory;
  window.shopX95Categories=["all",...categories];
  window.shopX95Category="all";

  const productCard=gift=>{
    const price=Number(gift.price||0);
    const stock=Number(gift.stock||0);
    const affordable=Number(me.balance||0)>=price;
    const owned=inventory.some(order=>Number(order.gift_id)===Number(gift.id));
    const search=`${gift.title||""} ${gift.description||""} ${gift.category||""}`.toLowerCase();

    return `
      <article class="shopx95-product ${owned?"owned":""}"
        data-category="${esc(gift.category||"Інше")}"
        data-search="${esc(search)}">
        <button class="shopx95-product-art" onclick="shopXOpenPreview(${gift.id})">
          ${gift.image_url
            ?`<img src="${esc(gift.image_url)}" alt="${esc(gift.title)}">`
            :`<span>${shopXIcon(gift.category)}</span>`}
          <i></i>
          <b>${esc(gift.category||"Інше")}</b>
          ${owned?`<em>У майні</em>`:""}
          ${stock>0&&stock<=3?`<small>Залишилось ${stock}</small>`:""}
        </button>
        <div class="shopx95-product-copy">
          <h3>${esc(gift.title||"Нагорода")}</h3>
          <p>${esc(gift.description||"Ексклюзивний предмет ReferHub.")}</p>
          <footer>
            <strong>${price} <span>RH</span></strong>
            <button onclick="shopXOpenPreview(${gift.id})">
              ${owned?"Переглянути":affordable?"Купити":"Деталі"}
            </button>
          </footer>
        </div>
      </article>`;
  };

  content.innerHTML=`
    <section class="shopx95-shell">
      <header class="shopx95-hero">
        <div class="shopx95-hero-copy">
          <span>REFERHUB MARKETPLACE</span>
          <h1>Shop X</h1>
          <p>Колекційні рамки, фони, титули та цифрові нагороди в одному преміальному магазині.</p>

          <div class="shopx95-hero-stats">
            <div><small>Твій баланс</small><strong>${Number(me.balance||0)} RH</strong></div>
            <div><small>Моє майно</small><strong>${inventory.length}</strong></div>
            <div><small>Витрачено</small><strong>${spent} RH</strong></div>
          </div>
        </div>

        <div class="shopx95-showcase" aria-hidden="true">
          <div class="shopx95-showcase-ring ring-one"></div>
          <div class="shopx95-showcase-ring ring-two"></div>
          <div class="shopx95-crate">
            <span>RH</span><i></i><b></b>
          </div>
          <small>PREMIUM VAULT</small>
        </div>
      </header>

      ${ordersUnavailable?`
        <div class="shopx95-warning">
          <span>!</span>
          <div><b>Історія замовлень тимчасово недоступна</b><small>Каталог працює, але статуси покупок можуть не відображатися.</small></div>
          <button onclick="shopPage()">Оновити</button>
        </div>`:""}

      <nav class="shopx95-tabs">
        <button class="active" onclick="shopXSwitchTab('store',this)">Магазин</button>
        <button onclick="shopXSwitchTab('inventory',this)">Моє майно <span>${inventory.length}</span></button>
        <button onclick="shopXSwitchTab('orders',this)">Замовлення <span>${orders.length}</span></button>
      </nav>

      <div class="shopx95-panel active" data-shopx95-panel="store">
        ${featured.length?`
          <section class="shopx95-featured">
            <div class="shopx95-section-head">
              <div><span>FEATURED COLLECTION</span><h2>Головні пропозиції</h2></div>
              <small>Обрано для тебе</small>
            </div>

            <div class="shopx95-featured-grid">
              ${featured.map((gift,index)=>`
                <button class="shopx95-featured-card feature-${index+1}" onclick="shopXOpenPreview(${gift.id})">
                  <div class="shopx95-featured-number">0${index+1}</div>
                  <div class="shopx95-featured-art">
                    ${gift.image_url
                      ?`<img src="${esc(gift.image_url)}" alt="">`
                      :`<span>${shopXIcon(gift.category)}</span>`}
                  </div>
                  <div class="shopx95-featured-copy">
                    <small>${esc(gift.category||"Нагорода")}</small>
                    <h3>${esc(gift.title)}</h3>
                    <p>${esc(gift.description||"Ексклюзивна пропозиція ReferHub.")}</p>
                    <strong>${Number(gift.price||0)} RH</strong>
                  </div>
                </button>`).join("")}
            </div>
          </section>`:""}

        <section class="shopx95-catalog">
          <div class="shopx95-section-head">
            <div><span>FULL CATALOG</span><h2>Усі товари</h2></div>
            <small id="shopX95Counter">${available.length} товарів</small>
          </div>

          <div class="shopx95-tools">
            <label class="shopx95-search">
              <span>⌕</span>
              <input id="shopX95Search" placeholder="Пошук за назвою або категорією" oninput="shopXFilter()">
            </label>

            <div class="shopx95-categories">
              <button class="active" onclick="shopXSetCategory(0,this)">Усі</button>
              ${categories.map((category,index)=>`
                <button onclick="shopXSetCategory(${index+1},this)">
                  ${shopXIcon(category)} ${esc(category)}
                </button>`).join("")}
            </div>
          </div>

          <div class="shopx95-product-grid">
            ${available.length?available.map(productCard).join(""):`
              <div class="shopx95-empty">
                <span>◇</span>
                <h3>Каталог поки порожній</h3>
                <p>Нові нагороди з’являться після оновлення асортименту.</p>
              </div>`}
          </div>
        </section>
      </div>

      <div class="shopx95-panel" data-shopx95-panel="inventory">
        <div class="shopx95-section-head">
          <div><span>PERSONAL COLLECTION</span><h2>Моє майно</h2></div>
          <small>${completed.length} отримано · ${pending.length} очікує</small>
        </div>

        <div class="shopx95-inventory-grid">
          ${inventory.length?inventory.map(order=>{
            const status=shopXStatus(order.status);
            const gift=gifts.find(item=>Number(item.id)===Number(order.gift_id));
            return `
              <article class="shopx95-inventory status-${status.className}">
                <div class="shopx95-inventory-art">
                  ${gift?.image_url
                    ?`<img src="${esc(gift.image_url)}" alt="">`
                    :`<span>${gift?.emoji||shopXIcon(gift?.category)}</span>`}
                </div>
                <div>
                  <span>${status.label}</span>
                  <h3>${esc(order.title||gift?.title||"Нагорода")}</h3>
                  <p>${new Date(Number(order.created_at||0)*1000).toLocaleDateString("uk-UA")}</p>
                </div>
                <strong>${Number(order.price||0)} RH</strong>
              </article>`;
          }).join(""):`
            <div class="shopx95-empty">
              <span>▣</span>
              <h3>Майно ще порожнє</h3>
              <p>Після першої покупки предмет з’явиться тут.</p>
              <button onclick="shopXSwitchTab('store',document.querySelector('.shopx95-tabs button'))">Перейти до магазину</button>
            </div>`}
        </div>
      </div>

      <div class="shopx95-panel" data-shopx95-panel="orders">
        <div class="shopx95-section-head">
          <div><span>ORDER TRACKING</span><h2>Історія замовлень</h2></div>
          <small>${orders.length} записів</small>
        </div>

        <div class="shopx95-order-list">
          ${orders.length?orders.map(order=>{
            const status=shopXStatus(order.status);
            return `
              <article class="shopx95-order status-${status.className}">
                <span class="shopx95-order-status">${status.label}</span>
                <div>
                  <h3>${esc(order.title||"Замовлення")}</h3>
                  <p>${new Date(Number(order.created_at||0)*1000).toLocaleString("uk-UA")}</p>
                  ${order.promo_code?`<small>Промокод: ${esc(order.promo_code)}</small>`:""}
                </div>
                <strong>${Number(order.price||0)} RH</strong>
              </article>`;
          }).join(""):`
            <div class="shopx95-empty">
              <span>◇</span>
              <h3>Замовлень ще немає</h3>
              <p>Історія покупок з’явиться після першого замовлення.</p>
            </div>`}
        </div>
      </div>
    </section>`;

  addCrispMotion?.();
  setupMotionForPage?.();
}
