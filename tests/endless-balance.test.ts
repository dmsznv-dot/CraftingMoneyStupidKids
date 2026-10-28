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
 const p=freshProgress(),r=createRun(0,'wood','none',false,123);delete r.blockBalanceVersion;
 r.blocks=[{x:6,y:6,type:'dirt',hp:.5},{x:7,y:6,type:'coal',hp:1},{x:8,y:6,type:'copper',hp:0},{x:9,y:6,type:'stone',hp:1.25}];p.endlessAttempt=r;p.coins=900;
 const first=decodeProgress(JSON.stringify(p));assert.ok(first?.endlessAttempt);assert.equal(first.coins,900);
 assert.deepEqual(first.endlessAttempt.blocks.map(b=>b.hp),[.9,1.8,0,1.6]);
 const again=decodeProgress(JSON.stringify(first));assert.deepEqual(again?.endlessAttempt?.blocks.map(b=>b.hp),[.9,1.8,0,1.6]);
});
