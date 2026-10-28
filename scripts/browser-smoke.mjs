import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const base=process.env.GAME_URL||'http://127.0.0.1:5173';
try{
 const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(base);await page.waitForSelector('#drop');
 assert.equal(await page.evaluate(()=>window.shaft.run.mode),'endless');
 assert.equal(await page.locator('#mode-switch').count(),0);
 await page.clock.install();await page.locator('#drop').click();await page.clock.runFor(3500);
 assert.ok(await page.evaluate(()=>window.shaft.run.time)>0,'the endless run progresses');
 await page.locator('#pause').click();const before=await page.evaluate(()=>window.shaft.run.time);
 await page.clock.runFor(1000);assert.equal(await page.evaluate(()=>window.shaft.run.time),before);
 await page.locator('[data-action=restart]').click();
 // The persistent header shop must return to the result, not a dead mine.
 await page.locator('#drop').click();await page.evaluate(()=>{window.shaft.run.hp=0;});await page.clock.runFor(100);
 assert.equal(await page.locator('.modal-panel.result').isVisible(),true);
 await page.locator('#shop').click();await page.locator('.shop-panel [data-action=close]').click();
 assert.equal(await page.locator('.modal-panel.result').isVisible(),true);
 await page.locator('.result [data-action=workshop]').click();await page.keyboard.press('Escape');
 assert.equal(await page.locator('.modal-panel.result').isVisible(),true);
 await page.locator('.result [data-action=restart]').click();
 await page.setViewportSize({width:320,height:640});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.equal(await page.locator('#drop').isVisible(),true);
 assert.deepEqual(errors,[]);await context.close();
 const denied=await browser.newContext();await denied.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError')}}));
 const blocked=await denied.newPage();await blocked.goto(base);await blocked.waitForSelector('#drop');assert.equal(await blocked.locator('#drop').isVisible(),true);
 await denied.close();console.log('PASS: endless run, pause, shop return, restart, mobile and denied-storage boot');
}finally{await browser.close();}
