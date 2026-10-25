import {PICKS,LEVELS} from './core.ts';
import type {Pick,Enchant,Run} from './core.ts';
export type Item=Pick|'starter'|'wave'|'chain';
export interface Receipt {amount:number;rewarded:boolean}
export interface Progress {version:1;coins:number;owned:Item[];pick:Pick;enchant:Enchant;unlocked:number;best:number[];receipts:Record<string,Receipt>;lang:'ru'|'en';sound:boolean;tutorial:boolean;revision:number;attempt:Run|null}
export function freshProgress():Progress{return{version:1,coins:0,owned:['wood'],pick:'wood',enchant:'none',unlocked:0,best:Array(12).fill(0),receipts:{},lang:'ru',sound:true,tutorial:false,revision:0,attempt:null};}
// Each pick costs five times the previous one; deeper mines pay far more, so the next pick is earned deeper down.
export const PRICES:Record<Item,number>={wood:PICKS.wood.price,stone:PICKS.stone.price,iron:PICKS.iron.price,gold:PICKS.gold.price,diamond:PICKS.diamond.price,starter:120,wave:500,chain:1500};
export const levelReward=(level:number)=>Math.round(10*1.3**level);
export function buy(p:Progress,item:Item):boolean {
 if(p.owned.includes(item)||!(item in PRICES)||p.coins<PRICES[item])return false;
 const picks=Object.keys(PICKS) as Pick[],index=picks.indexOf(item as Pick);
 if(index>0&&!p.owned.includes(picks[index-1]))return false;
 p.coins-=PRICES[item];p.owned.push(item);p.revision++;
 if(index>=0)p.pick=item as Pick;else if(item==='wave'||item==='chain')p.enchant=item;
 return true;
}
export function settle(p:Progress,r:Run):number {
 if(r.status!=='won'||p.receipts[r.id])return 0;
 const amount=levelReward(r.level)+r.ore;p.coins+=amount;p.receipts[r.id]={amount,rewarded:false};
 p.unlocked=Math.min(LEVELS.length-1,Math.max(p.unlocked,r.level+1));p.best[r.level]=Math.max(p.best[r.level]||0,r.ore);p.revision++;
 const keys=Object.keys(p.receipts);for(const k of keys.slice(0,-30))delete p.receipts[k];
 return amount;
}
export function reward(p:Progress,id:string):number {
 const receipt=p.receipts[id];if(!receipt||receipt.rewarded)return 0;
 receipt.rewarded=true;p.coins+=receipt.amount;p.revision++;return receipt.amount;
}
