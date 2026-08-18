/* ReferHub X Alpha — Dashboard v1 */
function rhxIcon(name){
  const icons={
    roulette:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3M6.4 6.4l2.1 2.1M15.5 15.5l2.1 2.1M17.6 6.4l-2.1 2.1M8.5 15.5l-2.1 2.1"/><circle cx="12" cy="12" r="2"/></svg>',
    case:'<svg viewBox="0 0 24 24"><path d="M4 9h16v11H4zM6 5h12l2 4H4z"/><path d="M10 9h4v5h-4z"/></svg>',
    friends:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.3"/><path d="M3.5 19c.5-3.5 2.5-5.3 5.5-5.3s5 1.8 5.5 5.3M14.5 14.5c3-.5 5 .9 5.8 3.8"/></svg>',
    shop:'<svg viewBox="0 0 24 24"><path d="M4 8h16l-1.5 12h-13zM8 8c0-3 1.5-5 4-5s4 2 4 5"/></svg>',
    tasks:'<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9zM8.5 12l2 2 4-4M8.5 17h7"/></svg>',
    season:'<svg viewBox="0 0 24 24"><path d="m13 2-8 12h6l-1 8 9-13h-6z"/></svg>',
    arrow:'<svg viewBox="0 0 24 24"><path d="M5 12h14M14 7l5 5-5 5"/></svg>',
    crown:'<svg viewBox="0 0 24 24"><path d="m4 8 4 4 4-7 4 7 4-4-2 11H6z"/></svg>',
    activity:'<svg viewBox="0 0 24 24"><path d="M4 13h4l2-7 4 13 2-6h4"/></svg>'
  }; return icons[name]||icons.activity;
}

function rhxRelativeTime(ts){
  const diff=Math.max(0,Math.floor(Date.now()/1000)-Number(ts||0));
  if(diff<60)return 'щойно'; if(diff<3600)return `${Math.floor(diff/60)} хв тому`;
  if(diff<86400)return `${Math.floor(diff/3600)} год тому`; return `${Math.floor(diff/86400)} д тому`;
}

function rhxSkeleton(){
  return `
    <section class="rhx-dashboard rhx-skeleton-page" aria-busy="true">
      <div class="rhx-skeleton rhx-skeleton-hero"><i></i><i></i><i></i><i></i></div>
      <div class="rhx-skeleton-quick">${Array.from({length:4},()=>'<div class="rhx-skeleton"><i></i><i></i></div>').join('')}</div>
      <div class="rhx-skeleton-main">${Array.from({length:2},()=>'<div class="rhx-skeleton"><i></i><i></i><i></i></div>').join('')}</div>
      <div class="rhx-skeleton rhx-skeleton-feed"><i></i><i></i><i></i><i></i></div>
    </section>`;
}

function rhxSafeArray(value){
  return Array.isArray(value)?value:[];
}

function rhxSafeObject(value,fallback={}){
  return value&&typeof value==='object'&&!Array.isArray(value)?value:fallback;
}

async function rhxOpenGame(gameKey){
  await openPage('games');
  let attempts=0;
  const locate=()=>{
    const target=document.querySelector(`[data-premium-game="${gameKey}"]`)||document.querySelector(`[data-game-key="${gameKey}"]`);
    if(target){
      target.scrollIntoView({behavior:'smooth',block:'center'});
      target.classList.add('rhx-game-target');
      setTimeout(()=>target.classList.remove('rhx-game-target'),1200);
      return;
    }
    if(++attempts<12)setTimeout(locate,90);
  };
  setTimeout(locate,80);
}

