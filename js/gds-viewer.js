/* Native portfolio adaptation of protocol-emulator-asic's static viewer.
 * Upstream: 856a1ea25f6b0ff47a268d7c4719616e3f562f9e, Apache-2.0.
 * License: assets/protocol-emulator/v2/LICENSE.txt
 * Geometry uses original transformed coordinates; tile edges are clipped only.
 */
export function createViewer(root) {
  const find = name => root.querySelector(`[data-gds-${name}]`);
  const canvas = find('canvas'), ctx = canvas.getContext('2d');
  const base = new URL(root.dataset.source, location.href);
  const status = find('status'), mode = find('mode'), retry = find('retry');
  let meta, rasterMeta, view, selected = new Set();
  const rasterBase = new URL(root.dataset.raster, location.href);
  const rasterCache = new Map();
  let rasterBytes = 0, renderAbort, lastFrame, lastBounds;
  let epoch = 0, scheduled = false, running = false, ready = false;
  const cache = new Map(), pointers = new Map();
  const errorText = error => error instanceof Error ? error.message : String(error);
  const bounds = () => [view.x-view.w/2, view.y-view.w*canvas.height/canvas.width/2,
    view.x+view.w/2, view.y+view.w*canvas.height/canvas.width/2];

  async function response(path) {
    const result = await fetch(new URL(path, base));
    if (!result.ok) throw new Error(`Layout asset returned HTTP ${result.status}.`);
    return result;
  }
  function request() {
    if (!ready) return;
    epoch++;
    renderAbort?.abort();
    canvas.dataset.mode = 'pending';
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; if (!running) draw(); });
    }
  }
  function fit() {
    const b = meta.bounds;
    view = {x:(b[0]+b[2])/2, y:(b[1]+b[3])/2,
      w:Math.max(b[2]-b[0], (b[3]-b[1])*canvas.width/canvas.height)*1.04};
    request();
  }
  function clamp() {
    const b = meta.bounds;
    view.w = Math.max(meta.dbu_um*4, Math.min(view.w,
      Math.max(b[2]-b[0], (b[3]-b[1])*canvas.width/canvas.height)*1.04));
    view.x = Math.max(b[0], Math.min(b[2], view.x));
    view.y = Math.max(b[1], Math.min(b[3], view.y));
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const ratio = Math.min(devicePixelRatio || 1, 2, 2048/r.width, 2048/r.height);
    canvas.width = Math.max(1, Math.round(r.width*ratio));
    canvas.height = Math.max(1, Math.round(r.height*ratio));
    if (meta) { if (!view) fit(); else request(); }
  }
  function screenPoint(x, y) {
    const r = canvas.getBoundingClientRect(), b = bounds();
    return [b[0]+(x-r.left)/r.width*view.w, b[3]-(y-r.top)/r.height*(b[3]-b[1])];
  }
  function zoom(factor, x, y) {
    if (!ready) return;
    const r = canvas.getBoundingClientRect();
    x ??= r.left+r.width/2; y ??= r.top+r.height/2;
    const before = screenPoint(x,y);
    view.w *= factor; clamp();
    const after = screenPoint(x,y);
    view.x += before[0]-after[0]; view.y += before[1]-after[1]; clamp(); request();
  }
  function visibleTiles(b) {
    const m = meta.bounds, dx = (m[2]-m[0])/meta.columns, dy = (m[3]-m[1])/meta.rows, keys = [];
    for (let y=Math.max(0,Math.floor((b[1]-m[1])/dy)); y<=Math.min(meta.rows-1,Math.floor((b[3]-m[1])/dy)); y++) {
      for (let x=Math.max(0,Math.floor((b[0]-m[0])/dx)); x<=Math.min(meta.columns-1,Math.floor((b[2]-m[0])/dx)); x++) {
        const key = `${x}-${y}`;
        if (meta.tiles[key]) keys.push({key, box:[m[0]+x*dx,m[1]+y*dy,dx,dy]});
      }
    }
    return keys;
  }
  async function tile(key) {
    if (cache.has(key)) {
      const records = cache.get(key); cache.delete(key); cache.set(key,records); return records;
    }
    const raw = await (await response(`tiles/${key}.jsonl.gz`)).arrayBuffer();
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',raw)),
      v => v.toString(16).padStart(2,'0')).join('');
    if (digest !== meta.tiles[key].sha256) throw new Error('Geometry checksum mismatch.');
    const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'));
    const text = await new Response(stream).text();
    const records = text.trim() ? text.trim().split('\n').map(JSON.parse) : [];
    cache.set(key, records);
    while (cache.size > 12) cache.delete(cache.keys().next().value);
    return records;
  }
  function clear() {
    ctx.setTransform(1,0,0,1,0,0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '#101827'; ctx.fillRect(0,0,canvas.width,canvas.height);
  }
  async function rasterImage(name, signal) {
    if (rasterCache.has(name)) {
      const entry=rasterCache.get(name); rasterCache.delete(name); rasterCache.set(name,entry); return entry.image;
    }
    const record=rasterMeta.tiles[name];
    if (!record) return null;
    const result=await fetch(new URL(name,rasterBase),{signal});
    if (!result.ok) throw new Error(`Raster tile returned HTTP ${result.status}.`);
    const raw=await result.arrayBuffer();
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',raw)),v=>v.toString(16).padStart(2,'0')).join('');
    if (digest!==record.sha256) throw new Error('Raster checksum mismatch.');
    const image=await createImageBitmap(new Blob([raw],{type:'image/webp'}));
    if (signal?.aborted) { image.close(); throw new DOMException('Cancelled','AbortError'); }
    const bytes=image.width*image.height*4;
    rasterCache.set(name,{image,bytes}); rasterBytes+=bytes;
    while(rasterBytes>64*1024*1024 && rasterCache.size>1) {
      const oldest=rasterCache.keys().next().value,entry=rasterCache.get(oldest);
      rasterBytes-=entry.bytes;entry.image.close();rasterCache.delete(oldest);
    }
    return image;
  }
  function rasterLevel() {
    const needed=(meta.bounds[2]-meta.bounds[0])*canvas.width/view.w;
    return rasterMeta.levels.find(level=>level.width>=needed) || rasterMeta.levels.at(-1);
  }
  function rasterEntries(level,b,layer) {
    const m=meta.bounds,dx=(m[2]-m[0])/level.columns,dy=(m[3]-m[1])/level.rows;
    const entries=[];
    for(let y=Math.max(0,Math.floor((m[3]-b[3])/dy));y<=Math.min(level.rows-1,Math.floor((m[3]-b[1])/dy));y++) {
      for(let x=Math.max(0,Math.floor((b[0]-m[0])/dx));x<=Math.min(level.columns-1,Math.floor((b[2]-m[0])/dx));x++) {
        const name=`${level.z}/${layer}/${x}-${y}.webp`;
        if(rasterMeta.tiles[name])entries.push({name,left:m[0]+x*dx,top:m[3]-y*dy,dx,dy});
      }
    }
    return entries;
  }
  function remember() {
    lastFrame=document.createElement('canvas');lastFrame.width=canvas.width;lastFrame.height=canvas.height;
    lastFrame.getContext('2d').drawImage(canvas,0,0);lastBounds=bounds();
  }
  function preview(b) {
    clear();
    const s=canvas.width/view.w;
    if(lastFrame) {
      ctx.drawImage(lastFrame,(lastBounds[0]-b[0])*s,(b[3]-lastBounds[3])*s,
        (lastBounds[2]-lastBounds[0])*s,(lastBounds[3]-lastBounds[1])*s);
    } else {
      const entry=rasterCache.get('0/all/0-0.webp'),m=meta.bounds;
      if(entry)ctx.drawImage(entry.image,1,1,entry.image.width-2,entry.image.height-2,
        (m[0]-b[0])*s,(b[3]-m[3])*s,(m[2]-m[0])*s,(m[3]-m[1])*s);
    }
  }
  async function drawRaster(b,version,signal) {
    const level=rasterLevel(),s=canvas.width/view.w;
    const frame=document.createElement('canvas');frame.width=canvas.width;frame.height=canvas.height;
    const dest=frame.getContext('2d');dest.fillStyle='#101827';dest.fillRect(0,0,frame.width,frame.height);
    dest.imageSmoothingQuality='high';
    const layers=selected.size===meta.layers.length?['all']:[...selected].sort((a,b)=>a-b);
    let count=0;
    for(const layer of layers) {
      const entries=rasterEntries(level,b,layer);
      // Bound concurrent downloads and decode memory. Draw in stable layer order.
      for(let offset=0;offset<entries.length;offset+=4) {
        const batch=entries.slice(offset,offset+4);
        const images=await Promise.all(batch.map(entry=>rasterImage(entry.name,signal)));
        if(version!==epoch)return;
        images.forEach((image,i)=>{
          const entry=batch[i];if(!image)return;
          const x=(entry.left-b[0])*s,y=(b[3]-entry.top)*s,w=entry.dx*s,h=entry.dy*s;
          // Clip the interior but sample the one-pixel neighbor gutter for filtering.
          dest.save();dest.beginPath();dest.rect(x,y,w,h);dest.clip();
          const gx=w/(image.width-2),gy=h/(image.height-2);
          dest.drawImage(image,x-gx,y-gy,w+gx*2,h+gy*2);dest.restore();count++;
        });
      }
    }
    if(version!==epoch)return;
    clear();ctx.drawImage(frame,0,0);remember();
    mode.textContent='Multi-resolution raster';
    status.textContent=`${selected.size}/${meta.layers.length} layers · ${view.w.toFixed(2)} µm wide`;
    canvas.dataset.rasterLevel=String(level.z);canvas.dataset.rasterTiles=String(count);
    canvas.dataset.rasterCacheBytes=String(rasterBytes);canvas.dataset.mode='preview';
  }
  async function draw() {
    if (!ready || !view) return;
    running = true;
    const version = epoch, b = bounds(), keys = visibleTiles(b), dx = (meta.bounds[2]-meta.bounds[0])/meta.columns;
    const detail = view.w <= dx*2 && keys.length <= 12;
    retry.hidden = true;
    renderAbort = new AbortController();
    const signal = renderAbort.signal;
    try {
      preview(b);
      if (!selected.size) {
        clear(); remember();
        mode.textContent = 'No layers selected';
        status.textContent = 'Choose a layer or select All layers to explore the layout.';
        canvas.dataset.mode = 'empty'; return;
      }
      if (!detail) {
        mode.textContent = 'Loading sharper tiles…'; canvas.dataset.mode = 'loading';
        await drawRaster(b,version,signal); return;
      }
      mode.textContent = 'Loading original geometry…'; canvas.dataset.mode = 'loading';
      const data = [];
      for (const entry of keys) {
        data.push([entry, await tile(entry.key)]);
        if (version !== epoch) return;
      }
      clear();
      const scale = canvas.width/view.w;
      ctx.setTransform(scale,0,0,-scale,-b[0]*scale,b[3]*scale);
      let count = 0;
      for (const [entry, records] of data) {
        ctx.save(); ctx.beginPath(); ctx.rect(...entry.box); ctx.clip();
        for (const [layer, rings] of records) {
          if (!selected.has(layer)) continue;
          ctx.fillStyle = meta.layers[layer].color;
          ctx.globalAlpha = selected.size === 1 ? .9 : (['189/4','99/31'].includes(meta.layers[layer].key) ? .08 : .65);
          ctx.beginPath();
          for (const points of rings) {
            for (let i=0; i<points.length; i++) {
              const p=points[i]; if (!i) ctx.moveTo(p[0],p[1]); else ctx.lineTo(p[0],p[1]);
            }
            ctx.closePath();
          }
          ctx.fill('evenodd'); count++;
        }
        ctx.restore();
      }
      ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha = 1;
      mode.textContent = 'Original polygon geometry';
      status.textContent = `${count.toLocaleString()} tile records · ${keys.length} tiles · ${view.w.toFixed(3)} µm wide`;
      canvas.dataset.mode = 'geometry'; remember();
    } catch (error) {
      if (error.name === 'AbortError' || version !== epoch) return;
      mode.textContent = 'Layout tiles unavailable · previous view retained';
      status.textContent = `${errorText(error)} Retry to reload the visible layout.`;
      canvas.dataset.mode = 'error'; retry.hidden = false;
    } finally {
      running = false;
      if (version !== epoch) request();
    }
  }
  function sync() {
    root.querySelectorAll('[data-gds-layers] input').forEach(input => { input.checked = selected.has(Number(input.value)); });
    request();
  }
  canvas.addEventListener('wheel', e => {
    if (!ready) return;
    // Page scrolling remains natural; modifier-wheel or dedicated controls zoom.
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault(); zoom(Math.exp(Math.max(-1,Math.min(1,e.deltaY*.002))),e.clientX,e.clientY);
  }, {passive:false});
  canvas.addEventListener('pointerdown', e => {
    if (!ready) return;
    canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId,[e.clientX,e.clientY]);
  });
  canvas.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId) || !ready) return;
    const old = pointers.get(e.pointerId), other = [...pointers.entries()].find(([id]) => id !== e.pointerId);
    pointers.set(e.pointerId,[e.clientX,e.clientY]);
    if (other) {
      const p=other[1], before=Math.hypot(old[0]-p[0],old[1]-p[1]), after=Math.hypot(e.clientX-p[0],e.clientY-p[1]);
      if (before>5 && after>5) zoom(before/after,(e.clientX+p[0])/2,(e.clientY+p[1])/2);
    } else {
      const r=canvas.getBoundingClientRect();
      view.x-=(e.clientX-old[0])/r.width*view.w; view.y+=(e.clientY-old[1])/r.width*view.w; clamp(); request();
    }
  });
  for (const name of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(name,e => pointers.delete(e.pointerId));
  canvas.addEventListener('dblclick',e => zoom(.5,e.clientX,e.clientY));
  canvas.addEventListener('keydown',e => {
    if (!ready || !['f','F','+','=','-','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    if (e.key.toLowerCase()==='f') fit();
    else if (['+','='].includes(e.key)) zoom(.7);
    else if (e.key==='-') zoom(1.4);
    else {
      const d=view.w*.15;
      if (e.key==='ArrowLeft') view.x-=d; if (e.key==='ArrowRight') view.x+=d;
      if (e.key==='ArrowUp') view.y+=d; if (e.key==='ArrowDown') view.y-=d;
      clamp(); request();
    }
  });
  find('fit').onclick = () => ready && fit();
  find('detail').onclick = () => { if (!ready) return; view.w=(meta.bounds[2]-meta.bounds[0])/meta.columns*1.5; clamp(); request(); };
  find('in').onclick = () => zoom(.5); find('out').onclick = () => zoom(2);
  find('all').onclick = () => { selected=new Set(meta.layers.map((_,i)=>i)); sync(); };
  find('none').onclick = () => { selected.clear(); sync(); };
  retry.onclick = () => request();
  const full = find('full');
  function fullState() {
    const expanded = document.fullscreenElement === root || root.classList.contains('gds-expanded');
    full.textContent = expanded ? 'Exit full screen' : 'Full screen'; full.setAttribute('aria-pressed',String(expanded)); resize();
  }
  full.onclick = async () => {
    if (document.fullscreenElement === root) await document.exitFullscreen();
    else if (root.classList.contains('gds-expanded')) { root.classList.remove('gds-expanded'); fullState(); }
    else if (document.fullscreenEnabled) {
      try { await root.requestFullscreen(); }
      catch { root.classList.add('gds-expanded'); fullState(); }
    } else { root.classList.add('gds-expanded'); fullState(); }
  };
  root.addEventListener('keydown', e => {
    if (e.key === 'Escape' && root.classList.contains('gds-expanded')) {
      root.classList.remove('gds-expanded'); fullState(); full.focus();
    }
  });
  document.addEventListener('fullscreenchange',fullState);
  new ResizeObserver(resize).observe(canvas);

  return {
    async start() {
      if (!ctx || !globalThis.crypto?.subtle || !globalThis.DecompressionStream || !globalThis.createImageBitmap) {
        throw new Error('This browser does not support the geometry decoder.');
      }
      // Readiness means all previews are available, not just an HTML load event.
      const nextMeta = await (await response('manifest.json')).json();
      if (nextMeta.source_sha256 !== root.dataset.gdsHash || nextMeta.geometry_simplified ||
          !nextMeta.independent_inventory_matches || nextMeta.layers_omitted.length || nextMeta.hierarchy_depth_limit !== null) {
        throw new Error('The layout manifest does not match the selected V2 geometry.');
      }
      const rasterResponse = await fetch(new URL('manifest.json',rasterBase));
      if (!rasterResponse.ok) throw new Error(`Raster manifest returned HTTP ${rasterResponse.status}.`);
      const nextRaster = await rasterResponse.json();
      if (nextRaster.source_sha256 !== nextMeta.source_sha256 ||
          JSON.stringify(nextRaster.bounds) !== JSON.stringify(nextMeta.bounds) ||
          JSON.stringify(nextRaster.layers) !== JSON.stringify(nextMeta.layers.map(layer=>layer.key))) {
        throw new Error('Raster manifest does not match the selected V2 geometry.');
      }
      rasterMeta=nextRaster;
      await rasterImage('0/all/0-0.webp');
      meta=nextMeta;
      selected=new Set(meta.layers.map((_,i)=>i));
      const layers=find('layers'); layers.replaceChildren();
      for (const [i,layer] of meta.layers.entries()) {
        const row=document.createElement('div'); row.className='gds-layer';
        const label=document.createElement('label'), input=document.createElement('input'), swatch=document.createElement('span');
        input.type='checkbox'; input.checked=true; input.value=i;
        input.onchange=()=>{input.checked?selected.add(i):selected.delete(i);request();};
        swatch.className='gds-swatch'; swatch.style.backgroundColor=layer.color;
        label.append(input,swatch,document.createTextNode(layer.key));
        const solo=document.createElement('button'); solo.type='button'; solo.textContent='Solo';
        solo.setAttribute('aria-label',`Solo layer ${layer.key}`);
        solo.onclick=()=>{selected=new Set([i]);sync();}; row.append(label,solo); layers.append(row);
      }
      find('workspace').hidden=false; find('fallback').hidden=true; find('controls').hidden=false;
      find('layer-panel').hidden=false;
      find('layer-panel').open=matchMedia('(min-width: 861px)').matches;
      find('help').hidden=false;
      find('inventory').textContent=`${meta.expanded_polygons.toLocaleString()} polygons · ${meta.layers.length} layers · all hierarchy levels`;
      ready=true; resize(); canvas.focus({preventScroll:true}); request();
    }
  };
}
