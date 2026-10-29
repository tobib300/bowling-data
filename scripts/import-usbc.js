// Übernimmt neu zugelassene Bälle aus der offiziellen USBC-Liste (pdftotext -layout) in public/balls.json.
// Aufruf: node scripts/import-usbc.js <usbc.txt> [Tage=75]   (--dry = nur anzeigen)
// Nur Einträge mit vollem Datum ("October 13, 2026") und jünger als <Tage> werden ergänzt.
const fs=require('fs');
const args=process.argv.slice(2).filter(a=>!a.startsWith('--')),dry=process.argv.includes('--dry');
const txt=fs.readFileSync(args[0],'utf8'),days=+args[1]||75,F='balls.json';
const M={january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};
const dateRe=/((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s*\d{4})\s*$/;
const shortRe=/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?-?\s*['’`´]?(\d{2})\s*$/i; // ältere Einträge der USBC-Liste: "Feb-14" = Februar 2014, auch "Nov-'02" und "Jun'00"
const MS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
let nFull=0,nShort=0,nOther=0,minY=9999,maxY=0;const otherSample=[];
const cut=new Date(Date.now()-days*864e5);
const j=JSON.parse(fs.readFileSync(F,'utf8'));
const norm=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const known=j.balls.map(b=>[norm(b.brand),norm(b.name)]);
// Täglicher Lauf (bis 1 Jahr): auch Farbvarianten bekannter Bälle überspringen. Nachimport (länger): nur exakt gleiche Namen überspringen, damit z. B. "Black Widow" neben "Black Widow 3.0" erhalten bleibt.
const strict=days>365;
const isKnown=(br,n)=>known.some(([b,x])=>b===br&&(x===n||(!strict&&(n.startsWith(x+' ')||x.startsWith(n+' ')))));
const add=[];let rows=0;
for(const raw of txt.split(/\r?\n/)){
  const m=raw.trim().match(/^(.+?)\s{2,}(.+?)\s{2,}(.+)$/);if(!m)continue;
  let dt,rel;const d=m[3].match(dateRe),sh=!d&&m[3].match(shortRe);
  if(d){const [mo,dd,yy]=d[1].replace(',',' ').split(/\s+/);dt=new Date(Date.UTC(+yy,M[mo.toLowerCase()]-1,+dd));rel=dt.toISOString().slice(0,10);nFull++}
  else if(sh){const mi=MS.indexOf(sh[1].toLowerCase()),y=+sh[2]<70?2000+ +sh[2]:1900+ +sh[2];dt=new Date(Date.UTC(y,mi,1));rel=y+'-'+String(mi+1).padStart(2,'0');nShort++;minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
  else{if(/\d/.test(m[3])){nOther++;if(otherSample.length<8)otherSample.push(m[3].trim())}continue}
  rows++;
  if(dt<cut||dt>new Date(Date.now()+864e5*120))continue;
  const brand=m[1].replace(/\*+/g,'').trim(),name=m[2].replace(/\*+/g,'').trim();
  if(!brand||!name||/12 ?lbs|& under/i.test(name)||isKnown(norm(brand),norm(name)))continue;
  known.push([norm(brand),norm(name)]);
  add.push({brand,name,release:rel,src:'USBC'});
}
console.log('Datumsformate: ausgeschrieben',nFull,'· Monat-Jahr',nShort,'(Jahre',minY+'–'+maxY+')','· unbekannt mit Ziffern',nOther,otherSample.length?'(z. B. '+otherSample.join(' | ')+')':'');
console.log('Zeilen gelesen:',rows,'· neu:',add.length,'· Zeitraum ab',cut.toISOString().slice(0,10),strict?'· Vergleich: streng (Nachimport)':'');
const byBrand={};add.forEach(b=>byBrand[b.brand]=(byBrand[b.brand]||0)+1);
if(add.length>80){console.log('Nach Marke:',Object.entries(byBrand).sort((x,y)=>y[1]-x[1]).slice(0,25).map(([b,n])=>b+' '+n).join(' · '));add.slice(0,40).forEach(b=>console.log(' +',b.brand,'|',b.name,'|',b.release));console.log(' … und',add.length-40,'weitere')}
else add.forEach(b=>console.log(' +',b.brand,'|',b.name,'|',b.release));
const byYear={};add.forEach(b=>{const y=b.release.slice(0,4);byYear[y]=(byYear[y]||0)+1});if(add.length>80)console.log('Nach Jahr:',Object.entries(byYear).sort().map(([y,n])=>y+' '+n).join(' · '));
for(const n of ['venom shock'])add.filter(b=>norm(b.name).includes(n)).forEach(b=>console.log(' ✔ gefunden:',b.brand,'|',b.name,'|',b.release));
if(rows<5){console.error('Zu wenige Zeilen erkannt – Format geändert? Abbruch.');process.exit(2)}
if(!dry&&add.length){j.balls.push(...add);j.updated=new Date().toISOString().slice(0,10);fs.writeFileSync(F,JSON.stringify(j,null,1)+'\n')}