async function homePage(){
  content.innerHTML=rhxSkeleton();

  const requests=[
    ['feed','/api/feed'],['tasks','/api/tasks'],['missions','/api/missions'],
    ['tournaments','/api/tournaments'],['season','/api/season'],
    ['games','/api/games'],['history','/api/games/history']
  ];
  const settled=await Promise.allSettled(requests.map(([,url])=>api(url)));
  const data={};
  const failed=[];
  settled.forEach((result,index)=>{
    const key=requests[index][0];
    if(result.status==='fulfilled')data[key]=result.value;
    else{data[key]=null;failed.push(key);console.warn(`Dashboard block ${key} failed`,result.reason)}
  });

  const feed=rhxSafeArray(data.feed);
  const tasks=rhxSafeArray(data.tasks);
  const missions=rhxSafeArray(data.missions);
  const tournaments=rhxSafeArray(data.tournaments);
  const seasonData=rhxSafeObject(data.season,{active:false});
  const games=rhxSafeArray(data.games);
  const history=rhxSafeArray(data.history);

  const dailyReady=!!me?.daily?.available;
  const activeTournament=tournaments.find(t=>t?.status==='active');
  const activeTasks=tasks.filter(t=>!t?.claimed);
  const activeMissions=missions.filter(m=>!m?.claimed);
  const seasonLevelProgress=Number(seasonData.level_progress||0);
  const seasonXpPerLevel=Math.max(1,Number(seasonData.xp_per_level||1));
  const seasonProgress=seasonData.active?Math.min(100,Math.max(0,seasonLevelProgress/seasonXpPerLevel*100)):0;
  const lastGame=history[0]||null;
  const heroMode=dailyReady?'daily':activeTournament?'event':seasonData.active?'season':'profile';
  const heroTitle=heroMode==='daily'?'Щоденна нагорода готова':heroMode==='event'?(activeTournament.title||'Активний турнір'):heroMode==='season'?(seasonData.season?.title||'Активний сезон'):`Рівень ${me?.level?.number||1} · ${me?.level?.name||'Новачок'}`;
  const heroText=heroMode==='daily'?`Серія входів: ${Number(me?.daily?.streak||0)} днів`:heroMode==='event'?`Твій результат: ${Number(activeTournament.my_score||0)}`:heroMode==='season'?`Season LVL ${Number(seasonData.current_level||0)} · ${Number(seasonData.season_xp||0)} XP`:`${Math.max(0,Number(me?.level?.next||me?.xp||0)-Number(me?.xp||0))} XP до наступного рівня`;
  const heroAction=heroMode==='daily'?`claimDaily()`:heroMode==='event'?`tournamentsPage()`:heroMode==='season'?`openPage('season')`:`openPage('profile')`;
  const heroButton=heroMode==='daily'?'Забрати':heroMode==='event'?'Відкрити турнір':heroMode==='season'?'Season Pass':'Профіль';
  const firstName=String(me?.first_name||'Гравець');
  const avatar=me?.photo_url?`<img src="${esc(me.photo_url)}" alt="Аватар ${esc(firstName)}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${esc(firstName[0]||'R')}'}))">`:`<span>${esc(firstName[0]||'R')}</span>`;
  const quick=[
    ['roulette','Рулетка','Jackpot і нагороди',`rhxOpenGame('roulette')`,'gold'],
    ['case','Daily Case',dailyReady?'Доступний зараз':'Нагорода завтра',`rhxOpenGame('daily_case')`,'violet'],
    ['friends','Друзі',`${Number(me?.referrals_count||0)} запрошено`,`openPage('friends')`,'blue'],
    ['shop','Магазин','Рамки та подарунки',`openPage('shop')`,'emerald']
  ];
  const levelProgress=Math.max(0,Math.min(100,Number(me?.level?.progress||0)));
  const seasonTitle=seasonData.active?(seasonData.season?.title||'Активний сезон'):'Новий сезон скоро';
  const seasonText=seasonData.active?`${Number(seasonData.season_xp||0)} Season XP`:'Готуйся до нових нагород';
  const onlineCount=Number(me?.online_count||0);

  content.innerHTML=`
    <section class="rhx-dashboard" aria-label="ReferHub Dashboard">
      ${failed.length?`<div class="rhx-partial-warning"><span>i</span><p>Частина даних оновлюється. Основні функції доступні.</p><button onclick="homePage()">Оновити</button></div>`:''}
      <header class="rhx-hero rhx-mode-${heroMode}">
        <div class="rhx-hero-grid"></div><div class="rhx-hero-orb orb-one"></div><div class="rhx-hero-orb orb-two"></div>
        <div class="rhx-profile-row">
          <button class="rhx-avatar" onclick="openPage('profile')" aria-label="Відкрити профіль">${avatar}<i></i></button>
          <div class="rhx-profile-copy"><span>REFERHUB X · ALPHA 1.1</span><h1>${esc(firstName)}</h1><p>${rhxIcon('crown')} ${esc(me?.level?.name||'Новачок')} · #${Number(me?.rank||0)||'—'}</p></div>
          <button class="rhx-balance" onclick="openPage('shop')" aria-label="Відкрити магазин"><small>RH BALANCE</small><strong id="rhxBalance">${Number(me?.balance||0)}</strong><span>RH</span></button>
        </div>
        <div class="rhx-hero-focus">
          <div><span class="rhx-focus-label">${heroMode.toUpperCase()}</span><h2>${esc(heroTitle)}</h2><p>${esc(heroText)}</p></div>
          <button onclick="${heroAction}">${heroButton} ${rhxIcon('arrow')}</button>
        </div>
        <div class="rhx-xp-row"><span>LVL ${Number(me?.level?.number||1)}</span><div><i data-rhx-progress="${levelProgress}" style="width:0%"></i></div><strong>${Math.round(levelProgress)}%</strong></div>
      </header>

      <section class="rhx-quick-grid" aria-label="Швидкі дії">
        ${quick.map(([icon,title,sub,action,tone])=>`<button class="rhx-quick rhx-${tone}" onclick="${action}"><span>${rhxIcon(icon)}</span><div><b>${title}</b><small>${sub}</small></div>${rhxIcon('arrow')}</button>`).join('')}
      </section>

      <section class="rhx-main-grid">
        <article class="rhx-daily-card ${dailyReady?'ready':''}">
          <div class="rhx-card-heading"><span>DAILY CENTER</span><b>${dailyReady?'READY':'DONE'}</b></div>
          <h2>${dailyReady?'Забери щоденний бонус':'Повертайся завтра'}</h2>
          <p>Серія входів: <strong>${Number(me?.daily?.streak||0)}</strong> днів</p>
          <div class="rhx-daily-actions">
            <button onclick="claimDaily()" ${dailyReady?'':'disabled'}>${dailyReady?'Забрати нагороду':'Отримано'}</button>
            <button class="secondary" onclick="openPage('tasks')">${activeMissions.length} місій</button>
          </div>
        </article>

        <article class="rhx-season-card" onclick="openPage('season')" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){openPage('season')}">
          <div class="rhx-card-heading"><span>SEASON PASS</span><b>${seasonData.active?`LVL ${Number(seasonData.current_level||0)}`:'SOON'}</b></div>
          <h2>${esc(seasonTitle)}</h2>
          <p>${esc(seasonText)}</p>
          <div class="rhx-season-progress"><i data-rhx-progress="${seasonProgress}" style="width:0%"></i></div>
          <small>${Math.round(seasonProgress)}% до наступного рівня</small>
        </article>
      </section>

      <section class="rhx-section">
        <div class="rhx-section-title"><div><span>ACTIVE NOW</span><h2>Місії</h2></div><button onclick="openPage('tasks')">Усі ${rhxIcon('arrow')}</button></div>
        <div class="rhx-mission-strip">
          ${activeMissions.slice(0,3).map(m=>{const target=Math.max(1,Number(m?.target_value||m?.target||1));const value=Number(m?.progress||0);const p=Math.min(100,Math.max(0,value/target*100));return `<article><span>${rhxIcon('tasks')}</span><div><b>${esc(m?.title||m?.name||'Місія')}</b><small>${value}/${target} · +${Number(m?.reward||0)} RH</small><i><em data-rhx-progress="${p}" style="width:0%"></em></i></div></article>`}).join('')||`<article class="empty"><div><b>${data.missions===null?'Місії завантажуються':'Усі місії виконано'}</b><small>${data.missions===null?'Спробуй оновити блок':'Нові завдання з’являться пізніше'}</small></div></article>`}
        </div>
      </section>

      <section class="rhx-section rhx-activity-section">
        <div class="rhx-section-title"><div><span>LIVE FEED</span><h2>Остання активність</h2></div><small>${onlineCount} онлайн</small></div>
        <div class="rhx-activity-list">
          ${feed.slice(0,6).map((item,index)=>`<article style="--i:${index}"><span>${rhxIcon('activity')}</span><div><b>${esc(item?.first_name||'Гравець')}</b><p>${esc(item?.note||'Отримав нагороду')}</p></div><strong>+${Number(item?.amount||0)} RH</strong></article>`).join('')||`<article><span>${rhxIcon('activity')}</span><div><b>${data.feed===null?'Журнал оновлюється':'Активності поки немає'}</b><p>${data.feed===null?'Основні функції продовжують працювати':'Тут з’являться останні нагороди'}</p></div></article>`}
        </div>
      </section>

      <section class="rhx-footer-stats">
        <div><span>Зароблено</span><strong>${Number(me?.total_earned||0)}</strong><small>RH</small></div>
        <div><span>Друзі</span><strong>${Number(me?.referrals_count||0)}</strong><small>рефералів</small></div>
        <div><span>Завдання</span><strong>${activeTasks.length}</strong><small>доступно</small></div>
        <div><span>Остання гра</span><strong>${lastGame?gameIcon(lastGame.game_key):'—'}</strong><small>${lastGame?gameName(lastGame.game_key):'немає'}</small></div>
      </section>
    </section>`;
  addCrispMotion();
  setupMotionForPage();
  initRHXDashboard();
}
function initRHXDashboard(){
  const hero=document.querySelector('.rhx-hero');
  if(!hero)return;

  if(window.matchMedia?.('(pointer:fine)').matches){
    hero.addEventListener('pointermove',e=>{
      const r=hero.getBoundingClientRect();
      hero.style.setProperty('--mx',`${((e.clientX-r.left)/r.width-.5)*12}px`);
      hero.style.setProperty('--my',`${((e.clientY-r.top)/r.height-.5)*9}px`);
    },{passive:true});
    hero.addEventListener('pointerleave',()=>{
      hero.style.setProperty('--mx','0px');
      hero.style.setProperty('--my','0px');
    });
  }

  document.querySelectorAll('.rhx-dashboard article,.rhx-quick,.rhx-partial-warning').forEach((el,i)=>{
    setTimeout(()=>el.classList.add('rhx-visible'),Math.min(i,14)*40);
  });

  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    document.querySelectorAll('[data-rhx-progress]').forEach(bar=>{
      bar.style.width=`${Math.max(0,Math.min(100,Number(bar.dataset.rhxProgress||0)))}%`;
    });
  }));
}
