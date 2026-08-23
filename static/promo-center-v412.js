
/* ReferHub v4.12 — Promo Center */
(()=>{
 const E=v=>typeof esc==="function"?esc(v):String(v??"");
 let promos=[];

 function modal(inner){
   let o=document.getElementById("promo412Overlay");
   if(!o){o=document.createElement("div");o.id="promo412Overlay";o.className="promo412-overlay";document.body.appendChild(o)}
   o.innerHTML=`<section class="promo412-modal">${inner}</section>`;
   o.classList.add("show");
 }
 window.promo412Close=()=>document.getElementById("promo412Overlay")?.classList.remove("show");

 function expiry(ts){
   if(!Number(ts))return "Без терміну";
   return new Date(Number(ts)*1000).toLocaleString("uk-UA");
 }

 window.promo412Admin=async()=>{
   modal('<div class="loader"></div>');
   try{
     promos=await api("/api/admin/promos-v412");
     modal(`<header class="promo412-head">
       <div><small>ADMIN · PROMO CENTER</small><h2>Промокоди</h2><p>Знижки для магазину ReferHub.</p></div>
       <button onclick="promo412Close()">×</button>
     </header>

     <button class="promo412-new" onclick="promo412CreateForm()">＋ НОВИЙ ПРОМОКОД</button>

     <div class="promo412-admin-list">
       ${promos.length?promos.map(p=>`<article>
         <div class="promo412-code">${E(p.code)}</div>
         <div><small>ЗНИЖКА</small><b>−${Number(p.discount_percent)}%</b><p>${Number(p.uses_count||0)} використань · ${Number(p.max_uses||0)>0?`ліміт ${p.max_uses}`:"без ліміту"} · ${expiry(p.expires_at)}</p></div>
         <span class="${p.is_active?"active":"off"}">${p.is_active?"ACTIVE":"OFF"}</span>
         <button onclick="promo412Toggle(${p.id},${p.is_active?0:1})">${p.is_active?"ВИМКНУТИ":"УВІМКНУТИ"}</button>
       </article>`).join(""):`<div class="promo412-empty">Промокодів ще немає</div>`}
     </div>`);
   }catch(e){toast?.(e.message,"error");promo412Close()}
 };

 window.promo412CreateForm=()=>{
   modal(`<header class="promo412-head"><div><small>NEW PROMO</small><h2>Створити промокод</h2></div><button onclick="promo412Close()">×</button></header>
    <div class="promo412-form">
      <input id="promo412NewCode" placeholder="Код, наприклад START20">
      <div class="promo412-grid">
        <input id="promo412Discount" type="number" value="10" min="1" max="90" placeholder="Знижка %">
        <input id="promo412Uses" type="number" value="0" min="0" placeholder="Макс. використань (0 = ∞)">
      </div>
      <input id="promo412Hours" type="number" value="0" min="0" placeholder="Термін у годинах (0 = без терміну)">
      <button onclick="promo412Create()">СТВОРИТИ</button>
    </div>`);
 };

 window.promo412Create=async()=>{
   const code=(document.getElementById("promo412NewCode")?.value||"").trim().toUpperCase();
   const discount=Number(document.getElementById("promo412Discount")?.value||0);
   const max_uses=Number(document.getElementById("promo412Uses")?.value||0);
   const hours=Number(document.getElementById("promo412Hours")?.value||0);
   if(!code)return toast?.("Вкажи код","error");
   const expires_at=hours>0?Math.floor(Date.now()/1000)+Math.floor(hours*3600):0;

   try{
     await api("/api/admin/promos",{method:"POST",body:JSON.stringify({
       code,discount_percent:discount,max_uses,expires_at
     })});
     toast?.("Промокод створено","success");
     await promo412Admin();
   }catch(e){toast?.(e.message,"error")}
 };

 window.promo412Toggle=async(id,active)=>{
   try{
     await api(`/api/admin/promos-v412/${id}`,{
       method:"PATCH",body:JSON.stringify({is_active:Boolean(active)})
     });
     toast?.(active?"Промокод увімкнено":"Промокод вимкнено","success");
     await promo412Admin();
   }catch(e){toast?.(e.message,"error")}
 };

 function addAdminButton(){
   const quick=document.querySelector(".a46-quick");
   if(!quick||quick.querySelector("[data-promo412]"))return;
   const b=document.createElement("button");
   b.dataset.promo412="1";
   b.innerHTML='<span>🏷️</span><b>Promo Center</b><i>→</i>';
   b.onclick=promo412Admin;
   quick.appendChild(b);
 }

 document.addEventListener("DOMContentLoaded",()=>setTimeout(addAdminButton,900));
 document.addEventListener("click",()=>setTimeout(addAdminButton,80));
})();
