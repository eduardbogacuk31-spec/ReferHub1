
/* ReferHub v4.7 — User Experience Pack */
(()=>{
 const E=v=>typeof esc==="function"?esc(v):String(v??"");

 const help={
   rh:{
     icon:"✦",title:"Що таке RH?",
     text:"RH — внутрішня валюта ReferHub. Її можна отримувати за завдання, ігри, серії входів, квести та інші активності. RH використовується всередині бота."
   },
   tasks:{
     icon:"📋",title:"Як працюють завдання?",
     text:"У завданнях дивись на кнопку дії. Для переходів: Відкрити → почекати потрібний час → Перевірити. Для Telegram-підписок спочатку відкрий канал, потім повернись і натисни Перевірити."
   },
   games:{
     icon:"🎮",title:"Як працюють ігри?",
     text:"Кожна гра має власні правила, денні ліміти та cooldown. Результат і нагорода фіксуються сервером. Історію та статистику можна переглядати в Game Center."
   },
   lottery:{
     icon:"🎟️",title:"Як працюють розіграші?",
     text:"Купуй білети за RH у відкритому розіграші. Після завершення система визначає переможця. Інформація про приз, ціну білета та статус розіграшу показується на його сторінці."
   },
   friends:{
     icon:"👥",title:"Як знайти людей?",
     text:"Відкрий Друзі → Пошук. Можна шукати за ім’ям, @username або Telegram ID, а потім додати користувача прямо з результатів."
   }
 };

 function modal(inner){
   let o=document.getElementById("ux47Overlay");
   if(!o){
     o=document.createElement("div");
     o.id="ux47Overlay";
     o.className="ux47-overlay";
     document.body.appendChild(o);
   }
   o.innerHTML=`<section class="ux47-modal">${inner}</section>`;
   o.classList.add("show");
 }

 window.ux47Close=()=>{
   document.getElementById("ux47Overlay")?.classList.remove("show");
 };

 window.ux47Help=key=>{
   const h=help[key];
   if(!h)return;
   modal(`<header><span>${h.icon}</span><button onclick="ux47Close()">×</button></header>
     <small>QUICK GUIDE</small><h2>${E(h.title)}</h2><p>${E(h.text)}</p>
     <button class="ux47-ok" onclick="ux47Close()">ЗРОЗУМІЛО</button>`);
 };

 window.ux47WhatsNew=()=>{
   modal(`<header><span>✧</span><button onclick="ux47Close()">×</button></header>
     <small>REFERHUB · v4.7</small><h2>Що нового</h2>
     <div class="ux47-changelog">
       <article><span>🛡️</span><div><b>Admin Center</b><p>Повний центр керування ботом.</p></div></article>
       <article><span>🎮</span><div><b>15 ігор</b><p>Розширений Game Center та окремі режими.</p></div></article>
       <article><span>👥</span><div><b>Пошук людей</b><p>Пошук за ім’ям, username або Telegram ID.</p></div></article>
       <article><span>📋</span><div><b>Розумні завдання</b><p>Open → Wait → Verify для правильних типів завдань.</p></div></article>
     </div>
     <button class="ux47-ok" onclick="ux47Close()">ГОТОВО</button>`);
 };

 function onboarding(){
   try{
     if(localStorage.getItem("referhub_onboarding_v47")==="1")return;
   }catch(_){}
   setTimeout(()=>{
     modal(`<div class="ux47-onboarding">
       <div class="ux47-logo">R</div>
       <small>WELCOME TO REFERHUB</small>
       <h2>Все в одному боті</h2>
       <p>Виконуй завдання, грай, збирай RH, бери участь у розіграшах і розвивай свій профіль.</p>
       <div class="ux47-onboard-grid">
         <article><span>📋</span><b>Завдання</b></article>
         <article><span>🎮</span><b>Ігри</b></article>
         <article><span>🎟️</span><b>Розіграші</b></article>
         <article><span>👥</span><b>Друзі</b></article>
       </div>
       <button class="ux47-ok" onclick="ux47Finish()">ПОЧАТИ →</button>
     </div>`);
   },550);
 }

 window.ux47Finish=()=>{
   try{localStorage.setItem("referhub_onboarding_v47","1")}catch(_){}
   ux47Close();
 };

 document.addEventListener("click",e=>{
   if(e.target?.id==="ux47Overlay")ux47Close();
 });

 document.addEventListener("DOMContentLoaded",onboarding);
})();
