// Prüft public/balls.json: gültiges JSON, Pflichtfelder, keine Dubletten. Beendet mit Fehlercode bei Problemen.
const fs=require('fs');
const f=process.argv[2]||'balls.json';
let j;try{j=JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){console.error('JSON ungültig:',e.message);process.exit(1)}
if(!Array.isArray(j.balls)||j.balls.length<1){console.error('balls fehlt oder leer');process.exit(1)}
const seen=new Set();let bad=0;
for(const b of j.balls){
  if(!b.brand||!b.name||typeof b.brand!=='string'||typeof b.name!=='string'){console.error('Pflichtfeld fehlt:',JSON.stringify(b));bad++;continue}
  if(b.release&&!/^\d{4}-\d{2}(-\d{2})?$/.test(b.release)){console.error('Datum ungültig:',JSON.stringify(b));bad++}
  if(b.layouts&&(!Array.isArray(b.layouts)||b.layouts.some(l=>!l||!l.pin||!l.psa||!l.buf))){console.error('layouts ungültig:',b.brand,b.name);bad++}
  if(b.rg!==undefined&&!(b.rg>=2.35&&b.rg<=2.85)){console.error('rg ungültig:',b.brand,b.name);bad++}
  if(b.diff!==undefined&&!(b.diff>=0&&b.diff<=0.08)){console.error('diff ungültig:',b.brand,b.name);bad++}
  if(b.mb!==undefined&&!(b.mb>=0&&b.mb<=0.04)){console.error('mb ungültig:',b.brand,b.name);bad++}
  if(b.img&&!/^https:\/\//.test(b.img)){console.error('img ungültig:',b.brand,b.name);bad++}
  const k=(b.brand+'|'+b.name).toLowerCase();if(seen.has(k)){console.error('Dublette:',k);bad++}seen.add(k);
}
if(bad){process.exit(1)}console.log('OK',j.balls.length,'Bälle');
