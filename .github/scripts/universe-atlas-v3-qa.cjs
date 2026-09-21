const { chromium } = require('playwright');

(async()=>{
  const browser=await chromium.launch({
    headless:true,
    args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage']
  });
  const page=await browser.newPage({viewport:{width:412,height:915},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error') errors.push(m.text())});

  await page.goto('http://127.0.0.1:4173/universe-atlas.html',{waitUntil:'networkidle',timeout:30000});
  await page.locator('#loading').waitFor({state:'hidden',timeout:15000});

  if(await page.locator('#space').count()!==1) throw new Error('canvas missing');
  if(!(await page.title()).includes('NexusNova Universe Atlas')) throw new Error('title mismatch');
  if(await page.locator('#labels').count()!==1) throw new Error('label layer missing');

  await page.locator('#q').fill('Sirius');
  await page.locator('#find').click();
  await page.waitForTimeout(150);
  if(await page.locator('#panel.show').count()!==1) throw new Error('search panel failed');
  if(!(await page.locator('#pn').textContent()).includes('Sirius')) throw new Error('Sirius search failed');

  await page.locator('#inspect').click();
  await page.waitForTimeout(100);
  if(await page.locator('#inspector.show').count()!==1) throw new Error('3D inspector did not open');
  if(!(await page.locator('#inName').textContent()).includes('Sirius')) throw new Error('3D inspector selected object mismatch');

  await page.mouse.move(206,458);
  await page.mouse.down();
  await page.mouse.move(300,520,{steps:8});
  await page.mouse.up();
  await page.mouse.wheel(0,300);
  await page.waitForTimeout(100);

  await page.locator('#back').click();
  await page.waitForTimeout(100);
  if(await page.locator('#inspector.show').count()!==0) throw new Error('3D inspector did not close');

  await page.locator('#fit').click();
  if(!(await page.locator('#scale').textContent()).includes('SURVEY OVERVIEW')) throw new Error('fit mode failed');
  await page.setViewportSize({width:800,height:800});
  await page.locator('#local').click();
  if(!(await page.locator('#scale').textContent()).includes('LOCAL')) throw new Error('local mode failed');
  await page.locator('#home').click();
  if(!(await page.locator('#scale').textContent()).includes('MILKY WAY')) throw new Error('home mode failed');
  await page.setViewportSize({width:412,height:915});

  await page.locator('#gaia').click();
  await page.waitForTimeout(700);
  await page.locator('#exo').click();
  await page.waitForTimeout(700);

  if(errors.length) throw new Error('runtime/console errors: '+errors.join(' | '));
  console.log('UNIVERSE ATLAS V3 QA PASS');
  console.log(JSON.stringify({
    labels: await page.locator('.label').count(),
    selected: await page.locator('#pn').textContent(),
    scale: await page.locator('#scale').textContent(),
    mobile: true
  }));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
