(()=>{
  'use strict';
  const base=/\/(guides|articles|tech)\//.test(location.pathname)?'../':'';
  const profiles=[
    ['X','@NexusNovaTools','https://x.com/NexusNovaTools'],
    ['Facebook','NexusNovaTools','https://www.facebook.com/NexusNovaTools/'],
    ['Instagram','@nexusnovatools','https://www.instagram.com/nexusnovatools/'],
    ['Telegram','@NexusNovaTools','https://t.me/NexusNovaTools']
  ];
  const url='https://nexusnovatools.com'+(location.pathname==='/'?'':location.pathname)+location.search;
  const message='Check out NexusNova Tools — free browser utilities, Pakistan tools and practical guides: '+url;
  const mount=()=>{
    const footer=document.querySelector('.site-footer');
    if(footer&&!footer.querySelector('[data-social-links]')){
      const consoleEl=footer.querySelector('.footer-console');
      const brandColumn=consoleEl?.firstElementChild;
      if(brandColumn){
        const title=document.createElement('div');
        title.className='footer-title nn-social-title';
        title.dataset.socialLinks='';
        title.textContent='Follow NexusNova';
        const links=document.createElement('div');
        links.className='footer-links nn-social-links';
        links.setAttribute('aria-label','Official NexusNova social profiles');
        profiles.forEach(([name,handle,href])=>{
          const a=document.createElement('a');
          a.href=href;a.target='_blank';a.rel='me noopener noreferrer';a.textContent=`${name} · ${handle}`;
          links.appendChild(a);
        });
        brandColumn.append(title,links);
      }
    }
  };  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
