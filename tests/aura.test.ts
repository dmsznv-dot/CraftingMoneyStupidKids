import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AURAS,freshProgress} from '../src/progress.ts';
import {decodeProgress} from '../src/storage.ts';

test('aura choices survive a save and old or unknown values preserve existing progress',()=>{
 const original=freshProgress();original.coins=123;original.owned.push('stone');original.pick='stone';
 const legacy=JSON.parse(JSON.stringify(original));delete legacy.aura;
 for(const raw of [legacy,{...legacy,aura:'unknown'}]){
  const restored=decodeProgress(JSON.stringify(raw));
  assert.equal(restored?.aura,'none');assert.equal(restored?.coins,123);assert.equal(restored?.pick,'stone');
 }
 for(const aura of AURAS){
  original.aura=aura;
  const restored=decodeProgress(JSON.stringify(original));
  assert.equal(restored?.aura,aura);assert.equal(restored?.coins,123);assert.equal(restored?.pick,'stone');
 }
});
