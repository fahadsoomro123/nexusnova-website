(()=>{
'use strict';
const root=document.querySelector('[data-tool-ui]');
if(!root)return;
const key=document.body.dataset.tool||'';
const $=(s,p=root)=>p.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const out=html=>{const el=$('[data-output]');if(el)el.innerHTML=html};
const loadScript=src=>new Promise((resolve,reject)=>{const found=[...document.scripts].find(s=>s.src===src);if(found){if(window.heic2any)return resolve();found.addEventListener('load',resolve,{once:true});found.addEventListener('error',reject,{once:true});return;}const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
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
  root.innerHTML=`<div class="trend-ui"><label class="trend-file">Choose HEIC or HEIF image<input type="file" accept=".heic,.heif,image/heic,image/heif" data-file></label><label>JPG quality <input type="range" min="60" max="100" value="92" data-quality><span data-quality-label>92%</span></label><button type="button" class="trend-action primary" data-go>CONVERT HEIC TO JPG</button><div class="trend-output" data-output>Ready.</div><p class="trend-note">HEIC decoding uses the MIT-licensed heic2any browser library loaded from jsDelivr. The selected photo stays in your browser and is not uploaded to NexusNova.</p></div>`;
  const q=$('[data-quality]'),ql=$('[data-quality-label]');q.oninput=()=>ql.textContent=`${q.value}%`;
  $('[data-go]').onclick=async()=>{try{const file=$('[data-file]').files[0];if(!file)throw new Error('Choose a HEIC or HEIF file first.');out('Loading HEIC decoder…');await loadScript('https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js');if(typeof window.heic2any!=='function')throw new Error('HEIC decoder did not load. Check your connection and try again.');out('Converting…');let converted=await window.heic2any({blob:file,toType:'image/jpeg',quality:Number(q.value)/100});if(Array.isArray(converted))converted=converted[0];if(!(converted instanceof Blob))throw new Error('No JPG output was produced.');downloadBlob(converted,`${cleanBase(file.name)}.jpg`);out('<strong>Done.</strong> JPG downloaded.')}catch(e){out(`<span style="color:#b42318">${esc(e.message||'HEIC conversion failed.')}</span>`)}};
}
const tools={
  'heic-to-jpg':heicToJpg,
  'webp-to-png':()=>canvasConvert({accept:'.webp,image/webp',label:'WebP image',type:'image/png',ext:'png',quality:false}),
  'avif-to-jpg':()=>canvasConvert({accept:'.avif,image/avif',label:'AVIF image',type:'image/jpeg',ext:'jpg',quality:true})
};
(tools[key]||(()=>{root.textContent='Tool configuration not found.'}))();
})();
