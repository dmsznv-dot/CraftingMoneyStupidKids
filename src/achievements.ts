import {BLOCKS,PICKS} from './core.ts';
import type {BlockType,Run,RunCounters,RunLedger} from './core.ts';
import type {Progress} from './progress.ts';

type Lang='ru'|'en';
export type AchievementGroup='depth'|'mining'|'explosions'|'bonuses'|'journey';
type Metric='bestDepth'|'bestOre'|'bestTnt'|'bestBonuses'|'tnt'|'bonuses'|'oreBlocks'|'runs'|'totalOre'|'woodDepth'|'oreTypes'|'bonusTypes'|'helmetSaves'|'ownedPicks'|'relics';
export interface Achievement {id:string;metric:Metric;group:AchievementGroup;target:number;reward:number;title:Record<Lang,string>}
export interface AchievementState {
 tnt:number;bonuses:number;oreBlocks:number;helmetSaves:number;runs:number;totalOre:number;
 bestDepth:number;bestOre:number;bestTnt:number;bestBonuses:number;woodDepth:number;
 oreTypes:BlockType[];bonusTypes:BlockType[];claimed:string[];
}
export const achievementCopy={
 ru:{title:'Достижения',hint:'Ставь рекорды за один спуск и собирай достижения за всю игру. Награды забираются вручную.',claim:'Забрать',claimed:'Получено',progress:'В процессе',claimAll:'Забрать всё',ready:'Доступно наград',completed:'Выполнено',reward:'Награда',earned:'Награда получена',all:'Все',depth:'Глубина',mining:'Добыча',explosions:'Взрывы',bonuses:'Бонусы',journey:'Путь шахтёра',history:'Старый рекорд глубины, купленные кирки и осколки учтены. Новые накопительные счётчики ведутся с появления достижений.'},
 en:{title:'Achievements',hint:'Set records in a single descent and reach lifetime milestones. Claim rewards here.',claim:'Claim',claimed:'Claimed',progress:'In progress',claimAll:'Claim all',ready:'Rewards ready',completed:'Completed',reward:'Reward',earned:'Reward claimed',all:'All',depth:'Depth',mining:'Mining',explosions:'Explosions',bonuses:'Bonuses',journey:'Miner’s journey',history:'Existing depth records, owned picks and shards count. New lifetime counters start with this update.'}
};
const make=(metric:Metric,group:AchievementGroup,titles:[string,string],targets:number[],rewards:number[]):Achievement[]=>targets.map((target,i)=>({id:`${metric}-${target}`,metric,group,target,reward:rewards[i],title:{ru:titles[0],en:titles[1]}}));
export const ACHIEVEMENTS:Achievement[]=[
 ...make('bestDepth','depth',['Всё глубже','Going deeper'],[100,200,300,500,750,1000],[400,800,1500,3000,5000,8000]),
 ...make('woodDepth','depth',['Упрямое дерево','Stubborn wood'],[75,150],[400,1200]),
 ...make('bestOre','mining',['Богатый спуск','Rich descent'],[100,300,600,1000,2000,4000],[200,400,800,1500,3000,6000]),
 ...make('oreBlocks','mining',['Рудокоп','Ore miner'],[100,1000,5000],[500,1500,4000]),
 ...make('totalOre','mining',['Шахтёрский капитал','Mining capital'],[5000,25000,100000],[800,2000,5000]),
 ...make('oreTypes','mining',['Геолог','Geologist'],[4,7],[800,3000]),
 ...make('bestTnt','explosions',['Взрывной спуск','Explosive descent'],[3,10,25],[250,800,1800]),
 ...make('tnt','explosions',['Подрывник','Demolition expert'],[50,250,1000],[800,1800,5000]),
 ...make('bestBonuses','bonuses',['Поймал волну','On a roll'],[25,100,250],[250,800,1800]),
 ...make('bonuses','bonuses',['Охотник за бонусами','Bonus hunter'],[100,1000,10000],[600,1800,5000]),
 ...make('bonusTypes','bonuses',['Есть что попробовать','Try everything'],[5,10],[600,2000]),
 ...make('helmetSaves','bonuses',['Второй шанс','Second chance'],[1],[800]),
 ...make('runs','journey',['Ещё один забег','One more run'],[10,50,150,500],[300,1000,2500,6000]),
 ...make('ownedPicks','journey',['Арсенал шахтёра','Miner’s arsenal'],[3,5,7],[800,3000,8000]),
 ...make('relics','journey',['Искатель древностей','Ancient explorer'],[1,10,50],[500,1500,5000]),
];
const descriptions:Record<Metric,Record<Lang,(n:number)=>string>>={
 bestDepth:{ru:n=>`Достичь глубины ${n} м в бесконечной шахте.`,en:n=>`Reach ${n} m in the endless mine.`},
 woodDepth:{ru:n=>`Достичь ${n} м, пока кирка остаётся деревянной.`,en:n=>`Reach ${n} m while the pick is still wooden.`},
 bestOre:{ru:n=>`Добыть ${n} наггетов за один спуск.`,en:n=>`Mine ${n} nuggets in one descent.`},
 oreBlocks:{ru:n=>`Добыть ${n} рудных блоков за всё время.`,en:n=>`Mine ${n} ore blocks in total.`},
 totalOre:{ru:n=>`Добыть ${n} наггетов за всё время. Награды достижений и реклама не считаются.`,en:n=>`Mine ${n} nuggets in total. Achievement and ad rewards do not count.`},
 oreTypes:{ru:n=>`Получить добычу из ${n} разных видов руды.`,en:n=>`Collect drops from ${n} different ore types.`},
 bestTnt:{ru:n=>`Взорвать ${n} TNT за один спуск.`,en:n=>`Detonate ${n} TNT in one descent.`},
 tnt:{ru:n=>`Взорвать ${n} TNT за всё время.`,en:n=>`Detonate ${n} TNT in total.`},
 bestBonuses:{ru:n=>`Активировать ${n} полезных бонусов за один спуск.`,en:n=>`Activate ${n} positive bonuses in one descent.`},
 bonuses:{ru:n=>`Активировать ${n} полезных бонусов за всё время.`,en:n=>`Activate ${n} positive bonuses in total.`},
 bonusTypes:{ru:n=>`Испытать ${n} разных полезных бонусов.`,en:n=>`Try ${n} different positive bonus types.`},
 helmetSaves:{ru:()=>`Воскреснуть благодаря шахтёрской каске.`,en:()=>`Be revived by a miner’s helmet.`},
 runs:{ru:n=>`Завершить ${n} спусков победой или поломкой кирки. Перезапуски не считаются.`,en:n=>`Finish ${n} descents with a win or a broken pick. Restarts do not count.`},
 ownedPicks:{ru:n=>`Собрать ${n} постоянных кирок, включая деревянную. Верстак не считается.`,en:n=>`Own ${n} permanent picks, including wood. Workbench upgrades do not count.`},
 relics:{ru:n=>`Собрать ${n} осколков древнего ядра.`,en:n=>`Collect ${n} ancient core shards.`},
};
export function achievementDescription(a:Achievement,lang:Lang){return descriptions[a.metric][lang](a.target);}
export function freshAchievements():AchievementState{return{tnt:0,bonuses:0,oreBlocks:0,helmetSaves:0,runs:0,totalOre:0,bestDepth:0,bestOre:0,bestTnt:0,bestBonuses:0,woodDepth:0,oreTypes:[],bonusTypes:[],claimed:[]};}
const integer=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=Number.MAX_SAFE_INTEGER?n:0;
const types=(value:unknown):BlockType[]=>Array.isArray(value)?[...new Set(value.filter((x):x is BlockType=>typeof x==='string'&&Object.hasOwn(BLOCKS,x)))]:[];
export function restoreAchievements(raw:unknown,p:Progress):AchievementState{
 const result=freshAchievements(),data=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
 for(const key of ['tnt','bonuses','oreBlocks','helmetSaves','runs','totalOre','bestDepth','bestOre','bestTnt','bestBonuses','woodDepth'] as const)result[key]=integer(data[key]);
 result.oreTypes=types(data.oreTypes);result.bonusTypes=types(data.bonusTypes);
 result.claimed=Array.isArray(data.claimed)?[...new Set(data.claimed.filter((id):id is string=>typeof id==='string'&&ACHIEVEMENTS.some(a=>a.id===id)))]:[];
 result.bestDepth=Math.max(result.bestDepth,p.endlessBest);
 result.bestOre=Math.max(result.bestOre,...p.best,p.attempt?.ore??0,p.endlessAttempt?.ore??0);
 return result;
}
export function normalizeRunAchievements(r:Run){
 if(r.achievementStats){const raw=r.achievementStats;r.achievementStats={tnt:integer(raw.tnt),bonuses:integer(raw.bonuses),oreBlocks:integer(raw.oreBlocks),helmetSaves:integer(raw.helmetSaves),oreTypes:types(raw.oreTypes),bonusTypes:types(raw.bonusTypes)};}
 if(r.achievementLedger){const raw=r.achievementLedger;r.achievementLedger={tnt:integer(raw.tnt),bonuses:integer(raw.bonuses),oreBlocks:integer(raw.oreBlocks),helmetSaves:integer(raw.helmetSaves),ore:integer(raw.ore),finished:raw.finished===true};}
}
export function syncAchievements(p:Progress,r:Run){
 const a=p.achievements,stats:RunCounters=r.achievementStats??{tnt:0,bonuses:0,oreBlocks:0,helmetSaves:0,oreTypes:[],bonusTypes:[]};
 const previous:RunLedger=r.achievementLedger??{tnt:0,bonuses:0,oreBlocks:0,helmetSaves:0,ore:0,finished:false};
 for(const key of ['tnt','bonuses','oreBlocks','helmetSaves'] as const)a[key]+=Math.max(0,stats[key]-previous[key]);
 a.totalOre+=Math.max(0,r.ore-previous.ore);
 const finished=r.status==='won'||r.status==='lost';if(finished&&!previous.finished)a.runs++;
 a.bestOre=Math.max(a.bestOre,r.ore);a.bestTnt=Math.max(a.bestTnt,stats.tnt);a.bestBonuses=Math.max(a.bestBonuses,stats.bonuses);
 if(r.mode==='endless'&&r.time>0){const depth=Math.floor(r.y/32);a.bestDepth=Math.max(a.bestDepth,depth);if(r.pick==='wood')a.woodDepth=Math.max(a.woodDepth,depth);}
 a.oreTypes=[...new Set([...a.oreTypes,...stats.oreTypes])];a.bonusTypes=[...new Set([...a.bonusTypes,...stats.bonusTypes])];
 r.achievementLedger={tnt:stats.tnt,bonuses:stats.bonuses,oreBlocks:stats.oreBlocks,helmetSaves:stats.helmetSaves,ore:r.ore,finished};
}
export function achievementValue(p:Progress,a:Achievement):number{
 if(a.metric==='ownedPicks')return p.owned.filter(item=>Object.hasOwn(PICKS,item)).length;
 if(a.metric==='relics')return p.relics;
 if(a.metric==='oreTypes'||a.metric==='bonusTypes')return p.achievements[a.metric].length;
 return p.achievements[a.metric];
}
export function readyAchievements(p:Progress){return ACHIEVEMENTS.filter(a=>!p.achievements.claimed.includes(a.id)&&achievementValue(p,a)>=a.target);}
export function claimAchievement(p:Progress,id:string):number{
 const a=ACHIEVEMENTS.find(a=>a.id===id);if(!a||p.achievements.claimed.includes(id)||achievementValue(p,a)<a.target)return 0;
 p.achievements.claimed.push(id);p.coins+=a.reward;p.revision++;return a.reward;
}
