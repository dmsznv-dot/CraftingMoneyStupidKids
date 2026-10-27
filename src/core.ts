export type Pick = 'wood'|'stone'|'iron'|'gold'|'diamond'|'obsidian'|'netherite';
export type Enchant = 'none'|'wave'|'chain';
export type BlockType = 'dirt'|'stone'|'hard'|'gold'|'gem'|'tnt'|'obsidian'|'bedrock'|'coal'|'copper'|'iron'|'emerald'|'double'|'sweep';
export const TILE=32, COLS=14, WIDTH=COLS*TILE;
// tier gates which blocks a pick mines properly; soft multiplies damage to dirt and stone.
export const PICKS:Record<Pick,{nudges:number;hp:number;damage:number;tier:number;soft:number;price:number;color:number}>= {
 wood:{nudges:0,hp:100,damage:1,tier:0,soft:1,price:0,color:0xba8959},
 stone:{nudges:1,hp:130,damage:1.6,tier:1,soft:1,price:40,color:0xabb7b9},
 iron:{nudges:2,hp:170,damage:2.2,tier:2,soft:1,price:200,color:0xcfe4de},
 gold:{nudges:3,hp:145,damage:2.6,tier:2,soft:1.5,price:650,color:0xf4cb64},
 diamond:{nudges:4,hp:230,damage:3.2,tier:3,soft:1,price:1600,color:0x6ce5ca},
 obsidian:{nudges:4,hp:310,damage:4.4,tier:4,soft:1,price:3400,color:0x9e7bbe},
 netherite:{nudges:4,hp:400,damage:5.8,tier:5,soft:1.15,price:6500,color:0x85777d},
};
// hp: blows to break; tier: weakest pick that mines it properly; wear: pick durability per blow; ore: nuggets when mined.
// A pick below the tier only chips the block (UNDERTIER damage, if chip) and the broken ore crumbles to nothing.
// Obsidian yields to a diamond pick only; bedrock never breaks. Neither is touched by TNT.
export const BLOCKS:Record<BlockType,{hp:number;tier:number;wear:number;ore:number;chip:boolean;blastproof:boolean}>= {
 coal:{hp:1,tier:0,wear:.4,ore:1,chip:true,blastproof:false},
 copper:{hp:1.5,tier:0,wear:.45,ore:2,chip:true,blastproof:false},
 iron:{hp:2.5,tier:1,wear:.6,ore:4,chip:true,blastproof:false},
 emerald:{hp:5,tier:3,wear:.8,ore:16,chip:true,blastproof:false},
 double:{hp:1,tier:0,wear:0,ore:0,chip:true,blastproof:false},
 sweep:{hp:1,tier:0,wear:0,ore:0,chip:true,blastproof:false},
 dirt:{hp:1,tier:0,wear:.55,ore:0,chip:true,blastproof:false},
 stone:{hp:2.5,tier:0,wear:.8,ore:0,chip:true,blastproof:false},
 gold:{hp:3,tier:1,wear:.65,ore:7,chip:true,blastproof:false},
 gem:{hp:4,tier:2,wear:.75,ore:11,chip:true,blastproof:false},
 hard:{hp:5,tier:2,wear:1.1,ore:0,chip:true,blastproof:false},
 tnt:{hp:1,tier:0,wear:0,ore:0,chip:true,blastproof:false},
 obsidian:{hp:6,tier:3,wear:.9,ore:0,chip:false,blastproof:true},
 bedrock:{hp:1,tier:99,wear:.5,ore:0,chip:false,blastproof:true},
};
// Deeper mines bring new rock: obsidian from mine 6, bedrock from mine 11 (zero-based level indices).
export const OBSIDIAN_FROM=18,BEDROCK_FROM=32;
export const UNDERTIER=.35,BLAST_RADIUS=50,BLAST_DAMAGE=4,FUSE_DELAY=.3;
// Collider in the sprite's own frame (the texture is drawn turned by -45°): body, two head tips, handle end.
// Head tips are the working edge: they wear the pick less than a blow with the body or handle.
export const PICK_PARTS=[{x:0,y:0,r:11,wear:1},{x:-21,y:-13,r:5,wear:.65},{x:21,y:-13,r:5,wear:.65},{x:0,y:25,r:4,wear:1}];
export interface Block {x:number;y:number;type:BlockType;hp:number}
export interface RunEvent {type:'hit'|'break'|'blast'|'nudge'|'fuse'|'bonus';x:number;y:number;kind?:BlockType;value?:number;weak?:boolean}
export interface Run {
 version:1;id:string;level:number;pick:Pick;enchant:Enchant;rows:number;blocks:Block[];
 x:number;y:number;vx:number;vy:number;angle:number;spin:number;hp:number;nudges:number;
 ore:number;doubleLeft:number;time:number;lastNudge:number;lastHit:number;hits:number;status:'ready'|'playing'|'won'|'lost';
 starter:boolean;starterPlaced:boolean;events:RunEvent[];contacts:Record<string,number>;
 fuses:{x:number;y:number;t:number}[];
}
// Fixed seed recipes: five chapters of nine, more depth without endless dense walls.
const NAMES=['first','veins','fuse','bend','deep','echo','amber','fault','crystal','chain','core','heart'];
export const LEVELS=Array.from({length:45},(_,i)=>({
 name:NAMES[i%NAMES.length],chapter:Math.floor(i/9),rows:12+Math.floor(i*1.5),seed:41+i*137,
 route:Array.from({length:24},(_,k)=>6+((Math.floor(k/2)+i)%3===0?1:0)),
 density:.1+i*.004,air:.45-i*.004,
}));
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
export function createRun(level:number,pick:Pick,enchant:Enchant='none',starter=false):Run {
 const li=Math.max(0,Math.min(LEVELS.length-1,Math.floor(Number.isFinite(level)?level:0))),l=LEVELS[li],rand=random(l.seed),blocks:Block[]=[];
 for(let y=4;y<l.rows;y++){
  const segment=Math.floor((y-4)/4),route=l.route[segment%l.route.length];
  for(let x=0;x<COLS;x++){
   const near=Math.abs(x-route)<=1;
   let type:BlockType='stone';
   if(near){
    if(y%5!==0)continue;
    type=y%10===5?'coal':'copper';
   }else{
    if(rand()<l.air)continue;
    const r=rand();
    if(y<7)type=r<.3?'coal':'dirt';
    else if(r<.12)type='coal';
    else if(r<.24)type='copper';
    else if(r<.36&&li>=4)type='iron';
    else if(r<.46&&li>=9)type='gold';
    else if(r<.53&&li>=18)type='gem';
    else if(r<.57&&li>=29)type='emerald';
    else if(r<.61&&li>=2)type='tnt';
    else if(r>.86&&li>=7)type='hard';
    else type=li<3?'dirt':'stone';
    const clear=[segment-1,segment,segment+1].every(k=>Math.abs(x-l.route[((k%l.route.length)+l.route.length)%l.route.length])>2);
    if(clear&&li>=OBSIDIAN_FROM&&type==='hard'&&rand()<.4)type='obsidian';
    if(clear&&li>=BEDROCK_FROM&&y>l.rows/2&&rand()<.08)type='bedrock';
   }
   blocks.push({x,y,type,hp:BLOCKS[type].hp});
  }
 }
 const put=(x:number,y:number,type:BlockType)=>{if(y>=l.rows)return;const old=blocks.find(b=>b.x===x&&b.y===y);if(old){old.type=type;old.hp=BLOCKS[type].hp;}else blocks.push({x,y,type,hp:BLOCKS[type].hp});};
 // Guaranteed early income in the drop path, rather than decorative inaccessible gold.
 for(const x of [5,6,7,8]){put(x,5,'coal');put(x,10,'copper');}
 for(const [x,y] of FUSE)if(li>=2)put(x,y,'tnt');
 if(li>=3)put(l.route[1],8,'double');
 if(li>=8)put(l.route[3],16,'sweep');
 if(li>=20)put(l.route[7],32,li%2?'double':'sweep');
 return {version:1,id:crypto.randomUUID(),level:li,pick,enchant,rows:l.rows,blocks,x:224,y:64,vx:18,vy:0,angle:-.5,spin:3.8,
  hp:PICKS[pick].hp,nudges:PICKS[pick].nudges,ore:0,doubleLeft:0,time:0,lastNudge:-10,lastHit:-10,hits:0,status:'ready',starter,starterPlaced:false,events:[],contacts:{},fuses:[]};
}
export function nudge(r:Run,dir:number):boolean {
 if(r.status==='ready')r.status='playing';
 if(r.status!=='playing'||r.nudges<=0||r.time-r.lastNudge<.25||![-1,1].includes(dir))return false;
 r.nudges--;r.lastNudge=r.time;r.vx=Math.max(-195,Math.min(195,r.vx+dir*145));r.spin+=dir*1.1;
 r.events.push({type:'nudge',x:r.x,y:r.y});return true;
}
export function placeStarter(r:Run,column:number):boolean {
 if(r.status!=='ready'||!r.starter||r.starterPlaced||!Number.isInteger(column)||column<0||column>=COLS)return false;
 r.blocks.push({x:column,y:3,type:'tnt',hp:BLOCKS.tnt.hp});r.starterPlaced=true;return true;
}
// One shared collection path for pick, enchantment, TNT and bonus cascades.
export function collectBlock(r:Run,b:Block,drop=true){
 if(b.hp<=0)return;b.hp=0;
 if(b.type==='double'){
  r.doubleLeft=5;r.events.push({type:'break',x:b.x*TILE+16,y:b.y*TILE+16,kind:b.type,value:0});
  r.events.push({type:'bonus',x:b.x*TILE+16,y:b.y*TILE+16,kind:b.type});return;
 }
 if(b.type==='sweep'){
  r.events.push({type:'bonus',x:b.x*TILE+16,y:b.y*TILE+16,kind:b.type});
  for(const c of r.blocks){if(c.hp<=0||c.y!==b.y||BLOCKS[c.type].blastproof)continue;
   if(c.type==='tnt')lightTnt(r,c);
   else collectBlock(r,c,PICKS[r.pick].tier>=BLOCKS[c.type].tier);
  }return;
 }
 const base=drop?BLOCKS[b.type].ore:0,mult=base>0&&r.doubleLeft>0?2:1,value=base*mult;
 if(base>0&&r.doubleLeft>0)r.doubleLeft--;
 r.ore+=value;r.events.push({type:'break',x:b.x*TILE+16,y:b.y*TILE+16,kind:b.type,value});
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
 r.events.push({type:'fuse',x:b.x*TILE+16,y:b.y*TILE+16});
}
// One TNT goes off: neighbours take blast damage, adjacent TNT is lit with a short fuse instead of exploding at once.
export function blast(r:Run,x:number,y:number){
 r.events.push({type:'blast',x,y});
 for(const b of r.blocks){
  const bx=b.x*TILE+16,by=b.y*TILE+16;
  if(b.hp<=0||Math.hypot(bx-x,by-y)>BLAST_RADIUS)continue;
  if(BLOCKS[b.type].blastproof)continue;
  if(b.type!=='tnt'){damage(r,b,BLAST_DAMAGE,true);continue;}
  if(bx===x&&by===y)b.hp=0;
  else lightTnt(r,b);
 }
 const dx=r.x-x,dy=r.y-y,d=Math.hypot(dx,dy);
 if(d<110){const push=1-d/110;r.vx=Math.max(-195,Math.min(195,r.vx+dx/(d||1)*110*push));r.vy=Math.max(-180,Math.min(220,r.vy+dy/(d||1)*80*push));}
}
function hit(r:Run,b:Block,wear=1){
 const key=b.x+':'+b.y;if(r.time-(r.contacts[key]??-10)<.19)return;
 r.contacts[key]=r.time;r.lastHit=r.time;r.hits++;
 const weak=PICKS[r.pick].tier<BLOCKS[b.type].tier;
 r.events.push({type:'hit',x:b.x*TILE+16,y:b.y*TILE+16,kind:b.type,weak});
 if(b.type==='tnt'){blast(r,b.x*TILE+16,b.y*TILE+16);return;}
 // A pick too weak for the block glances off: little damage either way.
 r.hp-=BLOCKS[b.type].wear*wear*(weak?.5:1);
 if(damage(r,b,pickDamage(r.pick,b.type),!weak)&&!weak&&r.enchant==='chain'&&BLOCKS[b.type].ore>0){
  const q=[b];let count=0;while(q.length&&count++<20){const base=q.shift()!;for(const c of r.blocks){if(c.hp>0&&c.type===b.type&&Math.abs(c.x-base.x)+Math.abs(c.y-base.y)===1){collectBlock(r,c);q.push(c);}}}
 }
 if(r.enchant==='wave'&&r.hits%8===0){
  r.events.push({type:'nudge',x:r.x,y:r.y});
  for(const c of r.blocks){if(c!==b&&c.hp>0&&Math.hypot(c.x-b.x,c.y-b.y)<1.8&&c.type!=='tnt')damage(r,c,pickDamage(r.pick,c.type),PICKS[r.pick].tier>=BLOCKS[c.type].tier);}
 }
}
export function stepRun(r:Run,dt:number){
 if(r.status==='ready')r.status='playing';
 if(r.status!=='playing')return;
 if(r.hp<=0){r.status='lost';return;}
 dt=Math.min(Math.max(dt,0),1/60);r.time+=dt;
 for(const f of r.fuses.filter(f=>f.t<=r.time)){
  r.fuses.splice(r.fuses.indexOf(f),1);const b=r.blocks.find(b=>b.x===f.x&&b.y===f.y&&b.type==='tnt'&&b.hp>0);
  if(b)blast(r,b.x*TILE+16,b.y*TILE+16);
 }
 r.vy=Math.min(230,r.vy+330*dt);r.vx*=Math.exp(-.12*dt);
 r.x+=r.vx*dt;r.y+=r.vy*dt;r.angle+=r.spin*dt;
 if(r.y<PICK_PARTS[0].r){r.y=PICK_PARTS[0].r;r.vy=Math.abs(r.vy);}
 const a=r.angle-Math.PI/4,cos=Math.cos(a),sin=Math.sin(a);
 for(const part of PICK_PARTS){
  const ox=part.x*cos-part.y*sin,oy=part.x*sin+part.y*cos,body=part===PICK_PARTS[0];
  if(r.x+ox<part.r){r.x=part.r-ox;r.vx=Math.abs(r.vx)*.8+20;r.spin=4;}
  if(r.x+ox>WIDTH-part.r){r.x=WIDTH-part.r-ox;r.vx=-Math.abs(r.vx)*.8-20;r.spin=-4;}
  for(const b of r.blocks){
   const cx=r.x+ox,cy=r.y+oy;
   if(b.hp<=0||Math.abs(b.y*TILE+16-cy)>17+part.r||Math.abs(b.x*TILE+16-cx)>17+part.r)continue;
   const nx=Math.max(b.x*TILE,Math.min(cx,(b.x+1)*TILE)),ny=Math.max(b.y*TILE,Math.min(cy,(b.y+1)*TILE));
   let dx=cx-nx,dy=cy-ny,d=Math.hypot(dx,dy);if(d>=part.r)continue;
   if(d===0){dx=0;dy=-1;d=1;}
   const ux=dx/d,uy=dy/d;r.x+=ux*(part.r-d);r.y+=uy*(part.r-d);
   const v=r.vx*ux+r.vy*uy;
   if(v<0){r.vx-=1.55*v*ux;r.vy-=1.55*v*uy;
    // An off-centre strike twists the pick around its body.
    if(!body)r.spin=Math.max(-8,Math.min(8,r.spin+(ox*uy-oy*ux)/Math.hypot(ox,oy)*1.4));}
   if(body&&uy<-.4){r.vy=Math.min(r.vy,-90);r.vx+=Math.sin(r.angle*1.3)*48;r.spin=(r.vx>=0?1:-1)*(3.3+Math.abs(r.vx)/65);}
   r.vx=Math.max(-195,Math.min(195,r.vx));hit(r,b,part.wear);
  }
 }
 // Escape geometrical stalls without consuming a player's nudge.
 if(r.time-r.lastHit>3&&Math.abs(r.vx)+Math.abs(r.vy)<20){r.vx=65*Math.sin(r.time);r.vy=70;}
 r.hp=Math.max(0,r.hp);
 if(r.hp<=0)r.status='lost';else if(r.y>r.rows*TILE+34)r.status='won';
}
