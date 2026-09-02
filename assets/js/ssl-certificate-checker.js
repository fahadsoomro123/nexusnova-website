(()=>{
  const form=document.querySelector('[data-ssl-form]');
  const input=document.querySelector('[data-ssl-host]');
  const status=document.querySelector('[data-ssl-status]');
  const result=document.querySelector('[data-ssl-result]');
  if(!form||!input||!status||!result)return;

  const normalizeHost=value=>{
    let raw=String(value||'').trim().toLowerCase();
    if(!raw)throw new Error('Enter a domain name.');
    if(!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw))raw=`https://${raw}`;
    let url;try{url=new URL(raw)}catch{throw new Error('Enter a valid public domain, for example example.com.');}
    const host=url.hostname.replace(/\.$/,'');
    if(!host||host.length>253)throw new Error('Enter a valid public domain.');
    if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal')||host.endsWith('.home')||host.endsWith('.lan'))throw new Error('Local or internal hostnames are not supported.');
    if(/^\d+\.\d+\.\d+\.\d+$/.test(host))throw new Error('This public checker accepts domain names only, not direct IP addresses.');
    if(host.includes(':'))throw new Error('This public checker accepts domain names only, not direct IP addresses.');
    if(!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(host))throw new Error('Enter a public domain such as example.com.');
    return host;
  };
  const fmt=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'Unavailable':new Intl.DateTimeFormat('en-PK',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(d)+' UTC'};
  const daysRemaining=value=>{const t=new Date(value).getTime();if(!Number.isFinite(t))return null;return Math.ceil((t-Date.now())/86400000)};
  const addRow=(parent,label,value)=>{const row=document.createElement('span');const strong=document.createElement('strong');strong.textContent=`${label}: `;row.append(strong,document.createTextNode(String(value||'Unavailable')));parent.appendChild(row)};
  const render=(host,certificate)=>{
    result.replaceChildren();
    const remaining=daysRemaining(certificate.valid_to);const from=new Date(certificate.valid_from).getTime();
    const now=Date.now();let health='VALID';if(Number.isFinite(from)&&from>now)health='NOT YET VALID';else if(remaining!==null&&remaining<0)health='EXPIRED';else if(remaining!==null&&remaining<=30)health='EXPIRING SOON';
    const card=document.createElement('article');card.className='live-rate-card';
    const header=document.createElement('header');const h3=document.createElement('h3');h3.textContent=host;const badge=document.createElement('span');badge.className='live-code';badge.textContent=health;header.append(h3,badge);
    const strong=document.createElement('strong');strong.className='live-rate-value';strong.textContent=remaining===null?'Expiry unavailable':remaining<0?`${Math.abs(remaining)} days expired`:`${remaining} days remaining`;
    const unit=document.createElement('span');unit.className='live-rate-unit';unit.textContent='TLS certificate served on HTTPS port 443';
    const details=document.createElement('div');details.className='weather-details';
    addRow(details,'Issued to',certificate.issued_to);addRow(details,'Issued by',certificate.issued_by);addRow(details,'Valid from',fmt(certificate.valid_from));addRow(details,'Valid to',fmt(certificate.valid_to));addRow(details,'Serial',certificate.serial_number);addRow(details,'Fingerprint',certificate.fingerprint);
    const sans=Array.isArray(certificate.alternate_names)?certificate.alternate_names.map(value=>String(value).replace(/^DNS:/i,'')).slice(0,25):[];if(sans.length)addRow(details,'SANs',sans.join(', '));
    card.append(header,strong,unit,details);result.appendChild(card);
  };
  form.addEventListener('submit',async event=>{
    event.preventDefault();result.replaceChildren();status.classList.remove('is-error');
    let host;try{host=normalizeHost(input.value)}catch(error){status.textContent=error.message;status.classList.add('is-error');return}
    const submit=form.querySelector('button[type="submit"]');if(submit)submit.disabled=true;status.textContent=`Checking the TLS certificate currently served by ${host}…`;
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(`https://networkcalc.com/api/security/certificate/${encodeURIComponent(host)}`,{headers:{Accept:'application/json'},cache:'no-store',signal:controller.signal});
      const data=await response.json().catch(()=>null);
      if(!response.ok||data?.status!=='OK'||!data?.certificate)throw new Error(data?.message||data?.error||'Certificate lookup failed');
      render(host,data.certificate);status.textContent=`Real certificate response received for ${host} on port 443. Checked at ${new Intl.DateTimeFormat('en-PK',{dateStyle:'medium',timeStyle:'short'}).format(new Date())}.`;
    }catch(error){status.textContent=error?.name==='AbortError'?'Certificate lookup timed out. No certificate status was guessed.':'Certificate lookup is unavailable or the host did not return a usable certificate. No result was guessed.';status.classList.add('is-error')}
    finally{clearTimeout(timer);if(submit)submit.disabled=false}
  });
})();
