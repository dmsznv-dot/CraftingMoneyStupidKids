import {ACHIEVEMENTS,achievementCopy,achievementDescription,achievementValue,readyAchievements,claimAchievement,syncAchievements} from './achievements.ts';
import type {AchievementGroup} from './achievements.ts';
import Phaser from 'phaser';
import {createRun,stepRun,nudge,placeStarter,fuseCue,PICKS,BLOCKS,LEVELS,maxDurability} from './core.ts';
import type {Pick,Run,RunEvent} from './core.ts';
import {AURAS,buy,settle,reward,PRICES,levelReward} from './progress.ts';
import type {Aura,Item,Progress} from './progress.ts';
import {SaveStore} from './storage.ts';
import {Platform} from './platform.ts';
import {messages,nudgeCount} from './i18n.ts';
import type {Key} from './i18n.ts';
import {AudioBus} from './audio.ts';
import {MineScene} from './scene.ts';
import {AuraPreviews} from './aura-preview.ts';
import {pickUrls,preparePickSprites} from './pick-sprite.ts';
import './style.css';

const platform=new Platform(),store=new SaveStore(),audio=new AudioBus();
const app=document.querySelector<HTMLDivElement>('#app')!;
let p:Progress,r:Run,remote:Progress|null=null,screen='none',returnScreen='none',placing=false,lastSave=0,lastHud=0,transition=false;
let game:Phaser.Game;let toastTimer:ReturnType<typeof setTimeout>;let warnedRun='';
let auraPreviews:AuraPreviews|null=null;
let achievementReturn='none',achievementFilter:'all'|AchievementGroup='all';
const at=()=>achievementCopy[p.lang];
const formatCount=(n:number)=>n.toLocaleString(p.lang==='ru'?'ru-RU':'en-US');
const t=(key:Key)=>messages[p.lang][key];
// The first-nudge lesson runs until the player has spent a nudge once.
let cueShown=false;
const cue=()=>{const c=p.tutorial||platform.gate.paused?null:fuseCue(r,cueShown);cueShown=!!c;return c;};
const pickKeys=Object.keys(PICKS) as Pick[];
const auraNames:Record<Aura,Key>={none:'auraNone',fire:'auraFire',lightning:'auraLightning',enchanted:'auraEnchanted',ghost:'auraGhost'};
const svg=(name:string)=>{
 const paths:Record<string,string>={trophy:'<path d="M7 4h10v6a5 5 0 0 1-10 0zM7 6H4v3a4 4 0 0 0 4 4m9-7h3v3a4 4 0 0 1-4 4M12 15v5m-4 0h8"/>',pause:'<path d="M8 5v14M16 5v14"/>',sound:'<path d="M4 9h4l5-4v14l-5-4H4zM17 8q6 4 0 8"/>',mute:'<path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6m0-6-5 6"/>',expand:'<path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/>',back:'<path d="m14 6-6 6 6 6"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',left:'<path d="M19 12H5m6-6-6 6 6 6"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',lock:'<rect x="6" y="10" width="12" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',check:'<path d="m5 12 4 4 10-10"/>',spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',mountain:'<path d="m2 19 7-12 4 6 3-5 6 11zM6 19l3-5 3 5"/>',workshop:'<path d="M3 19h18M5 19v-8l7-7 7 7v8M9 19v-6h6v6"/>'};
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]??paths.spark)+'</svg>';
};
const nugget='<span class="nugget" aria-hidden="true"></span>';
function pickIcon(key:Pick,size=''){return `<img class="pick-icon ${size}" src="${pickUrls[key]}" alt="" aria-hidden="true" draggable="false">`;}
function save(force=false){
 syncAchievements(p,r);
 if(r.mode==='endless'){r.oreClaimed??=0;r.relics??=0;r.claimedRelics??=0;p.endlessAttempt=structuredClone(r);p.endlessAttempt.events=[];p.mode='endless';}
 else{p.attempt=structuredClone(r);p.attempt.events=[];p.mode='campaign';}
 p.revision++;store.save(p);void store.flush(p,force);
}
function notify(text:string){const el=document.querySelector<HTMLElement>('#toast')!;el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}
function syncGate(){const active=r?.status==='playing'&&!platform.gate.paused;platform.gameplay(active);const keepMusic=r?.status==='lost'&&screen==='result'&&!platform.gate.reasons.has('platform')&&!platform.gate.reasons.has('ad');audio.pause(platform.gate.paused||!active,keepMusic);}
function modal(next:string){screen=next;platform.gate.set('modal',next!=='none');syncGate();renderModal();}
function prepare(level:number){placing=false;r=createRun(level,p.pick,p.enchant,p.owned.includes('starter'));modal('none');render();save();}
function prepareEndless(){placing=false;const seed=crypto.getRandomValues(new Uint32Array(1))[0];r=createRun(0,p.pick,p.enchant,p.owned.includes('starter'),seed);modal('none');render();save();}
function changeMode(mode:'campaign'|'endless'){
 if(mode===(r.mode??'campaign')||platform.busy)return;
 save(true);p.mode=mode;
 r=mode==='endless'?p.endlessAttempt??createRun(0,p.pick,p.enchant,p.owned.includes('starter'),crypto.getRandomValues(new Uint32Array(1))[0]):p.attempt??createRun(p.unlocked,p.pick,p.enchant,p.owned.includes('starter'));
 placing=false;cueShown=false;render();modal(r.status==='playing'?'restore':r.status==='won'||r.status==='lost'?'result':'none');save(true);
}
function performNudge(dir:number){if(r.status!=='playing'||platform.gate.paused)return;if(nudge(r,dir)){audio.play('nudge');if(!p.tutorial){p.tutorial=true;notify(t('coachDone'));}save();hud();}}
function start(){if(r.status!=='ready'||screen!=='none'||platform.busy)return;audio.unlock();r.status='playing';placing=false;syncGate();render();save();}
function render(){
 document.documentElement.lang=p.lang;document.title=p.lang==='ru'?'Шахта импульсов':'Shaft & Impulse';
 const playing=r.status==='playing';
 document.querySelector('#brand')!.innerHTML=`${svg('mountain')}<div><b>${t('title')}</b><small>${t('subtitle')}</small></div>`;
 document.querySelector('#wallet-label')!.textContent=t('wallet');
 document.querySelector('#sound')!.innerHTML=svg(p.sound?'sound':'mute');document.querySelector('#sound')!.setAttribute('aria-label',t('sound'));
 document.querySelector('#language')!.textContent=p.lang.toUpperCase();document.querySelector('#language')!.setAttribute('aria-label',t('language'));
 document.querySelector('#fullscreen')!.innerHTML=svg('expand');document.querySelector('#fullscreen')!.setAttribute('aria-label',t('full'));
 for(const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-mode]'))){button.textContent=t(button.dataset.mode==='endless'?'modeEndless':'modeCampaign');button.setAttribute('aria-pressed',String((r.mode??'campaign')===button.dataset.mode));}
 document.querySelector('#pause')!.innerHTML=svg('pause');document.querySelector('#pause')!.setAttribute('aria-label',t('pause'));
 document.querySelector<HTMLButtonElement>('#pause')!.disabled=!playing;
 document.querySelector<HTMLButtonElement>('#language')!.disabled=playing;
 if(r.mode==='endless'){
  document.querySelector('#level-name')!.textContent=t('endlessTitle');
  document.querySelector('#stratum')!.textContent=`${t('bestDepth')}: ${p.endlessBest} m · ${t('relicCount')}: ${p.relics}`;
  document.querySelector('#level-no')!.textContent=`∞ · ${Math.floor(r.y/32)} m`;
 }else{
  document.querySelector('#level-name')!.textContent=t((LEVELS[r.level].name==='chain'?'chainLevel':LEVELS[r.level].name) as Key);
  document.querySelector('#stratum')!.textContent=`${t('chapter')} ${LEVELS[r.level].chapter+1} / 5`;
  document.querySelector('#level-no')!.textContent=`${t('level')} ${String(r.level+1).padStart(2,'0')} / ${LEVELS.length}`;
 }
 document.querySelector('#hud-label-depth')!.textContent=t('depth');document.querySelector('#hud-label-hp')!.textContent=t('durability');
 document.querySelector('#hud-label-ore')!.textContent=t('runOre');
 document.querySelector('#prep')!.classList.toggle('hidden',r.status!=='ready');
 document.querySelector('#pretitle')!.textContent=placing?t('tntHint'):t('prepare');
 document.querySelector('#prehint')!.textContent=placing?'':t(r.mode==='endless'?'endlessHint':'prepareHint');
 document.querySelector('#drop')!.innerHTML=`${pickIcon(r.pick)}<span>${t('drop')}</span>${svg('arrow')}`;
 document.querySelector('#shop')!.innerHTML=`${svg('workshop')} ${t('shop')}`;
 document.querySelector('#levels')!.innerHTML=`${svg('mountain')} ${t('levels')}`;document.querySelector<HTMLButtonElement>('#levels')!.classList.toggle('hidden',r.mode==='endless');
 document.querySelector('#tnt-slot')!.innerHTML=p.owned.includes('starter')?`<button id="place-tnt" class="text-button" ${r.starterPlaced?'disabled':''}><span class="tnt-mini">TNT</span> ${r.starterPlaced?t('tntPlaced'):t('placeTnt')}</button>`:'';
 document.querySelector('#equipped-info')!.innerHTML=`${pickIcon(r.pick)}<div><b>${t(r.pick)}</b><small>${nudgeCount(p.lang,PICKS[r.pick].nudges)}${p.enchant!=='none'?' · '+t(p.enchant):''}</small></div>`;
 document.querySelector('#controls')!.classList.toggle('dormant',!playing);
 document.querySelector('#controls-title')!.textContent=PICKS[r.pick].nudges?t('nudges'):t('auto');
 document.querySelector('#control-hint')!.textContent=PICKS[r.pick].nudges?`${nudgeCount(p.lang,PICKS[r.pick].nudges)} ${t('perDrop')}. ${t('stoneHint')}`:t('autoHint');
 document.querySelector('#left')!.innerHTML=svg('left');document.querySelector('#right')!.innerHTML=svg('arrow');
 document.querySelector('#left')!.setAttribute('aria-label',t('left'));document.querySelector('#right')!.setAttribute('aria-label',t('right'));
 document.querySelector('#local-mode')!.textContent=platform.sdk?'':t('local');
 audio.setEnabled(p.sound);hud();renderModal();
}
function hud(){
 document.querySelector('#wallet')!.textContent=String(p.coins);
 const available=readyAchievements(p).length,achievementButton=document.querySelector<HTMLButtonElement>('#achievements')!;
 achievementButton.innerHTML=`${svg('trophy')}${available?`<span class="achievement-badge">${available}</span>`:''}`;achievementButton.setAttribute('aria-label',`${at().title}${available?' · '+at().ready+': '+available:''}`);achievementButton.title=at().title;achievementButton.disabled=store.conflict||platform.busy;
 const depth=r.mode==='endless'?`${Math.floor(r.y/32)} m`:Math.max(0,Math.min(100,Math.floor((r.y-64)/(r.rows*32-64)*100)))+'%';
 document.querySelector('#depth')!.textContent=depth;document.querySelector('#ore')!.textContent=String(r.ore);
 if(r.mode==='endless'){
  document.querySelector('#level-no')!.textContent=`∞ · ${Math.floor(r.y/32)} m`;
  document.querySelector('#stratum')!.textContent=`${t('bestDepth')}: ${p.endlessBest} m · ${t('relicCount')}: ${p.relics}`;
 }
 const bonus=document.querySelector<HTMLElement>('#bonus-counter')!;bonus.textContent=r.doubleLeft?`×2 · ${r.doubleLeft}/5`:'';bonus.classList.toggle('hidden',!r.doubleLeft);
 const relics=document.querySelector<HTMLElement>('#relic-counter')!;relics.textContent=`◆ ${p.relics} ${t('relics')}`;relics.classList.toggle('hidden',p.relics===0);
 const powers:string[]=[];if((r.oneHitTime??0)>0)powers.push(`ϟ ${t('oneHitShort')} ${Math.ceil(r.oneHitTime!)}s`);if((r.phaseTime??0)>0)powers.push(`◌ ${t('phaseShort')} ${Math.ceil(r.phaseTime!)}s`);if((r.magnetTime??0)>0)powers.push(`M ${t('magnetShort')} ${Math.ceil(r.magnetTime!)}s`);if((r.shieldTime??0)>0)powers.push(`⬡ ${t('shieldShort')} ${Math.ceil(r.shieldTime!)}s`);if(r.helmetReady)powers.push(`⛑ ${t('helmetShort')}`);
 const powerups=document.querySelector<HTMLElement>('#powerup-counter')!;powerups.textContent=powers.join(' · ');powerups.classList.toggle('hidden',!powers.length);
 const maxHp=maxDurability(r);document.querySelector('#hp')!.textContent=String(Math.min(Math.ceil(r.hp),maxHp))+'/'+maxHp;
 const bar=document.querySelector<HTMLElement>('#hp-fill')!;bar.style.width=(r.hp/maxHp*100)+'%';bar.classList.toggle('low',r.hp/maxHp<.25);
 document.querySelector('#charges')!.innerHTML=Array.from({length:Math.max(1,PICKS[r.pick].nudges)},(_,i)=>`<i class="${i<r.nudges?'lit':''}"></i>`).join('');
 document.querySelector('#charge-count')!.textContent=PICKS[r.pick].nudges?`${r.nudges} / ${PICKS[r.pick].nudges}`:'—';
 for(const id of ['left','right'])document.querySelector<HTMLButtonElement>('#'+id)!.disabled=r.status!=='playing'||!r.nudges||platform.gate.paused;
 const c=cue(),coach=document.querySelector<HTMLElement>('#coach')!;coach.classList.toggle('show',!!c);if(c)coach.textContent=t(c.dir<0?'coachLeft':'coachRight');
 document.querySelector('#left')!.classList.toggle('coach',c?.dir===-1);document.querySelector('#right')!.classList.toggle('coach',c?.dir===1);
 if(store.error)document.querySelector('#local-mode')!.textContent=t('saveError');
}
function closeButton(){return `<button class="icon-button close" data-action="close" aria-label="${t('close')}">${svg('close')}</button>`;}
function renderModal(){
 if(screen!=='shop'&&auraPreviews){auraPreviews.destroy();auraPreviews=null;}
 const layer=document.querySelector<HTMLElement>('#modal')!;layer.classList.toggle('hidden',screen==='none');layer.innerHTML='';
 if(screen==='none')return;
 let content='';
 if(screen==='shop'){
  content=`<div class="modal-panel shop-panel">${closeButton()}<span class="eyebrow">${t('shop')}</span><h2>${t('workshop')}</h2><p class="muted">${t('workshopHint')}</p><div class="shop-wallet">${nugget}<b>${p.coins}</b></div><h3>${t('auras')}</h3><p class="aura-hint">${t('auraHint')}</p><div class="aura-grid" role="group" aria-label="${t('auras')}">${AURAS.map(aura=>`<button class="aura-card aura-${aura}" data-aura="${aura}" aria-pressed="${p.aura===aura}"><span class="aura-preview"><canvas width="100" height="105" data-aura-preview="${aura}" aria-hidden="true"></canvas></span><b>${t(auraNames[aura])}</b><small>${t(p.aura===aura?'equipped':'equip')}</small></button>`).join('')}</div><h3>${t('tools')}</h3><div class="pick-grid">${pickKeys.map((key,i)=>{
   const owned=p.owned.includes(key),selected=p.pick===key,locked=i>0&&!p.owned.includes(pickKeys[i-1]);
   return `<article class="tool-card ${selected?'selected':''}">${pickIcon(key,'large')}<div class="tool-title"><b>${t(key)}</b><span>${PICKS[key].nudges} ${svg('spark')}</span></div><p>${t((key+'Desc') as Key)}</p><small>♥ ${PICKS[key].hp}</small><button class="${owned?'secondary':'buy'}" data-item="${key}" ${selected||locked||!owned&&p.coins<PRICES[key]?'disabled':''}>${selected?svg('check')+t('equipped'):owned?t('equip'):locked?svg('lock')+t('needPrevious'):nugget+PRICES[key]}</button></article>`;
  }).join('')}</div><h3>${t('upgrades')}</h3><div class="upgrade-list">${(['starter','wave','chain'] as Item[]).map(key=>{
   const owned=p.owned.includes(key),selected=key==='starter'?owned:p.enchant===key;
   return `<article class="upgrade"><div class="upgrade-icon">${key==='starter'?'<span class="tnt-mini">TNT</span>':svg('spark')}</div><div><b>${t(key as Key)}</b><p>${t((key+'Desc') as Key)}</p></div><button class="secondary" data-item="${key}" ${selected||!owned&&p.coins<PRICES[key]?'disabled':''}>${selected?svg('check'):owned?t('equip'):nugget+PRICES[key]}</button></article>`;
  }).join('')}</div>${p.enchant!=='none'?`<button class="text-button" data-action="unequip">${t('none')}</button>`:''}<p class="fine">${t('enchants')}</p></div>`;
 }else if(screen==='achievements'){
  content=renderAchievements();
 }else if(screen==='levels'){
  content=`<div class="modal-panel">${closeButton()}<span class="eyebrow">${LEVELS.length} ${t('level')}</span><h2>${t('levels')}</h2><div class="level-grid">${LEVELS.map((l,i)=>`${i%9===0?`<h3 class="chapter-title">${t('chapter')} ${l.chapter+1}</h3>`:''}<button class="level-card ${i===r.level?'selected':''}" data-level="${i}" ${i>p.unlocked?'disabled':''}><strong>${i<=p.unlocked?String(i+1).padStart(2,'0'):svg('lock')}</strong><span>${t((l.name==='chain'?'chainLevel':l.name) as Key)}</span><small class="level-reward">${nugget} +${levelReward(i)}</small><small>${i<=p.unlocked?`${t('best')}: ${p.best[i]}`:t('locked')}</small></button>`).join('')}</div></div>`;
 }else if(screen==='pause'){
  content=`<div class="modal-panel compact">${closeButton()}<div class="result-mark">${svg('pause')}</div><h2>${t('paused')}</h2><p class="muted">${t('pausedHint')}</p><button class="primary" data-action="resume">${t('resume')}${svg('arrow')}</button><button class="secondary" data-action="restart">${t('restart')}</button></div>`;
 }else if(screen==='result'){
  const won=r.status==='won',receipt=p.receipts[r.id];
  const endless=r.mode==='endless';
  content=`<div class="modal-panel compact result"><span class="eyebrow">${endless?`${t('endlessTitle')} · ${Math.floor(r.y/32)} m`:`${t('level')} ${String(r.level+1).padStart(2,'0')}`}</span><div class="result-mark ${won?'success':''}">${svg(won?'check':'mountain')}</div><h2>${t(won?'won':'lost')}</h2><p class="muted">${endless?t('endlessLost'):t(won&&r.level===LEVELS.length-1?'finalHint':won?'wonHint':'lostHint')}</p>${won&&!endless?`<div class="reward-detail"><span>${t('base')}</span><b>+${levelReward(r.level)}</b><span>${t('oreBonus')}</span><b>+${r.ore}</b></div><div class="reward-total">${nugget}<strong>+${receipt?.amount??0}</strong><span>${t('total')}</span></div>`:''}<button class="primary" data-action="${won&&!endless&&r.level<LEVELS.length-1?'next':'restart'}">${t(won&&!endless&&r.level<LEVELS.length-1?'next':'again')}${svg('arrow')}</button>${won&&!endless?`<button class="secondary ad-button" data-action="reward" ${receipt?.rewarded||platform.busy?'disabled':''}>${svg('spark')}${t(receipt?.rewarded?'bonusDone':'ad')}</button>`:''}<button class="text-button" data-action="workshop">${svg('workshop')}${t('shop')}</button></div>`;
 }else if(screen==='restore'){
  content=`<div class="modal-panel compact"><div class="result-mark">${pickIcon(r.pick)}</div><h2>${t('continueRun')}</h2><p class="muted">${t('continueHint')}</p><button class="primary" data-action="restore">${t('resume')}${svg('arrow')}</button><button class="secondary" data-action="restart">${t('restart')}</button></div>`;
 }else if(screen==='conflict'){
  content=`<div class="modal-panel compact"><h2>${t('cloudChoice')}</h2><p class="muted">${t('cloudHint')}</p><button class="primary" data-action="choose-local">${t('localSave')} · ${p.coins} ${nugget}</button><button class="secondary" data-action="choose-cloud">${t('cloudSave')} · ${remote?.coins??0} ${nugget}</button></div>`;
 }
 layer.innerHTML=content;
 layer.querySelector<HTMLElement>('.modal-panel')?.setAttribute('role','dialog');layer.querySelector<HTMLElement>('.modal-panel')?.setAttribute('aria-modal','true');
 if(screen==='shop'){auraPreviews??=new AuraPreviews(()=>p.pick);auraPreviews.setTargets(layer);}
}
function renderAchievements(){
 const copy=at(),ready=readyAchievements(p),done=ACHIEVEMENTS.filter(a=>achievementValue(p,a)>=a.target).length;
 const groupIcon:Record<AchievementGroup,string>={depth:'mountain',mining:'workshop',explosions:'spark',bonuses:'spark',journey:'trophy'};
 const state=(id:string)=>p.achievements.claimed.includes(id)?2:ready.some(a=>a.id===id)?0:1;
 const entries=ACHIEVEMENTS.filter(a=>achievementFilter==='all'||a.group===achievementFilter).sort((a,b)=>state(a.id)-state(b.id));
 return `<div class="modal-panel achievement-panel">${closeButton()}<span class="eyebrow">${copy.title}</span><h2>${copy.journey}</h2><p class="muted">${copy.hint}</p><div class="achievement-summary"><span><b>${done}/${ACHIEVEMENTS.length}</b> ${copy.completed}</span><span><b>${ready.length}</b> ${copy.ready.toLowerCase()}</span><button class="secondary" data-action="claim-all" ${ready.length?'':'disabled'}>${copy.claimAll} ${nugget} ${formatCount(ready.reduce((sum,a)=>sum+a.reward,0))}</button></div><div class="achievement-filters" role="group" aria-label="${copy.title}">${(['all','depth','mining','explosions','bonuses','journey'] as const).map(group=>`<button class="achievement-filter" data-achievement-filter="${group}" aria-pressed="${achievementFilter===group}">${copy[group]}</button>`).join('')}</div><div class="achievement-list">${entries.map(a=>{
  const value=Math.min(a.target,achievementValue(p,a)),claimed=p.achievements.claimed.includes(a.id),complete=value>=a.target;
  return `<article class="achievement-card ${claimed?'claimed':complete?'ready':''}"><div class="achievement-icon">${svg(groupIcon[a.group])}</div><div class="achievement-info"><h3>${a.title[p.lang]} <small>· ${formatCount(a.target)}</small></h3><p>${achievementDescription(a,p.lang)}</p><div class="achievement-progress" role="progressbar" aria-label="${a.title[p.lang]}" aria-valuemin="0" aria-valuemax="${a.target}" aria-valuenow="${value}"><i style="width:${value/a.target*100}%"></i></div><small class="achievement-count">${formatCount(value)} / ${formatCount(a.target)}</small></div><div class="achievement-reward"><span>${nugget} +${formatCount(a.reward)}</span><button class="${complete&&!claimed?'buy':'secondary'}" data-achievement="${a.id}" ${complete&&!claimed?'':'disabled'}>${claimed?copy.claimed:complete?copy.claim:copy.progress}</button></div></article>`;
 }).join('')}</div><p class="achievement-history">${copy.history}</p></div>`;
}
function claimRewards(ids:string[]){
 if(platform.busy||store.conflict||transition)return;
 const panel=document.querySelector<HTMLElement>('.modal-panel'),scroll=panel?.scrollTop??0;
 const amount=ids.reduce((sum,id)=>sum+claimAchievement(p,id),0);if(!amount)return;
 save(true);audio.play('bonus');hud();renderModal();
 const next=document.querySelector<HTMLElement>('.modal-panel');if(next)next.scrollTop=scroll;
 notify(`${at().earned}: +${formatCount(amount)}`);
}
async function navigate(next:boolean){
 if(transition||platform.busy)return;transition=true;
 if(r.mode==='endless'){prepareEndless();transition=false;return;}
 await platform.advert();prepare(next?Math.min(LEVELS.length-1,r.level+1):r.level);transition=false;
}
async function handleAction(action:string){
 audio.unlock();
 if(platform.busy||transition)return;
 if(action==='close'){modal(screen==='achievements'?achievementReturn:screen==='pause'?'none':returnScreen);return;}
 if(action==='claim-all'){claimRewards(readyAchievements(p).map(a=>a.id));return;}
 if(action==='resume'){modal('none');return;}
 if(action==='restart'||action==='next'){await navigate(action==='next');return;}
 if(action==='restore'){modal('none');syncGate();render();return;}
 if(action==='workshop'){returnScreen='result';modal('shop');return;}
 if(action==='unequip'){p.enchant='none';if(r.status==='ready')r.enchant='none';save();render();return;}
 if(action==='reward'){
  const id=r.id;
  const result=await platform.advert(true,()=>{reward(p,id);save(true);});
  if(result==='unavailable'||result==='error')notify(t('adUnavailable'));renderModal();hud();return;
 }
 if(action.startsWith('choose-')){
  if(action==='choose-cloud'&&remote)p=remote;
  r=p.mode==='endless'?p.endlessAttempt??createRun(0,p.pick,p.enchant,p.owned.includes('starter'),crypto.getRandomValues(new Uint32Array(1))[0]):p.attempt??createRun(p.unlocked,p.pick,p.enchant,p.owned.includes('starter'));store.conflict=false;store.save(p);void store.flush(p,true);render();modal(r.status==='playing'?'restore':r.status==='won'||r.status==='lost'?'result':'none');
 }
}
function tick(dt:number){
 if(r.status!=='playing'||platform.gate.paused)return;
 if(r.time<lastSave)lastSave=0;
 if(r.time<lastHud)lastHud=0;
 const lesson=!!cue();stepRun(r,lesson?dt*.35:dt);syncAchievements(p,r);platform.activeSeconds+=dt;
 if(lesson!==!!cue())hud();
 if(r.mode==='endless')p.endlessBest=Math.max(p.endlessBest,Math.floor(r.y/32));
 const outcome=(r as Run).status;
 if(outcome==='won'||outcome==='lost'){
  if(r.mode==='campaign')settle(p,r);else p.endlessBest=Math.max(p.endlessBest,Math.floor(r.y/32));
  save(true);if(outcome==='won')audio.play('win');else audio.play('break','hard');modal('result');render();
 }
 if(r.time-lastSave>2){save();lastSave=r.time;}
 if(r.time-lastHud>.08){hud();lastHud=r.time;}
}
function select(column:number){
 if(screen!=='none'||r.status!=='ready')return;audio.unlock();
 if(placing){placeStarter(r,column);placing=false;render();}else r.x=column*32+16;
 save();
}
function effect(e:RunEvent){
 if(r.mode==='endless'&&e.type==='break'&&e.value){const gained=r.ore-(r.oreClaimed??0);if(gained>0){p.coins+=gained;r.oreClaimed=r.ore;save();hud();}}
 if(r.mode==='endless'&&e.type==='bonus'&&e.kind==='vein'){const gained=r.ore-(r.oreClaimed??0);if(gained>0){p.coins+=gained;r.oreClaimed=r.ore;save();hud();}}
 if(r.mode==='endless'&&e.type==='bonus'&&e.kind==='relic'){const gained=(r.relics??0)-(r.claimedRelics??0);if(gained>0){p.relics+=gained;r.claimedRelics=r.relics;save();}}
 if(e.type==='break'&&e.value){const el=document.querySelector('#ore')!;el.classList.remove('ore-pulse');void (el as HTMLElement).offsetWidth;el.classList.add('ore-pulse');}
 if(e.type==='bonus'){
  if(e.kind==='bench')notify(t(e.value===50?'benchMaxBonus':'benchUpgrade').replace('{pick}',t(r.pick)));
  else{const key:Key=e.kind==='double'?'doubleBonus':e.kind==='sweep'?'sweepBonus':e.kind==='repair'?'repairBonus':e.kind==='relic'?'relicFound':e.kind==='onehit'?'oneHitBonus':e.kind==='phase'?'phaseBonus':e.kind==='magnet'?'magnetBonus':e.kind==='curse'?'curseBonus':e.kind==='shield'?'shieldBonus':e.kind==='coalCharge'?'coalChargeBonus':e.kind==='vein'?'veinBonus':e.kind==='helmet'?(e.value===-1?'helmetProc':'helmetBonus'):'drillBonus';notify(e.kind==='vein'?t(key).replace('{value}',String(e.value)):t(key));}
  if(e.kind==='curse')audio.play('clank','curse');else audio.play('bonus',e.kind);hud();render();
 }
 if(e.type==='blast')audio.play('blast');else if(e.type==='fuse')audio.play('fuse');
 else if(e.type==='break'){audio.play('break',e.kind);if(e.value)audio.play('mine');}
 else if(e.type==='hit')audio.play(e.weak?'clank':'hit',e.kind);
 // Once per descent, name the pick that would mine the block that just stopped this one.
 if(e.type==='hit'&&e.weak&&e.kind&&warnedRun!==r.id){warnedRun=r.id;const need=pickKeys.find(k=>PICKS[k].tier>=BLOCKS[e.kind!].tier);notify(need?t('tooHard').replace('{pick}',t(need).toLowerCase()):t('unbreakable'));}
}
async function boot(){
 await preparePickSprites();
 await platform.init();const loaded=await store.load(platform.player);p=loaded.local;remote=loaded.remote;
 if(!loaded.hasLocal&&!loaded.remote)p.lang=platform.language==='en'?'en':'ru';
 audio.setEnabled(p.sound);
 r=p.mode==='endless'?p.endlessAttempt??createRun(0,p.pick,p.enchant,p.owned.includes('starter'),crypto.getRandomValues(new Uint32Array(1))[0]):p.attempt??createRun(p.unlocked,p.pick,p.enchant,p.owned.includes('starter'));
 app.innerHTML=`<div class="game-shell"><header class="topbar"><div id="brand" class="brand"></div><div class="top-actions"><div class="wallet"><div id="wallet-label"></div><span>${nugget}<b id="wallet">0</b></span></div><button id="achievements" class="icon-button achievement-button"></button><button id="language" class="icon-button"></button><button id="sound" class="icon-button"></button><button id="fullscreen" class="icon-button"></button></div></header><nav id="mode-switch" class="mode-switch" aria-label="Game mode"><button class="mode-option" data-mode="campaign" aria-pressed="false"></button><button class="mode-option" data-mode="endless" aria-pressed="false"></button></nav><main class="mine-frame"><div id="stage"></div><div class="vignette"></div><div class="level-heading"><span id="level-no" class="eyebrow"></span><h1 id="level-name"></h1><small id="stratum"></small></div><button id="pause" class="icon-button pause"></button><div class="hud"><div class="hud-stat"><label id="hud-label-depth"></label><b id="depth">0%</b></div><div class="hud-stat hp-stat"><label id="hud-label-hp"></label><b id="hp"></b><div class="hp-track"><div id="hp-fill"></div></div></div><div class="hud-stat"><label id="hud-label-ore"></label><b id="ore">0</b><span id="bonus-counter" class="hidden"></span></div><div id="powerup-counter" class="powerup-counter hidden"></div><div id="relic-counter" class="relic-counter hidden"></div></div><section id="prep" class="preparation"><div id="equipped-info" class="equipped-info"></div><div class="prep-text"><h2 id="pretitle"></h2><p id="prehint"></p></div><div id="tnt-slot"></div><button id="drop" class="primary drop-button"></button><div class="prep-links"><button id="shop" class="text-button"></button><button id="levels" class="text-button"></button></div></section><div id="coach" class="coach-callout" aria-live="polite"></div><div id="modal" class="modal-layer hidden"></div></main><footer class="controls" id="controls"><button id="left" class="nudge-button"></button><div class="control-center"><div class="control-label"><b id="controls-title"></b><span id="charge-count"></span></div><div id="charges" class="charges"></div><p id="control-hint"></p></div><button id="right" class="nudge-button"></button></footer><div id="local-mode" class="local-mode"></div><div id="toast" role="status"></div></div>`;
 const scene=new MineScene({run:()=>r,aura:()=>p.aura,cue,tick,select,effect,placing:()=>placing,exitText:()=>t('exit'),ready:()=>{render();platform.ready();}});
 game=new Phaser.Game({type:Phaser.AUTO,parent:'stage',backgroundColor:'#102220',pixelArt:true,antialias:false,scale:{mode:Phaser.Scale.RESIZE,width:'100%',height:'100%'},scene:[scene],audio:{noAudio:true},render:{roundPixels:true},fps:{target:60}});
 platform.gate.listeners.add(()=>{syncGate();hud();});
 document.querySelector('#drop')!.addEventListener('click',start);
 document.querySelector('#shop')!.addEventListener('click',()=>{audio.unlock();returnScreen='none';modal('shop');});
 document.querySelector('#levels')!.addEventListener('click',()=>{returnScreen='none';modal('levels');});
 document.querySelector('#pause')!.addEventListener('click',()=>modal('pause'));
 document.querySelector('#achievements')!.addEventListener('click',()=>{if(platform.busy||store.conflict||screen==='achievements')return;audio.unlock();achievementReturn=screen;save();modal('achievements');});
 document.querySelector('#sound')!.addEventListener('click',()=>{p.sound=!p.sound;audio.setEnabled(p.sound);if(p.sound)audio.unlock();save();render();});
 document.querySelector('#language')!.addEventListener('click',()=>{p.lang=p.lang==='ru'?'en':'ru';save();render();});
 document.querySelector('#fullscreen')!.addEventListener('click',()=>{if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});else void document.documentElement.requestFullscreen?.().catch(()=>{});});
 for(const el of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-mode]')))el.addEventListener('click',()=>changeMode(el.dataset.mode as 'campaign'|'endless'));
 for(const [id,dir] of [['left',-1],['right',1]] as const)document.querySelector('#'+id)!.addEventListener('pointerdown',e=>{e.preventDefault();audio.unlock();performNudge(dir);});
 app.addEventListener('click',e=>{
  const el=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!el||el.disabled)return;
  if(el.dataset.aura&&AURAS.includes(el.dataset.aura as Aura)){
   const scroll=el.closest<HTMLElement>('.modal-panel')?.scrollTop??0;p.aura=el.dataset.aura as Aura;save();render();
   const panel=document.querySelector<HTMLElement>('.modal-panel');if(panel)panel.scrollTop=scroll;
   document.querySelector<HTMLButtonElement>(`[data-aura="${p.aura}"]`)?.focus({preventScroll:true});return;
  }
  if(el.dataset.achievement){claimRewards([el.dataset.achievement]);return;}
  if(el.dataset.achievementFilter){achievementFilter=el.dataset.achievementFilter as typeof achievementFilter;renderModal();return;}
  if(el.dataset.action)void handleAction(el.dataset.action);
  if(el.id==='place-tnt'){placing=!placing;render();}
  if(el.dataset.level){prepare(Number(el.dataset.level));}
  if(el.dataset.item){const key=el.dataset.item as Item;if(p.owned.includes(key)){if(pickKeys.includes(key as Pick))p.pick=key as Pick;else if(key==='wave'||key==='chain')p.enchant=key;}else if(!buy(p,key)){notify(t('notEnough'));return;}else notify(t('bought'));
   if(r.status==='ready'){const column=Math.floor(r.x/32);const mode=r.mode??'campaign';r=mode==='endless'?createRun(0,p.pick,p.enchant,p.owned.includes('starter'),crypto.getRandomValues(new Uint32Array(1))[0]):createRun(r.level,p.pick,p.enchant,p.owned.includes('starter'));r.x=column*32+16;}
   save();render();
  }
 });
 window.addEventListener('keydown',e=>{
  if(e.code==='ArrowLeft'||e.code==='ArrowRight'){e.preventDefault();if(!e.repeat)performNudge(e.code==='ArrowLeft'?-1:1);}
  if(e.code==='Escape'&&!e.repeat){if(screen==='pause')modal('none');else if(screen==='none'&&r.status==='playing')modal('pause');else if(screen==='achievements')modal(achievementReturn);else if(screen==='shop'||screen==='levels')modal(returnScreen);}
  if(e.code==='Space'&&screen==='none'&&r.status==='ready'){e.preventDefault();start();}
 });
 const leave=()=>{platform.gate.set('hidden',document.hidden);if(document.hidden)save();};
 document.addEventListener('visibilitychange',leave);window.addEventListener('blur',()=>platform.gate.set('unfocused',true));window.addEventListener('focus',()=>platform.gate.set('unfocused',false));
 document.querySelector('#stage')!.addEventListener('contextmenu',e=>e.preventDefault());
 render();modal(loaded.conflict?'conflict':r.status==='playing'?'restore':r.status==='won'||r.status==='lost'?'result':'none');
 setInterval(()=>void store.flush(p),15000);
 if(import.meta.env.DEV)(window as unknown as {shaft:unknown}).shaft={get run(){return r;},get progress(){return p;},get paused(){return platform.gate.paused;}};
}
void boot().catch(()=>{app.innerHTML='<div class="boot">Не удаётся открыть шахту. <button onclick="location.reload()">Повторить / Retry</button></div>';});
