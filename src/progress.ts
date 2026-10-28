import {freshAchievements} from './achievements.ts';
import type {AchievementState} from './achievements.ts';
import {PICKS} from './core.ts';
import type {Pick,Enchant,Run} from './core.ts';
export type Item=Pick|'starter'|'wave'|'chain';
export const AURAS=['none','fire','lightning','enchanted','ghost'] as const;
export type Aura=typeof AURAS[number];
export interface Receipt {amount:number;rewarded:boolean}
export interface Progress {achievements:AchievementState;version:1;coins:number;owned:Item[];pick:Pick;enchant:Enchant;aura:Aura;unlocked:number;best:number[];receipts:Record<string,Receipt>;lang:'ru'|'en';sound:boolean;tutorial:boolean;revision:number;attempt:Run|null;mode:'campaign'|'endless';endlessBest:number;endlessAttempt:Run|null;relics:number}
export function freshProgress():Progress{return{achievements:freshAchievements(),version:1,coins:0,owned:['wood'],pick:'wood',enchant:'none',aura:'none',unlocked:0,best:Array(45).fill(0),receipts:{},lang:'ru',sound:true,tutorial:false,revision:0,attempt:null,mode:'endless',endlessBest:0,endlessAttempt:null,relics:0};}
// Smooth bounded rewards; early ore makes the first permanent upgrade reachable quickly.
export const PRICES:Record<Item,number>={wood:PICKS.wood.price,stone:PICKS.stone.price,iron:PICKS.iron.price,gold:PICKS.gold.price,diamond:PICKS.diamond.price,obsidian:PICKS.obsidian.price,netherite:PICKS.netherite.price,starter:120,wave:500,chain:1500};
export function buy(p:Progress,item:Item):boolean {
 if(p.owned.includes(item)||!(item in PRICES)||p.coins<PRICES[item])return false;
 const picks=Object.keys(PICKS) as Pick[],index=picks.indexOf(item as Pick);
 if(index>0&&!p.owned.includes(picks[index-1]))return false;
 p.coins-=PRICES[item];p.owned.push(item);p.revision++;
 if(index>=0)p.pick=item as Pick;else if(item==='wave'||item==='chain')p.enchant=item;
 return true;
}
