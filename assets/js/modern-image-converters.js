(()=>{
'use strict';
const root=document.querySelector('[data-tool-ui]');
if(!root)return;
const key=document.body.dataset.tool||'';
const $=(s,p=root)=>p.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const out=html=>{const el=$('[data-output]');if(el)el.innerHTML=html};
const loadScript=(src,globalName)=>new Promise((resolve,reject)=>{
  if(globalName&&typeof window[globalName]!=='undefined')return resolve();
  const absolute=new URL(src,location.href).href;
  const found=[...document.scripts].find(s=>s.src===absolute);
  const finish=()=>globalName&&typeof window[globalName]==='undefined'
    ?reject(new Error('A required conversion library did not initialize. Check your connection and try again.'))
    :resolve();
  if(found){
    found.addEventListener('load',finish,{once:true});
    found.addEventListener('error',()=>reject(new Error('A required conversion library could not be downloaded. Check your connection and try again.')),{once:true});
    if(globalName&&typeof window[globalName]!=='undefined')resolve();
    return;
  }
  const script=document.createElement('script');
  script.src=absolute;script.async=true;
  script.onload=finish;
  script.onerror=()=>reject(new Error('A required conversion library could not be downloaded. Check your connection and try again.'));
  document.head.appendChild(script);
});
const downloadBlob=(blob,name)=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},1000)};
const imageFromBlob=blob=>new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(blob);img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('This browser could not decode the selected image.'))};img.src=url});
const canvasBlob=(canvas,type,quality)=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('The browser could not create the output file.')),type,quality));
const cleanBase=name=>(name||'nexusnova-image').replace(/\.[^.]+$/,'').replace(/[^a-z0-9-_]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,80)||'nexusnova-image';
function canvasConvert({accept,label,type,ext,quality=true}){
  root.innerHTML=`<div class="trend-ui"><label class="trend-file">Choose ${label}<input type="file" accept="${accept}" data-file></label>${quality?'<label>JPG quality <input type="range" min="60" max="100" value="92" data-quality><span data-quality-label>92%</span></label>':''}<button type="button" class="trend-action primary" data-go>CONVERT TO ${ext.toUpperCase()}</button><div class="trend-output" data-output>Ready.</div><p class="trend-note">Conversion happens locally in your browser. Your selected image is not uploaded to NexusNova.</p></div>`;
  const q=$('[data-quality]'),ql=$('[data-quality-label]');if(q&&ql)q.oninput=()=>ql.textContent=`${q.value}%`;
  $('[data-go]').onclick=async()=>{try{const file=$('[data-file]').files[0];if(!file)throw new Error(`Choose a ${label} file first.`);out('Converting…');const img=await imageFromBlob(file),c=document.createElement('canvas');c.width=img.naturalWidth||img.width;c.height=img.naturalHeight||img.height;const ctx=c.getContext('2d');if(type==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height)}ctx.drawImage(img,0,0);const blob=await canvasBlob(c,type,q?Number(q.value)/100:undefined);downloadBlob(blob,`${cleanBase(file.name)}.${ext}`);out(`<strong>Done.</strong> ${c.width} × ${c.height}px ${ext.toUpperCase()} downloaded.`)}catch(e){out(`<span style="color:#b42318">${esc(e.message||'Conversion failed.')}</span>`)}};
}
function heicToJpg(){
  const maxFiles=10,maxTotalBytes=100*1024*1024;
  const decoderUrl='https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
  const zipUrl='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
  root.innerHTML=`<div class="trend-ui">
    <label class="trend-file">Choose HEIC or HEIF photos (up to ${maxFiles})
      <input type="file" accept=".heic,.heif,image/heic,image/heif" data-file multiple>
    </label>
    <p class="trend-note">Select one photo for a JPG download, or select multiple photos for one ZIP. Combined input limit: 100 MB.</p>
    <label>JPG quality <input type="range" min="60" max="100" value="92" data-quality><span data-quality-label>92%</span></label>
    <button type="button" class="trend-action primary" data-go>CONVERT TO JPG</button>
    <div class="trend-output" data-output aria-live="polite">Choose one or more HEIC/HEIF photos to begin.</div>
    <p class="trend-note">Photos are converted in your browser and are not uploaded to NexusNova. The converter and ZIP library are downloaded from jsDelivr when required; that downloads code, not your photos.</p>
  </div>`;
  const input=$('[data-file]'),q=$('[data-quality]'),ql=$('[data-quality-label]'),button=$('[data-go]');
  q.oninput=()=>ql.textContent=`${q.value}%`;
  const uniqueJpgName=(base,used)=>{
    let candidate=`${base}.jpg`,suffix=2;
    while(used.has(candidate.toLowerCase()))candidate=`${base}-${suffix++}.jpg`;
    used.add(candidate.toLowerCase());
    return candidate;
  };
  button.onclick=async()=>{
    const files=Array.from(input.files||[]);
    try{
      if(!files.length)throw new Error('Choose at least one HEIC or HEIF photo first.');
      if(files.length>maxFiles)throw new Error(`Choose no more than ${maxFiles} photos per batch to protect device memory.`);
      if(files.some(file=>!(/\.(heic|heif)$/i.test(file.name)||/image\/(heic|heif)/i.test(file.type))))throw new Error('Every selected file must be a HEIC or HEIF photo.');
      const totalBytes=files.reduce((sum,file)=>sum+file.size,0);
      if(totalBytes>maxTotalBytes)throw new Error('The selected photos exceed the 100 MB combined batch limit. Choose a smaller batch.');
      button.disabled=true;
      button.textContent='PREPARING…';
      out('Loading the HEIC decoder…');
      await loadScript(decoderUrl,'heic2any');
      if(typeof window.heic2any!=='function')throw new Error('The HEIC decoder did not initialize. Check your connection and try again.');
      if(files.length>1){
        out('Loading the ZIP library…');
        await loadScript(zipUrl,'JSZip');
        if(typeof window.JSZip!=='function')throw new Error('The ZIP library did not initialize. Check your connection and try again.');
      }
      const usedNames=new Set(),convertedFiles=[],failures=[];
      for(let index=0;index<files.length;index++){
        const file=files[index];
        out(`Converting photo ${index+1} of ${files.length}: ${esc(file.name)}…`);
        try{
          let converted=await window.heic2any({blob:file,toType:'image/jpeg',quality:Number(q.value)/100});
          if(Array.isArray(converted))converted=converted[0];
          if(!(converted instanceof Blob))throw new Error('No JPG output was produced.');
          convertedFiles.push({name:uniqueJpgName(cleanBase(file.name),usedNames),blob:converted});
        }catch(error){
          failures.push(`${file.name}: ${String(error?.message||'conversion failed')}`);
        }
      }
      if(!convertedFiles.length){
        const detail=failures.slice(0,3).join('; ');
        throw new Error(detail||'None of the selected photos could be converted in this browser.');
      }
      if(convertedFiles.length===1&&files.length===1){
        downloadBlob(convertedFiles[0].blob,convertedFiles[0].name);
        out(`<strong>Done.</strong> ${esc(convertedFiles[0].name)} downloaded as JPG.`);
      }else{
        const zip=new window.JSZip();
        convertedFiles.forEach(file=>zip.file(file.name,file.blob,{binary:true}));
        out(`Creating ZIP for ${convertedFiles.length} converted photo(s)…`);
        const archive=await zip.generateAsync({type:'blob',compression:'STORE'},metadata=>{
          const percent=Math.round(metadata.percent||0);
          out(`Preparing ZIP… ${percent}%`);
        });
        downloadBlob(archive,'nexusnova-heic-to-jpg.zip');
        const failedText=failures.length
          ?` ${failures.length} photo(s) could not be converted: ${esc(failures.slice(0,3).join('; '))}.`
          :'';
        out(`<strong>Done.</strong> ${convertedFiles.length} of ${files.length} photo(s) converted. ZIP downloaded.${failedText}`);
      }
    }catch(error){
      out(`<span style="color:#b42318">${esc(error?.message||'HEIC conversion failed. Please try another file or browser.')}</span>`);
    }finally{
      button.disabled=false;
      button.textContent='CONVERT TO JPG';
    }
  };
}
const tools={
  'heic-to-jpg':heicToJpg,
  'webp-to-png':()=>canvasConvert({accept:'.webp,image/webp',label:'WebP image',type:'image/png',ext:'png',quality:false}),
  'avif-to-jpg':()=>canvasConvert({accept:'.avif,image/avif',label:'AVIF image',type:'image/jpeg',ext:'jpg',quality:true})
};
(tools[key]||(()=>{root.textContent='Tool configuration not found.'}))();
})();
