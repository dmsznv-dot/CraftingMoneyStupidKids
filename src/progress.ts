import {freshAchievements} from './achievements.ts';
import type {AchievementState} from './achievements.ts';
import {PICKS,BLOCKS} from './core.ts';
import type {Pick,Enchant,Run} from './core.ts';
export type Item=Pick|'starter'|'wave'|'chain'|'helmet';
export const AURAS=['none','fire','lightning','enchanted','ghost'] as const;
export type Aura=typeof AURAS[number];
export interface Receipt {amount:number;rewarded:boolean}
export interface Progress {achievements:AchievementState;version:1;coins:number;owned:Item[];pick:Pick;enchant:Enchant;aura:Aura;unlocked:number;best:number[];receipts:Record<string,Receipt>;lang:'ru'|'en';sound:boolean;musicVolume:number;effectsVolume:number;skillLevels:Record<Exclude<Aura,'none'>,number>;skillBalanceVersion?:number;chainCharges:number;helmetCharges:number;tutorial:boolean;revision:number;attempt:Run|null;mode:'campaign'|'endless';endlessBest:number;endlessAttempt:Run|null;relics:number}
export function freshProgress():Progress{return{achievements:freshAchievements(),version:1,coins:0,owned:['wood'],pick:'wood',enchant:'none',aura:'none',unlocked:0,best:Array(45).fill(0),receipts:{},lang:'ru',sound:true,musicVolume:100,effectsVolume:100,skillLevels:{fire:0,lightning:0,enchanted:0,ghost:0},skillBalanceVersion:1,chainCharges:0,helmetCharges:0,tutorial:false,revision:0,attempt:null,mode:'endless',endlessBest:0,endlessAttempt:null,relics:0};}
// Smooth bounded rewards; early ore makes the first permanent upgrade reachable quickly.
export const PRICES:Record<Item,number>={wood:PICKS.wood.price,stone:PICKS.stone.price,iron:PICKS.iron.price,gold:PICKS.gold.price,diamond:PICKS.diamond.price,obsidian:PICKS.obsidian.price,netherite:PICKS.netherite.price,starter:120,wave:500,chain:1500,helmet:1500};
export function buy(p:Progress,item:Item):boolean {
 if(item==='chain'||item==='helmet'){const stock=item==='chain'?'chainCharges':'helmetCharges';if(p[stock]>=99||p.coins<PRICES[item])return false;p.coins-=PRICES[item];p[stock]++;p.revision++;return true;}
 if(p.owned.includes(item)||!(item in PRICES)||p.coins<PRICES[item])return false;
 const picks=Object.keys(PICKS) as Pick[],index=picks.indexOf(item as Pick);
 if(index>0&&!p.owned.includes(picks[index-1]))return false;
 p.coins-=PRICES[item];p.owned.push(item);p.revision++;
 if(index>=0)p.pick=item as Pick;else if(item==='wave')p.enchant=item;
 return true;
}
/** Consume one purchased helmet only when a new run actually starts. */
export function equipPurchasedHelmet(p:Progress,r:Run):boolean {
 if(r.status!=='ready'||r.helmetCollected||p.helmetCharges<=0)return false;
 p.helmetCharges--;r.helmetReady=true;r.helmetCollected=true;
 // Remove pre-generated helmets as well as preventing later spawns.
 for(const block of r.blocks)if(block.type==='helmet'){block.type='stone';block.hp=BLOCKS.stone.hp;}
 return true;
}
