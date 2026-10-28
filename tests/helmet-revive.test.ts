import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BLOCKS,collectBlock,createRun,PICKS,reviveRun,stepRun} from '../src/core.ts';

test('helmet waits until a lethal blow, restores 25% once, and cannot spawn again',()=>{
 const r=createRun(0,'wood','none',false,123);r.blocks=[];r.status='playing';r.hp=10;
 collectBlock(r,{x:2,y:5,type:'helmet',hp:1});assert.equal(r.hp,10);assert.equal(r.helmetReady,true);assert.equal(r.helmetCollected,true);
 r.hp=1;r.x=208;r.y=200;r.vx=0;r.vy=40;r.spin=0;r.angle=Math.PI/4+Math.PI;r.blocks=[{x:6,y:6,type:'stone',hp:BLOCKS.stone.hp}];stepRun(r,1/120);
 assert.equal(r.status,'playing');assert.equal(r.hp,Math.ceil(PICKS.wood.hp*.25));assert.equal(r.helmetReady,false);assert.equal(r.events.filter(e=>e.type==='revive').length,1);assert.equal(r.achievementStats?.helmetSaves,1);
 collectBlock(r,{x:3,y:5,type:'helmet',hp:1});assert.equal(r.helmetReady,false);
 r.helmetGraceTime=0;r.hp=0;stepRun(r,1/120);assert.equal(r.status,'lost');assert.equal(r.events.filter(e=>e.type==='revive').length,1);
});
test('helmet also catches lethal curse and zero health before a simulation step',()=>{
 const r=createRun(0,'wood','none',false,456);r.blocks=[];r.status='playing';collectBlock(r,{x:2,y:5,type:'helmet',hp:1});r.hp=3;
 collectBlock(r,{x:3,y:5,type:'curse',hp:1});assert.equal(r.hp,13);assert.equal(r.helmetReady,false);assert.equal(r.events.filter(e=>e.type==='revive').length,1);stepRun(r,1/120);assert.equal(r.status,'playing');
 const other=createRun(0,'wood','none',false,789);other.blocks=[];other.status='playing';collectBlock(other,{x:2,y:5,type:'helmet',hp:1});other.hp=0;stepRun(other,1/120);assert.equal(other.status,'playing');assert.equal(other.hp,13);
});
test('shared revival event supports a future ad and rejects double revival',()=>{
 const r=createRun(0,'wood','none',false,456);r.status='lost';r.hp=0;assert.equal(reviveRun(r,10,'ad'),true);assert.equal(r.status,'playing');assert.equal(r.hp,10);assert.equal(r.events.at(-1)?.type,'revive');assert.equal(reviveRun(r,10,'ad'),false);assert.equal(r.events.filter(e=>e.type==='revive').length,1);
});

test('purchased helmets are paid once, saved, and consumed only when a run starts',async()=>{
 const {freshProgress,buy,PRICES,equipPurchasedHelmet}=await import('../src/progress.ts');
 const {decodeProgress}=await import('../src/storage.ts');
 let p=freshProgress();p.coins=PRICES.helmet-1;assert.equal(buy(p,'helmet'),false);assert.equal(p.coins,PRICES.helmet-1);assert.equal(p.helmetCharges,0);
 p.coins=PRICES.helmet*2;assert.equal(buy(p,'helmet'),true);assert.equal(buy(p,'helmet'),true);assert.equal(p.coins,0);assert.equal(p.helmetCharges,2);
 p=decodeProgress(JSON.stringify(p))!;assert.equal(p.helmetCharges,2);
 const r=createRun(0,'wood','none',false,432);r.blocks.push({x:3,y:6,type:'helmet',hp:1});assert.equal(equipPurchasedHelmet(p,r),true);assert.equal(p.helmetCharges,1);assert.equal(r.helmetReady,true);assert.equal(r.helmetCollected,true);assert.ok(!r.blocks.some(b=>b.type==='helmet'));assert.equal(equipPurchasedHelmet(p,r),false);assert.equal(p.helmetCharges,1);
 r.status='playing';p.endlessAttempt=r;p=decodeProgress(JSON.stringify(p))!;assert.equal(p.helmetCharges,1);assert.equal(p.endlessAttempt?.helmetReady,true);assert.equal(p.endlessAttempt?.helmetCollected,true);
 const before=p.endlessAttempt!.hp;p.endlessAttempt!.hp=0;stepRun(p.endlessAttempt!,1/120);assert.equal(p.endlessAttempt!.hp,Math.ceil(PICKS.wood.hp*.25));assert.equal(p.endlessAttempt!.helmetReady,false);assert.ok(before>0);
 const next=createRun(0,'wood','none',false,222);assert.equal(equipPurchasedHelmet(p,next),true);assert.equal(p.helmetCharges,0);
});
test('old saves default helmet stock to zero without changing owned TNT',async()=>{
 const {freshProgress}=await import('../src/progress.ts');const {decodeProgress}=await import('../src/storage.ts');
 const p=freshProgress(),old=JSON.parse(JSON.stringify(p));delete old.helmetCharges;old.owned.push('starter');const restored=decodeProgress(JSON.stringify(old));assert.equal(restored?.helmetCharges,0);assert.ok(restored?.owned.includes('starter'));
});
