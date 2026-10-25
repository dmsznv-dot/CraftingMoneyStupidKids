import Phaser from 'phaser';
import {COLS,TILE,WIDTH,PICKS,BLOCKS,BLAST_RADIUS} from './core.ts';
import {blockPixels,crackPixels,pickPixels,paint,DEBRIS,CRACK_STAGES} from './textures.ts';
import type {Run,RunEvent,BlockType,Pick} from './core.ts';
export interface Bridge {run:()=>Run;cue:()=>{x:number;y:number;dir:number}|null;tick:(dt:number)=>void;select:(column:number)=>void;ready:()=>void;effect:(e:RunEvent)=>void;placing:()=>boolean;exitText:()=>string}
const BLOCK_TYPES:BlockType[]=['dirt','stone','hard','gold','gem','tnt','obsidian','bedrock'];
export class MineScene extends Phaser.Scene {
 bridge:Bridge;g!:Phaser.GameObjects.Graphics;pick!:Phaser.GameObjects.Image;outline!:Phaser.GameObjects.Graphics;blocks:Phaser.GameObjects.Image[]=[];cracks:(Phaser.GameObjects.Image|undefined)[]=[];cave!:Phaser.GameObjects.TileSprite;lastRun='';acc=0;
 particles:{x:number;y:number;vx:number;vy:number;life:number;max:number;color:number;size:number}[]=[];
 rings:{x:number;y:number;life:number;color:number;size:number}[]=[];viewZoom=1;cachedHp:number[]=[];
 constructor(bridge:Bridge){super('mine');this.bridge=bridge;}
 create(){
  this.makeTextures();this.g=this.add.graphics();this.outline=this.add.graphics().setDepth(5);
  this.cave=this.add.tileSprite(WIDTH/2,128,WIDTH,32,'cave0').setOrigin(.5,0).setDepth(1).setTileScale(2/3);
  this.pick=this.add.image(224,64,'pick-wood').setDepth(4).setScale(.9);
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{const pos=this.cameras.main.getWorldPoint(p.x,p.y);if(this.bridge.run().status==='ready'&&pos.y<150)this.bridge.select(Math.max(0,Math.min(COLS-1,Math.floor(pos.x/TILE))));});
  this.scale.on('resize',()=>this.resize());this.resize();this.bridge.ready();
 }
 makeTextures(){
  const canvas=(key:string,size:number)=>{const tex=this.textures.createCanvas(key,size,size)!;tex.context.imageSmoothingEnabled=false;return tex;};
  for(const type of [...BLOCK_TYPES,'grass','cave'] as const)for(let variant=0;variant<3;variant++){
   // 48px (not a power of two) so WebGL clamps instead of repeating: no bleed from the opposite edge.
   const tex=canvas(type+variant,48);paint(tex.context,blockPixels(type,variant),3);tex.refresh();
  }
  for(let stage=0;stage<CRACK_STAGES;stage++){const tex=canvas('crack'+stage,48);paint(tex.context,crackPixels(stage),3,.7);tex.refresh();}
  for(const key of Object.keys(PICKS) as Pick[]){const tex=canvas('pick-'+key,64);paint(tex.context,pickPixels(key),4);tex.refresh();}
 }
 resize(){
  const w=this.scale.width,h=this.scale.height;
  this.viewZoom=Math.min(1.65,Math.max(.55,Math.min(w/(WIDTH+46),h/490)));
  this.cameras.main.setZoom(this.viewZoom);this.cameras.main.centerOn(WIDTH/2,180);
 }
 update(_time:number,delta:number){
  this.acc+=Math.min(delta/1000,.1);while(this.acc>=1/120){this.bridge.tick(1/120);this.acc-=1/120;}
  const r=this.bridge.run(),cam=this.cameras.main;
  if(this.lastRun!==r.id){for(const b of this.blocks)b.destroy();for(const c of this.cracks)c?.destroy();this.blocks=[];this.cracks=[];this.cachedHp=[];this.cave.setSize(WIDTH,r.rows*TILE-128);this.lastRun=r.id;this.particles=[];this.rings=[];}
  const targetY=r.status==='ready'?180:Math.max(180,r.y+125);
  cam.centerOn(WIDTH/2,targetY);
  this.drawBackdrop(r);
  for(let i=0;i<r.blocks.length;i++){
   const b=r.blocks[i],variant=(b.x+b.y)%3;
   if(!this.blocks[i])this.blocks[i]=this.add.image(b.x*TILE+16,b.y*TILE+16,(b.y===4&&b.type==='dirt'?'grass':b.type)+variant).setDepth(2).setScale(2/3);
   const img=this.blocks[i];img.setVisible(b.hp>0);
   if(this.cachedHp[i]!==b.hp){
    this.cachedHp[i]=b.hp;const worn=b.hp>0&&b.hp<BLOCKS[b.type].hp;
    if(worn&&!this.cracks[i])this.cracks[i]=this.add.image(img.x,img.y,'crack0').setDepth(3).setScale(2/3);
    const stage=Math.min(CRACK_STAGES-1,Math.floor((1-b.hp/BLOCKS[b.type].hp)*CRACK_STAGES));
    this.cracks[i]?.setVisible(worn).setTexture('crack'+stage);
   }
  }
  // Lit TNT flashes white until its fuse runs out.
  for(const f of r.fuses){const i=r.blocks.findIndex(b=>b.x===f.x&&b.y===f.y);const img=this.blocks[i];if(img){if(Math.floor(this.time.now/70)%2)img.setTintFill(0xffffff);else img.clearTint();}}
  this.pick.setTexture('pick-'+r.pick).setPosition(r.x,r.y).setRotation(r.angle).setVisible(r.status!=='lost');
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
  g.fillStyle(0x293e35);g.fillRect(-7,128,5,r.rows*TILE);g.fillRect(WIDTH+2,128,5,r.rows*TILE);
  g.fillStyle(0x17191a);g.fillRect(0,r.rows*TILE,WIDTH,Math.max(0,bottom-r.rows*TILE));
  const exit=r.rows*TILE+36;g.fillStyle(0x74d8ae,.09);g.fillRect(0,exit-12,WIDTH,70);g.lineStyle(2,0x7ad7ac,.65);g.lineBetween(0,exit,WIDTH,exit);
  for(let x=0;x<WIDTH;x+=32){g.fillStyle(0x7bd9ad,.5);g.fillRect(x+10,exit+14,12,3);}
 }
 fx(e:RunEvent){
  const r=this.bridge.run(),tier=PICKS[r.pick].tier;
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
