(()=>{
  const normalizeCNIC=value=>String(value??'').replace(/[^0-9]/g,'').slice(0,13);
  const isValidCNIC=value=>/^\d{13}$/.test(normalizeCNIC(value));
  const formatCNIC=value=>{const n=normalizeCNIC(value);if(n.length<6)return n;return n.replace(/^(\d{5})(\d{7})(\d{1})$/,'$1-$2-$3');};
  if(typeof module!=='undefined'&&module.exports){module.exports={normalizeCNIC,isValidCNIC,formatCNIC};return;}
  const form=document.querySelector('[data-atl-form]');
  if(!form)return;
  const input=form.elements.cnic;
  const result=form.querySelector('[data-atl-result]');
  const sms=form.querySelector('[data-atl-sms]');
  const official=form.querySelector('[data-atl-official]');
  const copyButton=form.querySelector('[data-atl-copy]');
  const render=()=>{
    const cnic=normalizeCNIC(input.value);
    input.value=formatCNIC(cnic);
    official.hidden=false;
    if(!isValidCNIC(cnic)){
      result.className='nn-simple-result is-error';
      result.textContent=cnic.length?'Enter all 13 CNIC digits.':'Enter your 13-digit CNIC.';
      sms.textContent='ATL '+cnic+' to 9966';
      return;
    }
    result.className='nn-simple-result';
    result.innerHTML='<span class="nn-simple-status">OFFICIAL CHECK REQUIRED</span><p class="nn-simple-note">Your CNIC format is valid. NexusNova does not guess or display an FBR status from local data. Complete the official FBR verification to get the current result.</p>';
    sms.textContent='ATL '+cnic+' to 9966';
  };
  input.addEventListener('input',render);
  form.addEventListener('submit',e=>{e.preventDefault();render();official.focus();});
  copyButton?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(sms.textContent);copyButton.textContent='Copied';setTimeout(()=>copyButton.textContent='Copy SMS',1200);}catch{copyButton.textContent='Select & copy';}});
  render();})();