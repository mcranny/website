/* Cold mobile delivery budgets, measured at 1.6 Mbps with 150 ms latency. */
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.SITE_URL || 'http://127.0.0.1:5001';
(async () => {
  const browser = await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try {
    for (const version of [null, 'v3', 'v2']) {
      const context = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
      const page = await context.newPage(), session = await context.newCDPSession(page);
      await session.send('Network.enable');
      await session.send('Network.setCacheDisabled',{cacheDisabled:true});
      await session.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:100000});
      await page.goto(`${base}/${version?`protocol-emulator?version=${version}`:''}`);
      if (!version) {
        const image = page.locator('.flagship-media img');
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(image=>image.decode());
        const bytes = await image.evaluate(image=>performance.getEntriesByName(image.currentSrc).at(-1).encodedBodySize);
        assert.ok(bytes > 0 && bytes < 50000, `Homepage chip preview: ${bytes} bytes`);
        console.log(JSON.stringify({page:'home',chipPreviewBytes:bytes}));
      } else {
        const requests = [];
        page.on('request',r=>requests.push(r.url()));
        const root = page.locator(`[data-version-panel="${version}"] [data-gds-viewer]`);
        await root.scrollIntoViewIfNeeded();
        await root.locator('[data-gds-fallback] img').evaluate(image=>image.decode());
        assert.ok(!requests.some(url=>/manifest\.json|jsonl\.gz/.test(url)), 'Viewer loads only on activation');
        await page.evaluate(()=>performance.clearResourceTimings());
        const start = Date.now();
        await root.locator('[data-gds-start]').click();
        await root.locator('[data-gds-canvas][data-mode="preview"]').waitFor({timeout:15000});
        const elapsedMs = Date.now()-start;
        const assets = await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('/protocol-emulator/')||r.name.endsWith('/gds-viewer.js')).map(r=>({url:r.name,bytes:r.encodedBodySize})));
        const bytes = assets.reduce((sum,r)=>sum+r.bytes,0);
        assert.ok(bytes > 0 && bytes < 260000, `${version} startup: ${bytes} bytes`);
        assert.ok(!requests.some(url=>url.includes('/raster-v1/manifest.json')||url.endsWith('.jsonl.gz')), 'Startup must avoid full catalogs and geometry');
        assert.ok(!requests.some(url=>url.includes(version==='v3'?'/v2/':'/v3/')), 'Inactive layout must remain unloaded');
        console.log(JSON.stringify({page:version,viewerBytes:bytes,elapsedMs}));
      }
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1);});
