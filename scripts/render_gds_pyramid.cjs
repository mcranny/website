/* Render original polygon tiles with Chromium's canvas rasterizer.
 * Usage: CHROME_PATH=... PYTHON=... node scripts/render_gds_pyramid.cjs
 * Intermediate PNGs live outside the public asset directory; Python builds
 * lossless, guttered WebP levels and the checksum manifest from these renders.
 */
const {chromium}=require('playwright');
const fs=require('node:fs'), path=require('node:path'), os=require('node:os');
const {gunzipSync}=require('node:zlib'), {createHash}=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const source=path.resolve(process.argv[2] || path.join(root,'assets/protocol-emulator/v2/layout-447b3df'));
const output=path.resolve(process.argv[3] || path.join(source,'../raster-v1'));
const scratchBase=process.env.GDS_RASTER_SCRATCH || os.tmpdir();
const meta=JSON.parse(fs.readFileSync(path.join(source,'manifest.json')));
const maxLevel=Math.log2(meta.columns);
if(!Number.isInteger(maxLevel) || meta.rows!==meta.columns/2)throw new Error('Expected power-of-two geometry grid with twice as many columns as rows');
const tileHeight=Math.round(2048*(meta.bounds[3]-meta.bounds[1])/(meta.bounds[2]-meta.bounds[0]));
const digest=buffer=>createHash('sha256').update(buffer).digest('hex');
(async()=>{
 fs.mkdirSync(scratchBase,{recursive:true});
 const scratch=process.env.GDS_RASTER_RESUME || fs.mkdtempSync(path.join(scratchBase,'website-gds-raster-'));
 const settings=JSON.stringify({source:meta.source_sha256,columns:meta.columns,rows:meta.rows,tileHeight,render:'canvas-2x-v1'});
 const settingsPath=path.join(scratch,'settings.json');
 if(fs.existsSync(settingsPath) && fs.readFileSync(settingsPath,'utf8')!==settings)throw new Error('Scratch render settings do not match');
 if(process.env.GDS_RASTER_RESUME && !fs.existsSync(settingsPath))throw new Error('Resume requires recorded render settings');
 fs.writeFileSync(settingsPath,settings);
 console.log(`Raster scratch directory: ${scratch}`);
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try {
  let count=0;
  const jobs=Object.entries(meta.tiles);
  async function worker() {
  const page=await browser.newPage();
  while(jobs.length){
   const [key,entry]=jobs.shift();
   const raw=fs.readFileSync(path.join(source,'tiles',`${key}.jsonl.gz`));
   if(digest(raw)!==entry.sha256)throw new Error(`Geometry checksum mismatch: ${key}`);
   // Transfer text rather than serializing millions of nested coordinate arrays in Node.
   const recordsText=gunzipSync(raw).toString();
   const [x,y]=key.split('-').map(Number);
   const row=meta.rows-1-y;
   const layers=[...new Set([...recordsText.matchAll(/^\[(\d+),/gm)].map(m=>Number(m[1])))];
   if(layers.every(layer=>fs.existsSync(path.join(scratch,String(maxLevel),String(layer),`${x}-${row}.png`)))) { count++; continue; }
   const result=await page.evaluate(({meta,recordsText,x,y,tileHeight})=>{
    const records=recordsText.trim().split('\n').filter(Boolean).map(JSON.parse);
    const width=1024, height=tileHeight, ss=2;
    const dx=(meta.bounds[2]-meta.bounds[0])/meta.columns,dy=(meta.bounds[3]-meta.bounds[1])/meta.rows;
    const left=meta.bounds[0]+x*dx,top=meta.bounds[1]+(y+1)*dy;
    const canvas=document.createElement('canvas');canvas.width=width*ss;canvas.height=height*ss;
    const out=document.createElement('canvas');out.width=width;out.height=height;
    const ctx=canvas.getContext('2d'),dest=out.getContext('2d');dest.imageSmoothingQuality='high';
    const images={};
    for(let layer=0;layer<meta.layers.length;layer++){
     const polygons=records.filter(r=>r[0]===layer);if(!polygons.length)continue;
     ctx.resetTransform();ctx.clearRect(0,0,canvas.width,canvas.height);
     ctx.setTransform(width*ss/dx,0,0,-height*ss/dy,-left*width*ss/dx,top*height*ss/dy);
     ctx.fillStyle=meta.layers[layer].color;
     ctx.globalAlpha=['189/4','99/31'].includes(meta.layers[layer].key)?.08:.65;
     for(const [,rings] of polygons){
      ctx.beginPath();for(const ring of rings){ring.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();}ctx.fill('evenodd');
     }
     dest.clearRect(0,0,width,height);dest.drawImage(canvas,0,0,width,height);
     images[layer]=out.toDataURL('image/png').split(',')[1];
    }
    return images;
   },{meta,recordsText,x,y,tileHeight});
   for(const [layer,data] of Object.entries(result)){
    const dir=path.join(scratch,String(maxLevel),layer);fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,`${x}-${row}.png`),Buffer.from(data,'base64'));
   }
   if(++count%8===0)console.log(`Rendered ${count}/${Object.keys(meta.tiles).length} geometry tiles`);
  }
  await page.close();
  }
  await Promise.all(Array.from({length:4},()=>worker()));
 } finally {await browser.close();}
 const built=spawnSync(process.env.PYTHON || 'python3',[path.join(__dirname,'build_gds_pyramid.py'),scratch,source,output],{stdio:'inherit'});
 if(built.status)process.exit(built.status);
})().catch(error=>{console.error(error);process.exit(1)});
