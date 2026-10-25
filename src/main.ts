import Phaser from 'phaser';
import {createRun,stepRun,nudge,placeStarter,fuseCue,PICKS,BLOCKS,LEVELS} from './core.ts';
import type {Pick,Run,RunEvent} from './core.ts';
import {buy,settle,reward,PRICES} from './progress.ts';
import type {Item,Progress} from './progress.ts';
import {SaveStore} from './storage.ts';
import {Platform} from './platform.ts';
import {messages,nudgeCount} from './i18n.ts';
import type {Key} from './i18n.ts';
import {AudioBus} from './audio.ts';
import {MineScene} from './scene.ts';
import {pickPixels,SIZE} from './textures.ts';
import './style.css';

const platform=new Platform(),store=new SaveStore(),audio=new AudioBus();
const app=document.querySelector<HTMLDivElement>('#app')!;
let p:Progress,r:Run,remote:Progress|null=null,screen='none',returnScreen='none',placing=false,lastSave=0,lastHud=0,transition=false;
let game:Phaser.Game;let toastTimer:ReturnType<typeof setTimeout>;let warnedRun='';
const t=(key:Key)=>messages[p.lang][key];
// The first-nudge lesson runs until the player has spent a nudge once.
let cueShown=false;
const cue=()=>{const c=p.tutorial||platform.gate.paused?null:fuseCue(r,cueShown);cueShown=!!c;return c;};
const pickKeys=Object.keys(PICKS) as Pick[];
const svg=(name:string)=>{
 const paths:Record<string,string>={pause:'<path d="M8 5v14M16 5v14"/>',sound:'<path d="M4 9h4l5-4v14l-5-4H4zM17 8q6 4 0 8"/>',mute:'<path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6m0-6-5 6"/>',expand:'<path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/>',back:'<path d="m14 6-6 6 6 6"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',left:'<path d="M19 12H5m6-6-6 6 6 6"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',lock:'<rect x="6" y="10" width="12" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',check:'<path d="m5 12 4 4 10-10"/>',spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',mountain:'<path d="m2 19 7-12 4 6 3-5 6 11zM6 19l3-5 3 5"/>',workshop:'<path d="M3 19h18M5 19v-8l7-7 7 7v8M9 19v-6h6v6"/>'};
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]??paths.spark)+'</svg>';
};
const nugget='<span class="nugget" aria-hidden="true"></span>';
function pickIcon(key:Pick,size=''){return `<svg class="pick-icon ${size}" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${pickPixels(key).map((c,i)=>c?`<rect x="${i%SIZE}" y="${Math.floor(i/SIZE)}" width="1" height="1" fill="${c}"/>`:'').join('')}</svg>`;}
function save(force=false){p.attempt=structuredClone(r);p.attempt.events=[];p.revision++;store.save(p);void store.flush(p,force);}
function notify(text:string){const el=document.querySelector<HTMLElement>('#toast')!;el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}
function syncGate(){const active=r?.status==='playing'&&!platform.gate.paused;platform.gameplay(active);audio.pause(platform.gate.paused||!active);}
function modal(next:string){screen=next;platform.gate.set('modal',next!=='none');syncGate();renderModal();}
function prepare(level:number){placing=false;r=createRun(level,p.pick,p.enchant,p.owned.includes('starter'));modal('none');render();save();}
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
 document.querySelector('#pause')!.innerHTML=svg('pause');document.querySelector('#pause')!.setAttribute('aria-label',t('pause'));
 document.querySelector<HTMLButtonElement>('#pause')!.disabled=!playing;
 document.querySelector<HTMLButtonElement>('#language')!.disabled=playing;
 document.querySelector('#level-name')!.textContent=t((LEVELS[r.level].name==='chain'?'chainLevel':LEVELS[r.level].name) as Key);
 document.querySelector('#level-no')!.textContent=`${t('level')} ${String(r.level+1).padStart(2,'0')} / 12`;
 document.querySelector('#hud-label-depth')!.textContent=t('depth');document.querySelector('#hud-label-hp')!.textContent=t('durability');
 document.querySelector('#hud-label-ore')!.textContent=t('ore');
 document.querySelector('#prep')!.classList.toggle('hidden',r.status!=='ready');
 document.querySelector('#pretitle')!.textContent=placing?t('tntHint'):t('prepare');
 document.querySelector('#prehint')!.textContent=placing?'':t('prepareHint');
 document.querySelector('#drop')!.innerHTML=`${pickIcon(r.pick)}<span>${t('drop')}</span>${svg('arrow')}`;
 document.querySelector('#shop')!.innerHTML=`${svg('workshop')} ${t('shop')}`;
 document.querySelector('#levels')!.innerHTML=`${svg('mountain')} ${t('levels')}`;
 document.querySelector('#tnt-slot')!.innerHTML=p.owned.includes('starter')?`<button id="place-tnt" class="text-button" ${r.starterPlaced?'disabled':''}><span class="tnt-mini">TNT</span> ${r.starterPlaced?t('tntPlaced'):t('placeTnt')}</button>`:'';
 document.querySelector('#equipped-info')!.innerHTML=`${pickIcon(r.pick)}<div><b>${t(r.pick)}</b><small>${nudgeCount(p.lang,PICKS[r.pick].nudges)}${p.enchant!=='none'?' · '+t(p.enchant):''}</small></div>`;
 document.querySelector('#controls')!.classList.toggle('dormant',!playing);
 document.querySelector('#controls-title')!.textContent=PICKS[r.pick].nudges?t('nudges'):t('auto');
 document.querySelector('#control-hint')!.textContent=PICKS[r.pick].nudges?`${nudgeCount(p.lang,PICKS[r.pick].nudges)} ${t('perDrop')}. ${t('stoneHint')}`:t('autoHint');
 document.querySelector('#left')!.innerHTML=svg('left');document.querySelector('#right')!.innerHTML=svg('arrow');
 document.querySelector('#left')!.setAttribute('aria-label',t('left'));document.querySelector('#right')!.setAttribute('aria-label',t('right'));
 document.querySelector('#local-mode')!.textContent=platform.sdk?'':t('local');
 audio.enabled=p.sound;hud();renderModal();
}
function hud(){
 document.querySelector('#wallet')!.textContent=String(p.coins);
 const depth=Math.max(0,Math.min(100,Math.floor((r.y-64)/(r.rows*32-64)*100)));
 document.querySelector('#depth')!.textContent=depth+'%';document.querySelector('#ore')!.textContent=String(r.ore);
 document.querySelector('#hp')!.textContent=String(Math.ceil(r.hp))+'/'+PICKS[r.pick].hp;
 const bar=document.querySelector<HTMLElement>('#hp-fill')!;bar.style.width=(r.hp/PICKS[r.pick].hp*100)+'%';bar.classList.toggle('low',r.hp/PICKS[r.pick].hp<.25);
 document.querySelector('#charges')!.innerHTML=Array.from({length:Math.max(1,PICKS[r.pick].nudges)},(_,i)=>`<i class="${i<r.nudges?'lit':''}"></i>`).join('');
 document.querySelector('#charge-count')!.textContent=PICKS[r.pick].nudges?`${r.nudges} / ${PICKS[r.pick].nudges}`:'—';
 for(const id of ['left','right'])document.querySelector<HTMLButtonElement>('#'+id)!.disabled=r.status!=='playing'||!r.nudges||platform.gate.paused;
 const c=cue(),coach=document.querySelector<HTMLElement>('#coach')!;coach.classList.toggle('show',!!c);if(c)coach.textContent=t(c.dir<0?'coachLeft':'coachRight');
 document.querySelector('#left')!.classList.toggle('coach',c?.dir===-1);document.querySelector('#right')!.classList.toggle('coach',c?.dir===1);
 if(store.error)document.querySelector('#local-mode')!.textContent=t('saveError');
}
function closeButton(){return `<button class="icon-button close" data-action="close" aria-label="${t('close')}">${svg('close')}</button>`;}
function renderModal(){
 const layer=document.querySelector<HTMLElement>('#modal')!;layer.classList.toggle('hidden',screen==='none');layer.innerHTML='';
 if(screen==='none')return;
 let content='';
 if(screen==='shop'){
  content=`<div class="modal-panel shop-panel">${closeButton()}<span class="eyebrow">${t('shop')}</span><h2>${t('workshop')}</h2><p class="muted">${t('workshopHint')}</p><div class="shop-wallet">${nugget}<b>${p.coins}</b></div><h3>${t('tools')}</h3><div class="pick-grid">${pickKeys.map((key,i)=>{
   const owned=p.owned.includes(key),selected=p.pick===key,locked=i>0&&!p.owned.includes(pickKeys[i-1]);
   return `<article class="tool-card ${selected?'selected':''}">${pickIcon(key,'large')}<div class="tool-title"><b>${t(key)}</b><span>${PICKS[key].nudges} ${svg('spark')}</span></div><p>${t((key+'Desc') as Key)}</p><small>♥ ${PICKS[key].hp}</small><button class="${owned?'secondary':'buy'}" data-item="${key}" ${selected||locked||!owned&&p.coins<PRICES[key]?'disabled':''}>${selected?svg('check')+t('equipped'):owned?t('equip'):locked?svg('lock')+t('needPrevious'):nugget+PRICES[key]}</button></article>`;
  }).join('')}</div><h3>${t('upgrades')}</h3><div class="upgrade-list">${(['starter','wave','chain'] as Item[]).map(key=>{
   const owned=p.owned.includes(key),selected=key==='starter'?owned:p.enchant===key;
   return `<article class="upgrade"><div class="upgrade-icon">${key==='starter'?'<span class="tnt-mini">TNT</span>':svg('spark')}</div><div><b>${t(key as Key)}</b><p>${t((key+'Desc') as Key)}</p></div><button class="secondary" data-item="${key}" ${selected||!owned&&p.coins<PRICES[key]?'disabled':''}>${selected?svg('check'):owned?t('equip'):nugget+PRICES[key]}</button></article>`;
  }).join('')}</div>${p.enchant!=='none'?`<button class="text-button" data-action="unequip">${t('none')}</button>`:''}<p class="fine">${t('enchants')}</p></div>`;
 }else if(screen==='levels'){
  content=`<div class="modal-panel">${closeButton()}<span class="eyebrow">12 ${t('level')}</span><h2>${t('levels')}</h2><div class="level-grid">${LEVELS.map((l,i)=>`<button class="level-card ${i===r.level?'selected':''}" data-level="${i}" ${i>p.unlocked?'disabled':''}><strong>${i<=p.unlocked?String(i+1).padStart(2,'0'):svg('lock')}</strong><span>${t((l.name==='chain'?'chainLevel':l.name) as Key)}</span><small>${i<=p.unlocked?`${t('best')}: ${p.best[i]}`:t('locked')}</small></button>`).join('')}</div></div>`;
 }else if(screen==='pause'){
  content=`<div class="modal-panel compact">${closeButton()}<div class="result-mark">${svg('pause')}</div><h2>${t('paused')}</h2><p class="muted">${t('pausedHint')}</p><button class="primary" data-action="resume">${t('resume')}${svg('arrow')}</button><button class="secondary" data-action="restart">${t('restart')}</button></div>`;
 }else if(screen==='result'){
  const won=r.status==='won',receipt=p.receipts[r.id];
  content=`<div class="modal-panel compact result"><span class="eyebrow">${t('level')} ${String(r.level+1).padStart(2,'0')}</span><div class="result-mark ${won?'success':''}">${svg(won?'check':'mountain')}</div><h2>${t(won?'won':'lost')}</h2><p class="muted">${t(won&&r.level===11?'finalHint':won?'wonHint':'lostHint')}</p>${won?`<div class="reward-detail"><span>${t('base')}</span><b>+${60+r.level*10}</b><span>${t('oreBonus')}</span><b>+${r.ore}</b></div><div class="reward-total">${nugget}<strong>+${receipt?.amount??0}</strong><span>${t('total')}</span></div>`:''}<button class="primary" data-action="${won&&r.level<11?'next':'restart'}">${t(won&&r.level<11?'next':'again')}${svg('arrow')}</button>${won?`<button class="secondary ad-button" data-action="reward" ${receipt?.rewarded||platform.busy?'disabled':''}>${svg('spark')}${t(receipt?.rewarded?'bonusDone':'ad')}</button>`:''}<button class="text-button" data-action="workshop">${svg('workshop')}${t('shop')}</button></div>`;
 }else if(screen==='restore'){
  content=`<div class="modal-panel compact"><div class="result-mark">${pickIcon(r.pick)}</div><h2>${t('continueRun')}</h2><p class="muted">${t('continueHint')}</p><button class="primary" data-action="restore">${t('resume')}${svg('arrow')}</button><button class="secondary" data-action="restart">${t('restart')}</button></div>`;
 }else if(screen==='conflict'){
  content=`<div class="modal-panel compact"><h2>${t('cloudChoice')}</h2><p class="muted">${t('cloudHint')}</p><button class="primary" data-action="choose-local">${t('localSave')} · ${p.coins} ${nugget}</button><button class="secondary" data-action="choose-cloud">${t('cloudSave')} · ${remote?.coins??0} ${nugget}</button></div>`;
 }
 layer.innerHTML=content;
 layer.querySelector<HTMLElement>('.modal-panel')?.setAttribute('role','dialog');layer.querySelector<HTMLElement>('.modal-panel')?.setAttribute('aria-modal','true');
}
async function navigate(next:boolean){
 if(transition||platform.busy)return;transition=true;
 await platform.advert();prepare(next?Math.min(11,r.level+1):r.level);transition=false;
}
async function handleAction(action:string){
 audio.unlock();
 if(platform.busy||transition)return;
 if(action==='close'){modal(screen==='pause'?'none':returnScreen);return;}
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
  r=p.attempt??createRun(p.unlocked,p.pick,p.enchant,p.owned.includes('starter'));store.conflict=false;store.save(p);void store.flush(p,true);render();modal(r.status==='playing'?'restore':r.status==='won'||r.status==='lost'?'result':'none');
 }
}
function tick(dt:number){
 if(r.status!=='playing'||platform.gate.paused)return;
 if(r.time<lastSave)lastSave=0;
 if(r.time<lastHud)lastHud=0;
 const lesson=!!cue();stepRun(r,lesson?dt*.35:dt);platform.activeSeconds+=dt;
 if(lesson!==!!cue())hud();
 const outcome=(r as Run).status;
 if(outcome==='won'||outcome==='lost'){
  settle(p,r);save(true);audio.play(outcome==='won'?'win':'hit');modal('result');render();
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
 if(e.type==='blast')audio.play('blast');else if(e.type==='break'&&e.value)audio.play('ore');else if(e.type==='hit')audio.play(e.weak?'clank':'hit');
 // Once per descent, name the pick that would mine the block that just stopped this one.
 if(e.type==='hit'&&e.weak&&e.kind&&warnedRun!==r.id){warnedRun=r.id;const need=pickKeys.find(k=>PICKS[k].tier>=BLOCKS[e.kind!].tier)!;notify(t('tooHard').replace('{pick}',t(need).toLowerCase()));}
}
async function boot(){
 await platform.init();const loaded=await store.load(platform.player);p=loaded.local;remote=loaded.remote;
 if(!loaded.hasLocal&&!loaded.remote)p.lang=platform.language==='en'?'en':'ru';
 audio.enabled=p.sound;
 r=p.attempt??createRun(p.unlocked,p.pick,p.enchant,p.owned.includes('starter'));
 app.innerHTML=`<div class="game-shell"><header class="topbar"><div id="brand" class="brand"></div><div class="top-actions"><div class="wallet"><div id="wallet-label"></div><span>${nugget}<b id="wallet">0</b></span></div><button id="language" class="icon-button"></button><button id="sound" class="icon-button"></button><button id="fullscreen" class="icon-button"></button></div></header><main class="mine-frame"><div id="stage"></div><div class="vignette"></div><div class="level-heading"><span id="level-no" class="eyebrow"></span><h1 id="level-name"></h1></div><button id="pause" class="icon-button pause"></button><div class="hud"><div class="hud-stat"><label id="hud-label-depth"></label><b id="depth">0%</b></div><div class="hud-stat hp-stat"><label id="hud-label-hp"></label><b id="hp"></b><div class="hp-track"><div id="hp-fill"></div></div></div><div class="hud-stat"><label id="hud-label-ore"></label><b id="ore">0</b></div></div><section id="prep" class="preparation"><div id="equipped-info" class="equipped-info"></div><div class="prep-text"><h2 id="pretitle"></h2><p id="prehint"></p></div><div id="tnt-slot"></div><button id="drop" class="primary drop-button"></button><div class="prep-links"><button id="shop" class="text-button"></button><button id="levels" class="text-button"></button></div></section><div id="coach" class="coach-callout" aria-live="polite"></div><div id="modal" class="modal-layer hidden"></div></main><footer class="controls" id="controls"><button id="left" class="nudge-button"></button><div class="control-center"><div class="control-label"><b id="controls-title"></b><span id="charge-count"></span></div><div id="charges" class="charges"></div><p id="control-hint"></p></div><button id="right" class="nudge-button"></button></footer><div id="local-mode" class="local-mode"></div><div id="toast" role="status"></div></div>`;
 const scene=new MineScene({run:()=>r,cue,tick,select,effect,placing:()=>placing,exitText:()=>t('exit'),ready:()=>{render();platform.ready();}});
 game=new Phaser.Game({type:Phaser.AUTO,parent:'stage',backgroundColor:'#102220',pixelArt:true,antialias:false,scale:{mode:Phaser.Scale.RESIZE,width:'100%',height:'100%'},scene:[scene],audio:{noAudio:true},render:{roundPixels:true},fps:{target:60}});
 platform.gate.listeners.add(()=>{syncGate();hud();});
 document.querySelector('#drop')!.addEventListener('click',start);
 document.querySelector('#shop')!.addEventListener('click',()=>{audio.unlock();returnScreen='none';modal('shop');});
 document.querySelector('#levels')!.addEventListener('click',()=>{returnScreen='none';modal('levels');});
 document.querySelector('#pause')!.addEventListener('click',()=>modal('pause'));
 document.querySelector('#sound')!.addEventListener('click',()=>{audio.unlock();p.sound=!p.sound;audio.enabled=p.sound;save();render();});
 document.querySelector('#language')!.addEventListener('click',()=>{p.lang=p.lang==='ru'?'en':'ru';save();render();});
 document.querySelector('#fullscreen')!.addEventListener('click',()=>{if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});else void document.documentElement.requestFullscreen?.().catch(()=>{});});
 for(const [id,dir] of [['left',-1],['right',1]] as const)document.querySelector('#'+id)!.addEventListener('pointerdown',e=>{e.preventDefault();audio.unlock();performNudge(dir);});
 app.addEventListener('click',e=>{
  const el=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!el||el.disabled)return;
  if(el.dataset.action)void handleAction(el.dataset.action);
  if(el.id==='place-tnt'){placing=!placing;render();}
  if(el.dataset.level){prepare(Number(el.dataset.level));}
  if(el.dataset.item){const key=el.dataset.item as Item;if(p.owned.includes(key)){if(pickKeys.includes(key as Pick))p.pick=key as Pick;else if(key==='wave'||key==='chain')p.enchant=key;}else if(!buy(p,key)){notify(t('notEnough'));return;}else notify(t('bought'));
   if(r.status==='ready'){const column=Math.floor(r.x/32);r=createRun(r.level,p.pick,p.enchant,p.owned.includes('starter'));r.x=column*32+16;}
   save();render();
  }
 });
 window.addEventListener('keydown',e=>{
  if(e.code==='ArrowLeft'||e.code==='ArrowRight'){e.preventDefault();if(!e.repeat)performNudge(e.code==='ArrowLeft'?-1:1);}
  if(e.code==='Escape'&&!e.repeat){if(screen==='pause')modal('none');else if(screen==='none'&&r.status==='playing')modal('pause');else if(screen==='shop'||screen==='levels')modal(returnScreen);}
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
