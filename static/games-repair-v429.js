
(()=>{
 const legacyIds=new Set(["roulette","daily_case","slot","coin_flip","number_guess","scratch","safe_crack","dice_duel","rps","treasure_grid","reaction"]);
 const modernIds=new Set(["color_pick","high_low","lucky_card","triple_pick"]);
 const legacy=window.__gp423LegacyOpenGameDetail||window.__rh427LegacyGameOpen;
 const modern=window.__rh427ModernGameOpen||window.openGameDetail;
 const catalog=window.__rh427ModernGamesPage||window.gamesPage;
 const err=(id,e)=>{const c=document.getElementById("content");if(c)c.innerHTML=`<section class="g429-error"><span>🎮</span><h2>Гра не запустилась</h2><p>${String(e?.message||e||id)}</p><button onclick="openGameDetail('${id}')">ПОВТОРИТИ</button><button onclick="gamesPage()">← ДО ІГОР</button></section>`};
 window.openGameDetail=async id=>{try{if(legacyIds.has(id)&&typeof legacy==="function")return await legacy(id);if(modernIds.has(id)&&typeof modern==="function")return await modern(id);throw new Error("Ігровий модуль недоступний")}catch(e){console.error(id,e);try{if(typeof modern==="function")return await modern(id)}catch(_){}return err(id,e)}};
 if(typeof catalog==="function")window.gamesPage=()=>catalog();
})();
