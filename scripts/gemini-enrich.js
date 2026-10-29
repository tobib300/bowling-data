// Ergänzt Bälle in balls.json mit Coverstock, Foto (img) und Hersteller-Layoutvorschlägen (layouts).
// Ohne Suchwerkzeug (google_search ist im kostenlosen Tarif gesperrt): Die Produktseite wird selbst geladen
// (b.url falls vorhanden, sonst bowling.com), als Text an Gemini übergeben, Gemini zieht nur daraus die Felder.
// Braucht GEMINI_API_KEY (kostenloser Schlüssel aus Google AI Studio). Modell per GEMINI_MODEL (Standard gemini-3.5-flash).
// Aufruf: node scripts/gemini-enrich.js [max=12]   Ohne Schlüssel wird übersprungen.
const fs=require('fs');const F='balls.json';
const KEY=process.env.GEMINI_API_KEY,MODELS=(process.env.GEMINI_MODELS||process.env.GEMINI_MODEL||'gemini-3.5-flash,gemini-flash-latest,gemini-3.8-flash').split(',').map(x=>x.trim()).filter(Boolean),MAX=+process.argv[2]||12;
if(!KEY){console.log('GEMINI_API_KEY fehlt – übersprungen.');process.exit(0)}
const BASE=process.env.PRODUCT_BASE||'https://www.bowling.com',UA={'user-agent':'Mozilla/5.0 (compatible; proshop-ballenrich)'};
let HERST={ueberspringen:[],vorlagen:{}};try{HERST=JSON.parse(fs.readFileSync(require('path').join(__dirname,'hersteller.json'),'utf8'))}catch{}
const {pick}=require('./sitemap-match.js');
const TODAY=new Date().toISOString().slice(0,10),RECHECK=30*864e5;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const slug=s=>s.toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const numOk=s=>typeof s==='string'&&/^\d{1,2}(\.\d+)?( \d\/\d{1,2})?$|^\d\/\d{1,2}$/.test(s.trim());
const toNum=s=>{const p=s.trim().split(' ');return p.reduce((a,x)=>a+(x.includes('/')?x.split('/')[0]/x.split('/')[1]:+x),0)};
async function imgOk(u){try{const r=await fetch(u,{headers:UA});return r.ok&&/^image\//.test(r.headers.get('content-type')||'')}catch{return false}}
const _sm={};
async function sitemapLocs(url,depth=0){
  if(_sm[url])return _sm[url];let out=[];
  try{const r=await fetch(url,{headers:UA,redirect:'follow'});if(r.ok){const t=await r.text();const l=[...t.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m=>m[1]);
    if(depth<1&&l.some(x=>/\.xml/.test(x))){for(const c of l.filter(x=>/\.xml/.test(x)).slice(0,20))out.push(...await sitemapLocs(c,depth+1))}else out=l}}catch{}
  return _sm[url]=out}
async function herstellerUrl(b){
  const maps=(HERST.sitemaps||{})[b.brand.toLowerCase()]||[];let locs=[];
  for(const m of maps)locs.push(...await sitemapLocs(m));
  return locs.length?pick(locs,b.brand,b.name):null}
const norm=t=>t.toLowerCase().replace(/[^a-z0-9]+/g,' ');
const erstesWort=n=>{const t=norm(n.replace(/\([^)]*\)/g,' ')).trim().split(' ').filter(x=>x.length>=3&&x!=='the');return t[0]||norm(n).trim()}; // 'Rocket AI' → 'rocket', Seite darf 'A.I.' schreiben
async function page(b){
  const urls=[b.url,`${BASE}/products/${slug(b.brand+' '+b.name)}.htm`,`${BASE}/products/${slug(b.name)}.htm`].filter(u=>/^https:\/\//.test(u||''));
  const hu=await herstellerUrl(b);if(hu)urls.push(hu);
  for(const u of urls){try{const r=await fetch(u,{headers:UA,redirect:'follow'});await sleep(400);if(!r.ok)continue;const h=await r.text();
    const og=(h.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)||[])[1];
    const text=h.replace(/<(script|style)[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim().slice(0,12000);
    if(u===hu&&u!==b.url&&!norm(text).includes(erstesWort(b.name))){console.log(' ~ Herstellerseite passt nicht zum Namen, übersprungen:',u);continue}
    return{url:u,og:og?(og.startsWith('//')?'https:'+og:og.replace(/&amp;/g,'&')):null,text}}catch{}}
  return null}
let _models;
async function modelList(){
  if(_models)return _models;
  const base=process.env.GEMINI_BASE||'https://generativelanguage.googleapis.com';let found=[];
  if(!process.env.GEMINI_MODELS&&!process.env.GEMINI_MODEL){
    try{const r=await fetch(`${base}/v1beta/models?pageSize=200`,{headers:{'x-goog-api-key':KEY}});
      if(r.ok){const j=await r.json();found=(j.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent')&&/flash/.test(m.name)&&!/image|tts|live|audio|embed|thinking|preview|exp/.test(m.name)).map(m=>m.name.replace(/^models\//,''))
        .sort((a,b)=>(/lite/.test(b)-/lite/.test(a))||b.localeCompare(a))}}catch{}
  }
  _models=[...new Set([...found.filter(m=>/lite/.test(m)).slice(0,2),...MODELS,...found])].slice(0,6);console.log('Modelle:',_models.join(', '));return _models}
async function ask(b,p){
  const prompt=`Bowlingball: "${b.brand} ${b.name}". Unten steht der Text der Produktseite ${p.url}. Antworte NUR mit JSON, ohne Text drumherum:
{"coverstock":string|null,"layouts":[{"pin":string,"psa":string,"buf":string,"src":string}]}
Regeln: Nimm ausschließlich Angaben aus dem Seitentext. coverstock = Name der Hülle (z. B. "HK22C2 Solid Reactive"). layouts nur, wenn der Text ausdrücklich Bohrvorschläge nennt; Maße in Zoll als Text ("4 1/2", "5.0"): pin = Pin zu PAP, psa = PSA zu PAP, buf = Pin Buffer; src = Quelle kurz. Nichts erfinden: bei Unsicherheit null bzw. leeres Array.

SEITENTEXT:
${p.text}`;
  for(const MODEL of await modelList()){
   for(let t=0;t<2;t++){
    let r;try{r=await fetch(`${process.env.GEMINI_BASE||'https://generativelanguage.googleapis.com'}/v1beta/models/${MODEL}:generateContent`,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':KEY},
      body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json'}})})}catch{r={status:503}}
    if(r.status===502||r.status===503){console.log(' (Modell '+MODEL+' überlastet, Versuch '+(t+1)+')');await sleep(6000*(t+1));continue}
    if(r.status===404){console.log(' (Modell '+MODEL+' nicht verfügbar)');break}
    if(!r.ok){const x=await r.text();throw new Error(r.status+' '+x.replace(/\s+/g,' ').slice(0,700))}
    const j=await r.json();const txt=(j.candidates?.[0]?.content?.parts||[]).map(q=>q.text||'').join('');
    const m=txt.match(/\{[\s\S]*\}/);if(!m)return null;try{return JSON.parse(m[0])}catch{return null}}
  }
  throw new Error('503 Modell überlastet')}
(async()=>{
  const j=JSON.parse(fs.readFileSync(F,'utf8'));let done=0,chg=0,dirty=false;
  // zuerst Bälle ohne Coverstock/Foto, dann die, denen nur layouts fehlt (stabile Sortierung = Listenreihenfolge bleibt)
  const need=b=>(!b.coverstock)+(!b.img);
  for(const b of [...j.balls].sort((x,y)=>need(y)-need(x))){
    if(done>=MAX)break;if(b.img&&b.coverstock&&b.layouts)continue;
    if(!b.url&&(HERST.ueberspringen||[]).includes(b.brand.toLowerCase()))continue; // Nischenmarke ohne Quelle
    if(b.checked&&Date.now()-new Date(b.checked)<RECHECK)continue; // nicht jede Woche dieselben Bälle erneut versuchen
    done++;let c=false;b.checked=TODAY;dirty=true;const p=await page(b);if(!p){console.log(' - keine Seite:',b.brand,b.name);continue}
    console.log(' ?',b.brand,b.name,'· Seite',p.url,'· Text',p.text.length,'Zeichen · og:image',p.og?'ja':'nein');
    if(!b.img&&p.og&&/^https:\/\//.test(p.og)&&await imgOk(p.og)){b.img=p.og;c=true}
    if(!b.coverstock||!b.layouts){let a;try{a=await ask(b,p)}catch(e){console.error('Gemini-Fehler:',e.message);delete b.checked;if(/^(400|401|403|404|429|503)/.test(e.message))break;continue}
      await sleep(15000);
      console.log('   Gemini:',a?('coverstock='+JSON.stringify(a.coverstock??null)+' · layouts='+(Array.isArray(a.layouts)?a.layouts.length:0)):'keine auswertbare Antwort');
      if(a){
        if(!b.coverstock&&typeof a.coverstock==='string'&&a.coverstock.length<80){b.coverstock=a.coverstock.trim();c=true}
        if(!b.layouts){const ls=(Array.isArray(a.layouts)?a.layouts:[]).filter(l=>l&&numOk(l.pin)&&numOk(l.psa)&&numOk(l.buf)&&toNum(l.pin)>=1&&toNum(l.pin)<=6&&toNum(l.psa)<=6&&toNum(l.buf)<=toNum(l.pin)).slice(0,6)
          .map(l=>({pin:l.pin.trim(),psa:l.psa.trim(),buf:l.buf.trim(),src:String(l.src||'Hersteller').slice(0,30)+' · KI'}));
          b.layouts=ls;c=c||ls.length>0}}}
    if(c){chg++;console.log(' +',b.brand,b.name)}
  }
  console.log('Geprüft:',done,'· ergänzt:',chg);
  if(dirty){if(chg)j.updated=new Date().toISOString().slice(0,10);fs.writeFileSync(F,JSON.stringify(j,null,1)+'\n')}
})();
