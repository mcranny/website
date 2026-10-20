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
const source=path.join(root,'assets/protocol-emulator/v2/layout-447b3df');
const scratchBase=process.env.GDS_RASTER_SCRATCH || os.tmpdir();
const meta=JSON.parse(fs.readFileSync(path.join(source,'manifest.json')));
const digest=buffer=>createHash('sha256').update(buffer).digest('hex');
(async()=>{
 fs.mkdirSync(scratchBase,{recursive:true});
 const scratch=fs.mkdtempSync(path.join(scratchBase,'website-gds-raster-'));
 console.log(`Raster scratch directory: ${scratch}`);
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try {
  const page=await browser.newPage();
  let count=0;
  for(const [key,entry] of Object.entries(meta.tiles)){
   const raw=fs.readFileSync(path.join(source,'tiles',`${key}.jsonl.gz`));
   if(digest(raw)!==entry.sha256)throw new Error(`Geometry checksum mismatch: ${key}`);
   const records=gunzipSync(raw).toString().trim().split('\n').filter(Boolean).map(JSON.parse);
   const [x,y]=key.split('-').map(Number);
   const result=await page.evaluate(({meta,records,x,y})=>{
    const width=1024, height=1129, ss=2;
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
   },{meta,records,x,y});
   const row=meta.rows-1-y;
   for(const [layer,data] of Object.entries(result)){
    const dir=path.join(scratch,'5',layer);fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,`${x}-${row}.png`),Buffer.from(data,'base64'));
   }
   if(++count%32===0)console.log(`Rendered ${count}/${Object.keys(meta.tiles).length} geometry tiles`);
  }
 } finally {await browser.close();}
 const built=spawnSync(process.env.PYTHON || 'python3',[path.join(__dirname,'build_gds_pyramid.py'),scratch],{stdio:'inherit'});
 if(built.status)process.exit(built.status);
})().catch(error=>{console.error(error);process.exit(1)});
