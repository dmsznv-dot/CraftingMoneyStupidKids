import Phaser from 'phaser';
import {COLS,TILE,WIDTH,PICKS,BLOCKS,BLAST_RADIUS,extendEndlessMine,depthBonusStats} from './core.ts';
import {blockPixels,crackPixels,paint,DEBRIS,CRACK_STAGES} from './textures.ts';
import type {Run,RunEvent,BlockType,Pick,Block} from './core.ts';
import {pickImages} from './pick-sprite.ts';
import {PickAura} from './aura.ts';
import {PLANT_ART,PLANT_COLORS,surfacePlants} from './surface-plants.ts';
import type {Aura} from './progress.ts';
export interface Bridge {run:()=>Run;aura:()=>Aura;cue:()=>{x:number;y:number;dir:number}|null;tick:(dt:number)=>void;select:(column:number)=>void;ready:()=>void;effect:(e:RunEvent)=>void;placing:()=>boolean;exitText:()=>string}
const BLOCK_TYPES=Object.keys(BLOCKS) as BlockType[];
const blockTexture=(b:Block,r:Run)=>{
 const variant=(b.x+b.y)%3;
 if(b.type==='drill'||b.type==='magnet'){
  const count=r.mode==='endless'?depthBonusStats(b.y).drill:10,tier=count===4?1:count===7?2:3;
  return `${b.type}-tier${tier}-${variant}`;
 }
 return (b.y===4&&b.type==='dirt'?'grass':b.type)+variant;
};
export class MineScene extends Phaser.Scene {
 bridge:Bridge;g!:Phaser.GameObjects.Graphics;sky!:Phaser.GameObjects.Graphics;landscape!:Phaser.GameObjects.Graphics;clouds!:Phaser.GameObjects.Graphics;plants!:Phaser.GameObjects.Graphics;pick!:Phaser.GameObjects.Image;pickDepth:Phaser.GameObjects.Image[]=[];outline!:Phaser.GameObjects.Graphics;blockViews=new Map<Block,{image:Phaser.GameObjects.Image;crack?:Phaser.GameObjects.Image;hp:number;type:BlockType}>();caveLayers:Phaser.GameObjects.TileSprite[]=[];sideWalls!:Phaser.GameObjects.Graphics;depthTexture!:Phaser.Textures.CanvasTexture;meadowTexture!:Phaser.Textures.CanvasTexture;treeTexture!:Phaser.Textures.CanvasTexture;treeLayer!:Phaser.GameObjects.Image;depthLayer!:Phaser.GameObjects.Image;lastRun='';acc=0;cameraFollow=false;meadowCenterY=NaN;meadowSeed=-1;meadowGround=-1;
 particles:{x:number;y:number;vx:number;vy:number;life:number;max:number;color:number;size:number}[]=[];
 labels:Phaser.GameObjects.Text[]=[];
 oreLabels:Phaser.GameObjects.Text[]=[];
 pickAura!:PickAura;
 rings:{x:number;y:number;life:number;color:number;size:number}[]=[];viewZoom=1;
 constructor(bridge:Bridge){super('mine');this.bridge=bridge;}
 create(){
  this.makeTextures();this.g=this.add.graphics();this.sky=this.add.graphics().setDepth(0);this.clouds=this.add.graphics().setDepth(.1);this.landscape=this.add.graphics().setDepth(.4);this.plants=this.add.graphics().setDepth(3.5);this.outline=this.add.graphics().setDepth(5);
  this.add.image(285,3,'sun-glow').setDepth(.2);
  this.add.image(0,0,'surface-meadow').setOrigin(0).setDepth(1.2);
  this.sideWalls=this.add.graphics().setDepth(.8);
  this.treeLayer=this.add.image(0,0,'surface-trees').setOrigin(0).setDepth(.9);
  this.caveLayers=['dirt0','stone0','cave0'].map((texture,i)=>{const layer=this.add.tileSprite(WIDTH/2,128,WIDTH,32,texture).setOrigin(.5,0).setDepth(1).setTileScale(2/3);if(i<2)layer.setTint(0x777777);return layer;});
  this.depthLayer=this.add.image(0,0,'mine-depth').setOrigin(0).setDepth(1.5);
  this.pickDepth=[0,1].map(i=>this.add.image(226+i,63-i,'pick-wood').setDepth(3.7+i*.05).setScale(.9).setTint(0x624b32));
  this.pick=this.add.image(224,64,'pick-wood').setDepth(4).setScale(.9);
  this.pickAura=new PickAura(this);
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{const pos=this.cameras.main.getWorldPoint(p.x,p.y);if(this.bridge.run().status==='ready'&&pos.y<150)this.bridge.select(Math.max(0,Math.min(COLS-1,Math.floor(pos.x/TILE))));});
  this.scale.on('resize',()=>this.resize());this.resize();this.bridge.ready();
 }
 makeTextures(){
  const canvas=(key:string,size:number)=>{const tex=this.textures.createCanvas(key,size,size)!;tex.context.imageSmoothingEnabled=false;return tex;};
  for(const type of [...BLOCK_TYPES,'grass','grassTop','cave','treeWood','treeLeaves','cobble'] as const)for(let variant=0;variant<3;variant++){
   const tex=canvas(type+variant,48);paint(tex.context,blockPixels(type,variant),3);tex.refresh();
  }
  for(const type of ['drill','magnet'] as const)for(const tier of [1,2,3] as const)for(let variant=0;variant<3;variant++){
   const tex=canvas(`${type}-tier${tier}-${variant}`,48);paint(tex.context,blockPixels(type,variant,tier),3);tex.refresh();
  }
  this.depthTexture=canvas('mine-depth',1);
  const sun=canvas('sun-glow',160),sunCtx=sun.context;
  const glow=sunCtx.createRadialGradient(80,80,9,80,80,76);
  glow.addColorStop(0,'rgba(255,250,218,.55)');glow.addColorStop(.32,'rgba(255,248,210,.25)');glow.addColorStop(.7,'rgba(245,247,225,.07)');glow.addColorStop(1,'rgba(245,247,225,0)');
  sunCtx.fillStyle=glow;sunCtx.fillRect(0,0,160,160);
  sunCtx.fillStyle='#ffffff';sunCtx.fillRect(65,65,30,30);sun.refresh();
  this.treeTexture=canvas('surface-trees',1);
  this.meadowTexture=this.textures.createCanvas('surface-meadow',WIDTH,256)!;this.meadowTexture.context.imageSmoothingEnabled=false;
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
  if(this.lastRun!==r.id){this.meadowSeed=-1;for(const view of this.blockViews.values()){view.image.destroy();view.crack?.destroy();}this.blockViews.clear();this.lastRun=r.id;this.particles=[];this.rings=[];for(const label of this.labels)label.destroy();this.labels=[];this.oreLabels=[];}
  if(r.status==='ready'){
   this.cameraFollow=false;cam.centerOn(WIDTH/2,180);
   // Older saved ready runs may not have generated the whole visible mine yet.
   if(r.mode==='endless')while(r.rows*TILE<cam.worldView.bottom+TILE){const rows=r.rows;extendEndlessMine(r);if(r.rows===rows)break;}
  }else{
   if(!this.cameraFollow&&r.y>=cam.worldView.centerY)this.cameraFollow=true;
   if(this.cameraFollow){const center=cam.worldView.centerY;cam.centerOn(WIDTH/2,center+(r.y-center)*Math.min(1,delta/1000*8));}
  }
  const meadowGround=r.blocks.reduce((mask,b)=>b.y===4&&b.type==='dirt'&&b.hp>0?mask|(1<<b.x):mask,0);
  if(cam.worldView.y<4*TILE+32&&(this.meadowSeed!==(r.seed??41)||this.meadowGround!==meadowGround||Math.abs(this.meadowCenterY-cam.worldView.centerY)>1)){this.drawMeadow(r.seed??41,cam.worldView.centerX,cam.worldView.centerY,meadowGround);this.meadowSeed=r.seed??41;this.meadowCenterY=cam.worldView.centerY;this.meadowGround=meadowGround;}
  const indicator=document.querySelector<HTMLElement>('#drop-indicator');
  if(indicator){
   const visible=r.status==='ready'&&!this.bridge.placing();indicator.hidden=!visible;
   if(visible){indicator.style.left=`${(r.x-cam.worldView.x)*cam.zoom}px`;indicator.style.top=`${(r.y-cam.worldView.y)*cam.zoom}px`;indicator.style.setProperty('--hint-zoom',String(cam.zoom));}
  }
  // The sky belongs to the surface, so it scrolls away with the world as the pick descends.
  const view=cam.worldView;this.sky.clear();
  this.sideWalls.clear();this.sideWalls.fillStyle(0x000000);
  if(view.x<0)this.sideWalls.fillRect(view.x,view.y,Math.min(0,view.right)-view.x,view.height);
  if(view.right>WIDTH)this.sideWalls.fillRect(Math.max(WIDTH,view.x),view.y,view.right-Math.max(WIDTH,view.x),view.height);
  // The cave texture is on the back plane: its surface edge must follow the
  // same projection as the rear edges of the foreground blocks.
  const surfaceBack=view.centerY+(4*TILE-view.centerY)*.94;
  if(view.y<surfaceBack){this.sky.fillStyle(0x78a7ff);this.sky.fillRect(view.x,view.y,view.width,surfaceBack-view.y);}
  this.drawClouds(view,surfaceBack);this.drawHills(view,surfaceBack);
  // 100-block bands measured from the first surface row, on the same back plane.
  const backY=(y:number)=>view.centerY+(y-view.centerY)*.94;
  const bounds=[surfaceBack,backY((4+100)*TILE),backY((4+200)*TILE),Infinity];
  this.caveLayers.forEach((layer,i)=>{
   const top=Math.max(bounds[i],view.y),bottom=Math.min(bounds[i+1],view.bottom);
   layer.setVisible(bottom>top);
   if(bottom>top){layer.setPosition(WIDTH/2,top).setSize(WIDTH,bottom-top);layer.tilePositionY=(top-bounds[i])*1.5;}
  });
  this.drawBackdrop(r);this.drawSurfaceTrees();
  const present=new Set(r.blocks);
  for(const [block,view] of this.blockViews)if(!present.has(block)){view.image.destroy();view.crack?.destroy();this.blockViews.delete(block);}
  for(const b of r.blocks){
   let view=this.blockViews.get(b);
   if(!view){view={image:this.add.image(b.x*TILE+16,b.y*TILE+16,blockTexture(b,r)).setDepth(2).setScale(2/3),hp:NaN,type:b.type};this.blockViews.set(b,view);}
   const img=view.image;
   if(view.type!==b.type){view.type=b.type;img.setTexture(blockTexture(b,r));view.hp=NaN;}
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
  this.drawPerspective(r);this.drawSurfacePlants(r);
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
   g.lineStyle(1,0x6dc6a7,.35);
   if(this.bridge.placing())for(let x=0;x<COLS;x++)g.strokeRect(x*TILE+1,3*TILE+1,30,30);
  }
 }
 /** Flat cloud volumes: each depth step uses the same perspective as mine blocks. */
 drawClouds(view:Phaser.Geom.Rectangle,surfaceBack:number){
  const g=this.clouds;g.clear();if(view.y>=surfaceBack)return;
  type P={x:number;y:number};
  const project=(x:number,y:number,z:number):P=>{const scale=Math.pow(.94,z);return{x:view.centerX+(x-view.centerX)*scale,y:view.centerY+(y-view.centerY)*scale};};
  const quad=(color:number,points:P[])=>{g.fillStyle(color,1);g.beginPath();g.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))g.lineTo(p.x,p.y);g.closePath();g.fillPath();};
  const shapes=[
   {x:-265,y:-85,z:3,rows:['.####.....','#######...','########..','..#######.','..########','...######.','....####..','.....###..']},
   {x:410,y:-82,z:4,rows:['...#####..','.#######..','#########.','##########','..########','..######..','...#####..','....###...']},
   {x:5,y:-155,z:0,rows:['.######...','########..','#########.','..########','..########','...######.','....####..','.....###..']},
  ];
  // Paint distant cells first; the shared cell edges match in every depth layer.
  for(const shape of shapes){
   const rows=shape.rows,cell=27,step=1.5,thickness=7,exists=(row:number,col:number)=>rows[row]?.[col]==='#';
   for(let row=rows.length-1;row>=0;row--)for(let col=0;col<rows[row].length;col++){
    if(!exists(row,col))continue;
    const x=shape.x+col*cell,x1=x+cell,z=shape.z+row*step,z1=z+step,y=shape.y,bottom=y+thickness;
    const p=(xx:number,yy:number,zz:number)=>project(xx,yy,zz);
    quad(0xbac9dc,[p(x,bottom,z),p(x1,bottom,z),p(x1,bottom,z1),p(x,bottom,z1)]);
    if(!exists(row-1,col))quad(0xeef5ff,[p(x,y,z),p(x1,y,z),p(x1,bottom,z),p(x,bottom,z)]);
    if(x+cell<=view.centerX&&!exists(row,col+1))quad(0xd6e3f2,[p(x1,y,z),p(x1,y,z1),p(x1,bottom,z1),p(x1,bottom,z)]);
    else if(x>=view.centerX&&!exists(row,col-1))quad(0xd6e3f2,[p(x,y,z1),p(x,y,z),p(x,bottom,z),p(x,bottom,z1)]);
   }
  }
 }
 /** Distant stepped silhouettes project toward the same vanishing point as the blocks. */
 drawHills(view:Phaser.Geom.Rectangle,surfaceBack:number){
  const g=this.landscape;g.clear();if(view.y>=surfaceBack)return;
  const hill=(z:number,color:number,alpha:number,points:[number,number][])=>{
   const scale=Math.pow(.94,z),project=(x:number,y:number)=>({x:view.centerX+(x-view.centerX)*scale,y:Math.min(surfaceBack,view.centerY+(y-view.centerY)*scale)});
   const first=project(points[0][0],points[0][1]-20);g.fillStyle(color,alpha);g.beginPath();g.moveTo(first.x,first.y);
   for(const [x,y] of points.slice(1)){const p=project(x,y-20);g.lineTo(p.x,p.y);}
   const last=project(points[points.length-1][0],128);g.lineTo(last.x,surfaceBack);g.lineTo(first.x,surfaceBack);g.closePath();g.fillPath();
  };
  hill(8,0x799fbc,.72,[[-250,98],[-190,98],[-190,83],[-130,83],[-130,68],[-80,68],[-80,82],[-35,82],[-35,95],[25,95],[25,105],[120,105],[120,89],[170,89],[170,76],[220,76],[220,90],[270,90],[270,100],[350,100],[350,83],[410,83],[410,72],[460,72],[460,89],[520,89],[520,101],[700,101]]);
  hill(6,0x719b8e,.72,[[-200,112],[-150,112],[-150,102],[-100,102],[-100,88],[-50,88],[-50,99],[0,99],[0,111],[95,111],[95,103],[145,103],[145,95],[185,95],[185,107],[260,107],[260,113],[330,113],[330,101],[380,101],[380,94],[430,94],[430,105],[495,105],[495,113],[650,113]]);
 }
 /** Decorative block trees sit behind the playable layer and have no collision. */
 drawSurfaceTrees(){
  const view=this.cameras.main.worldView,tex=this.treeTexture;
  const width=Math.max(1,Math.ceil(view.width)),height=Math.max(1,Math.ceil(view.height));
  if(tex.width!==width||tex.height!==height){tex.setSize(width,height);this.treeLayer.setTexture('surface-trees');}
  this.treeLayer.setPosition(view.x,view.y);
  const ctx=tex.context;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
  if(view.y>4*TILE||view.bottom< -2*TILE){tex.refresh();return;}
  type Point={x:number;y:number};
  // A cube one block farther away uses exactly the mine's perspective transform.
  const point=(x:number,y:number,z:number):Point=>{const scale=Math.pow(.94,z);return{x:Math.round(view.centerX+(x-view.centerX)*scale-view.x),y:Math.round(view.centerY+(y-view.centerY)*scale-view.y)};};
  const face=(source:HTMLCanvasElement,a:Point,b:Point,c:Point,d:Point,shade:number)=>{
   const triangle=(p:Point,q:Point,r:Point,m11:number,m12:number,m21:number,m22:number)=>{
    ctx.save();ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.lineTo(r.x,r.y);ctx.closePath();ctx.clip();
    ctx.setTransform(m11,m12,m21,m22,a.x,a.y);ctx.drawImage(source,0,0);ctx.restore();
   };
   triangle(a,b,c,(b.x-a.x)/48,(b.y-a.y)/48,(c.x-b.x)/48,(c.y-b.y)/48);
   triangle(a,c,d,(c.x-d.x)/48,(c.y-d.y)/48,(d.x-a.x)/48,(d.y-a.y)/48);
   ctx.fillStyle=`rgba(0,0,0,${shade})`;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.fill();
  };
  // Each crown is a continuous 3-block-deep cluster, rather than overlapping
  // separate scaled silhouettes. The front faces all share one voxel grid.
  for(const tree of [{trunk:10,depth:5},{trunk:1,depth:2}]){
   const {trunk,depth}=tree;
   const crown=[...[-4,-3].flatMap(y=>[-1,0,1].map(dx=>({x:trunk+dx,y}))),{x:trunk,y:-5}];
   const trunkBlocks=[{x:trunk,y:-2},{x:trunk,y:-1}];
   const render=(blocks:{x:number;y:number}[],type:'treeWood'|'treeLeaves',front:number,thickness:number)=>{
    const occupied=new Set(blocks.map(b=>`${b.x},${b.y}`));
    for(const b of blocks){
     const x=b.x*TILE,y=(4+b.y)*TILE,source=(this.textures.get(type+((b.x-b.y+30)%3)) as Phaser.Textures.CanvasTexture).canvas;
     for(let z=front+thickness-1;z>=front;z--){
      const p=(px:number,py:number)=>point(px,py,z),back=(px:number,py:number)=>point(px,py,z+1);
      if(x+TILE<=view.centerX&&!occupied.has(`${b.x+1},${b.y}`))face(source,p(x+TILE,y),back(x+TILE,y),back(x+TILE,y+TILE),p(x+TILE,y+TILE),.28);
      else if(x>=view.centerX&&!occupied.has(`${b.x-1},${b.y}`))face(source,back(x,y),p(x,y),p(x,y+TILE),back(x,y+TILE),.28);
      if(y>=view.centerY&&!occupied.has(`${b.x},${b.y-1}`))face(source,p(x,y),p(x+TILE,y),back(x+TILE,y),back(x,y),.12);
      if(y+TILE<=view.centerY&&!occupied.has(`${b.x},${b.y+1}`))face(source,back(x,y+TILE),back(x+TILE,y+TILE),p(x+TILE,y+TILE),p(x,y+TILE),.38);
     }
     const a=point(x,y,front),c=point(x+TILE,y+TILE,front);
     ctx.drawImage(source,a.x,a.y,c.x-a.x,c.y-a.y);
    }
   };
   render(crown,'treeLeaves',depth-1,3);
   // The exposed trunk stays in front of the crown's lower face.
   render(trunkBlocks,'treeWood',depth,1);
  }
  tex.refresh();
 }
 /** A non-colliding grass field behind the playable surface, rendered as receding tiles. */
 drawMeadow(seed:number,centerX:number,centerY:number,ground:number){
  const texture=this.meadowTexture,ctx=texture.context;ctx.clearRect(0,0,WIDTH,256);ctx.imageSmoothingEnabled=false;
  // The decorative surface must never show through holes below ground level.
  // At some camera positions its projected back edge falls below the horizon.
  ctx.save();ctx.beginPath();for(let col=0;col<COLS;col++)if(ground&(1<<col))ctx.rect(col*TILE,0,TILE,4*TILE);ctx.clip();
  type P={x:number;y:number};
  // Each unit of depth uses the same .94 perspective transform as the block faces.
  const point=(x:number,z:number,height=0):P=>{const scale=Math.pow(.94,z);return{x:centerX+(x-centerX)*scale,y:centerY+(128-height-centerY)*scale};};
  const drawTile=(source:HTMLCanvasElement,a:P,b:P,c:P,d:P)=>{
   const triangle=(v:P,w:P,q:P,m11:number,m12:number,m21:number,m22:number)=>{
    ctx.save();ctx.beginPath();ctx.moveTo(v.x,v.y);ctx.lineTo(w.x,w.y);ctx.lineTo(q.x,q.y);ctx.closePath();ctx.clip();
    ctx.setTransform(m11,m12,m21,m22,a.x,a.y);ctx.drawImage(source,0,0);ctx.restore();
   };
   triangle(a,b,c,(b.x-a.x)/48,(b.y-a.y)/48,(c.x-b.x)/48,(c.y-b.y)/48);
   triangle(a,c,d,(c.x-d.x)/48,(c.y-d.y)/48,(d.x-a.x)/48,(d.y-a.y)/48);
   ctx.strokeStyle='rgba(27,61,26,.22)';ctx.lineWidth=.45;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.stroke();
  };
  // Paint from back to front so the near edge meets the top of the surface blocks.
  for(let row=4;row>=0;row--)for(let col=0;col<COLS;col++){
   const variant=((col+row+(seed>>>0))%3),source=(this.textures.get('grassTop'+variant) as Phaser.Textures.CanvasTexture).canvas;
   drawTile(source,point(col*TILE,row+1),point((col+1)*TILE,row+1),point((col+1)*TILE,row),point(col*TILE,row));
  }
  // Sparse crossed-plane plants provide depth cues without adding colliders.
  for(let row=4;row>=1;row--)for(const plant of surfacePlants((seed+Math.imul(row,2654435761))>>>0).slice(0,3)){
   const baseX=plant.column*TILE+4+plant.offset,baseZ=row+.5,px=1.5,rows=PLANT_ART[plant.kind],palette=PLANT_COLORS[plant.kind];
   for(const plane of [0,1]){
    const depth=(u:number)=>baseZ+(plane===0?-.35+.7*u/16:.35-.7*u/16);
    const flip=(plant.column%2===1)!==(plane===1&&plant.kind==='grass');
    rows.forEach((line,dy)=>{for(let dx=0;dx<line.length;dx++){
     const color=palette[line[dx]];if(color===undefined)continue;
     const u=flip?15-dx:dx,x0=baseX+u*px,x1=baseX+(u+1)*px,h0=(16-dy)*px,h1=(15-dy)*px;
     const a=point(x0,depth(u),h0),b=point(x1,depth(u+1),h0),c=point(x1,depth(u+1),h1),d=point(x0,depth(u),h1);
     ctx.fillStyle='#'+color.toString(16).padStart(6,'0');ctx.globalAlpha=plane===0?.8:1;
     ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.fill();
    }});
   }
  }
  ctx.restore();texture.refresh();
 }
 drawSurfacePlants(r:Run){
  const g=this.plants;g.clear();const view=this.cameras.main.worldView;
  if(view.y>4*TILE||view.bottom<3*TILE)return;
  const ground=new Set(r.blocks.filter(b=>b.y===4&&b.type==='dirt'&&b.hp>0).map(b=>b.x));
  // Two vertical diagonal planes intersect at the middle of the surface block.
  // Project their depth with the same vanishing point as the block faces.
  const project=(x:number,y:number,z:number)=>({
   x:view.centerX+(x-view.centerX)*(1-.06*z),
   y:view.centerY+(y-view.centerY)*(1-.06*z),
  });
  for(const plant of surfacePlants(r.seed??41)){
   if(!ground.has(plant.column))continue;
   const px=1.5,x=plant.column*TILE+4+plant.offset,y=4*TILE-16*px;
   const rows=PLANT_ART[plant.kind],palette=PLANT_COLORS[plant.kind];
   for(const plane of [0,1]){
    const depth=(u:number)=>plane===0?.08+.84*u/16:.92-.84*u/16;
    const flip=(plant.column%2===1)!==(plane===1&&plant.kind==='grass');
    rows.forEach((row,dy)=>{for(let dx=0;dx<row.length;dx++){
     const color=palette[row[dx]];if(color===undefined)continue;
     const u=flip?15-dx:dx,x0=x+u*px,x1=x+(u+1)*px,y0=y+dy*px,y1=y+(dy+1)*px;
     const a=project(x0,y0,depth(u)),b=project(x1,y0,depth(u+1));
     const c=project(x1,y1,depth(u+1)),d=project(x0,y1,depth(u));
     g.fillStyle(color,plane===0?.78:1);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);
     g.lineTo(c.x,c.y);g.lineTo(d.x,d.y);g.closePath();g.fillPath();
    }});
   }
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
   const base=b.y===4&&b.type==='dirt'?'grass':b.type,source=(this.textures.get(blockTexture(b,r)) as Phaser.Textures.CanvasTexture).canvas;
   // Side faces map texture vertical to world vertical; the old vertex order rotated them.
   if(x+TILE<=view.centerX&&!solid.has(`${b.x+1},${b.y}`))face(source,point(x+TILE,y),back(x+TILE,y),back(x+TILE,y+TILE),point(x+TILE,y+TILE),.28);
   else if(x>=view.centerX&&!solid.has(`${b.x-1},${b.y}`))face(source,back(x,y),point(x,y),point(x,y+TILE),back(x,y+TILE),.28);
   if(y+TILE<=view.centerY&&!solid.has(`${b.x},${b.y+1}`)){
    const bottomSource=base==='grass'?(this.textures.get('dirt'+((b.x+b.y)%3)) as Phaser.Textures.CanvasTexture).canvas:source;
    face(bottomSource,back(x,y+TILE),back(x+TILE,y+TILE),point(x+TILE,y+TILE),point(x,y+TILE),.38);
   }
   else if(y>=view.centerY&&!solid.has(`${b.x},${b.y-1}`)){
    const topSource=base==='grass'?(this.textures.get('grassTop'+((b.x+b.y)%3)) as Phaser.Textures.CanvasTexture).canvas:source;
    face(topSource,point(x,y),point(x+TILE,y),back(x+TILE,y),back(x,y),.12);
   }
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

 }
 fx(e:RunEvent){
  const r=this.bridge.run(),tier=PICKS[r.pick].tier;
  if(e.type==='skill'){
   this.rings.push({x:e.x,y:e.y,life:.55,color:0x83e8ff,size:e.value??3*TILE});
   for(let i=0;i<16;i++){const angle=i*Math.PI/8,speed=70+(i%4)*28;this.particles.push({x:e.x,y:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:.35,max:.35,color:i%2?0x9bedff:0xffffff,size:3});}
   return;
  }
  if(e.type==='break'&&e.value){
   const index=this.oreLabels.length,x=r.x+((index%3)-1)*20,y=r.y-24-Math.floor(index/3)*14;
   const label=this.add.text(x,y,'+'+e.value,{fontFamily:'Arial',fontSize:e.value>=10?'20px':'17px',fontStyle:'bold',color:'#ffe59d',stroke:'#1b2017',strokeThickness:4}).setOrigin(.5).setDepth(9);
   this.labels.push(label);this.oreLabels.push(label);this.tweens.add({targets:label,y:y-46,alpha:0,duration:950,ease:'Cubic.easeOut',onComplete:()=>{label.destroy();this.labels=this.labels.filter(l=>l!==label);this.oreLabels=this.oreLabels.filter(l=>l!==label);}});
   this.rings.push({x:e.x,y:e.y,life:.35,color:0xffdb81,size:25});
  }
  if(e.type==='bonus'){
   const symbol=e.kind==='double'?'×2':e.kind==='sweep'?'↔':e.kind==='repair'?'+':e.kind==='relic'?'◆':e.kind==='onehit'?'ϟ':e.kind==='phase'?'◌':e.kind==='bench'?'⚒':e.kind==='drill'?'↓'+(e.value??10):e.kind==='magnet'?'M':e.kind==='curse'?'−25%':e.kind==='shield'?'⬡':e.kind==='coalCharge'?'TNT':e.kind==='vein'?'+'+e.value:e.kind==='helmet'?'⛑':'↔';
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
