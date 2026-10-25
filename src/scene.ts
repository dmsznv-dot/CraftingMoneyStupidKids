import Phaser from 'phaser';
import {COLS,TILE,WIDTH,PICKS} from './core.ts';
import type {Run,RunEvent,BlockType,Pick} from './core.ts';
export interface Bridge {run:()=>Run;tick:(dt:number)=>void;select:(column:number)=>void;ready:()=>void;effect:(e:RunEvent)=>void;placing:()=>boolean;exitText:()=>string}
const palettes:Record<BlockType,[number,number,number]>={dirt:[0x654c38,0x806347,0x493b30],stone:[0x3b504d,0x4b625c,0x2d403d],hard:[0x293c3d,0x3b5051,0x203031],gold:[0x3e5148,0xe3b856,0xf6de8c],gem:[0x344c4b,0x53b5a2,0x99e4c9],tnt:[0xa84d38,0xd16a49,0xe9dfae]};
export class MineScene extends Phaser.Scene {
 bridge:Bridge;g!:Phaser.GameObjects.Graphics;pick!:Phaser.GameObjects.Image;outline!:Phaser.GameObjects.Graphics;blocks:Phaser.GameObjects.Image[]=[];lastRun='';acc=0;
 particles:{x:number;y:number;vx:number;vy:number;life:number;max:number;color:number;size:number}[]=[];
 rings:{x:number;y:number;life:number;color:number}[]=[];viewZoom=1;cachedHp:number[]=[];
 constructor(bridge:Bridge){super('mine');this.bridge=bridge;}
 create(){
  this.makeTextures();this.g=this.add.graphics();this.outline=this.add.graphics().setDepth(5);
  this.pick=this.add.image(224,64,'pick-wood').setDepth(4).setScale(1.15);
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{const pos=this.cameras.main.getWorldPoint(p.x,p.y);if(this.bridge.run().status==='ready'&&pos.y<150)this.bridge.select(Math.max(0,Math.min(COLS-1,Math.floor(pos.x/TILE))));});
  this.scale.on('resize',()=>this.resize());this.resize();this.bridge.ready();
 }
 makeTextures(){
  for(const type of Object.keys(palettes) as BlockType[]){
   for(let variant=0;variant<3;variant++){
    const tex=this.textures.createCanvas(type+variant,32,32)!,c=tex.context,[base,light,dark]=palettes[type];
    const color=(v:number)=>'#'+v.toString(16).padStart(6,'0');c.fillStyle=color(base);c.fillRect(0,0,32,32);
    c.fillStyle=color(dark);c.fillRect(0,29,32,3);c.fillRect(29,0,3,32);c.fillStyle=color(light);c.globalAlpha=.22;c.fillRect(0,0,29,2);c.fillRect(0,0,2,29);c.globalAlpha=1;
    for(let n=0;n<10;n++){const x=(n*17+variant*7)%26+2,y=(n*11+variant*13)%25+3;c.fillStyle=n%2?color(dark):color(type==='gold'||type==='gem'?base:light);c.fillRect(x,y,3+(n%3)*2,2+n%3);}
    if(type==='gold'||type==='gem'){for(let n=0;n<5;n++){const x=(n*13+variant*5)%21+4,y=(n*7+variant*9)%22+3;c.fillStyle=color(dark);c.fillRect(x-1,y+1,7,6);c.fillStyle=color(light);c.fillRect(x,y,5,4);c.fillStyle=color(palettes[type][2]);c.fillRect(x,y,2,2);}}
    if(type==='tnt'){c.fillStyle='#78392e';for(let x=3;x<32;x+=7)c.fillRect(x,2,2,29);c.fillStyle='#e5d9ac';c.fillRect(1,11,29,11);c.font='bold 9px monospace';c.fillStyle='#47372b';c.fillText('TNT',6,20);c.fillStyle='#d9b371';c.fillRect(13,0,3,4);}
    tex.refresh();
   }
  }
  for(const key of Object.keys(PICKS) as Pick[]){
   const tex=this.textures.createCanvas('pick-'+key,64,64)!,c=tex.context;
   c.translate(32,32);c.rotate(-Math.PI/4);c.fillStyle='#182d2a';c.fillRect(-6,-12,12,43);c.fillStyle='#8d5c35';c.fillRect(-4,-10,8,39);c.fillStyle='#cca573';c.fillRect(-3,-9,3,36);
   c.fillStyle='#172b29';c.fillRect(-23,-24,46,13);c.fillRect(-27,-20,9,17);c.fillRect(18,-20,9,17);
   c.fillStyle='#'+PICKS[key].color.toString(16).padStart(6,'0');c.fillRect(-21,-22,42,9);c.fillRect(-25,-19,8,13);c.fillRect(17,-19,8,13);c.fillStyle='#ffffff';c.globalAlpha=.35;c.fillRect(-20,-22,39,3);c.globalAlpha=1;tex.refresh();
  }
 }
 resize(){
  const w=this.scale.width,h=this.scale.height;
  this.viewZoom=Math.min(1.65,Math.max(.55,Math.min(w/(WIDTH+46),h/490)));
  this.cameras.main.setZoom(this.viewZoom);this.cameras.main.centerOn(WIDTH/2,180);
 }
 update(_time:number,delta:number){
  this.acc+=Math.min(delta/1000,.1);while(this.acc>=1/120){this.bridge.tick(1/120);this.acc-=1/120;}
  const r=this.bridge.run(),cam=this.cameras.main;
  if(this.lastRun!==r.id){for(const b of this.blocks)b.destroy();this.blocks=[];this.cachedHp=[];this.lastRun=r.id;this.particles=[];this.rings=[];}
  const targetY=r.status==='ready'?180:Math.max(180,r.y+125);
  cam.centerOn(WIDTH/2,targetY);
  this.drawBackdrop(r);
  for(let i=0;i<r.blocks.length;i++){
   const b=r.blocks[i];if(!this.blocks[i])this.blocks[i]=this.add.image(b.x*TILE+16,b.y*TILE+16,b.type+((b.x+b.y)%3)).setDepth(2);
   const img=this.blocks[i];img.setVisible(b.hp>0);if(b.hp>0&&this.cachedHp[i]!==b.hp){img.setAlpha(b.hp<1?.68:1);this.cachedHp[i]=b.hp;}
  }
  this.pick.setTexture('pick-'+r.pick).setPosition(r.x,r.y).setRotation(r.angle).setVisible(r.status!=='lost');
  for(const e of r.events.splice(0)){this.fx(e);this.bridge.effect(e);}
  const dt=Math.min(delta/1000,.05);const g=this.outline;g.clear();
  for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=200*dt;g.fillStyle(p.color,Math.max(0,p.life/p.max));g.fillRect(p.x,p.y,p.size,p.size);}
  this.particles=this.particles.filter(p=>p.life>0).slice(-200);
  for(const q of this.rings){q.life-=dt;g.lineStyle(2,q.color,Math.max(0,q.life*2));g.strokeCircle(q.x,q.y,(.55-q.life)*170);}
  this.rings=this.rings.filter(q=>q.life>0);
  if(r.status==='ready'){
   g.lineStyle(1,0xeac76e,.6);for(let y=100;y<155;y+=10)g.lineBetween(r.x,y,r.x,y+4);
   g.strokeCircle(r.x,r.y,32);g.lineStyle(1,0x6dc6a7,.35);
   if(this.bridge.placing())for(let x=0;x<COLS;x++)g.strokeRect(x*TILE+1,3*TILE+1,30,30);
  }
 }
 drawBackdrop(r:Run){
  const g=this.g;g.clear();const top=this.cameras.main.worldView.y-50,bottom=top+this.scale.height/this.viewZoom+100;
  g.fillStyle(0x0e2020);g.fillRect(-1000,top,2450,bottom-top);
  g.fillStyle(0x122927);g.fillRect(0,top,WIDTH,bottom-top);
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
  if(top<128){g.fillStyle(0x294b39);g.fillRect(0,117,WIDTH,10);for(let x=0;x<WIDTH;x+=12){g.fillStyle(x%24===0?0x41694b:0x345940);g.fillRect(x,113+(x%7),10,10);}}
  const exit=r.rows*TILE+36;g.fillStyle(0x74d8ae,.09);g.fillRect(0,exit-12,WIDTH,70);g.lineStyle(2,0x7ad7ac,.65);g.lineBetween(0,exit,WIDTH,exit);
  for(let x=0;x<WIDTH;x+=32){g.fillStyle(0x7bd9ad,.5);g.fillRect(x+10,exit+14,12,3);}
 }
 fx(e:RunEvent){
  if(e.type==='blast'){this.rings.push({x:e.x,y:e.y,life:.55,color:0xf6c96f});if(!matchMedia('(prefers-reduced-motion: reduce)').matches)this.cameras.main.shake(110,.0025);}
  if(e.type==='nudge')this.rings.push({x:e.x,y:e.y,life:.38,color:0x8ae2c4});
  const color=e.type==='blast'?0xefb45a:e.kind==='gold'?0xf2cf6b:e.kind==='gem'?0x7ce4c0:0x678578;
  const count=e.type==='blast'?25:e.type==='break'?8:3;
  for(let n=0;n<count;n++)this.particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*190,vy:-Math.random()*130,life:.5+Math.random()*.35,max:.85,color,size:e.type==='hit'?2:3+Math.random()*3});
 }
}
