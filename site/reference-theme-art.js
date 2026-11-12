/* BACK2U reference artwork: deterministic vector scenes for each concept.
   No mocked UI or screenshot numbers are used as a page background. */
(function(){
'use strict';
const profiles={
 n01:['ribbon','sidebar','neon'],n02:['metal','sidebar','chrome'],n03:['ember','sidebar','molten'],
 n04:['emerald','sidebar','gem'],n05:['ribbon','sidebar','blue'],n06:['emerald','sidebar','gem'],
 n10:['prism','sidebar','smoke'],n11:['water','sidebar','mint'],n12:['crystal','sidebar','frost'],
 n13:['ember','sidebar','rose'],n15:['crystal','sidebar','amethyst'],n16:['prism','sidebar','aurora'],
 n17:['prism','sidebar','violet'],n18:['water','sidebar','deepsea'],n19:['emerald','sidebar','lime'],
 n20:['prism','sidebar','cyber'],n21:['prism','sidebar','spectral'],n22:['pearl','wide','iridescent'],
 n23:['pearl','wide','sunset'],n24:['water','sidebar','ocean'],n25:['metal','wide','obsidian'],
 n27:['metal','wide','titanium'],n28:['circuit','wide','tech'],n29:['crystal','wide','arctic'],
 n30:['prism','sidebar','holographic'],
 fa00:['aero','sidebar','ocean'],fa01:['aero','sidebar','wave'],fa02:['aero','sidebar','aurora'],
 fa03:['aero','sidebar','meadow'],fa04:['aero','sidebar','rainbow'],fa05:['aero','sidebar','orbital'],
 fa06:['aero','sidebar','citrus'],fa07:['aero','sidebar','pearl'],fa08:['aero','sidebar','garden'],
 fa09:['aero','sidebar','prism'],fa10:['aero','sidebar','sunrise']
};
const cache={};
function art(p){
 const cacheKey=p.id+'|'+p.accent+'|'+p.secondary;
 if(cache[cacheKey])return cache[cacheKey];
 const prof=profiles[p.id]||['ribbon','sidebar','neon'];
 const [type,layout,finish]=prof;
 const bright=p.light,ac=p.accent,sc=p.secondary,bg=p.bg,mid=p.bg2;
 const isAero=p.family==='aero',index=Number(p.id.slice(1))||0,drift=(index%5)*16;
 const orb=(x,y,r,col,alpha)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+col+'" opacity="'+alpha+'" filter="url(#mist)"/>';
 const rays='<g fill="none" stroke-linecap="round"><path d="M-180 '+(760+drift)+'C360 1100 410 120 925 320S1320 20 1780 180" stroke="url(#wave)" stroke-width="135" opacity=".23" filter="url(#smear)"/><path d="M-180 '+(760+drift)+'C360 1100 410 120 925 320S1320 20 1780 180" stroke="url(#wave)" stroke-width="54" opacity=".46" filter="url(#smear)"/><path d="M-180 '+(765+drift)+'C360 1100 410 120 925 320S1320 20 1780 180" stroke="url(#shine)" stroke-width="4.5" opacity=".84"/><path d="M-120 925C320 650 600 655 880 760S1320 950 1700 640" stroke="url(#shine)" opacity=".51" stroke-width="70" filter="url(#smear)"/><path d="M-120 925C320 650 600 655 880 760S1320 950 1700 640" stroke="url(#shine)" opacity=".78" stroke-width="4"/></g>';
 const diamonds='<g fill="url(#crystal)" fill-opacity=".28" stroke="white" stroke-opacity=".50" stroke-width="1.7"><path d="M1260 695l130-330 140 220-140 260z"/><path d="M1290 710l103-235 82 150-95 165z"/><path d="M185 80l140 120-100 200-105-156z"/></g><g fill="none" stroke="#fff" stroke-opacity=".34"><path d="M1390 365l-10 480M1260 695l270-110M185 80l40 320"/></g>';
 const orbit='<g fill="none" stroke="url(#shine)" opacity=".59"><ellipse cx="1170" cy="210" rx="160" ry="63" transform="rotate(-35 1170 210)" stroke-width="9"/><ellipse cx="1170" cy="210" rx="145" ry="53" transform="rotate(-35 1170 210)" stroke-width="1.8"/></g>';
 const nodes='<g fill="none" stroke="url(#shine)" stroke-width="2.2" opacity=".26"><path d="M0 175H465L540 240H1080L1200 120H1600"/><path d="M0 760H340L495 645H890L1090 812H1600"/><circle cx="540" cy="240" r="9"/><circle cx="890" cy="645" r="9"/></g>';
 const leaves='<g opacity=".90"><path d="M-60 930Q175 380 330 480Q275 775-60 930Z" fill="url(#leaf)" stroke="#ddffa4" stroke-width="4"/><path d="M-60 930Q165 615 330 480" fill="none" stroke="#fffbbb" stroke-width="5" opacity=".50"/><path d="M1640 -60Q1220 205 1340 325Q1580 268 1640 -60Z" fill="url(#leaf)" stroke="#ddffa4" stroke-width="3"/><path d="M1640 -60Q1475 130 1340 325" fill="none" stroke="#fffbbb" stroke-width="4" opacity=".52"/></g>';
 const clouds='<g fill="#fff" opacity=".52"><ellipse cx="280" cy="125" rx="160" ry="29"/><ellipse cx="300" cy="96" rx="87" ry="51"/><ellipse cx="380" cy="131" rx="95" ry="29"/><ellipse cx="1170" cy="115" rx="180" ry="30"/><ellipse cx="1220" cy="79" rx="83" ry="45"/></g>';
 const ocean='<path d="M0 665Q370 615 690 662T1600 641V900H0Z" fill="url(#sea)" opacity=".56"/><g fill="none" stroke="url(#shine)" stroke-linecap="round" opacity=".72"><path d="M-90 690Q230 647 450 701T1100 677T1700 682" stroke-width="12"/><path d="M-60 805Q260 745 570 810T1160 778T1710 789" stroke-width="7"/><path d="M-60 855Q260 809 570 850T1160 827T1710 849" stroke-width="4"/></g>';
 const orbs='<g fill="none" stroke="url(#orb)"><circle cx="1220" cy="240" r="68" stroke-width="5" opacity=".76"/><circle cx="340" cy="730" r="39" stroke-width="3" opacity=".63"/><circle cx="1520" cy="695" r="31" stroke-width="3" opacity=".57"/><circle cx="935" cy="100" r="20" stroke-width="2"/></g>';
 const sparks='<g fill="white" opacity=".65"><path d="M1340 160l6 33 33 6-33 6-6 33-6-33-33-6 33-6z"/><path d="M290 132l4 22 22 4-22 4-4 22-4-22-22-4 22-4z"/></g>';
 const floral='<g opacity=".65"><path d="M1420 900q-35-210 105-350q42 160-105 350" fill="url(#leaf)"/><path d="M0 770q155-255 220-125q-100 158-220 125" fill="url(#leaf)"/></g>';
 const prismRay='<path d="M0 390Q320 30 565 350T1120 350T1700 140" stroke="url(#rainbow)" stroke-width="175" opacity=".17" fill="none" filter="url(#smear)"/>';
 function aeroDetails(id){
 const refracted=(x,y,r)=>'<g opacity=".88"><circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="url(#ballo)" stroke="url(#orb)" stroke-width="4"/><ellipse cx="'+(x-r*.28)+'" cy="'+(y-r*.4)+'" rx="'+(r*.42)+'" ry="'+(r*.13)+'" fill="#fff" opacity=".75" transform="rotate(-28 '+x+' '+y+')"/></g>';
 const bubbleLine=(x,y)=>[0,1,2,3,4,5].map(i=>refracted(x+i*33,y-i*i*18,9+i*3)).join('');
 const aeroWave=(y)=>'<path d="M-50 '+y+'C220 '+(y-100)+' 390 '+(y+95)+' 670 '+(y-15)+'S1160 '+(y-120)+' 1660 '+(y+5)+'" fill="none" stroke="url(#wave)" stroke-width="33" opacity=".44"/>';
 const palm=(x,y,scale)=>'<g transform="translate('+x+' '+y+') scale('+scale+')"><path d="M0 210Q30 70 42 -50" stroke="#c3efc8" stroke-width="14" fill="none"/><path d="M42 -50Q-120 -125 -180 -40Q-55 -65 42 -50M42 -50Q80 -175 194 -110Q110 -100 42 -50M42 -50Q-75 -210 -128 -185Q-40 -105 42 -50M42 -50Q171 -60 180 39Q120 -20 42 -50" fill="url(#leaf)" stroke="#eaffd0" stroke-width="2"/></g>';
 const rainbow='<path d="M-95 620Q415 -70 1050 205T1770 340" stroke="url(#rainbow)" stroke-width="94" opacity=".46" fill="none"/><path d="M-95 620Q415 -70 1050 205T1770 340" stroke="#fff" stroke-width="5" opacity=".55" fill="none"/>';
 const prism='<g opacity=".77"><path d="M1130 740l80-330 145 166-102 282z" fill="url(#crystal)" stroke="#fff" stroke-width="4"/><path d="M1370 390l90-260 120 214-90 190z" fill="url(#crystal)" stroke="#b3fcff" stroke-width="3"/><path d="M1190 408l63 450M1130 740l225-164" stroke="#fff" stroke-width="2" fill="none"/></g>';
 const horizon='<path d="M0 616Q280 553 520 613Q900 570 1160 633Q1460 578 1600 612V900H0Z" fill="url(#sea)" opacity=".63"/>';
 const circle=(cx,cy,r)=>'<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="url(#ballo)" stroke="url(#orb)" stroke-width="5" opacity=".8"/>';
 const scenes={
  fa00:waveScene('#fff')+bubbleLine(158,800)+refracted(1330,580,82)+refracted(1010,260,36),
  fa01:aeroWave(558)+aeroWave(778)+bubbleLine(235,800)+refracted(1260,520,103),
  fa02:palm(110,460,1.15)+palm(1470,340,.94)+circle(1070,520,104)+aeroWave(740),
  fa03:horizon+palm(1250,510,.74)+bubbleLine(300,835)+refracted(1120,270,88),
  fa04:rainbow+refracted(1420,470,134)+refracted(435,260,85)+bubbleLine(740,850),
  fa05:'<g fill="none" stroke="url(#orb)" opacity=".9"><ellipse cx="1215" cy="385" rx="264" ry="83" stroke-width="15" transform="rotate(-31 1215 385)"/><ellipse cx="1215" cy="385" rx="180" ry="47" stroke-width="5" transform="rotate(23 1215 385)"/></g>'+refracted(1180,382,103)+bubbleLine(315,740),
  fa06:circle(1280,390,137)+'<g fill="none" stroke="#efffcf" opacity=".77"><circle cx="1280" cy="390" r="114" stroke-width="10"/>'+[0,45,90,135].map(a=>'<path d="M1280 390l114 0M1280 390l-114 0" transform="rotate('+a+' 1280 390)" stroke-width="6"/>').join('')+'</g>'+palm(140,520,1)+aeroWave(725),
  fa07:refracted(1200,410,144)+refracted(1540,160,75)+refracted(380,705,105)+bubbleLine(675,790),
  fa08:palm(1350,460,1.1)+horizon+refracted(880,370,100)+aeroWave(785),
  fa09:prism+refracted(390,540,99)+aeroWave(758)+bubbleLine(870,850),
  fa10:'<circle cx="1205" cy="390" r="200" fill="#fffde3" opacity=".55" filter="url(#smear)"/>'+horizon+aeroWave(690)+refracted(430,380,112)+bubbleLine(790,820)
 };
 return scenes[id]||'';
 function waveScene(){return aquaPath(620)+aquaPath(790)}
 function aquaPath(y){return'<path d="M-20 '+y+'Q300 '+(y-110)+' 660 '+y+'T1700 '+(y-15)+'" stroke="url(#shine)" stroke-width="22" fill="none" opacity=".78"/>'}
}
 const base='<rect width="1600" height="900" fill="url(#scene)"/>';
 const fog=orb(1310,70,300,sc,.33)+orb(-60,640,300,ac,.33)+orb(700,910,220,sc,.2);
 let details=isAero?clouds+ocean+leaves+orbs+sparks:rays+orbs+sparks;
 if(['crystal','pearl','prism'].includes(type))details+=diamonds;
 if(['metal','circuit'].includes(type))details+=nodes;
 if(finish==='orbital')details+=orbit;
 if(isAero&&['meadow','garden','citrus'].includes(finish))details+=floral;
 if(['holographic','spectral','aurora','rainbow'].includes(finish))details+=prismRay;
 if(type==='ember')details+='<circle cx="1230" cy="250" r="180" fill="'+ac+'" opacity=".16" filter="url(#mist)"/>';
 if(finish==='sunrise')details+='<circle cx="1260" cy="330" r="140" fill="#ffffaa" opacity=".34" filter="url(#smear)"/>';
 if(finish==='metal'||finish==='titanium')details+='<g opacity=".23" fill="none" stroke="#ffffff" stroke-width="1.5"><path d="M60 0l760 900M450 0l760 900M1000 0l600 800"/></g>';
 if(isAero)details+=aeroDetails(p.id);
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"><defs>'+
 '<linearGradient id="scene" x1="0" y1="0" x2=".87" y2="1"><stop stop-color="'+bg+'"/><stop offset=".50" stop-color="'+mid+'"/><stop offset="1" stop-color="'+bg+'"/></linearGradient>'+
 '<linearGradient id="wave"><stop stop-color="'+sc+'" stop-opacity=".06"/><stop offset=".38" stop-color="'+ac+'"/><stop offset=".72" stop-color="#ffffff"/><stop offset="1" stop-color="'+sc+'" stop-opacity=".4"/></linearGradient>'+
 '<linearGradient id="shine"><stop stop-color="#fff" stop-opacity=".06"/><stop offset=".25" stop-color="'+ac+'"/><stop offset=".5" stop-color="#fff"/><stop offset=".75" stop-color="'+sc+'"/><stop offset="1" stop-color="#fff" stop-opacity=".07"/></linearGradient>'+
 '<linearGradient id="orb" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".4" stop-color="'+ac+'"/><stop offset=".7" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="'+sc+'"/></linearGradient>'+
 '<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop stop-color="'+ac+'"/><stop offset="1" stop-color="'+mid+'"/></linearGradient>'+
 '<linearGradient id="leaf"><stop stop-color="#c9ff76"/><stop offset=".5" stop-color="#5cdb83"/><stop offset="1" stop-color="#088f6b"/></linearGradient>'+
 '<linearGradient id="crystal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".53"/><stop offset=".5" stop-color="'+ac+'" stop-opacity=".2"/><stop offset="1" stop-color="'+sc+'" stop-opacity=".57"/></linearGradient>'+
 '<linearGradient id="rainbow"><stop stop-color="#6ceaff"/><stop offset=".26" stop-color="#ab89ff"/><stop offset=".55" stop-color="#ff93bc"/><stop offset=".75" stop-color="#f6f99a"/><stop offset="1" stop-color="#85ffdc"/></linearGradient>'+
 '<radialGradient id="ballo" cx=".25" cy=".22"><stop stop-color="#fff" stop-opacity=".84"/><stop offset=".39" stop-color="'+ac+'" stop-opacity=".46"/><stop offset=".82" stop-color="'+sc+'" stop-opacity=".31"/><stop offset="1" stop-color="#fff" stop-opacity=".11"/></radialGradient><filter id="mist"><feGaussianBlur stdDeviation="95"/></filter><filter id="smear"><feGaussianBlur stdDeviation="19"/></filter></defs>'+
 base+fog+details+'</svg>';
 const result={url:'data:image/svg+xml,'+encodeURIComponent(svg),layout,finish,type};
 if(Object.keys(cache).length>90){for(const key of Object.keys(cache).slice(0,20))delete cache[key]}
 cache[cacheKey]=result;return result;
}
window.BACK2U_REFERENCE_ART=art;
})();