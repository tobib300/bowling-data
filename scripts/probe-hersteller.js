// Diagnose: prüft Herstellerseiten (Startseite, Sitemap) und zeigt echte Produktadressen. Kein Gemini, keine Schreibzugriffe.
// Aufruf: node scripts/probe-hersteller.js   (Domains aus scripts/hersteller.json bzw. unten)
const UA={'user-agent':'Mozilla/5.0 (compatible; proshop-probe)'};
const HOSTS=['stormbowling.com','hammerbowling.com','motivbowling.com','rotogrip.com','radicalbowling.com','ebonite.com','brunswickbowling.com','900global.com','dv8bowling.com','trackbowling.com','swagbowling.com'];
const SUCH=['lock-axis','idol-star','pure-effect','hy-road','hitter','black-widow','royal','hustle','max-orbit','ion-max','savage-lock','go-time'];
async function get(u){try{const r=await fetch(u,{headers:UA,redirect:'follow'});return{ok:r.ok,status:r.status,url:r.url,text:r.ok?await r.text():''}}catch(e){return{ok:false,status:'ERR '+(e.cause?.code||e.message),url:u,text:''}}}
const locs=t=>[...t.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m=>m[1]);
(async()=>{
  for(const h of HOSTS){
    const home=await get('https://www.'+h+'/');const title=(home.text.match(/<title[^>]*>([^<]*)/i)||[])[1]||'';
    console.log(`\n== ${h}: Startseite ${home.status} → ${home.url.slice(0,80)} · "${title.trim().slice(0,60)}"`);
    let all=[];const base=new URL(home.ok?home.url:'https://www.'+h+'/').origin;
    for(const sm of ['/sitemap.xml','/sitemap_index.xml']){const s=await get(base+sm);if(!s.ok){console.log(`   ${sm}: ${s.status}`);continue}
      let l=locs(s.text);console.log(`   ${sm}: ${s.status} · ${l.length} Einträge`);
      if(l.some(x=>/\.xml/.test(x))){for(const c of l.filter(x=>/\.xml/.test(x)).slice(0,6)){const cs=await get(c);if(cs.ok)all.push(...locs(cs.text))}}else all.push(...l);break}
    const ball=all.filter(u=>/ball/i.test(u));console.log(`   Adressen gesamt ${all.length}, mit "ball": ${ball.length}`);
    ball.slice(0,5).forEach(u=>console.log('     z.B.',u));
    SUCH.forEach(k=>{const m=all.filter(u=>u.toLowerCase().includes(k)).slice(0,2);if(m.length)console.log(`   Treffer "${k}":`,m.join(' , '))});
  }
})();
