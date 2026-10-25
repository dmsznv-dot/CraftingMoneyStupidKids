import {PICKS,LEVELS} from './core.ts';
import type {Pick,Enchant,Run} from './core.ts';
export type Item=Pick|'starter'|'wave'|'chain';
export interface Receipt {amount:number;rewarded:boolean}
export interface Progress {version:1;coins:number;owned:Item[];pick:Pick;enchant:Enchant;unlocked:number;best:number[];receipts:Record<string,Receipt>;lang:'ru'|'en';sound:boolean;tutorial:boolean;revision:number;attempt:Run|null}
export function freshProgress():Progress{return{version:1,coins:0,owned:['wood'],pick:'wood',enchant:'none',unlocked:0,best:Array(12).fill(0),receipts:{},lang:'ru',sound:true,tutorial:false,revision:0,attempt:null};}
export const PRICES:Record<Item,number>={wood:0,stone:100,iron:320,gold:650,diamond:1100,starter:180,wave:260,chain:380};
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
 const amount=60+r.level*10+r.ore;p.coins+=amount;p.receipts[r.id]={amount,rewarded:false};
 p.unlocked=Math.min(LEVELS.length-1,Math.max(p.unlocked,r.level+1));p.best[r.level]=Math.max(p.best[r.level]||0,r.ore);p.revision++;
 const keys=Object.keys(p.receipts);for(const k of keys.slice(0,-30))delete p.receipts[k];
 return amount;
}
export function reward(p:Progress,id:string):number {
 const receipt=p.receipts[id];if(!receipt||receipt.rewarded)return 0;
 receipt.rewarded=true;p.coins+=receipt.amount;p.revision++;return receipt.amount;
}
