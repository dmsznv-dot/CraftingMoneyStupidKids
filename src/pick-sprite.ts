import source from './assets/pickaxe.png?inline';
import type {Pick} from './core.ts';

const HEADS:Record<Pick,[string,string,string,string]>={
 wood:['#4a3519','#6e5128','#94703a','#b38f55'],
 stone:['#3f3f3f','#5f5f5f','#828282','#a3a3a3'],
 iron:['#6b6b6b','#b9b9b9','#dcdcdc','#ffffff'],
 gold:['#8a6410','#d4a521','#f5d54a','#fff6b0'],
 diamond:['#0e6b63','#27b8a8','#5ff0dc','#d2fff7'],
 obsidian:['#171024','#483052','#796091','#c09ddd'],
 netherite:['#221a20','#514048','#82747e','#c1afb6'],
};

export const pickImages={} as Record<Pick,CanvasImageSource>;
export const pickUrls={} as Record<Pick,string>;

// Every material uses the supplied PNG's exact silhouette, alpha and handle.
// Only the head palette changes. Netherite uses the source file unchanged.
export async function preparePickSprites(){
 const original=new Image();original.src=source;await original.decode();
 for(const key of Object.keys(HEADS) as Pick[]){
  if(key==='netherite'){pickImages[key]=original;pickUrls[key]=source;continue;}
  const canvas=document.createElement('canvas');canvas.width=original.width;canvas.height=original.height;
  const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;ctx.drawImage(original,0,0);
  const image=ctx.getImageData(0,0,canvas.width,canvas.height),d=image.data;
  const palette=HEADS[key].map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
   const i=(y*canvas.width+x)*4;
   // Head occupies the top arm and right tip; the diagonal wooden handle stays original.
   if(d[i+3]===0||!(y<original.height*5/16||x>=original.width*11/16))continue;
   const light=(d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722);
   const t=Math.max(0,Math.min(3,(light-18)/95*3)),lo=Math.floor(t),hi=Math.min(3,lo+1),mix=t-lo;
   for(let c=0;c<3;c++)d[i+c]=Math.round(palette[lo][c]*(1-mix)+palette[hi][c]*mix);
  }
  ctx.putImageData(image,0,0);pickImages[key]=canvas;pickUrls[key]=canvas.toDataURL('image/png');
 }
}
