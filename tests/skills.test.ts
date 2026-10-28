import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activateSkill,BLOCKS,createRun,stepRun,TILE} from '../src/core.ts';
import type {SkillAura} from '../src/core.ts';
import {buy,freshProgress,PRICES} from '../src/progress.ts';
import {decodeProgress} from '../src/storage.ts';
const skill=(aura:SkillAura,charges=1)=>{const r=createRun(0,'wood','none',false,123);r.blocks=[];r.status='playing';r.skillAura=aura;r.skillLevel=charges;r.skillCharges=charges;return r;};

test('skills require a live run and consume one charge per activation',()=>{
 const r=skill('ghost',2);r.status='ready';assert.equal(activateSkill(r),false);r.status='playing';assert.equal(activateSkill(r),true);assert.equal(r.phaseTime,3);assert.equal(r.skillCharges,1);assert.equal(activateSkill(r),true);assert.equal(activateSkill(r),false);assert.equal(r.skillCharges,0);
});
test('fire protects against block wear and expires',()=>{
 const r=skill('fire');assert.equal(activateSkill(r),true);r.blocks=[{x:6,y:6,type:'stone',hp:BLOCKS.stone.hp}];r.x=208;r.y=200;r.vx=0;r.vy=40;r.spin=0;r.angle=Math.PI/4+Math.PI;const hp=r.hp;stepRun(r,1/120);assert.ok(r.hits>0);assert.equal(r.hp,hp);
 r.blocks=[];for(let i=0;i<190;i++)stepRun(r,1/60);assert.equal(r.skillFireTime,0);
});
test('lightning collects only ore in the three-block radius once',()=>{
 const r=skill('lightning');r.x=7*TILE+16;r.y=10*TILE+16;r.blocks=[{x:7,y:10,type:'coal',hp:1},{x:10,y:10,type:'gem',hp:4},{x:11,y:10,type:'gold',hp:3},{x:7,y:11,type:'dirt',hp:1.8},{x:6,y:10,type:'tnt',hp:1}];
 assert.equal(activateSkill(r),true);assert.deepEqual(r.blocks.map(b=>b.hp),[0,0,3,1.8,1]);assert.equal(r.ore,BLOCKS.coal.ore+BLOCKS.gem.ore);assert.equal(activateSkill(r),false);
});
test('magic drill accelerates downward, breaks contacted blocks and expires',()=>{
 const r=skill('enchanted');r.x=208;r.y=180;r.vx=0;r.vy=0;r.spin=0;r.angle=Math.PI/4+Math.PI;r.blocks=[{x:6,y:6,type:'stone',hp:BLOCKS.stone.hp}];assert.equal(activateSkill(r),true);assert.equal(r.skillDrillTime,2);for(let i=0;i<10;i++)stepRun(r,1/120);assert.equal(r.blocks[0].hp,0);assert.ok(r.y>180);r.blocks=[];for(let i=0;i<125;i++)stepRun(r,1/60);assert.equal(r.skillDrillTime,0);
});
test('ability charges and legacy aura, ore-chain purchases survive save migration',()=>{
 const p=freshProgress(),legacy=JSON.parse(JSON.stringify(p));delete legacy.skillLevels;delete legacy.chainCharges;legacy.aura='fire';legacy.owned.push('chain');legacy.enchant='chain';legacy.coins=3000;
 const restored=decodeProgress(JSON.stringify(legacy))!;assert.equal(restored.skillLevels.fire,1);assert.equal(restored.aura,'fire');assert.equal(restored.chainCharges,1);assert.equal(restored.enchant,'none');assert.equal(restored.coins,3000);assert.equal(decodeProgress(JSON.stringify(restored))?.chainCharges,1);
 assert.equal(buy(restored,'chain'),true);assert.equal(restored.chainCharges,2);assert.equal(restored.coins,3000-PRICES.chain);
 const r=skill('ghost',3);r.skillCharges=1;r.chainActive=true;restored.endlessAttempt=r;const reloaded=decodeProgress(JSON.stringify(restored))!;assert.equal(reloaded.endlessAttempt?.skillCharges,1);assert.equal(reloaded.endlessAttempt?.chainActive,true);assert.equal(reloaded.chainCharges,2);
});

