/* Targeted prototype checks and reproducible review screenshots. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.PROTOTYPE_URL || 'http://127.0.0.1:5012';
(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  const out = path.join(__dirname, 'screenshots');
  fs.mkdirSync(out, {recursive:true});
  const texts = {};
  let count = 0;
  try {
    for (const style of ['a','b','c']) for (const [name,file] of [['home','index.html'],['asic','asic.html']]) {
      for (const width of [1440,390]) {
        const page = await browser.newPage({viewport:{width,height:width===390?844:1000},colorScheme:'dark'});
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
        await page.goto(`${base}/prototypes/redesign/${style}/${file}`);
        await page.locator('img').evaluateAll(images => Promise.all(images.map(i => i.decode())));
        assert.equal(await page.locator('h1').count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${style}/${name} overflow at ${width}`);
        assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), 'light');
        const contrast = await page.evaluate(() => {
          const css=getComputedStyle(document.documentElement);
          const luminance = token => {
            const channels=css.getPropertyValue(token).trim().replace('#','');
            const hex=channels.length===3 ? [...channels].map(c=>c+c).join('') : channels;
            const rgb=hex.match(/../g).map(c=>parseInt(c,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
            return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
          };
          const background=luminance('--paper');
          return ['--ink','--muted','--link'].map(t=>(Math.max(background,luminance(t))+.05)/(Math.min(background,luminance(t))+.05));
        });
        assert.ok(contrast.every(r=>r>=4.5),'Text and link contrast');
        const text = await page.locator('main').innerText();
        if (texts[name]) assert.equal(text,texts[name], 'Content must match across styles'); else texts[name]=text;
        const edges = await page.locator('.site-header, main, footer').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().left));
        assert.ok(edges.every(x=>Math.abs(x-edges[0])<1),'Shared left alignment');
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(()=>document.activeElement.className),'skip');
        await page.keyboard.press('Enter');
        assert.equal(new URL(page.url()).hash,'#main');
        await page.locator('h1').click();
        await page.evaluate(()=>window.scrollTo(0,0));
        await page.screenshot({path:path.join(out,`${style}-${name}-${width===390?'mobile':'desktop'}.png`),fullPage:true});
        await page.evaluate(()=>document.documentElement.style.fontSize='32px');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true, '200% text overflow');
        const localLinks=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(n=>n.href).filter(h=>h.startsWith(location.origin)));
        for (const href of new Set(localLinks)) assert.ok((await page.request.get(href)).ok(),`Broken local link: ${href}`);
        assert.deepEqual(errors,[]);
        await page.close(); count++;
      }
    }
    const published=JSON.parse(fs.readFileSync(path.join(__dirname,'../../scripts/public-files.json'),'utf8'));
    assert.ok(!published.some(f=>f.startsWith('prototypes/')));
    console.log(`Passed ${count} page/viewport cases: matching content, images, local links, alignment, overflow, 200% text, keyboard skip link, and light mode under dark preference. Prototypes excluded from publication.`);
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
