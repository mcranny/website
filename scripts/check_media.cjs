/* Exercise native V2 geometry, failure recovery, gestures, and video formats. */
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.SITE_URL || 'http://127.0.0.1:5001';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  const context = await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(() => {
    window.__policyViolations = [];
    document.addEventListener('securitypolicyviolation', event => window.__policyViolations.push(event.effectiveDirective));
  });
  const page = await context.newPage();
  const errors = [], requests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => requests.push(r.url()));
  const canvas = page.locator('[data-gds-canvas]');
  const pixels = () => canvas.evaluate(el => el.toDataURL());
  const ready = async mode => page.waitForFunction(mode => document.querySelector('[data-gds-canvas]').dataset.mode === mode, mode);
  const screenshot = async name => {
    if(process.env.SITE_SCREENSHOTS) {
      fs.mkdirSync(process.env.SITE_SCREENSHOTS,{recursive:true});
      await page.locator('[data-gds-viewer]').screenshot({path:`${process.env.SITE_SCREENSHOTS}/${name}.png`});
    }
  };
  await page.goto(`${base}/protocol-emulator`);
  assert.equal(await page.locator('iframe').count(),0);
  assert.equal(await page.locator('[data-gds-fallback]').isVisible(),true);
  assert.ok(!requests.some(url => /gds-viewer\.js|manifest\.json|jsonl\.gz/.test(url)), 'Geometry must stay unloaded before activation');
  const activationStart = Date.now();
  await page.locator('[data-gds-start]').click();
  await ready('preview');
  const activationMs = Date.now()-activationStart;
  assert.equal(await page.locator('[data-gds-fallback]').isVisible(),false);
  assert.ok(!requests.some(url => url.endsWith('.jsonl.gz')), 'Overview must not fetch geometry tiles');
  assert.equal(await page.locator('[data-gds-layers] input').count(),16);
  await screenshot('v2-layout-overview');
  const detailStart = Date.now();
  await page.locator('[data-gds-detail]').click();
  await ready('geometry');
  const detailMs = Date.now()-detailStart;
  const resources = await page.evaluate(() => performance.getEntriesByType('resource').filter(r => r.name.includes('/layout-447b3df/')).map(r=>({name:r.name.split('/').pop(),bytes:r.encodedBodySize})));
  console.log(JSON.stringify({activationMs,detailMs,layoutResources:resources.length,layoutBytes:resources.reduce((n,r)=>n+r.bytes,0),geometryRequests:resources.filter(r=>r.name.endsWith('.jsonl.gz')).length}));
  const original = await pixels();
  assert.match(await page.locator('[data-gds-mode]').textContent(),/Original polygon geometry/);
  assert.ok(requests.some(url => url.endsWith('.jsonl.gz')));
  assert.ok(requests.every(url => new URL(url).origin === new URL(base).origin), 'Viewer must use same-origin assets only');
  await screenshot('v2-layout-geometry');
  assert.equal(await page.locator('[data-gds-layer-panel]').getAttribute('open'),'');
  await page.getByRole('button',{name:'Solo layer 8/0',exact:true}).click();
  await ready('geometry');
  assert.equal(await page.locator('[data-gds-layers] input:checked').count(),1);
  assert.notEqual(await pixels(),original);
  await screenshot('v2-layout-solo');
  await page.locator('[data-gds-none]').click();
  await ready('empty');
  await page.locator('[data-gds-all]').click();
  await ready('geometry');
  assert.equal(await page.locator('[data-gds-layers] input:checked').count(),16);
  await canvas.focus(); await page.keyboard.press('+'); await ready('geometry');
  const zoomed = await pixels();
  await page.keyboard.press('ArrowRight'); await ready('geometry');
  assert.notEqual(await pixels(),zoomed, 'Keyboard panning must change geometry');
  await page.keyboard.press('f'); await ready('preview');
  await canvas.hover(); const scroll = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0,180); await wait(250);
  assert.ok(await page.evaluate(() => scrollY) > scroll, 'Ordinary wheel must scroll the page');
  await page.locator('[data-gds-detail]').click(); await ready('geometry');
  const beforeFull = await page.locator('[data-gds-status]').textContent();
  await page.locator('[data-gds-full]').click();
  assert.equal(await page.evaluate(() => !!document.fullscreenElement),true);
  await ready('geometry');
  assert.equal(await page.locator('[data-gds-layers] input:checked').count(),16);
  await page.locator('[data-gds-full]').click(); await ready('geometry');
  assert.equal(await page.evaluate(() => !!document.fullscreenElement),false);
  assert.equal((await page.locator('[data-gds-status]').textContent()).split(' · ').at(-1),beforeFull.split(' · ').at(-1));
  assert.deepEqual(await page.evaluate(() => window.__policyViolations),[]);

  // Every intermediate zoom gets an appropriate raster level; only close views
  // request polygons. Layer changes and rapid zooms must finish coherently.
  await page.reload(); await page.locator('[data-gds-start]').click(); await ready('preview');
  const levels=[];
  for(let step=0;step<5;step++) {
    const state=await canvas.evaluate(el=>({mode:el.dataset.mode,level:Number(el.dataset.rasterLevel),bytes:Number(el.dataset.rasterCacheBytes)}));
    if(state.mode==='geometry')break;
    assert.ok(state.bytes<=64*1024*1024,'Decoded raster cache exceeds budget');
    levels.push(state.level);
    await screenshot(`v2-raster-level-${state.level}`);
    await page.locator('[data-gds-in]').click();
    await page.waitForFunction(()=>['preview','geometry'].includes(document.querySelector('[data-gds-canvas]').dataset.mode));
  }
  assert.ok(new Set(levels).size>=4,'Zoom must select progressively sharper raster levels');
  await page.locator('[data-gds-fit]').click(); await ready('preview');
  const allRaster=await pixels();
  await page.getByRole('button',{name:'Solo layer 8/0',exact:true}).click(); await ready('preview');
  assert.equal(await page.locator('[data-gds-layers] input:checked').count(),1);
  assert.notEqual(await pixels(),allRaster);
  await page.locator('[data-gds-all]').click(); await ready('preview');
  assert.equal(await pixels(),allRaster,'Returning to all layers must restore the combined raster');
  await page.reload(); await page.locator('[data-gds-start]').click(); await ready('preview');
  await page.route('**/raster-v1/2/all/*.webp',route=>route.fulfill({status:503,body:'unavailable'}));
  await page.locator('[data-gds-in]').click();
  await page.waitForFunction(()=>['preview','error'].includes(document.querySelector('[data-gds-canvas]').dataset.mode));
  // At DPR 1 the first zoom is level 1, the following zoom is level 2.
  if(await canvas.getAttribute('data-mode')!=='error')await page.locator('[data-gds-in]').click();
  await ready('error');
  assert.equal(await page.locator('[data-gds-retry]').isVisible(),true);
  await page.unroute('**/raster-v1/2/all/*.webp');
  await page.locator('[data-gds-retry]').click(); await ready('preview');
  await page.evaluate(()=>{for(let i=0;i<3;i++)document.querySelector('[data-gds-in]').click();document.querySelector('[data-gds-fit]').click();});
  await ready('preview');
  assert.equal(await pixels(),allRaster,'Rapid zoom cancellation must leave the final requested view');

  // Initial manifest and preview failures retain the static preview and retry.
  for (const pattern of ['**/layout-447b3df/manifest.json','**/raster-v1/0/all/0-0.webp']) {
    await page.route(pattern, route => route.fulfill({status:503,body:'unavailable'}));
    await page.reload(); await page.locator('[data-gds-start]').click();
    await page.getByRole('button',{name:'Retry explorer',exact:true}).waitFor();
    assert.equal(await page.locator('[data-gds-fallback]').isVisible(),true);
    assert.equal(await canvas.isVisible(),false);
    await page.unroute(pattern); await page.locator('[data-gds-start]').click(); await ready('preview');
  }
  // HTTP failure and checksum corruption must never become displayed geometry.
  for (const corrupt of [false,true]) {
    await page.reload(); await page.locator('[data-gds-start]').click(); await ready('preview');
    await page.route('**/tiles/*.jsonl.gz', route => route.fulfill({status:corrupt?200:503,body:'invalid geometry'}));
    await page.locator('[data-gds-detail]').click(); await ready('error');
    assert.match(await page.locator('[data-gds-status]').textContent(),corrupt?/checksum mismatch/:/HTTP 503/);
    assert.equal(await page.locator('[data-gds-retry]').isVisible(),true);
    await page.unroute('**/tiles/*.jsonl.gz');
    await page.locator('[data-gds-retry]').click(); await ready('geometry');
  }
  // Raster corruption uses the same verified retry path as geometry.
  await page.reload(); await page.locator('[data-gds-start]').click(); await ready('preview');
  await page.route('**/raster-v1/1/all/*.webp',route=>route.fulfill({status:200,body:'corrupt raster'}));
  await page.locator('[data-gds-in]').click(); await ready('error');
  assert.match(await page.locator('[data-gds-status]').textContent(),/Raster checksum mismatch/);
  await page.unroute('**/raster-v1/1/all/*.webp');
  await page.locator('[data-gds-retry]').click(); await ready('preview');
  await page.route('**/raster-v1/manifest.json',async route=>{
    const response=await route.fetch(),data=await response.json();data.source_sha256='wrong';await route.fulfill({json:data});
  });
  await page.reload();await page.locator('[data-gds-start]').click();
  await page.getByRole('button',{name:'Retry explorer',exact:true}).waitFor();
  assert.match(await page.locator('[data-gds-status]').textContent(),/Raster manifest does not match/);
  await page.unroute('**/raster-v1/manifest.json');
  // Mismatched source manifests cannot silently change the displayed revision.
  await page.route('**/layout-447b3df/manifest.json', async route => {
    const response=await route.fetch(), data=await response.json(); data.source_sha256='wrong'; await route.fulfill({json:data});
  });
  await page.reload(); await page.locator('[data-gds-start]').click();
  await page.getByRole('button',{name:'Retry explorer',exact:true}).waitFor();
  assert.match(await page.locator('[data-gds-status]').textContent(),/does not match/);
  await page.unroute('**/layout-447b3df/manifest.json');
  const nojs = await browser.newContext({javaScriptEnabled:false});
  const np = await nojs.newPage(); await np.goto(`${base}/protocol-emulator`);
  assert.equal(await np.locator('[data-gds-fallback]').isVisible(),true);
  assert.equal(await np.locator('[data-gds-start]').isVisible(),false);
  assert.equal(await np.locator('a[download]').count(),1);
  await nojs.close();
  const unsupported = await browser.newContext();
  await unsupported.addInitScript(() => { window.DecompressionStream = undefined; });
  const up = await unsupported.newPage(); await up.goto(`${base}/protocol-emulator`);
  await up.locator('[data-gds-start]').click();
  await up.getByRole('button',{name:'Retry explorer',exact:true}).waitFor();
  assert.equal(await up.locator('[data-gds-fallback]').isVisible(),true);
  await unsupported.close();
  const touch = await browser.newContext({viewport:{width:375,height:812},hasTouch:true,isMobile:true});
  const tp = await touch.newPage(); await tp.goto(`${base}/protocol-emulator`);
  tp.on('pageerror', e => errors.push(e.message));
  await tp.locator('[data-gds-start]').click();
  await tp.waitForFunction(() => document.querySelector('[data-gds-canvas]').dataset.mode === 'preview');
  const tc=tp.locator('[data-gds-canvas]'); await tc.scrollIntoViewIfNeeded();
  const before=await tc.evaluate(el=>el.toDataURL());
  const box=await tc.boundingBox(), center={x:box.x+box.width/2,y:box.y+box.height/2};
  const client=await touch.newCDPSession(tp);
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:center.x-25,y:center.y,id:0},{x:center.x+25,y:center.y,id:1}]});
  for(let d=30;d<=95;d+=5) await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:center.x-d,y:center.y,id:0},{x:center.x+d,y:center.y,id:1}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await wait(350);
  assert.notEqual(await tc.evaluate(el=>el.toDataURL()),before,'Pinch must change the view');
  const touchZoomed=await tc.evaluate(el=>el.toDataURL());
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:center.x,y:center.y,id:0}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:center.x+50,y:center.y+20,id:0}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await wait(350);
  assert.notEqual(await tc.evaluate(el=>el.toDataURL()),touchZoomed,'Drag must pan');
  await tp.locator('[data-gds-layer-panel] summary').click();
  assert.equal(await tp.locator('[data-gds-layers]').isVisible(),true);
  assert.equal(await tp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(process.env.SITE_SCREENSHOTS) await tp.screenshot({path:`${process.env.SITE_SCREENSHOTS}/v2-mobile-active.png`,fullPage:true});
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
  console.log('Passed multi-resolution zoom, raster/geometry checksum and source recovery, cancellation, layer isolation, keyboard/touch, fullscreen, fallback, CSP, video formats and theme persistence.');
})().catch(error=>{console.error(error);process.exit(1);});
