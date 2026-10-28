import {normalizeRunAchievements,restoreAchievements} from './achievements.ts';
import {AURAS,freshProgress} from './progress.ts';
import type {Progress,Item} from './progress.ts';
import {PICKS,BLOCKS,COLS} from './core.ts';
// Retained only to validate legacy campaign save data, not generate playable maps.
const LEGACY_LEVEL_COUNT=45,legacyRows=(level:number)=>12+Math.floor(level*1.5);
import type {Run,BlockType} from './core.ts';
import type {Player} from 'ysdk';
const items=['wood','stone','iron','gold','diamond','obsidian','netherite','starter','wave','chain'];
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
function migrateDurability(r:Run){
 const version=r.durabilityVersion??0;
 if(version<2){
  if(finite(r.hp))r.hp/=2;
  if(finite(r.hpBonus))r.hpBonus=Math.round(r.hpBonus/2);
  if(finite(r.magnetTime)&&r.magnetTime>=0&&r.magnetTime<=10)r.magnetTime=Math.min(3,r.magnetTime);
 }
 if(version<3){if(finite(r.hp))r.hp/=2;if(finite(r.hpBonus))r.hpBonus=Math.round(r.hpBonus/2);}
 if(version<4){if(finite(r.hp))r.hp*=2;if(finite(r.hpBonus))r.hpBonus*=2;}
 r.durabilityVersion=4;
}
function migrateBlockBalance(r:Run){
 if(r.blockBalanceVersion===1||!Array.isArray(r.blocks))return;
 const old:Partial<Record<BlockType,number>>={dirt:1,coal:1,copper:1.5,stone:2.5};
 for(const b of r.blocks){const hp=old[b.type];if(hp!==undefined&&finite(b.hp)&&b.hp>0&&b.hp<=hp)b.hp=b.hp/hp*BLOCKS[b.type].hp;}
 r.blockBalanceVersion=1;
}
function migrateHelmet(r:Run){
 if(r.helmetCollected!==undefined)return;
 r.helmetCollected=!!r.helmetReady;
 // Older helmets granted this durability immediately when picked up.
 if(r.helmetReady){
  const oldBonus=Math.ceil(PICKS[r.pick].hp*.25);
  if((r.hpBonus??0)>=oldBonus){r.hpBonus=(r.hpBonus??0)-oldBonus;r.hp=Math.max(1,r.hp-oldBonus);}
 }
}
export function validRun(r:unknown):r is Run {
 if(!r||typeof r!=='object')return false;const s=r as Run;
 return s.version===1&&s.durabilityVersion===4&&typeof s.id==='string'&&Number.isInteger(s.level)&&s.level>=0&&s.level<LEGACY_LEVEL_COUNT&&s.pick in PICKS&&['none','wave','chain'].includes(s.enchant)
  &&(s.mode==='endless'?Number.isSafeInteger(s.rows)&&s.rows>=legacyRows(s.level)&&s.rows<=120000:s.mode===undefined||s.mode==='campaign'?s.rows===legacyRows(s.level):false)&&Array.isArray(s.blocks)&&s.blocks.length<=4000
  &&s.blocks.every(b=>b&&Number.isInteger(b.x)&&b.x>=0&&b.x<COLS&&Number.isInteger(b.y)&&b.y>=0&&b.y<s.rows&&Object.hasOwn(BLOCKS,b.type)&&finite(b.hp)&&b.hp>=0&&b.hp<=BLOCKS[b.type as BlockType].hp)
  &&(s.fuses===undefined||Array.isArray(s.fuses)&&s.fuses.length<=40&&s.fuses.every(f=>f&&Number.isInteger(f.x)&&Number.isInteger(f.y)&&finite(f.t)))
  &&['ready','playing','won','lost'].includes(s.status)&&[s.x,s.y,s.vx,s.vy,s.angle,s.spin,s.hp,s.time,s.ore,s.lastNudge,s.lastHit,s.hits,s.nudges].every(finite)
  &&Number.isInteger(s.doubleLeft)&&s.doubleLeft>=0&&s.doubleLeft<=5&&(s.oneHitTime===undefined||finite(s.oneHitTime)&&s.oneHitTime>=0&&s.oneHitTime<=5)&&(s.phaseTime===undefined||finite(s.phaseTime)&&s.phaseTime>=0&&s.phaseTime<=5)&&(s.magnetTime===undefined||finite(s.magnetTime)&&s.magnetTime>=0&&s.magnetTime<=3)&&(s.shieldTime===undefined||finite(s.shieldTime)&&s.shieldTime>=0&&s.shieldTime<=5)&&(s.helmetReady===undefined||typeof s.helmetReady==='boolean')&&(s.helmetCollected===undefined||typeof s.helmetCollected==='boolean')&&(s.helmetGraceTime===undefined||finite(s.helmetGraceTime)&&s.helmetGraceTime>=0&&s.helmetGraceTime<=.25)&&(s.hpBonus===undefined||Number.isSafeInteger(s.hpBonus)&&s.hpBonus>=0&&s.hpBonus<=200)&&(s.benchUsed===undefined||typeof s.benchUsed==='boolean')&&(s.benchSpawned===undefined||typeof s.benchSpawned==='boolean')&&(s.seed===undefined||finite(s.seed))&&(s.relics===undefined||Number.isSafeInteger(s.relics)&&s.relics>=0)&&(s.claimedRelics===undefined||Number.isSafeInteger(s.claimedRelics)&&s.claimedRelics>=0&&s.claimedRelics<=(s.relics??0))&&(s.oreClaimed===undefined||Number.isSafeInteger(s.oreClaimed)&&s.oreClaimed>=0&&s.oreClaimed<=s.ore)
  &&s.x>=0&&s.x<=448&&s.y>=0&&s.y<=s.rows*32+300&&s.hp>=0&&s.hp<=PICKS[s.pick].hp+(s.hpBonus??0)&&Number.isInteger(s.nudges)&&s.nudges>=0&&s.nudges<=PICKS[s.pick].nudges&&s.ore>=0;
}
export function decodeProgress(raw:string):Progress|null {
 try{
  const p=JSON.parse(raw) as Progress;
  if(!p||p.version!==1||!Number.isSafeInteger(p.coins)||p.coins<0||!Array.isArray(p.owned)||!p.owned.includes('wood')||!p.owned.every(x=>items.includes(x))
   ||!p.owned.includes(p.pick)||!(p.pick in PICKS)||!['none','wave','chain'].includes(p.enchant)||(p.enchant!=='none'&&!p.owned.includes(p.enchant))
   ||!Number.isInteger(p.unlocked)||p.unlocked<0||p.unlocked>=LEGACY_LEVEL_COUNT||!Array.isArray(p.best)||![12,LEGACY_LEVEL_COUNT].includes(p.best.length)||!p.best.every(x=>finite(x)&&x>=0)
   ||!p.receipts||typeof p.receipts!=='object'||Object.keys(p.receipts).length>30||!Object.values(p.receipts).every(x=>x&&Number.isSafeInteger(x.amount)&&x.amount>=0&&typeof x.rewarded==='boolean')
   ||!Number.isSafeInteger(p.revision)||p.revision<0)return null;
  if(p.best.length===12)p.best.push(...Array(LEGACY_LEVEL_COUNT-12).fill(0));
  p.mode=p.mode==='endless'?'endless':'campaign';
  p.aura=AURAS.includes(p.aura)?p.aura:'none';
  p.endlessBest=Number.isSafeInteger(p.endlessBest)&&p.endlessBest>=0?p.endlessBest:0;p.relics=Number.isSafeInteger(p.relics)&&p.relics>=0?p.relics:0;
  p.lang=p.lang==='en'?'en':'ru';p.sound=p.sound!==false;p.tutorial=p.tutorial===true;p.owned=[...new Set(p.owned)] as Item[];
  if(p.attempt){p.attempt.doubleLeft??=0;p.attempt.oneHitTime??=0;p.attempt.phaseTime??=0;p.attempt.magnetTime??=0;p.attempt.shieldTime??=0;p.attempt.helmetGraceTime??=0;p.attempt.hpBonus??=0;p.attempt.benchUsed??=false;p.attempt.benchSpawned??=false;migrateDurability(p.attempt);migrateHelmet(p.attempt);p.attempt.helmetReady??=false;}
  if(p.attempt&&!validRun(p.attempt))p.attempt=null;
  if(p.attempt){normalizeRunAchievements(p.attempt);p.attempt.events=[];p.attempt.contacts={};p.attempt.fuses??=[];}
  if(p.endlessAttempt){p.endlessAttempt.doubleLeft??=0;p.endlessAttempt.oneHitTime??=0;p.endlessAttempt.phaseTime??=0;p.endlessAttempt.magnetTime??=0;p.endlessAttempt.shieldTime??=0;p.endlessAttempt.helmetGraceTime??=0;p.endlessAttempt.hpBonus??=0;p.endlessAttempt.benchUsed??=false;p.endlessAttempt.benchSpawned??=false;p.endlessAttempt.relics??=0;p.endlessAttempt.claimedRelics??=0;p.endlessAttempt.oreClaimed??=0;p.endlessAttempt.mode='endless';migrateDurability(p.endlessAttempt);migrateHelmet(p.endlessAttempt);migrateBlockBalance(p.endlessAttempt);p.endlessAttempt.helmetReady??=false;}
  if(p.endlessAttempt&&(!validRun(p.endlessAttempt)||p.endlessAttempt.mode!=='endless'))p.endlessAttempt=null;
  if(p.endlessAttempt){normalizeRunAchievements(p.endlessAttempt);p.endlessAttempt.events=[];p.endlessAttempt.contacts={};p.endlessAttempt.fuses??=[];}
  p.achievements=restoreAchievements(p.achievements,p);
  return p;
 }catch{return null;}
}
export class SaveStore {
 key='shaft-impulse-v1:local';player:Player|null=null;cloudSafe=false;conflict=false;dirty=false;sending=false;lastSend=0;error=false;
 async load(player:Player|null):Promise<{local:Progress;remote:Progress|null;conflict:boolean;hasLocal:boolean}>{
  this.player=player;if(player)this.key='shaft-impulse-v1:'+player.getUniqueID();
  let local:Progress|null=null;try{local=decodeProgress(localStorage.getItem(this.key)||'');}catch{this.error=true;}
  let remote:Progress|null=null;
  if(player){try{const data=await player.getData(['shaft']);this.cloudSafe=true;if(data.shaft)remote=decodeProgress(JSON.stringify(data.shaft));if(data.shaft&&!remote)this.cloudSafe=false;}catch{this.cloudSafe=false;}}
  const conflict=!!local&&!!remote&&JSON.stringify(local)!==JSON.stringify(remote);this.conflict=conflict;
  return{local:local??remote??freshProgress(),remote,conflict,hasLocal:!!local};
 }
 save(p:Progress){
  if(this.conflict)return;
  try{localStorage.setItem(this.key,JSON.stringify(p));this.error=false;}catch{this.error=true;}
  this.dirty=true;
 }
 async flush(p:Progress,force=false){
  if(this.conflict||!this.player||!this.cloudSafe||!this.dirty||this.sending||(!force&&Date.now()-this.lastSend<15000))return;
  this.sending=true;this.lastSend=Date.now();this.dirty=false;
  try{await this.player.setData({shaft:JSON.parse(JSON.stringify(p))},true);}catch{this.dirty=true;}
  finally{this.sending=false;}
 }
}
