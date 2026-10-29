// Diagnose: zeigt, wie ein Ball in der offiziellen USBC-Liste (pdftotext -layout) steht und ob der Import ihn liest.
// Aufruf: node scripts/usbc-suche.js <usbc.txt> "<Suchbegriff>"
const fs=require('fs');
const lines=fs.readFileSync(process.argv[2],'utf8').split(/\r?\n/);
const key=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'');
const q=key(process.argv[3]||'venom shock');
const row=/^(.+?)\s{2,}(.+?)\s{2,}(.+)$/;
const dateRe=/((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s*\d{4})\s*$/;
let rows=0,full=0;const noDate=[];
lines.forEach(raw=>{const m=raw.trim().match(row);if(!m)return;rows++;if(m[3].match(dateRe))full++;else if(/\d{4}|\d{1,2}\/\d{1,2}\/\d{2}/.test(m[3]))noDate.push(raw.trim())});
console.log('Zeilen im Text:',lines.length,'· Zeilen mit 3 Spalten:',rows,'· davon mit Volldatum (werden gelesen):',full,'· mit Jahr, aber ohne Volldatum (gehen verloren):',noDate.length);
noDate.slice(0,15).forEach(x=>console.log('   ohne Volldatum:',JSON.stringify(x)));
console.log('\nSuche nach "'+process.argv[3]+'":');
let n=0;
lines.forEach((raw,i)=>{if(!key(raw).includes(q))return;n++;const m=raw.trim().match(row),d=m&&m[3].match(dateRe);
  console.log(`  Zeile ${i}: ${JSON.stringify(raw.trim())}\n     → ${m?(d?'wird vom Import gelesen':'3 Spalten, aber KEIN Volldatum'):'Spaltenformat nicht erkannt'}\n     davor: ${JSON.stringify((lines[i-1]||'').trim())}  danach: ${JSON.stringify((lines[i+1]||'').trim())}`)});
// Zusatz: der Name steht evtl. über zwei Zeilen verteilt
const joined=lines.map(l=>l.trim()).filter(Boolean);
for(let i=0;i<joined.length-1;i++){const two=key(joined[i]+joined[i+1]);if(two.includes(q)&&!key(joined[i]).includes(q)&&!key(joined[i+1]).includes(q)){n++;console.log('  über zwei Zeilen verteilt:',JSON.stringify(joined[i]),'+',JSON.stringify(joined[i+1]))}}
if(!n)console.log('  nicht gefunden: steht nicht in dieser USBC-Liste.');
