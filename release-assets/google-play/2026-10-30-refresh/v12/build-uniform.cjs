const fs=require('fs'),path=require('path'),sharp=require('sharp');
sharp.concurrency(1);sharp.cache(false);
const d=__dirname;
const frame={left:200,top:440,width:680,height:1380,border:16,radius:56};
const screen={left:216,top:456,width:648,height:1348};
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const heads=[['Make money','reporting litter.'],['Make money','cleaning up.'],['Donate to','a cleanup.'],['Find litter','on the map.'],['Find your','next cleanup.'],['See the','difference.'],['Get others','involved.'],['Track how much','litter you’ve','collected.']];
(async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(d,'../v11/manifest.json')));
 const checks=[];
 for(let i=0;i<manifest.gallery.length;i++){
  const g=manifest.gallery[i],source=path.join(d,g.source),isPhoto=i===0;
  const inputMeta=await sharp(source).metadata();
  const media=await sharp(source).resize(screen.width,screen.height,{fit:isPhoto?'cover':'contain',position:'centre',background:'#ffffff'}).removeAlpha().png().toBuffer();
  const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="${g.background}"/>${heads[i].map((t,j)=>`<text x="78" y="${150+j*100}" font-family="Avenir Next,Arial,sans-serif" font-size="96" font-weight="800" fill="${g.background==='#7531a5'?'#ffffff':'#222125'}">${escape(t)}</text>`).join('')}<rect x="${frame.left}" y="${frame.top}" width="${frame.width}" height="${frame.height}" rx="${frame.radius}" fill="#222125"/></svg>`);
  // Contain preserves all screenshot pixels. Only the illustrative photo fills by crop.
  await sharp(svg).composite([{input:media,left:screen.left,top:screen.top}]).flatten({background:g.background}).removeAlpha().png().toFile(path.join(d,g.file));
  const outputMeta=await sharp(path.join(d,g.file)).metadata();
  if(outputMeta.width!==1080||outputMeta.height!==1920||outputMeta.hasAlpha)throw Error('Invalid export '+g.file);
  const fitted=await sharp(path.join(d,g.file)).extract(screen).removeAlpha().raw().toBuffer();
  const expected=await sharp(media).raw().toBuffer();
  if(!fitted.equals(expected))throw Error('Screen mismatch '+g.file);
  Object.assign(g,{id:`uniform-v12-${i+1}`,phoneBorder:true,frame:{...frame},screen:{...screen},mediaFit:isPhoto?'cover':'contain'});
  checks.push({file:g.file,source:[inputMeta.width,inputMeta.height],export:[outputMeta.width,outputMeta.height],phoneFrame:[frame.width,frame.height],screenContentVerified:true});
 }
 const thumbnails=[];
 for(let i=0;i<manifest.gallery.length;i++)thumbnails.push({input:await sharp(path.join(d,manifest.gallery[i].file)).resize(270,480).png().toBuffer(),left:24+(i%4)*294,top:24+Math.floor(i/4)*504});
 await sharp({create:{width:1200,height:1032,channels:3,background:'#e9e5de'}}).composite(thumbnails).png().toFile(path.join(d,'gallery-review.png'));
 manifest.visualSystem={headingSize:96,headingLineSpacing:100,headingFirstBaseline:150,frame,screen,backgrounds:['#7531a5','#efe4ff'],allEightPanelsFramed:true,screenshotFit:'contain without stretching or clipping',photoFit:'cover'};
 manifest.provenance.presentation='All eight panels use the same phone frame size and position. Real screenshots fit proportionally inside a white screen; original content is fully preserved. The illustrative reporting photo is proportionally cropped to fill the same frame. No new status bars, controls, activity, or metrics were fabricated.';
 fs.writeFileSync(path.join(d,'manifest.json'),JSON.stringify(manifest,null,2));
 fs.writeFileSync(path.join(d,'size-audit.json'),JSON.stringify({passed:true,checks},null,2));
 fs.writeFileSync(path.join(d,'review/items.json'),JSON.stringify(manifest.gallery.map(g=>({id:g.id,src:g.file,href:g.file,title:g.title}))));
 require('child_process').execFileSync('python3',['/Users/grantgibson/.codex/plugins/cache/openai-curated-remote/creative-production/0.1.25/scripts/review_renderer.py','--out-dir',path.join(d,'review'),'--manifest',path.join(d,'review/items.json'),'--preset','image-wall','--hide-captions','--review-options',JSON.stringify({output:'../index.html',title:'Litterbugs — uniform phone gallery'})]);
 console.log(JSON.stringify({verified:8,export:'1080×1920',phone:'680×1380',position:'200,440',screenshotsPreserved:7}));
})();
