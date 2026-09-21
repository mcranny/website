/* Exercise tiled layout recovery, gestures, and both video formats. */
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.SITE_URL || 'http://127.0.0.1:5001';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/protocol-emulator`);
  await page.locator('[data-layout-controls]').waitFor({state:'visible'});
  assert.equal(await page.locator('[data-layout-fallback]').isVisible(), false);
  await page.waitForFunction(() => document.querySelector('[data-layout-status]').textContent === '');
  assert.equal(await page.locator('#layout-viewer').getAttribute('role'), 'region');
  assert.equal(await page.locator('[data-layout-help]').isVisible(), true);
  const viewer = page.locator('#layout-viewer');
  await viewer.scrollIntoViewIfNeeded();
  await wait(600);
  const frame = await viewer.boundingBox();
  assert.ok(Math.abs(frame.width/frame.height - 1289.28/710.64) < 0.005, 'Viewer must match the die aspect ratio');
  const canvas = viewer.locator('canvas').first();
  const pixels = () => canvas.evaluate(el => el.toDataURL());
  const original = await pixels();
  const screenshot = async name => {
    if(process.env.SITE_SCREENSHOTS) {
      fs.mkdirSync(process.env.SITE_SCREENSHOTS,{recursive:true});
      await viewer.screenshot({path:`${process.env.SITE_SCREENSHOTS}/${name}.png`});
    }
  };
  await screenshot('layout-overview');
  const levels = [];
  page.on('request', r => {const match = r.url().match(/layout_files\/(\d+)\//);if(match) levels.push(Number(match[1]));});
  for(let i=0;i<4;i++) await page.locator('[data-layout-in]').click();
  await wait(1400);
  assert.ok(levels.some(level => level === 13 || level === 14), 'Intermediate tiles must load at mid zoom');
  await screenshot('layout-mid-zoom');
  for(let i=0;i<5;i++) await page.locator('[data-layout-in]').click();
  await wait(1400);
  assert.ok(levels.includes(15), 'Full-resolution tiles must load when zoomed');
  assert.notEqual(await pixels(), original);
  await screenshot('layout-detail');
  await page.locator('[data-layout-home]').click();
  await wait(700);
  await viewer.hover();
  const scroll = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0,220);
  await wait(350);
  assert.ok(await page.evaluate(() => scrollY) > scroll, 'Wheel must scroll the page');
  await page.locator('[data-layout-full]').click();
  await wait(350);
  assert.equal(await page.evaluate(() => !!document.fullscreenElement), true);
  assert.equal(await page.locator('[data-layout-in]').isVisible(), true);
  await page.locator('[data-layout-full]').click();
  await wait(350);
  assert.equal(await page.evaluate(() => !!document.fullscreenElement), false);
  await page.route('**/layout.dzi', route => route.fulfill({status:503,body:'unavailable'}));
  await page.reload();
  await page.locator('[data-layout-retry]').waitFor({state:'visible'});
  assert.equal(await page.locator('[data-layout-fallback]').isVisible(), true);
  assert.equal(await page.locator('[data-layout-help]').isVisible(), false);
  await page.unroute('**/layout.dzi');
  await page.locator('[data-layout-retry]').click();
  await page.locator('[data-layout-controls]').waitFor({state:'visible'});
  assert.equal(await page.locator('[data-layout-fallback]').isVisible(), false);
  const nojs = await browser.newContext({javaScriptEnabled:false});
  const np = await nojs.newPage();await np.goto(`${base}/protocol-emulator`);
  assert.equal(await np.locator('[data-layout-fallback]').isVisible(),true);
  assert.equal(await np.locator('#layout-viewer').isVisible(),false);
  assert.equal(await np.locator('[data-layout-status]').textContent(),'');
  assert.equal(await np.locator('[data-layout-help]').isVisible(),false);
  await nojs.close();
  const touch = await browser.newContext({viewport:{width:375,height:812},hasTouch:true,isMobile:true});
  const tp = await touch.newPage();await tp.goto(`${base}/protocol-emulator`);
  await tp.locator('[data-layout-controls]').waitFor({state:'visible'});
  await tp.locator('#layout-viewer').scrollIntoViewIfNeeded();await wait(600);
  const before = await tp.locator('#layout-viewer canvas').first().evaluate(el=>el.toDataURL());
  const box = await tp.locator('#layout-viewer').boundingBox();
  const client = await touch.newCDPSession(tp);
  const center = {x:box.x+box.width/2,y:box.y+box.height/2};
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:center.x-25,y:center.y,id:0},{x:center.x+25,y:center.y,id:1}]});
  for(let d=30;d<=95;d+=5) await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:center.x-d,y:center.y,id:0},{x:center.x+d,y:center.y,id:1}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await wait(800);
  assert.notEqual(await tp.locator('#layout-viewer canvas').first().evaluate(el=>el.toDataURL()),before,'Pinch must change the view');
  const zoomed = await tp.locator('#layout-viewer canvas').first().evaluate(el=>el.toDataURL());
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:center.x,y:center.y,id:0}]});
  for(let offset=5;offset<=65;offset+=5) await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:center.x+offset,y:center.y+offset/2,id:0}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await wait(800);
  assert.notEqual(await tp.locator('#layout-viewer canvas').first().evaluate(el=>el.toDataURL()),zoomed,'Touch drag must pan the view');
  assert.equal(await tp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await touch.close();
  for(const [route,name] of [['testos','boot'],['scope','viewer']]) {
    await page.goto(`${base}/${route}`);
    // Exercise the browser-selected source through the visible player as well
    // as loading each encoding directly below.
    await page.locator('video').click();
    await page.waitForFunction(() => {
      const video = document.querySelector('video');
      return !video.paused && video.currentTime > 0 && !video.error;
    });
    for(const ext of ['webm','mp4']) {
      const info = await page.locator('video').evaluate(async (video,url)=>{
        video.src=url;video.load();await video.play();
        await new Promise(resolve=>setTimeout(resolve,350));
        const result={duration:video.duration,time:video.currentTime,muted:video.muted,width:video.videoWidth,error:video.error?.message};
        video.pause();return result;
      },`${base}/assets/${route}/${name}.${ext}`);
      assert.ok(info.duration>0 && info.duration<=30 && info.time>0 && info.muted && info.width>0 && !info.error,JSON.stringify(info));
    }
  }
  await page.goto(base);
  await page.evaluate(()=>setTheme('dark'));
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'),'#0a0a0b');
  assert.deepEqual(errors,[]);
  await browser.close();
  console.log('Passed full-resolution zoom, wheel scroll, fullscreen, retry, no-JS fallback, touch pinch, both video formats, and theme persistence.');
})().catch(error=>{console.error(error);process.exit(1);});
