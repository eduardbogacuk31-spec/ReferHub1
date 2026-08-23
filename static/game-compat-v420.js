
/* ReferHub v4.20 — Game compatibility layer
   Keeps legacy visual helpers while app.js stays the only active game engine. */
(()=>{
  // Capture canonical functions from app.js after all scripts have loaded.
  const canonical={
    openGameDetail: window.openGameDetail,
    gamesPage: window.gamesPage,
    playRoulette: window.playRoulette,
    playSlot: window.playSlot,
    openDailyCase: window.openDailyCase,
    playCoinFlip: window.playCoinFlip,
    playNumberGuess: window.playNumberGuess,
    playSafeCrack: window.playSafeCrack
  };

  function restoreCanonical(){
    Object.entries(canonical).forEach(([key,fn])=>{
      if(typeof fn==="function")window[key]=fn;
    });
  }

  function bridgeLegacyHelpers(){
    // Keep useful legacy helpers exposed if they exist.
    const helperNames=[
      "gv2InitScratch","gv2Balance","coinAnimation",
      "premiumRouletteSpin","premiumCaseOpen",
      "celebrateUltra","luxuryWinBurst","scratchDustBurst"
    ];
    helperNames.forEach(name=>{
      if(typeof window[name]==="function"){
        window[`legacy_${name}`]=window[name];
      }
    });
  }

  restoreCanonical();
  bridgeLegacyHelpers();

  // Some legacy files schedule late setup. Re-assert only engine entry points,
  // not every function, so visual helpers remain available.
  setTimeout(restoreCanonical,50);
  setTimeout(restoreCanonical,300);
  setTimeout(restoreCanonical,900);

  document.addEventListener("DOMContentLoaded",restoreCanonical);
})();
