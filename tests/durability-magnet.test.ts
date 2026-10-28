import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectBlock,createRun,maxDurability,PICKS,stepRun} from '../src/core.ts';
import {freshProgress} from '../src/progress.ts';
import {decodeProgress} from '../src/storage.ts';

test('legacy runs retain their durability percentage and migrate only once',()=>{
 const p=freshProgress();p.owned.push('gold','netherite');
 const campaign=createRun(0,'gold');campaign.mode='campaign';campaign.rows=12;campaign.level=0;campaign.blocks=campaign.blocks.filter(b=>b.y<12);delete campaign.durabilityVersion;campaign.hp=116;
 const endless=createRun(0,'netherite','none',false,123);delete endless.durabilityVersion;
 endless.hp=450;endless.hpBonus=200;endless.magnetTime=8;endless.benchUsed=true;
 p.attempt=campaign;p.endlessAttempt=endless;
 const restored=decodeProgress(JSON.stringify(p));
 assert.ok(restored?.attempt&&restored.endlessAttempt);
 assert.equal(restored.attempt.hp,58);assert.equal(maxDurability(restored.attempt),72.5);
 assert.equal(restored.endlessAttempt.hp,225);assert.equal(maxDurability(restored.endlessAttempt),300);
 assert.equal(restored.endlessAttempt.magnetTime,3);
 const reloaded=decodeProgress(JSON.stringify(restored));
 assert.equal(reloaded?.attempt?.hp,58);assert.equal(reloaded?.endlessAttempt?.hp,225);
 assert.deepEqual(Object.values(PICKS).map(pick=>pick.hp),[50,65,85,72.5,115,155,200]);
});

test('early magnet lasts 1.5 seconds, attracts a block and gravity keeps pulling down',()=>{
 const r=createRun(9,'wood');r.blocks=[{x:9,y:4,type:'stone',hp:2.5}];
 r.x=224;r.y=400;r.vx=0;r.vy=0;r.status='playing';
 collectBlock(r,{x:7,y:12,type:'magnet',hp:1});
 assert.equal(r.magnetTime,1.5);assert.equal(r.events.at(-1)?.value,1.5);
 stepRun(r,1/60);
 assert.ok(r.vx>0,'the magnet pulls toward the block');
 assert.ok(r.vy>0,'gravity keeps pulling down even when the target is above');
});

test('magnet contact does not bounce the pick upwards',()=>{
 const r=createRun(9,'wood');r.blocks=[{x:7,y:5,type:'hard',hp:5}];
 r.x=240;r.y=150;r.vx=0;r.vy=20;r.status='playing';r.magnetTime=3;
 stepRun(r,1/60);
 assert.ok(r.hits>0);assert.ok(r.vy>0);
});
