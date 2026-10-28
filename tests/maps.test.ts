import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRun,stepRun} from '../src/core.ts';
import {decodeProgress} from '../src/storage.ts';
import {freshProgress} from '../src/progress.ts';

test('mid-run snapshot restores physical state and unspent charges',()=>{
 const r=createRun(2,'iron');for(let i=0;i<700;i++)stepRun(r,1/120);
 const p=freshProgress();p.owned.push('stone','iron');p.pick='iron';p.endlessAttempt=r;
 const restored=decodeProgress(JSON.stringify(p));assert.ok(restored?.endlessAttempt);assert.equal(restored.endlessAttempt.x,r.x);assert.equal(restored.endlessAttempt.nudges,2);
 for(let i=0;i<20;i++){stepRun(restored.endlessAttempt,1/120);stepRun(r,1/120);}
 assert.ok(Math.abs(restored.endlessAttempt.y-r.y)<.01);
});
test('saves from before the lesson flag decode with the lesson still pending',()=>{
 const old=freshProgress() as Partial<ReturnType<typeof freshProgress>>;delete old.tutorial;
 assert.equal(decodeProgress(JSON.stringify(old))?.tutorial,false);
 assert.equal(decodeProgress(JSON.stringify({...freshProgress(),tutorial:true}))?.tutorial,true);
});
