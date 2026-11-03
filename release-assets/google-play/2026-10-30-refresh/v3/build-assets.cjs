const fs=require('fs'),path=require('path'),sharp=require('sharp');
sharp.concurrency(1);sharp.cache(false);
const d=__dirname;
const rows=[
 ['01-make-money-cleaning.png',['Make money','cleaning up.'],'#fff9ed',null,'01-your-neighborhood.png'],
 ['02-find-litter.png',['Find litter','near you.'],'#ffce41','reports-build21.png'],
 ['03-choose-a-cleanup.png',['Choose a','cleanup.'],'#efe4ff','cleanup-detail-build21.png'],
 ['04-report-litter.png',['Make money','reporting litter.'],'#7531a5',null,'04-reporter-rewards.png'],
 ['05-donate.png',['Donate to','a cleanup.'],'#fff9ed','donate-build21.png'],
 ['06-clean-up.png',['Pick up litter.','Get paid.'],'#ffce41',null,'06-cleanup-rewards.png'],
 ['07-share.png',['Share a','cleanup.'],'#efe4ff','sharing-build21.png'],
 ['08-community.png',['Help clean up','your community.'],'#fff9ed','community-profile-build21.png']
];
(async()=>{
 const gallery=[];
 for(let i=0;i<rows.length;i++){
  const [file,heads,bg,source,previous]=rows[i];
  if(previous)fs.copyFileSync(path.join(d,'../v2',previous),path.join(d,file));
  else{
   const screen=await sharp(path.join(d,'source/captures',source)).resize({width:660}).png().toBuffer();
   const h=(await sharp(screen).metadata()).height;
   const s=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="${bg}"/>${heads.map((t,j)=>`<text x="78" y="${174+j*106}" font-family="Avenir Next,Arial,sans-serif" font-size="88" font-weight="800" fill="#222125">${t}</text>`).join('')}<rect x="194" y="394" width="692" height="${h+32}" rx="48" fill="#222125"/></svg>`);
   await sharp(s).composite([{input:screen,left:210,top:410}]).flatten({background:bg}).removeAlpha().png().toFile(path.join(d,file));
  }
  const meta=await sharp(path.join(d,file)).metadata();
  if(meta.width!==1080||meta.height!==1920||meta.hasAlpha)throw Error('Invalid export '+file);
  gallery.push({id:`native-v3-${i+1}`,file,title:heads.join(' '),type:source?'real Android screenshot with headline':'existing illustration/graphic',source:source?`source/captures/${source}`:`../v2/${previous}`,width:1080,height:1920});
 }
 const composite=[];
 for(let i=0;i<gallery.length;i++) composite.push({input:await sharp(path.join(d,gallery[i].file)).resize(270,480).png().toBuffer(),left:24+(i%4)*294,top:24+Math.floor(i/4)*504});
 await sharp({create:{width:1200,height:1032,channels:3,background:'#e9e5de'}}).composite(composite).png().toFile(path.join(d,'gallery-review.png'));
 const manifest={created:'2026-10-30',status:'Review draft; not published',boardId:'959886fa-d600-49fc-9797-89a0ff32bc4d',gallery,realScreenshots:5,graphics:3,featureGraphics:['feature-graphic-illustrated.png','feature-graphic-yellow.png'],provenance:{app:'Native Android 2.0.1, versionCode 21, installed from release AAB; local APK signed with standard debug keystore. Captured October 30 via ADB.',screens:'Original 1080x2340 captures retained; proportionally resized in full, with no UI edits. Real existing public reports and reporter profile. Donation screen is before payment with app default amount; no payment made.',illustrations:'Existing v2 artwork preserved; no new image generation.',excluded:'Blank map tiles under local signing, location-permission dialogs, test-payment screenshots, and old build-20 map excluded.',video:'Actual 20-second build-21 screen recording retained in source/captures; no submission or payment.'},remaining:['Review gallery and video before any upload.'],notUploaded:true};
 fs.writeFileSync(path.join(d,'manifest.json'),JSON.stringify(manifest,null,2));
 fs.mkdirSync(path.join(d,'review'),{recursive:true});
 fs.writeFileSync(path.join(d,'review/items.json'),JSON.stringify(gallery.map(o=>({id:o.id,src:o.file,href:o.file,title:o.title}))));
 require('child_process').execFileSync('python3',['/Users/grantgibson/.codex/plugins/cache/openai-curated-remote/creative-production/0.1.25/scripts/review_renderer.py','--out-dir',path.join(d,'review'),'--manifest',path.join(d,'review/items.json'),'--preset','image-wall','--hide-captions','--review-options',JSON.stringify({output:'../index.html',title:'Litterbugs — revised gallery'})]);
 console.log(JSON.stringify({count:gallery.length,screens:5,dimensions:'1080x1920',opaque:true}));
})();
