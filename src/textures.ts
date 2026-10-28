import type {BlockType} from './core.ts';
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
const ORE:Partial<Record<BlockType,string[]>>={coal:['#171921','#303238','#4d5059','#7b7e86'],copper:['#79442e','#bd743e','#eba766','#f8d9aa'],iron:['#71625d','#a58f7c','#cfb7a3','#f5e2cf'],emerald:['#0a6240','#24ae70','#66eaa0','#c4ffe0'],ancient:['#261646','#7045a1','#be80ed','#ffe0ff'],gold:['#7b5a14','#d9a520','#fbd74b','#fff7b5'],gem:['#147a74','#25c2b6','#6ff2e4','#dcfffb']};
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
type BonusArt={colors:[string,string,string,string];ink:string;glyph:string[]};
const BONUS_ART:Partial<Record<BlockType,BonusArt>>={
 double:{colors:['#3a2852','#5b3d78','#76569a','#a17bc3'],ink:'#f4e2ff',glyph:['#...#..###','.#.#.....#','..#....###','.#.#...#..','#...#..###']},
 sweep:{colors:['#16444e','#245f69','#348792','#60b7bb'],ink:'#dcfffa',glyph:['..#...#..','.##...##.','#########','.##...##.','..#...#..']},
 repair:{colors:['#1f472d','#326b3c','#4d9957','#82c873'],ink:'#e2ffd3',glyph:['...###...','...###...','...###...','#########','#########','#########','...###...','...###...','...###...']},
 relic:{colors:['#40305e','#624885','#9168b4','#bb92db'],ink:'#f8e7ff',glyph:['....#....','...###...','..#####..','.#######.','#########','.#######.','..#####..','...###...','....#....']},
 onehit:{colors:['#643b18','#9b5d20','#ce8c32','#efbd65'],ink:'#fff2b0',glyph:['.....##..','....###..','...###...','..######.','....###..','...###...','..###....','..##.....']},
 phase:{colors:['#164653','#256c7b','#3899aa','#74cbd4'],ink:'#e0fdff',glyph:['..#####..','.##...##.','##.....##','##..#..##','##.....##','.##...##.','..#####..']},
 bench:{colors:['#51351f','#80542e','#ae783f','#d2a066'],ink:'#ffe5b1',glyph:['#########','##.#.#.##','#########','.##...##.','.##...##.','.##...##.','.##...##.']},
 drill:{colors:['#552f22','#8e482c','#c36b40','#e59b69'],ink:'#ffe2b5',glyph:['..#####..','.#######.','.##...##.','..#####..','...###...','...###...','....#....']},
 magnet:{colors:['#173e50','#285f74','#408ba2','#79bdcc'],ink:'#e0faff',glyph:['##.....##','##.....##','##.....##','##.....##','.##...##.','.#######.','..#####..']},
 curse:{colors:['#51232c','#823540','#b6525d','#d98c87'],ink:'#ffe0d9',glyph:['.###.###.','####.####','####.####','.###.###.','..##.##..','...###...','....#....']},
 shield:{colors:['#183d64','#286ba0','#3996c8','#8be1ff'],ink:'#e2f8ff',glyph:['...###...','.#######.','#########','#########','.#######.','..#####..','...###...']},
 coalCharge:{colors:['#49351e','#76512b','#ab7638','#edc06b'],ink:'#fff1bf',glyph:['..#####..','.#######.','###...###','##..#..##','##.###.##','.#######.','..#####..']},
 vein:{colors:['#4e321e','#82532c','#bd7a37','#f3c266'],ink:'#fff0bd',glyph:['##.....##','.##...##.','..##.##..','...###...','..##.##..','.##...##.','##.....##']},
 helmet:{colors:['#3b4223','#69713a','#a6a34d','#e4cf78'],ink:'#fff4bd',glyph:['...#####.','..#######.','.##.....##','###########','###########','##.......##','##.......##']},
};
function bonusPixels(rand:()=>number,art:BonusArt):Pixels{
 const [shadow,mid,base,light]=art.colors;
 // The whole tile is made from the bonus material, including its edges.
 const px=pattern(rand,[shadow,mid,mid,base,base,light],4,4,.65);
 for(let x=0;x<SIZE;x++){set(px,x,0,light);set(px,x,SIZE-1,shadow);}
 for(let y=1;y<SIZE-1;y++){set(px,0,y,mid);set(px,SIZE-1,y,shadow);}
 const width=Math.max(...art.glyph.map(row=>row.length)),x0=Math.floor((SIZE-width)/2),y0=Math.floor((SIZE-art.glyph.length)/2);
 art.glyph.forEach((row,y)=>[...row].forEach((c,x)=>{if(c==='#')set(px,x0+x+1,y0+y+1,shadow);}));
 art.glyph.forEach((row,y)=>[...row].forEach((c,x)=>{if(c==='#')set(px,x0+x,y0+y,art.ink);}));
 return px;
}
const LETTERS=[['###','.#.','.#.','.#.','.#.'],['#..#','##.#','#.##','#..#','#..#'],['###','.#.','.#.','.#.','.#.']];
export function blockPixels(type:BlockType|'grass'|'grassTop'|'cave'|'treeWood'|'treeLeaves'|'cobble',variant:number,bonusTier?:1|2|3):Pixels {
 const rand=random(type.length*977+variant*131+7);
 if(type==='cobble'){
  const px=pattern(rand,['#55595a','#65696a','#737779','#848889','#96999a'],6,6,.6);
  // Uneven mortar joints and small highlights make distinct, rough stones.
  for(const y of [4,9,14])for(let x=0;x<SIZE;x++)set(px,x,(y+(x%7===0?1:0))%SIZE,rand()<.7?'#424647':'#505455');
  for(const [top,bottom,columns] of [[0,4,[4,10]],[5,9,[2,7,13]],[10,14,[5,11]],[15,16,[2,9]]] as const)
   for(const x of columns)for(let y=top;y<bottom;y++)set(px,(x+(y%3===0?1:0))%SIZE,y,'#494d4e');
  for(let i=0;i<14;i++)set(px,Math.floor(rand()*SIZE),Math.floor(rand()*SIZE),'#a5a8a6');
  return px;
 }
 if(type==='treeWood'){
  const bark=['#49301d','#5a3b23','#69482a','#795432','#89623a'];
  const px=pattern(rand,bark,6,3,.55);
  for(let x=0;x<SIZE;x+=3+Math.floor(rand()*2))for(let y=0;y<SIZE;y++)if(rand()>.17)set(px,x+(y%7===0?1:0),y,bark[rand()<.7?0:1]);
  return px;
 }
 if(type==='treeLeaves'){
  const leaves=['#29451f','#355c27','#41732d','#508735','#669c3d','#79ad4b'];
  return pattern(rand,leaves,5,5,.5);
 }
 const bonus=BONUS_ART[type as BlockType];if(bonus){
  if(bonusTier&&(type==='drill'||type==='magnet')){
   const palettes:Record<'drill'|'magnet',[string,string,string,string][]>=
    {drill:[['#492d27','#734738','#a4664c','#d39d79'],['#552f22','#8e482c','#c36b40','#e59b69'],['#592922','#9f3c24','#df6532','#ffb45d']],
     magnet:[['#233b4c','#355a6e','#557e90','#8fb3bd'],['#173e50','#285f74','#408ba2','#79bdcc'],['#123a53','#1a6582','#219fbd','#8be6f0']]};
   const px=bonusPixels(rand,{...bonus,colors:palettes[type][bonusTier-1]});
   if(type==='drill'){
    const digits:Record<string,string[]>={'0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'4':['101','101','111','001','001'],'7':['111','001','010','010','010']};
    const label=bonusTier===1?'4':bonusTier===2?'7':'10',width=label.length*4-1,x0=15-width,y0=10;
    for(let y=y0-1;y<16;y++)for(let x=x0-1;x<16;x++)set(px,x,y,'#402a25');
    [...label].forEach((digit,i)=>digits[digit].forEach((row,y)=>[...row].forEach((c,x)=>{if(c==='1')set(px,x0+i*4+x,y0+y,'#fff0cf');})));
   }
   return px;
  }
  return bonusPixels(rand,bonus);
 }
 if(type==='grassTop')return pattern(rand,GRASS,4,4,.5);
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
export function paint(ctx:CanvasRenderingContext2D,px:Pixels,scale:number,alpha=1){
 ctx.globalAlpha=alpha;
 px.forEach((c,i)=>{if(c){ctx.fillStyle=c;ctx.fillRect(i%SIZE*scale,Math.floor(i/SIZE)*scale,scale,scale);}});
 ctx.globalAlpha=1;
}
// Average-ish colours for debris particles.
export const DEBRIS:Record<BlockType,number[]>={coal:[0x4e5159,0x22232a],copper:[0xd18b4d,0x937656],iron:[0xd2b6a0,0x81756e],emerald:[0x30bd7a,0xa9f4c8],ancient:[0x7045a1,0xe1b4ff],double:[0xc8a6f0,0x7754a6],sweep:[0x8ee1e3,0x398c9c],repair:[0x9ee77b,0x498653],relic:[0xd8a9ff,0x8454b0],onehit:[0xffcf79,0xc77b28],phase:[0xa5f5ff,0x248aa0],bench:[0xffd27c,0x9b6735],drill:[0xff9c61,0xc45d35],magnet:[0x75e4f5,0x168ca3],curse:[0xff8292,0xa83245],shield:[0x75ceff,0x286ba0],coalCharge:[0xedc06b,0x76512b],vein:[0xf3c266,0x82532c],helmet:[0xe4cf78,0x69713a],obsidian:[0x1d1230,0x3b2a5c],bedrock:[0x333333,0x575757],dirt:[0x6c4a2d,0x87603d,0x5f9e35],stone:[0x6e6e6e,0x868686],hard:[0x31313a,0x46464f],gold:[0x7a7a7a,0xf2cd42,0xc99420],gem:[0x7a7a7a,0x56e3cf,0x1aa595],tnt:[0xc63e27,0xece6d4]};
