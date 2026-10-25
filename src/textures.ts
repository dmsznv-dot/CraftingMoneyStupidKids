import type {BlockType,Pick} from './core.ts';
// Original 16×16 pixel art in a blocky voxel-game style, drawn from code. No third-party assets.
export type Pixels=(string|null)[];
export const SIZE=16;
function random(seed:number){return()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const blank=():Pixels=>Array(SIZE*SIZE).fill(null);
const set=(px:Pixels,x:number,y:number,c:string)=>{if(x>=0&&y>=0&&x<SIZE&&y<SIZE)px[y*SIZE+x]=c;};
// Weighted noise: the middle shades dominate, the extremes are rare specks; horizontal runs make it clumpy.
function noise(rand:()=>number,palette:string[]):Pixels {
 let last=palette[1];
 return blank().map(()=>{const r=rand();if(r<.3)return last;const k=(r-.3)/.7,i=k<.07?0:k<.93?1+Math.floor((k-.07)/.86*(palette.length-2)):palette.length-1;last=palette[i];return last;});
}
const DIRT=['#5e3f27','#6f4c31','#7a5637','#84603f','#9a7350'];
const GRASS=['#3f7424','#4f8a2b','#5f9e35','#74b444'];
const STONE=['#626262','#737373','#7c7c7c','#858585','#9a9a9a'];
const HARD=['#2e2e38','#40404c','#494956','#535361','#6c6c7c'];
const CAVE=['#0b0d0e','#0f1213','#121617','#151a1b','#1b2122'];
const ORE:Record<'gold'|'gem',string[]>={gold:['#6e4f0e','#c99420','#f2cd42','#fff4a8'],gem:['#0b5049','#1aa595','#56e3cf','#d0fff6']};
// Chunky ore nuggets with a lit top-left and a shadowed bottom-right edge.
function ore(rand:()=>number,px:Pixels,colors:string[]){
 const spots=[[1,2],[8,1],[4,7],[11,7],[2,12],[9,12]].filter(()=>rand()<.7);
 for(const [sx,sy] of spots){
  const x=sx+Math.floor(rand()*2),y=sy+Math.floor(rand()*2),w=3+Math.floor(rand()*2),h=2+Math.floor(rand()*2);
  for(let dx=0;dx<w;dx++)for(let dy=0;dy<h;dy++)if(!((dx===0||dx===w-1)&&(dy===0||dy===h-1)&&rand()<.6))set(px,x+dx,y+dy,colors[1]);
  set(px,x+1,y,colors[3]);set(px,x+1,y+1,colors[2]);set(px,x+2,y,colors[2]);
  for(let dx=1;dx<w;dx++)set(px,x+dx,y+h,colors[0]);
 }
}
const LETTERS=[['###','.#.','.#.','.#.','.#.'],['#..#','##.#','#.##','#..#','#..#'],['###','.#.','.#.','.#.','.#.']];
export function blockPixels(type:BlockType|'grass'|'cave',variant:number):Pixels {
 const rand=random(type.length*977+variant*131+7);
 if(type==='dirt')return noise(rand,DIRT);
 if(type==='grass'){
  const px=noise(rand,DIRT);
  for(let x=0;x<SIZE;x++){const depth=3+(rand()<.45?1:0)+(rand()<.2?1:0);for(let y=0;y<depth;y++)set(px,x,y,GRASS[y===0?3:Math.floor(rand()*3)]);}
  return px;
 }
 if(type==='cave')return noise(rand,CAVE);
 if(type==='hard'){
  // Dense rock: dark, horizontally layered.
  const px=noise(rand,HARD);
  for(let y=1;y<SIZE;y+=4)for(let x=0;x<SIZE;x++)if(rand()<.7)set(px,x,y+(x+variant)%2,HARD[0]);
  for(let i=0;i<6;i++)set(px,Math.floor(rand()*SIZE),Math.floor(rand()*SIZE),HARD[4]);
  return px;
 }
 const px=noise(rand,STONE);
 for(let i=0;i<5;i++){const x=Math.floor(rand()*13),y=Math.floor(rand()*SIZE),len=2+Math.floor(rand()*3);for(let k=0;k<len;k++)set(px,x+k,y,STONE[0]);}
 if(type==='gold'||type==='gem')ore(rand,px,ORE[type]);
 if(type==='tnt'){
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)set(px,x,y,x%4===0?'#7c2215':y<2||y>13?'#d65038':rand()<.5?'#b8341f':'#c63e27');
  for(let y=5;y<11;y++)for(let x=0;x<SIZE;x++)set(px,x,y,y===5||y===10?'#c9c2ad':'#ece6d4');
  let ox=2;for(const glyph of LETTERS){glyph.forEach((row,dy)=>[...row].forEach((c,dx)=>{if(c==='#')set(px,ox+dx,6+dy,'#222222');}));ox+=glyph[0].length+1;}
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
};
// Pickaxe at rest: head arcs from the left edge to the top edge, handle runs to the bottom right.
// It must stay in line with PICK_PARTS in core.ts (tips near pixels 1,10 and 10,1; handle end near 13,13).
export function pickPixels(pick:Pick):Pixels {
 const px=blank(),[dark,mid,light,shine]=HEADS[pick];
 for(let i=6;i<=13;i++){set(px,i,i,'#6b4a22');set(px,i+1,i,'#8f6a35');}
 set(px,14,13,'#3d2a12');set(px,13,14,'#3d2a12');
 for(let t=0;t<=9;t++)set(px,1+t,10-t,t===0||t===9?dark:mid);
 for(let t=1;t<=8;t++)set(px,1+t,9-t,light);
 for(let t=3;t<=6;t++)set(px,t,9-t,t===4?shine:light);
 const filled=px.map(c=>c!==null);
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  if(filled[y*SIZE+x])continue;
  if([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>x+dx>=0&&x+dx<SIZE&&y+dy>=0&&y+dy<SIZE&&filled[(y+dy)*SIZE+x+dx]))set(px,x,y,'#161616');
 }
 return px;
}
export function paint(ctx:CanvasRenderingContext2D,px:Pixels,scale:number,alpha=1){
 ctx.globalAlpha=alpha;
 px.forEach((c,i)=>{if(c){ctx.fillStyle=c;ctx.fillRect(i%SIZE*scale,Math.floor(i/SIZE)*scale,scale,scale);}});
 ctx.globalAlpha=1;
}
// Average-ish colours for debris particles.
export const DEBRIS:Record<BlockType,number[]>={dirt:[0x6c4a2d,0x87603d,0x5f9e35],stone:[0x6e6e6e,0x868686],hard:[0x31313a,0x46464f],gold:[0x7a7a7a,0xf2cd42,0xc99420],gem:[0x7a7a7a,0x56e3cf,0x1aa595],tnt:[0xc63e27,0xece6d4]};