test('ore chain destroys an adjacent vein only while the run item is active',()=>{
 const collision=(active:boolean)=>{const r=skill('fire');r.chainActive=active;r.x=208;r.y=200;r.vx=0;r.vy=40;r.spin=0;r.angle=Math.PI/4+Math.PI;r.blocks=[{x:6,y:6,type:'coal',hp:.1},{x:7,y:6,type:'coal',hp:BLOCKS.coal.hp},{x:10,y:6,type:'coal',hp:BLOCKS.coal.hp}];stepRun(r,1/120);return r;};
 const without=collision(false),withChain=collision(true);assert.ok(without.blocks[1].hp>0);assert.equal(withChain.blocks[1].hp,0);assert.equal(withChain.blocks[2].hp,BLOCKS.coal.hp);assert.equal(withChain.ore,2);
});

test('five levels upgrade charges and effects and preserve upgraded saves',()=>{
 const p=freshProgress();p.skillLevels={fire:5,lightning:5,enchanted:5,ghost:5};
 for(const aura of ['fire','lightning','enchanted','ghost'] as const){
  const r=skill(aura);r.skillLevel=5;r.skillCharges=3;r.skillMaxCharges=3;r.x=7*TILE+16;r.y=10*TILE+16;
  if(aura==='lightning')r.blocks=[{x:12,y:10,type:'coal',hp:1}];
  assert.equal(activateSkill(r),true);assert.equal(r.skillCharges,2);
  if(aura==='fire')assert.equal(r.skillFireTime,5);
  if(aura==='ghost')assert.equal(r.phaseTime,5);
  if(aura==='enchanted'){assert.equal(r.skillDrillTime,3);assert.ok(r.vy>=350*1.15);}
  if(aura==='lightning')assert.equal(r.blocks[0].hp,0);
  p.endlessAttempt=r;const saved=decodeProgress(JSON.stringify(p));assert.ok(saved?.endlessAttempt);assert.equal(saved.skillLevels[aura],5);assert.equal(saved.endlessAttempt.skillCharges,2);
 }
});
test('legacy third-level skill retains three uses via level four migration',()=>{
 const p=freshProgress();delete p.skillBalanceVersion;p.skillLevels.fire=3;
 const saved=decodeProgress(JSON.stringify(p));assert.equal(saved?.skillLevels.fire,4);assert.equal(saved?.skillBalanceVersion,1);
 assert.equal(decodeProgress(JSON.stringify(saved))?.skillLevels.fire,4);
});
test('upgrade levels grow charges and the promised effect independently',async()=>{
 const {skillStats}=await import('../src/core.ts');
 assert.deepEqual([1,2,3,4,5].map(n=>skillStats('fire',n).uses),[1,2,2,3,3]);
 assert.deepEqual([1,2,3,4,5].map(n=>skillStats('fire',n).duration),[3,3,4,4,5]);
 assert.deepEqual([1,2,3,4,5].map(n=>skillStats('lightning',n).radius),[3,3,4,4,5]);
 assert.deepEqual([1,2,3,4,5].map(n=>skillStats('enchanted',n).duration),[2,2,2.5,2.5,3]);
 const r=skill('ghost');r.skillLevel=5;activateSkill(r);r.vy=480;stepRun(r,1/120);assert.ok(r.vy>440);
});

test('lightning keeps its charge with no ore, and collects ore touched by the field',()=>{
 const r=skill('lightning');r.x=7*TILE;r.y=10*TILE+16;r.blocks=[{x:7,y:10,type:'dirt',hp:BLOCKS.dirt.hp}];
 assert.equal(activateSkill(r),false);assert.equal(r.skillCharges,1);assert.equal(r.events.filter(e=>e.type==='skill').length,0);
 const edge={x:10,y:10,type:'coal' as const,hp:BLOCKS.coal.hp},outside={x:11,y:10,type:'coal' as const,hp:BLOCKS.coal.hp};r.blocks.push(edge,outside);
 assert.equal(activateSkill(r),true);assert.equal(edge.hp,0);assert.equal(outside.hp,BLOCKS.coal.hp);assert.equal(r.skillCharges,0);assert.equal(r.events.find(e=>e.type==='skill')?.value,3*TILE);
});
