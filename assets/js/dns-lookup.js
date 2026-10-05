(()=>{
  const form=document.querySelector('[data-dns-form]'),nameInput=document.querySelector('[data-dns-name]'),typeInput=document.querySelector('[data-dns-type]'),status=document.querySelector('[data-dns-status]'),out=document.querySelector('[data-dns-results]');
  if(!form||!nameInput||!typeInput||!status||!out)return;
  const cleanName=value=>value.trim().toLowerCase().replace(/^https?:\/\//,'').split('/')[0].replace(/\.$/,'');
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  form.addEventListener('submit',async e=>{
    e.preventDefault();out.innerHTML='';const name=cleanName(nameInput.value),type=typeInput.value;
    if(!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(name)){status.textContent='Enter a valid domain name such as example.com.';return}
    status.textContent=`Looking up ${type} records for ${name}…`;
    try{
      const url=`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`;
      const r=await fetch(url,{headers:{Accept:'application/dns-json'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);const data=await r.json();
      if(data.Status!==0){status.textContent=`DNS resolver returned status ${data.Status}. No answer was displayed.`;return}
      const answers=Array.isArray(data.Answer)?data.Answer:[];status.textContent=answers.length?`${answers.length} DNS answer${answers.length===1?'':'s'} returned by Cloudflare 1.1.1.1.`:'No matching DNS answer was returned.';
      out.innerHTML=answers.map(a=>`<tr><td>${escape(a.name||name)}</td><td>${escape(type)}</td><td>${escape(a.TTL??'—')}</td><td><code>${escape(a.data??'—')}</code></td></tr>`).join('');
    }catch(err){status.textContent='DNS lookup could not be completed. No replacement result was invented.'}
  });
})();
