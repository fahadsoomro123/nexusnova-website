const { chromium } = require('playwright');
const fs = require('node:fs');

const base = process.env.ATLAS_URL || 'http://127.0.0.1:4173/universe-atlas.html';
const cases = [
  {w:1440,h:900,mobile:false,t:'desktop-wide'},
  {w:1280,h:720,mobile:false,t:'desktop'},
  {w:1024,h:768,mobile:false,t:'tablet-landscape'},
  {w:820,h:1180,mobile:true,t:'tablet-portrait'},
  {w:768,h:1024,mobile:true,t:'tablet-small'},
  {w:600,h:960,mobile:true,t:'phone-large'},
  {w:540,h:960,mobile:true,t:'phone'},
  {w:480,h:900,mobile:true,t:'phone-medium'},
  {w:432,h:900,mobile:true,t:'android'},
  {w:412,h:915,mobile:true,t:'android-xl'},
  {w:390,h:844,mobile:true,t:'android'},
  {w:375,h:812,mobile:true,t:'iphone'},
  {w:360,h:800,mobile:true,t:'small-phone'},
  {w:320,h:720,mobile:true,t:'small-phone-legacy'},
  {w:1440,h:900,mobile:false,t:'final-desktop-repeat'}
];

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function assert(ok,msg){if(!ok)throw new Error(msg);}

(async()=>{
  const browser=await chromium.launch({headless:true,args:[
    '--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage'
  ]});
  const results=[];
  for(let pass=0;pass<cases.length;pass++){
    const c=cases[pass];
    const context=await browser.newContext({viewport:{width:c.w,height:c.h},isMobile:c.mobile,hasTouch:c.mobile,deviceScaleFactor:1});
    const page=await context.newPage();
    const errors=[]; page.on('pageerror',e=>errors.push(String(e))); page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
    await sleep(700);
    await page.evaluate(()=>document.fonts?.ready);
    assert(await page.locator('#c').count()===1,'canvas missing');
    assert((await page.title()).includes('NexusNova Universe Atlas'),'title wrong');
    const glOk=await page.evaluate(()=>{const c=document.querySelector('#c'); try{return !!c.getContext('webgl');}catch(e){return false}});
    const fallbackVisible=await page.evaluate(()=>{const e=document.querySelector('#fallback');return !!e && getComputedStyle(e).display!=='none'});
    const png=await page.screenshot({type:'png'});
    assert(png.length>6000,'rendered screenshot unexpectedly tiny');
    assert(glOk||fallbackVisible,'neither WebGL nor visible fallback active');

    const labels=await page.locator('.label').count();
    if(glOk) assert(labels>=3,'too few interactive labels in WebGL mode');

    await page.locator('#q').fill('Sirius');
    await page.locator('#find').click();
    await sleep(250);
    assert(await page.locator('#panel.show').count()===1,'search selection panel did not open');
    assert((await page.locator('#pn').textContent()).includes('Sirius'),'Sirius selection wrong');
    await page.locator('#close').click();

    const before=await page.locator('#scale').textContent();
    await page.mouse.wheel(0,700); await sleep(100);
    const after=await page.locator('#scale').textContent();
    assert(before!==after || glOk,'zoom interaction did not produce state/render activity');

    await page.locator('#local').click(); await sleep(80);
    assert((await page.locator('#scale').textContent()).includes('LOCAL'),'local mode failed');
    await page.locator('#home').click(); await sleep(80);
    assert((await page.locator('#scale').textContent()).includes('MILKY WAY'),'home mode failed');

    await page.locator('#solar').click(); await sleep(120);
    assert((await page.locator('#scale').textContent()).includes('SOLAR SYSTEM'),'solar mode failed');
    await page.locator('#solar').click(); await sleep(100);
    assert((await page.locator('#scale').textContent()).includes('MILKY WAY'),'solar exit failed');

    await page.locator('#gaia').click(); await sleep(500);
    assert(errors.filter(e=>!/Failed to load resource/i.test(e)).length===0,'unexpected JS/runtime error around Gaia: '+errors.join(' | '));

    await page.locator('#exo').click(); await sleep(500);
    assert(errors.filter(e=>!/Failed to load resource/i.test(e)).length===0,'unexpected JS/runtime error around exoplanets: '+errors.join(' | '));

    assert(await page.locator('body').isVisible(),'body invisible');
    assert(!(await page.locator('body').textContent()).includes('undefined'),'visible undefined text found');
    await context.close();
    results.push({pass:pass+1,viewport:c.t,gl:glOk,fallback:fallbackVisible,labels});
    console.log('PASS',pass+1,c.t,'gl=',glOk,'fallback=',fallbackVisible,'labels=',labels);
  }
  fs.writeFileSync('/tmp/universe-atlas-qa-results.json',JSON.stringify(results,null,2));
  await browser.close();
  console.log('ALL 15 RUNTIME QA PASSES PASSED');
})();
