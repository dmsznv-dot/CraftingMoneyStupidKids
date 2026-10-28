import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BLOCKS,createRun,pickDamage,stepRun} from '../src/core.ts';
import type {BlockType,Pick} from '../src/core.ts';
import {freshProgress} from '../src/progress.ts';
import {decodeProgress} from '../src/storage.ts';

test('basic blocks reward upgrading and one-hit bonus changes the outcome of a collision',()=>{
 const blows=(pick:Pick,type:BlockType)=>Math.ceil(BLOCKS[type].hp/pickDamage(pick,type));
 for(const type of ['dirt','coal','copper','stone'] as BlockType[]){assert.ok(blows('wood',type)>1);assert.ok(blows('stone',type)>1);}
 assert.equal(blows('iron','dirt'),1);assert.equal(blows('iron','coal'),1);assert.equal(blows('gold','stone'),1);
 const collision=(oneHit:boolean)=>{const r=createRun(0,'wood','none',false,123);r.blocks=[{x:6,y:6,type:'stone',hp:BLOCKS.stone.hp}];r.status='playing';r.x=208;r.y=200;r.vx=0;r.vy=40;r.spin=0;r.angle=Math.PI/4+Math.PI;if(oneHit)r.oneHitTime=5;stepRun(r,1/120);return r;};
 const normal=collision(false),bonus=collision(true);assert.ok(normal.hits>0&&normal.blocks[0].hp>0);assert.ok(bonus.hits>0&&bonus.blocks[0].hp===0);
});

test('old endless saves preserve partially damaged blocks and migrate only once',()=>{
 const p=freshProgress(),r=createRun(0,'wood','none',false,123);delete r.blockBalanceVersion;r.status='playing';
 r.blocks=[{x:6,y:6,type:'dirt',hp:.5},{x:7,y:6,type:'coal',hp:1},{x:8,y:6,type:'copper',hp:0},{x:9,y:6,type:'stone',hp:1.25}];p.endlessAttempt=r;p.coins=900;
 const first=decodeProgress(JSON.stringify(p));assert.ok(first?.endlessAttempt);assert.equal(first.coins,900);
 assert.deepEqual(first.endlessAttempt.blocks.map(b=>b.hp),[.9,1.8,0,1.6]);
 const again=decodeProgress(JSON.stringify(first));assert.deepEqual(again?.endlessAttempt?.blocks.map(b=>b.hp),[.9,1.8,0,1.6]);
});

test('magnet and drill strengthen at 100 and 200 blocks',async()=>{
 const {collectBlock,TILE}=await import('../src/core.ts');
 for(const [row,count,seconds] of [[4,4,1.5],[103,4,1.5],[104,7,2],[203,7,2],[204,10,3]] as const){
  const r=createRun(0,'wood','none',false,123);r.status='playing';r.x=7*TILE+16;r.y=row*TILE+16;
  r.blocks=Array.from({length:12},(_,i)=>({x:7,y:row+i+1,type:'stone' as const,hp:BLOCKS.stone.hp}));
  collectBlock(r,{x:7,y:row,type:'drill',hp:1});assert.equal(r.blocks.filter(b=>b.hp===0).length,count);assert.equal(r.events.find(e=>e.kind==='drill')?.value,count);
  collectBlock(r,{x:7,y:row,type:'magnet',hp:1});assert.equal(r.magnetTime,seconds);assert.equal(r.events.at(-1)?.value,seconds);
 }
});

test('early mines have more drills, restrained magnets and rare shields',async()=>{
 const {extendEndlessMine}=await import('../src/core.ts');
 const bands=Array.from({length:2},()=>({cells:0,drill:0,magnet:0,shield:0}));
 for(let seed=1;seed<=50;seed++){
  const r=createRun(0,'wood','none',false,seed);while(r.rows<310)extendEndlessMine(r);
  for(const b of r.blocks){const depth=b.y-4;if(depth<0||depth>=300||depth>=100&&depth<200)continue;const band=bands[depth<100?0:1];band.cells++;if(b.type==='drill'||b.type==='magnet'||b.type==='shield')band[b.type]++;}
 }
 assert.ok(bands[0].drill/bands[0].cells>.06&&bands[0].drill/bands[0].cells<.12);
 assert.ok(bands[0].magnet/bands[0].cells<bands[1].magnet/bands[1].cells*.7);
 for(const band of bands)assert.ok(band.shield/band.cells<.001);
});

