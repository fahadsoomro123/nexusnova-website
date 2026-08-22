(()=>{
  'use strict';
  if(window.__nexusNovaWebAssistant)return;window.__nexusNovaWebAssistant=true;
  const inSubdir=/\/(guides|articles)\//.test(location.pathname);const base=inSubdir?'../':'';
  const tools=[
    {keys:['compress image','compress photo','reduce image','smaller image','image size','photo size'],name:'Image Compressor',href:'image-compressor.html',desc:'Compress JPG, PNG or WebP in your browser.'},
    {keys:['resize image','resize photo','pixels','dimensions'],name:'Image Resizer',href:'image-resizer.html',desc:'Resize an image to exact pixel dimensions.'},
    {keys:['merge pdf','combine pdf','join pdf'],name:'Merge PDF',href:'merge-pdf.html',desc:'Combine multiple PDF files.'},
    {keys:['split pdf','extract pdf','separate pdf'],name:'Split PDF',href:'split-pdf.html',desc:'Split or extract PDF pages.'},
    {keys:['jpg to pdf','image to pdf','photo to pdf'],name:'JPG to PDF',href:'jpg-to-pdf.html',desc:'Turn images into a PDF.'},
    {keys:['qr','qr code'],name:'QR Code Generator',href:'qr-code-generator.html',desc:'Create a QR code for a URL or text.'},
    {keys:['emi','loan','installment','instalment'],name:'EMI Calculator',href:'emi-calculator.html',desc:'Estimate monthly loan installments.'},
    {keys:['bmi','body mass'],name:'BMI Calculator',href:'bmi-calculator.html',desc:'Calculate BMI from height and weight.'},
    {keys:['scientific','sin','cos','tan','logarithm','log ','square root'],name:'Scientific Calculator',href:'scientific-calculator.html',desc:'Use scientific math functions.'},
    {keys:['resume','cv','curriculum vitae'],name:'Resume Builder',href:'resume-builder.html',desc:'Build a clean resume in the browser.'},
    {keys:['pomodoro','focus timer','study timer'],name:'Pomodoro Timer',href:'pomodoro-timer.html',desc:'Run focused work and break sessions.'},
    {keys:['password strength','strong password','password check'],name:'Password Strength Checker',href:'password-strength-checker.html',desc:'Check password strength locally.'},
    {keys:['ai prompt','prompt builder','chatgpt prompt','gemini prompt'],name:'AI Prompt Builder',href:'ai-prompt-builder.html',desc:'Structure a clearer prompt for AI tools.'},
    {keys:['png to jpg'],name:'PNG to JPG',href:'png-to-jpg.html',desc:'Convert PNG images to JPG.'},
    {keys:['jpg to png'],name:'JPG to PNG',href:'jpg-to-png.html',desc:'Convert JPG images to PNG.'},
    {keys:['webp to jpg'],name:'WebP to JPG',href:'webp-to-jpg.html',desc:'Convert WebP images to JPG.'},
    {keys:['timestamp','unix time'],name:'Unix Timestamp Converter',href:'unix-timestamp-converter.html',desc:'Convert Unix timestamps and dates.'},
    {keys:['roman numeral'],name:'Roman Numeral Converter',href:'roman-numeral-converter.html',desc:'Convert numbers and Roman numerals.'},
    {keys:['color','hex','rgb'],name:'RGB / HEX Converter',href:'rgb-hex-converter.html',desc:'Convert RGB and HEX color values.'}
  ];
  const button=document.createElement('button');button.type='button';button.className='nova-assistant-button';button.textContent='Ask NOVA';button.setAttribute('aria-label','Open NOVA smart tool assistant');
  const panel=document.createElement('section');panel.className='nova-assistant-panel';panel.setAttribute('aria-label','NOVA smart tool assistant');panel.innerHTML=`<div class="nova-assistant-head"><div><strong>NOVA Assistant</strong><small>SMART TOOL FINDER</small></div><button class="nova-assistant-close" type="button" aria-label="Close">×</button></div><div class="nova-assistant-body" aria-live="polite"><div class="nova-msg">Tell me what you need to do — for example “compress my image”, “merge PDFs” or “make a QR code”. I’ll take you to the right NexusNova tool.</div></div><form class="nova-assistant-form"><input maxlength="160" autocomplete="off" aria-label="Ask NOVA" placeholder="What do you need?"><button type="submit" aria-label="Send">→</button></form>`;
  document.body.append(panel,button);const body=panel.querySelector('.nova-assistant-body');const input=panel.querySelector('input');
  const close=()=>{panel.classList.remove('open');button.setAttribute('aria-expanded','false')};const open=()=>{panel.classList.add('open');button.setAttribute('aria-expanded','true');setTimeout(()=>input.focus(),50)};
  button.addEventListener('click',()=>panel.classList.contains('open')?close():open());panel.querySelector('.nova-assistant-close').addEventListener('click',close);
  const add=(html,user=false)=>{const msg=document.createElement('div');msg.className=`nova-msg${user?' user':''}`;if(user)msg.textContent=html;else msg.innerHTML=html;body.appendChild(msg);body.scrollTop=body.scrollHeight};
  const findTool=text=>{const q=text.toLowerCase().replace(/\s+/g,' ').trim();return tools.map(tool=>({tool,score:tool.keys.reduce((n,key)=>n+(q.includes(key)?key.length:0),0)})).sort((a,b)=>b.score-a.score)[0]};
  panel.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const text=input.value.trim();if(!text)return;add(text,true);input.value='';const match=findTool(text);if(match?.score>0){const {tool}=match;const href=`${base}${tool.href}`;add(`<strong>${tool.name}</strong><br>${tool.desc}<br><a href="${href}">Open ${tool.name} →</a>`);try{window.gtag?.('event','assistant_tool_match',{tool_name:tool.name})}catch{}}else add(`I couldn't match that exactly. Try PDF, image, calculator, QR, resume, password or productivity. <a href="${base}trending-tools.html">Browse all tools →</a>`)});
})();
