/* V8.5 SCENECRAFT. Strong foreground architecture for 32 existing vector worlds.
   All assets generated as local SVG, no image fetch, CSS filter, GIF or animation.
   Photo worlds keep their original photographic atlases. */
(function(){
'use strict';
const before=window.BACK2U_REFERENCE_ART;
if(typeof before!=='function')return;
const map={
n01:['orbit','city',5],n02:['monolith','metal',9],n03:['solar','volcano',6],
n05:['wave','ocean',5],n06:['crystal','crystal',8],n10:['vault','cathedral',9],
n11:['curtain','aurora',8],n12:['ice','crystal',4],n13:['flower','garden',6],
n16:['curtain','aurora',5],n17:['crystal','cathedral',5],n18:['wave','ocean',9],
n19:['reactor','reactor',7],n20:['circuit','city',8],n21:['orbit','aurora',6],
n22:['pearl','sky',4],n25:['monolith','cathedral',7],n27:['engine','metal',9],
n28:['circuit','city',5],n29:['ice','crystal',7],n30:['prism','cosmos',6],
fa00:['pearl','aero',8],fa01:['wave','ocean',8],fa02:['flower','garden',4],
fa03:['meadow','garden',6],fa04:['rainbow','aero',7],fa05:['orbit','aero',4],
fa06:['solar','garden',9],fa07:['pearl','aero',5],fa08:['flower','garden',9],
fa09:['crystal','ocean',4],fa10:['solar','aero',8]
};
const photos=new Set(['n04','n15','n23','n24',...Array.from({length:20},(_,i)=>'ex'+String(i+1).padStart(2,'0'))]);
const seq=(n,fn)=>Array.from({length:n},(_,i)=>fn(i)).join('');
const shape={
orbit:()=>'<g fill="none" stroke="url(#v85beam)"><ellipse rx="360" ry="150" stroke-width="35" transform="rotate(-25)"/><ellipse rx="280" ry="320" stroke-width="10" transform="rotate(52)"/><circle r="116" fill="url(#v85orb)" stroke-width="13"/></g>',
monolith:()=>'<path d="M-250-265L0-390 295-225 195 390-180 370Z" fill="url(#v85metal)" stroke="#fff" stroke-opacity=".62" stroke-width="11"/><path d="M-250-265L105 40 295-225M105 40L195 390M105 40L-180 370" stroke="url(#v85beam)" stroke-width="14" fill="none"/>',
solar:()=>'<circle r="275" fill="url(#v85orb)"/>'+seq(16,i=>'<path d="M0-295V-420" stroke="url(#v85beam)" stroke-width="'+(i%2?7:17)+'" transform="rotate('+(i*22.5)+')"/>'),
wave:()=>'<path d="M-450 180Q-200-380 80-110T440-220" stroke="url(#v85beam)" stroke-width="95" opacity=".75" fill="none"/><path d="M-440 150Q-200-380 80-110T440-220" stroke="#fff" stroke-opacity=".62" stroke-width="13" fill="none"/>',
crystal:()=>'<path d="M0-390L280-130 235 270 0 395-310 220-330-120Z" fill="url(#v85metal)" stroke="#fff" stroke-opacity=".8" stroke-width="8"/><path d="M0-390V395M-330-120L0 55 280-130M0 55L235 270M0 55L-310 220" stroke="url(#v85beam)" stroke-width="13" fill="none"/>',
vault:()=>'<path d="M-370 370V-140Q-330-390 0-390T370-140V370Z" fill="url(#v85metal)" stroke="#fff" stroke-opacity=".56" stroke-width="10"/><path d="M-265 365V-100Q-200-320 0-325T260-100V365" fill="none" stroke="url(#v85beam)" stroke-width="34"/>',
curtain:()=>'<g fill="none" stroke="url(#v85beam)" stroke-linecap="round">'+seq(8,i=>'<path d="M'+(-305+i*80)+'-410Q'+(-460+i*53)+'-30 '+(-190+i*66)+' 410" stroke-width="'+(9+i%3*7)+'" opacity=".77"/>')+'</g>',
ice:()=>'<path d="M-350 390L-220-200-75-410 55 25 205-295 360 390Z" fill="url(#v85metal)" stroke="#fff" stroke-opacity=".84" stroke-width="8"/><path d="M-220-200L55 25 360 390M-75-410L-20 340" stroke="url(#v85beam)" stroke-width="16" fill="none"/>',
flower:()=>'<g fill="url(#v85glass)" stroke="#fff" stroke-opacity=".64" stroke-width="6">'+seq(11,i=>'<ellipse cy="-178" rx="80" ry="196" transform="rotate('+(i*360/11)+')"/>')+'</g><circle r="104" fill="url(#v85orb)"/>',
reactor:()=>'<g fill="none" stroke="url(#v85beam)">'+seq(5,i=>'<circle r="'+(100+i*65)+'" stroke-width="'+(i%2?9:21)+'" opacity="'+(.86-i*.12)+'"/>')+'</g><circle r="97" fill="url(#v85orb)"/>',
circuit:()=>'<g fill="none" stroke="url(#v85beam)" stroke-width="15"><path d="M-480 320h250l170-190h370l180-190M-480-250h220l165 160h350l210-180M5-420V-160M260 390V140"/></g><circle cx="-55" cy="130" r="45" fill="url(#v85orb)"/>',
pearl:()=>'<circle r="290" fill="url(#v85glass)" stroke="#fff" stroke-opacity=".85" stroke-width="12"/><ellipse rx="410" ry="139" stroke="url(#v85beam)" stroke-width="15" fill="none" transform="rotate(-27)"/><ellipse cx="-85" cy="-125" rx="88" ry="41" fill="#fff" opacity=".52"/>',
engine:()=>'<circle r="350" fill="none" stroke="url(#v85beam)" stroke-width="24"/><g fill="url(#v85metal)" stroke="#fff" stroke-opacity=".56">'+seq(9,i=>'<path d="M-35-80Q115-375 275-210L40-20Z" transform="rotate('+(i*40)+')"/>')+'</g>',
prism:()=>'<path d="M-340-310L140-410 370-75 55 380-390 185Z" fill="url(#v85glass)" stroke="#fff" stroke-opacity=".68" stroke-width="10"/><path d="M-340-310L55 380M140-410L-390 185" stroke="url(#v85beam)" stroke-width="15"/>',
meadow:()=>'<path d="M-490 330Q-190-280 95 185T475 20" fill="none" stroke="url(#v85beam)" stroke-width="70"/><path d="M-330 405Q-65-225 165 300" fill="none" stroke="#fff" stroke-opacity=".60" stroke-width="15"/>',
rainbow:()=>'<g fill="none" stroke="url(#v85beam)" stroke-linecap="round">'+seq(8,i=>'<path d="M'+(-450+i*26)+' 400Q0 '+(-560+i*35)+' '+(445-i*18)+' 400" stroke-width="'+(14+i*2)+'" opacity="'+(.9-i*.07)+'"/>')+'</g>'
};
const environs={
city:(a)=>'<g fill="url(#v85tower)" stroke="#fff" stroke-opacity=".13">'+seq(17,i=>{let h=200+(i*91)%430;return '<rect x="'+(220+i*110)+'" y="'+(1080-h)+'" width="'+(62+i%4*17)+'" height="'+h+'"/>'})+'</g>',
metal:()=>'<g fill="url(#v85tower)" stroke="#fff" stroke-opacity=".22">'+seq(10,i=>'<path d="M'+(i*210-70)+' 1080L'+(i*210+85)+' 0L'+(i*210+155)+' 0L'+(i*210+25)+' 1080Z"/>')+'</g>',
volcano:()=>'<path d="M0 1080L660 740 850 850 1140 230 1700 900 1920 770V1080Z" fill="url(#v85tower)" stroke="url(#v85beam)" stroke-opacity=".47" stroke-width="9"/>',
ocean:()=>'<path d="M0 785Q330 680 680 790T1380 765T1920 760V1080H0Z" fill="url(#v85water)" opacity=".72"/>'+seq(6,i=>'<path d="M0 '+(750+i*54)+'Q500 '+(700+i*52)+' 980 '+(750+i*54)+'T1920 '+(750+i*54)+'" stroke="#fff" stroke-opacity=".15" stroke-width="6" fill="none"/>'),
crystal:()=>'<g fill="url(#v85glass)" stroke="#fff" stroke-opacity=".25">'+seq(10,i=>'<path d="M'+(i*230-180)+' 1080L'+(i*230+50)+' '+(360+i%5*58)+'L'+(i*230+215)+' 1080Z"/>')+'</g>',
cathedral:()=>'<g fill="none" stroke="url(#v85beam)" stroke-opacity=".28" stroke-width="24">'+seq(5,i=>'<path d="M'+(i*430-140)+' 1080V480Q'+(i*430+65)+' 50 '+(i*430+270)+' 480V1080"/>')+'</g>',
aurora:()=>'<g stroke="url(#v85beam)" stroke-opacity=".14" stroke-width="66" fill="none">'+seq(7,i=>'<path d="M'+(i*300-350)+' 1100Q'+(i*230+90)+' 430 '+(i*220+250)+' -150"/>')+'</g>',
garden:()=>'<path d="M0 895Q380 620 670 790T1340 680T1920 760V1080H0Z" fill="url(#v85water)" opacity=".65"/><path d="M0 1030Q420 760 760 940T1400 820T1920 730V1080H0Z" fill="url(#v85tower)" opacity=".6"/>',
sky:()=>'<path d="M0 900Q620 860 1100 890T1920 820V1080H0Z" fill="url(#v85water)" opacity=".28"/>',
reactor:()=>'<g fill="none" stroke="url(#v85beam)" stroke-opacity=".21">'+seq(7,i=>'<ellipse cx="1390" cy="500" rx="'+(340+i*88)+'" ry="'+(170+i*43)+'" stroke-width="9"/>')+'</g>',
cosmos:()=>'<g fill="none" stroke="url(#v85beam)" stroke-opacity=".23">'+seq(8,i=>'<ellipse cx="1370" cy="490" rx="'+(250+i*66)+'" ry="'+(110+i*37)+'" transform="rotate('+(i*7-18)+' 1370 490)" stroke-width="9"/>')+'</g>',
aero:()=>'<g fill="url(#v85glass)" stroke="#fff" stroke-opacity=".39"><circle cx="1610" cy="195" r="180"/><circle cx="580" cy="290" r="84"/><circle cx="990" cy="155" r="48"/></g><path d="M0 960Q500 735 860 905T1920 720V1080H0Z" fill="url(#v85water)" opacity=".45"/>'
};
const valid=(s,def)=>typeof s==='string'&&/^#[0-9a-f]{6}$/i.test(s)?s:def;
const cache=new Map();
function scene(p,base){
 const [type,environment,seed]=map[p.id],a=valid(p.accent,'#70ceff'),b=valid(p.secondary,'#cf8cff');
 const svg=decodeURIComponent(base.url.slice('data:image/svg+xml,'.length));
 if(!svg.includes('</svg>'))return base;
 const x=environment==='ocean'?1270:environment==='garden'?1370:1330,y=500;
 const newLayer='<defs>'+
 '<linearGradient id="v85beam" x1="0" x2="1" y1="0" y2=".75"><stop stop-color="'+a+'" stop-opacity=".12"/><stop offset=".27" stop-color="'+a+'"/><stop offset=".53" stop-color="#fff"/><stop offset=".76" stop-color="'+b+'"/><stop offset="1" stop-color="'+a+'" stop-opacity=".34"/></linearGradient>'+
 '<linearGradient id="v85glass" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#fff" stop-opacity=".65"/><stop offset=".28" stop-color="'+a+'" stop-opacity=".42"/><stop offset=".7" stop-color="'+b+'" stop-opacity=".46"/><stop offset="1" stop-color="#fff" stop-opacity=".14"/></linearGradient>'+
 '<linearGradient id="v85metal" x1="0" x2="1" y1="0" y2=".7"><stop stop-color="'+b+'"/><stop offset=".3" stop-color="#fff" stop-opacity=".8"/><stop offset=".52" stop-color="'+a+'"/><stop offset="1" stop-color="'+b+'"/></linearGradient>'+
 '<linearGradient id="v85tower" x1="0" x2=".7" y1="0" y2="1"><stop stop-color="'+b+'" stop-opacity=".63"/><stop offset=".6" stop-color="#060e23" stop-opacity=".66"/><stop offset="1" stop-color="'+a+'" stop-opacity=".2"/></linearGradient>'+
 '<linearGradient id="v85water" x1="0" y1="0" x2="0" y2="1"><stop stop-color="'+a+'" stop-opacity=".65"/><stop offset="1" stop-color="'+b+'" stop-opacity=".12"/></linearGradient>'+
 '<radialGradient id="v85orb"><stop stop-color="#fff" stop-opacity=".88"/><stop offset=".18" stop-color="'+a+'" stop-opacity=".74"/><stop offset=".64" stop-color="'+b+'" stop-opacity=".42"/><stop offset="1" stop-color="'+a+'" stop-opacity=".04"/></radialGradient></defs>'+
 '<g data-back2u-scenecraft="'+p.id+'">'+(environs[environment]||environs.sky)(a)+
 '<ellipse cx="'+x+'" cy="'+y+'" rx="550" ry="450" fill="url(#v85orb)" opacity=".17"/>'+
 '<g transform="translate('+x+' '+y+') rotate('+(seed*3-19)+')">'+shape[type]()+'</g>'+
 '<path d="M0 1050Q420 960 900 1050T1920 970" stroke="url(#v85beam)" stroke-width="9" fill="none" opacity=".7"/></g>';
 return {...base,url:'data:image/svg+xml,'+encodeURIComponent(svg.slice(0,-6)+newLayer+'</svg>'),type:'scenecraft-'+type};
}
window.BACK2U_REFERENCE_ART=function(p){
 if(!p||photos.has(p.id)||!map[p.id])return before(p);
 const k=[p.id,p.bg,p.bg2,p.accent,p.secondary].join('|');
 if(cache.has(k))return cache.get(k);
 const art=before(p);if(!art?.url?.startsWith('data:image/svg+xml,'))return art;
 const result=scene(p,art);
 if(cache.size>=18)cache.delete(cache.keys().next().value);
 cache.set(k,result);return result;
};
window.BACK2U_SCENECRAFT_IDS=Object.freeze(Object.keys(map));
})();