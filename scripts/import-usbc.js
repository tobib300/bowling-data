// Übernimmt neu zugelassene Bälle aus der offiziellen USBC-Liste (pdftotext -layout) in public/balls.json.
// Aufruf: node scripts/import-usbc.js <usbc.txt> [Tage=75]   (--dry = nur anzeigen)
// Nur Einträge mit vollem Datum ("October 13, 2026") und jünger als <Tage> werden ergänzt.
const fs=require('fs');
const args=process.argv.slice(2).filter(a=>!a.startsWith('--')),dry=process.argv.includes('--dry');
const txt=fs.readFileSync(args[0],'utf8'),days=+args[1]||75,F='balls.json';
const M={january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};
const dateRe=/((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s*\d{4})\s*$/;
const cut=new Date(Date.now()-days*864e5);
const j=JSON.parse(fs.readFileSync(F,'utf8'));
const norm=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const known=j.balls.map(b=>[norm(b.brand),norm(b.name)]);
const isKnown=(br,n)=>known.some(([b,x])=>b===br&&(x===n||n.startsWith(x+' ')||x.startsWith(n+' ')));
const add=[];let rows=0;
for(const raw of txt.split(/\r?\n/)){
  const m=raw.trim().match(/^(.+?)\s{2,}(.+?)\s{2,}(.+)$/);if(!m)continue;
  const d=m[3].match(dateRe);if(!d)continue;rows++;
  const [mo,dd,yy]=d[1].replace(',',' ').split(/\s+/);const dt=new Date(Date.UTC(+yy,M[mo.toLowerCase()]-1,+dd));
  if(dt<cut||dt>new Date(Date.now()+864e5*120))continue;
  const brand=m[1].replace(/\*+/g,'').trim(),name=m[2].replace(/\*+/g,'').trim();
  if(!brand||!name||/12 ?lbs|& under/i.test(name)||isKnown(norm(brand),norm(name)))continue;
  known.push([norm(brand),norm(name)]);
  add.push({brand,name,release:dt.toISOString().slice(0,10),src:'USBC'});
}
console.log('Zeilen mit Volldatum:',rows,'· neu:',add.length);add.forEach(b=>console.log(' +',b.brand,'|',b.name,'|',b.release));
if(rows<5){console.error('Zu wenige Zeilen erkannt – Format geändert? Abbruch.');process.exit(2)}
if(!dry&&add.length){j.balls.push(...add);j.updated=new Date().toISOString().slice(0,10);fs.writeFileSync(F,JSON.stringify(j,null,1)+'\n')}
