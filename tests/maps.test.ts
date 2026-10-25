import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRun,stepRun,LEVELS} from '../src/core.ts';
import {decodeProgress} from '../src/storage.ts';
import {freshProgress} from '../src/progress.ts';

test('every fixed mine has a reachable exit with wooden pick and no ads or nudges',()=>{
 for(let level=0;level<LEVELS.length;level++){
  let won=false;
  for(const x of [176,208,224,240,272]){
   const r=createRun(level,'wood');r.x=x;
   for(let i=0;i<120*150&&r.status!=='won'&&r.status!=='lost';i++){stepRun(r,1/120);r.events=[];}
   assert.ok(Number.isFinite(r.x)&&Number.isFinite(r.y));if(r.status==='won'){won=true;break;}
  }
  assert.equal(won,true,'wooden route in level '+(level+1));
 }
});
test('mid-run snapshot restores physical state and unspent charges',()=>{
 const r=createRun(2,'iron');for(let i=0;i<700;i++)stepRun(r,1/120);
 const p=freshProgress();p.owned.push('stone','iron');p.pick='iron';p.attempt=r;
 const restored=decodeProgress(JSON.stringify(p));assert.ok(restored?.attempt);assert.equal(restored.attempt.x,r.x);assert.equal(restored.attempt.nudges,2);
 for(let i=0;i<20;i++){stepRun(restored.attempt,1/120);stepRun(r,1/120);}
 assert.ok(Math.abs(restored.attempt.y-r.y)<.01);
});
test('saves from before the lesson flag decode with the lesson still pending',()=>{
 const old=freshProgress() as Partial<ReturnType<typeof freshProgress>>;delete old.tutorial;
 assert.equal(decodeProgress(JSON.stringify(old))?.tutorial,false);
 assert.equal(decodeProgress(JSON.stringify({...freshProgress(),tutorial:true}))?.tutorial,true);
});
