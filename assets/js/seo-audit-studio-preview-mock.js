/* NexusNova review-preview API simulator.
   This file is copied only into the isolated review Pages branch. It never ships from main.
   All audits/reports below are synthetic demo data. No website is crawled and no payment runs. */
(function(){
  'use strict';
  if(window.location.hostname!=='review.nexusnova-seo-audit-studio-review.pages.dev')return;
  var REVIEW_HOST='review.nexusnova-seo-audit-studio-review.pages.dev';
  var REVIEW_WORKER_HOST='nexusnova-audit-studio-review.fahadsoomro123.workers.dev';
  var OWNER_DEMO_TOKEN='NN-REVIEW-DEMO-OWNER-TOKEN-2026-ONLY';
  var STATE_KEY='nn_review_mock_state_v1';
  var SESSION_KEY='nexusnova_audit_session_v1';
  var originalFetch=window.fetch.bind(window);
  function load(){
    try{return JSON.parse(sessionStorage.getItem(STATE_KEY)||'{}');}catch(e){return {};}
  }
  function save(s){
    try{sessionStorage.setItem(STATE_KEY,JSON.stringify(s));}catch(e){}
  }
  function uuid(){
    try{return crypto.randomUUID();}catch(e){return String(Date.now())+'-'+Math.random().toString(16).slice(2);}
  }
  function token(){
    var bytes=new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
  }
  function respond(data,status){
    return new Response(JSON.stringify(data),{status:status||200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Pragma':'no-cache'}});
  }
  function iso(days){
    return new Date(Date.now()+(days||0)*86400000).toISOString();
  }
  function safeUrl(value){
    try{
      var u=new URL(String(value||''));
      if(u.protocol!=='https:'&&u.protocol!=='http:')return '';
      if(!u.hostname||!u.hostname.includes('.'))return '';
      return u.href;
    }catch(e){return '';}
  }
  function reportData(url,auditId){
    var host='';
    try{host=new URL(url).hostname;}catch(e){host='example.com';}
    var recs=[
      {id:'meta-title',title:'Make the page title more specific',status:'fail',priority:'High',category:'On-Page SEO',message:'The sample title does not clearly communicate the page topic and value.',fix:'Write a unique title that describes the page and matches the primary search intent.',evidence:'Demo finding: title length and intent are represented with sample data.',device:'desktop'},
      {id:'meta-description',title:'Improve the meta description',status:'warn',priority:'High',category:'On-Page SEO',message:'The sample description could better explain what a visitor will find.',fix:'Write a distinct description that summarizes the page and gives users a clear reason to click.',evidence:'Demo finding: metadata evidence is simulated.',device:'mobile'},
      {id:'schema',title:'Check structured data coverage',status:'warn',priority:'Medium',category:'GEO readiness',message:'The sample page has incomplete structured-data coverage.',fix:'Add only schema types that accurately represent visible page content, then validate them.',evidence:'Demo finding: structured-data result is synthetic.',device:'desktop'},
      {id:'heading',title:'Keep the primary heading clear',status:'pass',priority:'Low',category:'On-Page SEO',message:'A clear primary heading helps users understand the page.',fix:'Keep one descriptive main heading and use a logical heading hierarchy.',evidence:'Sample heading hierarchy.',device:'desktop'},
      {id:'links',title:'Use descriptive internal-link text',status:'warn',priority:'Medium',category:'Links',message:'Some sample links use generic anchor wording.',fix:'Use concise anchor text that explains the destination without stuffing keywords.',evidence:'Sample anchor text assessment.',device:'desktop'},
      {id:'mobile',title:'Review narrow-screen spacing',status:'warn',priority:'Medium',category:'Usability',message:'The demo report flags an example mobile spacing issue.',fix:'Test navigation, buttons and content at narrow widths and keep tap targets easy to use.',evidence:'Synthetic mobile layout finding.',device:'mobile'},
      {id:'robots',title:'Confirm crawl directives',status:'pass',priority:'Low',category:'Technical SEO',message:'Crawl directives should match the intended indexation policy.',fix:'Check robots.txt and page-level robots directives before publishing.',evidence:'Sample crawl-directive check.',device:'desktop'},
      {id:'canonical',title:'Review canonical URL consistency',status:'warn',priority:'Medium',category:'Technical SEO',message:'The sample canonical setup needs a consistency check.',fix:'Use one preferred canonical URL per indexable page and ensure internal links agree.',evidence:'Synthetic canonical check.',device:'desktop'},
      {id:'images',title:'Add meaningful image alternatives',status:'warn',priority:'Low',category:'Usability',message:'Some sample content images lack useful alt text.',fix:'Write descriptive alt text for informative images and empty alt text for decorative images.',evidence:'Synthetic image accessibility check.',device:'mobile'},
      {id:'https',title:'Keep secure URL variants consistent',status:'pass',priority:'Low',category:'Technical SEO',message:'Use HTTPS and one preferred host consistently.',fix:'Redirect duplicate protocol and host variants to the preferred canonical URL.',evidence:'Sample redirect and URL policy check.',device:'desktop'},
      {id:'speed',title:'Review image weight and loading priority',status:'warn',priority:'High',category:'Performance',message:'Large media can slow the initial page render.',fix:'Resize and compress images, reserve dimensions, and lazy-load below-the-fold media.',evidence:'Synthetic performance recommendation; no live performance test was run.',device:'mobile'},
      {id:'content',title:'Strengthen useful page-specific content',status:'warn',priority:'Medium',category:'Content quality',message:'The sample page could answer visitor questions more directly.',fix:'Add original, accurate information that serves the page purpose and audience.',evidence:'Sample content-quality assessment.',device:'desktop'}
    ];
    var checks=[
      ['Page title is present','On-Page SEO','pass','A title element exists in this demo result.'],
      ['Title reflects page intent','On-Page SEO','warn','Synthetic check: title intent needs manual review.'],
      ['Meta description is present','On-Page SEO','warn','Synthetic metadata result.'],
      ['Exactly one primary heading','On-Page SEO','pass','Synthetic heading hierarchy result.'],
      ['Heading hierarchy is logical','On-Page SEO','pass','Synthetic structure result.'],
      ['Canonical URL is consistent','Technical SEO','warn','Synthetic canonical result.'],
      ['Robots directives are compatible','Technical SEO','pass','Synthetic crawl directive result.'],
      ['Internal anchors are descriptive','Links','warn','Synthetic anchor-text result.'],
      ['Broken internal links reviewed','Links','info','Not checked against the live site in demo mode.'],
      ['Structured data is relevant','GEO readiness','warn','Synthetic structured-data result.'],
      ['Image alternatives are useful','Usability','warn','Synthetic accessibility result.'],
      ['Tap targets are comfortable','Usability','pass','Synthetic mobile review.'],
      ['Main content is discoverable','Content quality','pass','Synthetic content result.'],
      ['Images are appropriately sized','Performance','warn','Synthetic media-weight result.'],
      ['Mobile layout is reviewed','Usability','warn','No real browser viewport audit was run.'],
      ['Desktop layout is reviewed','Usability','pass','Synthetic desktop review.'],
      ['HTTPS policy is consistent','Technical SEO','pass','Synthetic URL-policy result.'],
      ['Language attribute is set','Technical SEO','pass','Synthetic document metadata result.'],
      ['Open Graph metadata is complete','On-Page SEO','warn','Synthetic social metadata result.'],
      ['Indexability is appropriate','Technical SEO','pass','Synthetic indexability result.'],
      ['Page content is original and useful','Content quality','warn','Human editorial review is recommended.'],
      ['Performance field data is present','Performance','info','No live PageSpeed query is made in this preview.'],
      ['Mobile Core Web Vitals are measured','Performance','info','No live mobile measurement is made in this preview.'],
      ['Desktop Core Web Vitals are measured','Performance','info','No live desktop measurement is made in this preview.']
    ].map(function(x,i){return {id:'demo-check-'+(i+1),title:x[0],category:x[1],status:x[2],priority:x[2]==='fail'?'High':x[2]==='warn'?'Medium':'Low',message:x[3],evidence:'Preview-only sample; not measured from '+host+'.',fix:'Review the live page and confirm this check before making changes.',bestPractice:'Validate with a real audit before relying on this finding.'};});
    var full={
      id:auditId,auditId:auditId,url:url,mode:'preview-mock',overall:74,grade:'C',overallCoverage:72,
      recommendationCount:recs.length,passCount:12,checkCount:checks.length,scoredCount:19,
      categories:{onPage:72,geo:66,links:81,usability:74,performance:68,local:null},
      categoryMeta:{onPage:{status:'measured'},geo:{status:'measured'},links:{status:'measured'},usability:{status:'measured'},performance:{status:'limited',scoredChecks:3,requiredChecks:8},local:{status:'unavailable'}},
      metrics:{mobile:{score:68,lcp:3.1,fcp:1.8,cls:0.12,tbt:270,si:4.2},desktop:{score:88,lcp:1.5,fcp:0.8,cls:0.03,tbt:95,si:1.9}},
      meta:{title:'Example page title (sample)',description:'A sample page description used by the preview simulator.',contentMode:'preview-mock',canonical:url},
      sources:{content:true,pagespeed:false,pagespeedMobile:false,pagespeedDesktop:false,performanceProviderMobile:'preview-mock',performanceProviderDesktop:'preview-mock',pagespeed:false,errors:{psiMobile:'Preview simulation: PageSpeed was not called.',psiDesktop:'Preview simulation: PageSpeed was not called.'}},
      recommendations:recs,checks:checks,findings:recs,
      previewNotice:'Synthetic review-only sample data. No live website crawl or performance query was run.'
    };
    var preview=Object.assign({},full,{recommendations:recs.slice(0,3),checks:checks.slice(0,6),findings:recs.slice(0,3),previewNotice:full.previewNotice});
    return {preview:preview,full:full};
  }
  function currentSession(s,headers){
    var a=headers.get('Authorization')||'';
    var supplied=a.replace(/^Bearer\s+/i,'');
    return supplied&&s.sessionToken&&supplied===s.sessionToken?supplied:'';
  }
  function createAudit(s,url,token,owner){
    var auditId='review-'+uuid();
    var data=reportData(url,auditId);
    var row={auditId:auditId,id:auditId,url:url,sessionToken:token,created_at:Math.floor(Date.now()/1000),expires_at:Math.floor(Date.now()/1000)+86400,preview:data.preview,full:data.full,unlocked:!!owner,owner:!!owner};
    s.audits=s.audits||{};
    s.audits[auditId]=row;
    s.lastAuditId=auditId;
    return row;
  }
  function auditSummary(a){
    return {audit_id:a.auditId,id:a.auditId,url:a.url,session_ref:'review-session',created_at:a.created_at,expires_at:a.expires_at,has_entitlement:!!a.unlocked,status:a.unlocked?'unlocked':'locked'};
  }
  function mockCampaign(s){
    var saved=(s.campaigns||[]).find(function(c){return c.id==='nexusnova-launch-preview-demo';});
    if(saved)return saved;
    var now=Math.floor(Date.now()/1000);
    return {id:'nexusnova-launch-preview-demo',name:'NexusNova Launch Pass (Preview Demo)',status:'active',offer_type:'free_report',offer_value:100,starts_at:now-60,ends_at:now+604800,total_limit:500,per_user_limit:1,claimed_count:s.voucher?1:0,created_at:now,updated_at:now,terms:'Review preview only. Synthetic audit data; no real voucher or payment is created.'};
  }
  async function handleApi(url,method,headers,body){
    var s=load(),path=url.pathname,tokenValue=currentSession(s,headers);
    if(method==='OPTIONS')return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
    if(path==='/api/health'||path==='/health'||path==='/api/config'){
      return respond({ok:true,service:'nexusnova-audit-studio-review-preview',environment:'sandbox',productionMode:false,provider:'mock',livePaymentsEnabled:false,devSimulatorEnabled:false,safepayConfigured:false,safepayOnboardingConfirmed:false,nowPaymentsConfigured:false,cryptoComplianceConfirmed:false,price:2.99,cryptoPrice:2.99,currency:'USD',minimumBufferUsd:1.00,previewSimulation:true});
    }
    if(path==='/api/session'&&method==='POST'){
      if(!s.sessionToken)s.sessionToken=token();
      save(s);
      return respond({ok:true,token:s.sessionToken,expiresAt:iso(1)},201);
    }
    if(path==='/api/promotions/active'&&(method==='GET'||method==='POST')){
      var campaign=mockCampaign(s),now=Math.floor(Date.now()/1000);
      if(campaign.status!=='active'||Number(campaign.starts_at)>now||Number(campaign.ends_at)<=now||Number(campaign.claimed_count)>=Number(campaign.total_limit))return respond({ok:true,campaign:null},200);
      return respond({ok:true,previewSimulation:true,campaign:{id:campaign.id,name:campaign.name,offerType:campaign.offer_type,offerValue:campaign.offer_value,endsAt:new Date(campaign.ends_at*1000).toISOString(),remainingClaims:Math.max(0,Number(campaign.total_limit)-Number(campaign.claimed_count)),terms:campaign.terms}},200);
    }
    if(path==='/api/promotions/claim'&&method==='POST'){
      if(!tokenValue)return respond({ok:false,error:'Start a preview session first, then claim your demo voucher.'},401);
      var eligibleCampaign=mockCampaign(s),claimNow=Math.floor(Date.now()/1000);
      if(eligibleCampaign.status!=='active'||Number(eligibleCampaign.starts_at)>claimNow||Number(eligibleCampaign.ends_at)<=claimNow||Number(eligibleCampaign.claimed_count)>=Number(eligibleCampaign.total_limit))return respond({ok:false,error:'The demo launch voucher is not currently available.'},409);
      if(!s.voucher){
        s.voucher={code:'NN-REVIEW-'+tokenValue.slice(0,16).toUpperCase(),sessionToken:tokenValue,expiresAt:Date.now()+7*86400000,used:false,claimedAt:Date.now()};
        save(s);
        return respond({ok:true,code:s.voucher.code,expiresAt:s.voucher.expiresAt,alreadyClaimed:false,previewSimulation:true},201);
      }
      if(s.voucher.sessionToken!==tokenValue)return respond({ok:false,error:'This demo voucher belongs to a different preview session.'},403);
      return respond({ok:true,code:s.voucher.code,expiresAt:s.voucher.expiresAt,alreadyClaimed:true,previewSimulation:true},200);
    }
    if(path==='/api/audits'&&method==='POST'){
      if(!tokenValue)return respond({ok:false,error:'Preview session expired. Reload the page and try again.'},401);
      var urlValue=safeUrl(body.url);
      if(!urlValue)return respond({ok:false,error:'Enter a valid public HTTP or HTTPS URL.'},400);
      var audit=createAudit(s,urlValue,tokenValue,false);
      save(s);
      return respond({ok:true,auditId:audit.auditId,preview:audit.preview,previewSimulation:true},201);
    }
    if(path==='/api/audits/sample'&&method==='POST'){
      if(!tokenValue)return respond({ok:false,error:'Preview session expired.'},401);
      var sample=createAudit(s,'https://example.com',tokenValue,false);save(s);
      return respond({ok:true,auditId:sample.auditId,preview:sample.preview},201);
    }
    if(path==='/api/audits/latest'&&(method==='GET'||method==='POST')){
      if(!tokenValue)return respond({ok:false,error:'No active preview session.'},401);
      var latest=(s.audits||{})[s.lastAuditId];
      if(!latest||latest.sessionToken!==tokenValue)return respond({ok:true,audit:null,unlocked:false},200);
      return respond({ok:true,audit:latest.preview,unlocked:!!latest.unlocked},200);
    }
    var auditMatch=path.match(/^\/api\/audits\/([^/]+)\/(full|retry)$/);
    if(auditMatch){
      var auditId=decodeURIComponent(auditMatch[1]),action=auditMatch[2],audit=(s.audits||{})[auditId];
      if(!audit||!tokenValue||audit.sessionToken!==tokenValue)return respond({ok:false,error:'Preview audit not found in this browser session.'},404);
      if(action==='retry'&&method==='POST')return respond({ok:true,auditId:audit.auditId,preview:audit.preview,notice:'Preview data refreshed; no real audit sources were called.'},200);
      if(action==='full'&&method==='GET'){
        if(!audit.unlocked)return respond({ok:false,error:'This sample full report is locked. Claim and apply the preview voucher first.'},402);
        return respond(Object.assign({},audit.full,{previewSimulation:true}),200);
      }
    }
    if(path==='/api/promotions/redeem'&&method==='POST'){
      if(!tokenValue)return respond({ok:false,error:'Preview session expired.'},401);
      var redeemCode=String(body.code||'').trim().toUpperCase(),target=(s.audits||{})[String(body.auditId||'')];
      if(!target||target.sessionToken!==tokenValue)return respond({ok:false,error:'Audit not found in this preview session.'},404);
      var redeemable=null,nowSeconds=Math.floor(Date.now()/1000);
      if(s.voucher&&s.voucher.sessionToken===tokenValue&&s.voucher.code===redeemCode){
        if(s.voucher.used&&s.voucher.redeemedAuditId!==target.auditId)return respond({ok:false,error:'This demo voucher has already been used.'},409);
        s.voucher.used=true;s.voucher.redeemedAuditId=target.auditId;
        redeemable={id:'review-code-1',code:redeemCode,campaign_id:'nexusnova-launch-preview-demo',uses_count:1,max_uses:1,per_user_limit:1};
      }else{
        var issued=(s.issuedCodes||[]).find(function(c){return c.code===redeemCode;});
        var campaigns=s.campaigns||[mockCampaign(s)];
        var campaign=issued&&campaigns.find(function(c){return c.id===issued.campaign_id;});
        if(!issued||issued.status!=='active'||!campaign||campaign.status!=='active'||campaign.offer_type!=='free_report'||Number(issued.expires_at)<=nowSeconds)
          return respond({ok:false,error:'That launch voucher is invalid, expired, paused, or not eligible for a free full report.'},409);
        issued.usedBy=issued.usedBy||[];
        if(issued.uses_count>=issued.max_uses||issued.usedBy.some(function(u){return u.sessionToken===tokenValue&&u.auditId!==target.auditId;}))
          return respond({ok:false,error:'This voucher has reached its use limit.'},409);
        if(issued.per_user_limit<=1&&issued.usedBy.some(function(u){return u.sessionToken===tokenValue;}))
          return respond({ok:false,error:'This voucher has already been used by this browser session.'},409);
        issued.uses_count++;
        issued.usedBy.push({sessionToken:tokenValue,auditId:target.auditId});
        redeemable=issued;
      }
      target.unlocked=true;
      s.redemptions=s.redemptions||[];
      var redId='review-redemption-'+uuid();
      if(!s.redemptions.some(function(x){return x.auditId===target.auditId&&x.code===redeemCode;}))
        s.redemptions.push({id:redId,auditId:target.auditId,code:redeemCode,codeId:redeemable.id,campaignId:redeemable.campaign_id,sessionToken:tokenValue,status:'free',created_at:nowSeconds});
      save(s);
      return respond({ok:true,freeReport:true,offerType:'free_report',offerValue:100,auditId:target.auditId,redemptionId:redId,previewSimulation:true},200);
    }
    if(path==='/api/payments/crypto/minimums'&&(method==='GET'||method==='POST')){
      return respond({ok:true,priceUsd:2.99,minimumBufferUsd:1.00,options:[{network:'TRC20',label:'USDT (TRC20)',available:false,minimumUsd:10.00},{network:'ERC20',label:'USDT (ERC20)',available:false,minimumUsd:15.00}]});
    }
    if(path==='/api/payments/card-session'&&method==='POST')return respond({ok:false,error:'Preview mode only: no card or Safepay payment can be started.'},503);
    if(path==='/api/payments/crypto/create'&&method==='POST')return respond({ok:false,error:'Preview mode only: crypto payments are disabled.'},503);
    if((path==='/api/admin/promotions'||path==='/api/admin/audits')&&method==='GET'){
      if(headers.get('X-Owner-Admin-Token')!==OWNER_DEMO_TOKEN)return respond({ok:false,error:'Use the prefilled preview-only demo token. This is not a production credential.'},401);
      if(path==='/api/admin/promotions'){
        var campaignList=[mockCampaign(s)].concat((s.campaigns||[]).filter(function(c){return c.id!=='nexusnova-launch-preview-demo';}));
        var codeList=(s.voucher?[{id:'review-code-1',campaign_id:'nexusnova-launch-preview-demo',code_preview:'...'+s.voucher.code.slice(-6),status:s.voucher.used?'used':'active',max_uses:1,uses_count:s.voucher.used?1:0,per_user_limit:1,expires_at:Math.floor(s.voucher.expiresAt/1000)}]:[]).concat((s.issuedCodes||[]).map(function(c){return {id:c.id,campaign_id:c.campaign_id,code_preview:c.code_preview,status:c.status,max_uses:c.max_uses,uses_count:Number(c.uses_count||0),per_user_limit:c.per_user_limit,expires_at:c.expires_at};}));
        return respond({ok:true,campaigns:campaignList,codes:codeList,redemptions:(s.redemptions||[]).map(function(x){return {id:x.id,campaign_id:'nexusnova-launch-preview-demo',code_preview:'...'+x.code.slice(-6),status:'free',created_at:x.created_at};})},200);
      }
      var audits=Object.values(s.audits||{}).map(auditSummary);
      return respond({ok:true,audits:audits},200);
    }
    if(path==='/api/admin/audits'&&method==='POST'){
      if(headers.get('X-Owner-Admin-Token')!==OWNER_DEMO_TOKEN)return respond({ok:false,error:'Preview demo token required.'},401);
      var ownerUrl=safeUrl(body.url);
      if(!ownerUrl)return respond({ok:false,error:'Enter a valid public HTTP or HTTPS URL.'},400);
      var ownerAudit=createAudit(s,ownerUrl,'owner-preview-session',true);
      save(s);
      return respond({ok:true,auditId:ownerAudit.auditId,preview:ownerAudit.preview,unlocked:true,previewSimulation:true},201);
    }
    var adminAuditMatch=path.match(/^\/api\/admin\/audits\/([^/]+)\/(unlock|full)$/);
    if(adminAuditMatch){
      if(headers.get('X-Owner-Admin-Token')!==OWNER_DEMO_TOKEN)return respond({ok:false,error:'Preview demo token required.'},401);
      var adminId=decodeURIComponent(adminAuditMatch[1]),adminAudit=(s.audits||{})[adminId];
      if(!adminAudit)return respond({ok:false,error:'Preview audit not found.'},404);
      if(adminAuditMatch[2]==='unlock'&&method==='POST'){adminAudit.unlocked=true;save(s);return respond({ok:true,auditId:adminId,unlocked:true},200);}
      if(adminAuditMatch[2]==='full'&&method==='GET'){adminAudit.unlocked=true;save(s);return respond(Object.assign({},adminAudit.full,{previewSimulation:true}),200);}
    }
    if(path==='/api/admin/promotions/campaigns'&&method==='POST'){
      if(headers.get('X-Owner-Admin-Token')!==OWNER_DEMO_TOKEN)return respond({ok:false,error:'Preview demo token required.'},401);
      s.campaigns=s.campaigns||[mockCampaign(s)];
      var campaignBody=body||{},cid='review-campaign-'+uuid();
      var newCampaign={id:cid,name:String(campaignBody.name||'Preview campaign'),status:'draft',offer_type:String(campaignBody.offerType||'free_report'),offer_value:Number(campaignBody.offerValue||100),starts_at:Number(campaignBody.startsAt||Math.floor(Date.now()/1000)),ends_at:Number(campaignBody.endsAt||Math.floor(Date.now()/1000)+604800),total_limit:Number(campaignBody.totalLimit||10),per_user_limit:Number(campaignBody.perUserLimit||1),claimed_count:0,terms:String(campaignBody.terms||'Preview-only campaign; no real code is created.')};
      s.campaigns.push(newCampaign);save(s);return respond({ok:true,campaign:newCampaign},201);
    }
    var campaignStatus=path.match(/^\/api\/admin\/promotions\/campaigns\/([^/]+)\/status$/);
    if(campaignStatus&&method==='POST'){
      if(headers.get('X-Owner-Admin-Token')!==OWNER_DEMO_TOKEN)return respond({ok:false,error:'Preview demo token required.'},401);
      var allCampaigns=s.campaigns||[mockCampaign(s)],entry=allCampaigns.find(function(x){return x.id===decodeURIComponent(campaignStatus[1]);});
      if(!entry)return respond({ok:false,error:'Preview campaign not found.'},404);
      entry.status=String(body.status||'paused');s.campaigns=allCampaigns;save(s);return respond({ok:true,campaign:entry},200);
    }
    var codeRoute=path.match(/^\/api\/admin\/promotions\/campaigns\/([^/]+)\/codes$/);
    if(codeRoute&&method==='POST'){
      if(headers.get('X-Owner-Admin-Token')!==OWNER_DEMO_TOKEN)return respond({ok:false,error:'Preview demo token required.'},401);
      var campaignId=decodeURIComponent(codeRoute[1]),codeCampaign=(s.campaigns||[]).find(function(c){return c.id===campaignId;});
      if(!codeCampaign)return respond({ok:false,error:'Preview campaign not found.'},404);
      if(codeCampaign.offer_type!=='free_report')return respond({ok:false,error:'Only free full-report vouchers can be issued in this preview.'},400);
      var createdCode='NN-DEMO-'+uuid().replace(/-/g,'').slice(0,16).toUpperCase();
      s.issuedCodes=s.issuedCodes||[];s.issuedCodes.push({id:'review-code-'+uuid(),campaign_id:campaignId,code:createdCode,status:'active',code_preview:'...'+createdCode.slice(-6),max_uses:Number(body.maxUses||1),uses_count:0,per_user_limit:Number(body.perUserLimit||1),expires_at:Number(body.expiresAt||Math.floor(Date.now()/1000)+604800),usedBy:[]});
      save(s);return respond({ok:true,code:createdCode,expiresAt:s.issuedCodes[s.issuedCodes.length-1].expires_at*1000},201);
    }
    var deactivateCode=path.match(/^\/api\/admin\/promotions\/codes\/([^/]+)\/deactivate$/);
    if(deactivateCode&&method==='POST'){
      if(headers.get('X-Owner-Admin-Token')!==OWNER_DEMO_TOKEN)return respond({ok:false,error:'Preview demo token required.'},401);
      (s.issuedCodes||[]).forEach(function(x){if(x.id===decodeURIComponent(deactivateCode[1]))x.status='inactive';});
      save(s);return respond({ok:true},200);
    }
    return respond({ok:false,error:'This action is not implemented in the review-only mock API: '+method+' '+path},501);
  }
  function mountBanner(){
    if(!document.body||document.getElementById('nn-review-demo-banner'))return;
    var banner=document.createElement('div');
    banner.id='nn-review-demo-banner';
    banner.setAttribute('role','note');
    banner.textContent='REVIEW PREVIEW · SAMPLE DATA ONLY · REAL PAYMENTS DISABLED';
    banner.style.cssText='position:relative;z-index:10000;display:block;width:100%;box-sizing:border-box;padding:8px 12px;background:#17263d;color:#f4efe5;border-bottom:1px solid #d8c29a;text-align:center;font:800 10px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.09em';
    document.body.prepend(banner);
    var style=document.createElement('style');
    style.textContent='#nn-review-demo-banner~*{scroll-margin-top:8px}.nn-review-demo-note{padding:10px 12px;margin:10px 0;border:1px solid #c4b5fd;border-radius:10px;background:#f5f3ff;color:#4c1d95;font:700 11px/1.5 system-ui,sans-serif}';
    document.head.appendChild(style);
    var markReport=function(){
      var report=document.getElementById('auditReportSection');
      if(report&&!report.hidden){
        var pill=document.getElementById('sourcePill');
        if(pill){pill.textContent='Preview simulation · sample data';pill.className='source-pill partial';}
        var desc=document.getElementById('sourceDescription');
        if(desc)desc.textContent='Synthetic sample only. No live website crawl, PageSpeed query, or external audit source was used.';
        var top=document.querySelector('.top-note');
        if(top&&document.body.classList.contains('report-is-paid'))top.textContent='Preview voucher accepted · sample full report unlocked';
      }
      var help=document.getElementById('cardPaymentStatus');
      if(help&&stateLooksLikeReview()) {help.hidden=false;help.textContent='Review mode: no real card, Safepay or crypto payment can be started.';}
    };
    function stateLooksLikeReview(){return document.body.classList.contains('report-is-paid')||!!document.getElementById('paywallModal');}
    var observer=new MutationObserver(markReport);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});
    markReport();
    var tokenInput=document.getElementById('ownerTokenInput');
    if(tokenInput){
      tokenInput.value=OWNER_DEMO_TOKEN;
      tokenInput.autocomplete='off';
      var label=tokenInput.closest('label');
      if(label&&!label.querySelector('.nn-review-demo-note')){
        var note=document.createElement('div');note.className='nn-review-demo-note';
        note.textContent='Preview demo token is prefilled. It works only in this mock preview and has no production access.';
        label.appendChild(note);
      }
      var loginStatus=document.getElementById('loginStatus');
      if(loginStatus)loginStatus.textContent='Preview-only demo authentication. No production owner secret is used.';
    }
  }
  document.addEventListener('DOMContentLoaded',mountBanner);
  if(document.readyState!=='loading')mountBanner();
  window.fetch=function(input,init){
    var rawUrl=typeof input==='string'||input instanceof URL?String(input):(input&&input.url?input.url:'');
    var parsed;
    try{parsed=new URL(rawUrl,window.location.href);}catch(e){return originalFetch(input,init);}
    if(!((parsed.hostname===REVIEW_HOST||parsed.hostname===REVIEW_WORKER_HOST)&&parsed.pathname.startsWith('/api/')))return originalFetch(input,init);
    var method=String((init&&init.method)||(input&&input.method)||'GET').toUpperCase();
    var headers=new Headers((init&&init.headers)||(input instanceof Request?input.headers:undefined));
    var bodyText=init&&typeof init.body==='string'?init.body:'';
    var body={};
    try{body=bodyText?JSON.parse(bodyText):{};}catch(e){return Promise.resolve(respond({ok:false,error:'Invalid preview request body.'},400));}
    return Promise.resolve(handleApi(parsed,method,headers,body)).catch(function(error){
      return respond({ok:false,error:'Review mock failed safely: '+String(error&&error.message||'unknown error')},500);
    });
  };
})();
