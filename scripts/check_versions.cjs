/* Tab navigation, deep links and state isolation between the two native viewers. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.SITE_URL || 'http://127.0.0.1:5001';
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[], requests=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>requests.push(r.url()));
    const panel=v=>page.locator(`[data-version-panel="${v}"]`);
    const selected=async v=>{
      assert.equal(await page.locator(`#tab-${v}`).getAttribute('aria-selected'),'true');
      assert.equal(await panel(v).isVisible(),true);
      assert.equal(await panel(v==='v3'?'v2':'v3').isVisible(),false);
    };
    const ready=async(v,mode)=>page.waitForFunction(({v,mode})=>document.querySelector(`[data-version-panel="${v}"] [data-gds-canvas]`).dataset.mode===mode,{v,mode});
    await page.goto(`${base}/protocol-emulator`);
    await selected('v3');
    assert.ok(!requests.some(u=>/manifest\.json|jsonl\.gz/.test(u)));
    await page.locator('#tab-v2').click();await selected('v2');
    assert.equal(new URL(page.url()).searchParams.get('version'),'v2');
    await page.goBack();await selected('v3');
    await page.goForward();await selected('v2');
    await page.locator('#tab-v2').focus();await page.keyboard.press('Home');await selected('v3');
    await page.keyboard.press('End');await selected('v2');
    await page.keyboard.press('ArrowRight');await selected('v3');
    await page.keyboard.press('ArrowLeft');await selected('v2');
    for(const [query,hash,v] of [['','explore-layout','v2'],['version=v2','v3-fpga','v3'],['version=v3','verification-title','v2'],['version=v3','v3-explore-layout','v3']]) {
      await page.goto(`${base}/protocol-emulator?${query}#${hash}`);await selected(v);
      await page.waitForFunction(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.top<innerHeight && r.bottom>0;},hash);
    }
    // Every tab remains legible in the supported viewport sizes.
    for(const width of [1440,860,520,390]) {
      await page.setViewportSize({width,height:1000});
      for(const v of ['v2','v3']) {
        await page.locator(`#tab-${v}`).click();await selected(v);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${v} ${width}`);
      }
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(`${base}/protocol-emulator?version=v3`);
    requests.length=0;
    await panel('v3').locator('[data-gds-start]').click();await ready('v3','preview');
    assert.ok(!requests.some(u=>u.includes('/v2/')),'V3 activation must not fetch V2 geometry');
    await panel('v3').getByRole('button',{name:'Solo layer 8/0',exact:true}).click();await ready('v3','preview');
    await page.locator('#tab-v2').click();
    assert.equal(await panel('v2').locator('[data-gds-start]').isVisible(),true);
    await panel('v2').locator('[data-gds-start]').click();await ready('v2','preview');
    assert.equal(await panel('v2').locator('[data-gds-layers] input:checked').count(),16);
    await panel('v2').locator('[data-gds-detail]').click();await ready('v2','geometry');
    for(let i=0;i<3;i++) {
      await page.locator('#tab-v3').click();await ready('v3','preview');
      assert.equal(await panel('v3').locator('[data-gds-layers] input:checked').count(),1);
      await page.locator('#tab-v2').click();await ready('v2','geometry');
      assert.equal(await panel('v2').locator('[data-gds-layers] input:checked').count(),16);
    }
    // A hidden viewer cancels stalled work and recovers when shown again.
    await page.locator('#tab-v3').click();await ready('v3','preview');
    let release;
    const held=new Promise(resolve=>{release=resolve;});
    await page.route('**/v3/**/tiles/*.jsonl.gz',async route=>{await held;await route.abort().catch(()=>{});});
    const requested=page.waitForRequest('**/v3/**/tiles/*.jsonl.gz');
    await panel('v3').locator('[data-gds-detail]').click();await requested;
    await page.locator('#tab-v2').click();await ready('v2','geometry');
    release();await page.unroute('**/v3/**/tiles/*.jsonl.gz');
    await page.locator('#tab-v3').click();await ready('v3','geometry');
    const nojs=await browser.newContext({javaScriptEnabled:false});
    const plain=await nojs.newPage();await plain.goto(`${base}/protocol-emulator`);
    for(const v of ['v2','v3'])assert.equal(await plain.locator(`#version-${v}`).isVisible(),true);
    assert.equal(await plain.locator('[data-gds-start]:visible').count(),0);
    await nojs.close();
    // Fresh URL selection, invalid query and malformed fragment all remain usable.
    for(const [suffix,v] of [['?version=v2','v2'],['?version=unknown','v3'],['#%E0%A4%A','v3']]) {
      await page.goto(`${base}/protocol-emulator${suffix}`);await selected(v);
    }
    assert.deepEqual(errors,[]);
    console.log('Passed version selection, history, keyboard navigation, legacy/deep links, responsive viewports, independent viewer state, cancellation and no-JavaScript presentation.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1);});
