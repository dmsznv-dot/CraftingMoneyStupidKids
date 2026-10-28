import {ACHIEVEMENTS,achievementCopy,achievementDescription,achievementValue,readyAchievements,claimAchievement,syncAchievements} from './achievements.ts';
import type {AchievementGroup} from './achievements.ts';
import Phaser from 'phaser';
import {createRun,stepRun,nudge,activateSkill,placeStarter,fuseCue,PICKS,BLOCKS,maxDurability,skillStats,SKILL_MAX_LEVEL} from './core.ts';
import type {Pick,Run,RunEvent,SkillAura} from './core.ts';
import {AURAS,buy,PRICES,equipPurchasedHelmet} from './progress.ts';
import type {Aura,Item,Progress} from './progress.ts';
import {SaveStore} from './storage.ts';
import {Platform} from './platform.ts';
import {messages,nudgeCount} from './i18n.ts';
import type {Key} from './i18n.ts';
import {AudioBus} from './audio.ts';
import {MineScene} from './scene.ts';
import {atlasGroups,guideCopy} from './guide.ts';
import {blockPixels,paint} from './textures.ts';
import type {BlockType} from './core.ts';
import {AuraPreviews} from './aura-preview.ts';
import {pickUrls,preparePickSprites} from './pick-sprite.ts';
import './style.css';
import './ui-polish.css';
import './mine-buttons.css';

const platform=new Platform(),store=new SaveStore(),audio=new AudioBus();
const app=document.querySelector<HTMLDivElement>('#app')!;
let p:Progress,r:Run,remote:Progress|null=null,screen='none',returnScreen='none',placing=false,lastSave=0,lastHud=0,transition=false;
let game:Phaser.Game;let toastTimer:ReturnType<typeof setTimeout>;let warnedRun='';
let auraPreviews:AuraPreviews|null=null;
let settingsReturn='none';
let achievementReturn='none',achievementFilter:'all'|AchievementGroup='all';
const at=()=>achievementCopy[p.lang];
const formatCount=(n:number)=>n.toLocaleString(p.lang==='ru'?'ru-RU':'en-US');
const t=(key:Key)=>messages[p.lang][key];
// The first-nudge lesson runs until the player has spent a nudge once.
let cueShown=false;
const cue=()=>{const c=p.tutorial||platform.gate.paused?null:fuseCue(r,cueShown);cueShown=!!c;return c;};
const pickKeys=Object.keys(PICKS) as Pick[];
const auraNames:Record<Aura,Key>={none:'auraNone',fire:'auraFire',lightning:'auraLightning',enchanted:'auraEnchanted',ghost:'auraGhost'};
const skillNames:Record<SkillAura,Key>={fire:'skillFire',lightning:'skillLightning',enchanted:'skillEnchanted',ghost:'skillGhost'};
const svg=(name:string)=>{
 const paths:Record<string,string>={shield:'<path d="M12 3 20 6v5c0 5-3.3 8.3-8 10-4.7-1.7-8-5-8-10V6z"/>',helmet:'<path d="M4 15v-2a8 8 0 0 1 16 0v2M3 15h18v3H3zM12 5v4"/>',bolt:'<path d="m13 2-8 11h6l-1 9 9-12h-6z"/>',phase:'<circle cx="12" cy="12" r="8" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="2"/>',magnet:'<path d="M5 4v8a7 7 0 0 0 14 0V4h-4v8a3 3 0 0 1-6 0V4zM5 8h4m6 0h4"/>',trophy:'<path d="M7 4h10v6a5 5 0 0 1-10 0zM7 6H4v3a4 4 0 0 0 4 4m9-7h3v3a4 4 0 0 1-4 4M12 15v5m-4 0h8"/>',pause:'<path d="M8 5v14M16 5v14"/>',sound:'<path d="M4 9h4l5-4v14l-5-4H4zM17 8q6 4 0 8"/>',mute:'<path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6m0-6-5 6"/>',expand:'<path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/>',back:'<path d="m14 6-6 6 6 6"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',left:'<path d="M19 12H5m6-6-6 6 6 6"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',lock:'<rect x="6" y="10" width="12" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',check:'<path d="m5 12 4 4 10-10"/>',spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',mountain:'<path d="m2 19 7-12 4 6 3-5 6 11zM6 19l3-5 3 5"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4"/><circle cx="12" cy="12" r="8"/>',workshop:'<path d="M3 19h18M5 19v-8l7-7 7 7v8M9 19v-6h6v6"/>'};
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]??paths.spark)+'</svg>';
};
const skillDescription=(aura:SkillAura,level:number)=>{
 const stats=skillStats(aura,level),ru=p.lang==='ru';
 if(aura==='fire')return ru?`${stats.duration} сек. без износа от блоков`:`${stats.duration} sec. without block wear`;
 if(aura==='lightning')return ru?`Добыча руды в радиусе ${stats.radius} блоков`:`Mines ore within ${stats.radius} blocks`;
 const speed=stats.speed>1?` · +${Math.round((stats.speed-1)*100)}% ${ru?'скорости':'speed'}`:'';
 return ru?`${stats.duration} сек. ${aura==='ghost'?'проходит сквозь блоки':'бурит вниз'}${speed}`:`${stats.duration} sec. ${aura==='ghost'?'passes through blocks':'drills downward'}${speed}`;
};
const nugget='<span class="nugget" aria-hidden="true"></span>';
const languageFlag=(lang:'ru'|'en')=>lang==='ru'
 ? '<svg class="language-flag" viewBox="0 0 36 36" aria-hidden="true"><path fill="#fff" d="M0 0h36v12H0z"/><path fill="#1b4db1" d="M0 12h36v12H0z"/><path fill="#d52b32" d="M0 24h36v12H0z"/></svg>'
 : '<svg class="language-flag" viewBox="0 0 36 36" aria-hidden="true"><path fill="#123574" d="M0 0h36v36H0z"/><path d="M0 0l36 36M36 0L0 36" stroke="#fff" stroke-width="8"/><path d="M0 0l36 36M36 0L0 36" stroke="#d02136" stroke-width="3"/><path d="M18 0v36M0 18h36" stroke="#fff" stroke-width="12"/><path d="M18 0v36M0 18h36" stroke="#d02136" stroke-width="6"/></svg>';
