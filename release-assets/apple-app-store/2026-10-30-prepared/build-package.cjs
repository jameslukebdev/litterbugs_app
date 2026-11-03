const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
sharp.concurrency(1);
sharp.cache(false);
const root = path.resolve(__dirname, '../../..');
const prior = path.join(root, 'release-assets/google-play/2026-10-30-refresh/v14');
const original = JSON.parse(fs.readFileSync(path.join(prior, 'manifest.json')));
const order = [1, 2, 3, 4, 6, 8, 5, 7];
const nativeSources = {1:'01-report-litter.png',2:'02-paid-cleanup.png',3:'03-donate.png',4:'04-boone-map.png',6:'06-cleanup-impact.png',8:'08-track-litter.png',5:'05-reports.png',7:'07-share.png'};
const headings = {
  1: ['See Litter?', 'Get paid to', 'report it.'],
  2: ['Make real money', 'cleaning up.'],
  3: ['Donate to', 'a cleanup.'],
  4: ['Find litter', 'on the map.'],
  6: ['See the', 'difference.'],
  8: ['Track how much', 'litter you’ve', 'collected.'],
  5: ['Find your', 'next cleanup.'],
  7: ['Get others', 'involved.'],
};
const names = ['report-litter','clean-up','donate','map','before-after','track-litter','find-cleanup','share'];
const escape = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;');
async function main() {
  const manifest = {
    created: '2026-10-30',
    status: 'Recommended Apple set: five real iPhone screenshots and three marketing panels. Prepared, not uploaded.',
    order,
    uploaded: false,
    video: 'On hold; no video created or changed.',
    noGeneratedImagery: true,
    iconStatus: 'On hold at user request. Existing standalone asset untouched; no app icon or build changes.',
    formats: [],
    sourceChecks: order.map((n,i)=>({position:i+1,originalNumber:n,type:'Real iPhone app capture, version 2.0.1',source:'source/iphone/'+nativeSources[n],requiredBeforeAppleUpload:null})),
    appleSpecs: 'https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications',
    appleScreenshotGuidance: 'https://developer.apple.com/app-store/asset-best-practices/#screenshots',
    checks: [],
  };
  for (const [w,h] of [[1320,2868],[1242,2688]]) {
    const dir = `screenshots/${w}x${h}`;
    fs.mkdirSync(path.join(__dirname,dir),{recursive:true});
    const scale = w/1320;
    const fw = Math.round(900*scale), fh = Math.round(1914*scale);
    const fx = Math.round((w-fw)/2), fy = h-fh-Math.round(150*scale);
    const border=Math.round(18*scale), sw=fw-2*border, sh=fh-2*border;
    const files=[];
    for(let i=0;i<original.gallery.length;i++) {
      const g=original.gallery[i], n=order[i], src=n===2 ? path.join(__dirname,'source/marketing/02-real-reward-card.png') : nativeSources[n] ? path.join(__dirname,'source/iphone',nativeSources[n]) : path.resolve(prior,g.source);
      const meta=await sharp(src).metadata();
      let media;
      if(n===1) {
        media=await sharp(path.join(prior,'source/homepage-original-X4.jpg')).resize(sw,sh,{fit:'cover',position:'centre',withoutEnlargement:true}).removeAlpha().png().toBuffer();
      } else if(n===6) {
        const storyPath=path.join(__dirname,'source/marketing/before-after-story.png');
        const storyMeta=await sharp(storyPath).metadata();
        const k=Math.min(1,sw/storyMeta.width,sh/storyMeta.height);
        const mw=Math.round(storyMeta.width*k),mh=Math.round(storyMeta.height*k);
        const story=await sharp(storyPath).resize(mw,mh).png().toBuffer();
        media=await sharp({create:{width:sw,height:sh,channels:3,background:'#fff'}}).composite([{input:story,left:Math.round((sw-mw)/2),top:Math.round((sh-mh)/2)}]).png().toBuffer();
      } else {
        const k=Math.min(1,sw/meta.width,sh/meta.height);
        const mw=Math.round(meta.width*k),mh=Math.round(meta.height*k);
        const fitted=await sharp(src).resize(mw,mh).flatten({background:'#fff'}).removeAlpha().png().toBuffer();
        media=await sharp({create:{width:sw,height:sh,channels:3,background:'#fff'}}).composite([{input:fitted,left:Math.round((sw-mw)/2),top:Math.round((sh-mh)/2)}]).removeAlpha().png().toBuffer();
      }
      const screenMask=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${sw}" height="${sh}"><rect width="${sw}" height="${sh}" rx="${Math.round(46*scale)}" fill="white"/></svg>`);
      media=await sharp(media).ensureAlpha().composite([{input:screenMask,blend:'dest-in'}]).png().toBuffer();
      const color=g.background==='#7531a5'?'#fff':'#222125';
      const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${g.background}"/>${headings[n].map((line,j)=>`<text x="${Math.round(90*scale)}" y="${Math.round((190+j*118)*scale)}" font-family="Avenir Next,Arial,sans-serif" font-size="${Math.round(110*scale)}" font-weight="800" fill="${color}">${escape(line)}</text>`).join('')}<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="${Math.round(64*scale)}" fill="#222125"/></svg>`);
      const file=`${String(i+1).padStart(2,'0')}-${names[i]}.png`;
      const dest=path.join(__dirname,dir,file);
      const layers=[];
      layers.push({input:media,left:fx+border,top:fy+border});
      await sharp(svg).composite(layers).removeAlpha().png().toFile(dest);
      const out=await sharp(dest).metadata();
      if(out.width!==w||out.height!==h||out.hasAlpha) throw Error('Invalid image '+file);
      const inset=Math.round(46*scale);
      const actual=await sharp(dest).extract({left:fx+border+inset,top:fy+border+inset,width:sw-2*inset,height:sh-2*inset}).raw().toBuffer();
      const expected=await sharp(media).extract({left:inset,top:inset,width:sw-2*inset,height:sh-2*inset}).removeAlpha().raw().toBuffer();
      if(!actual.equals(expected)) throw Error('Screen pixels differ '+file);
      files.push(`${dir}/${file}`);
      manifest.checks.push({file:`${dir}/${file}`,width:w,height:h,opaque:true,screenInteriorPixelsVerified:true,sourceEnlarged:false,bytes:fs.statSync(dest).size});
    }
    manifest.formats.push({width:w,height:h,files,phoneFrame:{x:fx,y:fy,width:fw,height:fh,border}});
  }
  const thumbs=[];
  for(let i=0;i<8;i++) thumbs.push({input:await sharp(path.join(__dirname,manifest.formats[0].files[i])).resize(264,574).png().toBuffer(),left:20+(i%4)*284,top:20+Math.floor(i/4)*594});
  await sharp({create:{width:1156,height:1208,channels:3,background:'#e9e5de'}}).composite(thumbs).png().toFile(path.join(__dirname,'preview.png'));
  manifest.sourceChecks[0]={position:1,originalNumber:1,type:'Marketing panel: original real Canva homepage photograph',source:path.relative(__dirname,path.join(prior,'source/homepage-original-X4.jpg')),requiredBeforeAppleUpload:null};
  manifest.sourceChecks[4]={position:5,originalNumber:6,type:'Marketing story: real Greenwood Lot before-and-after photographs',source:'source/marketing/before-after-story.png',originalSource:path.relative(__dirname,path.join(prior,'source/before-after-hq.png')),treatment:'Original high-quality photos, cropped without retouching, in two large stacked panels with 64px side margins. Marketing story, not a native app screen.',requiredBeforeAppleUpload:null};
  manifest.appleGuidance={url:'https://developer.apple.com/help/app-review/guideline-reference/2-3-3-screenshots',checked:'2026-10-30',nativeAppPanels:5,marketingPanels:3,minimumNativePanelsForEight:5};
  manifest.sourceChecks[1]={position:2,originalNumber:2,type:'Marketing panel: real website report card captured at triple resolution',source:'source/marketing/02-real-reward-card.png',originalSource:'source/marketing/02-real-reward-card-full.png',url:'https://litterbugs.app/map?view=reports&browse=1&lat=36.217&lng=-81.675&zoom=12.0',verifiedVisibleAmount:'$25 reward',treatment:'Actual rendered report card with its original purple reward badge, photograph, title, metadata and reporter footer. No added amount callout.',requiredBeforeAppleUpload:null};
  manifest.sourceChecks[4].photoSources = ['source/marketing/greenwood-before-original.jpg','source/marketing/greenwood-after-original.jpg'];
  manifest.sourceChecks[4].safeSideMargin = 64;
  manifest.sourceChecks[1].reportTitle = 'Lots of trash near steps to Greenwood Lot';
  manifest.captureDevice = {name:'iPhone 17 Pro',size:'1206x2622',runtime:'iOS 26.5',appVersion:'2.0.1',source:'Existing simulator build; no compilation or app source changes',data:'Real production app data; no fabricated reports, payments, or earnings',location:'Boone test location, authorized by user; no real device location used'};
  manifest.uploadStatus = 'Not uploaded. App Store Connect screenshot drop zone disabled while version 2.0.1 is Waiting for Review.';
  fs.writeFileSync(path.join(__dirname,'manifest.json'),JSON.stringify(manifest,null,2));
  console.log(JSON.stringify({exports:manifest.checks.length,icon:'unchanged; on hold',allScreensOpaque:true,noSourceEnlargement:true,order,status:manifest.status}));
}
main().catch(e=>{console.error(e);process.exit(1)});
