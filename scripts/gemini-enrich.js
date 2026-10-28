// Ergänzt Bälle in public/balls.json mit Coverstock, Foto (img) und Hersteller-Layoutvorschlägen (layouts) per Gemini + Google-Suche.
// Braucht GEMINI_API_KEY (kostenloser Schlüssel aus Google AI Studio). Modell per GEMINI_MODEL (Standard gemini-2.5-flash).
// Aufruf: node scripts/gemini-enrich.js [max=12]   Ohne Schlüssel wird übersprungen.
const fs=require('fs');const F='balls.json';
const KEY=process.env.GEMINI_API_KEY,MODEL=process.env.GEMINI_MODEL||'gemini-2.5-flash',MAX=+process.argv[2]||12;
if(!KEY){console.log('GEMINI_API_KEY fehlt – übersprungen.');process.exit(0)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const numOk=s=>typeof s==='string'&&/^\d{1,2}(\.\d+)?( \d\/\d{1,2})?$|^\d\/\d{1,2}$/.test(s.trim());
const toNum=s=>{const p=s.trim().split(' ');return p.reduce((a,x)=>a+(x.includes('/')?x.split('/')[0]/x.split('/')[1]:+x),0)};
async function imgOk(u){try{const r=await fetch(u,{headers:{'user-agent':'Mozilla/5.0'}});return r.ok&&/^image\//.test(r.headers.get('content-type')||'')}catch{return false}}
async function ask(b){
  const prompt=`Bowlingball: "${b.brand} ${b.name}". Suche auf der offiziellen Herstellerseite (oder bei großen Händlern wie bowling.com) nach genau diesem Ball und antworte NUR mit JSON, ohne Text drumherum:
{"coverstock":string|null,"img":string|null,"layouts":[{"pin":string,"psa":string,"buf":string,"src":string}]}
Regeln: img = direkte https-Adresse eines Produktfotos (jpg/png/webp). layouts nur, wenn der Hersteller ausdrücklich Bohrvorschläge nennt (z. B. Storm DrillSpec, Motiv, Roto Grip Layout Guide); Maße in Zoll als Text ("4 1/2", "5.0"): pin = Pin zu PAP, psa = PSA zu PAP, buf = Pin Buffer. src = Quelle kurz (z. B. "Motiv"). Nichts erfinden: bei Unsicherheit null bzw. leeres Array.`;
  const r=await fetch(`${process.env.GEMINI_BASE||"https://generativelanguage.googleapis.com"}/v1beta/models/${MODEL}:generateContent`,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':KEY},
    body:JSON.stringify({contents:[{parts:[{text:prompt}]}],tools:[{google_search:{}}]})});
  if(!r.ok){const t=await r.text();throw new Error(r.status+' '+t.slice(0,300))}
  const j=await r.json();const txt=(j.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('');
  const m=txt.match(/\{[\s\S]*\}/);if(!m)return null;try{return JSON.parse(m[0])}catch{return null}
}
(async()=>{
  const j=JSON.parse(fs.readFileSync(F,'utf8'));let done=0,chg=0;
  for(const b of j.balls){
    if(done>=MAX)break;if(b.img&&b.coverstock&&b.layouts)continue;
    done++;let a;try{a=await ask(b)}catch(e){console.error('Gemini-Fehler:',e.message);if(/^(400|401|403|429)/.test(e.message))break;continue}
    await sleep(6000);if(!a)continue;let c=false;
    if(!b.coverstock&&typeof a.coverstock==='string'&&a.coverstock.length<80){b.coverstock=a.coverstock.trim();c=true}
    if(!b.img&&typeof a.img==='string'&&/^https:\/\//.test(a.img)&&await imgOk(a.img)){b.img=a.img;c=true}
    if(!b.layouts){const ls=(Array.isArray(a.layouts)?a.layouts:[]).filter(l=>l&&numOk(l.pin)&&numOk(l.psa)&&numOk(l.buf)&&toNum(l.pin)>=1&&toNum(l.pin)<=6&&toNum(l.psa)<=6&&toNum(l.buf)<=toNum(l.pin)).slice(0,6)
      .map(l=>({pin:l.pin.trim(),psa:l.psa.trim(),buf:l.buf.trim(),src:String(l.src||'Hersteller').slice(0,30)+' · KI'}));
      b.layouts=ls;c=c||ls.length>0}
    if(c){chg++;console.log(' +',b.brand,b.name)}
  }
  console.log('Geprüft:',done,'· ergänzt:',chg);
  if(chg){j.updated=new Date().toISOString().slice(0,10);fs.writeFileSync(F,JSON.stringify(j,null,1)+'\n')}
})();
