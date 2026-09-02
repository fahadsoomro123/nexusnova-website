(()=>{
  const button=document.querySelector('[data-ip-check]');
  const copy=document.querySelector('[data-ip-copy]');
  const status=document.querySelector('[data-ip-status]');
  const result=document.querySelector('[data-ip-result]');
  if(!button||!copy||!status||!result)return;

  let lastIp='';
  const isIPv4=value=>{const parts=String(value).split('.');return parts.length===4&&parts.every(part=>/^\d{1,3}$/.test(part)&&Number(part)>=0&&Number(part)<=255)};
  const isIPv6=value=>String(value).includes(':')&&/^[0-9a-f:]+$/i.test(String(value));
  const validIp=value=>isIPv4(value)||isIPv6(value);
  const fetchIp=async url=>{
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
    try{const response=await fetch(url,{headers:{Accept:'application/json'},cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error(`HTTP ${response.status}`);const data=await response.json();if(!validIp(data?.ip))throw new Error('Invalid IP response');return String(data.ip)}finally{clearTimeout(timer)}
  };
  const render=(primary,ipv4)=>{
    result.replaceChildren();
    const card=document.createElement('article');card.className='live-rate-card';
    const header=document.createElement('header');const h3=document.createElement('h3');h3.textContent='Your public IP';const type=document.createElement('span');type.className='live-code';type.textContent=isIPv6(primary)?'IPv6':'IPv4';header.append(h3,type);
    const strong=document.createElement('strong');strong.className='live-rate-value';strong.textContent=primary;
    const unit=document.createElement('span');unit.className='live-rate-unit';unit.textContent='Detected by api64.ipify.org after your click';
    const details=document.createElement('div');details.className='weather-details';
    if(ipv4&&ipv4!==primary){const v4=document.createElement('span');v4.textContent=`IPv4 endpoint: ${ipv4}`;details.appendChild(v4)}
    const privacy=document.createElement('span');privacy.textContent='No location or ISP lookup performed by NexusNova';details.appendChild(privacy);
    card.append(header,strong,unit,details);result.appendChild(card);
    lastIp=primary;copy.disabled=false;
  };
  button.addEventListener('click',async()=>{
    button.disabled=true;copy.disabled=true;lastIp='';result.replaceChildren();status.textContent='Checking the public address your browser is using…';status.classList.remove('is-error');
    try{
      const primary=await fetchIp('https://api64.ipify.org?format=json');
      let ipv4='';try{ipv4=await fetchIp('https://api.ipify.org?format=json')}catch{}
      render(primary,ipv4);status.textContent='Public IP detected. The lookup ran only after you pressed the button.';
    }catch{status.textContent='Public IP lookup is temporarily unavailable. NexusNova did not guess an address.';status.classList.add('is-error')}
    finally{button.disabled=false}
  });
  copy.addEventListener('click',async()=>{if(!lastIp)return;try{await navigator.clipboard.writeText(lastIp);copy.textContent='Copied';setTimeout(()=>copy.textContent='Copy IP',1200)}catch{status.textContent='Copy was blocked by your browser. Select the IP manually.'}});
})();
