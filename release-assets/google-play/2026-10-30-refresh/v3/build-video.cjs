const fs=require('fs'),path=require('path'),sharp=require('sharp'),{execFileSync}=require('child_process');
sharp.concurrency(1);sharp.cache(false);const d=__dirname,w=path.join(d,'video-frames');fs.mkdirSync(w,{recursive:true});
const bg=(heads,color='#fff9ed')=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="1920" height="1080" fill="${color}"/>${heads.map((t,j)=>`<text x="110" y="${440+j*120}" font-family="Avenir Next,Arial" font-size="98" font-weight="800" fill="#222125">${t}</text>`).join('')}</svg>`);
function ff(args){execFileSync('/opt/homebrew/bin/ffmpeg',['-y','-v','error','-threads','1','-filter_threads','1','-filter_complex_threads','1',...args],{stdio:'inherit'});}
(async()=>{
 const art=await sharp(path.join(d,'source/cleanup-illustration.png')).resize(850,950,{fit:'contain',background:'#fff9ed'}).png().toBuffer();
 await sharp(bg(['Make money.','Clean up.'])).composite([{input:art,left:1050,top:65}]).removeAlpha().png().toFile(path.join(w,'intro.png'));
 await sharp(bg(['Find a','cleanup.'])).removeAlpha().png().toFile(path.join(w,'live-bg.png'));
 const donation=await sharp(path.join(d,'source/captures/donate-build21.png')).resize({height:980}).png().toBuffer();
 await sharp(bg(['Donate to','a cleanup.'],'#ffce41')).composite([{input:donation,left:1270,top:50}]).removeAlpha().png().toFile(path.join(w,'outro.png'));
 const codec=['-c:v','libx264','-preset','veryfast','-crf','21','-threads','1','-pix_fmt','yuv420p','-r','30','-an'];
 ff(['-loop','1','-i',path.join(w,'intro.png'),'-t','4',...codec,path.join(w,'intro.mp4')]);
 ff(['-loop','1','-i',path.join(w,'live-bg.png'),'-i',path.join(d,'source/captures/walkthrough-build21.mp4'),'-filter_complex','[1:v]scale=-2:980[phone];[0:v][phone]overlay=1270:50:shortest=1[v]','-map','[v]','-t','18',...codec,path.join(w,'live.mp4')]);
 ff(['-loop','1','-i',path.join(w,'outro.png'),'-t','4',...codec,path.join(w,'outro.mp4')]);
 fs.writeFileSync(path.join(w,'concat.txt'),"file 'intro.mp4'\nfile 'live.mp4'\nfile 'outro.mp4'\n");
 ff(['-f','concat','-safe','0','-i',path.join(w,'concat.txt'),'-c','copy','-movflags','+faststart',path.join(d,'video-app-preview.mp4')]);
 console.log('Created 26-second app preview with 18 seconds of real build-21 footage.');
})();
