/* BACK2U V8.3.0 — detailed, uniquely marked scene signatures for
   32 existing vector themes. The other 24 retain their photo hero assets.
   Static SVG only: no fonts, filters, animations, analytics or external calls. */
(function(){
'use strict';
const base=window.BACK2U_REFERENCE_ART;
if(typeof base!=='function')return;
const specs={
 n01:['helix',1420,455,1.05,18],
 n02:['anvil',1510,470,1,-7],
 n03:['sunflare',1450,475,1,12],
 n05:['wavecrest',1435,520,1.15,-9],
 n06:['diamond',1450,440,1.09,11],
 n10:['crown',1505,470,1.04,15],
 n11:['veil',1490,385,1.1,-5],
 n12:['frost',1450,510,1.03,7],
 n13:['rose',1515,480,1.07,21],
 n16:['aurora',1415,440,1.12,-12],
 n17:['prism',1480,435,1.04,19],
 n18:['coral',1485,475,1.08,-7],
 n19:['pulse',1440,450,1.03,15],
 n20:['data',1490,510,1.03,0],
 n21:['quasar',1500,470,1.07,12],
 n22:['shell',1460,470,1.16,-7],
 n25:['monolith',1450,485,1.01,12],
 n27:['turbine',1490,475,1.02,-9],
 n28:['circuit',1470,480,1.07,7],
 n29:['snow',1490,440,1.1,-5],
 n30:['holoprism',1470,500,1.06,11],
 fa00:['bubble',1510,390,1.15,0],
 fa01:['surf',1440,490,1.18,-12],
 fa02:['sunflowers',1500,480,1.11,13],
 fa03:['meadow',1515,495,1.18,-6],
 fa04:['rainbow',1435,440,1.19,5],
 fa05:['satellite',1485,465,1.13,-19],
 fa06:['citrus',1500,460,1.1,21],
 fa07:['pearl',1510,460,1.13,-6],
 fa08:['garden',1450,505,1.13,7],
 fa09:['lagoon',1500,475,1.17,-4],
 fa10:['sunrise',1455,485,1.17,7],
};
const art={
helix:'<path d="M-270 170Q-120-200 140-170T260 105Q105 235-85 125T-220-80" stroke="url(#beam)" stroke-width="20" fill="none" opacity=".64"/><ellipse rx="220" ry="115" stroke="url(#beam)" stroke-width="6" fill="none" opacity=".55" transform="rotate(-24)"/>',
anvil:'<path d="M-210 240L-160-210 40-300 230-70 200 210-15 300Z" fill="url(#prism)" stroke="#fff" stroke-width="4" opacity=".44"/><path d="M-160-210L30 40 230-70M30 40L-15 300" fill="none" stroke="url(#beam)" stroke-width="9"/>',
sunflare:'<circle r="160" fill="url(#sun)" opacity=".48"/><g stroke="url(#beam)" stroke-width="10" opacity=".75">'+Array.from({length:12},(_,i)=>'<path d="M0-205V-340" transform="rotate('+(i*30)+')"/>').join('')+'</g>',
wavecrest:'<path d="M-370 120Q-190-330 80-105T350-230" stroke="url(#beam)" stroke-width="29" fill="none" opacity=".65"/><path d="M-370 190Q-140-240 130-70T360-140" stroke="#fff" stroke-width="5" fill="none" opacity=".53"/>',
diamond:'<path d="M0-305L210-85 145 210 0 315-155 190-210-85Z" fill="url(#prism)" stroke="#fff" stroke-opacity=".66" stroke-width="5"/><path d="M0-305V315M-210-85L0 65 210-85" stroke="url(#beam)" stroke-width="9" fill="none"/>',
crown:'<path d="M-275 150L-190-240-60 10 0-320 105-20 210-230 275 150Z" fill="url(#prism)" stroke="url(#beam)" stroke-width="8"/><path d="M-275 150Q0 275 275 150" stroke="#fff" stroke-opacity=".66" fill="none" stroke-width="5"/>',
veil:'<g fill="none" stroke="url(#beam)" stroke-linecap="round" opacity=".66">'+Array.from({length:8},(_,i)=>'<path d="M'+(-250+i*65)+'-350Q'+(-430+i*55)+'-30 '+(-180+i*60)+' 365" stroke-width="'+(9+i%3*5)+'"/>').join('')+'</g>',
frost:'<path d="M-270 310L-155-130-35-330 50 20 155-240 300 310Z" fill="url(#prism)" stroke="#fff" stroke-width="6" stroke-opacity=".68"/><path d="M-155-130L50 20 300 310M-35-330L-20 280" stroke="url(#beam)" stroke-width="8"/>',
rose:'<g fill="url(#bubble)" stroke="url(#beam)" stroke-width="4" opacity=".83">'+Array.from({length:9},(_,i)=>'<ellipse cx="0" cy="-120" rx="93" ry="150" transform="rotate('+(i*40)+')"/>').join('')+'</g>',
aurora:'<path d="M-315 240Q-245-265-60-205T300-325" stroke="url(#beam)" fill="none" stroke-width="65" opacity=".37"/><path d="M-320 270Q-245-260-60-210T300-320" stroke="#fff" fill="none" stroke-width="5" opacity=".70"/>',
prism:'<path d="M-260-240L210-300 300 225-240 290Z" fill="url(#prism)" stroke="#fff" stroke-opacity=".48" stroke-width="4"/><path d="M-260-240L50 85 210-300M50 85L300 225M50 85L-240 290" stroke="url(#beam)" stroke-width="13" fill="none"/>',
coral:'<g fill="none" stroke="url(#beam)" stroke-width="22" stroke-linecap="round"><path d="M0 290V-290M0-140Q-160-190-240-270M0 30Q190-60 260-205M0 125Q-155 90-310-25M0-30Q115-130 125-300"/></g>',
pulse:'<g fill="none" stroke="url(#beam)"><ellipse rx="240" ry="220" stroke-width="20" opacity=".72"/><ellipse rx="158" ry="155" stroke-width="7"/><circle r="78" stroke-width="29" opacity=".48"/></g><path d="M-325 0h150l65-95 100 205 75-125 70 15h190" stroke="#fff" stroke-width="8" fill="none" opacity=".73"/>',
data:'<g fill="none" stroke="url(#beam)" stroke-width="5" opacity=".70"><path d="M-320 240H-90L90 70H320M-320-80H-80L50-260H320M-220-290V290M180-300V300"/></g><g fill="url(#planet)">'+Array.from({length:7},(_,i)=>'<rect x="'+(-290+i*95)+'" y="'+(-170+(i*79)%310)+'" width="27" height="49" rx="5"/>').join('')+'</g>',
quasar:'<g fill="none" stroke="url(#beam)"><ellipse rx="260" ry="91" stroke-width="17" transform="rotate(27)"/><ellipse rx="245" ry="110" stroke-width="6" transform="rotate(-49)"/><circle r="95" stroke-width="16"/></g><circle r="62" fill="url(#sun)" opacity=".57"/>',
shell:'<g fill="url(#prism)" stroke="#fff" stroke-width="4" stroke-opacity=".64">'+Array.from({length:9},(_,i)=>'<path d="M0 250Q'+(i*58-260)+' 40 '+(i*41-170)+'-245Q0-340 0 250Z" opacity=".44"/>').join('')+'</g>',
monolith:'<path d="M-135 305L-210-175 0-330 205-170 125 310Z" fill="url(#window)" stroke="#fff" stroke-opacity=".50" stroke-width="7"/><path d="M-210-175L110 295M0-330L10 265" fill="none" stroke="url(#beam)" stroke-width="10"/>',
turbine:'<circle r="240" fill="none" stroke="url(#beam)" stroke-width="15" opacity=".70"/><g fill="url(#prism)" stroke="#fff" stroke-opacity=".45">'+Array.from({length:8},(_,i)=>'<path d="M-25-65Q70-240 185-155L45-15Z" transform="rotate('+(i*45)+')"/>').join('')+'</g>',
circuit:'<g fill="none" stroke="url(#beam)" stroke-width="9" opacity=".68"><path d="M-340 230h190l105-110h300l130-135M-300-190h175l130 115h205l125-120M0-300v190M190 220v-155"/></g><g fill="url(#sun)"><circle cx="-45" cy="120" r="26"/><circle cx="210" cy="-75" r="25"/></g>',
snow:'<g stroke="url(#beam)" fill="none" stroke-width="15" opacity=".83">'+Array.from({length:6},(_,i)=>'<g transform="rotate('+(i*60)+')"><path d="M0-310V310"/><path d="M0-190L-67-245M0-190L67-245M0 190L-67 245M0 190L67 245"/></g>').join('')+'</g>',
holoprism:'<g fill="url(#prism)" stroke="#fff" stroke-opacity=".54" stroke-width="5"><path d="M-225-170L70-310 280-60 55 280-265 135Z"/><path d="M-185-95L65-230 205-65 38 205-190 100Z"/></g><path d="M-225-170L55 280M70-310L-265 135" stroke="url(#beam)" stroke-width="6"/>',
bubble:'<g fill="url(#bubble)" stroke="#fff" stroke-opacity=".65" stroke-width="5"><circle r="180"/><circle cx="-260" cy="105" r="70"/><circle cx="220" cy="-180" r="88"/></g><path d="M-115-130Q0-220 95-105" fill="none" stroke="#fff" stroke-width="8" opacity=".7"/>',
surf:'<g fill="none" stroke="url(#beam)" stroke-linecap="round"><path d="M-345 105Q-200-275 60-110T345-170" stroke-width="42" opacity=".60"/><path d="M-325 190Q-165-190 85-20T350-110" stroke-width="8" opacity=".8"/></g>',
sunflowers:'<circle r="110" fill="url(#sun)" opacity=".84"/><g fill="url(#bubble)" stroke="#fff" stroke-opacity=".55" stroke-width="3">'+Array.from({length:11},(_,i)=>'<ellipse cx="0" cy="-160" rx="53" ry="120" transform="rotate('+(i*360/11)+')"/>').join('')+'</g>',
meadow:'<path d="M-340 230Q-130-145 55 175T360 75" fill="none" stroke="url(#beam)" stroke-width="36" opacity=".62"/><g fill="none" stroke="url(#beam)" stroke-width="8"><path d="M-280 315Q-75-145 140 255M-190 320Q20-190 245 260"/></g>',
rainbow:'<g fill="none" stroke="url(#beam)" stroke-linecap="round">'+Array.from({length:7},(_,i)=>'<path d="M'+(-330+i*18)+' 300Q0 '+(-450+i*28)+' '+(330-i*15)+' 300" stroke-width="'+(8+i)+'" opacity="'+(.85-i*.07)+'"/>').join('')+'</g>',
satellite:'<circle r="116" fill="url(#bubble)" stroke="#fff" stroke-opacity=".75" stroke-width="4"/><ellipse rx="285" ry="110" fill="none" stroke="url(#beam)" stroke-width="11" transform="rotate(-33)"/><circle cx="250" cy="-145" r="32" fill="url(#sun)"/>',
citrus:'<circle r="210" fill="url(#sun)" opacity=".44"/><g stroke="#fff" stroke-opacity=".67" stroke-width="5" fill="none">'+Array.from({length:12},(_,i)=>'<path d="M0 0L0-210" transform="rotate('+(i*30)+')"/>').join('')+'</g><circle r="90" fill="url(#bubble)" opacity=".52"/>',
pearl:'<circle r="190" fill="url(#bubble)" stroke="#fff" stroke-opacity=".75" stroke-width="10"/><ellipse rx="270" ry="90" fill="none" stroke="url(#beam)" stroke-width="8" transform="rotate(35)" opacity=".52"/><circle cx="-58" cy="-75" r="52" fill="#fff" opacity=".26"/>',
garden:'<g fill="url(#bubble)" stroke="url(#beam)" stroke-width="4">'+Array.from({length:7},(_,i)=>'<path d="M0 0Q'+(i*50-155)+'-260 '+(i*65-195)+'-340Q'+(i*40-120)+'-55 0 0Z" transform="rotate('+(i*51)+')"/>').join('')+'</g>',
lagoon:'<path d="M-370 180Q-190-80 0 160T370 70" fill="none" stroke="url(#beam)" stroke-width="37" opacity=".73"/><g fill="url(#bubble)" stroke="#fff" stroke-opacity=".65"><circle cx="80" cy="-100" r="125"/><circle cx="-200" cy="125" r="60"/></g>',
sunrise:'<circle cy="70" r="195" fill="url(#sun)" opacity=".66"/><path d="M-365 95H365" stroke="#fff" stroke-opacity=".74" stroke-width="8"/><g stroke="url(#beam)" stroke-width="11">'+Array.from({length:9},(_,i)=>'<path d="M0-220V-335" transform="rotate('+(i*22-90)+')"/>').join('')+'</g>'
};
const cache=new Map();
const clean=s=>typeof s==='string'&&/^#[0-9a-f]{6}$/i.test(s)?s:'#90dfff';
window.BACK2U_REFERENCE_ART=function(p){
 const previous=base(p),spec=specs[p&&p.id];
 if(!spec||!previous||!previous.url||!previous.url.startsWith('data:image/svg+xml,'))return previous;
 const key=[p.id,p.accent,p.secondary,p.bg,p.bg2].join('|');
 if(cache.has(key))return cache.get(key);
 const [kind,x,y,scale,rotation]=spec;
 const svg=decodeURIComponent(previous.url.slice('data:image/svg+xml,'.length));
 const light=clean(p.accent),secondary=clean(p.secondary);
 const signature='<g data-back2u-signature="'+p.id+'" transform="translate('+x+' '+y+') rotate('+rotation+') scale('+scale+')" opacity=".71">'+
  '<ellipse cx="0" cy="35" rx="340" ry="270" fill="none" stroke="'+light+'" stroke-opacity=".25" stroke-width="2"/>'+
  '<circle cx="0" cy="0" r="272" fill="none" stroke="'+secondary+'" stroke-opacity=".24" stroke-width="3" stroke-dasharray="4 30"/>'+
  art[kind]+'</g>';
 if(!svg.endsWith('</svg>'))return previous;
 const result={...previous,url:'data:image/svg+xml,'+encodeURIComponent(svg.slice(0,-6)+signature+'</svg>')};
 if(cache.size>=64)cache.delete(cache.keys().next().value);
 cache.set(key,result);
 return result;
};
window.BACK2U_THEME_SIGNATURE_IDS=Object.freeze(Object.keys(specs));
})();
