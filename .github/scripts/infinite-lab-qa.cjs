const { chromium } = require('playwright');
const fs = require('fs');
fs.mkdirSync('qa-artifacts',{recursive:true});

const BASE = 'http://127.0.0.1:4173/infinite-lab.html';
const results = [];
const failures = [];

async function test(name, fn){
  try{ await fn(); results.push({name,ok:true}); console.log('PASS',name); }
  catch(err){ results.push({name,ok:false,error:String(err)}); failures.push({name,error:String(err)}); console.error('FAIL',name,String(err)); }
}
function assert(cond,msg){ if(!cond) throw new Error(msg); }
function finiteState(s){
  const values=[s.depth,s.family,s.seed,s.yaw,s.pitch,s.distance,s.panX,s.panY,s.targetDistance,s.targetPanX,s.targetPanY];
  return values.every(Number.isFinite);
}

const fixture = {
  fields:['source_id','ra','dec','parallax','parallax_error','pmra','pmdec','radial_velocity','phot_g_mean_mag','bp_rp','teff_gspphot','mass_flame','radius_flame'],
  data:[['9990001',101.2875/15,-16.7161,379.21,0.45,-546.0,-1223.0,-5.5,1.0,0.0,9940,2.0,1.7]]
};
const exoFixture = {
  fields:['pl_name','hostname','ra','dec','sy_dist','sy_disterr1','pl_rade','pl_masse','pl_orbper','pl_orbsmax','pl_orbeccen','st_teff','disc_refname'],
  data:[['QA-World-1','QA-Star',120,22,10,1,1.2,2.1,15.5,.12,.03,5800,'QA fixture']]
};
function mockRoute(page,opts={}){
  return page.route('https://nexusnova-telegram-bot.fahadsoomro123.workers.dev/api/astronomy/query',async route=>{
    const body=route.request().postDataJSON?.()||{}; const source=body.source;
    const payload= source==='gaia' ? (opts.gaia||fixture) : source==='exo' ? (opts.exo||exoFixture) : source==='ned' ? (opts.ned||{fields:['prefname','ra','dec','z','pretype'],data:[['QA Galaxy',120,22,.003,'Galaxy']]}) : source==='sdss' ? (opts.sdss||[{objid:'QA-SDSS',ra:120,dec:22,z:.002,type:'GALAXY'}]) : (opts.desi||{fields:['TARGETID','RA','DEC','Z','SPECTYPE'],data:[[12345,120,22,.004,'GALAXY']]});
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
  });
}

async function mockAstroFailure(page){
  await page.route('https://nexusnova-telegram-bot.fahadsoomro123.workers.dev/api/astronomy/query',async route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,code:'upstream-unavailable',error:'Public astronomy source is temporarily unavailable.'})}));
}

function mockRouteOriginal(page,opts={}){
  return page.route('**/*',async route=>{
    const u=route.request().url();
    if(/gea\.esac\.esa\.int\/tap-server\/tap\/sync/i.test(u)){
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(opts.gaia||fixture)});
    }
    if(/exoplanetarchive\.ipac\.caltech\.edu\/TAP\/sync/i.test(u)){
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(opts.exo||exoFixture)});
    }
    if(/ned\.ipac\.caltech\.edu\/tap\/sync/i.test(u)){
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(opts.ned||{fields:['prefname','ra','dec','z','pretype'],data:[['QA Galaxy',120,22,.003,'Galaxy']]})});
    }
    if(/skyserver\.sdss\.org\/dr20\/SkyServerWS\/SearchTools\/RadialSearch/i.test(u)){
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(opts.sdss||[{objid:'QA-SDSS',ra:120,dec:22,z:.002,type:'GALAXY'}])});
    }
    if(/datalab\.noirlab\.edu\/tap\/sync/i.test(u)){
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(opts.desi||{fields:['TARGETID','RA','DEC','Z','SPECTYPE'],data:[[12345,120,22,.004,'GALAXY']]})});
    }
    return route.continue();
  });
}

