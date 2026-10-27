import type {BlockType,Pick} from './core.ts';
// Original 16×16 pixel art in a blocky voxel-game style, drawn from code. No third-party assets.
export type Pixels=(string|null)[];
export const SIZE=16;
function random(seed:number){return()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const blank=():Pixels=>Array(SIZE*SIZE).fill(null);
const set=(px:Pixels,x:number,y:number,c:string)=>{if(x>=0&&y>=0&&x<SIZE&&y<SIZE)px[y*SIZE+x]=c;};
// Smooth value noise on a grid that wraps every 16 px, so neighbouring blocks join without seams.
function field(rand:()=>number,gx:number,gy:number):number[] {
 const grid=Array.from({length:gx*gy},()=>rand()),at=(x:number,y:number)=>grid[(y%gy)*gx+(x%gx)];
 const ease=(t:number)=>t*t*(3-2*t),out:number[]=[];
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  const fx=x/SIZE*gx,fy=y/SIZE*gy,ix=Math.floor(fx),iy=Math.floor(fy),tx=ease(fx-ix),ty=ease(fy-iy);
  const top=at(ix,iy)*(1-tx)+at(ix+1,iy)*tx,bottom=at(ix,iy+1)*(1-tx)+at(ix+1,iy+1)*tx;
  out.push(top*(1-ty)+bottom*ty);
 }
 return out;
}
// Blobs plus per-pixel dither, quantised to a short palette: the look of a hand-made 16×16 block.
function pattern(rand:()=>number,palette:string[],gx:number,gy:number,blob:number):Pixels {
 return field(rand,gx,gy).map(v=>{const k=Math.max(0,Math.min(.999,blob*v+(1-blob)*rand()));return palette[Math.floor(k*palette.length)];});
}
const DIRT=['#5b3e28','#6b4a30','#795436','#855e3d','#936944','#a57852'];
const GRASS=['#4a7829','#5a8f33','#6aa53c','#7cba48'];
const STONE=['#5c5c5c','#696969','#747474','#7e7e7e','#888888','#979797'];
const CAVE=['#101112','#141618','#181b1d','#1c2022','#212628','#272c2f'];
const HARD=['#2c2c32','#36363d','#404047','#4a4a52','#56565f'];
const OBSIDIAN=['#0a0611','#110b1d','#191127','#221833','#30224a','#4b3672'];
const BEDROCK=['#1b1b1b','#2e2e2e','#454545','#5b5b5b','#787878'];
const ORE:Partial<Record<BlockType,string[]>>={coal:['#171921','#303238','#4d5059','#7b7e86'],copper:['#79442e','#bd743e','#eba766','#f8d9aa'],iron:['#71625d','#a58f7c','#cfb7a3','#f5e2cf'],emerald:['#0a6240','#24ae70','#66eaa0','#c4ffe0'],gold:['#7b5a14','#d9a520','#fbd74b','#fff7b5'],gem:['#147a74','#25c2b6','#6ff2e4','#dcfffb']};
// Ore sits in small irregular clumps: lit top-left, shadowed bottom-right, a dark rim where it meets stone.
function ore(rand:()=>number,px:Pixels,colors:string[]){
 const spots=[[2,2],[9,1],[5,7],[11,8],[1,12],[8,12]].filter(()=>rand()<.75);
 for(const [sx,sy] of spots){
  const x=sx+Math.floor(rand()*2),y=sy+Math.floor(rand()*2),cells:[number,number][]=[[1,0],[0,1],[1,1],[2,1],[1,2]];
  if(rand()<.6)cells.push([2,0]);if(rand()<.6)cells.push([0,2]);if(rand()<.5)cells.push([2,2]);
  for(const [dx,dy] of cells)set(px,x+dx+1,y+dy+1,STONE[0]);
  for(const [dx,dy] of cells)set(px,x+dx,y+dy,dx+dy<=1?colors[2]:dx+dy>=3?colors[0]:colors[1]);
  set(px,x+1,y,colors[3]);
 }
}
const LETTERS=[['###','.#.','.#.','.#.','.#.'],['#..#','##.#','#.##','#..#','#..#'],['###','.#.','.#.','.#.','.#.']];
export function blockPixels(type:BlockType|'grass'|'cave',variant:number):Pixels {
 const rand=random(type.length*977+variant*131+7);
 if(type==='dirt'||type==='grass'){
  const px=pattern(rand,DIRT,4,4,.45);
  for(let i=0;i<5;i++)set(px,Math.floor(rand()*SIZE),Math.floor(rand()*SIZE),DIRT[5]);
  if(type==='grass'){
   // Grass side: a green cap with uneven drips into the dirt.
   for(let x=0;x<SIZE;x++){
    const depth=3+(rand()<.5?1:0)+(rand()<.18?2:0);
    for(let y=0;y<depth;y++)set(px,x,y,y===0?GRASS[3]:GRASS[Math.floor(rand()*3)]);
   }
  }
  return px;
 }
 if(type==='cave')return pattern(rand,CAVE,4,8,.6);
 if(type==='hard'){
  // Dense rock: dark and layered, with a seam every few rows.
  const px=pattern(rand,HARD,2,8,.55);
  for(let y=3;y<SIZE;y+=5)for(let x=0;x<SIZE;x++)if(rand()<.75)set(px,x,y+((x>>2)+variant)%2,HARD[0]);
  return px;
 }
 if(type==='obsidian'){
  // Near-black glass with violet glints running on the diagonal.
  const px=pattern(rand,OBSIDIAN.slice(0,4),4,4,.7);
  for(let i=0;i<4;i++){let x=Math.floor(rand()*SIZE),y=Math.floor(rand()*SIZE);for(let k=0;k<3;k++){set(px,x,y,OBSIDIAN[k===1?5:4]);x++;y--;}}
  return px;
 }
 if(type==='bedrock')return pattern(rand,BEDROCK,5,5,.85);
 const px=pattern(rand,STONE,4,8,.55);
 if(ORE[type])ore(rand,px,ORE[type]!);
 if(type==='double'||type==='sweep'){
  const colors=type==='double'?['#3b285c','#7653a2','#c29bef']:['#184d60','#287b93','#88d6dd'];
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)set(px,x,y,x===0||y===0||x===15||y===15?colors[0]:x===1||y===1?colors[2]:colors[1]);
  const glyph=type==='double'?['#.#.###','.#....#','#.#.###','....#..','....###']:['...#...','..###..','#######','..###..','...#...'];
  glyph.forEach((row,y)=>[...row].forEach((c,x)=>{if(c==='#')set(px,x+4,y+5,'#fff3cb');}));
 }
 if(type==='tnt'){
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)set(px,x,y,y===0?'#e0583a':y===SIZE-1?'#7c2215':x%4===1?'#8e2412':rand()<.5?'#c0361d':'#d14327');
  for(let y=5;y<11;y++)for(let x=0;x<SIZE;x++)set(px,x,y,y===5||y===10?'#bdb8a8':'#ece8db');
  let ox=2;for(const glyph of LETTERS){glyph.forEach((row,dy)=>[...row].forEach((c,dx)=>{if(c==='#')set(px,ox+dx,6+dy,'#1c1c1c');}));ox+=glyph[0].length+1;}
 }
 return px;
}
// Pixels that darken a block as it takes damage; later stages add to earlier ones.
export const CRACK_STAGES=4;
export function crackPixels(stage:number):Pixels {
 const rand=random(4242),px=blank(),k=Math.min(stage,CRACK_STAGES-1);
 const rays=[[1,0],[-1,-1],[0,1],[1,-1],[-1,1],[0,-1]].slice(0,3+k),length=[3,5,6,8][k];
 for(const [dx,dy] of rays){
  let x=7,y=7;
  for(let i=0;i<length;i++){
   // Mostly straight with an occasional sideways kink, like a crack in stone.
   x+=dx;y+=dy;if(rand()<.35){if(dx===0)x+=rand()<.5?-1:1;else y+=rand()<.5?-1:1;}
   set(px,x,y,'#111111');if(i<2&&k>1)set(px,x+(dy===0?0:1),y+(dy===0?1:0),'#111111');
  }
 }
 set(px,7,7,'#111111');set(px,8,7,'#111111');
 return px;
}
const HEADS:Record<Pick,[string,string,string,string]>={
 wood:['#4a3519','#6e5128','#94703a','#b38f55'],
 stone:['#3f3f3f','#5f5f5f','#828282','#a3a3a3'],
 iron:['#6b6b6b','#b9b9b9','#dcdcdc','#ffffff'],
 gold:['#8a6410','#d4a521','#f5d54a','#fff6b0'],
 diamond:['#0e6b63','#27b8a8','#5ff0dc','#d2fff7'],
 obsidian:['#171024','#483052','#796091','#c09ddd'],
 netherite:['#221a20','#514048','#82747e','#c1afb6'],
};
// Original silhouette following the supplied reference: curved wide head, long diagonal grip.
// Gameplay rotates this icon -90 degrees to align its grip with the existing compound collider.
export function pickPixels(pick:Pick):Pixels {
 const px=blank(),[dark,mid,light,shine]=HEADS[pick];
 const shape=[
  '................',
  '.....ddddddd....',
  '....dllllllmdd..',
  '....dmmlmmmllmd.',
  '.....ddd.hhmmmmd',
  '........hh.dlmmd',
  '.......hh..dlmmd',
  '......hh...dlmmd',
  '.....hh....dlmmd',
  '....hh.....dlmmd',
  '...hh......dlmmd',
  '..hh........ddd.',
  '.hh.............',
  'hh..............',
  'h...............',
  '................',
 ];
 shape.forEach((row,y)=>[...row].forEach((c,x)=>{
  if(c==='.')return;
  const color=c==='d'?dark:c==='m'?mid:c==='l'?light:(x+y)%3===0?'#9b7755':(x+y)%3===1?'#684b39':'#483631';
  set(px,x,y,color);
 }));
 for(const [x,y] of [[5,2],[6,2],[8,2],[12,3]])set(px,x,y,shine);
 // Single-pixel rim separates the tool from both dark caves and bright stone.
 const filled=px.map(c=>c!==null);
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(!filled[y*SIZE+x]&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>x+dx>=0&&x+dx<SIZE&&y+dy>=0&&y+dy<SIZE&&filled[(y+dy)*SIZE+x+dx]))set(px,x,y,'#151116');
 return px;
}
export function paint(ctx:CanvasRenderingContext2D,px:Pixels,scale:number,alpha=1){
 ctx.globalAlpha=alpha;
 px.forEach((c,i)=>{if(c){ctx.fillStyle=c;ctx.fillRect(i%SIZE*scale,Math.floor(i/SIZE)*scale,scale,scale);}});
 ctx.globalAlpha=1;
}
// Average-ish colours for debris particles.
export const DEBRIS:Record<BlockType,number[]>={coal:[0x4e5159,0x22232a],copper:[0xd18b4d,0x937656],iron:[0xd2b6a0,0x81756e],emerald:[0x30bd7a,0xa9f4c8],double:[0xc8a6f0,0x7754a6],sweep:[0x8ee1e3,0x398c9c],obsidian:[0x1d1230,0x3b2a5c],bedrock:[0x333333,0x575757],dirt:[0x6c4a2d,0x87603d,0x5f9e35],stone:[0x6e6e6e,0x868686],hard:[0x31313a,0x46464f],gold:[0x7a7a7a,0xf2cd42,0xc99420],gem:[0x7a7a7a,0x56e3cf,0x1aa595],tnt:[0xc63e27,0xece6d4]};
