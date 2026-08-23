
/* ReferHub v4.27 — final 15-game stability layer */
(()=>{
 const ALL=[
   "roulette","daily_case","slot","coin_flip","number_guess","scratch","safe_crack",
   "dice_duel","rps","treasure_grid","reaction","color_pick","high_low","lucky_card","triple_pick"
 ];
 const MODERN=new Set(["color_pick","high_low","lucky_card","triple_pick"]);

 function simple(endpoint,body,id){
   if(typeof gc44SimplePlay==="function")return gc44SimplePlay(endpoint,body,id);
   return api(endpoint,{method:"POST",body:JSON.stringify(body||{})})
     .then(r=>{
       if(r.balance!==undefined&&window.me)me.balance=Number(r.balance);
       toast?.(Number(r.reward||0)>0?`+${Number(r.reward)} RH 🎉`:(r.result_text||"Готово"),Number(r.reward||0)>0?"success":"info");
       window.gc418AfterPlay?.(id,r.result_text||"",Number(r.reward||0));
       return r;
     })
     .catch(e=>toast?.(e.message,"error"));
 }

 // Explicit globals for the four newer games.
 window.playColorPick=choice=>simple("/api/games/color-pick",{choice},"color_pick");
 window.playHighLow=choice=>simple("/api/games/high-low",{choice},"high_low");
 window.playLuckyCard=choice=>simple("/api/games/lucky-card",{choice},"lucky_card");
 window.playTriplePick=choice=>simple("/api/games/triple-pick",{choice},"triple_pick");

 // Final router wrapper: never leave user on an endless loader.
 const route=window.openGameDetail;
 window.openGameDetail=async function(id){
   if(!ALL.includes(id)){
     toast?.("Невідома гра","error");
     return;
   }

   const c=document.getElementById("content");
   const watchdog=setTimeout(()=>{
     if(c?.querySelector(":scope > .loader")){
       c.innerHTML=`<section class="rh427-game-error">
         <span>⚠️</span><h2>Гра не завантажилась</h2>
         <p>${id}</p>
         <button onclick="openGameDetail('${id}')">ПОВТОРИТИ</button>
         <button class="secondary" onclick="gamesPage()">← ДО ІГОР</button>
       </section>`;
     }
   },4500);

   try{
     return await route?.(id);
   }catch(error){
     console.error("v4.27 game route:",id,error);
     // New games can always be rendered by the captured app engine.
     if(MODERN.has(id)&&typeof window.__rh427ModernGameOpen==="function"){
       try{return await window.__rh427ModernGameOpen(id)}catch(_){}
     }
     c.innerHTML=`<section class="rh427-game-error">
       <span>⚠️</span><h2>Помилка гри</h2>
       <p>${String(error?.message||id)}</p>
       <button onclick="openGameDetail('${id}')">ПОВТОРИТИ</button>
       <button class="secondary" onclick="gamesPage()">← ДО ІГОР</button>
     </section>`;
   }finally{
     clearTimeout(watchdog);
   }
 };

 // Validate browser-side handlers so a missing function is visible immediately.
 window.rh427GameHealth=()=>{
   const checks={
     roulette:typeof window.gv2PlayRoulette==="function",
     daily_case:typeof window.gv2OpenCase==="function",
     slot:typeof window.gv2PlaySlot==="function",
     coin_flip:typeof window.gv2PlayCoin==="function",
     number_guess:typeof window.gv2PlayGuess==="function",
     scratch:typeof window.gv2InitScratch==="function",
     safe_crack:typeof window.gv2PlaySafe==="function",
     dice_duel:typeof window.gpPlayDice==="function",
     rps:typeof window.gpPlayRps==="function",
     treasure_grid:typeof window.gpPlayTreasure==="function",
     reaction:typeof window.gpReactionClick==="function",
     color_pick:typeof window.playColorPick==="function",
     high_low:typeof window.playHighLow==="function",
     lucky_card:typeof window.playLuckyCard==="function",
     triple_pick:typeof window.playTriplePick==="function"
   };
   console.table(checks);
   return checks;
 };
})();
