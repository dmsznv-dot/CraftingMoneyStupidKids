import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PauseGate,runAd} from '../src/platform.ts';
import {decodeProgress,SaveStore} from '../src/storage.ts';
import {freshProgress} from '../src/progress.ts';
import type {Player} from 'ysdk';

test('ad close removes only ad pause; hidden and user pause survive',()=>{
 const gate=new PauseGate();gate.set('ad',true);gate.set('hidden',true);gate.set('user',true);gate.set('ad',false);
 assert.equal(gate.paused,true);gate.set('hidden',false);assert.equal(gate.paused,true);gate.set('user',false);assert.equal(gate.paused,false);
});
test('malformed saves and unsupported versions cannot create unsafe progress',()=>{
 assert.equal(decodeProgress('broken'),null);assert.equal(decodeProgress('{"version":2}'),null);
 assert.equal(decodeProgress('{"version":1,"coins":-20}'),null);
});
test('duplicate SDK terminal callbacks complete once and ignore late rewards',async()=>{
 const gate=new PauseGate();let grants=0;const answer=await runAd(gate,callbacks=>{callbacks.onOpen();callbacks.onRewarded();callbacks.onRewarded();callbacks.onClose();callbacks.onError();callbacks.onRewarded();},()=>grants++);
 assert.equal(grants,1);assert.equal(answer,'rewarded');assert.equal(gate.paused,false);
});
test('SDK synchronous error releases its own pause without cancelling a user pause',async()=>{
 const gate=new PauseGate();gate.set('user',true);
 assert.equal(await runAd(gate,()=>{throw Error('offline');}), 'error');assert.equal(gate.paused,true);
});

test('conflicting saves cannot write cloud until the user resolves them',async()=>{
 const local=freshProgress();local.coins=20;const cloud=freshProgress();cloud.coins=900;
 let cloudCoins=900;const prior=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify(local),setItem:()=>{}}});
 try{
  const player={getUniqueID:()=> 'test',getData:async()=>({shaft:cloud}),setData:async(data:{shaft:{coins:number}})=>{cloudCoins=data.shaft.coins;}} as unknown as Player;
  const store=new SaveStore(),loaded=await store.load(player);assert.equal(loaded.conflict,true);
  loaded.local.sound=false;store.save(loaded.local);await store.flush(loaded.local,true);assert.equal(cloudCoins,900);
 }finally{if(prior)Object.defineProperty(globalThis,'localStorage',prior);else Reflect.deleteProperty(globalThis,'localStorage');}
});
test('unavailable local storage still returns a playable guest and exposes no saved local state',async()=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,get:()=>{throw Error('SecurityError');}});
 try{const loaded=await new SaveStore().load(null);assert.equal(loaded.local.coins,0);assert.equal(loaded.hasLocal,false);}
 finally{if(prior)Object.defineProperty(globalThis,'localStorage',prior);else Reflect.deleteProperty(globalThis,'localStorage');}
});
