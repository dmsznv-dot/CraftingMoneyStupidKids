import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRun,nudge,stepRun,blast} from '../src/core.ts';
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
test('TNT detonates once, cascades and never directly damages pick durability',()=>{
 const run=createRun(0,'wood');run.blocks.forEach(b=>b.hp=0);
 run.blocks[10]={x:6,y:10,type:'tnt',hp:1};run.blocks[11]={x:7,y:10,type:'tnt',hp:1};
 const hp=run.hp;blast(run,6*32+16,10*32+16);assert.equal(run.blocks[10].hp,0);assert.equal(run.blocks[11].hp,0);
 assert.equal(run.hp,hp);const blasts=run.events.filter(e=>e.type==='blast').length;assert.equal(blasts,2);
 blast(run,6*32+16,10*32+16);assert.equal(run.events.filter(e=>e.type==='blast').length,3);
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
