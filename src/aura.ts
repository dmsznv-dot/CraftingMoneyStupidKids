import Phaser from 'phaser';
import type {Aura} from './progress.ts';
import type {Run} from './core.ts';

type FireParticle={x:number;y:number;vx:number;vy:number;age:number;life:number;size:number};
type ElectricSpark={points:{x:number;y:number}[];age:number;life:number};

// Cosmetic layers live outside the simulation and follow the pick in world space.
export class PickAura {
 private back:Phaser.GameObjects.Graphics;
 private front:Phaser.GameObjects.Graphics;
 private sheen:Phaser.GameObjects.Image;
 private outline:Phaser.GameObjects.Image;
 private lightningPixels=new Map<Run['pick'],{x:number;y:number}[]>();
 private electricSparks:ElectricSpark[]=[];
 private sparkCarry=0;
 private shineTexture:Phaser.Textures.CanvasTexture;
 private shineFrame=-1;
 private shinePick='';
 private echoes:Phaser.GameObjects.Image[];
 private fireParticles:FireParticle[]=[];
 private fireCarry=0;
 private lastAura:Aura='none';
 private lastRun='';
 private lastTime=0;
 private lastX=0;
 private lastY=0;
 private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 private shineKey:string;
 constructor(private scene:Phaser.Scene,private textureSuffix=''){
  this.back=scene.add.graphics().setDepth(3.6);
  this.front=scene.add.graphics().setDepth(4.25);
  this.shineKey='aura-enchant-shine'+textureSuffix;
  this.shineTexture=scene.textures.createCanvas(this.shineKey,64,64)!;
  this.sheen=scene.add.image(0,0,'pick-wood').setScale(.9).setDepth(4.05).setBlendMode(Phaser.BlendModes.ADD);
  this.outline=scene.add.image(0,0,'pick-wood').setScale(.9).setDepth(3.68).setBlendMode(Phaser.BlendModes.ADD);
  this.echoes=[0,1].map(()=>scene.add.image(0,0,'pick-wood').setScale(.9).setDepth(3.65).setBlendMode(Phaser.BlendModes.ADD));
 }
 update(aura:Aura,r:Run,now:number){
  const back=this.back,front=this.front;
  back.clear();front.clear();this.sheen.setVisible(false);this.outline.setVisible(false);this.echoes.forEach(e=>e.setVisible(false));
  if(aura!==this.lastAura||r.id!==this.lastRun){
   this.fireParticles=[];this.electricSparks=[];this.fireCarry=0;this.sparkCarry=0;this.lastTime=now;this.lastX=r.x;this.lastY=r.y;
   this.lastAura=aura;this.lastRun=r.id;
   if(aura==='fire'&&r.status!=='lost')for(let i=0;i<30;i++)this.spawnFire(r.x,r.y,Math.random()*.7);
  }
  const dt=this.reduced?0:Math.min(.05,Math.max(0,(now-this.lastTime)/1000));this.lastTime=now;
  if(aura==='none'||r.status==='lost')return;
  const x=r.x,y=r.y,t=this.reduced?0:now/1000,rotation=r.angle-Math.PI/2;
  const phase=(r.phaseTime??0)>0?.55:1;
  const glow=(color:number)=>{
   back.fillStyle(color,.025*phase);back.fillCircle(x,y,48);
   back.fillStyle(color,.045*phase);back.fillCircle(x,y,37);
   back.fillStyle(color,.075*phase);back.fillCircle(x,y,27);
  };
  const star=(g:Phaser.GameObjects.Graphics,sx:number,sy:number,size:number,color:number,alpha:number)=>{
   g.fillStyle(color,alpha*phase);g.fillRect(sx-size/2,sy-1,size,2);g.fillRect(sx-1,sy-size/2,2,size);
  };
  if(aura==='fire'){
   glow(0xff681e);
   this.prepareOutline(r.pick,'fire');
   this.outline.setVisible(true).setTexture('aura-fire-'+r.pick+this.textureSuffix).setPosition(x,y).setRotation(rotation).setAlpha((.78+.12*Math.sin(t*5))*phase);
   this.drawFire(r,dt,phase);
  }else if(aura==='lightning'){
   glow(0x48aaff);
   this.prepareLightning(r.pick);
   this.outline.setVisible(true).setTexture('aura-lightning-'+r.pick+this.textureSuffix).setPosition(x,y).setRotation(rotation).setAlpha((.75+.15*Math.sin(t*7))*phase);
   this.drawLightning(r,dt,phase);
  }else if(aura==='enchanted'){
   glow(0xa75cff);
   this.updateShine(r.pick,t);
   this.sheen.setVisible(true).setTexture(this.shineKey).setPosition(x,y).setRotation(rotation).clearTint().setAlpha(.8*phase);
   for(let i=0;i<10;i++){
    const a=t*.8+i*Math.PI*2/10,rad=27+5*Math.sin(t*2+i);
    const px=x+Math.cos(a)*rad,py=y+Math.sin(a)*rad*.78;
    if(i%2)star(front,px,py,6,0xf4d1ff,.8);else{front.fillStyle(0xc391ff,.7*phase);front.fillRect(px,py,3,3);}
   }
   back.lineStyle(1,0xd8a0ff,.22*phase);back.strokeEllipse(x,y,69,48);
  }else{
   glow(0x66ffac);
   this.sheen.setVisible(true).setTexture('pick-'+r.pick).setPosition(x,y).setRotation(rotation).setTintFill(0x61ffae).setAlpha(.14*phase);
   this.echoes.forEach((echo,i)=>echo.setVisible(true).setTexture('pick-'+r.pick).setPosition(x-5-i*5+Math.sin(t*2+i)*3,y+4+i*5).setRotation(rotation-.06-i*.05).setTintFill(0x6effad).setAlpha((.12-i*.035)*phase));
   for(let i=0;i<9;i++){
    const age=(t*.3+i/9)%1,px=x+Math.sin(i*5+t)*29,py=y+24-age*63;
    back.fillStyle(0x7effb8,(1-age)*.13*phase);back.fillCircle(px,py,3+(i%3)*2);
    if(i%3===0)star(front,px,py,5,0xb8ffd1,(1-age)*.55);
   }
  }
 }
 private prepareOutline(pick:Run['pick'],kind:'fire'|'lightning'){
  const source=this.scene.textures.get('pick-'+pick).getSourceImage() as HTMLCanvasElement;
  const key='aura-'+kind+'-'+pick+this.textureSuffix;if(this.scene.textures.exists(key))return source;
  const mask=document.createElement('canvas');mask.width=80;mask.height=80;const ctx=mask.getContext('2d')!;
  ctx.imageSmoothingEnabled=false;
  for(const [dx,dy] of [[-3,0],[3,0],[0,-3],[0,3],[-2,-2],[2,-2],[-2,2],[2,2]])ctx.drawImage(source,8+dx,8+dy);
  ctx.globalCompositeOperation='destination-out';ctx.drawImage(source,8,8);
  ctx.globalCompositeOperation='source-in';ctx.fillStyle=kind==='fire'?'#ffd16b':'#80dcff';ctx.fillRect(0,0,80,80);
  const outline=this.scene.textures.createCanvas(key,80,80)!;
  const out=outline.context;out.shadowColor=kind==='fire'?'#ff681d':'#168cff';out.shadowBlur=9;out.drawImage(mask,0,0);out.shadowBlur=0;out.drawImage(mask,0,0);outline.refresh();
  return source;
 }
 private prepareLightning(pick:Run['pick']){
  if(this.lightningPixels.has(pick))return;
  const source=this.prepareOutline(pick,'lightning');
  const data=source.getContext('2d')!.getImageData(0,0,64,64).data,pixels:{x:number;y:number}[]=[];
  for(let y=0;y<64;y+=2)for(let x=0;x<64;x+=2)if(data[(y*64+x)*4+3]>128)pixels.push({x:x-32,y:y-32});
  this.lightningPixels.set(pick,pixels);
 }
 private spawnSpark(pick:Run['pick']){
  const pixels=this.lightningPixels.get(pick);if(!pixels?.length)return;
  const start=pixels[Math.floor(Math.random()*pixels.length)],angle=Math.random()*Math.PI*2,dx=Math.cos(angle),dy=Math.sin(angle);
  const points=[{...start}],length=8+Math.random()*7,side=Math.random()<.5?-1:1;
  for(let i=1;i<=4;i++){
   const zig=i===4?0:(i%2?1:-1)*(1.5+Math.random()*2)*side;
   points.push({x:start.x+dx*length*i/4-dy*zig,y:start.y+dy*length*i/4+dx*zig});
  }
  this.electricSparks.push({points,age:0,life:.13+Math.random()*.12});
 }
 private drawLightning(r:Run,dt:number,phase:number){
  if(this.reduced&&this.electricSparks.length===0){this.spawnSpark(r.pick);this.spawnSpark(r.pick);}
  for(const spark of this.electricSparks)spark.age+=dt;
  this.electricSparks=this.electricSparks.filter(spark=>spark.age<spark.life);
  this.sparkCarry+=dt*15;const count=Math.floor(this.sparkCarry);this.sparkCarry-=count;
  for(let i=0;i<count;i++)this.spawnSpark(r.pick);
  const rotation=r.angle-Math.PI/2,cos=Math.cos(rotation)*.9,sin=Math.sin(rotation)*.9;
  for(const spark of this.electricSparks){
   const age=spark.age/spark.life,red=Math.round(255*(1-age)),green=Math.round(255-110*age),blue=255;
   const color=(red<<16)|(green<<8)|blue,alpha=(1-age*.8)*phase;
   const points=spark.points.map(p=>({x:r.x+p.x*cos-p.y*sin,y:r.y+p.x*sin+p.y*cos}));
   for(const [width,opacity] of [[4,.2],[1.5,1]] as const){
    this.front.lineStyle(width,color,alpha*opacity);this.front.beginPath();this.front.moveTo(points[0].x,points[0].y);
    for(const p of points.slice(1))this.front.lineTo(p.x,p.y);this.front.strokePath();
   }
  }
 }
 private spawnFire(x:number,y:number,age=0){
  const angle=Math.random()*Math.PI*2,dist=4+Math.random()*15,life=.95+Math.random()*.4;
  const vx=(Math.random()-.5)*23,vy=-24-Math.random()*25;
  this.fireParticles.push({x:x+Math.cos(angle)*dist+vx*age,y:y+Math.sin(angle)*dist*.75+vy*age,vx,vy,age,life,size:4+Math.random()*3.5});
 }
 private drawFire(r:Run,dt:number,phase:number){
  if(Math.hypot(r.x-this.lastX,r.y-this.lastY)>120){this.fireParticles=[];this.lastX=r.x;this.lastY=r.y;}
  for(const particle of this.fireParticles){particle.age+=dt;particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;particle.vy-=7*dt;}
  this.fireParticles=this.fireParticles.filter(p=>p.age<p.life);
  this.fireCarry+=dt*90;const count=Math.floor(this.fireCarry);this.fireCarry-=count;
  for(let i=0;i<count;i++){
   const progress=(i+1)/(count+1);
   this.spawnFire(this.lastX+(r.x-this.lastX)*progress,this.lastY+(r.y-this.lastY)*progress);
  }
  this.lastX=r.x;this.lastY=r.y;
  const stops:[number,number,number,number][]=[[0,255,244,142],[.2,255,191,57],[.43,255,105,37],[.65,190,54,36],[.82,111,72,66],[1,76,76,81]];
  for(const particle of this.fireParticles){
   const age=particle.age/particle.life;let i=1;while(i<stops.length-1&&age>stops[i][0])i++;
   const a=stops[i-1],b=stops[i],mix=Math.max(0,Math.min(1,(age-a[0])/(b[0]-a[0])));
   const red=Math.round(a[1]+(b[1]-a[1])*mix),green=Math.round(a[2]+(b[2]-a[2])*mix),blue=Math.round(a[3]+(b[3]-a[3])*mix);
   const color=(red<<16)|(green<<8)|blue,alpha=(age<.7?.7:.7*(1-age)/.3)*phase,radius=particle.size*(1+age*.65);
   this.back.fillStyle(color,alpha*.15);this.back.fillCircle(particle.x,particle.y,radius*1.65);
   this.back.fillStyle(color,alpha);this.back.fillCircle(particle.x,particle.y,radius);
   if(age<.18){this.back.fillStyle(0xfff7bd,(.18-age)*2.4*phase);this.back.fillCircle(particle.x-1,particle.y-1,radius*.45);}
  }
 }
 private updateShine(pick:Run['pick'],t:number){
  const frame=Math.floor(t*12);if(frame===this.shineFrame&&pick===this.shinePick)return;
  this.shineFrame=frame;this.shinePick=pick;
  const ctx=this.shineTexture.context,source=this.scene.textures.get('pick-'+pick).getSourceImage() as HTMLCanvasElement;
  ctx.save();ctx.clearRect(0,0,64,64);ctx.drawImage(source,0,0,64,64);
  ctx.globalCompositeOperation='source-in';ctx.fillStyle='rgba(155,75,255,.38)';ctx.fillRect(0,0,64,64);
  ctx.globalCompositeOperation='source-atop';ctx.translate(32,32);ctx.rotate(-.65);ctx.fillStyle='rgba(238,191,255,.8)';
  for(let stripe=-100;stripe<100;stripe+=24)ctx.fillRect(stripe+(t*25)%24,-80,7,160);
  ctx.restore();this.shineTexture.refresh();
 }
}
