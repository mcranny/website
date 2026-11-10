import concurrent.futures, hashlib, json, re, urllib.request, urllib.error
from pathlib import Path
root=Path(__file__).resolve().parents[1]
base='https://mcranny.net'
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl): return None
opener=urllib.request.build_opener(NoRedirect)
def fetch(route):
 req=urllib.request.Request(base+route,headers={'Cache-Control':'no-cache','User-Agent':'Website release verification'})
 try:
  with opener.open(req,timeout=45) as r: return r.status,dict(r.headers),r.read()
 except urllib.error.HTTPError as e: return e.code,dict(e.headers),e.read()
def verify_page(item):
 route,name,status=item
 actual,headers,data=fetch(route)
 assert 'max-age=0' in headers.get('Cache-Control',headers.get('cache-control','')),(route,'HTML cache policy')
 assert actual==status,(route,actual)
 text=data.decode();source=(root/name).read_text()
 for tag in ['title','main','header','footer']:
  expected=re.search(fr'<{tag}\b.*?</{tag}>',source,re.S)[0]
  assert expected in text,(route,'content differs',tag)
 return {'route':route,'status':actual,'content':'matches release'}
def verify_asset(name):
 status,headers,data=fetch('/'+name)
 assert status==200,(name,status)
 if '/layout-' in name or '/raster-v1/' in name or '/display-v1/' in name:
  assert 'immutable' in headers.get('Cache-Control',headers.get('cache-control','')),(name,'immutable caching')
  assert 'Content-Encoding' not in headers and 'content-encoding' not in headers,(name,'transformed bytes')
 digest=hashlib.sha256(data).hexdigest()
 assert digest==hashlib.sha256((root/name).read_bytes()).hexdigest(),(name,'SHA-256 mismatch')
 return {'asset':name,'bytes':len(data),'sha256':digest}
def verify_redirect(line):
 route,target,code=line.split()
 status,headers,data=fetch(route)
 assert status==int(code),(route,status)
 location=headers.get('Location',headers.get('location'))
 assert location in [target,base+target],(route,location,target)
 return {'route':route,'status':status,'location':location}
pages=[('/', 'index.html',200)]+[('/'+n,n+'.html',200) for n in ['experience','projects','protocol-emulator','testos','btree','resume']]+[('/protocol-emulator?version=v2','protocol-emulator.html',200),('/protocol-emulator?version=v3','protocol-emulator.html',200),('/release-check-missing-page','404.html',404)]
assets=['css/base.css','css/project.css','js/asic-versions.js','js/layout-viewer.js','js/gds-viewer.js','assets/Matthew-Cranny-Resume.pdf','assets/testos/boot.webp','assets/testos/download.webp','assets/testos/disk-nvme.webp','assets/testos/boot.mp4','assets/testos/boot.webm','assets/testos/boot-framed.mp4','assets/testos/boot-framed.webm','assets/testos/boot-framed.webp','assets/btree-recovery.svg','sitemap.xml']
for v,layout in [('v2','layout-447b3df'),('v3','layout-8b95d90')]:
 assets.extend([f'assets/protocol-emulator/{v}/summary.json',f'assets/protocol-emulator/{v}/display-v1/overview-640.webp',f'assets/protocol-emulator/{v}/{layout}/manifest.json'])
 tile=next((root/f'assets/protocol-emulator/{v}/{layout}/tiles').glob('*.jsonl.gz'))
 assets.append(str(tile.relative_to(root)))
assets.extend(['assets/protocol-emulator/v2/layout-447b3df/selected-layout.tar.gz','assets/protocol-emulator/v3/layout-8b95d90/layout.gds.gz'])
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 report={'pages':list(pool.map(verify_page,pages)),'assets':list(pool.map(verify_asset,assets)),'redirects':list(pool.map(verify_redirect,(root/'_redirects').read_text().splitlines()))}
print(json.dumps(report,indent=2))
print(f"Verified {len(report['pages'])} page routes, {len(report['assets'])} exact asset hashes, and {len(report['redirects'])} direct redirects on {base}")
