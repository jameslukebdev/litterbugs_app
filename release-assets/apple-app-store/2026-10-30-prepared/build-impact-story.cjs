const path=require('path');
const sharp=require('sharp');
sharp.concurrency(1);sharp.cache(false);
(async()=>{
 const dir=path.join(__dirname,'source/marketing');
 const width=864,height=1878,pad=64,pw=736,ph=600;
 const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="864" height="1878" fill="white"/><g font-family="Avenir Next,Arial,sans-serif"><text x="64" y="105" font-size="29" font-weight="700" letter-spacing="2" fill="#287537">COMPLETED CLEANUP</text><text x="64" y="195" font-size="64" font-weight="800" fill="#222125">Greenwood Lot</text><text x="64" y="254" font-size="38" fill="#626d76">Boone, North Carolina</text><text x="64" y="351" font-size="49" font-weight="700" fill="#7531a5">Before</text><text x="64" y="1101" font-size="49" font-weight="700" fill="#287537">After</text></g></svg>`);
 const mask=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}"><rect width="${pw}" height="${ph}" rx="24" fill="white"/></svg>`);
 const before=await sharp(path.join(dir,'greenwood-before-original.jpg')).extract({left:0,top:300,width:810,height:660}).resize(pw,ph).ensureAlpha().composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
 const after=await sharp(path.join(dir,'greenwood-after-original.jpg')).extract({left:0,top:350,width:810,height:660}).resize(pw,ph).ensureAlpha().composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
 await sharp(svg).composite([{input:before,left:pad,top:380},{input:after,left:pad,top:1130}]).removeAlpha().png().toFile(path.join(dir,'before-after-story.png'));
 console.log('Impact story: 64px side margins; two large photos; no source enlargement');
})();
