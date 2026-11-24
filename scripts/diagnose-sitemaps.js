// Diagnose: Warum findet gemini-enrich.js für neue Hauptmarken-Bälle keine Produktseite? Ändert nichts, braucht keinen Gemini-Schlüssel.
// Aufruf: node scripts/diagnose-sitemaps.js   (im Workflow über die Eingabe "diagnose")
const fs=require('fs');const {pick,kandidaten,slug}=require('./sitemap-match.js');
const H=JSON.parse(fs.readFileSync(require('path').join(__dirname,'hersteller.json'),'utf8'));
const UA={'user-agent':'Mozilla/5.0 (compatible; proshop-ballenrich)'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(u){try{const r=await fetch(u,{headers:UA,redirect:'follow'});const t=await r.text();return{status:r.status,url:r.url,len:t.length,text:t,type:r.headers.get('content-type')}}catch(e){return{status:'FEHLER '+(e.cause&&e.cause.code||e.message),text:'',len:0}}}
const locsOf=t=>[...t.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m=>m[1]);
async function sitemap(u,d=0){const r=await get(u);console.log(' '.repeat(d*2)+'·',u,'→ HTTP',r.status,'·',r.len,'Zeichen');if(r.status!==200)return[];
  const l=locsOf(r.text);console.log(' '.repeat(d*2)+'  Einträge:',l.length,'· Beispiel:',l.slice(0,3).join(' , '));
  if(d<1&&l.some(x=>/\.xml/.test(x))){let out=[];for(const c of l.filter(x=>/\.xml/.test(x)).slice(0,25)){out.push(...await sitemap(c,d+1))}return out}return l}
(async()=>{
  console.log('== 1. Sitemaps aus hersteller.json ==');const all={};
  for(const [m,urls] of Object.entries(H.sitemaps||{})){console.log('Marke',m);all[m]=[];for(const u of urls)all[m].push(...await sitemap(u))}
  console.log('\n== 2. Weitere Hersteller-Seiten (Erreichbarkeit) ==');
  for(const u of ['https://www.brunswickbowling.com/sitemap.xml','https://www.brunswickbowling.com/robots.txt','https://www.columbia300.com/sitemap.xml','https://www.radicalbowling.com/sitemap.xml','https://www.dv8bowling.com/sitemap.xml','https://www.stormbowling.com/robots.txt','https://www.bowling.com/sitemap.xml','https://www.bowlingball.com/sitemap.xml']){
    const r=await get(u);console.log(' ',u,'→',r.status,r.len?r.len+' Zeichen':'');if(/robots/.test(u)&&r.text)console.log('    ',r.text.split('\n').filter(l=>/sitemap/i.test(l)).slice(0,4).join(' | '));await sleep(300)}
  console.log('\n== 3. Neue Hauptmarken-Bälle ohne Werte: Suche in den Sitemaps ==');
  const j=JSON.parse(fs.readFileSync('balls.json','utf8')).balls;
  const neu=j.filter(b=>!b.rg&&!b.kernNein&&(b.release||'')>='2026-06'&&all[b.brand.toLowerCase()]);
  console.log('Kandidaten:',neu.length);
  for(const b of neu.slice(0,25)){const locs=all[b.brand.toLowerCase()]||[];const ks=kandidaten(b.name);const p=pick(locs,b.brand,b.name);
    const tok=ks[ks.length-1].split('-')[0];const nah=locs.filter(u=>u.toLowerCase().includes(tok)).slice(0,3);
    console.log(' -',b.brand,b.name,'· Kandidaten',JSON.stringify(ks),'→',p||'KEIN TREFFER',p?'':'· URLs mit "'+tok+'": '+(nah.join(' , ')||'keine'))}
  console.log('\n== 4. bowling.com: Produktseite eines neuen Balls ==');
  for(const b of neu.slice(0,6)){const u='https://www.bowling.com/products/'+slug(b.brand+' '+b.name)+'.htm';const r=await get(u);console.log(' ',u,'→',r.status);await sleep(400)}
})();
