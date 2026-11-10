/* Page navigation, accessibility, responsive layout, and retired-route behavior. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.SITE_URL || 'http://127.0.0.1:5001';
(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  try {
    const context = await browser.newContext({colorScheme:'dark'});
    await context.addInitScript(() => {
      window.__policyViolations=[];
      document.addEventListener('securitypolicyviolation', e=>window.__policyViolations.push(e.violatedDirective));
      // Existing preferences must not change the light-only site.
      localStorage.setItem('theme','dark');
    });
    const page = await context.newPage();
    const errors=[];
    page.on('pageerror', e=>errors.push(e.message));
    const routes=['','experience','projects','protocol-emulator','testos','btree','resume','missing-page'];
    let cases=0;
    if(process.env.SITE_SCREENSHOTS) fs.mkdirSync(process.env.SITE_SCREENSHOTS,{recursive:true});
    for(const width of [1440,860,520,390]) for(const route of routes) {
      await page.setViewportSize({width,height:1000});
      const response=await page.goto(`${base}/${route}`);
      assert.equal(response.status(),route==='missing-page'?404:200);
      await page.locator('img:visible').evaluateAll(images=>Promise.all(images.map(i=>{i.loading='eager';return i.decode();})));
      assert.equal(await page.locator('h1').count(),1);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${route} overflow ${width}`);
      assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),'light');
      assert.equal(await page.locator('[data-theme-toggle], [data-projects-toggle], [data-nav-toggle]').count(),0);
      assert.deepEqual(await page.locator('.nav a').evaluateAll(a=>a.map(n=>n.getAttribute('href'))),['/experience','/projects','/resume']);
      const edges=await page.locator('.topbar,main,.site-footer').evaluateAll(a=>a.map(n=>n.getBoundingClientRect().left));
      assert.ok(edges.every(x=>Math.abs(x-edges[0])<1),'Shared container alignment');
      assert.deepEqual(await page.evaluate(()=>window.__policyViolations),[]);
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(()=>document.activeElement.className),'skip-link');
      await page.keyboard.press('Enter');
      assert.equal(new URL(page.url()).hash,'#main-content');
      await page.locator('h1').click();
      await page.evaluate(()=>window.scrollTo(0,0));
      if(process.env.SITE_SCREENSHOTS && [1440,390].includes(width)) await page.screenshot({path:`${process.env.SITE_SCREENSHOTS}/${route||'home'}-${width}.png`,fullPage:true});
      await page.evaluate(()=>document.documentElement.style.fontSize='32px');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${route} enlarged text overflow ${width}`);
      cases++;
    }
    await page.goto(base);
    const ratios=await page.evaluate(()=>{
      const css=getComputedStyle(document.documentElement);
      const lum=t=>{const c=css.getPropertyValue(t).trim().slice(1).match(/../g).map(h=>parseInt(h,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
      const bg=lum('--paper');return ['--ink','--graphite','--steel','--signal'].map(t=>(bg+.05)/(lum(t)+.05));
    });
    assert.ok(ratios.every(r=>r>=4.5),'Text/link contrast');
    for(const route of ['experience','projects','resume']) {
      await page.locator(`.nav a[href="/${route}"]`).click();
      assert.equal(new URL(page.url()).pathname,`/${route}`);
      assert.equal(new URL(page.url()).hash,'');
    }
    for(const route of ['scope','neo','hardware','contact']) for(const path of [`/${route}`,`/${route}/`, `/${route}.html`,`/pages/${route}.html`]) {
      const response=await page.request.get(`${base}${path}`,{maxRedirects:0});
      assert.equal(response.status(),301);
      assert.equal(response.headers().location,route==='contact'?'/':'/projects');
      const target=await page.request.get(base+response.headers().location,{maxRedirects:0});
      assert.equal(target.status(),200,'Redirect target must not redirect again');
    }
    const nojs=await browser.newContext({javaScriptEnabled:false});
    const plain=await nojs.newPage();
    await plain.goto(base);
    await plain.locator('.nav a[href="/projects"]').click();
    assert.equal(new URL(plain.url()).pathname,'/projects');
    assert.equal(await plain.locator('.project-row').count(),3);
    await nojs.close();
    assert.deepEqual(errors,[]);
    console.log(`Passed ${cases} page/viewport checks, contrast, 200% text, keyboard access, separate-page navigation, no-JavaScript navigation, and 16 direct redirects.`);
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
