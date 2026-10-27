import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRun,LEVELS,PICKS,BLOCKS,nudge,stepRun,blast,collectBlock} from '../src/core.ts';
import type {Pick,Block} from '../src/core.ts';
import {freshProgress,levelReward} from '../src/progress.ts';
import {decodeProgress} from '../src/storage.ts';

test('campaign grows to 45 mines and starts shorter and more open than late mines',()=>{
 assert.equal(LEVELS.length,45);assert.ok(LEVELS[0].rows<=14);assert.ok(LEVELS[44].rows>LEVELS[0].rows*3);
 for(let i=1;i<LEVELS.length;i++)assert.ok(LEVELS[i].rows>=LEVELS[i-1].rows);
 const early=createRun(0,'wood');assert.ok(early.blocks.length/(early.rows*14)<.65);
 for(const type of ['coal','copper']){assert.ok(early.blocks.some(b=>b.type===type));assert.equal(BLOCKS[type as keyof typeof BLOCKS].tier,0);}
});
test('all seven picks obey the four-nudge ceiling with a shared directional budget',()=>{
 assert.equal(Object.keys(PICKS).length,7);
 for(const key of Object.keys(PICKS) as Pick[]){const r=createRun(0,key);const budget=PICKS[key].nudges;assert.ok(budget<=4);
  for(let i=0;i<budget;i++){r.time=i;assert.equal(nudge(r,i%2?1:-1),true);}
  r.time=10;assert.equal(nudge(r,1),false);assert.equal(r.nudges,0);
 }
});
test('double bonus counts five ore blocks, survives non-ore breaks, and cannot pay twice',()=>{
 const r=createRun(3,'stone');r.blocks=[];
 const bonus:Block={x:1,y:4,type:'double',hp:1};r.blocks.push(bonus);collectBlock(r,bonus);assert.equal(r.doubleLeft,5);collectBlock(r,bonus);assert.equal(r.doubleLeft,5);
 const dirt:Block={x:2,y:4,type:'dirt',hp:1};collectBlock(r,dirt);assert.equal(r.doubleLeft,5);
 for(let i=0;i<6;i++)collectBlock(r,{x:i,y:5,type:'coal',hp:1});
 assert.equal(r.ore,11*BLOCKS.coal.ore);assert.equal(r.doubleLeft,0);
 const drops=r.events.filter(e=>e.type==='break'&&e.kind==='coal');assert.equal(drops[0].value,2);assert.equal(drops[5].value,1);
});
test('sweep clears only its row, keeps blastproof blocks and respects tier for ore',()=>{
 const r=createRun(9,'wood');r.blocks=[{x:0,y:8,type:'sweep',hp:1},{x:1,y:8,type:'coal',hp:1},{x:2,y:8,type:'gem',hp:1},{x:3,y:8,type:'obsidian',hp:6},{x:1,y:9,type:'coal',hp:1}];
 collectBlock(r,r.blocks[0]);assert.deepEqual(r.blocks.map(b=>b.hp),[0,0,0,6,1]);assert.equal(r.ore,1);
 collectBlock(r,r.blocks[0]);assert.equal(r.ore,1);
});
test('blast-activated bonuses are finite and cash in every ore block once',()=>{
 const r=createRun(9,'stone');r.blocks=[{x:1,y:8,type:'sweep',hp:1},{x:2,y:8,type:'double',hp:1},{x:3,y:8,type:'coal',hp:1}];
 blast(r,48,272);assert.ok(r.events.length<30);const ore=r.ore;blast(r,48,272);assert.equal(r.ore,ore);
});
test('12-mine saves retain wallet, purchased picks and unlocks and gain empty future records',()=>{
 const p=freshProgress();p.coins=1234;p.owned=['wood','stone','iron','gold','diamond'];p.pick='diamond';p.unlocked=11;p.best=Array(12).fill(8);p.attempt=null;
 const loaded=decodeProgress(JSON.stringify(p));assert.ok(loaded);assert.equal(loaded.coins,1234);assert.equal(loaded.unlocked,11);assert.equal(loaded.best.length,45);assert.equal(loaded.best[11],8);assert.equal(loaded.best[44],0);
});
test('new bonus state and late picks round-trip; rewards stay bounded over 45 mines',()=>{
 const p=freshProgress();p.owned.push('netherite');p.pick='netherite';p.unlocked=44;p.attempt=createRun(44,'netherite');p.attempt.doubleLeft=3;
 const loaded=decodeProgress(JSON.stringify(p));assert.ok(loaded?.attempt);assert.equal(loaded.attempt.doubleLeft,3);assert.equal(loaded.pick,'netherite');assert.ok(levelReward(44)<400);
});
test('obsolete active map is discarded without losing the old wallet and tools',()=>{
 const p=freshProgress();p.coins=902;p.owned.push('stone');p.pick='stone';p.best=Array(12).fill(3);
 p.attempt=createRun(0,'stone');p.attempt.rows=30;p.attempt.status='playing';
 const loaded=decodeProgress(JSON.stringify(p));assert.ok(loaded);assert.equal(loaded.attempt,null);assert.equal(loaded.coins,902);assert.equal(loaded.pick,'stone');
});

test('row clear lights TNT with a delay and gives the same rewards in either block order',()=>{
 for(const reverse of [false,true]){
  const r=createRun(9,'wood');
  const sweep:Block={x:0,y:8,type:'sweep',hp:1};
  const row:Block[]=[{x:1,y:8,type:'tnt',hp:1},{x:2,y:8,type:'gem',hp:4}];
  r.blocks=[sweep,...(reverse?row.reverse():row),{x:1,y:9,type:'gold',hp:3}];
  collectBlock(r,sweep);
  assert.equal(r.ore,0);assert.equal(r.events.some(e=>e.type==='blast'),false);
  assert.equal(r.fuses.length,1);assert.equal(r.blocks.find(b=>b.type==='tnt')!.hp,1);
  for(let i=0;i<17;i++)stepRun(r,1/60);
  assert.equal(r.events.some(e=>e.type==='blast'),false);
  for(let i=0;i<3;i++)stepRun(r,1/60);
  assert.equal(r.blocks.find(b=>b.type==='tnt')!.hp,0);assert.equal(r.ore,BLOCKS.gold.ore);
 }
});
