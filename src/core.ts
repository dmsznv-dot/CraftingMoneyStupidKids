export type Pick = 'wood'|'stone'|'iron'|'gold'|'diamond';
export type Enchant = 'none'|'wave'|'chain';
export type BlockType = 'dirt'|'stone'|'hard'|'gold'|'gem'|'tnt';
export const TILE=32, COLS=14, WIDTH=COLS*TILE;
export const PICKS:Record<Pick,{nudges:number;hp:number;damage:number;price:number;color:number}>= {
 wood:{nudges:0,hp:100,damage:1,price:0,color:0xba8959},
 stone:{nudges:1,hp:130,damage:1.5,price:100,color:0xabb7b9},
 iron:{nudges:2,hp:170,damage:2.2,price:320,color:0xcfe4de},
 gold:{nudges:3,hp:145,damage:2.8,price:650,color:0xf4cb64},
 diamond:{nudges:4,hp:230,damage:3,price:1100,color:0x6ce5ca},
};
export interface Block {x:number;y:number;type:BlockType;hp:number}
export interface RunEvent {type:'hit'|'break'|'blast'|'nudge';x:number;y:number;kind?:BlockType;value?:number}
export interface Run {
 version:1;id:string;level:number;pick:Pick;enchant:Enchant;rows:number;blocks:Block[];
 x:number;y:number;vx:number;vy:number;angle:number;spin:number;hp:number;nudges:number;
 ore:number;time:number;lastNudge:number;lastHit:number;hits:number;status:'ready'|'playing'|'won'|'lost';
 starter:boolean;starterPlaced:boolean;events:RunEvent[];contacts:Record<string,number>;
}
export const LEVELS=[
 {name:'first',rows:30,seed:41,route:[6,6,7,7,6,5,5,6],density:.12},
 {name:'veins',rows:34,seed:72,route:[6,7,8,7,6,5,6,7],density:.16},
 {name:'fuse',rows:36,seed:128,route:[7,6,5,6,8,7,6,5],density:.18},
 {name:'bend',rows:38,seed:244,route:[5,7,8,6,5,6,8,7],density:.2},
 {name:'deep',rows:40,seed:351,route:[8,7,5,6,8,7,6,5],density:.22},
 {name:'echo',rows:42,seed:460,route:[6,5,7,8,6,5,7,6],density:.22},
 {name:'amber',rows:42,seed:513,route:[7,8,6,5,7,8,6,5],density:.24},
 {name:'fault',rows:44,seed:642,route:[5,6,8,7,5,6,8,7],density:.25},
 {name:'crystal',rows:44,seed:754,route:[8,6,5,7,8,6,5,7],density:.26},
 {name:'chain',rows:46,seed:889,route:[6,8,7,5,6,8,7,5],density:.27},
 {name:'core',rows:46,seed:924,route:[7,5,6,8,7,5,6,8],density:.28},
 {name:'heart',rows:48,seed:1071,route:[6,7,8,6,5,7,8,6],density:.28},
];
function random(seed:number){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function createRun(level:number,pick:Pick,enchant:Enchant='none',starter=false):Run {
 const l=LEVELS[Math.max(0,Math.min(11,level))],rand=random(l.seed),blocks:Block[]=[];
 for(let y=4;y<l.rows;y++){
  const route=l.route[Math.floor((y-4)/4)%l.route.length];
  for(let x=0;x<COLS;x++){
   const r=rand();let type:BlockType='stone';
   const near=Math.abs(x-route)<=1;
   if(near){if(y%4===0||y%4===1)continue;type='dirt';}
   else if(y<8)type='dirt';
   else if(r<.045)type='tnt';
   else if(r<.2)type='gold';
   else if(r<.25&&y>12)type='gem';
   else if(r<.25+l.density)type='hard';
   if(!near&&y>l.rows-5&&x>3&&x<11)type=(x+y)%3===0?'gem':'gold';
   blocks.push({x,y,type,hp:type==='hard'?3:type==='stone'?2:1});
  }
 }
 // A visible, intentional fuse to discover, away from the easiest route.
 for(const [x,y] of [[10,9],[10,11],[9,13]]){
  const b=blocks.find(b=>b.x===x&&b.y===y);if(b){b.type='tnt';b.hp=1;}
 }
 return {version:1,id:crypto.randomUUID(),level,pick,enchant,rows:l.rows,blocks,x:224,y:64,vx:18,vy:0,angle:-.5,spin:3.8,
  hp:PICKS[pick].hp,nudges:PICKS[pick].nudges,ore:0,time:0,lastNudge:-10,lastHit:-10,hits:0,status:'ready',starter,starterPlaced:false,events:[],contacts:{}};
}
export function nudge(r:Run,dir:number):boolean {
 if(r.status==='ready')r.status='playing';
 if(r.status!=='playing'||r.nudges<=0||r.time-r.lastNudge<.25||![-1,1].includes(dir))return false;
 r.nudges--;r.lastNudge=r.time;r.vx=Math.max(-195,Math.min(195,r.vx+dir*145));r.spin+=dir*1.1;
 r.events.push({type:'nudge',x:r.x,y:r.y});return true;
}
export function placeStarter(r:Run,column:number):boolean {
 if(r.status!=='ready'||!r.starter||r.starterPlaced||!Number.isInteger(column)||column<0||column>=COLS)return false;
 r.blocks.push({x:column,y:3,type:'tnt',hp:1});r.starterPlaced=true;return true;
}
function destroy(r:Run,b:Block){
 if(b.hp<=0)return;b.hp=0;
 const value=b.type==='gold'?3:b.type==='gem'?8:0;r.ore+=value;
 r.events.push({type:'break',x:b.x*TILE+16,y:b.y*TILE+16,kind:b.type,value});
}
export function blast(r:Run,x:number,y:number){
 const queue=[{x,y}],visited=new Set<string>();
 while(queue.length&&visited.size<100){
  const pos=queue.shift()!,key=pos.x+':'+pos.y;if(visited.has(key))continue;visited.add(key);
  r.events.push({type:'blast',x:pos.x,y:pos.y});
  for(const b of r.blocks){
   if(b.hp<=0||Math.hypot(b.x*TILE+16-pos.x,b.y*TILE+16-pos.y)>91)continue;
   if(b.type==='tnt'){const k=(b.x*TILE+16)+':'+(b.y*TILE+16);if(!visited.has(k))queue.push({x:b.x*TILE+16,y:b.y*TILE+16});}
   destroy(r,b);
  }
  const dx=r.x-pos.x,dy=r.y-pos.y,d=Math.hypot(dx,dy);
  if(d<130){r.vx=Math.max(-195,Math.min(195,r.vx+dx/(d||1)*100));r.vy=Math.max(-180,Math.min(220,r.vy+dy/(d||1)*70));}
 }
}
function hit(r:Run,b:Block){
 const key=b.x+':'+b.y;if(r.time-(r.contacts[key]??-10)<.19)return;
 r.contacts[key]=r.time;r.lastHit=r.time;r.hits++;
 r.events.push({type:'hit',x:b.x*TILE+16,y:b.y*TILE+16,kind:b.type});
 if(b.type==='tnt'){blast(r,b.x*TILE+16,b.y*TILE+16);return;}
 r.hp-=b.type==='hard'?1.7:b.type==='stone'?1.1:.6;
 const damage=PICKS[r.pick].damage*(r.pick==='gold'&&b.type==='dirt'?2:1);
 b.hp-=damage;
 if(b.hp<=0){b.hp=1;destroy(r,b);
  if(r.enchant==='chain'&&(b.type==='gold'||b.type==='gem')){
   const q=[b];let count=0;while(q.length&&count++<20){const base=q.shift()!;for(const c of r.blocks){if(c.hp>0&&c.type===b.type&&Math.abs(c.x-base.x)+Math.abs(c.y-base.y)===1){destroy(r,c);q.push(c);}}}
  }
 }
 if(r.enchant==='wave'&&r.hits%8===0){
  r.events.push({type:'nudge',x:r.x,y:r.y});for(const c of r.blocks){if(c.hp>0&&Math.hypot(c.x-b.x,c.y-b.y)<1.8&&c.type!=='tnt')destroy(r,c);}
 }
}
export function stepRun(r:Run,dt:number){
 if(r.status==='ready')r.status='playing';
 if(r.status!=='playing')return;
 if(r.hp<=0){r.status='lost';return;}
 dt=Math.min(Math.max(dt,0),1/60);r.time+=dt;
 r.vy=Math.min(230,r.vy+330*dt);r.vx*=Math.exp(-.12*dt);
 r.x+=r.vx*dt;r.y+=r.vy*dt;r.angle+=r.spin*dt;
 const radius=12;
 if(r.x<radius){r.x=radius;r.vx=Math.abs(r.vx)*.8+20;r.spin=4;}
 if(r.x>WIDTH-radius){r.x=WIDTH-radius;r.vx=-Math.abs(r.vx)*.8-20;r.spin=-4;}
 if(r.y<radius){r.y=radius;r.vy=Math.abs(r.vy);}
 for(const b of r.blocks){
  if(b.hp<=0||Math.abs(b.y*TILE+16-r.y)>44||Math.abs(b.x*TILE+16-r.x)>44)continue;
  const nx=Math.max(b.x*TILE,Math.min(r.x,(b.x+1)*TILE)),ny=Math.max(b.y*TILE,Math.min(r.y,(b.y+1)*TILE));
  let dx=r.x-nx,dy=r.y-ny,d=Math.hypot(dx,dy);if(d>=radius)continue;
  if(d===0){dx=0;dy=-1;d=1;}
  const ux=dx/d,uy=dy/d;r.x+=ux*(radius-d);r.y+=uy*(radius-d);
  const v=r.vx*ux+r.vy*uy;
  if(v<0){r.vx-=1.55*v*ux;r.vy-=1.55*v*uy;}
  if(uy<-.4){r.vy=Math.min(r.vy,-90);r.vx+=Math.sin(r.angle*1.3)*48;r.spin=(r.vx>=0?1:-1)*(3.3+Math.abs(r.vx)/65);}
  r.vx=Math.max(-195,Math.min(195,r.vx));hit(r,b);
 }
 // Escape geometrical stalls without consuming a player's nudge.
 if(r.time-r.lastHit>3&&Math.abs(r.vx)+Math.abs(r.vy)<20){r.vx=65*Math.sin(r.time);r.vy=70;}
 r.hp=Math.max(0,r.hp);
 if(r.hp<=0)r.status='lost';else if(r.y>r.rows*TILE+34)r.status='won';
}
