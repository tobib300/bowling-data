// Findet in einer Liste von Sitemap-Adressen die Produktseite eines Balls (reine Funktion, ohne Netz).
const slug=s=>s.toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const MERCH=new Set(['bag','bags','tote','polish','jersey','shirt','apparel','towel','glove','gloves','hat','cleaner','sticker','video','videos','blog','read','tape','insert','inserts','headwear']);
const istMerch=(path,s)=>path.replace(s,' ').split(/[^a-z0-9]+/).some(t=>MERCH.has(t));
const GENERIC=/-(hybrid|pearl|solid|urethane|overseas|clear|black|navy|ruby|teal|purple|red|blue|green|gold)$/;
function kandidaten(name){
  const a=slug(name),b=slug(name.replace(/\([^)]*\)/g,' ').replace(/\b\d+\s*lbs?\.?/gi,' '));
  let c=b;while(GENERIC.test(c)&&c.split('-').length>2)c=c.replace(GENERIC,'');
  return [...new Set([a,b,c])].filter(s=>s.length>=3)}
function pick(locs,brand,name){
  const bs=slug(brand);
  for(const s of kandidaten(name)){
    const hit=locs.map(u=>{try{const p=new URL(u).pathname.replace(/\.html?$/,'').split('/').filter(Boolean);return{u,seg:p[p.length-1]||'',path:p.join('/')}}catch{return null}}).filter(Boolean)
      .filter(x=>('-'+x.seg+'-').includes('-'+s+'-')&&!istMerch(x.path,s)&&!/archive|retired/.test(x.path));
    const score=x=>(x.path.includes(bs)?2:0)+(/bowling-ball$/.test(x.seg)||x.seg===s?2:0);
    if(hit.length){hit.sort((x,y)=>(score(y)-score(x))||(x.seg.length-y.seg.length));return hit[0].u}}
  return null}
module.exports={pick,kandidaten,slug};