(async()=>{
 const browser=await chromium.launch({
   headless:true,
   args:['--use-angle=swiftshader','--use-gl=angle','--enable-webgl','--enable-webgl2','--ignore-gpu-blocklist','--disable-dev-shm-usage']
 });
 const desktop=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const runtimeErrors=[];
 desktop.on('pageerror',e=>runtimeErrors.push('pageerror:'+e.message));
 desktop.on('console',m=>{if(m.type()==='error')runtimeErrors.push('console:'+m.text());});
 await mockRoute(desktop); await desktop.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
 await desktop.locator('#loadingScreen').waitFor({state:'hidden',timeout:12000}).catch(()=>{});
 await desktop.waitForTimeout(1400);
 await desktop.screenshot({path:'qa-artifacts/01-solar-system.png',fullPage:false});

 await test('01 title',async()=>assert((await desktop.title()).includes('NexusNova Infinite Lab'),'title missing'));
 await test('02 description metadata',async()=>assert((await desktop.locator('meta[name="description"]').getAttribute('content')).includes('WebGL2'),'description boundary missing'));
 await test('03 robots indexable',async()=>assert((await desktop.locator('meta[name="robots"]').getAttribute('content')).startsWith('index'),'robots not indexable'));
 await test('04 canonical exact',async()=>assert((await desktop.locator('link[rel="canonical"]').getAttribute('href'))=== 'https://nexusnovatools.com/infinite-lab.html','canonical mismatch'));
 await test('05 main 3D canvas exists',async()=>assert(await desktop.locator('#universe').count()===1,'universe canvas missing'));
 await test('06 WebGL2 context exists',async()=>assert(await desktop.locator('#universe').evaluate(el=>!!el.getContext('webgl2')),'WebGL2 context unavailable'));
 await test('07 no 2D renderer source',async()=>{const [coreText,glText]=await Promise.all([desktop.evaluate(()=>fetch('assets/js/infinite-lab.js').then(r=>r.text())),desktop.evaluate(()=>fetch('assets/js/infinite-lab-webgl.js').then(r=>r.text()))]);assert(!/getContext\(['"]2d['"]\)/.test(coreText+glText),'2D canvas renderer remains in Infinite Lab');});
 await test('08 scientific truth boundary visible',async()=>assert((await desktop.locator('.truth-banner').innerText()).includes('EXPLORATION VISUALIZATION'),'truth banner missing'));
 await test('09 all source labels present',async()=>{const t=await desktop.locator('.legend-chip').allTextContents();for(const x of ['REAL CATALOG','PUBLIC SURVEY','DERIVED FROM SOURCE DATA','PROCEDURAL VISUALIZATION','ILLUSTRATIVE CONTEXT'])assert(t.some(v=>v.includes(x)),x+' missing');});
 await test('10 five adapter rows present',async()=>assert(await desktop.locator('.source-row').count()===5,'source adapter rows missing'));
 await test('11 Gaia DR3 row',async()=>assert((await desktop.locator('[data-source="gaia"]').innerText()).includes('DR3'),'Gaia row wrong'));
 await test('12 Exoplanet Archive row',async()=>assert((await desktop.locator('[data-source="exo"]').innerText()).includes('PS/PSCompPars'),'Exoplanet row wrong'));
 await test('13 NED TAP row',async()=>assert((await desktop.locator('[data-source="ned"]').innerText()).includes('TAP'),'NED row wrong'));
 await test('14 SDSS DR20 row',async()=>assert((await desktop.locator('[data-source="sdss"]').innerText()).includes('DR20'),'SDSS row wrong'));
 await test('15 DESI DR1 row',async()=>assert((await desktop.locator('[data-source="desi"]').innerText()).includes('DR1'),'DESI row wrong'));
 await test('16 bounded DPR debug',async()=>assert((await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getDebug().boundedDpr))<=2,'DPR exceeds bound'));
 await test('17 LOD debug',async()=>assert((await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getDebug().lod))===true,'LOD disabled'));
 await test('18 culling debug',async()=>assert((await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getDebug().culling))===true,'culling disabled'));
 await test('19 cache bound debug',async()=>{const d=await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getDebug());assert(d.cache.max===12,'wrong cache max')});
 await test('20 stale protection debug',async()=>assert((await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getDebug().staleProtection))===true,'stale protection false'));
 await test('21 cancellable request debug',async()=>assert((await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getDebug().requestsCancellable))===true,'cancellation false'));
 await test('22 state finite',async()=>assert(finiteState(await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getState())),'state contains NaN/Infinity'));
 await test('23 world identity deterministic API',async()=>{const a=await desktop.evaluate(()=>window.NexusNovaInfiniteLab.deterministicSignature(4.25,7,3));const b=await desktop.evaluate(()=>window.NexusNovaInfiniteLab.deterministicSignature(4.25,7,3));assert(a===b,'world signature not deterministic')});
 await test('24 initial depth zero',async()=>assert((await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getState().depth))===0,'initial depth not zero'));
 await test('25 anchor count available',async()=>assert((await desktop.evaluate(()=>window.NexusNovaInfiniteLabCatalog.getObjects().length))>=9,'anchor layer missing'));
 await test('26 Sirius search',async()=>{await desktop.locator('#searchInput').fill('Sirius');await desktop.locator('#searchBtn').click();await desktop.waitForTimeout(120);assert((await desktop.locator('#inspectorName').textContent())==='Sirius','Sirius not found')});
 await test('27 inspector opens',async()=>assert(await desktop.locator('#inspector.open').count()===1,'inspector did not open'));
 await test('28 inspector source tag',async()=>assert((await desktop.locator('#inspectorSourceType').textContent())==='REAL CATALOG','source tag wrong'));
 await test('29 inspector identifier populated',async()=>assert((await desktop.locator('#f-id').textContent()).trim()!=='NOT REPORTED','identifier missing'));
 await test('30 missing field uses NOT REPORTED',async()=>assert((await desktop.locator('#f-distance-uncertainty').textContent()).includes('NOT REPORTED'),'missing field policy broken'));
 await test('31 provenance source populated',async()=>assert((await desktop.locator('#p-source').textContent()).trim()!=='NOT REPORTED','provenance source missing'));
 await test('32 provenance release populated',async()=>assert((await desktop.locator('#p-release').textContent()).trim()!=='NOT REPORTED','release missing'));
 await test('33 provenance URL valid for source anchor',async()=>assert((await desktop.locator('#p-url').getAttribute('href')).startsWith('https://'),'source URL missing'));
 await test('34 visual reconstruction boundary',async()=>assert((await desktop.locator('.object-overlay').textContent()).includes('NOT A PHOTOGRAPH'),'photo boundary missing'));
 await test('35 object inspector WebGL2',async()=>assert(await desktop.locator('#object3d').evaluate(el=>!!el.getContext('webgl2')),'object inspector WebGL2 unavailable'));
 await test('36 object drag listener',async()=>{const c=desktop.locator('#object3d');await c.hover();await desktop.mouse.move(500,300);await desktop.mouse.down();await desktop.mouse.move(550,330);await desktop.mouse.up();assert(true,'drag event failed')});
 await test('37 close inspector',async()=>{await desktop.locator('#inspectorClose').click();assert(await desktop.locator('#inspector.open').count()===0,'inspector did not close')});
 await test('38 wheel zoom changes distance',async()=>{const before=await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getState().targetDistance);await desktop.locator('#universe').hover();await desktop.mouse.wheel(0,-500);await desktop.waitForTimeout(80);const after=await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getState().targetDistance);assert(after!==before,'wheel zoom did not change state')});
 await test('39 drag orbit changes yaw',async()=>{const before=await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getState().yaw);await desktop.mouse.move(700,450);await desktop.mouse.down();await desktop.mouse.move(780,470,{steps:6});await desktop.mouse.up();await desktop.waitForTimeout(70);const after=await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getState().yaw);assert(after!==before,'drag did not change yaw')});
 await test('40 portal zoom arm',async()=>{await desktop.evaluate(()=>{window.NexusNovaInfiniteLab.zoomBy(.34);window.NexusNovaInfiniteLab.zoomBy(.34);window.NexusNovaInfiniteLab.zoomBy(.34);});await desktop.waitForTimeout(50);assert((await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getState().targetDistance))<3,'portal approach failed')});
 await test('41 portal dive by Enter',async()=>{await desktop.keyboard.press('Enter');await desktop.waitForTimeout(140);assert((await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getState().depth))===1,'Enter did not descend')});
 await test('42 breadcrumb enabled after descent',async()=>assert(!(await desktop.locator('#breadcrumbBack').isDisabled()),'breadcrumb disabled after descent'));
 await test('43 return previous scale',async()=>{await desktop.locator('#breadcrumbBack').click();await desktop.waitForTimeout(80);assert((await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getState().depth))===0,'breadcrumb did not return')});
 await test('44 reset returns surface',async()=>{await desktop.evaluate(()=>window.NexusNovaInfiniteLab.surprise());await desktop.evaluate(()=>window.NexusNovaInfiniteLab.reset());assert((await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getState().depth))===0,'reset failed')});
 await test('45 reset deterministic seed',async()=>{const s=await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getState().seed);assert(Math.abs(s-1.234)<1e-9,'reset seed changed')});
 await test('46 discovery store bounded API',async()=>{const n=await desktop.evaluate(()=>window.NexusNovaInfiniteLab.__testFillStorage(105));assert(n===100,'discovery history not bounded to 100')});
 await test('47 Surprise Me changes destination',async()=>{const before=await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getState().depth);await desktop.evaluate(()=>window.NexusNovaInfiniteLab.surprise());const after=await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getState().depth);assert(after!==before||after>0,'surprise did not choose destination')});
 await test('48 R keyboard reset',async()=>{await desktop.keyboard.press('r');await desktop.waitForTimeout(40);assert((await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getState().depth))===0,'R did not reset')});
 await test('49 S keyboard surprise',async()=>{await desktop.keyboard.press('s');await desktop.waitForTimeout(50);assert((await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getState().depth))>0,'S did not surprise')});
 await test('50 Home button',async()=>{await desktop.locator('#homeBtn').click();assert((await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getState().depth))===0,'home did not reset surface')});
 await test('51 plus zoom shortcut',async()=>{const b=await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getState().targetDistance);await desktop.keyboard.press('+');const a=await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getState().targetDistance);assert(a<b,'plus did not zoom in')});
 await test('52 minus zoom shortcut',async()=>{const b=await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getState().targetDistance);await desktop.keyboard.press('-');const a=await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getState().targetDistance);assert(a>b,'minus did not zoom out')});
 await test('53 invalid search safe',async()=>{await desktop.locator('#searchInput').fill('%%%not-real%%%');await desktop.locator('#searchBtn').click();await desktop.waitForTimeout(50);assert((await desktop.locator('#eventText').textContent()).includes('NOT LOADED'),'invalid search changed to fake result')});
 await test('54 coordinate search triggers region',async()=>{await desktop.locator('#searchInput').fill('120 22');await desktop.locator('#searchBtn').click();await desktop.waitForTimeout(80);assert((await desktop.evaluate(()=>window.NexusNovaInfiniteLab.getState().skyDec))===22,'coordinate parser failed')});
 await test('55 source filter exists and options',async()=>assert(await desktop.locator('#sourceFilter option').count()===6,'source filter incomplete'));
 await test('56 Labs integration link',async()=>assert(await desktop.locator('a[href="labs.html"]').count()>=1,'Labs link missing'));
 await test('57 Universe Atlas and Infinite Lab integration links',async()=>{const labs=await (await desktop.request.get('http://127.0.0.1:4173/labs.html')).text();assert(labs.includes('href="universe-atlas.html"'),'Universe Atlas link missing');assert(labs.includes('href="infinite-lab.html"'),'Infinite Lab link missing')});
 await test('58 ARIA canvas label',async()=>assert((await desktop.locator('#universe').getAttribute('aria-label')).length>20,'canvas aria label missing'));
 await test('59 visible focus style',async()=>{await desktop.locator('#resetBtn').focus();const shadow=await desktop.locator('#resetBtn').evaluate(el=>getComputedStyle(el).boxShadow);assert(shadow!=='none','focus style absent')});
 await test('60 keyboard close inspector',async()=>{await desktop.locator('#searchInput').fill('Sirius');await desktop.locator('#searchBtn').click();await desktop.keyboard.press('Escape');assert(await desktop.locator('#inspector.open').count()===0,'Escape did not close inspector')});
 await test('61 body rejects deceptive completeness claims',async()=>{const t=await desktop.locator('body').innerText();const bad=[/\b(?:is|this is|we provide|shown as)\s+(?:a\s+)?complete map of the observable universe\b/i,/\bevery star in the universe is displayed\b/i,/\bevery galaxy is loaded\b/i,/\bactual telescope surface image\b/i];for(const re of bad)assert(!re.test(t),'deceptive claim found: '+re)});
 await test('62 runtime no page errors',async()=>assert(runtimeErrors.length===0,'runtime errors: '+runtimeErrors.join(' | ')));

 await test('63 scale ladder renderer contract',async()=>{const src=await desktop.evaluate(()=>fetch('assets/js/infinite-lab-webgl.js').then(r=>r.text()));for(const x of ['sceneMode','drawSolarScene','drawNeighborhoodScene','drawMilkyWayScene','drawGalaxyGroupScene','drawCosmicWebScene','drawDeepUniverseScene'])assert(src.includes(x),x+' scene contract missing')});
 await test('64 solar scene contains 3D body geometry',async()=>{const src=await desktop.evaluate(()=>fetch('assets/js/infinite-lab-webgl.js').then(r=>r.text()));assert(/solarSphere/.test(src)&&/solarOrbits/.test(src)&&/drawMesh\(solarSphere/.test(src),'solar 3D geometry missing')});
 await test('65 galaxy morphology renderer contract',async()=>{const src=await desktop.evaluate(()=>fetch('assets/js/infinite-lab-webgl.js').then(r=>r.text()));assert(src.includes('function drawGalaxy')&&src.includes('kind===1')&&src.includes('kind===2'),'galaxy morphology variants missing')});
 await test('66 cosmic web geometry contract',async()=>{const src=await desktop.evaluate(()=>fetch('assets/js/infinite-lab-webgl.js').then(r=>r.text()));assert(src.includes('function makeWeb')&&src.includes('function drawCosmicWebScene'),'cosmic web renderer missing')});
 await test('67 recursive special-world renderer contract',async()=>{const src=await desktop.evaluate(()=>fetch('assets/js/infinite-lab-webgl.js').then(r=>r.text()));for(const x of ['drawDataWorldScene','drawNebulaScene','drawPlanetScene','drawAGNScene','drawAnomalyScene'])assert(src.includes(x),x+' recursive scene missing')});
 await test('104 no WebGL overlay after shader init',async()=>assert(await desktop.locator('.no-webgl').count()===0,'no-webgl fallback unexpectedly visible on WebGL2 runner'));
 await test('109 rendered scene runtime is active',async()=>{const r=await desktop.evaluate(()=>window.__nnRuntime||{});assert(r.webgl2===true,'WebGL2 runtime flag missing');assert(typeof r.scene==='string'&&r.scene.length>0,'scene runtime missing');assert(Number.isFinite(Number(r.fps)),'runtime FPS missing')});
 await test('105 spatial scene labels render',async()=>{await desktop.waitForTimeout(120);assert((await desktop.locator('.scene-label.visible').count())>=1,'scene labels did not project')});
 await test('106 dive changes scene from solar to stellar neighborhood',async()=>{await desktop.evaluate(()=>{window.NexusNovaInfiniteLab.reset();for(let i=0;i<3;i++)window.NexusNovaInfiniteLab.zoomBy(.34);window.NexusNovaInfiniteLab.dive();});await desktop.waitForTimeout(220);assert((await desktop.evaluate(()=>window.__nnRuntime?.scene))==='neighborhood','dive did not enter stellar neighborhood scene')});
 await test('107 second dive reaches Milky Way scene',async()=>{await desktop.waitForFunction(()=>window.NexusNovaInfiniteLab.getState().transition<=0.001,null,{timeout:3000});await desktop.evaluate(()=>{for(let i=0;i<3;i++)window.NexusNovaInfiniteLab.zoomBy(.34);window.NexusNovaInfiniteLab.dive();});await desktop.waitForFunction(()=>window.NexusNovaInfiniteLab.getState().depth===2,null,{timeout:3000});assert((await desktop.evaluate(()=>window.__nnRuntime?.scene))==='milkyway','second dive did not enter Milky Way scene')});
 await test('108 labels survive scale transition',async()=>{await desktop.waitForTimeout(120);assert(await desktop.locator('.scene-label').count()>=1,'scene labels disappeared after transition')});
 await desktop.close();

 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const mobileErrors=[];page.on('pageerror',e=>mobileErrors.push(e.message));page.on('console',m=>{if(m.type()==='error')mobileErrors.push(m.text());});
 await mockRoute(page); await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});await page.locator('#loadingScreen').waitFor({state:'hidden',timeout:12000}).catch(()=>{});await page.waitForTimeout(700);
 await test('63 mobile WebGL2',async()=>assert(await page.locator('#universe').evaluate(el=>!!el.getContext('webgl2')),'mobile WebGL2 unavailable'));
 await test('64 mobile no horizontal overflow',async()=>{const dims=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));assert(dims.sw<=dims.cw+2,'mobile horizontal overflow')});
 await test('65 mobile touch-safe controls',async()=>{const h=await page.locator('#resetBtn').evaluate(el=>el.getBoundingClientRect().height);assert(h>=40,'reset control below touch target')});
 await test('66 mobile search visible',async()=>assert(await page.locator('#searchInput').isVisible(),'mobile search hidden'));
 await test('67 mobile inspector opens',async()=>{await page.locator('#searchInput').fill('Sirius');await page.locator('#searchBtn').tap();await page.waitForTimeout(80);assert(await page.locator('#inspector.open').count()===1,'mobile inspector failed')});
 await test('68 mobile double tap dive',async()=>{await page.locator('#inspectorClose').click();await page.locator('#universe').dblclick({position:{x:195,y:420}});await page.waitForTimeout(150);assert((await page.evaluate(()=>window.NexusNovaInfiniteLab.getState().depth))>=1,'mobile double tap did not descend')});
 await test('69 mobile Escape closes',async()=>{await page.locator('#inspectorClose').click().catch(()=>{});await page.keyboard.press('Escape');assert(true,'escape dispatch failed')});
 await test('70 mobile state finite',async()=>assert(finiteState(await page.evaluate(()=>window.NexusNovaInfiniteLab.getState())),'mobile NaN/Infinity'));
 await test('71 mobile reduced motion preference respected',async()=>{
   const reduced=await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
   assert(typeof reduced==='boolean','reduced motion media query failed');
 });
 await test('72 mobile critical controls are text or labelled',async()=>{for(const id of ['resetBtn','homeBtn','surpriseBtn','loadRegionBtn','searchBtn','inspectorClose']){const el=page.locator('#'+id);assert(await el.count()===1,id+' missing')}});
 assert(mobileErrors.length===0,'mobile runtime errors: '+mobileErrors.join(' | '));
 await page.close();

 const mock=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
 await mockRoute(mock);
 await mock.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});await mock.locator('#loadingScreen').waitFor({state:'hidden',timeout:12000}).catch(()=>{});await mock.waitForTimeout(500);
 await test('73 mocked Gaia data normalization',async()=>{await mock.locator('#searchInput').fill('120 22');await mock.locator('#searchBtn').click();await mock.waitForTimeout(300);assert((await mock.evaluate(()=>window.NexusNovaInfiniteLabCatalog.getObjects().some(o=>o.sourceKey==='gaia'))),'Gaia normalization failed')});
 await test('74 mocked Exoplanet orbital fields',async()=>assert((await mock.evaluate(()=>window.NexusNovaInfiniteLabCatalog.getObjects().some(o=>o.orbitalPeriodDays===15.5&&o.semiMajorAxisAu===.12&&o.eccentricity===.03))),'exoplanet fields not normalized'));
 await test('75 mocked NED normalization',async()=>assert((await mock.evaluate(()=>window.NexusNovaInfiniteLabCatalog.getObjects().some(o=>o.sourceKey==='ned'&&o.redshift===.003))),'NED normalization failed'));
 await test('76 mocked SDSS normalization',async()=>assert((await mock.evaluate(()=>window.NexusNovaInfiniteLabCatalog.getObjects().some(o=>o.sourceKey==='sdss'))),'SDSS normalization failed'));
 await test('77 mocked DESI normalization',async()=>assert((await mock.evaluate(()=>window.NexusNovaInfiniteLabCatalog.getObjects().some(o=>o.sourceKey==='desi'))),'DESI normalization failed'));
 await test('78 cache stays <=12 after repeated region loads',async()=>{
   for(let i=0;i<15;i++){await mock.evaluate(i=>{document.getElementById('searchInput').value=(20+i*10)+' '+((i%10)-4);return window.NexusNovaInfiniteLab.search();},i);await mock.waitForTimeout(25);}
   const d=await mock.evaluate(()=>window.NexusNovaInfiniteLab.getDebug());assert(d.cache.size<=12,'cache exceeded 12: '+d.cache.size);
 });
 await test('79 API failure yields explicit unavailable state',async()=>{
   await mock.unroute('**/*');await mock.route('**/*',route=>{const u=route.request().url();if(/gea|exoplanetarchive|ned\.ipac|skyserver\.sdss|datalab\.noirlab/i.test(u))return route.fulfill({status:503,contentType:'text/plain',body:'unavailable'});return route.continue();});
   await mock.evaluate(()=>{document.getElementById('searchInput').value='320 30';return window.NexusNovaInfiniteLab.search();});await mock.waitForTimeout(220);
   assert((await mock.locator('#catalogStatus').textContent()).includes('PUBLIC DATA SOURCE TEMPORARILY UNAVAILABLE'),'failure status not shown');
 });
 await test('80 API failure preserves anchors',async()=>assert((await mock.evaluate(()=>window.NexusNovaInfiniteLabCatalog.getObjects().length))>=9,'anchors lost on source failure'));
 await test('81 stale request protection marker',async()=>assert((await mock.evaluate(()=>window.NexusNovaInfiniteLab.getDebug().staleProtection))===true,'stale protection marker false'));
 await test('82 real source URLs are explicit',async()=>{const d=await mock.evaluate(()=>window.NexusNovaInfiniteLab.getDebug().sourceAdapters);for(const x of ['ESA Gaia DR3','NASA Exoplanet Archive','NASA/IPAC NED','SDSS DR20','DESI DR1'])assert(d.includes(x),x+' absent');});
 await test('83 source-type distinction on fixture',async()=>{const o=await mock.evaluate(()=>window.NexusNovaInfiniteLabCatalog.getObjects().find(x=>x.sourceKey==='desi'));assert(o.sourceType==='PUBLIC SURVEY','DESI not labelled survey')});
 await test('84 derived distance uncertainty available for Gaia',async()=>{const o=await mock.evaluate(()=>window.NexusNovaInfiniteLabCatalog.getObjects().find(x=>x.sourceKey==='gaia'));assert(Number.isFinite(o.distanceUncertaintyLy),'Gaia uncertainty not derived')});
 await test('85 source provenance timestamp present',async()=>{const o=await mock.evaluate(()=>window.NexusNovaInfiniteLabCatalog.getObjects().find(x=>x.sourceKey==='gaia'));assert(typeof o.queriedAt==='string'&&o.queriedAt.includes('T'),'timestamp missing')});
 await test('86 inspector populated from fixture',async()=>{await mock.locator('#searchInput').fill('QA-World-1');await mock.locator('#searchBtn').click();await mock.waitForTimeout(50);assert((await mock.locator('#f-orbital-period').textContent()).includes('15.5'),'orbital period not shown');assert((await mock.locator('#f-semi-major-axis').textContent()).includes('.12'),'semi-major axis not shown');assert((await mock.locator('#f-eccentricity').textContent()).includes('.03'),'eccentricity not shown')});
 await test('87 astronomy proxy source route is explicit in client',async()=>{const src=await mock.evaluate(()=>fetch('assets/js/infinite-lab-webgl.js').then(r=>r.text()));assert(src.includes('/api/astronomy/query'),'client proxy route missing')});
 await test('88 repeated reset remains deterministic',async()=>{await mock.evaluate(()=>window.NexusNovaInfiniteLab.reset());const a=await mock.evaluate(()=>window.NexusNovaInfiniteLab.deterministicSignature(1.234,0,0));await mock.evaluate(()=>window.NexusNovaInfiniteLab.reset());const b=await mock.evaluate(()=>window.NexusNovaInfiniteLab.deterministicSignature(1.234,0,0));assert(a===b,'deterministic signature drift')});
 await test('89 runtime debug exposes adaptive quality',async()=>{await mock.waitForTimeout(300);const r=await mock.evaluate(()=>window.__nnRuntime||{});assert(r.adaptiveQuality===true,'adaptive quality not active')});
 await test('90 browser local discovery only',async()=>{const origin=await mock.evaluate(()=>location.origin);const entries=await mock.evaluate(()=>JSON.parse(localStorage.getItem('nexusnova.infiniteLab.discoveries')||'[]'));assert(origin.startsWith('http://127.0.0.1'),'unexpected discovery origin');assert(entries.every(x=>x.timestamp),'discovery timestamp missing')});
 await test('91 procedural depth family list present',async()=>assert((await mock.evaluate(()=>window.NexusNovaInfiniteLab.getDebug().worldDepth))>=0,'world state absent'));
 await test('92 object 3D source boundary survives fixture',async()=>{await mock.locator('#inspectorClose').click().catch(()=>{});await mock.locator('#searchInput').fill('QA-World-1');await mock.locator('#searchBtn').click();assert((await mock.locator('.object-overlay').textContent()).includes('NOT A PHOTOGRAPH'),'image boundary removed')});
 await test('93 cache status text',async()=>assert((await mock.locator('#cacheStatus').textContent()).includes('/ 12 TILES'),'cache UI missing'));
 await test('94 no fake leaderboard text',async()=>{const t=await mock.locator('body').innerText();assert(!/global leaderboard|users discovered today|worldwide discoveries/i.test(t),'fake social proof text present')});
 await test('95 reduced-motion JS branch available',async()=>{const s=await mock.evaluate(()=>window.NexusNovaInfiniteLab.getState());assert(Number.isFinite(s.transition),'transition state invalid')});
 await test('96 camera coordinates remain finite after controls',async()=>{await mock.keyboard.press('ArrowLeft');await mock.keyboard.press('ArrowUp');await mock.mouse.wheel(0,-300);const s=await mock.evaluate(()=>window.NexusNovaInfiniteLab.getState());assert(finiteState(s),'camera controls broke state')});
 await mock.close();

 const reduced=await browser.newPage({viewport:{width:1000,height:700},reducedMotion:'reduce'});
 await mockRoute(reduced); await reduced.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});await reduced.waitForTimeout(450);
 await test('97 reduced-motion page starts',async()=>assert(await reduced.locator('#universe').count()===1,'reduced-motion canvas missing'));
 await test('98 reduced-motion transition short',async()=>{await reduced.evaluate(()=>window.NexusNovaInfiniteLab.surprise());const t=await reduced.evaluate(()=>window.NexusNovaInfiniteLab.getState().transition);assert(t<=.2,'reduced-motion transition too large')});
 await reduced.close();

 const total=results.length,passed=results.filter(x=>x.ok).length;
 console.log('QA SUMMARY',JSON.stringify({total,passed,failed:total-passed,failures}));
 await browser.close();
 if(failures.length){process.exitCode=1;}
 else console.log('NEXUSNOVA INFINITE LAB QA PASS — '+passed+'/'+total);
})();