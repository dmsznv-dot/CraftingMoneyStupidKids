import {test} from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress} from '../src/progress.ts';
import {decodeProgress} from '../src/storage.ts';
import {createRun} from '../src/core.ts';

test('sound settings migrate old saves and preserve independent levels and mute',()=>{
 const old=JSON.parse(JSON.stringify(freshProgress()));delete old.musicVolume;delete old.effectsVolume;old.sound=false;old.coins=42;
 const migrated=decodeProgress(JSON.stringify(old))!;assert.equal(migrated.coins,42);assert.equal(migrated.sound,false);assert.equal(migrated.musicVolume,100);assert.equal(migrated.effectsVolume,100);
 migrated.musicVolume=0;migrated.effectsVolume=35;const saved=decodeProgress(JSON.stringify(migrated))!;
 assert.equal(saved.musicVolume,0);assert.equal(saved.effectsVolume,35);assert.equal(saved.sound,false);
 saved.musicVolume=200;saved.effectsVolume=-9;const clamped=decodeProgress(JSON.stringify(saved))!;assert.equal(clamped.musicVolume,100);assert.equal(clamped.effectsVolume,0);
});

test('a saved endless run retains the record it started against',()=>{
 const p=freshProgress(),r=createRun(0,'wood','none',false,789);r.recordBefore=120;p.endlessBest=130;p.endlessAttempt=r;
 const restored=decodeProgress(JSON.stringify(p))!;assert.equal(restored.endlessAttempt?.recordBefore,120);assert.equal(restored.endlessBest,130);
});