function pickIcon(key:Pick,size=''){return `<img class="pick-icon ${size}" src="${pickUrls[key]}" alt="" aria-hidden="true" draggable="false">`;}
function save(force=false){
 syncAchievements(p,r);
 r.oreClaimed??=0;r.relics??=0;r.claimedRelics??=0;p.endlessAttempt=structuredClone(r);p.endlessAttempt.events=[];p.mode='endless';
 p.revision++;store.save(p);void store.flush(p,force);
}
function notify(text:string){const el=document.querySelector<HTMLElement>('#toast')!;el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}
function syncGate(){const active=r?.status==='playing'&&!platform.gate.paused;platform.gameplay(active);const interrupted=['platform','ad','hidden','unfocused'].some(reason=>platform.gate.reasons.has(reason));audio.pause(platform.gate.paused||!active,!interrupted);}
function modal(next:string){const enteringWorkshop=next==='shop'&&screen!=='shop';screen=next;platform.gate.set('modal',next!=='none');syncGate();renderModal();if(enteringWorkshop)void audio.playWorkshop(()=>screen==='shop'&&!['hidden','unfocused','platform','ad'].some(reason=>platform.gate.reasons.has(reason)));}
function prepareEndless(){placing=false;const seed=crypto.getRandomValues(new Uint32Array(1))[0];r=createRun(0,p.pick,p.enchant,p.owned.includes('starter'),seed);modal('none');render();save();}
function performNudge(dir:number){if(r.status!=='playing'||platform.gate.paused)return;if(nudge(r,dir)){audio.play('nudge');if(!p.tutorial){p.tutorial=true;notify(t('coachDone'));}save();hud();}}
function start(){if(r.status!=='ready'||screen!=='none'||platform.busy)return;audio.unlock();
 if(p.aura!=='none'&&p.skillLevels[p.aura]>0){r.skillAura=p.aura;r.skillLevel=p.skillLevels[p.aura];r.skillMaxCharges=skillStats(p.aura,r.skillLevel).uses;r.skillCharges=r.skillMaxCharges;}
 if(!r.chainActive&&p.chainCharges>0){p.chainCharges--;r.chainActive=true;}
 equipPurchasedHelmet(p,r);
 r.status='playing';placing=false;syncGate();render();save();}
function useSkill(){if(screen!=='none'||platform.gate.paused)return;
 const oreBefore=r.ore;
 if(!activateSkill(r)){if(r.status==='playing'&&r.skillAura==='lightning'&&(r.skillCharges??0)>0)notify(t('lightningNoOre'));return;}audio.unlock();
 if(r.skillAura==='lightning')notify(t('lightningMined').replace('{value}',String(r.ore-oreBefore)));
 const gained=r.ore-(r.oreClaimed??0);if(gained>0){p.coins+=gained;r.oreClaimed=r.ore;}
 audio.play('bonus');save();hud();}

