import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRun,stepRun,TILE} from '../src/core.ts';

test('an endless mine has generated blocks below its initial visible section before starting',()=>{
 const run=createRun(0,'wood','none',false,1234);
 assert.equal(run.status,'ready');
 assert.ok(run.rows>=40);
 assert.ok(run.blocks.some(block=>block.y>=12));
 const initial=run.blocks.filter(block=>block.y>=12).map(block=>`${block.x}:${block.y}:${block.type}`);
 assert.deepEqual(initial,createRun(0,'wood','none',false,1234).blocks.filter(block=>block.y>=12).map(block=>`${block.x}:${block.y}:${block.type}`));
 run.status='playing';stepRun(run,1/120);
 assert.ok(run.rows*TILE>run.y+96*TILE);
});

test('all new runs use the endless mine regardless of legacy level argument',()=>{
 const first=createRun(0,'wood','none',false,1234),legacyLevel=createRun(42,'wood','none',false,1234);
 assert.equal(first.mode,'endless');assert.equal(legacyLevel.mode,'endless');
 assert.deepEqual(legacyLevel.blocks,first.blocks);assert.equal(legacyLevel.rows,first.rows);
});
