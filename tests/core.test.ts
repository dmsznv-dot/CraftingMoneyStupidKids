import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRun,nudge,stepRun,blast,fuseCue,pickDamage,BLOCKS,FUSE_DELAY} from '../src/core.ts';
import type {Pick,BlockType} from '../src/core.ts';
import {nudgeCount} from '../src/i18n.ts';
import {freshProgress,buy,settle,reward} from '../src/progress.ts';

test('wood has no directional control; stone spends one shared charge',()=>{
 const wood=createRun(0,'wood'); assert.equal(nudge(wood,-1),false);
 const stone=createRun(0,'stone'); assert.equal(nudge(stone,1),true);
 for(let i=0;i<50;i++)stepRun(stone,1/120);
 assert.equal(nudge(stone,-1),false); assert.equal(stone.nudges,0);
});
test('cooldown ignores rapid taps without spending a second charge',()=>{
 const run=createRun(0,'diamond'); assert.equal(nudge(run,1),true);
 assert.equal(nudge(run,-1),false); assert.equal(run.nudges,3);
 for(let i=0;i<40;i++)stepRun(run,1/120);
 assert.equal(nudge(run,-1),true);assert.equal(run.nudges,2);
});
test('a new attempt restores charges; exhausted durability loses even at exit',()=>{
 const run=createRun(0,'iron');nudge(run,1);assert.equal(createRun(0,'iron').nudges,2);
 run.hp=0;run.y=run.rows*32+100;stepRun(run,1/120);assert.equal(run.status,'lost');
});
test('TNT detonates once and lights only adjacent TNT, which goes off after its fuse',()=>{
 const run=createRun(0,'wood');run.blocks.forEach(b=>b.hp=0);run.status='playing';run.x=40;run.y=40;
 run.blocks[10]={x:6,y:10,type:'tnt',hp:1};run.blocks[11]={x:7,y:10,type:'tnt',hp:1};run.blocks[12]={x:9,y:10,type:'tnt',hp:1};
 const hp=run.hp;blast(run,6*32+16,10*32+16);
 assert.equal(run.blocks[10].hp,0);assert.equal(run.blocks[11].hp,1,'neighbour is lit, not exploded yet');
 assert.equal(run.events.filter(e=>e.type==='blast').length,1);
 for(let i=0;i<Math.ceil(FUSE_DELAY*120)+2;i++)stepRun(run,1/120);
 assert.equal(run.blocks[11].hp,0);assert.equal(run.blocks[12].hp,1,'two tiles away is out of reach');
 assert.equal(run.events.filter(e=>e.type==='blast').length,2);assert.equal(run.hp,hp);
});
test('a blast reaches only the eight neighbours and dense rock survives it',()=>{
 const run=createRun(0,'wood');run.blocks=[];
 for(let x=4;x<=8;x++)for(let y=8;y<=12;y++)run.blocks.push({x,y,type:x===6&&y===9?'hard':'stone',hp:x===6&&y===9?BLOCKS.hard.hp:BLOCKS.stone.hp});
 blast(run,6*32+16,10*32+16);
 const broken=run.blocks.filter(b=>b.hp<=0).map(b=>b.x+':'+b.y).sort();
 assert.deepEqual(broken,['5:10','5:11','5:9','6:10','6:11','7:10','7:11','7:9']);
 assert.ok(run.blocks.find(b=>b.x===6&&b.y===9)!.hp>0);
});
test('each pick needs a different number of blows, and weak picks only chip ore and lose it',()=>{
 const blows=(pick:Pick,type:BlockType)=>Math.ceil(BLOCKS[type].hp/pickDamage(pick,type)-1e-9);
 assert.deepEqual((['wood','stone','iron','gold','diamond'] as Pick[]).map(p=>blows(p,'stone')),[3,2,2,1,1]);
 assert.deepEqual((['wood','stone','iron','gold','diamond'] as Pick[]).map(p=>blows(p,'hard')),[15,9,3,2,2]);
 assert.ok(blows('wood','gold')>blows('stone','gold')*3);
 const run=createRun(0,'wood');run.blocks=[{x:6,y:6,type:'gold',hp:.1}];
 run.status='playing';run.x=208;run.y=200;run.vx=0;run.vy=40;run.spin=0;run.angle=Math.PI/4+Math.PI;
 stepRun(run,1/120);assert.equal(run.blocks[0].hp,0);assert.equal(run.ore,0);
 assert.equal(run.events.find(e=>e.type==='hit')?.weak,true);
});
test('purchases are permanent, sequential and cannot double-spend',()=>{
 const p=freshProgress();p.coins=200;assert.equal(buy(p,'stone'),true);assert.equal(p.coins,100);
 assert.equal(buy(p,'stone'),false);assert.equal(p.coins,100);assert.equal(buy(p,'diamond'),false);
});
test('settling and rewarded callbacks cannot duplicate a result',()=>{
 const p=freshProgress(),run=createRun(0,'wood');run.status='won';run.ore=12;
 assert.equal(settle(p,run),72);assert.equal(settle(p,run),0);assert.equal(p.coins,72);
 assert.equal(reward(p,run.id),72);assert.equal(reward(p,run.id),0);assert.equal(p.coins,144);
});
test('failure never takes currency or grants ore currency',()=>{
 const p=freshProgress();p.coins=40;const run=createRun(0,'wood');run.ore=1000;run.status='lost';
 assert.equal(settle(p,run),0);assert.equal(p.coins,40);
});
test('a head tip strikes a block the body circle never reaches and twists the pick',()=>{
 const run=createRun(0,'wood');run.blocks=[{x:7,y:5,type:'dirt',hp:1}];
 run.status='playing';run.x=200;run.y=200;run.vx=40;run.vy=0;run.spin=0;run.angle=Math.PI/4;
 stepRun(run,1/120);assert.equal(run.hits,1);assert.ok(run.blocks[0].hp<=0);assert.notEqual(run.spin,0);
 assert.ok(run.vx<40);
});
test('tip strikes wear the pick less than body blows',()=>{
 const tip=createRun(0,'wood');tip.blocks=[{x:7,y:5,type:'hard',hp:3}];
 tip.status='playing';tip.x=200;tip.y=200;tip.vx=40;tip.vy=0;tip.spin=0;tip.angle=Math.PI/4;stepRun(tip,1/120);
 const body=createRun(0,'wood');body.blocks=[{x:6,y:6,type:'hard',hp:3}];
 body.status='playing';body.x=208;body.y=200;body.vx=0;body.vy=40;body.spin=0;body.angle=Math.PI/4+Math.PI;stepRun(body,1/120);
 assert.equal(tip.hits,1);assert.equal(body.hits,1);assert.ok(100-tip.hp<100-body.hp);
});
test('first-nudge cue points at an intact fuse ahead and needs a charge',()=>{
 const run=createRun(0,'stone');run.status='playing';run.x=208;run.y=200;
 assert.deepEqual(fuseCue(run),{x:10*32+16,y:9*32+16,dir:1});
 run.x=400;assert.deepEqual(fuseCue(run)?.dir,-1);
 run.nudges=0;assert.equal(fuseCue(run),null);
 const wood=createRun(0,'wood');wood.status='playing';wood.x=208;wood.y=200;assert.equal(fuseCue(wood),null);
 run.nudges=1;run.x=208;for(const b of run.blocks)if(b.type==='tnt')b.hp=0;assert.equal(fuseCue(run),null);
});
test('nudge counts agree with the number in both languages',()=>{
 assert.deepEqual([0,1,2,4,5,11,12,21,22,25].map(n=>nudgeCount('ru',n)),['0 импульсов','1 импульс','2 импульса','4 импульса','5 импульсов','11 импульсов','12 импульсов','21 импульс','22 импульса','25 импульсов']);
 assert.deepEqual([0,1,2].map(n=>nudgeCount('en',n)),['0 nudges','1 nudge','2 nudges']);
});
test('a shown cue survives the small bounce that would not start it',()=>{
 const run=createRun(0,'stone');run.status='playing';run.x=208;run.y=9*32+16-220;
 assert.equal(fuseCue(run),null);assert.ok(fuseCue(run,true));
});