function render(){
 r.recordBefore??=p.endlessBest;
 document.documentElement.lang=p.lang;document.title=p.lang==='ru'?'Шахта импульсов':'Shaft & Impulse';
 const playing=r.status==='playing',shell=document.querySelector<HTMLElement>('.game-shell')!;
 shell.classList.toggle('is-playing',playing);shell.dataset.gameMode='endless';
 document.querySelector('#brand')!.innerHTML=`${svg('mountain')}<div><b>${t('title')}</b><small>${t('subtitle')}</small></div>`;
 document.querySelector('#sound')!.innerHTML=svg('settings');document.querySelector('#sound')!.setAttribute('aria-label',t('settings'));document.querySelector('#sound')!.setAttribute('title',t('settings'));
 document.querySelector('#language')!.innerHTML=languageFlag(p.lang);document.querySelector('#language')!.setAttribute('aria-label',p.lang==='ru'?'Язык: русский':'Language: English');
 document.querySelector('#fullscreen')!.innerHTML=svg('expand');document.querySelector('#fullscreen')!.setAttribute('aria-label',t('full'));
 document.querySelector('#pause')!.innerHTML=svg('pause');document.querySelector('#pause')!.setAttribute('aria-label',t('pause'));
 document.querySelector<HTMLButtonElement>('#pause')!.disabled=!playing;
 document.querySelector<HTMLButtonElement>('#language')!.disabled=playing;
 document.querySelector('#hud-label-depth')!.textContent=t('depth');document.querySelector('#hud-label-hp')!.textContent=t('durability');
 document.querySelector('#hud-label-ore')!.textContent=t('ore');
 document.querySelector('#prep')!.classList.toggle('hidden',r.status!=='ready'&&!playing);
 const drop=document.querySelector<HTMLButtonElement>('#drop')!;drop.disabled=playing&&(!r.skillAura||!r.skillCharges||platform.gate.paused);document.querySelector('#drop-label')!.classList.toggle('hidden',playing);document.querySelector('#prep-hint')!.classList.toggle('hidden',playing);
 document.querySelector<HTMLElement>('#drop')!.dataset.skillIcon='';document.querySelector('#drop')!.innerHTML=pickIcon(r.pick);document.querySelector('#drop')!.setAttribute('aria-label',t('drop'));document.querySelector('#drop')!.setAttribute('title',t('drop'));
 document.querySelector('#drop-label')!.textContent=t('drop');document.querySelector('#prep-hint')!.textContent=placing?t('tntHint'):t('prepareHint');
 document.querySelector('#shop')!.innerHTML=`${svg('workshop')} ${t('shop')}`;
 document.querySelector('#tnt-slot')!.innerHTML=p.owned.includes('starter')?`<button id="place-tnt" class="text-button" ${r.starterPlaced?'disabled':''}><span class="tnt-mini">TNT</span> ${r.starterPlaced?t('tntPlaced'):t('placeTnt')}</button>`:'';
 document.querySelector('#equipped-info')!.innerHTML=`${pickIcon(r.pick)}<div><b>${t(r.pick)}</b><small>${nudgeCount(p.lang,PICKS[r.pick].nudges)}${p.enchant==='wave'?' · '+t('wave'):''}</small></div>`;
 const controls=document.querySelector<HTMLElement>('#controls')!;controls.classList.toggle('dormant',!playing);controls.classList.toggle('auto-mode',PICKS[r.pick].nudges===0);
 document.querySelector('#controls-title')!.textContent=PICKS[r.pick].nudges?t('nudges'):t('auto');
 document.querySelector('#control-hint')!.textContent=PICKS[r.pick].nudges?`${nudgeCount(p.lang,PICKS[r.pick].nudges)} ${t('perDrop')}. ${t('stoneHint')}`:t('autoHint');
 document.querySelector('#left')!.innerHTML=svg('left');document.querySelector('#right')!.innerHTML=svg('arrow');
 document.querySelector('#left')!.setAttribute('aria-label',t('left'));document.querySelector('#right')!.setAttribute('aria-label',t('right'));
 document.querySelector('#local-mode')!.textContent=platform.sdk?'':t('local');
 audio.setVolumes(p.musicVolume,p.effectsVolume);audio.setEnabled(p.sound);hud();renderModal();
}
function hud(){
 document.querySelector('#wallet')!.textContent=formatCount(p.coins);document.querySelector('.game-shell')!.classList.toggle('wide-wallet',p.coins>=10_000_000);
 const available=readyAchievements(p).length,achievementButton=document.querySelector<HTMLButtonElement>('#achievements')!;
 achievementButton.innerHTML=`${svg('trophy')}${available?`<span class="achievement-badge">${available}</span>`:''}`;achievementButton.setAttribute('aria-label',`${at().title}${available?' · '+at().ready+': '+available:''}`);achievementButton.title=at().title;achievementButton.disabled=store.conflict||platform.busy;
 const depth=r.mode==='endless'?`${Math.floor(r.y/32)} m`:Math.max(0,Math.min(100,Math.floor((r.y-64)/(r.rows*32-64)*100)))+'%';
 document.querySelector('#depth')!.textContent=depth;const record=r.status==='playing'&&p.endlessBest>(r.recordBefore??p.endlessBest);document.querySelector('#depth')!.classList.toggle('is-record',record);const recordLabel=document.querySelector<HTMLElement>('#record-label')!;recordLabel.textContent=t('recordLabel');recordLabel.classList.toggle('hidden',!record);document.querySelector('#ore')!.textContent=String(r.ore);
 const bonus=document.querySelector<HTMLElement>('#bonus-counter')!;bonus.textContent=r.doubleLeft?`×2 · ${r.doubleLeft}/5`:'';bonus.classList.toggle('hidden',!r.doubleLeft);
 const powers:{icon:string;label:string;style:string}[]=[],seconds=p.lang==='ru'?'с':'s';
 if((r.oneHitTime??0)>0)powers.push({icon:'bolt',label:`${t('oneHitShort')} ${Math.ceil(r.oneHitTime!)}${seconds}`,style:'gold'});
 if((r.phaseTime??0)>0)powers.push({icon:'phase',label:`${t('phaseShort')} ${Math.ceil(r.phaseTime!)}${seconds}`,style:'blue'});
 if((r.magnetTime??0)>0)powers.push({icon:'magnet',label:`${t('magnetShort')} ${Math.ceil(r.magnetTime!)}${seconds}`,style:'blue'});
 if((r.shieldTime??0)>0)powers.push({icon:'shield',label:`${t('shieldShort')} ${Math.ceil(r.shieldTime!)}${seconds}`,style:'blue'});
 if(r.chainActive)powers.push({icon:'spark',label:t('chainStatus'),style:'gold'});
 if((r.skillFireTime??0)>0)powers.push({icon:'shield',label:`${t('skillFire')} ${Math.ceil(r.skillFireTime!)}${seconds}`,style:'gold'});
 if((r.skillDrillTime??0)>0)powers.push({icon:'bolt',label:`${t('skillEnchanted')} ${Math.ceil(r.skillDrillTime!)}${seconds}`,style:'gold'});
 if(r.helmetReady)powers.push({icon:'helmet',label:t('helmetShort'),style:'gold'});
 const skill=document.querySelector<HTMLButtonElement>('#drop')!;
 if(r.status==='playing'&&r.skillAura){const label=t(skillNames[r.skillAura]),icon:Record<SkillAura,string>={fire:'shield',lightning:'bolt',enchanted:'spark',ghost:'phase'};const signature=`${r.skillAura}:${r.skillCharges??0}`;
  if(skill.dataset.skillIcon!==signature){skill.innerHTML=`<span class="skill-icon">${svg(icon[r.skillAura])}</span><span class="skill-count">${r.skillCharges??0}</span>`;skill.dataset.skillIcon=signature;}
  skill.setAttribute('aria-label',`${t('skillAction')}: ${label}, ${r.skillCharges??0} / ${r.skillMaxCharges??skillStats(r.skillAura,r.skillLevel??1).uses}`);skill.title=label;skill.disabled=platform.gate.paused||!r.skillCharges;
 }else if(r.status==='playing'){skill.disabled=true;}

 const powerups=document.querySelector<HTMLElement>('#powerup-counter')!;powerups.innerHTML=powers.map(power=>`<span class="power-pill ${power.style}">${svg(power.icon)}<span>${power.label}</span></span>`).join('');powerups.classList.toggle('hidden',!powers.length);
 const maxHp=maxDurability(r);document.querySelector('#hp')!.textContent=String(Math.min(Math.ceil(r.hp),maxHp))+'/'+maxHp;
 const bar=document.querySelector<HTMLElement>('#hp-fill')!;bar.style.width=(r.hp/maxHp*100)+'%';bar.classList.toggle('low',r.hp/maxHp<.10);
 document.querySelector('#charges')!.innerHTML=Array.from({length:PICKS[r.pick].nudges},(_,i)=>`<i class="${i<r.nudges?'lit':''}"></i>`).join('');
 document.querySelector('#charges')!.setAttribute('aria-label',`${t('nudges')}: ${r.nudges} / ${PICKS[r.pick].nudges}`);
 document.querySelector('#charges')!.setAttribute('aria-valuemax',String(PICKS[r.pick].nudges));document.querySelector('#charges')!.setAttribute('aria-valuenow',String(r.nudges));
 document.querySelector('#charge-count')!.textContent=PICKS[r.pick].nudges?`${r.nudges} / ${PICKS[r.pick].nudges}`:'—';
 for(const id of ['left','right'])document.querySelector<HTMLButtonElement>('#'+id)!.disabled=r.status!=='playing'||!r.nudges||platform.gate.paused;
 const c=cue(),coach=document.querySelector<HTMLElement>('#coach')!;coach.classList.toggle('show',!!c);if(c)coach.textContent=t(c.dir<0?'coachLeft':'coachRight');
 document.querySelector('#left')!.classList.toggle('coach',c?.dir===-1);document.querySelector('#right')!.classList.toggle('coach',c?.dir===1);
 const saveMessage=document.querySelector<HTMLElement>('#local-mode')!;saveMessage.classList.toggle('save-warning',store.error);if(store.error)saveMessage.textContent=t('saveError');
}
function closeButton(){return `<button class="icon-button close" data-action="close" aria-label="${t('close')}">${svg('close')}</button>`;}
const atlasIcons=new Map<string,string>();
function atlasIcon(type:BlockType,tier?:1|2|3){const key=type+(tier??'');let image=atlasIcons.get(key);if(!image){const canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;paint(canvas.getContext('2d')!,blockPixels(type,0,tier),3);image=canvas.toDataURL();atlasIcons.set(key,image);}return image;}
function renderModal(){
 if(screen!=='shop'&&auraPreviews){auraPreviews.destroy();auraPreviews=null;}
 const layer=document.querySelector<HTMLElement>('#modal')!;layer.classList.toggle('hidden',screen==='none');layer.classList.toggle('is-shop',screen==='shop');layer.innerHTML='';
 if(screen==='none')return;
 let content='';
 if(screen==='shop'){
  content=`<div class="modal-panel shop-panel">${closeButton()}<h2>${t('shop')}</h2><div class="shop-wallet"><span>${t('wallet')}</span>${nugget}<b>${formatCount(p.coins)}</b></div><h3>${t('auras')}</h3><p class="aura-hint">${t('auraHint')}</p><div class="aura-grid" role="group" aria-label="${t('auras')}">${AURAS.map(aura=>{const hasSkill=aura!=='none',level=hasSkill?p.skillLevels[aura]:0;const description=hasSkill?`${t(skillNames[aura])}: ${skillDescription(aura,level||1)}`:'';return `<article class="aura-entry"><button class="aura-card aura-${aura}" data-aura="${aura}" aria-pressed="${p.aura===aura}" title="${description}"><span class="aura-preview"><canvas width="100" height="105" data-aura-preview="${aura}" aria-hidden="true"></canvas></span><b>${t(auraNames[aura])}</b><small>${hasSkill&&!level?t('skillBuy'):p.aura===aura?t('equipped'):t('equip')}</small></button>${hasSkill?`<div class="skill-details"><b>${t(skillNames[aura])}</b><p>${skillDescription(aura,level||1)}</p><small>${t('skillLevel')}: ${level} · ${level?skillStats(aura,level).uses:0} ${t('skillUses')}</small>${level&&level<SKILL_MAX_LEVEL?`<small>${p.lang==='ru'?'Далее':'Next'}: ${skillStats(aura,level+1).uses} ${t('skillUses')} · ${skillDescription(aura,level+1)}</small>`:''}${level?`<button class="secondary skill-upgrade" data-upgrade-aura="${aura}" ${level>=SKILL_MAX_LEVEL?'disabled':''}>${level>=SKILL_MAX_LEVEL?t('skillMax'):`${t('skillUpgrade')} · ${level+1}`}</button>`:''}</div>`:''}</article>`;}).join('')}<p class="fine skill-free">${t('skillFree')}</p></div><h3>${t('tools')}</h3><div class="pick-grid">${pickKeys.map((key,i)=>{
   const owned=p.owned.includes(key),selected=p.pick===key,locked=i>0&&!p.owned.includes(pickKeys[i-1]);
   return `<article class="tool-card ${selected?'selected':''}">${pickIcon(key,'large')}<div class="tool-title"><b>${t(key)}</b><span>${PICKS[key].nudges} ${svg('spark')}</span></div><p>${t((key+'Desc') as Key)}</p><small>♥ ${PICKS[key].hp}</small><button class="${owned?'secondary':'buy'}" data-item="${key}" ${selected||locked||!owned&&p.coins<PRICES[key]?'disabled':''}>${selected?svg('check')+t('equipped'):owned?t('equip'):locked?svg('lock')+t('needPrevious'):nugget+formatCount(PRICES[key])}</button></article>`;
  }).join('')}</div><h3>${t('upgrades')}</h3><div class="upgrade-list">${(['helmet','wave','chain'] as Item[]).map(key=>{
   const owned=p.owned.includes(key),selected=p.enchant===key;
   if(key==='helmet')return `<article class="upgrade"><div class="upgrade-icon">${svg('helmet')}</div><div><b>${t('helmetItem')}</b><p>${t('helmetItemDesc')}</p><small>${t('chainStock')}: ${p.helmetCharges}</small></div><button class="secondary" data-item="helmet" ${p.coins<PRICES.helmet||p.helmetCharges>=99?'disabled':''}>${nugget}${formatCount(PRICES.helmet)}</button></article>`;
   if(key==='chain')return `<article class="upgrade"><div class="upgrade-icon">${svg('spark')}</div><div><b>${t('chain')}</b><p>${t('chainItemDesc')}</p><small>${t('chainStock')}: ${p.chainCharges}</small></div><button class="secondary" data-item="chain" ${p.coins<PRICES.chain||p.chainCharges>=99?'disabled':''}>${nugget}${formatCount(PRICES.chain)}</button></article>`;
   return `<article class="upgrade"><div class="upgrade-icon">${key==='starter'?'<span class="tnt-mini">TNT</span>':svg('spark')}</div><div><b>${t(key as Key)}</b><p>${t((key+'Desc') as Key)}</p></div><button class="secondary" data-item="${key}" ${selected||!owned&&p.coins<PRICES[key]?'disabled':''}>${selected?svg('check'):owned?t('equip'):nugget+formatCount(PRICES[key])}</button></article>`;
  }).join('')}</div>${p.enchant!=='none'?`<button class="text-button" data-action="unequip">${t('none')}</button>`:''}<p class="fine">${t('enchants')}</p></div>`;
 }else if(screen==='achievements'){
  content=renderAchievements();
 }else if(screen==='settings'){
  content=`<div class="modal-panel compact settings-panel">${closeButton()}<h2>${t('settings')}</h2><div class="volume-settings">${(['musicVolume','effectsVolume'] as const).map(key=>`<label class="volume-row"><span>${t(key)} <output id="${key}-value">${p[key]}%</output></span><input type="range" min="0" max="100" step="1" value="${p[key]}" data-volume="${key}" aria-label="${t(key)}"></label>`).join('')}</div><button class="secondary settings-mute" data-action="toggle-sound" aria-pressed="${!p.sound}">${svg(p.sound?'sound':'mute')} ${t(p.sound?'muteAll':'unmuteAll')}</button><div class="settings-links"><button class="secondary" data-action="guide-how">${guideCopy[p.lang].how} ${svg('arrow')}</button><button class="secondary" data-action="guide-atlas">${guideCopy[p.lang].atlas} ${svg('arrow')}</button></div></div>`;
 }else if(screen==='guide-how'||screen==='guide-atlas'){
  const copy=guideCopy[p.lang],atlas=screen==='guide-atlas';
  content=`<div class="modal-panel guide-panel"><button class="secondary guide-back" data-action="guide-back">${svg('back')} ${copy.back}</button>${closeButton()}<h2>${atlas?copy.atlas:copy.how}</h2>${atlas?atlasGroups.map(group=>`<section class="atlas-section"><h3>${group.title[p.lang]}</h3><div class="atlas-list">${group.entries.map(item=>`<article class="atlas-entry">${item.type==='drill'||item.type==='magnet'?`<div class="atlas-tier-icons">${([1,2,3] as const).map(tier=>`<span><img src="${atlasIcon(item.type,tier)}" alt="" aria-hidden="true"><small>${item.type==='drill'?[4,7,10][tier-1]:[p.lang==='ru'?'1,5':'1.5','2','3'][tier-1]+(p.lang==='ru'?'с':'s')}</small></span>`).join('')}</div>`:`<img src="${atlasIcon(item.type)}" alt="" aria-hidden="true">`}<div><b>${item.name[p.lang]}</b><p>${item.description[p.lang]}</p>${BLOCKS[item.type].ore?`<small>${nugget} ${BLOCKS[item.type].ore}</small>`:''}</div></article>`).join('')}</div></section>`).join(''):`<p class="guide-intro">${copy.intro}</p><div class="guide-steps">${copy.steps.map(([title,description],i)=>`<section><span>${i+1}</span><div><b>${title}</b><p>${description}</p></div></section>`).join('')}</div>`}</div>`;
 }else if(screen==='pause'){
  content=`<div class="modal-panel compact">${closeButton()}<div class="result-mark">${svg('pause')}</div><h2>${t('paused')}</h2><p class="muted">${t('pausedHint')}</p><button class="primary" data-action="resume">${t('resume')}${svg('arrow')}</button><button class="secondary" data-action="restart">${t('restart')}</button></div>`;
 }else if(screen==='result'){
  content=`<div class="modal-panel compact result"><div class="result-mark">${svg('mountain')}</div><h2>${t('lost')}</h2><p class="muted">${t('endlessLost')}</p><div class="run-summary"><div><span>${t('depth')}</span><b>${Math.floor(r.y/32)} m</b></div><div><span>${t('ore')}</span><b>+${formatCount(r.ore)}</b></div></div><button class="primary" data-action="restart">${t('again')}${svg('arrow')}</button><button class="text-button" data-action="workshop">${svg('workshop')}${t('shop')}</button></div>`;
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
function navigate(){
 if(transition||platform.busy)return;transition=true;
 prepareEndless();transition=false;
}
async function handleAction(action:string){
 audio.unlock();
 if(platform.busy||transition)return;
 if(action==='close'){modal(screen==='achievements'?achievementReturn:screen==='guide-how'||screen==='guide-atlas'?'settings':screen==='settings'?settingsReturn:screen==='pause'?'none':returnScreen);return;}
 if(action==='guide-how'||action==='guide-atlas'){modal(action);return;}
 if(action==='guide-back'){modal('settings');return;}
 if(action==='toggle-sound'){p.sound=!p.sound;audio.setEnabled(p.sound);save();renderModal();return;}
 if(action==='claim-all'){claimRewards(readyAchievements(p).map(a=>a.id));return;}
 if(action==='resume'){modal('none');return;}
 if(action==='restart'){navigate();return;}
 if(action==='restore'){modal('none');syncGate();render();return;}
 if(action==='workshop'){returnScreen='result';modal('shop');return;}
 if(action==='unequip'){p.enchant='none';if(r.status==='ready')r.enchant='none';save();render();return;}
 if(action.startsWith('choose-')){
  if(action==='choose-cloud'&&remote)p=remote;
  p.mode='endless';r=p.endlessAttempt??createRun(0,p.pick,p.enchant,p.owned.includes('starter'),crypto.getRandomValues(new Uint32Array(1))[0]);store.conflict=false;store.save(p);void store.flush(p,true);render();modal(r.status==='playing'?'restore':r.status==='won'||r.status==='lost'?'result':'none');
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
  p.endlessBest=Math.max(p.endlessBest,Math.floor(r.y/32));
  save(true);if(outcome==='won')audio.play('win');else audio.play('pickBreak');modal('result');render();
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
  else{const key:Key=e.kind==='double'?'doubleBonus':e.kind==='sweep'?'sweepBonus':e.kind==='repair'?'repairBonus':e.kind==='relic'?'relicFound':e.kind==='onehit'?'oneHitBonus':e.kind==='phase'?'phaseBonus':e.kind==='magnet'?'magnetBonus':e.kind==='curse'?'curseBonus':e.kind==='shield'?'shieldBonus':e.kind==='coalCharge'?'coalChargeBonus':e.kind==='vein'?'veinBonus':e.kind==='helmet'?(e.value===-1?'helmetProc':'helmetBonus'):'drillBonus';notify(t(key).replace('{value}',String(e.value)).replace('{duration}',String(e.value)).replace('{blocks}',String(e.value)));}
  if(e.kind==='curse')audio.play('clank','curse');else if(e.kind!=='helmet'||e.value!==-1)audio.play('bonus',e.kind);hud();render();
 }
 if(e.type==='revive')audio.play('revive');
 else if(e.type==='blast')audio.play('blast');else if(e.type==='fuse')audio.play('fuse');
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
 p.mode='endless';r=p.endlessAttempt??createRun(0,p.pick,p.enchant,p.owned.includes('starter'),crypto.getRandomValues(new Uint32Array(1))[0]);
 app.innerHTML=`<div class="game-shell"><header class="topbar"><div id="brand" class="brand"></div><div class="top-actions"><div class="wallet"><span>${nugget}<b id="wallet">0</b></span></div><button id="achievements" class="icon-button achievement-button"></button><button id="language" class="icon-button"></button><button id="sound" class="icon-button"></button><button id="fullscreen" class="icon-button"></button></div><button id="shop" class="text-button hud-shop"></button></header><main class="mine-frame"><div id="stage"></div><div id="drop-indicator" class="drop-indicator" aria-hidden="true"><svg viewBox="0 0 14 20"><path d="M10.5 3 3.5 10l7 7"/></svg><svg viewBox="0 0 14 20"><path d="m3.5 3 7 7-7 7"/></svg></div><div class="vignette"></div><button id="pause" class="icon-button pause"></button><div class="hud"><div id="equipped-info" class="equipped-info hud-pick"></div><div class="hud-stat"><label id="hud-label-depth"></label><div class="depth-value"><b id="depth">0%</b><span id="record-label" class="record-label hidden"></span></div></div><div class="hud-stat hp-stat"><label id="hud-label-hp"></label><b id="hp"></b><div class="hp-track"><div id="hp-fill"></div></div></div><div class="hud-stat"><label id="hud-label-ore"></label><b id="ore">0</b><span id="bonus-counter" class="hidden"></span></div><div id="powerup-counter" class="powerup-counter hidden"></div><div id="tnt-slot"></div></div><section id="prep" class="preparation"><div class="controls dormant" id="controls"><div class="control-row"><button id="left" class="nudge-button"></button><button id="drop" class="drop-button"></button><button id="right" class="nudge-button"></button></div><div id="charges" class="charges" role="meter" aria-valuemin="0"></div><div class="control-center hidden"><b id="controls-title"></b><span id="charge-count"></span><p id="control-hint"></p></div></div><span id="drop-label" class="drop-label"></span><span id="prep-hint" class="prep-hint"></span></section><div id="coach" class="coach-callout" aria-live="polite"></div><div id="modal" class="modal-layer hidden"></div></main><div id="local-mode" class="local-mode"></div><div id="toast" role="status"></div></div>`;
 const scene=new MineScene({run:()=>r,aura:()=>p.aura,cue,tick,select,effect,placing:()=>placing,exitText:()=>t('exit'),ready:()=>{render();platform.ready();}});
 game=new Phaser.Game({type:Phaser.AUTO,parent:'stage',backgroundColor:'#102220',pixelArt:true,antialias:false,scale:{mode:Phaser.Scale.RESIZE,width:'100%',height:'100%'},scene:[scene],audio:{noAudio:true},render:{roundPixels:true},fps:{target:60}});
 platform.gate.listeners.add(()=>{syncGate();hud();});
 document.querySelector('#drop')!.addEventListener('click',()=>{if(r.status==='playing')useSkill();else start();});
 document.querySelector('#shop')!.addEventListener('click',()=>{
  if(platform.busy||store.conflict||screen==='shop')return;
  audio.unlock();returnScreen=screen==='none'&&(r.status==='lost'||r.status==='won')?'result':screen;modal('shop');
 });
 document.querySelector('#pause')!.addEventListener('click',()=>modal('pause'));
 document.querySelector('#achievements')!.addEventListener('click',()=>{if(platform.busy||store.conflict||screen==='achievements')return;audio.unlock();achievementReturn=screen;save();modal('achievements');});
 document.querySelector('#sound')!.addEventListener('click',()=>{if(platform.busy||store.conflict||(screen==='settings'||screen==='guide-how'||screen==='guide-atlas'))return;audio.unlock();settingsReturn=screen;modal('settings');});
 document.querySelector('#language')!.addEventListener('click',()=>{p.lang=p.lang==='ru'?'en':'ru';save();render();});
 document.querySelector('#fullscreen')!.addEventListener('click',()=>{if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});else void document.documentElement.requestFullscreen?.().catch(()=>{});});
 for(const [id,dir] of [['left',-1],['right',1]] as const)document.querySelector('#'+id)!.addEventListener('pointerdown',e=>{e.preventDefault();audio.unlock();performNudge(dir);});
 app.addEventListener('input',e=>{
  const input=e.target as HTMLInputElement,key=input.dataset.volume;
  if(screen!=='settings'||(key!=='musicVolume'&&key!=='effectsVolume'))return;
  p[key]=Math.max(0,Math.min(100,Number(input.value)));audio.setVolumes(p.musicVolume,p.effectsVolume);
  document.querySelector(`#${key}-value`)!.textContent=`${p[key]}%`;save();
 });
 app.addEventListener('click',e=>{
  const el=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!el||el.disabled)return;
  if(el.dataset.upgradeAura){const aura=el.dataset.upgradeAura as SkillAura;if(p.skillLevels[aura]>0&&p.skillLevels[aura]<SKILL_MAX_LEVEL){const scroll=el.closest<HTMLElement>('.modal-panel')?.scrollTop??0;p.skillLevels[aura]++;save();render();const panel=document.querySelector<HTMLElement>('.modal-panel');if(panel)panel.scrollTop=scroll;document.querySelector<HTMLButtonElement>(`[data-upgrade-aura="${aura}"]`)?.focus({preventScroll:true});}return;}
  if(el.dataset.aura&&AURAS.includes(el.dataset.aura as Aura)){
   const scroll=el.closest<HTMLElement>('.modal-panel')?.scrollTop??0;p.aura=el.dataset.aura as Aura;if(p.aura!=='none'&&!p.skillLevels[p.aura])p.skillLevels[p.aura]=1;save();render();
   const panel=document.querySelector<HTMLElement>('.modal-panel');if(panel)panel.scrollTop=scroll;
   document.querySelector<HTMLButtonElement>(`[data-aura="${p.aura}"]`)?.focus({preventScroll:true});return;
  }
  if(el.dataset.achievement){claimRewards([el.dataset.achievement]);return;}
  if(el.dataset.achievementFilter){achievementFilter=el.dataset.achievementFilter as typeof achievementFilter;renderModal();return;}
  if(el.dataset.action)void handleAction(el.dataset.action);
  if(el.id==='place-tnt'){placing=!placing;render();}
  if(el.dataset.item){const key=el.dataset.item as Item,scroll=el.closest<HTMLElement>('.modal-panel')?.scrollTop??0;if(p.owned.includes(key)){if(pickKeys.includes(key as Pick))p.pick=key as Pick;else if(key==='wave')p.enchant=key;}else if(!buy(p,key)){notify(t('notEnough'));return;}else notify(t('bought'));
   if(r.status==='ready'&&key!=='helmet'&&key!=='chain'){const column=Math.floor(r.x/32);r=createRun(0,p.pick,p.enchant,p.owned.includes('starter'),crypto.getRandomValues(new Uint32Array(1))[0]);r.x=column*32+16;}
   save();render();const panel=document.querySelector<HTMLElement>('.modal-panel');if(panel)panel.scrollTop=scroll;document.querySelector<HTMLButtonElement>(`[data-item="${key}"]`)?.focus({preventScroll:true});
  }
 });
 window.addEventListener('keydown',e=>{
  if((e.code==='ArrowLeft'||e.code==='ArrowRight')&&!(e.target instanceof HTMLInputElement)){e.preventDefault();if(!e.repeat)performNudge(e.code==='ArrowLeft'?-1:1);}
  if(e.code==='Escape'&&!e.repeat){if(screen==='pause')modal('none');else if(screen==='none'&&r.status==='playing')modal('pause');else if(screen==='achievements')modal(achievementReturn);else if(screen==='shop')modal(returnScreen);else if(screen==='guide-how'||screen==='guide-atlas')modal('settings');else if(screen==='settings')modal(settingsReturn);}
  if(e.code==='KeyE'&&!e.repeat&&!(e.target instanceof HTMLInputElement))useSkill();
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
