/* Browser acceptance checks against the built site's local preview. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.SITE_URL || 'http://127.0.0.1:5001';
const output = process.env.SITE_SCREENSHOTS;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}) });
  const context = await browser.newContext();
  await context.addInitScript(() => {
    window.__policyViolations = [];
    document.addEventListener('securitypolicyviolation', event => {
      window.__policyViolations.push({directive:event.effectiveDirective,blocked:event.blockedURI});
    });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const routes = ['', 'protocol-emulator', 'testos', 'hardware', 'scope', 'neo', 'btree', 'resume', 'contact'];
  for (const viewport of [{width:1440,height:1000},{width:390,height:844},{width:375,height:812},{width:844,height:390}]) {
    await page.setViewportSize(viewport);
    for (const theme of ['light', 'dark']) {
      for (const route of routes) {
        const response = await page.goto(`${base}/${route}`);
        assert.equal(response.status(), 200);
        if (!route) {
          await page.evaluate(theme => setTheme(theme), theme);
          const ratios = await page.evaluate(() => {
            const styles = getComputedStyle(document.documentElement);
            const color = token => styles.getPropertyValue(token).trim();
            const luminance = hex => {
              const rgb = hex.replace('#','').match(/../g).map(c=>parseInt(c,16)/255).map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4);
              return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
            };
            const ratio = (a,b) => {const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
            return {text:['--signal','--steel','--graphite'].map(t=>ratio(color(t),color('--paper'))),button:ratio('#ffffff',color('--signal-fill')),focus:ratio(color('--signal'),color('--paper'))};
          });
          assert.ok(ratios.text.every(r=>r>=4.5) && ratios.button>=4.5 && ratios.focus>=3, JSON.stringify(ratios));
        }
        await page.evaluate(theme => setTheme(theme), theme);
        await page.locator('img').evaluateAll(async images => {
          for (const image of images) image.loading = 'eager';
          await Promise.all(images.map(image => image.decode()));
        });
        assert.deepEqual(await page.evaluate(() => window.__policyViolations), [], `CSP violation on ${route || '/'} at ${viewport.width} ${theme}`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${route} overflow at ${viewport.width} ${theme}`);
        if (route === 'neo') await page.locator('[data-selected-name]').filter({hasText:'2023 YO1'}).waitFor();
        if (viewport.width === 844) {
          await page.locator('[data-nav-toggle]').click();
          await page.locator('[data-projects-toggle]').click();
          assert.equal(await page.locator('.nav').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), true);
          await page.locator('.nav a[href="/contact"]').scrollIntoViewIfNeeded();
          assert.equal(await page.locator('.nav a[href="/contact"]').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), true);
          await page.keyboard.press('Escape');
          assert.equal(await page.locator('[data-nav-toggle]').getAttribute('aria-expanded'),'false');
        }
        if (output && ['','protocol-emulator','testos','hardware','scope','btree','neo','resume'].includes(route) && viewport.width !== 844) {
          fs.mkdirSync(output,{recursive:true});
          await page.screenshot({path:`${output}/${route || 'home'}-${viewport.width}-${theme}.png`, fullPage:true});
        }
      }
    }
  }
  // Storage may throw even while accessing the property, before getItem runs.
  const blocked = await browser.newContext({viewport:{width:390,height:844}});
  await blocked.addInitScript(() => Object.defineProperty(window,'localStorage',{get(){throw new Error('Unavailable');}}));
  const blockedPage = await blocked.newPage();
  blockedPage.on('pageerror', e => errors.push(e.message));
  await blockedPage.goto(base);
  await blockedPage.locator('[data-nav-toggle]').click();
  assert.equal(await blockedPage.locator('[data-nav-toggle]').getAttribute('aria-expanded'),'true');
  await blockedPage.locator('[data-theme-toggle]').click();
  assert.equal(await blockedPage.locator('html').getAttribute('data-theme'),'dark');
  await blocked.close();
  const themeContext = await browser.newContext();
  const themePage = await themeContext.newPage();
  const otherThemePage = await themeContext.newPage();
  await themePage.goto(base);
  await otherThemePage.goto(base);
  await otherThemePage.evaluate(() => setTheme('dark'));
  await themePage.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  assert.equal(await themePage.locator('meta[name="theme-color"]').getAttribute('content'),'#0a0a0b');
  await themePage.evaluate(() => {
    document.documentElement.dataset.theme = 'light';
    dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
  });
  assert.equal(await themePage.locator('html').getAttribute('data-theme'),'dark');
  await otherThemePage.evaluate(() => localStorage.removeItem('theme'));
  await themePage.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  await themeContext.close();
  const missing = await page.goto(`${base}/does-not-exist`);
  assert.equal(missing.status(),404);
  assert.equal(await page.locator('h1').textContent(),'Page not found.');
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex');
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(`${base}/neo`);
  await page.locator('[data-selected-name]').filter({hasText:'2023 YO1'}).waitFor();
  assert.equal(await page.locator('[data-plan-count]').textContent(),'12 example missions');
  await page.locator('[data-time-scrub]').evaluate(el => {el.value='42';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.locator('[data-play-toggle]').textContent(),'Play');
  await pause(200);
  assert.equal(await page.locator('[data-time-scrub]').inputValue(),'42');
  await page.locator('[data-play-toggle]').click();
  await pause(250);
  assert.notEqual(await page.locator('[data-time-scrub]').inputValue(),'42');
  await page.locator('[data-play-toggle]').click();
  // A failed load cannot replace the valid scene; retry commits only after success.
  await page.route('**/2025-du7.json', route => route.fulfill({status:503,body:'unavailable'}));
  await page.locator('[data-object-id="2025 DU7"]').click();
  await page.locator('[data-load-retry]').waitFor({state:'visible'});
  assert.equal(await page.locator('[data-selected-name]').textContent(),'2023 YO1');
  await page.unroute('**/2025-du7.json');
  await page.locator('[data-load-retry]').click();
  await page.locator('[data-selected-name]').filter({hasText:'2025 DU7'}).waitFor();
  // Slow earlier selections must not supersede the user's latest selection.
  await page.route('**/2025-pn7.json', async route => {await pause(300);await route.continue();});
  await page.locator('[data-object-id="2025 PN7"]').click();
  await page.locator('[data-object-id="2026 MH"]').click();
  await page.locator('[data-selected-name]').filter({hasText:'2026 MH'}).waitFor();
  await pause(400);
  assert.equal(await page.locator('[data-selected-name]').textContent(),'2026 MH');
  // Native selected buttons retain keyboard focus.
  assert.equal(await page.locator('[data-object-id="2026 MH"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.objectId),'2026 MH');
  // Backing dimensions and readout elements remain stable during playback.
  assert.equal(await page.evaluate(async () => {
    const canvas=document.querySelector('#neo-canvas');
    const metric=document.querySelector('[data-orbit-metrics]').firstChild;
    let mutations=0;
    const observer=new MutationObserver(records => {mutations+=records.length;});
    observer.observe(canvas,{attributes:true,attributeFilter:['width','height']});
    for(let i=0;i<3;i++){drawAllViewers();updateMetrics();}
    await Promise.resolve();observer.disconnect();
    return mutations===0 && metric===document.querySelector('[data-orbit-metrics]').firstChild;
  }),true);
  const unavailable = await browser.newContext();
  const up = await unavailable.newPage();
  up.on('pageerror', e => errors.push(e.message));
  await up.route('**/index.json', route => route.fulfill({status:503,body:'unavailable'}));
  await up.goto(`${base}/neo`);
  await up.locator('[data-load-retry]').waitFor({state:'visible'});
  assert.equal(await up.locator('[data-object-id]').count(),0);
  await up.unroute('**/index.json');
  await up.locator('[data-load-retry]').click();
  await up.locator('[data-selected-name]').filter({hasText:'2023 YO1'}).waitFor();
  await unavailable.close();
  const reduced = await browser.newContext({reducedMotion:'reduce'});
  const rp=await reduced.newPage();await rp.goto(`${base}/neo`);
  await rp.locator('[data-selected-name]').filter({hasText:'2023 YO1'}).waitFor();
  assert.equal(await rp.locator('[data-play-toggle]').textContent(),'Play');
  await reduced.close();
  // Reject malformed imported geometry and external paths; render text literally.
  await page.route('**/2026-mj1.json', async route => {
    const response=await route.fetch();const data=await response.json();data.polyline_au=[];
    await route.fulfill({json:data});
  });
  await page.locator('[data-object-id="2026 MJ1"]').click();
  await page.locator('[data-load-retry]').waitFor({state:'visible'});
  assert.equal(await page.locator('[data-selected-name]').textContent(),'2026 MH');
  assert.equal(await page.evaluate(() => {
    try {validateSummary({...missionPayload.objects[0],data_file:'https://example.org/track.json'});return false;} catch {return true;}
  }),true);
  await page.evaluate(() => {missionPayload.objects[0].designation='<img src=x onerror=alert(1)>';renderObjectList();});
  assert.equal(await page.locator('[data-object-list] img').count(),0);
  assert.ok((await page.locator('[data-object-list]').textContent()).includes('<img src=x onerror=alert(1)>'));
  assert.deepEqual(errors,[]);
  console.log('Passed 72 page/theme/viewport checks; storage failure, menu reachability, playback, reduced motion, retry, selection race, focus, safe data handling, and rendering stability.');
  await browser.close();
})().catch(error => {console.error(error);process.exit(1);});
