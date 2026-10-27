import Phaser from 'phaser';
import {PICKS} from './core.ts';
import type {Pick,Run} from './core.ts';
import {PickAura} from './aura.ts';
import {pickImages} from './pick-sprite.ts';
import {AURAS} from './progress.ts';
import type {Aura} from './progress.ts';

const WIDTH=100,HEIGHT=105;

// One shared, transparent scene renders the same effects used in the mine.
// Its five tiles are copied into the shop cards after each rendered frame.
export class AuraPreviews {
 private host=document.createElement('div');
 private frame=document.createElement('canvas');
 private game:Phaser.Game;
 private targets=new Map<Aura,HTMLCanvasElement>();
 private disposed=false;
 private copyFrame=()=>{
  if(this.disposed||!this.game?.canvas||!this.targets.size)return;
  const frame=this.frame.getContext('2d');if(!frame)return;
  frame.clearRect(0,0,this.frame.width,this.frame.height);frame.imageSmoothingEnabled=false;
  frame.drawImage(this.game.canvas,0,0);
  AURAS.forEach((aura,i)=>{
   const canvas=this.targets.get(aura),ctx=canvas?.getContext('2d');if(!canvas||!ctx)return;
   ctx.clearRect(0,0,WIDTH,HEIGHT);ctx.imageSmoothingEnabled=false;
   ctx.drawImage(this.frame,i*WIDTH,0,WIDTH,HEIGHT,0,0,WIDTH,HEIGHT);
  });
 };
 constructor(getPick:()=>Pick){
  this.frame.width=WIDTH*AURAS.length;this.frame.height=HEIGHT;
  this.host.style.cssText='position:fixed;left:-10000px;top:0;pointer-events:none';
  this.host.setAttribute('aria-hidden','true');document.body.appendChild(this.host);
  const owner=this;
  class PreviewScene extends Phaser.Scene {
   private views:{aura:Aura;run:Run;pick:Phaser.GameObjects.Image;depth:Phaser.GameObjects.Image[];effect:PickAura}[]=[];
   private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
   constructor(){super('aura-previews');}
   create(){
    if(owner.disposed)return;
    for(const key of Object.keys(PICKS) as Pick[]){
     const tex=this.textures.createCanvas('pick-'+key,64,64)!;tex.context.drawImage(pickImages[key],0,0,64,64);tex.refresh();
    }
    this.views=AURAS.map((aura,i)=>{
     const x=i*WIDTH+WIDTH/2,y=67;
     const depth=[0,1].map(n=>this.add.image(x+n+1,y-n,'pick-wood').setDepth(3.7+n*.05).setScale(.9).setTint(0x624b32));
     const pick=this.add.image(x,y,'pick-wood').setDepth(4).setScale(.9);
     const run={id:'preview-'+aura,pick:'wood',status:'ready',x,y,angle:-.5,phaseTime:0} as Run;
     return{aura,run,pick,depth,effect:new PickAura(this,'-preview-'+aura)};
    });
    this.game.events.on(Phaser.Core.Events.POST_RENDER,owner.copyFrame);
   }
   update(time:number){
    const t=this.reduced?0:time/1000;
    this.views.forEach(({aura,run,pick,depth,effect},i)=>{
     run.pick=getPick();run.x=i*WIDTH+WIDTH/2+Math.sin(t*.9)*2;run.y=67+Math.sin(t*1.1)*2;run.angle=-.5+t*.8;
     const ghost=aura==='ghost',alpha=ghost?.62:1,rotation=run.angle-Math.PI/2;
     depth.forEach((back,n)=>back.setTexture('pick-'+run.pick).setPosition(run.x+n+1,run.y-n).setRotation(rotation).setAlpha(alpha));
     pick.setTexture('pick-'+run.pick).setPosition(run.x,run.y).setRotation(rotation).setAlpha(alpha);
     if(ghost)pick.setTint(0x8dffae);else pick.clearTint();
     effect.update(aura,run,time);
    });
   }
  }
  this.game=new Phaser.Game({type:Phaser.AUTO,parent:this.host,width:WIDTH*AURAS.length,height:HEIGHT,transparent:true,pixelArt:true,antialias:false,render:{roundPixels:true,preserveDrawingBuffer:true},audio:{noAudio:true},fps:{target:30},banner:false,scene:[PreviewScene]});
 }
 setTargets(root:HTMLElement){
  this.targets.clear();
  for(const canvas of Array.from(root.querySelectorAll<HTMLCanvasElement>('canvas[data-aura-preview]'))){
   const aura=canvas.dataset.auraPreview as Aura;if(AURAS.includes(aura))this.targets.set(aura,canvas);
  }
 }
 destroy(){
  this.disposed=true;this.targets.clear();this.game.events.off(Phaser.Core.Events.POST_RENDER,this.copyFrame);
  this.game.destroy(true);this.host.remove();
 }
}
