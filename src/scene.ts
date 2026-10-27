import Phaser from 'phaser';
import {COLS,TILE,WIDTH,PICKS,BLOCKS,BLAST_RADIUS} from './core.ts';
import {blockPixels,crackPixels,paint,DEBRIS,CRACK_STAGES} from './textures.ts';
import type {Run,RunEvent,BlockType,Pick,Block} from './core.ts';
import {pickImages} from './pick-sprite.ts';
import {PickAura} from './aura.ts';
import type {Aura} from './progress.ts';
export interface Bridge {run:()=>Run;aura:()=>Aura;cue:()=>{x:number;y:number;dir:number}|null;tick:(dt:number)=>void;select:(column:number)=>void;ready:()=>void;effect:(e:RunEvent)=>void;placing:()=>boolean;exitText:()=>string}
const BLOCK_TYPES=Object.keys(BLOCKS) as BlockType[];
export class MineScene extends Phaser.Scene {
 bridge:Bridge;g!:Phaser.GameObjects.Graphics;pick!:Phaser.GameObjects.Image;pickDepth:Phaser.GameObjects.Image[]=[];outline!:Phaser.GameObjects.Graphics;blockViews=new Map<Block,{image:Phaser.GameObjects.Image;crack?:Phaser.GameObjects.Image;hp:number;type:BlockType}>();cave!:Phaser.GameObjects.TileSprite;depthTexture!:Phaser.Textures.CanvasTexture;depthLayer!:Phaser.GameObjects.Image;lastRun='';acc=0;cameraFollow=false;
 particles:{x:number;y:number;vx:number;vy:number;life:number;max:number;color:number;size:number}[]=[];
 labels:Phaser.GameObjects.Text[]=[];
 oreLabels:Phaser.GameObjects.Text[]=[];
 pickAura!:PickAura;
 rings:{x:number;y:number;life:number;color:number;size:number}[]=[];viewZoom=1;
 constructor(bridge:Bridge){super('mine');this.bridge=bridge;}
 create(){
  this.makeTextures();this.g=this.add.graphics();this.outline=this.add.graphics().setDepth(5);
  this.cave=this.add.tileSprite(WIDTH/2,128,WIDTH,32,'cave0').setOrigin(.5,0).setDepth(1).setTileScale(2/3);
  this.depthLayer=this.add.image(0,0,'mine-depth').setOrigin(0).setDepth(1.5);
  this.pickDepth=[0,1].map(i=>this.add.image(226+i,63-i,'pick-wood').setDepth(3.7+i*.05).setScale(.9).setTint(0x624b32));
  this.pick=this.add.image(224,64,'pick-wood').setDepth(4).setScale(.9);
  this.pickAura=new PickAura(this);
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{const pos=this.cameras.main.getWorldPoint(p.x,p.y);if(this.bridge.run().status==='ready'&&pos.y<150)this.bridge.select(Math.max(0,Math.min(COLS-1,Math.floor(pos.x/TILE))));});
  this.scale.on('resize',()=>this.resize());this.resize();this.bridge.ready();
 }
 makeTextures(){
  const canvas=(key:string,size:number)=>{const tex=this.textures.createCanvas(key,size,size)!;tex.context.imageSmoothingEnabled=false;return tex;};
  for(const type of [...BLOCK_TYPES,'grass','cave'] as const)for(let variant=0;variant<3;variant++){
   const tex=canvas(type+variant,48);paint(tex.context,blockPixels(type,variant),3);tex.refresh();
  }
  this.depthTexture=canvas('mine-depth',1);
  for(let stage=0;stage<CRACK_STAGES;stage++){const tex=canvas('crack'+stage,48);paint(tex.context,crackPixels(stage),3,.7);tex.refresh();}
  for(const key of Object.keys(PICKS) as Pick[]){const tex=canvas('pick-'+key,64);tex.context.drawImage(pickImages[key],0,0,64,64);tex.refresh();}
 }
 resize(){
  const w=this.scale.width,h=this.scale.height;
  this.viewZoom=Math.min(1.65,Math.max(.55,Math.min(w/(WIDTH+46),h/490)));
  this.cameras.main.setZoom(this.viewZoom);this.cameras.main.centerOn(WIDTH/2,180);
 }
 update(_time:number,delta:number){
  this.acc+=Math.min(delta/1000,.1);while(this.acc>=1/120){this.bridge.tick(1/120);this.acc-=1/120;}
  const r=this.bridge.run(),cam=this.cameras.main;
  if(this.lastRun!==r.id){for(const view of this.blockViews.values()){view.image.destroy();view.crack?.destroy();}this.blockViews.clear();this.lastRun=r.id;this.particles=[];this.rings=[];for(const label of this.labels)label.destroy();this.labels=[];this.oreLabels=[];}
  if(r.status==='ready'){
   this.cameraFollow=false;cam.centerOn(WIDTH/2,180);
  }else{
   if(!this.cameraFollow&&r.y>=cam.worldView.centerY)this.cameraFollow=true;
   if(this.cameraFollow){const center=cam.worldView.centerY;cam.centerOn(WIDTH/2,center+(r.y-center)*Math.min(1,delta/1000*8));}
  }
  const caveTop=Math.max(128,cam.worldView.y);this.cave.setPosition(WIDTH/2,caveTop).setSize(WIDTH,Math.max(32,cam.worldView.bottom-caveTop));
  this.drawBackdrop(r);
  const present=new Set(r.blocks);
  for(const [block,view] of this.blockViews)if(!present.has(block)){view.image.destroy();view.crack?.destroy();this.blockViews.delete(block);}
  for(const b of r.blocks){
   let view=this.blockViews.get(b);
   if(!view){const variant=(b.x+b.y)%3,base=b.y===4&&b.type==='dirt'?'grass':b.type,texture=base+variant;view={image:this.add.image(b.x*TILE+16,b.y*TILE+16,texture).setDepth(2).setScale(2/3),hp:NaN,type:b.type};this.blockViews.set(b,view);}
   const img=view.image;
   if(view.type!==b.type){view.type=b.type;const base=b.y===4&&b.type==='dirt'?'grass':b.type,variant=(b.x+b.y)%3;img.setTexture(base+variant);view.hp=NaN;}
   img.setVisible(b.hp>0);
   if(view.hp!==b.hp){
    view.hp=b.hp;const worn=b.hp>0&&b.hp<BLOCKS[b.type].hp;
    if(worn&&!view.crack)view.crack=this.add.image(b.x*TILE+16,b.y*TILE+16,'crack0').setDepth(3).setScale(2/3);
    const stage=Math.min(CRACK_STAGES-1,Math.floor((1-b.hp/BLOCKS[b.type].hp)*CRACK_STAGES));
    view.crack?.setVisible(worn).setTexture('crack'+stage);
   }
  }
  // Lit TNT flashes white until its fuse runs out.
  for(const f of r.fuses){const b=r.blocks.find(b=>b.x===f.x&&b.y===f.y),view=b?this.blockViews.get(b):undefined;if(view){if(Math.floor(this.time.now/70)%2)view.image.setTintFill(0xffffff);else view.image.clearTint();}}
  this.drawPerspective(r);
  const aura=this.bridge.aura(),ghost=aura==='ghost',pickAlpha=(r.phaseTime&&r.phaseTime>0?.48:1)*(ghost?.62:1);
  for(const [i,back] of this.pickDepth.entries()){const depth=(i+1)*.008;back.setTexture('pick-'+r.pick).setPosition(r.x+(cam.worldView.centerX-r.x)*depth,r.y+(cam.worldView.centerY-r.y)*depth).setRotation(r.angle-Math.PI/2).setVisible(r.status!=='lost').setAlpha(pickAlpha);}
  this.pick.setTexture('pick-'+r.pick).setPosition(r.x,r.y).setRotation(r.angle-Math.PI/2).setVisible(r.status!=='lost').setAlpha(pickAlpha);
  if(r.phaseTime&&r.phaseTime>0)this.pick.setTint(0x8eeeff);else if(r.magnetTime&&r.magnetTime>0)this.pick.setTint(0x65d7ff);else if(r.oneHitTime&&r.oneHitTime>0)this.pick.setTint(0xffd377);else if(ghost)this.pick.setTint(0x8dffae);else this.pick.clearTint();
  this.pickAura.update(aura,r,this.time.now);
  for(const e of r.events.splice(0)){this.fx(e);this.bridge.effect(e);}
  const dt=Math.min(delta/1000,.05);const g=this.outline;g.clear();
  for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=200*dt;g.fillStyle(p.color,Math.max(0,p.life/p.max));g.fillRect(p.x,p.y,p.size,p.size);}
  this.particles=this.particles.filter(p=>p.life>0).slice(-200);
  for(const q of this.rings){q.life-=dt;g.lineStyle(2,q.color,Math.max(0,q.life*2));g.strokeCircle(q.x,q.y,(.55-q.life)/.55*q.size);}
  this.rings=this.rings.filter(q=>q.life>0);
  const cue=this.bridge.cue();
  if(cue){
   // Lesson marker: pulse on the fuse TNT and a dotted path from the pick.
   const pulse=.5+.5*Math.sin(this.time.now/140);g.lineStyle(2,0xf3ce77,.5+.4*pulse);g.strokeRect(cue.x-19-pulse*3,cue.y-19-pulse*3,38+pulse*6,38+pulse*6);
   const steps=8;g.fillStyle(0xf3ce77,.8);for(let i=1;i<steps;i++){const k=i/steps;g.fillCircle(r.x+(cue.x-r.x)*k,r.y+(cue.y-r.y)*k-Math.sin(k*Math.PI)*28,2);}
  }
  if(r.status==='ready'){
   g.lineStyle(1,0xeac76e,.6);for(let y=100;y<155;y+=10)g.lineBetween(r.x,y,r.x,y+4);
   g.strokeCircle(r.x,r.y,32);g.lineStyle(1,0x6dc6a7,.35);
   if(this.bridge.placing())for(let x=0;x<COLS;x++)g.strokeRect(x*TILE+1,3*TILE+1,30,30);
  }
 }
 drawPerspective(r:Run){
  const view=this.cameras.main.worldView,tex=this.depthTexture;
  const width=Math.max(1,Math.ceil(view.width)),height=Math.max(1,Math.ceil(view.height));
  if(tex.width!==width||tex.height!==height){tex.setSize(width,height);this.depthLayer.setTexture('mine-depth');}
  this.depthLayer.setPosition(view.x,view.y);
  const ctx=tex.context;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
  const solid=new Set<string>();for(const b of r.blocks)if(b.hp>0)solid.add(`${b.x},${b.y}`);
  type Point={x:number;y:number};
  const point=(x:number,y:number):Point=>({x:x-view.x,y:y-view.y});
  // A back plane projects toward the camera's centre, so its direction
  // changes naturally on either side of the screen and as the camera moves.
  const back=(x:number,y:number):Point=>point(view.centerX+(x-view.centerX)*.94,view.centerY+(y-view.centerY)*.94);
  const face=(source:HTMLCanvasElement,p0:Point,p1:Point,p2:Point,p3:Point,shade:number)=>{
   const triangle=(a:Point,b:Point,c:Point,m11:number,m12:number,m21:number,m22:number)=>{
    ctx.save();ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.closePath();ctx.clip();
    ctx.setTransform(m11,m12,m21,m22,p0.x,p0.y);ctx.drawImage(source,0,0);ctx.restore();
   };
   triangle(p0,p1,p2,(p1.x-p0.x)/48,(p1.y-p0.y)/48,(p2.x-p1.x)/48,(p2.y-p1.y)/48);
   triangle(p0,p2,p3,(p2.x-p3.x)/48,(p2.y-p3.y)/48,(p3.x-p0.x)/48,(p3.y-p0.y)/48);
   ctx.fillStyle=`rgba(0,0,0,${shade})`;ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.lineTo(p3.x,p3.y);ctx.closePath();ctx.fill();
  };
  for(const b of r.blocks){
   if(b.hp<=0)continue;
   const x=b.x*TILE,y=b.y*TILE;
   if(x+TILE<view.x-40||x>view.right+40||y+TILE<view.y-40||y>view.bottom+40)continue;
   const base=b.y===4&&b.type==='dirt'?'grass':b.type,source=(this.textures.get(base+((b.x+b.y)%3)) as Phaser.Textures.CanvasTexture).canvas;
   if(x+TILE<=view.centerX&&!solid.has(`${b.x+1},${b.y}`))face(source,point(x+TILE,y),point(x+TILE,y+TILE),back(x+TILE,y+TILE),back(x+TILE,y),.28);
   else if(x>=view.centerX&&!solid.has(`${b.x-1},${b.y}`))face(source,point(x,y+TILE),point(x,y),back(x,y),back(x,y+TILE),.28);
   if(y+TILE<=view.centerY&&!solid.has(`${b.x},${b.y+1}`))face(source,point(x+TILE,y+TILE),point(x,y+TILE),back(x,y+TILE),back(x+TILE,y+TILE),.38);
   else if(y>=view.centerY&&!solid.has(`${b.x},${b.y-1}`))face(source,point(x,y),point(x+TILE,y),back(x+TILE,y),back(x,y),.12);
  }
  tex.refresh();
 }
 drawBackdrop(r:Run){
  const g=this.g;g.clear();const top=this.cameras.main.worldView.y-50,bottom=top+this.scale.height/this.viewZoom+100;
  g.fillStyle(0x0e2020);g.fillRect(-1000,top,2450,bottom-top);
  g.fillStyle(0x0f1d22);g.fillRect(0,top,WIDTH,Math.max(0,128-top));
  // Layered cave silhouettes, timber supports and mineral flecks.
  for(let y=Math.floor(top/128)*128;y<bottom;y+=128){
   const shift=Math.abs(Math.sin(y*7.1))*60;
   g.fillStyle(0x172c29);g.fillTriangle(-220,y,-18-shift,y+100,-220,y+190);g.fillTriangle(WIDTH+220,y,WIDTH+18+shift,y+100,WIDTH+220,y+190);
   g.fillStyle(0x293f36);g.fillRect(-29,y,18,7);g.fillRect(WIDTH+11,y,18,7);
   g.fillStyle(0x1f332e);g.fillRect(-25,y,7,125);g.fillRect(WIDTH+18,y,7,125);
   for(let n=0;n<4;n++){g.fillStyle(n%2?0x294b42:0x263b36,.8);g.fillRect(-65-(n*37)%100,y+(n*29)%120,3,4);g.fillRect(WIDTH+65+(n*37)%100,y+(n*29)%120,3,4);}
   if(Math.round(y/128)%2===0){g.fillStyle(0xf2c86b,.06);g.fillCircle(-19,y+22,32);g.fillStyle(0x94774c);g.fillRect(-25,y+14,12,15);g.fillStyle(0xffd984);g.fillRect(-22,y+17,6,9);}
  }
  const railTop=Math.max(128,top);g.fillStyle(0x293e35);g.fillRect(-7,railTop,5,Math.max(0,bottom-railTop));g.fillRect(WIDTH+2,railTop,5,Math.max(0,bottom-railTop));
  g.fillStyle(0x17191a);g.fillRect(0,r.rows*TILE,WIDTH,Math.max(0,bottom-r.rows*TILE));
  if(r.mode!=='endless'){const exit=r.rows*TILE+36;g.fillStyle(0x74d8ae,.09);g.fillRect(0,exit-12,WIDTH,70);g.lineStyle(2,0x7ad7ac,.65);g.lineBetween(0,exit,WIDTH,exit);
   for(let x=0;x<WIDTH;x+=32){g.fillStyle(0x7bd9ad,.5);g.fillRect(x+10,exit+14,12,3);}}
 }
 fx(e:RunEvent){
  const r=this.bridge.run(),tier=PICKS[r.pick].tier;
  if(e.type==='break'&&e.value){
   const index=this.oreLabels.length,x=r.x+((index%3)-1)*20,y=r.y-24-Math.floor(index/3)*14;
   const label=this.add.text(x,y,'+'+e.value,{fontFamily:'Arial',fontSize:e.value>=10?'20px':'17px',fontStyle:'bold',color:'#ffe59d',stroke:'#1b2017',strokeThickness:4}).setOrigin(.5).setDepth(9);
   this.labels.push(label);this.oreLabels.push(label);this.tweens.add({targets:label,y:y-46,alpha:0,duration:950,ease:'Cubic.easeOut',onComplete:()=>{label.destroy();this.labels=this.labels.filter(l=>l!==label);this.oreLabels=this.oreLabels.filter(l=>l!==label);}});
   this.rings.push({x:e.x,y:e.y,life:.35,color:0xffdb81,size:25});
  }
  if(e.type==='bonus'){
   const symbol=e.kind==='double'?'×2':e.kind==='sweep'?'↔':e.kind==='repair'?'+':e.kind==='relic'?'◆':e.kind==='onehit'?'ϟ':e.kind==='phase'?'◌':e.kind==='bench'?'⚒':e.kind==='drill'?'↓10':e.kind==='magnet'?'M':e.kind==='curse'?'−25%':e.kind==='shield'?'⬡':e.kind==='coalCharge'?'TNT':e.kind==='vein'?'+'+e.value:e.kind==='helmet'?'⛑':'↔';
   const color=e.kind==='double'||e.kind==='relic'?'#e5c4ff':e.kind==='repair'?'#bdff9c':e.kind==='onehit'?'#ffd377':e.kind==='phase'?'#9bebff':e.kind==='bench'?'#ffc96b':e.kind==='drill'?'#ff9c61':e.kind==='magnet'?'#75e4f5':e.kind==='curse'?'#ff8292':e.kind==='shield'?'#8bdfff':e.kind==='coalCharge'?'#ffc86d':e.kind==='vein'?'#ffe39a':e.kind==='helmet'?'#e4dc8e':'#b1f7f5';
   const label=this.add.text(e.x,e.y,symbol,{fontFamily:'Arial',fontSize:'28px',fontStyle:'bold',color,stroke:'#17221d',strokeThickness:4}).setOrigin(.5).setDepth(9);
   this.labels.push(label);this.tweens.add({targets:label,y:e.y-70,alpha:0,duration:1300,onComplete:()=>{label.destroy();this.labels=this.labels.filter(l=>l!==label);}});
   if(e.kind==='sweep')for(let x=8;x<WIDTH;x+=16)this.particles.push({x,y:e.y,vx:0,vy:-60,life:.6,max:.6,color:0x9de4e4,size:5});
  }
  if(e.type==='blast'){this.rings.push({x:e.x,y:e.y,life:.55,color:0xf6c96f,size:BLAST_RADIUS+14});if(!matchMedia('(prefers-reduced-motion: reduce)').matches)this.cameras.main.shake(90,.002);}
  if(e.type==='fuse')this.rings.push({x:e.x,y:e.y,life:.3,color:0xffffff,size:20});
  if(e.type==='nudge')this.rings.push({x:e.x,y:e.y,life:.38,color:0x8ae2c4,size:90});
  if(e.type==='hit'&&e.weak){
   // Glancing blow: a few bright sparks instead of debris.
   for(let n=0;n<5;n++)this.particles.push({x:e.x+(r.x-e.x)*.5,y:e.y+(r.y-e.y)*.5,vx:(Math.random()-.5)*260,vy:-Math.random()*160,life:.25,max:.25,color:n%2?0xfff1a8:0xffffff,size:2});
   return;
  }
  const colors=e.kind?DEBRIS[e.kind]:[0xefb45a],power=1+tier*.35;
  const count=e.type==='blast'?22:e.type==='break'?Math.round(6+tier*3):e.type==='hit'?3:0;
  for(let n=0;n<count;n++)this.particles.push({x:e.x+(Math.random()-.5)*20,y:e.y+(Math.random()-.5)*20,vx:(Math.random()-.5)*170*(e.type==='break'?power:1),vy:-Math.random()*120*(e.type==='break'?power:1),life:.5+Math.random()*.35,max:.85,color:e.type==='blast'?(n%2?0xefb45a:0xfff1c0):colors[n%colors.length],size:e.type==='hit'?2:2+Math.floor(Math.random()*3)});
 }
}
