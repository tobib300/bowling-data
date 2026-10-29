// Ergänzt in public/balls.json das Feld "img" (Produktfoto) für Bälle ohne Bild.
// Quelle: Produktseiten von bowling.com (og:image, Herstellerfotos). Jede Adresse wird geprüft (HTTP 200, image/*).
// Aufruf: node scripts/find-images.js [--base=https://www.bowling.com]
const fs=require('fs');const F='balls.json';
const base=(process.argv.find(a=>a.startsWith('--base='))||'--base=https://www.bowling.com').slice(7);
const slug=s=>s.toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const UA={'user-agent':'Mozilla/5.0 (compatible; proshop-ballimages)'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function og(url){try{const r=await fetch(url,{headers:UA,redirect:'follow'});if(!r.ok)return null;const h=await r.text();
  const m=h.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)||h.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if(!m)return null;let u=m[1].replace(/&amp;/g,'&');if(u.startsWith('//'))u='https:'+u;else if(u.startsWith('/'))u=base+u;return u}catch{return null}}
async function ok(u){try{const r=await fetch(u,{headers:UA});return r.ok&&/^image\//.test(r.headers.get('content-type')||'')}catch{return false}}
(async()=>{
  const j=JSON.parse(fs.readFileSync(F,'utf8'));let n=0,tried=0,miss=[];
  const MAXN=+process.argv.find(a=>/^\d+$/.test(a))||200,TODAY=new Date().toISOString().slice(0,10),RECHECK=30*864e5; // pro Lauf höchstens 200 Bälle, Fehlschläge 30 Tage nicht erneut
  for(const b of [...j.balls].sort((x,y)=>(y.release||'').localeCompare(x.release||''))){
    if(b.img)continue;
    if(b.imgChecked&&Date.now()-new Date(b.imgChecked)<RECHECK)continue;
    if(tried>=MAXN)break;tried++;
    for(const s of [slug(b.brand+' '+b.name),slug(b.name)]){
      const u=await og(`${base}/products/${s}.htm`);await sleep(400);
      if(u&&/^https?:\/\//.test(u)&&await ok(u)){b.img=u;n++;break}
    }
    if(!b.img){miss.push(b.brand+' '+b.name);b.imgChecked=TODAY}
  }
  console.log('Bilder ergänzt:',n,'· versucht:',tried,'· ohne Bild:',miss.length);miss.slice(0,40).forEach(x=>console.log(' -',x));
  if(n||tried){fs.writeFileSync(F,JSON.stringify(j,null,1)+'\n')}
})();
