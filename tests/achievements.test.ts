import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRun,collectBlock,blast,stepRun} from '../src/core.ts';
import {freshProgress} from '../src/progress.ts';
import {decodeProgress} from '../src/storage.ts';
import {ACHIEVEMENTS,claimAchievement,readyAchievements,syncAchievements} from '../src/achievements.ts';
import type {Block} from '../src/core.ts';
const block=(type:Block['type'],x=6,y=10):Block=>({x,y,type,hp:1});

test('simulation tracks mined ores, actual detonations and positive pickups once',()=>{
 const r=createRun(0,'wood','none',false,123),ore=block('coal'),bonus=block('double',5);
 collectBlock(r,ore);collectBlock(r,ore);collectBlock(r,bonus);collectBlock(r,bonus);collectBlock(r,block('curse',4));
 r.blocks=[block('tnt',6,15)];blast(r,208,496);
 assert.equal(r.achievementStats?.oreBlocks,1);assert.equal(r.achievementStats?.tnt,1);
 assert.equal(r.achievementStats?.bonuses,1);assert.deepEqual(r.achievementStats?.bonusTypes,['double']);
 assert.deepEqual(r.achievementStats?.oreTypes,['coal']);
});

test('helmet resurrection counts separately from picking up the helmet',()=>{
 const r=createRun(0,'wood','none',false,123);collectBlock(r,block('helmet'));
 r.hp=.1;r.x=208;r.y=310;r.vy=100;r.angle=Math.PI/4;r.blocks=[block('stone')];
 stepRun(r,1/120);
 assert.equal(r.achievementStats?.bonuses,1);assert.equal(r.achievementStats?.helmetSaves,1);
 assert.ok(r.hp>0);assert.equal(r.helmetReady,false);
});

test('save, reload and switching between two runs do not duplicate lifetime counters',()=>{
 const p=freshProgress(),endless=createRun(0,'wood','none',false,123),campaign=createRun(0,'wood');
 endless.blocks=[];campaign.blocks=[];
 collectBlock(endless,block('coal'));collectBlock(endless,block('sweep'));endless.status='playing';endless.time=1;endless.rows=120;endless.y=3200;
 syncAchievements(p,endless);syncAchievements(p,endless);
 collectBlock(campaign,block('copper'));campaign.status='lost';syncAchievements(p,campaign);
 p.endlessAttempt=endless;p.attempt=campaign;
 const loaded=decodeProgress(JSON.stringify(p))!;assert.ok(loaded?.endlessAttempt&&loaded.attempt);
 syncAchievements(loaded,loaded.endlessAttempt!);syncAchievements(loaded,loaded.attempt!);
 assert.equal(loaded.achievements.totalOre,3);assert.equal(loaded.achievements.oreBlocks,2);
 assert.equal(loaded.achievements.bonuses,1);assert.equal(loaded.achievements.runs,1);
 assert.equal(loaded.achievements.bestDepth,100);assert.equal(loaded.achievements.woodDepth,100);
 collectBlock(loaded.endlessAttempt!,block('iron',3));syncAchievements(loaded,loaded.endlessAttempt!);
 assert.equal(loaded.achievements.totalOre,7);assert.equal(loaded.achievements.oreBlocks,3);
});

test('claims require completion, pay manually once and cannot farm their own rewards',()=>{
 const p=freshProgress();assert.equal(claimAchievement(p,'bestOre-100'),0);
 const r=createRun(0,'wood','none',false,123);r.ore=100;syncAchievements(p,r);
 assert.ok(readyAchievements(p).some(a=>a.id==='bestOre-100'));assert.equal(p.coins,0);
 const award=ACHIEVEMENTS.find(a=>a.id==='bestOre-100')!.reward;
 assert.equal(claimAchievement(p,'bestOre-100'),award);assert.equal(claimAchievement(p,'bestOre-100'),0);
 p.endlessAttempt=r;const loaded=decodeProgress(JSON.stringify(p))!;
 assert.equal(claimAchievement(loaded,'bestOre-100'),0);assert.equal(loaded.coins,award);
 assert.equal(loaded.achievements.totalOre,100);
});

test('old saves preserve their wallet and recognize known records without inventing counters',()=>{
 const p=freshProgress();p.coins=1234;p.endlessBest=300;p.relics=10;p.owned.push('stone','iron');
 const old=JSON.parse(JSON.stringify(p));delete old.achievements;
 const loaded=decodeProgress(JSON.stringify(old))!;assert.ok(loaded);
 assert.equal(loaded.coins,1234);assert.equal(loaded.achievements.bestDepth,300);
 assert.equal(loaded.achievements.tnt,0);assert.equal(loaded.achievements.runs,0);
 for(const id of ['bestDepth-100','bestDepth-200','bestDepth-300','ownedPicks-3','relics-10'])assert.ok(readyAchievements(loaded).some(a=>a.id===id));
});

test('unfinished attempts cannot farm completed-run achievements and records persist after death',()=>{
 const p=freshProgress();for(let i=0;i<10;i++)syncAchievements(p,createRun(0,'wood'));
 assert.equal(p.achievements.runs,0);
 const r=createRun(0,'wood','none',false,123);r.status='playing';r.time=1;r.y=6400;syncAchievements(p,r);
 r.y=6300;r.status='lost';syncAchievements(p,r);syncAchievements(p,r);
 assert.equal(p.achievements.bestDepth,200);assert.equal(p.achievements.runs,1);
});
