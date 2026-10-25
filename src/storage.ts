import {freshProgress} from './progress.ts';
import type {Progress,Item} from './progress.ts';
import {PICKS,BLOCKS,COLS,LEVELS} from './core.ts';
import type {Run,BlockType} from './core.ts';
import type {Player} from 'ysdk';
const items=['wood','stone','iron','gold','diamond','starter','wave','chain'];
const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
export function validRun(r:unknown):r is Run {
 if(!r||typeof r!=='object')return false;const s=r as Run;
 return s.version===1&&typeof s.id==='string'&&Number.isInteger(s.level)&&s.level>=0&&s.level<12&&s.pick in PICKS&&['none','wave','chain'].includes(s.enchant)
  &&s.rows===LEVELS[s.level].rows&&Array.isArray(s.blocks)&&s.blocks.length<=1000
  &&s.blocks.every(b=>b&&Number.isInteger(b.x)&&b.x>=0&&b.x<COLS&&Number.isInteger(b.y)&&b.y>=0&&b.y<s.rows&&Object.hasOwn(BLOCKS,b.type)&&finite(b.hp)&&b.hp>=0&&b.hp<=BLOCKS[b.type as BlockType].hp)
  &&(s.fuses===undefined||Array.isArray(s.fuses)&&s.fuses.length<=40&&s.fuses.every(f=>f&&Number.isInteger(f.x)&&Number.isInteger(f.y)&&finite(f.t)))
  &&['ready','playing','won','lost'].includes(s.status)&&[s.x,s.y,s.vx,s.vy,s.angle,s.spin,s.hp,s.time,s.ore,s.lastNudge,s.lastHit,s.hits,s.nudges].every(finite)
  &&s.x>=0&&s.x<=448&&s.y>=0&&s.y<=s.rows*32+300&&s.hp>=0&&s.hp<=PICKS[s.pick].hp&&Number.isInteger(s.nudges)&&s.nudges>=0&&s.nudges<=PICKS[s.pick].nudges&&s.ore>=0;
}
export function decodeProgress(raw:string):Progress|null {
 try{
  const p=JSON.parse(raw) as Progress;
  if(!p||p.version!==1||!Number.isSafeInteger(p.coins)||p.coins<0||!Array.isArray(p.owned)||!p.owned.includes('wood')||!p.owned.every(x=>items.includes(x))
   ||!p.owned.includes(p.pick)||!(p.pick in PICKS)||!['none','wave','chain'].includes(p.enchant)||(p.enchant!=='none'&&!p.owned.includes(p.enchant))
   ||!Number.isInteger(p.unlocked)||p.unlocked<0||p.unlocked>11||!Array.isArray(p.best)||p.best.length!==12||!p.best.every(x=>finite(x)&&x>=0)
   ||!p.receipts||typeof p.receipts!=='object'||Object.keys(p.receipts).length>30||!Object.values(p.receipts).every(x=>x&&Number.isSafeInteger(x.amount)&&x.amount>=0&&typeof x.rewarded==='boolean')
   ||!Number.isSafeInteger(p.revision)||p.revision<0)return null;
  p.lang=p.lang==='en'?'en':'ru';p.sound=p.sound!==false;p.tutorial=p.tutorial===true;p.owned=[...new Set(p.owned)] as Item[];
  if(p.attempt&&!validRun(p.attempt))p.attempt=null;
  if(p.attempt){p.attempt.events=[];p.attempt.contacts={};p.attempt.fuses??=[];}
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
