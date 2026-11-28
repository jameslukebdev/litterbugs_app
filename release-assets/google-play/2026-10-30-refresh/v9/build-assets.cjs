const fs=require('fs'),path=require('path'),sharp=require('sharp');
sharp.concurrency(1);sharp.cache(false);
const d=__dirname;
const rows=[
 ['01-make-money-reporting.png',['Make money','reporting litter.'],'#7531a5',null,'reporting-photo'],
 ['02-make-money-cleaning.png',['Make money','cleaning up.'],'#fff9ed','funded-cleanup-user.png'],
 ['03-donate.png',['Donate to','a cleanup.'],'#fff9ed','donate-build21.png'],
 ['04-map.png',['Find litter','on the map.'],'#efe4ff','boone-map-user.png'],
 ['05-reports.png',['Find your','next cleanup.'],'#ffce41','reports-build21.png'],
 ['06-before-after.png',['See the','difference.'],'#fff9ed','greenwood-before-after-user.png'],
 ['07-share.png',['Get others','involved.'],'#efe4ff','sharing-build21.png'],
 ['08-find-your-cleanup.png',['Find a cleanup','that fits.'],'#ffce41','filters-build21.png']
];
(async()=>{
 const gallery=[];
 for(let i=0;i<rows.length;i++){
  const [file,heads,bg,source,previous]=rows[i];
  if(previous==='reporting-photo'){
   const art=await sharp(path.join(d,'source/reporting-photo.png')).resize(920,1200,{fit:'cover'}).png().toBuffer();
   const base=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="#7531a5"/>${heads.map((t,j)=>`<text x="78" y="${174+j*106}" font-family="Avenir Next,Arial,sans-serif" font-size="88" font-weight="800" fill="#fff9ed">${t}</text>`).join('')}</svg>`);
   await sharp(base).composite([{input:art,left:80,top:490}]).flatten({background:'#7531a5'}).removeAlpha().png().toFile(path.join(d,file));
  }
  else if(previous)fs.copyFileSync(path.join(d,'../v2',previous),path.join(d,file));
  else{
   const isImpact=source==='greenwood-before-after-user.png';
   const width=isImpact?900:['boone-map-user.png','funded-cleanup-user.png'].includes(source)?800:660;
   const left=Math.round((1080-width)/2);
   const screen=await sharp(path.join(d,'source/captures',source)).resize({width}).png().toBuffer();
   const h=(await sharp(screen).metadata()).height;
   const s=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="${bg}"/>${heads.map((t,j)=>`<text x="78" y="${174+j*106}" font-family="Avenir Next,Arial,sans-serif" font-size="88" font-weight="800" fill="#222125">${t}</text>`).join('')}${isImpact?'':`<rect x="${left-16}" y="394" width="${width+32}" height="${h+32}" rx="48" fill="#222125"/>`}</svg>`);
   await sharp(s).composite([{input:screen,left,top:isImpact?480:410}]).flatten({background:bg}).removeAlpha().png().toFile(path.join(d,file));
  }
  const meta=await sharp(path.join(d,file)).metadata();
  if(meta.width!==1080||meta.height!==1920||meta.hasAlpha)throw Error('Invalid export '+file);
  gallery.push({id:`native-v9-${i+1}`,file,title:heads.join(' '),type:['greenwood-before-after-user.png','boone-map-user.png','funded-cleanup-user.png'].includes(source)?'user-provided website screenshot with headline':source?'real Android screenshot with headline':'AI-generated illustrative photograph',source:source?`source/captures/${source}`:(previous==='reporting-photo'?'source/reporting-photo.png':`../v2/${previous}`),width:1080,height:1920});
 }
 const composite=[];
 for(let i=0;i<gallery.length;i++) composite.push({input:await sharp(path.join(d,gallery[i].file)).resize(270,480).png().toBuffer(),left:24+(i%4)*294,top:24+Math.floor(i/4)*504});
 await sharp({create:{width:1200,height:1032,channels:3,background:'#e9e5de'}}).composite(composite).png().toFile(path.join(d,'gallery-review.png'));
 const manifest={created:'2026-10-30',status:'Review draft; not published',boardId:'959886fa-d600-49fc-9797-89a0ff32bc4d',gallery,realScreenshots:7,nativeAppScreenshots:4,websiteScreenshots:3,graphics:1,featureGraphics:[],provenance:{app:'Four native build-21 screenshots captured October 30 via ADB. Map, funded cleanup and before/after images are user-provided website screenshots, not native Android captures. The old build-20 map is no longer used.',map:'User-provided Boone-area website screenshot, October 30. Full screenshot preserved including real individual report markers, clusters, map attribution and controls. No synthetic pins or UI changes.',fundedCleanup:'User-supplied October 30 website capture of Lots of trash near steps to Greenwood Lot. The displayed reward is original UI, not a fabricated earnings example. Full screenshot preserved.',impact:'User-provided Greenwood Lot before/after website screenshot. Entire image preserved; no labels, photos, or UI modified. Not represented as native Android UI.',screens:'Original 1080x2340 captures retained; proportionally resized in full, with no UI edits. Real existing public reports. Public reporter profile and cleanup illustrations removed; reporting graphic retained. Donation screen is before payment with app default amount; no payment made.',illustrations:'New photorealistic reporting image generated with built-in ImageGen using the owner photo as composition reference. First-person phone photographing litter with a generic camera preview; not real cleanup evidence or Litterbugs app UI. No earnings shown. Prompt saved in source/reporting-photo-prompt.txt.',excluded:'Blank map tiles under local signing, location-permission dialogs, test-payment screenshots, and public reporter profile excluded.',video:'Existing video remains in ../v3/video-app-preview.mp4; this revision changes the gallery only.'},hookPriority:['Make money reporting litter','Make money cleaning up','Donate to a cleanup'],remaining:['Review gallery before any upload.'],notUploaded:true};
 fs.writeFileSync(path.join(d,'manifest.json'),JSON.stringify(manifest,null,2));
 fs.mkdirSync(path.join(d,'review'),{recursive:true});
 fs.writeFileSync(path.join(d,'review/items.json'),JSON.stringify(gallery.map(o=>({id:o.id,src:o.file,href:o.file,title:o.title}))));
 require('child_process').execFileSync('python3',['/Users/grantgibson/.codex/plugins/cache/openai-curated-remote/creative-production/0.1.25/scripts/review_renderer.py','--out-dir',path.join(d,'review'),'--manifest',path.join(d,'review/items.json'),'--preset','image-wall','--hide-captions','--review-options',JSON.stringify({output:'../index.html',title:'Litterbugs — revised gallery'})]);
 console.log(JSON.stringify({count:gallery.length,screens:7,dimensions:'1080x1920',opaque:true}));
})();
