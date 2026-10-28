export type Pick = 'wood'|'stone'|'iron'|'gold'|'diamond'|'obsidian'|'netherite';
export type Enchant = 'none'|'wave'|'chain';
export type SkillAura='fire'|'lightning'|'enchanted'|'ghost';
export const SKILL_MAX_LEVEL=5;
export function skillStats(aura:SkillAura,level:number){
 const n=Math.max(1,Math.min(SKILL_MAX_LEVEL,Math.floor(level)||1));
 return {uses:[1,2,2,3,3][n-1],duration:aura==='enchanted'?[2,2,2.5,2.5,3][n-1]:[3,3,4,4,5][n-1],radius:[3,3,4,4,5][n-1],speed:aura==='enchanted'&&n===5?1.15:aura==='ghost'&&n===5?1.1:1};
}
export type BlockType = 'dirt'|'stone'|'hard'|'gold'|'gem'|'tnt'|'obsidian'|'bedrock'|'coal'|'copper'|'iron'|'emerald'|'ancient'|'double'|'sweep'|'repair'|'relic'|'onehit'|'phase'|'bench'|'drill'|'magnet'|'curse'|'shield'|'coalCharge'|'vein'|'helmet';
export const TILE=32, COLS=14, WIDTH=COLS*TILE;
// tier gates which blocks a pick mines properly; soft multiplies damage to dirt and stone.
export const PICKS:Record<Pick,{nudges:number;hp:number;damage:number;tier:number;soft:number;price:number;color:number}>= {
 wood:{nudges:0,hp:50,damage:1,tier:0,soft:1,price:0,color:0xba8959},
 stone:{nudges:1,hp:65,damage:1.6,tier:1,soft:1,price:40,color:0xabb7b9},
 iron:{nudges:2,hp:85,damage:2.2,tier:2,soft:1,price:200,color:0xcfe4de},
 gold:{nudges:3,hp:72.5,damage:2.6,tier:2,soft:1.5,price:2000,color:0xf4cb64},
 diamond:{nudges:4,hp:115,damage:3.2,tier:3,soft:1,price:12000,color:0x6ce5ca},
 obsidian:{nudges:4,hp:155,damage:4.4,tier:4,soft:1,price:60000,color:0x9e7bbe},
 netherite:{nudges:4,hp:200,damage:5.8,tier:5,soft:1.15,price:220000,color:0x85777d},
};
// hp: blows to break; tier: weakest pick that mines it properly; wear: pick durability per blow; ore: nuggets when mined.
// A pick below the tier only chips the block (UNDERTIER damage, if chip) and the broken ore crumbles to nothing.
// Obsidian yields to a diamond pick only; bedrock never breaks. Neither is touched by TNT.
export const BLOCKS:Record<BlockType,{hp:number;tier:number;wear:number;ore:number;chip:boolean;blastproof:boolean}>= {
 coal:{hp:1.8,tier:0,wear:.4,ore:1,chip:true,blastproof:false},
 copper:{hp:2.3,tier:0,wear:.45,ore:2,chip:true,blastproof:false},
 iron:{hp:2.5,tier:1,wear:.6,ore:4,chip:true,blastproof:false},
 emerald:{hp:5,tier:3,wear:.8,ore:16,chip:true,blastproof:false},
 ancient:{hp:8,tier:5,wear:1.05,ore:30,chip:true,blastproof:false},
 double:{hp:1,tier:0,wear:0,ore:0,chip:true,blastproof:false},
 sweep:{hp:1,tier:0,wear:0,ore:0,chip:true,blastproof:false},
 repair:{hp:1,tier:0,wear:0,ore:0,chip:true,blastproof:false},
 relic:{hp:1,tier:0,wear:0,ore:0,chip:true,blastproof:false},
 onehit:{hp:1,tier:0,wear:0,ore:0,chip:true,blastproof:false},
 phase:{hp:1,tier:0,wear:0,ore:0,chip:true,blastproof:false},
 bench:{hp:1,tier:0,wear:0,ore:0,chip:true,blastproof:false},
 drill:{hp:1,tier:0,wear:0,ore:0,chip:true,blastproof:false},
 magnet:{hp:1,tier:0,wear:0,ore:0,chip:true,blastproof:false},
 curse:{hp:1,tier:0,wear:0,ore:0,chip:true,blastproof:false},
 shield:{hp:1,tier:0,wear:0,ore:0,chip:true,blastproof:false},coalCharge:{hp:1,tier:0,wear:0,ore:0,chip:true,blastproof:false},
 vein:{hp:1,tier:0,wear:0,ore:0,chip:true,blastproof:false},helmet:{hp:1,tier:0,wear:0,ore:0,chip:true,blastproof:false},
 dirt:{hp:1.8,tier:0,wear:.55,ore:0,chip:true,blastproof:false},
 stone:{hp:3.2,tier:0,wear:.8,ore:0,chip:true,blastproof:false},
 gold:{hp:3,tier:1,wear:.65,ore:7,chip:true,blastproof:false},
 gem:{hp:4,tier:2,wear:.75,ore:11,chip:true,blastproof:false},
 hard:{hp:5,tier:2,wear:1.1,ore:0,chip:true,blastproof:false},
 tnt:{hp:1,tier:0,wear:0,ore:0,chip:true,blastproof:false},
 obsidian:{hp:6,tier:3,wear:.9,ore:0,chip:false,blastproof:true},
 bedrock:{hp:1,tier:99,wear:.5,ore:0,chip:false,blastproof:true},
};
export const UNDERTIER=.35,BLAST_RADIUS=50,BLAST_DAMAGE=4,FUSE_DELAY=.3;
// Collider in the sprite's own frame (the texture is drawn turned by -45°): body, two head tips, handle end.
// Head tips are the working edge: they wear the pick less than a blow with the body or handle.
export const PICK_PARTS=[{x:0,y:0,r:11,wear:1},{x:-21,y:-13,r:5,wear:.65},{x:21,y:-13,r:5,wear:.65},{x:0,y:25,r:4,wear:1}];
export interface Block {x:number;y:number;type:BlockType;hp:number}
export interface RunEvent {type:'hit'|'break'|'blast'|'nudge'|'fuse'|'bonus'|'revive'|'skill';x:number;y:number;kind?:BlockType;value?:number;weak?:boolean}
export interface RunCounters {tnt:number;bonuses:number;oreBlocks:number;helmetSaves:number;oreTypes:BlockType[];bonusTypes:BlockType[]}
export interface RunLedger {tnt:number;bonuses:number;oreBlocks:number;helmetSaves:number;ore:number;finished:boolean}
export interface Run {
 achievementStats?:RunCounters;achievementLedger?:RunLedger;
 skillAura?:SkillAura;skillLevel?:number;skillCharges?:number;skillMaxCharges?:number;skillFireTime?:number;skillDrillTime?:number;skillGhostTime?:number;chainActive?:boolean;
 version:1;durabilityVersion?:4;blockBalanceVersion?:1;recordBefore?:number;id:string;level:number;pick:Pick;enchant:Enchant;rows:number;blocks:Block[];
 mode?:'campaign'|'endless';seed?:number;relics?:number;claimedRelics?:number;oreClaimed?:number;oneHitTime?:number;phaseTime?:number;magnetTime?:number;shieldTime?:number;helmetReady?:boolean;helmetCollected?:boolean;helmetGraceTime?:number;hpBonus?:number;benchUsed?:boolean;benchSpawned?:boolean;
 x:number;y:number;vx:number;vy:number;angle:number;spin:number;hp:number;nudges:number;
 ore:number;doubleLeft:number;time:number;lastNudge:number;lastHit:number;hits:number;status:'ready'|'playing'|'won'|'lost';
 starter:boolean;starterPlaced:boolean;events:RunEvent[];contacts:Record<string,number>;
 fuses:{x:number;y:number;t:number}[];
}
// Count simulation events at their source; rendering and reloads cannot count them twice.
function emit(r:Run,e:RunEvent){
 const stats=r.achievementStats??={tnt:0,bonuses:0,oreBlocks:0,helmetSaves:0,oreTypes:[],bonusTypes:[]};
 if(e.type==='blast')stats.tnt++;
 if(e.type==='break'&&e.kind&&BLOCKS[e.kind].ore>0&&(e.value??0)>0){stats.oreBlocks++;if(!stats.oreTypes.includes(e.kind))stats.oreTypes.push(e.kind);}
 if(e.type==='bonus'&&e.kind){
  if(e.kind==='helmet'&&e.value===-1)stats.helmetSaves++;
  else if(e.kind!=='curse'){stats.bonuses++;if(!stats.bonusTypes.includes(e.kind))stats.bonusTypes.push(e.kind);}
 }
 r.events.push(e);
}
const NEXT_PICK:Partial<Record<Pick,Pick>>={wood:'stone',stone:'iron',iron:'diamond',gold:'diamond',diamond:'obsidian',obsidian:'netherite'};
export function maxDurability(r:Pick|Run):number {
 const pick=typeof r==='string'?r:r.pick,bonus=typeof r==='string'?0:r.hpBonus??0;
 return PICKS[pick].hp+bonus;
}
export const FUSE=[[10,9],[10,11],[9,13]];
// First-nudge lesson cue: an intact fuse TNT just below and off to the side, reachable only with a push.
// A cue already on screen keeps a wider window so a bouncing pick does not make it flicker.
export function fuseCue(r:Run,shown=false):{x:number;y:number;dir:number}|null {
 if(r.status!=='playing'||r.nudges<=0)return null;
 for(const [x,y] of FUSE){
  if(!r.blocks.some(b=>b.x===x&&b.y===y&&b.type==='tnt'&&b.hp>0))continue;
  const tx=x*TILE+16,ty=y*TILE+16,dx=tx-r.x;
  if(ty-r.y>30&&ty-r.y<(shown?260:200)&&Math.abs(dx)>(shown?24:40))return{x:tx,y:ty,dir:Math.sign(dx)};
 }
 return null;
}
function random(seed:number){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const EARLY_ACTIONS:BlockType[]=['onehit','drill','sweep'];
const MID_ACTIONS:BlockType[]=[...EARLY_ACTIONS,'magnet'];
const DEEP_ACTIONS:BlockType[]=[...MID_ACTIONS,'phase'];
// Early bonuses are useful without letting a starter pick skip the whole mine.
export function depthBonusStats(row:number){const depth=Math.max(0,row-4);return depth<100?{weight:.3,drillWeight:1.5,drill:4,magnet:1.5}:depth<200?{weight:.6,drillWeight:1,drill:7,magnet:2}:{weight:1,drillWeight:1,drill:10,magnet:3};}
function addEndlessAction(type:BlockType,difficulty:number,rand:()=>number,row:number):BlockType{
 if(type!=='stone'&&type!=='dirt')return type;
 const roll=rand();
 if(roll<.012)return 'tnt';
 if(roll>=.252)return type;
 const pool=difficulty>=3?DEEP_ACTIONS:difficulty>=2?MID_ACTIONS:EARLY_ACTIONS;
 const weight=(action:BlockType)=>action==='phase'?.08:action==='drill'?depthBonusStats(row).drillWeight:action==='magnet'?depthBonusStats(row).weight:1;
 let actionRoll=rand()*pool.reduce((sum,action)=>sum+weight(action),0);
 for(const action of pool){actionRoll-=weight(action);if(actionRoll<0)return action;}
 return pool[pool.length-1];
}
// The undisturbed surface is a continuous row of earth; never rebuild mined rows mid-run.
export function ensureSurface(r:Run){
 if(r.status!=='ready')return;
 const surface:Block[]=Array.from({length:COLS},(_,x)=>({x,y:4,type:'dirt',hp:BLOCKS.dirt.hp}));
 r.blocks=[...surface,...r.blocks.filter(block=>block.y!==4)];
}
// Starts the procedural mine with the same seeded surface layout on every platform.
export function createRun(_level:number,pick:Pick,enchant:Enchant='none',starter=false,seedOverride?:number):Run {
 const seed=seedOverride??41,rand=random(seed),blocks:Block[]=[];
 const route=Array.from({length:24},(_,k)=>6+(Math.floor(k/2)%3===0?1:0));
 for(let y=4;y<12;y++){
  const lane=route[Math.floor((y-4)/4)%route.length];
  for(let x=0;x<COLS;x++){
   const near=Math.abs(x-lane)<=1;let type:BlockType;
   if(near){if(y%5!==0)continue;type=y%10===5?'coal':'copper';}
   else{if(rand()<.45)continue;const roll=rand();type=y<7?(roll<.3?'coal':'dirt'):(roll<.12?'coal':roll<.24?'copper':'dirt');}
   blocks.push({x,y,type,hp:BLOCKS[type].hp});
  }
 }
 for(const x of [5,6,7,8])for(const [y,type] of [[5,'coal'],[10,'copper']] as const){
  const old=blocks.find(b=>b.x===x&&b.y===y);if(old){old.type=type;old.hp=BLOCKS[type].hp;}else blocks.push({x,y,type,hp:BLOCKS[type].hp});
 }
 const bonusRand=random(seed^0x5eb2d91);
 for(const block of blocks){block.type=addEndlessAction(block.type,1,bonusRand,block.y);block.hp=BLOCKS[block.type].hp;}
 const run:Run={version:1,durabilityVersion:4,blockBalanceVersion:1,id:crypto.randomUUID(),level:0,pick,enchant,rows:12,blocks,x:224,y:64,vx:18,vy:0,angle:-.5,spin:3.8,
  hp:PICKS[pick].hp,nudges:PICKS[pick].nudges,ore:0,doubleLeft:0,time:0,lastNudge:-10,lastHit:-10,hits:0,status:'ready',starter,starterPlaced:false,events:[],contacts:{},fuses:[],seed,mode:'endless',relics:0,claimedRelics:0,oneHitTime:0,phaseTime:0};
 ensureSurface(run);extendEndlessMine(run);return run;
}
/** Extend an endless mine beneath the camera with a seeded, progressively richer and harder section. */
export function extendEndlessMine(r:Run){
 if(r.mode!=='endless')return;
 const start=r.rows,end=start+32,section=Math.floor(start/32),difficulty=Math.min(44,section+1);r.level=difficulty;
 const rand=random((r.seed??1)+section*7919+17),route:number[]=[];let lane=4+Math.floor(rand()*6);
 const bonusRand=random((r.seed??1)^Math.imul(section+1,0x7f4a7c15));
 const balanceRand=random((r.seed??1)^Math.imul(section+1,0x379bc517));
 for(let k=0;k<24;k++){lane=Math.max(2,Math.min(COLS-3,lane+(rand()<.25?-1:rand()>.75?1:0)));route.push(lane);}
 // A lucky chamber gives a breather, while the surrounding tunnel stays packed.
 const chamber=rand()<.14,cx=1+Math.floor(rand()*(COLS-4)),cy=start+4+Math.floor(rand()*22),cw=2+Math.floor(rand()*2),ch=2+Math.floor(rand()*2);
 for(let y=start;y<end;y++){
  const segment=Math.floor((y-start)/4);
  for(let x=0;x<COLS;x++){
   const near=Math.abs(x-route[segment%route.length])<=1;
   if(chamber&&x>=cx&&x<cx+cw&&y>=cy&&y<cy+ch)continue;
   if(rand()<.015)continue;
   if(near&&x===route[segment%route.length]&&y%16===0)continue;
   const q=rand();let type:BlockType;
   if(q<.075)type='coal';else if(q<.15)type='copper';else if(q<.23)type=difficulty>=2?'iron':'stone';
   else if(q<.29)type=difficulty>=5?'gold':'stone';else if(q<.34)type=difficulty>=9?'gem':'stone';
   else if(q<.385)type=difficulty>=16?'emerald':'stone';else if(q<.405)type=difficulty>=36?'ancient':'stone';
   else if(q<.411)type=difficulty>=2?'double':'stone';else if(q<.416)type=difficulty>=4?'sweep':'stone';
   else if(q<.420)type='repair';else if(q<.423)type=difficulty>=12?'relic':'stone';
   else if(q<.435)type=difficulty>=4?'onehit':'stone';else if(q<.440)type=difficulty>=6?'phase':'stone';
   else if(q<.442)type=difficulty>=2?'tnt':'stone';else if(q<.450)type=difficulty>=3?'drill':'stone';else if(q<.458)type=difficulty>=4?'magnet':'stone';else if(q<.460)type=difficulty>=5?'curse':'stone';else if(q>.99&&difficulty>=36)type='bedrock';
   else if(q>.96&&difficulty>=22)type='obsidian';else if(q>.88&&difficulty>=7)type='hard';
   else type=difficulty<3?'dirt':'stone';
   if(near&&type==='stone'&&x===route[segment%route.length])type=y%6===0?'copper':'dirt';
   const directAction=type==='drill'||type==='magnet';
   // Add bonus finds on otherwise ordinary ground. The chance ramps up as
   // the run unlocks a wider pool, while ores and hazards keep their rates.
   if((type==='stone'||type==='dirt')&&difficulty>=2){
    const bonusChance=.035+Math.min(1,(difficulty-1)/5)*.075;
    if(rand()<bonusChance)type=pickEndlessBonus(difficulty,rand,y);
   }
   if(directAction&&balanceRand()>Math.min(1,type==='drill'?depthBonusStats(y).drillWeight:depthBonusStats(y).weight))type='stone';
   if(r.helmetCollected&&type==='helmet')type='stone';
   // A separate random stream keeps existing repair and double placements intact.
   type=addEndlessAction(type,difficulty,bonusRand,y);
   r.blocks.push({x,y,type,hp:BLOCKS[type].hp});
  }
 }
 if(!r.benchUsed&&!r.benchSpawned&&section>=2){
  const row=Math.min(end-1,start+8+Math.floor(rand()*16)),col=route[Math.floor(rand()*route.length)];
  const existing=r.blocks.find(b=>b.x===col&&b.y===row);
  if(existing){existing.type='bench';existing.hp=BLOCKS.bench.hp;}else r.blocks.push({x:col,y:row,type:'bench',hp:BLOCKS.bench.hp});
  r.benchSpawned=true;
 }
 r.rows=end;
 // Keep a generous tunnel behind the camera so memory and collision checks stay bounded.
 const cutoff=Math.max(4,Math.floor(r.y/TILE)-42);r.blocks=r.blocks.filter(b=>b.y>=cutoff);
}
function pickEndlessBonus(difficulty:number,rand:()=>number,row:number):BlockType{
 const candidates:{type:BlockType;from:number;weight:number}[]=[
  {type:'double',from:2,weight:1.7},
  {type:'drill',from:3,weight:1.6*depthBonusStats(row).drillWeight},
  {type:'sweep',from:4,weight:1.5},
  {type:'onehit',from:4,weight:1.8},
  {type:'magnet',from:4,weight:1.5*depthBonusStats(row).weight},
  {type:'phase',from:6,weight:.6},
  {type:'shield',from:2,weight:.025},
  {type:'coalCharge',from:3,weight:.8},
  {type:'vein',from:2,weight:.08},
  {type:'helmet',from:3,weight:.08},
 ];
 const pool=candidates.filter(b=>difficulty>=b.from);
 if(!pool.length)return 'repair';
 let roll=rand()*pool.reduce((sum,b)=>sum+b.weight,0);
 for(const bonus of pool){roll-=bonus.weight;if(roll<0)return bonus.type;}
 return pool[pool.length-1].type;
}
export function nudge(r:Run,dir:number):boolean {
 if(r.status==='ready')r.status='playing';
 if(r.status!=='playing'||r.nudges<=0||r.time-r.lastNudge<.25||![-1,1].includes(dir))return false;
 r.nudges--;r.lastNudge=r.time;r.vx=Math.max(-195,Math.min(195,r.vx+dir*145));r.spin+=dir*1.1;
 emit(r,{type:'nudge',x:r.x,y:r.y});return true;
}
export function placeStarter(r:Run,column:number):boolean {
 if(r.status!=='ready'||!r.starter||r.starterPlaced||!Number.isInteger(column)||column<0||column>=COLS)return false;
 r.blocks.push({x:column,y:3,type:'tnt',hp:BLOCKS.tnt.hp});r.starterPlaced=true;return true;
}
// Queue drills during cascades so every destroyed drill activates once without recursive drill chains.
interface BonusCascade {drills:{count:number}[];processing:boolean}
// One shared collection path for pick, enchantment, TNT and bonus cascades.
export function collectBlock(r:Run,b:Block,drop=true,cascade:BonusCascade={drills:[],processing:false}){
 if(b.hp<=0)return;b.hp=0;
 if(b.type==='double'){
  r.doubleLeft=5;emit(r,{type:'break',x:b.x*TILE+16,y:b.y*TILE+16,kind:b.type,value:0});
  emit(r,{type:'bonus',x:b.x*TILE+16,y:b.y*TILE+16,kind:b.type});return;
 }
 if(b.type==='repair'){
  const before=r.hp;r.hp=Math.min(maxDurability(r),r.hp+1);
  emit(r,{type:'bonus',x:b.x*TILE+16,y:b.y*TILE+16,kind:b.type,value:Math.ceil(r.hp-before)});return;
 }
 if(b.type==='onehit'){
  r.oneHitTime=5;emit(r,{type:'bonus',x:b.x*TILE+16,y:b.y*TILE+16,kind:b.type,value:5});return;
 }
 if(b.type==='phase'){
  r.phaseTime=3;emit(r,{type:'bonus',x:b.x*TILE+16,y:b.y*TILE+16,kind:b.type,value:3});return;
 }
 if(b.type==='magnet'){
  const duration=r.mode==='endless'?depthBonusStats(b.y).magnet:3;
  r.magnetTime=duration;emit(r,{type:'bonus',x:b.x*TILE+16,y:b.y*TILE+16,kind:b.type,value:duration});return;
 }
 if(b.type==='shield'){
  r.shieldTime=5;emit(r,{type:'bonus',x:b.x*TILE+16,y:b.y*TILE+16,kind:b.type,value:5});return;
 }
 if(b.type==='coalCharge'){
  const x=b.x*TILE+16,y=b.y*TILE+16,radius=Math.hypot(WIDTH/2,360);
  const targets=r.blocks.filter(other=>other.hp>0&&other.type==='tnt'&&Math.hypot(other.x*TILE+16-x,other.y*TILE+16-y)<=radius);
  for(const target of targets)lightTnt(r,target);
  emit(r,{type:'bonus',x,y,kind:b.type,value:targets.length});return;
 }
 if(b.type==='vein'){
  const rewards=[1,2,4,7,11,16,30],seed=(r.seed??r.level+1)|0;
  const roll=(Math.imul(b.x+1,0x45d9f3b)^Math.imul(b.y+1,0x119de1f3)^seed)>>>0,value=rewards[roll%rewards.length];
  r.ore+=value;emit(r,{type:'bonus',x:b.x*TILE+16,y:b.y*TILE+16,kind:b.type,value});return;
 }
 if(b.type==='helmet'){
  if(r.helmetCollected)return;
  r.helmetReady=true;r.helmetCollected=true;
  for(const other of r.blocks)if(other.type==='helmet')other.hp=0;
  emit(r,{type:'bonus',x:b.x*TILE+16,y:b.y*TILE+16,kind:b.type,value:1});return;
 }
 if(b.type==='curse'){
  const damage=Math.ceil(maxDurability(r)*.25);applyWear(r,damage);
  emit(r,{type:'bonus',x:b.x*TILE+16,y:b.y*TILE+16,kind:b.type,value:damage});return;
 }
 if(b.type==='bench'){
  const next=NEXT_PICK[r.pick];
  if(next){r.hp+=PICKS[next].hp-PICKS[r.pick].hp;r.pick=next;r.nudges=PICKS[next].nudges;}
  else{const extra=Math.round(PICKS[r.pick].hp*.5);r.hp+=extra;r.hpBonus=(r.hpBonus??0)+extra;}
  r.benchUsed=true;
  for(const other of r.blocks)if(other.type==='bench')other.hp=0;
  emit(r,{type:'bonus',x:b.x*TILE+16,y:b.y*TILE+16,kind:'bench',value:next?1:50});return;
 }
 if(b.type==='drill'){
  const count=r.mode==='endless'?depthBonusStats(b.y).drill:10;
  emit(r,{type:'bonus',x:b.x*TILE+16,y:b.y*TILE+16,kind:b.type,value:count});
  cascade.drills.push({count});if(cascade.processing)return;
  cascade.processing=true;
  while(cascade.drills.length){
   const {count:limit}=cascade.drills.shift()!;
   // Follow the column directly under the pick. Empty cells (including the
   // drill just collected) do not spend the number of blocks it can break.
   const firstRow=Math.floor(r.y/TILE)+1,column=Math.max(0,Math.min(COLS-1,Math.floor(r.x/TILE)));
   const targets=r.blocks.filter(other=>other.hp>0&&other.y>=firstRow&&other.type!=='bedrock'
     &&other.x===column)
    .sort((a,b)=>a.y-b.y).slice(0,limit);
   for(const target of targets){
    if(target.type==='tnt')lightTnt(r,target);
    else collectBlock(r,target,true,cascade);
   }
  }
  cascade.processing=false;
  return;
 }
 if(b.type==='relic'){
  r.relics=(r.relics??0)+1;
  emit(r,{type:'bonus',x:b.x*TILE+16,y:b.y*TILE+16,kind:b.type,value:1});return;
 }
 if(b.type==='sweep'){
  emit(r,{type:'bonus',x:b.x*TILE+16,y:b.y*TILE+16,kind:b.type});
  for(const c of r.blocks){if(c.hp<=0||c.y!==b.y||BLOCKS[c.type].blastproof)continue;
   if(c.type==='tnt')lightTnt(r,c);
   else collectBlock(r,c,PICKS[r.pick].tier>=BLOCKS[c.type].tier,cascade);
  }return;
 }
 const base=drop?BLOCKS[b.type].ore:0,mult=base>0&&r.doubleLeft>0?2:1,value=base*mult;
 if(base>0&&r.doubleLeft>0)r.doubleLeft--;
 r.ore+=value;emit(r,{type:'break',x:b.x*TILE+16,y:b.y*TILE+16,kind:b.type,value});
}
// Damage a block; ore is lost when it is broken by a pick below the block's tier.
function damage(r:Run,b:Block,amount:number,drop:boolean):boolean {
 if(b.hp<=0||amount<=0)return false;b.hp=Math.max(0,b.hp-amount);
 if(b.hp>0)return false;b.hp=1;collectBlock(r,b,drop);return true;
}
export function pickDamage(pick:Pick,type:BlockType):number {
 const p=PICKS[pick],soft=type==='dirt'||type==='stone'?p.soft:1;
 const b=BLOCKS[type];
 return p.tier>=b.tier?p.damage*soft:b.chip?p.damage*soft*UNDERTIER:0;
}
function lightTnt(r:Run,b:Block){
 if(r.fuses.some(f=>f.x===b.x&&f.y===b.y)||r.fuses.length>=40)return;
 r.fuses.push({x:b.x,y:b.y,t:r.time+FUSE_DELAY});
 emit(r,{type:'fuse',x:b.x*TILE+16,y:b.y*TILE+16});
}
// One TNT goes off: neighbours take blast damage, adjacent TNT is lit with a short fuse instead of exploding at once.
export function blast(r:Run,x:number,y:number){
 emit(r,{type:'blast',x,y});
 for(const b of r.blocks){
  const bx=b.x*TILE+16,by=b.y*TILE+16;
  if(b.hp<=0||Math.hypot(bx-x,by-y)>BLAST_RADIUS)continue;
  if(BLOCKS[b.type].blastproof)continue;
  if(b.type!=='tnt'){damage(r,b,BLAST_DAMAGE,true);continue;}
  if(bx===x&&by===y)b.hp=0;
  else lightTnt(r,b);
 }
 const dx=r.x-x,dy=r.y-y,d=Math.hypot(dx,dy);
 if((r.phaseTime??0)<=0&&(r.magnetTime??0)<=0&&d<110){const push=1-d/110;r.vx=Math.max(-195,Math.min(195,r.vx+dx/(d||1)*110*push));r.vy=Math.max(-180,Math.min(220,r.vy+dy/(d||1)*80*push));}
}
function hit(r:Run,b:Block,wear=1){
 const key=b.x+':'+b.y;if(r.time-(r.contacts[key]??-10)<.19)return;
 r.contacts[key]=r.time;r.lastHit=r.time;r.hits++;
 const weak=PICKS[r.pick].tier<BLOCKS[b.type].tier&&(r.oneHitTime??0)<=0;
 emit(r,{type:'hit',x:b.x*TILE+16,y:b.y*TILE+16,kind:b.type,weak});
 if(b.type==='tnt'){blast(r,b.x*TILE+16,b.y*TILE+16);return;}
 // Upgraded picks lose less durability to common terrain; ore keeps its own wear.
 const terrainScale=r.pick==='wood'?1:.5;
 const terrainWear=b.type==='dirt'?terrainScale:b.type==='stone'?2*terrainScale:undefined;
 const shielded=(r.shieldTime??0)>0||(r.helmetGraceTime??0)>0||(r.skillFireTime??0)>0;
 if((r.oneHitTime??0)>0||(r.skillDrillTime??0)>0){const wearScale=r.mode==='endless'?.55+Math.min(.25,Math.floor(r.y/(32*TILE))*.006):1;if(!shielded)applyWear(r,terrainWear??BLOCKS[b.type].wear*wear*.3*wearScale);damage(r,b,b.hp+1,true);return;}
 // A pick too weak for the block glances off: little damage either way.
 const wearScale=r.mode==='endless'?.55+Math.min(.25,Math.floor(r.y/(32*TILE))*.006):1;
 if(!shielded)applyWear(r,terrainWear??BLOCKS[b.type].wear*wear*(weak?.5:1)*wearScale);
 if(damage(r,b,pickDamage(r.pick,b.type),!weak)&&!weak&&(r.chainActive||r.enchant==='chain')&&BLOCKS[b.type].ore>0){
  const q=[b];let count=0;while(q.length&&count++<20){const base=q.shift()!;for(const c of r.blocks){if(c.hp>0&&c.type===b.type&&Math.abs(c.x-base.x)+Math.abs(c.y-base.y)===1){collectBlock(r,c);q.push(c);}}}
 }
 if(r.enchant==='wave'&&r.hits%8===0){
  emit(r,{type:'nudge',x:r.x,y:r.y});
  for(const c of r.blocks){if(c!==b&&c.hp>0&&Math.hypot(c.x-b.x,c.y-b.y)<1.8&&c.type!=='tnt')damage(r,c,pickDamage(r.pick,c.type),PICKS[r.pick].tier>=BLOCKS[c.type].tier);}
 }
}
// Each run snapshots the equipped ability and its available charges.
export function activateSkill(r:Run):boolean {
 if(r.status!=='playing'||!r.skillAura||!(r.skillCharges&&r.skillCharges>0))return false;
 const stats=skillStats(r.skillAura,r.skillLevel??1);
 // Count the whole block, not only its centre: touching the field is enough.
 const targets=r.skillAura==='lightning'?r.blocks.filter(b=>{
  if(b.hp<=0||BLOCKS[b.type].ore<=0)return false;
  const x=Math.max(b.x*TILE,Math.min(r.x,(b.x+1)*TILE)),y=Math.max(b.y*TILE,Math.min(r.y,(b.y+1)*TILE));
  return Math.hypot(x-r.x,y-r.y)<=stats.radius*TILE;
 }):[];
 if(r.skillAura==='lightning'&&!targets.length)return false;
 r.skillCharges--;
 if(r.skillAura==='fire')r.skillFireTime=Math.max(r.skillFireTime??0,stats.duration);
 else if(r.skillAura==='ghost'){r.phaseTime=Math.max(r.phaseTime??0,stats.duration);r.skillGhostTime=Math.max(r.skillGhostTime??0,stats.duration);}
 else if(r.skillAura==='enchanted'){r.skillDrillTime=Math.max(r.skillDrillTime??0,stats.duration);r.vy=Math.max(r.vy,350*stats.speed);r.spin=15;}
 else if(r.skillAura==='lightning'){
  emit(r,{type:'skill',x:r.x,y:r.y,value:stats.radius*TILE});
  for(const b of targets)collectBlock(r,b,true);
 }
 return true;
}
// Shared resurrection event: future ad revives can use the same audiovisual feedback.
export function reviveRun(r:Run,amount:number,source:'helmet'|'ad'):boolean {
 if(r.hp>0||!Number.isFinite(amount)||amount<=0)return false;
 r.hp=Math.min(maxDurability(r),amount);r.status='playing';r.helmetGraceTime=.25;
 emit(r,{type:'revive',x:r.x,y:r.y,kind:source==='helmet'?'helmet':undefined,value:r.hp});return true;
}
function rescueHelmet(r:Run):boolean {
 if(!r.helmetReady||r.hp>0)return false;
 r.helmetReady=false;reviveRun(r,Math.ceil(PICKS[r.pick].hp*.25),'helmet');
 emit(r,{type:'bonus',x:r.x,y:r.y,kind:'helmet',value:-1});return true;
}
function applyWear(r:Run,amount:number){
 if(amount<=0||(r.helmetGraceTime??0)>0)return;
 r.hp=Math.max(0,r.hp-amount);if(r.hp<=0)rescueHelmet(r);
}
export function stepRun(r:Run,dt:number){
 if(r.status==='ready')r.status='playing';
 if(r.status!=='playing')return;
 if(r.hp<=0&&!rescueHelmet(r)){r.status='lost';return;}
 dt=Math.min(Math.max(dt,0),1/60);r.time+=dt;r.skillFireTime=Math.max(0,(r.skillFireTime??0)-dt);r.skillDrillTime=Math.max(0,(r.skillDrillTime??0)-dt);r.skillGhostTime=Math.max(0,(r.skillGhostTime??0)-dt);r.oneHitTime=Math.max(0,(r.oneHitTime??0)-dt);r.phaseTime=Math.max(0,(r.phaseTime??0)-dt);r.magnetTime=Math.max(0,(r.magnetTime??0)-dt);r.shieldTime=Math.max(0,(r.shieldTime??0)-dt);r.helmetGraceTime=Math.max(0,(r.helmetGraceTime??0)-dt);
 for(const f of r.fuses.filter(f=>f.t<=r.time)){
  r.fuses.splice(r.fuses.indexOf(f),1);const b=r.blocks.find(b=>b.x===f.x&&b.y===f.y&&b.type==='tnt'&&b.hp>0);
  if(b)blast(r,b.x*TILE+16,b.y*TILE+16);
 }
 const phased=r.phaseTime>0,drilling=(r.skillDrillTime??0)>0&&!phased,magnetized=r.magnetTime>0&&!phased&&!drilling;
 const drillSpeed=drilling?skillStats('enchanted',r.skillLevel??1).speed:1,phaseSpeed=phased&&(r.skillGhostTime??0)>0?skillStats('ghost',r.skillLevel??1).speed:1;
 if(drilling){r.vy=Math.max(350*drillSpeed,r.vy);r.spin=15;}
 r.vy=Math.min(phased?440*phaseSpeed:drilling?380*drillSpeed:230,r.vy+(phased?900:330)*dt);r.vx*=Math.exp(-.12*dt);
 if(magnetized){
  let target:Block|undefined,nearest=Infinity;
  for(const b of r.blocks){if(b.hp<=0||b.type==='bedrock')continue;const dx=b.x*TILE+16-r.x,dy=b.y*TILE+16-r.y,d2=dx*dx+dy*dy;if(d2<nearest){nearest=d2;target=b;}}
  if(target){const dx=target.x*TILE+16-r.x,dy=target.y*TILE+16-r.y,d=Math.hypot(dx,dy)||1,desiredX=dx/d*90,steer=Math.min(1,8*dt);r.vx+=(desiredX-r.vx)*steer;r.vy=Math.min(230,r.vy+dy/d*160*dt);}
 }
 r.x+=r.vx*dt;r.y+=r.vy*dt;r.angle+=r.spin*dt;
 if(r.y<PICK_PARTS[0].r){r.y=PICK_PARTS[0].r;r.vy=Math.abs(r.vy);}
 const a=r.angle-Math.PI/4,cos=Math.cos(a),sin=Math.sin(a);
 for(const part of PICK_PARTS){
  const ox=part.x*cos-part.y*sin,oy=part.x*sin+part.y*cos,body=part===PICK_PARTS[0];
  if(r.x+ox<part.r){r.x=part.r-ox;r.vx=Math.abs(r.vx)*.8+20;r.spin=4;}
  if(r.x+ox>WIDTH-part.r){r.x=WIDTH-part.r-ox;r.vx=-Math.abs(r.vx)*.8-20;r.spin=-4;}
  for(const b of r.blocks){
   if(phased)break;
   const cx=r.x+ox,cy=r.y+oy;
   if(b.hp<=0||Math.abs(b.y*TILE+16-cy)>17+part.r||Math.abs(b.x*TILE+16-cx)>17+part.r)continue;
   const nx=Math.max(b.x*TILE,Math.min(cx,(b.x+1)*TILE)),ny=Math.max(b.y*TILE,Math.min(cy,(b.y+1)*TILE));
   let dx=cx-nx,dy=cy-ny,d=Math.hypot(dx,dy);if(d>=part.r)continue;
   if(drilling&&b.type!=='bedrock'){hit(r,b,part.wear);continue;}
   if(d===0){dx=0;dy=-1;d=1;}
   const ux=dx/d,uy=dy/d;r.x+=ux*(part.r-d);r.y+=uy*(part.r-d);
   const v=r.vx*ux+r.vy*uy;
   if(v<0&&!magnetized){r.vx-=1.55*v*ux;r.vy-=1.55*v*uy;
    // An off-centre strike twists the pick around its body.
    if(!body)r.spin=Math.max(-8,Math.min(8,r.spin+(ox*uy-oy*ux)/Math.hypot(ox,oy)*1.4));}
   if(body&&uy<-.4&&!magnetized){r.vy=Math.min(r.vy,-90);r.vx+=Math.sin(r.angle*1.3)*48;r.spin=(r.vx>=0?1:-1)*(3.3+Math.abs(r.vx)/65);}
   r.vx=Math.max(-195,Math.min(195,r.vx));hit(r,b,part.wear);
  }
 }
 // Escape geometrical stalls without consuming a player's nudge.
 if(r.time-r.lastHit>3&&Math.abs(r.vx)+Math.abs(r.vy)<20){r.vx=65*Math.sin(r.time);r.vy=70;}
 r.hp=Math.max(0,r.hp);
 if(r.hp<=0&&!rescueHelmet(r))r.status='lost';else if(r.mode==='endless'){
  const preloadRows=96;
  while(r.y>(r.rows-preloadRows)*TILE){const oldRows=r.rows;extendEndlessMine(r);if(r.rows===oldRows)break;}
 }
}
