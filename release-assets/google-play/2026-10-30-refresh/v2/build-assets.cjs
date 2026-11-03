const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const dir=__dirname, root=path.resolve(dir,'../../../..');
const C={ink:'#222125',cream:'#fff9ed',purple:'#7531a5',lavender:'#efe4ff',yellow:'#ffce41',red:'#e54549',blue:'#4b43ed'};
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const svg=(w,h,s)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${s}</svg>`);
const tx=(x,y,str,size=40,color=C.ink,weight=600)=>`<text x="${x}" y="${y}" font-family="Avenir Next,Arial,sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(str)}</text>`;
const lines=(x,y,ss,size=94,col=C.ink,step=106)=>ss.map((s,i)=>tx(x,y+i*step,s,size,col,800)).join('');
const rect=(x,y,w,h,fill,r=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="${r}"/>`;
const circle=(x,y,r,fill)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const line=(d,col=C.ink,width=12)=>`<path d="${d}" fill="none" stroke="${col}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
function pin(x,y,s=1,col=C.red){return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -100C-65 -100 -95 -55 -95 -5C-95 60 0 140 0 140S95 60 95 -5C95 -55 65 -100 0 -100Z" fill="${col}" stroke="${C.ink}" stroke-width="8"/>${circle(0,-5,34,C.cream)}</g>`}
function camera(x,y,s=1){return `<g transform="translate(${x} ${y}) scale(${s})">${rect(-160,-100,320,225,C.yellow,36)}${rect(-88,-140,126,60,C.yellow,12)}${circle(0,10,70,C.cream)}${circle(0,10,44,C.blue)}${circle(104,-52,12,C.red)}</g>`}
function bag(x,y,s=1,col=C.purple){return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-45 -135L45 -135L25 -90C98 -30 135 90 105 130C65 175 -65 175 -105 130C-135 90 -98 -30 -25 -90Z" fill="${col}" stroke="${C.ink}" stroke-width="8"/>${line('M-35 -90L35 -90',C.yellow,15)}${line('M-15 0L-35 95','#ffffff',10)}</g>`}
function coin(x,y,s=1,label='+'){return `<g transform="translate(${x} ${y}) scale(${s})">${circle(0,0,96,C.yellow)}<circle r="77" fill="none" stroke="${C.ink}" stroke-width="7"/>${tx(-28,31,label,84,C.ink,800)}</g>`}
function star(x,y,s=1,col=C.purple){return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -60L14 -16L60 0L14 16L0 60L-14 16L-60 0L-14 -16Z" fill="${col}"/></g>`}
function base(bg,kicker,heads,sub,light=false){let ink=light?'#fff9ed':C.ink;return rect(0,0,1080,1920,bg)+lines(80,210,heads,92,ink,108)}
const items=[];
async function output(n,kicker,heads,sub,bg,visual,extra=[],light=false){const name=`${String(n).padStart(2,'0')}-${kicker.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`;const buf=await sharp(svg(1080,1920,base(bg,kicker,heads,sub,light)+visual)).composite(extra).flatten({background:bg}).removeAlpha().png().toBuffer();fs.writeFileSync(path.join(dir,name),buf);items.push({id:`gallery-${n}`,file:name,title:heads.join(' '),type:n===3?'current Android map capture + graphic':'editorial feature graphic',width:1080,height:1920,status:'design draft; final gallery needs additional current native UI captures'});return buf}
(async()=>{
const art=path.join(dir,'source/cleanup-illustration.png');
const hero=await sharp(art).resize(1080,900,{fit:'cover',position:'right'}).png().toBuffer();
await output(1,'Your neighborhood',['Make money','cleaning up.'],[],C.cream,'',[{input:hero,top:600,left:0}]);
await output(2,'Report litter',['See litter?','Report it.'],[],C.yellow,rect(80,610,920,800,C.cream,56)+camera(390,900,1.2)+pin(775,1080,1.0)+line('M240 1185C350 1280 690 1130 825 1240',C.purple,9)+star(850,610,.6));
const screen=await sharp(path.join(root,'artifacts/mobile-2.0.1/verification/final-release-2026-10-29/production-maps-identity.png')).resize(514,1114).png().toBuffer();
await output(3,'Explore the map',['Find litter','near you.'],[],C.lavender,rect(263,510,554,1154,C.ink,55)+circle(865,1000,80,C.yellow)+star(160,820,.6,C.purple),[{input:screen,top:530,left:283}]);
await output(4,'Reporter rewards',['Make money','reporting litter.'],[],C.purple,circle(360,960,235,'#8c45b8')+camera(350,940,1.05)+coin(760,1190,1.3,'$')+line('M510 1030Q600 1190 630 1190','#ffce41',12),[],true);
await output(5,'Fund a cleanup',['Donate to','a cleanup.'],[],C.cream,circle(330,990,210,C.lavender)+coin(330,990,1.15,'$')+line('M530 990C670 805 695 1125 760 990',C.purple,12)+bag(835,1010,1.0));
const cleaner=await sharp(art).extract({left:480,top:160,width:660,height:830}).resize(760,956).png().toBuffer();
await output(6,'Cleanup rewards',['Pick up litter.','Get paid.'],[],C.yellow,'',[{input:cleaner,top:540,left:160}]);
await output(7,'Share your report',['Share a','cleanup.'],[],C.lavender,line('M540 1010L230 750M540 1010L850 750M540 1010L240 1310M540 1010L850 1300',C.purple,12)+circle(540,1010,170,C.cream)+pin(540,990,.85)+circle(230,750,90,C.yellow)+circle(850,750,90,C.yellow)+circle(240,1310,90,C.yellow)+circle(850,1300,90,C.yellow)+[ [230,750],[850,750],[240,1310],[850,1300] ].map(([x,y])=>circle(x,y-22,24,C.ink)+`<path d="M${x-42} ${y+43}Q${x} ${y-5} ${x+42} ${y+43}" fill="${C.ink}"/>`).join('')+star(890,1030,.5,C.red));
await output(8,'Two ways to earn',['Help clean up','your community.'],[],C.cream,'',[{input:hero,top:600,left:0}]);
const featureArt=await sharp(art).resize(750,500,{fit:'cover',position:'right'}).png().toBuffer();
let f=await sharp(svg(1024,500,rect(0,0,1024,500,C.cream))).composite([{input:featureArt,top:0,left:274}]).png().toBuffer();
const featureOverlay=svg(1024,500,`<defs><linearGradient id="fade"><stop offset="0%" stop-color="${C.cream}"/><stop offset="84%" stop-color="${C.cream}"/><stop offset="100%" stop-color="${C.cream}" stop-opacity="0"/></linearGradient></defs>`+rect(0,0,525,500,'url(#fade)')+lines(62,200,['Make money.','Clean up.'],54,C.ink,68));
await sharp(f).composite([{input:featureOverlay}]).flatten({background:C.cream}).removeAlpha().png().toFile(path.join(dir,'feature-graphic-illustrated.png'));
const logo=await sharp(path.join(root,'apps/mobile/assets/LB_Logo_PNG.png')).resize(160).png().toBuffer();
let f2=await sharp(svg(1024,500,rect(0,0,1024,500,C.yellow)+lines(60,260,['Donate to','a cleanup.'],58,C.ink,72))).composite([{input:await sharp(art).resize(480,500,{fit:'cover',position:'right'}).png().toBuffer(),top:0,left:544},{input:logo,top:40,left:62}]).flatten({background:C.yellow}).removeAlpha().png().toFile(path.join(dir,'feature-graphic-yellow.png'));
const tiles=await Promise.all(items.map(async(o,i)=>({input:await sharp(path.join(dir,o.file)).resize(270,480).png().toBuffer(),left:(i%4)*294+24,top:Math.floor(i/4)*520+54})));
await sharp({create:{width:1200,height:1100,channels:3,background:'#e9e5de'}}).composite(tiles).png().toFile(path.join(dir,'gallery-review.png'));
const manifest={status:'Simplified second draft — not uploaded',created:'2026-10-30',boardId:'959886fa-d600-49fc-9797-89a0ff32bc4d',gallery:items,featureGraphics:['feature-graphic-illustrated.png','feature-graphic-yellow.png'],revision:'Removed eyebrows, subheadings, percentages, eligibility text, process labels, numbering and footer labels. One plain headline per image.',provenance:{illustration:'Existing built-in ImageGen illustration from first draft; no new generation.',map:'Existing Oct 29 native Android verification capture, production identity build 20; not claimed as fresh build 21.',logo:'Exact original alpha logo.'},remaining:['Additional clean current native Android captures for final gallery.','Current app footage for final preview video.'],notUploaded:true};
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2));
fs.writeFileSync(path.join(dir,'index.html'),`<!doctype html><html><head><meta charset="utf-8"><title>Litterbugs</title><style>body{font-family:system-ui;margin:40px;background:#f1ede6;color:#222}.features{display:grid;grid-template-columns:1fr 1fr;gap:24px}.gallery{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-top:32px}img{width:100%;display:block}video{width:100%;max-width:1100px;margin-top:36px}a{color:inherit}</style></head><body><h1>Litterbugs</h1><div class="features">${['feature-graphic-illustrated.png','feature-graphic-yellow.png'].map(f=>`<a href="${f}"><img src="${f}"></a>`).join('')}</div><div class="gallery">${items.map(o=>`<a href="${o.file}"><img alt="${esc(o.title)}" src="${o.file}"></a>`).join('')}</div><video controls preload="metadata" src="video-storyboard-draft.mp4"></video></body></html>`);
console.log(JSON.stringify({gallery:items.length,path:dir}));
})();
