import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5173');await page.waitForSelector('#drop');
 await page.clock.install();await page.locator('#drop').click();await page.clock.runFor(30000);
 assert.equal(await page.evaluate(()=>window.shaft.run.status),'won');
 const coins=await page.evaluate(()=>window.shaft.progress.coins);assert.ok(coins>=60);
 await page.reload();await page.waitForSelector('#stage canvas');assert.equal(await page.evaluate(()=>window.shaft.progress.coins),coins);
 await page.locator('[data-action=next]').click();await page.locator('#drop').click();await page.clock.runFor(3000);
 assert.notEqual(await page.locator('#depth').textContent(),'0%');
 await page.locator('#pause').click();const before=await page.evaluate(()=>window.shaft.run.time);
 await page.clock.runFor(1000);assert.equal(await page.evaluate(()=>window.shaft.run.time),before);
 await page.locator('[data-action=restart]').click();await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.equal(await page.locator('#drop').isVisible(),true);assert.deepEqual(errors,[]);
 const denied=await browser.newContext();await denied.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError')}}));
 const blocked=await denied.newPage();await blocked.goto('http://127.0.0.1:5173');await blocked.waitForSelector('#drop');assert.equal(await blocked.locator('#drop').isVisible(),true);
 await denied.close();console.log('PASS: completion, no duplicate reward on reload, next-run HUD, pause, mobile and denied-storage boot');
}finally{await browser.close();}
