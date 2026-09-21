const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
  await page.goto(pathToFileURL(path.join(__dirname,'social-preview.html')).href);
  await page.screenshot({path:path.join(__dirname,'../assets/site-preview.png')});
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