test('row clear activates the drill and applies its depth-specific effect',async()=>{
 const {collectBlock,TILE}=await import('../src/core.ts');
 for(const reverse of [false,true]){
  const r=createRun(0,'wood','none',false,512);r.status='playing';r.x=7*TILE+16;r.y=5*TILE+16;
  const sweep={x:3,y:8,type:'sweep' as const,hp:1},drill={x:10,y:8,type:'drill' as const,hp:1};
  const targets=[6,7,9].map(y=>({x:7,y,type:'stone' as const,hp:BLOCKS.stone.hp}));
  r.blocks=reverse?[drill,sweep,...targets]:[sweep,drill,...targets];collectBlock(r,sweep);
  assert.equal(drill.hp,0);assert.deepEqual(targets.map(b=>b.hp),[0,0,0]);
  assert.equal(r.events.filter(e=>e.type==='bonus'&&e.kind==='drill').length,1);assert.equal(r.events.find(e=>e.kind==='drill')?.value,4);
 }
});
test('a drill that breaks a row clear can queue another drill only once',async()=>{
 const {collectBlock,TILE}=await import('../src/core.ts');const r=createRun(0,'wood','none',false,987);r.status='playing';r.x=7*TILE+16;r.y=5*TILE+16;
 const first={x:2,y:5,type:'drill' as const,hp:1},sweep={x:7,y:6,type:'sweep' as const,hp:1},second={x:10,y:6,type:'drill' as const,hp:1};
 r.blocks=[first,sweep,second,...[7,8,9].map(y=>({x:7,y,type:'coal' as const,hp:BLOCKS.coal.hp}))];collectBlock(r,first);
 assert.equal(second.hp,0);assert.equal(r.events.filter(e=>e.type==='bonus'&&e.kind==='drill').length,2);assert.equal(r.ore,3);assert.ok(r.events.length<30);
});
test('drill and magnet block art changes across all three strengths',async()=>{
 const {blockPixels}=await import('../src/textures.ts');
 for(const type of ['drill','magnet'] as const){const art=([1,2,3] as const).map(tier=>blockPixels(type,0,tier).join(','));assert.equal(new Set(art).size,3);}
});

test('drill breaks four actual blocks in the column under the pick even on a column boundary',async()=>{
 const {collectBlock,TILE}=await import('../src/core.ts');
 for(const x of [7*TILE+1,8*TILE-1,8*TILE]){
  const r=createRun(0,'wood','none',false,725);r.status='playing';r.x=x;r.y=5*TILE+16;
  const column=Math.floor(x/TILE),neighbour=column===7?8:7;
  const drill={x:column,y:6,type:'drill' as const,hp:1};
  const targets=[7,8,10,12,13].map(y=>({x:column,y,type:'stone' as const,hp:BLOCKS.stone.hp}));
  const adjacent=[6,7,8,9,10,11,12].map(y=>({x:neighbour,y,type:'stone' as const,hp:BLOCKS.stone.hp}));
  r.blocks=[drill,...targets,...adjacent];collectBlock(r,drill);
  assert.deepEqual(targets.map(b=>b.hp),[0,0,0,0,BLOCKS.stone.hp]);
  assert.ok(adjacent.every(b=>b.hp===BLOCKS.stone.hp));assert.equal(r.events.find(e=>e.kind==='drill')?.value,4);
 }
});

test('upgraded picks take half the wear from dirt and stone',()=>{
 const loss=(pick:Pick,type:'dirt'|'stone')=>{
  const r=createRun(0,pick,'none',false,123);r.blocks=[{x:6,y:6,type,hp:BLOCKS[type].hp}];r.status='playing';r.x=208;r.y=200;r.vx=0;r.vy=40;r.spin=0;r.angle=Math.PI/4+Math.PI;const hp=r.hp;stepRun(r,1/120);assert.ok(r.hits>0);return hp-r.hp;
 };
 for(const type of ['dirt','stone'] as const){const wood=loss('wood',type);assert.equal(loss('stone',type),wood/2);assert.equal(loss('iron',type),wood/2);}
});
