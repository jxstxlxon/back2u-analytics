/* BACK2U V8.0.8 — Retina-vector cinematic worlds.
 * Draws actual theme artwork, never fake KPIs or text in the scene.
 * 1920x1080 coordinate system, sharp SVG vectors at any device pixel ratio.
 * No animated filters, canvas loops, tracking, external images or API calls.
 */
(function(){
'use strict';
const original=window.BACK2U_REFERENCE_ART;
if(typeof original!=='function')return;
const cache=new Map();
const mapped={
 ex01:'cosmos',ex02:'plasma',ex03:'forest',ex04:'aero',
 ex05:'backrooms',ex06:'corvette',ex07:'cathedral',ex08:'reactor',
 ex09:'lunar',ex10:'sakura',ex11:'ice',ex12:'eclipse',
 ex13:'monsoon',ex14:'inferno',ex15:'vapor',ex16:'atlantis',
 ex17:'singularity',ex18:'bio',ex19:'redline',ex20:'paradise',
 n04:'forest',n06:'forest',n19:'forest',n11:'forest',
 n12:'ice',n15:'ice',n29:'ice',n18:'atlantis',n24:'atlantis',
 n22:'pearl',n23:'sunset',n30:'pearl',n16:'cosmos',n20:'cosmos',
 n25:'lunar',n27:'lunar',n02:'lunar',
 n03:'inferno',n13:'sunset',n28:'reactor'
};
const valid=(s,def)=>typeof s==='string'&&/^#[0-9a-f]{6}$/i.test(s)?s:def;
function scene(p,base){
 const bg=valid(p.bg,'#081524'),mid=valid(p.bg2,'#152c48');
 const ac=valid(p.accent,'#59dfff'),sc=valid(p.secondary,'#9878ff');
 const family=p.family||'dark';
 const seed=Number.parseInt(p.id.replace(/^\D+/,''),10)||0;
 const type=mapped[p.id]||(family==='aero'?'aero':base.type==='water'?'atlantis':base.type==='emerald'?'forest':base.type==='pearl'?'pearl':base.type==='metal'?'lunar':base.type==='circuit'?'reactor':base.type==='prism'?'cosmos':base.type==='crystal'?'ice':base.type==='ember'?'inferno':'cosmos');
 const light=family==='aero'||family==='light';
 const planet='<circle cx="1450" cy="270" r="220" fill="url(#planet)"/><circle cx="1380" cy="203" r="165" fill="#fff" opacity=".065"/><circle cx="1450" cy="270" r="221" fill="none" stroke="url(#beam)" stroke-width="5" opacity=".8"/>';
 const shards='<g stroke="#fff" stroke-opacity=".55" fill="url(#prism)"><path d="M1270 1080l125-580 180 340-90 240z" stroke-width="4"/><path d="M1485 1080l88-360 175 195-65 165z" stroke-width="3"/><path d="M1060 1080l110-370 105 240-45 130z" stroke-width="3"/><path d="M1650 1080l120-460 175 320-65 140z" stroke-width="3"/></g>';
 const beams='<g fill="none" stroke-linecap="round"><path d="M-180 880Q520 210 1030 380T2140 70" stroke="url(#beam)" stroke-width="140" opacity=".12"/><path d="M-180 880Q520 210 1030 380T2140 70" stroke="url(#beam)" stroke-width="18" opacity=".64"/><path d="M-180 875Q520 210 1030 380T2140 70" stroke="#fff" stroke-width="3" opacity=".82"/><path d="M-50 960Q540 720 1050 860T2050 640" stroke="url(#beam)" stroke-width="6" opacity=".7"/></g>';
 const skyline='<g fill="url(#skyline)" stroke="'+sc+'" stroke-opacity=".50" stroke-width="3"><path d="M650 1080V770h86V670h85v160h80V590h80v180h74V520h135v175h78V440h84v270h110V585h100v185h76V650h114v430Z"/></g>'+
  '<g fill="'+ac+'" opacity=".65">'+Array.from({length:48},(_,i)=>{
   const x=690+(i*43)%1090,y=595+((i*71+seed*11)%310);
   return '<rect x="'+x+'" y="'+y+'" width="7" height="15" rx="2"/>';
  }).join('')+'</g>';
 const hills='<path d="M0 900Q255 560 520 720T1070 630T1700 710T1920 590V1080H0Z" fill="url(#land)" opacity=".95"/><path d="M0 1020Q360 740 620 865T1300 780T1920 700V1080H0Z" fill="url(#front)" opacity=".85"/>';
 const clouds='<g fill="#fff" opacity=".74"><path d="M840 260q80-85 165-20q95-100 215 0q75-25 130 30q-35 46-130 32H900q-100 2-60-42z"/><path d="M1460 145q80-70 160-18q82-60 170 8q58-14 88 22q-32 33-110 31h-210q-96 0-98-43z"/></g>';
 const sun='<circle cx="1420" cy="300" r="170" fill="url(#sun)"/><circle cx="1420" cy="300" r="171" fill="none" stroke="#fff" opacity=".55" stroke-width="3"/>';
 const water='<path d="M0 790Q350 710 650 790T1300 755T1920 745V1080H0Z" fill="url(#water)" opacity=".72"/>'+
  '<g stroke="url(#beam)" stroke-width="5" fill="none" opacity=".72"><path d="M0 825Q300 779 640 840T1350 820T1920 790"/><path d="M0 918Q420 870 760 935T1470 903T1940 865"/><path d="M0 1025Q310 990 770 1038T1550 1008T1980 983"/></g>';
 const bubs='<g fill="url(#bubble)" stroke="#fff" stroke-opacity=".72" stroke-width="4"><circle cx="1365" cy="310" r="117"/><circle cx="1660" cy="620" r="62"/><circle cx="1000" cy="690" r="46"/><circle cx="1810" cy="310" r="30"/></g>'+
  '<g stroke="#fff" stroke-width="4" opacity=".8" fill="none"><path d="M1280 267q58-67 125-20"/><path d="M1632 591q20-27 46-19"/></g>';
 const circuit='<g stroke="'+ac+'" stroke-width="5" fill="none" opacity=".67"><path d="M360 1010h480l180-160h320l180-245h540"/><path d="M820 1080v-270l260-160h400l270-225h210"/><path d="M450 430h350l170 170h350l180-145h340"/><circle cx="1018" cy="850" r="16"/><circle cx="1476" cy="650" r="18"/><circle cx="1500" cy="455" r="18"/></g>';
 const car='<g transform="translate(190 330)"><ellipse cx="1200" cy="550" rx="625" ry="58" fill="'+ac+'" opacity=".12"/>'+
  '<path d="M535 518Q565 448 715 433L840 323Q955 274 1190 277L1430 335Q1560 355 1710 449L1815 480Q1864 498 1831 552H535Z" fill="#050609" stroke="#87909e" stroke-width="6"/>'+
  '<path d="M837 336Q960 275 1170 287L1400 336L1535 430H701Z" fill="url(#window)" stroke="#b1c0ca" stroke-width="4"/>'+
  '<path d="M610 489Q810 514 1130 507T1780 487" stroke="'+ac+'" stroke-width="8" fill="none" opacity=".93"/>'+
  '<path d="M605 477l185-24-26 47-193 22M1580 454l190 24 46 46-206-26z" fill="'+ac+'" opacity=".95"/>'+
  '<path d="M735 535h955" stroke="#6d7786" stroke-width="6"/>'+
  '<g fill="#06080b" stroke="#84919f" stroke-width="13"><circle cx="802" cy="548" r="100"/><circle cx="1580" cy="548" r="100"/></g>'+
  '<g fill="#353c48" stroke="#d5dce6" stroke-width="6"><circle cx="802" cy="548" r="55"/><circle cx="1580" cy="548" r="55"/></g>'+
  '<g fill="#0b0c11"><circle cx="802" cy="548" r="23"/><circle cx="1580" cy="548" r="23"/></g></g>';
 const portal='<g stroke="url(#beam)" fill="none"><ellipse cx="1460" cy="475" rx="350" ry="150" stroke-width="24" opacity=".7" transform="rotate(-22 1460 475)"/><ellipse cx="1460" cy="475" rx="325" ry="128" stroke-width="5" opacity=".86" transform="rotate(-22 1460 475)"/></g>';
 const mountains='<path d="M0 920L370 640l170 153 345-470 320 370 282-406 433 650v143H0Z" fill="url(#mount)" stroke="'+ac+'" stroke-opacity=".54" stroke-width="6"/>'+
  '<path d="M550 780l330-445 90 100-92-33-120 180-75 47zM1350 484l137-187 128 200-130-110z" fill="#fff" opacity=".25"/>';
 const volcano=mountains+'<path d="M862 325Q970 400 1070 560T1400 1030" fill="none" stroke="'+ac+'" stroke-width="53" opacity=".4"/>'+
  '<path d="M862 325Q970 400 1070 560T1400 1030" fill="none" stroke="'+sc+'" stroke-width="10"/>';
 const lines='<g fill="none" stroke="'+ac+'" opacity=".65">'+Array.from({length:12},(_,i)=>'<path d="M'+(i*180-100)+' 1080L1300 420" stroke-width="'+(i%3+2)+'"/>').join('')+'</g>';
 const pillars='<g stroke="#3e391b" stroke-width="22" opacity=".84"><path d="M420 0V1080M1040 0V1080M1640 0V1080M0 785L920 420L1920 760M0 1000L920 425L1920 980"/></g>';
 const backrooms='<g><path d="M0 0H1920V780L1040 480H650L0 760Z" fill="#aca057" opacity=".86"/>'+
  '<path d="M0 1080L650 480H1040L1920 1080Z" fill="#8b8147"/>'+
  '<path d="M760 0h185v475H760Z" fill="#706537"/>'+
  pillars+
  '<g fill="#fff9c2" opacity=".96"><rect x="220" y="84" width="330" height="34" rx="4"/><rect x="1110" y="80" width="400" height="33" rx="4"/><rect x="820" y="450" width="145" height="24" rx="2"/></g>'+
  '<g fill="none" stroke="#e7d38a" opacity=".33" stroke-width="3"><path d="M0 835H1920M0 940H1920M225 0V1080M1780 0V1080"/></g></g>';
 const arches='<g fill="none" stroke="url(#beam)" stroke-width="20" opacity=".80"><path d="M780 1080V440Q970 80 1170 440V1080"/><path d="M1250 1080V330Q1440 -30 1650 330V1080"/><path d="M340 1080V580Q470 270 630 580V1080"/></g>'+
  '<g fill="url(#window)" stroke="#fff" stroke-opacity=".54" stroke-width="5"><path d="M850 1000V485Q970 260 1100 485V1000Z"/><path d="M1320 1000V380Q1440 150 1580 380V1000Z"/></g>';
 const reactor='<g transform="translate(1420 505)"><ellipse rx="360" ry="155" fill="url(#planet)" stroke="'+ac+'" stroke-width="18"/><ellipse rx="310" ry="116" fill="#081621" stroke="'+sc+'" stroke-width="10"/><ellipse rx="230" ry="75" fill="url(#bubble)" stroke="'+ac+'" stroke-width="9"/><rect x="-110" y="30" width="220" height="515" fill="url(#reactor)" stroke="'+ac+'" stroke-width="12"/><ellipse cy="540" rx="205" ry="65" fill="url(#planet)" stroke="'+ac+'" stroke-width="14"/></g>'+circuit;
 const cherry=skyline+'<g stroke="#111020" stroke-width="30" fill="none"><path d="M1420 1080Q1430 650 1560 460Q1640 280 1840 270"/><path d="M1550 485Q1400 320 1230 260M1640 365Q1720 200 1860 160"/></g>'+
  '<g fill="'+ac+'" opacity=".88">'+Array.from({length:45},(_,i)=>{const x=1200+(i*67+seed*11)%690,y=130+(i*79)%460;return '<ellipse cx="'+x+'" cy="'+y+'" rx="'+(8+i%9)+'" ry="'+(5+i%5)+'" transform="rotate('+(i*37%180)+' '+x+' '+y+')"/>';}).join('')+'</g>';
 const bios='<g><rect x="1220" y="230" width="420" height="720" rx="50" fill="url(#reactor)" stroke="'+ac+'" stroke-width="18"/><rect x="1270" y="305" width="320" height="530" rx="28" fill="'+ac+'" fill-opacity=".18" stroke="'+ac+'" stroke-width="6"/><path d="M1380 490l100 0-50 90zM1330 705l70-100 60 105zM1510 605l70 100-110 5z" fill="'+ac+'" opacity=".75"/></g>'+circuit;
 const palms='<g stroke="#165b70" stroke-width="23" fill="none"><path d="M1490 1080Q1560 560 1710 300"/><path d="M1650 900Q1715 550 1830 420"/></g>'+
  '<g fill="#4af5aa" opacity=".8"><path d="M1710 300Q1500 60 1310 210Q1500 200 1710 300M1710 300Q1880 60 1990 120Q1860 220 1710 300M1710 300Q1560 460 1360 415Q1540 320 1710 300M1710 300Q1850 450 2010 405Q1850 330 1710 300"/></g>';
 const lagoon=hills+water+bubs+clouds+sun;
 const parts={
  cosmos:planet+portal+beams+shards,
  plasma:sun+beams+lines,
  forest:hills+water+shards+'<g fill="'+ac+'" opacity=".35"><circle cx="1420" cy="420" r="200"/><circle cx="1670" cy="260" r="100"/></g>',
  aero:lagoon+skyline,
  backrooms:backrooms,
  corvette:car+lines,
  cathedral:arches+shards,
  reactor:reactor,
  lunar:planet+mountains+shards,
  sakura:cherry,
  ice:mountains+shards+portal,
  eclipse:planet+'<circle cx="1375" cy="245" r="188" fill="'+bg+'"/>'+beams,
  monsoon:skyline+lines+'<g stroke="'+ac+'" opacity=".55" stroke-width="2">'+Array.from({length:40},(_,i)=>'<path d="M'+(i*57-150)+' 0l-320 1080"/>').join('')+'</g>',
  inferno:volcano+beams,
  vapor:sun+'<g stroke="'+ac+'" stroke-opacity=".55" stroke-width="4">'+Array.from({length:12},(_,i)=>'<path d="M0 '+(700+i*30)+'H1920"/>').join('')+'</g>'+palms,
  atlantis:water+skyline+shards+bubs,
  singularity:planet+portal+beams,
  bio:bios,
  redline:car+lines+beams,
  paradise:lagoon+palms,
  sunset:sun+water+palms,
  pearl:beams+shards+bubs
 };
 const spark=Array.from({length:47},(_,i)=>{
  const x=((i*173+seed*43)%1850)+25,y=(i*97+seed*59)%660;
  return '<circle cx="'+x+'" cy="'+y+'" r="'+(i%4===0?3.5:1.6)+'" fill="#fff" opacity="'+(.20+(i%5)*.13)+'"/>';
 }).join('');
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">'+
 '<defs>'+
 '<linearGradient id="sky" x1="0" x2=".8" y1="0" y2="1"><stop stop-color="'+bg+'"/><stop offset=".47" stop-color="'+mid+'"/><stop offset="1" stop-color="'+bg+'"/></linearGradient>'+
 '<linearGradient id="beam"><stop stop-color="'+ac+'" stop-opacity=".1"/><stop offset=".3" stop-color="'+ac+'"/><stop offset=".62" stop-color="#fff"/><stop offset="1" stop-color="'+sc+'"/></linearGradient>'+
 '<linearGradient id="prism" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".70"/><stop offset=".42" stop-color="'+ac+'" stop-opacity=".20"/><stop offset="1" stop-color="'+sc+'" stop-opacity=".56"/></linearGradient>'+
 '<linearGradient id="window"><stop stop-color="'+bg+'"/><stop offset=".5" stop-color="'+mid+'"/><stop offset="1" stop-color="'+sc+'"/></linearGradient>'+
 '<linearGradient id="skyline" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="'+ac+'" stop-opacity=".42"/><stop offset=".8" stop-color="'+mid+'"/><stop offset="1" stop-color="'+bg+'"/></linearGradient>'+
 '<linearGradient id="land" x1="0" y1="0" x2="0" y2="1"><stop stop-color="'+sc+'"/><stop offset="1" stop-color="'+mid+'"/></linearGradient>'+
 '<linearGradient id="front" x1="0" y1="0" x2="0" y2="1"><stop stop-color="'+ac+'"/><stop offset="1" stop-color="'+bg+'"/></linearGradient>'+
 '<linearGradient id="mount" x1="0" y1="0" x2="0" y2="1"><stop stop-color="'+sc+'"/><stop offset=".65" stop-color="'+mid+'"/><stop offset="1" stop-color="'+bg+'"/></linearGradient>'+
 '<linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop stop-color="'+ac+'" stop-opacity=".68"/><stop offset="1" stop-color="'+bg+'"/></linearGradient>'+
 '<linearGradient id="reactor" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+ac+'" stop-opacity=".74"/><stop offset=".5" stop-color="'+bg+'"/><stop offset="1" stop-color="'+sc+'" stop-opacity=".8"/></linearGradient>'+
 '<radialGradient id="sun"><stop stop-color="#fff" stop-opacity=".95"/><stop offset=".42" stop-color="'+ac+'" stop-opacity=".82"/><stop offset="1" stop-color="'+sc+'" stop-opacity=".05"/></radialGradient>'+
 '<radialGradient id="planet" cx=".30" cy=".28"><stop stop-color="#fff" stop-opacity=".78"/><stop offset=".38" stop-color="'+ac+'" stop-opacity=".6"/><stop offset=".83" stop-color="'+mid+'"/><stop offset="1" stop-color="'+bg+'"/></radialGradient>'+
 '<radialGradient id="bubble" cx=".3" cy=".2"><stop stop-color="#fff" stop-opacity=".8"/><stop offset=".4" stop-color="'+ac+'" stop-opacity=".40"/><stop offset=".85" stop-color="'+sc+'" stop-opacity=".17"/><stop offset="1" stop-color="#fff" stop-opacity=".06"/></radialGradient>'+
 '</defs><rect width="1920" height="1080" fill="url(#sky)"/>'+
 (light?'':spark)+
 '<path d="M0 1060Q410 980 875 1050T1920 1000" fill="none" stroke="url(#beam)" stroke-width="11" opacity=".69"/>'+
 (parts[type]||beams+shards)+
 '<g fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="2"><path d="M20 1055H1900M35 25H1885"/></g>'+
 '</svg>';
 return {url:'data:image/svg+xml,'+encodeURIComponent(svg),layout:base.layout,finish:base.finish,type:'premium-'+type};
}
window.BACK2U_REFERENCE_ART=function(p){
 const key=[p.id,p.bg,p.bg2,p.accent,p.secondary].join('|');
 if(cache.has(key))return cache.get(key);
 const base=original(p);
 const result=scene(p,base);
 if(cache.size>75)cache.delete(cache.keys().next().value);
 cache.set(key,result);
 return result;
};
})();