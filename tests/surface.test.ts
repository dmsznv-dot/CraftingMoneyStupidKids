import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BLOCKS,COLS,createRun,ensureSurface} from '../src/core.ts';
import {freshProgress} from '../src/progress.ts';
import {decodeProgress} from '../src/storage.ts';

test('the surface is a complete row of grass-topped dirt for varied seeds',()=>{
 for(const seed of [0,1,123,456,789,9999,4294967295]){const r=createRun(0,'wood','none',false,seed);const top=r.blocks.filter(b=>b.y===4);assert.equal(top.length,COLS);assert.deepEqual(top.map(b=>b.x),Array.from({length:COLS},(_,i)=>i));assert.ok(top.every(b=>b.type==='dirt'&&b.hp===BLOCKS.dirt.hp));}
});
test('restoring a ready legacy run fills surface, while a running mine keeps its mined blocks',()=>{
 const p=freshProgress(),r=createRun(0,'wood','none',false,123);r.blocks=r.blocks.filter(b=>b.y!==4);p.endlessAttempt=r;
 const ready=decodeProgress(JSON.stringify(p));assert.ok(ready?.endlessAttempt);assert.equal(ready.endlessAttempt.blocks.filter(b=>b.y===4).length,COLS);
 r.status='playing';p.endlessAttempt=r;const playing=decodeProgress(JSON.stringify(p));assert.ok(playing?.endlessAttempt);assert.equal(playing.endlessAttempt.blocks.filter(b=>b.y===4).length,0);
 ensureSurface(playing.endlessAttempt);assert.equal(playing.endlessAttempt.blocks.filter(b=>b.y===4).length,0);
});
