(()=>{
  const ENDPOINT='https://nexusnova-telegram-bot.fahadsoomro123.workers.dev/api/fbr/atl-status';
  const PRODUCTION_ORIGINS=new Set(['https://nexusnovatools.com','https://www.nexusnovatools.com']);
  const PREVIEW_MODE=typeof location!=='undefined'&&!PRODUCTION_ORIGINS.has(String(location.origin||''));
  const TYPES={
    'CNIC':{label:'CNIC / Identification Number',placeholder:'35202-1234567-1',inputMode:'numeric',help:'Enter 13 CNIC digits. Dashes are optional.'},
    'NTN':{label:'NTN',placeholder:'1234567',inputMode:'numeric',help:'Enter the 7-digit NTN.'},
    'Passport No.':{label:'Passport No.',placeholder:'Passport number',inputMode:'text',help:'Enter the passport number shown on the FBR record.'},
    'Reg/Inc. No.':{label:'Reg/Inc. No.',placeholder:'Registration / incorporation number',inputMode:'text',help:'Enter the registration or incorporation number.'}
  };
  const clean=(type,value)=>{const raw=String(value??'').trim();return type==='CNIC'||type==='NTN'?raw.replace(/[^0-9]/g,''):raw.replace(/\s+/g,' ').slice(0,20)};
  const valid=(type,value)=>{if(type==='CNIC')return /^\d{13}$/.test(value);if(type==='NTN')return /^\d{7}$/.test(value);return /^[A-Za-z0-9][A-Za-z0-9 ./_-]{0,19}$/.test(value)};
  const formatCNIC=value=>{const n=clean('CNIC',value);return n.length===13?n.replace(/^(\d{5})(\d{7})(\d{1})$/,'$1-$2-$3'):n};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  if(typeof module!=='undefined'&&module.exports){module.exports={clean,valid,formatCNIC,TYPES,ENDPOINT};return;}
  const form=document.querySelector('[data-atl-form]'); if(!form)return;
  const typeSelect=form.elements.identifierType; const input=form.elements.identifier; const label=form.querySelector('[data-atl-label]');
  const help=form.querySelector('#atl-help'); const result=form.querySelector('[data-atl-result]'); const dateBox=form.querySelector('[data-atl-date]'); const button=form.querySelector('button[type="submit"]');
  const setMessage=(kind,title,text)=>{result.className='nn-simple-result'+(kind?' is-'+kind:''); result.innerHTML='<strong>'+esc(title)+'</strong><p class="nn-simple-note">'+esc(text)+'</p>';};
  const updateDate=()=>{dateBox.textContent=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Karachi'}).format(new Date())};
  const updateFields=()=>{const type=typeSelect.value;const cfg=TYPES[type];label.textContent=cfg.label;input.placeholder=cfg.placeholder;input.inputMode=cfg.inputMode;input.maxLength=20;help.textContent=cfg.help;input.value=type==='CNIC'?formatCNIC(input.value):clean(type,input.value);result.innerHTML='';result.className='nn-simple-result';};
  typeSelect.addEventListener('change',updateFields);
  input.addEventListener('input',()=>{const type=typeSelect.value;input.value=type==='CNIC'?formatCNIC(input.value):clean(type,input.value);});
  form.addEventListener('submit',async event=>{event.preventDefault();const type=typeSelect.value;
    if(PREVIEW_MODE){setMessage('warning','Live FBR lookup is unavailable in this preview','This preview runs on a third-party host, while the FBR endpoint accepts the NexusNova website origin. Open the NexusNova production site or the official FBR portal for a live status check.');return;}const id=clean(type,input.value);if(!valid(type,id)){setMessage('error','Check your input',type==='CNIC'?'Enter all 13 CNIC digits.':type==='NTN'?'Enter all 7 NTN digits.':'Enter a valid '+type+'.');input.focus();return;}button.disabled=true;button.textContent='Checking FBR…';setMessage('','Checking FBR','Contacting the official FBR verification service…');
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);let response;try{response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifierType:type,identifier:id}),signal:controller.signal});}finally{clearTimeout(timeout)}const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw new Error(data.error||'FBR verification is temporarily unavailable.');
      const status=data.status||'unknown';const title=status==='active'?'ACTIVE TAXPAYER':status==='late-filer'?'LATE FILER':status==='inactive'?'NOT ACTIVE / NON-ATL':status==='not-found'?'NO ATL RECORD':'FBR RESULT';
      setMessage(status==='active'?'success':status==='late-filer'?'warning':status==='inactive'||status==='not-found'?'error':'warning',title,data.statusText||'FBR returned a result.');
      result.innerHTML+='<div class="nn-atl-meta"><span>Type: '+esc(data.identifierType||type)+'</span><span>Checked: '+esc(new Date(data.checkedAt||Date.now()).toLocaleString())+'</span>'+(data.registrationNo?'<span>Registration: '+esc(data.registrationNo)+'</span>':'')+'</div>';
    }catch(error){setMessage('error',error?.name==='AbortError'?'Verification timed out':'Verification unavailable',error?.name==='AbortError'?'FBR did not respond within 12 seconds. Please try again or use the official FBR portal.':error.message||'FBR verification could not be completed right now. Please try again or use the official FBR portal.');}
    finally{button.disabled=false;button.textContent='Check FBR Status';}
  });
  updateDate();updateFields();
})();