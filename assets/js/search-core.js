'use strict';

/**
 * NexusNova Deep Client-Side Search Core
 * 94 tools + 9 categories + 14 articles + 8 guides = 125 records.
 * Local-only, dependency-free, network-free search.
 */

const NEXUSNOVA_SEARCH_DATA = Object.freeze([
  { title:"Image Compressor", url:"image-compressor.html", type:"tool", category:"Images", tags:["image compressor","images","image","compressor","tool","utility"] },
  { title:"Image to Text OCR", url:"image-to-text-ocr.html", type:"tool", category:"Images", tags:["image to text ocr","images","image","text","ocr","tool","utility"] },
  { title:"Image Metadata Remover", url:"image-metadata-remover.html", type:"tool", category:"Images", tags:["image metadata remover","images","image","metadata","remover","tool","utility"] },
  { title:"Image Resizer", url:"image-resizer.html", type:"tool", category:"Images", tags:["image resizer","images","image","resizer","tool","utility"] },
  { title:"Photo CCTV Enhancer", url:"photo-cctv-enhancer.html", type:"tool", category:"Images", tags:["photo cctv enhancer","images","photo","cctv","enhancer","tool","utility"] },
  { title:"AVIF to JPG", url:"avif-to-jpg.html", type:"tool", category:"Images", tags:["avif to jpg","images","avif","jpg","tool","utility"] },
  { title:"HEIC to JPG", url:"heic-to-jpg.html", type:"tool", category:"Images", tags:["heic to jpg","images","heic","jpg","tool","utility"] },
  { title:"JPG to PNG", url:"jpg-to-png.html", type:"tool", category:"Images", tags:["jpg to png","images","jpg","png","tool","utility"] },
  { title:"PNG to JPG", url:"png-to-jpg.html", type:"tool", category:"Images", tags:["png to jpg","images","png","jpg","tool","utility"] },
  { title:"WebP to JPG", url:"webp-to-jpg.html", type:"tool", category:"Images", tags:["webp to jpg","images","webp","jpg","tool","utility"] },
  { title:"WebP to PNG", url:"webp-to-png.html", type:"tool", category:"Images", tags:["webp to png","images","webp","png","tool","utility"] },
  { title:"YouTube Thumbnail Downloader", url:"youtube-thumbnail-downloader.html", type:"tool", category:"Images", tags:["youtube thumbnail downloader","images","youtube","thumbnail","downloader","tool","utility"] },
  { title:"JPG to PDF", url:"jpg-to-pdf.html", type:"tool", category:"PDF & Documents", tags:["jpg to pdf","pdf & documents","jpg","pdf","tool","utility"] },
  { title:"Merge PDF", url:"merge-pdf.html", type:"tool", category:"PDF & Documents", tags:["merge pdf","pdf & documents","merge","pdf","tool","utility"] },
  { title:"Split PDF", url:"split-pdf.html", type:"tool", category:"PDF & Documents", tags:["split pdf","pdf & documents","split","pdf","tool","utility"] },
  { title:"Text to PDF", url:"text-to-pdf.html", type:"tool", category:"PDF & Documents", tags:["text to pdf","pdf & documents","text","pdf","tool","utility"] },
  { title:"AI Token Calculator", url:"ai-token-calculator.html", type:"tool", category:"Calculators", tags:["ai token calculator","calculators","token","calculator","tool","utility"] },
  { title:"AI VRAM Calculator", url:"ai-vram-calculator.html", type:"tool", category:"Calculators", tags:["ai vram calculator","calculators","vram","calculator","tool","utility"] },
  { title:"Paper Size Converter", url:"paper-size-converter.html", type:"tool", category:"Calculators", tags:["paper size converter","calculators","paper","size","converter","tool","utility"] },
  { title:"Paper Size in Pixels", url:"paper-size-in-pixels.html", type:"tool", category:"Calculators", tags:["paper size in pixels","calculators","paper","size","pixels","tool","utility"] },
  { title:"Calculator", url:"calculator.html", type:"tool", category:"Calculators", tags:["calculator","calculators","tool","utility"] },
  { title:"Percentage Calculator", url:"percentage-calculator.html", type:"tool", category:"Calculators", tags:["percentage calculator","calculators","percentage","calculator","tool","utility"] },
  { title:"Age Calculator", url:"age-calculator.html", type:"tool", category:"Calculators", tags:["age calculator","calculators","age","calculator","tool","utility"] },
  { title:"Date Difference Calculator", url:"date-difference-calculator.html", type:"tool", category:"Calculators", tags:["date difference calculator","calculators","date","difference","calculator","tool","utility"] },
  { title:"Discount Calculator", url:"discount-calculator.html", type:"tool", category:"Calculators", tags:["discount calculator","calculators","discount","calculator","tool","utility"] },
  { title:"Percentage Change Calculator", url:"percentage-change-calculator.html", type:"tool", category:"Calculators", tags:["percentage change calculator","calculators","percentage","change","calculator","tool","utility"] },
  { title:"BMI Calculator", url:"bmi-calculator.html", type:"tool", category:"Calculators", tags:["bmi calculator","calculators","bmi","calculator","tool","utility"] },
  { title:"EMI Calculator", url:"emi-calculator.html", type:"tool", category:"Calculators", tags:["emi calculator","calculators","emi","calculator","tool","utility"] },
  { title:"Scientific Calculator", url:"scientific-calculator.html", type:"tool", category:"Calculators", tags:["scientific calculator","calculators","scientific","calculator","tool","utility"] },
  { title:"Unit Converter", url:"unit-converter.html", type:"tool", category:"Calculators", tags:["unit converter","calculators","unit","converter","tool","utility"] },
  { title:"Storage Size Converter", url:"storage-size-converter.html", type:"tool", category:"Calculators", tags:["storage size converter","calculators","storage","size","converter","tool","utility"] },
  { title:"Time Duration Calculator", url:"time-duration-calculator.html", type:"tool", category:"Calculators", tags:["time duration calculator","calculators","time","duration","calculator","tool","utility"] },
  { title:"Online Timer", url:"online-timer.html", type:"tool", category:"Calculators", tags:["online timer","calculators","timer","tool","utility"] },
  { title:"Stopwatch", url:"stopwatch.html", type:"tool", category:"Calculators", tags:["stopwatch","calculators","tool","utility"] },
  { title:"Pomodoro Timer", url:"pomodoro-timer.html", type:"tool", category:"Calculators", tags:["pomodoro timer","calculators","pomodoro","timer","tool","utility"] },
  { title:"Word Counter", url:"word-counter.html", type:"tool", category:"Calculators", tags:["word counter","calculators","word","counter","tool","utility"] },
  { title:"Roman Numeral Converter", url:"roman-numeral-converter.html", type:"tool", category:"Calculators", tags:["roman numeral converter","calculators","roman","numeral","converter","tool","utility"] },
  { title:"RGB to HEX Converter", url:"rgb-hex-converter.html", type:"tool", category:"Calculators", tags:["rgb to hex converter","rgb hex converter","calculators","rgb","hex","converter","tool","utility"] },
  { title:"Bill Split & Tip Calculator", url:"bill-split-tip-calculator.html", type:"tool", category:"Calculators", tags:["bill split & tip calculator","bill split tip calculator","calculators","bill","split","tip","calculator","tool","utility"] },
  { title:"Pakistan Salary Tax Calculator", url:"salary-tax-calculator-pakistan.html", type:"tool", category:"Pakistan Tools", tags:["pakistan salary tax calculator","salary tax calculator pakistan","pakistan tools","pakistan","salary","tax","calculator","tool","utility","salery","salary tax","income tax","fbr","fbr tax","filer","tax calculator","pakistan tax"] },
  { title:"Pakistan Electricity Bill Calculator", url:"electricity-bill-calculator-pakistan.html", type:"tool", category:"Pakistan Tools", tags:["pakistan electricity bill calculator","electricity bill calculator pakistan","pakistan tools","pakistan","electricity","bill","calculator","tool","utility","bijli bill","bijli bil","wapda","lesco","kelectric","k electric","electric bill","units","tariff"] },
  { title:"FBR ATL Checker", url:"fbr-atl-status-checker.html", type:"tool", category:"Pakistan Tools", tags:["fbr active taxpayer status","fbr atl status checker","pakistan tools","fbr","active","taxpayer","status","tool","utility","atl","active taxpayer","filer","non filer","cnic","ntn","passport","status checker"] },
  { title:"FBR Income Tax Calculator", url:"fbr-tax-calculator-pakistan.html", type:"tool", category:"Pakistan Tools", tags:["fbr tax calculator","fbr tax calculator pakistan","pakistan tools","fbr","tax","calculator","tool","utility","fbr tax","income tax","tax calculator","salaried","salary","business","self employed","non salaried","tax slab"] },
  { title:"Pakistan Zakat Calculator", url:"zakat-calculator-pakistan.html", type:"tool", category:"Pakistan Tools", tags:["pakistan zakat calculator","zakat calculator pakistan","pakistan tools","pakistan","zakat","calculator","tool","utility","nisab","2.5 percent","charity"] },
  { title:"Prayer Times & Qibla Pakistan", url:"prayer-times-qibla-pakistan.html", type:"tool", category:"Pakistan Tools", tags:["prayer times & qibla pakistan","prayer times qibla pakistan","pakistan tools","prayer","times","qibla","pakistan","tool","utility","namaz","salah","karachi method"] },
  { title:"Pakistan Public Holidays 2026", url:"pakistan-public-holidays-2026.html", type:"tool", category:"Pakistan Tools", tags:["pakistan public holidays 2026","pakistan tools","pakistan","public","holidays","tool","utility"] },
  { title:"Government Jobs Portal", url:"pakistan-jobs-finder.html", type:"tool", category:"Pakistan Tools", tags:["pakistan jobs finder","pakistan tools","pakistan","jobs","finder","tool","utility","job","government jobs","govt jobs","public sector jobs","departmental openings","vacancies","career","employment","pakistan jobs"] },
  { title:"QR Code Generator", url:"qr-code-generator.html", type:"tool", category:"Security", tags:["qr code generator","security","code","generator","tool","utility"] },
  { title:"QR Code Scanner", url:"qr-code-scanner.html", type:"tool", category:"Security", tags:["qr code scanner","security","code","scanner","tool","utility"] },
  { title:"NexusNova X-Ray", url:"xray.html", type:"tool", category:"Security", tags:["nexusnova x-ray","xray","security","ray","tool","utility","x-ray","link checker","url scanner","redirect detector","inspect link","phishing link","suspicious link"] },
  { title:"DNS Lookup", url:"dns-lookup.html", type:"tool", category:"Security", tags:["dns lookup","security","dns","lookup","tool","utility"] },
  { title:"SSL Certificate Checker", url:"ssl-certificate-checker.html", type:"tool", category:"Security", tags:["ssl certificate checker","security","ssl","certificate","checker","tool","utility"] },
  { title:"Public IP Checker", url:"public-ip-checker.html", type:"tool", category:"Security", tags:["public ip checker","security","public","checker","tool","utility"] },
  { title:"IP CIDR Calculator", url:"ip-cidr-calculator.html", type:"tool", category:"Security", tags:["ip cidr calculator","security","cidr","calculator","tool","utility"] },
  { title:"Website Reachability Checker", url:"website-reachability-checker.html", type:"tool", category:"Security", tags:["website reachability checker","security","website","reachability","checker","tool","utility"] },
  { title:"Contrast Checker", url:"contrast-checker.html", type:"tool", category:"Security", tags:["contrast checker","security","contrast","checker","tool","utility"] },
  { title:"Password Generator", url:"password-generator.html", type:"tool", category:"Security", tags:["password generator","security","password","generator","tool","utility"] },
  { title:"Password Strength Checker", url:"password-strength-checker.html", type:"tool", category:"Security", tags:["password strength checker","security","password","strength","checker","tool","utility"] },
  { title:"Text Diff Checker", url:"text-diff-checker.html", type:"tool", category:"Security", tags:["text diff checker","security","text","diff","checker","tool","utility"] },
  { title:"CSV to JSON Converter", url:"csv-json-converter.html", type:"tool", category:"Developer & Data", tags:["csv to json converter","csv json converter","developer & data","csv","json","converter","tool","utility"] },
  { title:"Meta Tag Generator", url:"meta-tag-generator.html", type:"tool", category:"Developer & Data", tags:["meta tag generator","developer & data","meta","tag","generator","tool","utility"] },
  { title:"Unix Timestamp Converter", url:"unix-timestamp-converter.html", type:"tool", category:"Developer & Data", tags:["unix timestamp converter","developer & data","unix","timestamp","converter","tool","utility"] },
  { title:"Magic Drop", url:"magic-drop.html", type:"tool", category:"Productivity", tags:["magic drop","productivity","magic","drop","tool","utility"] },
  { title:"AI Prompt Builder", url:"ai-prompt-builder.html", type:"tool", category:"Productivity", tags:["ai prompt builder","productivity","prompt","builder","tool","utility"] },
  { title:"Invoice Maker", url:"invoice-maker.html", type:"tool", category:"Productivity", tags:["invoice maker","productivity","invoice","maker","tool","utility"] },
  { title:"Resume Builder", url:"resume-builder.html", type:"tool", category:"Productivity", tags:["resume builder","productivity","resume","builder","tool","utility"] },
  { title:"Decision Matrix Calculator", url:"decision-matrix-calculator.html", type:"tool", category:"Productivity", tags:["decision matrix calculator","productivity","decision","matrix","calculator","tool","utility"] },
  { title:"Global Meeting Planner", url:"timezone-meeting-planner.html", type:"tool", category:"Productivity", tags:["global meeting planner","timezone meeting planner","productivity","global","meeting","planner","tool","utility"] },
  { title:"Number to Words", url:"number-to-words.html", type:"tool", category:"Productivity", tags:["number to words","productivity","number","words","tool","utility"] },
  { title:"WhatsApp Link Generator", url:"whatsapp-link-generator.html", type:"tool", category:"Productivity", tags:["whatsapp link generator","productivity","whatsapp","link","generator","tool","utility","wa link","wa me","wa.me","chat link","click to chat","business message"] },
  { title:"Random Number Generator", url:"random-number-generator.html", type:"tool", category:"Productivity", tags:["random number generator","productivity","random","number","generator","tool","utility"] },
  { title:"Random Picker", url:"random-picker.html", type:"tool", category:"Productivity", tags:["random picker","productivity","random","picker","tool","utility"] },
  { title:"Typing Speed Test", url:"typing-speed-test.html", type:"tool", category:"Productivity", tags:["typing speed test","productivity","typing","speed","test","tool","utility"] },
  { title:"Text Case Converter", url:"text-case-converter.html", type:"tool", category:"Productivity", tags:["text case converter","productivity","text","case","converter","tool","utility"] },
  { title:"Private Quick Note", url:"private-quick-note.html", type:"tool", category:"Productivity", tags:["private quick note","productivity","private","quick","note","tool","utility"] },
  { title:"Reaction Time Test", url:"reaction-time-test.html", type:"tool", category:"Gaming", tags:["reaction time test","gaming","reaction","time","test","tool","utility"] },
  { title:"eDPI Calculator", url:"edpi-calculator.html", type:"tool", category:"Gaming", tags:["edpi calculator","gaming","edpi","calculator","tool","utility"] },
  { title:"FPS Frame Time Calculator", url:"fps-frame-time-calculator.html", type:"tool", category:"Gaming", tags:["fps frame time calculator","gaming","fps","frame","time","calculator","tool","utility"] },
  { title:"Gaming Sensitivity Converter", url:"gaming-sensitivity-converter.html", type:"tool", category:"Gaming", tags:["gaming sensitivity converter","gaming","sensitivity","converter","tool","utility"] },
  { title:"Minecraft Coordinate Converter", url:"minecraft-coordinate-converter.html", type:"tool", category:"Gaming", tags:["minecraft coordinate converter","gaming","minecraft","coordinate","converter","tool","utility"] },
  { title:"Gamer Name Generator", url:"gamer-name-generator.html", type:"tool", category:"Gaming", tags:["gamer name generator","gaming","gamer","name","generator","tool","utility"] },
  { title:"Steam Playtime Calculator", url:"steam-playtime-calculator.html", type:"tool", category:"Gaming", tags:["steam playtime calculator","gaming","steam","playtime","calculator","tool","utility"] },
  { title:"Pakistan Today Dashboard", url:"live.html", type:"tool", category:"Live Information", tags:["pakistan today dashboard","live","live information","pakistan","today","dashboard","tool","utility","pakistan today","weather","sports","gold","fuel","currency","aqi","crypto","earthquakes"] },
  { title:"Currency Rates", url:"currency-rates.html", type:"tool", category:"Live Information", tags:["currency rates","live information","currency","rates","tool","utility"] },
  { title:"Gold Rates", url:"gold-rates.html", type:"tool", category:"Live Information", tags:["gold rates","live information","gold","rates","tool","utility"] },
  { title:"Fuel Rates", url:"fuel-rates.html", type:"tool", category:"Live Information", tags:["fuel rates","live information","fuel","rates","tool","utility"] },
  { title:"Pakistan Weather", url:"weather-live.html", type:"tool", category:"Live Information", tags:["pakistan weather","weather live","live information","pakistan","weather","tool","utility"] },
  { title:"Air Quality", url:"aqi-live.html", type:"tool", category:"Live Information", tags:["air quality","aqi live","live information","air","quality","tool","utility"] },
  { title:"Recent Earthquakes", url:"earthquakes-live.html", type:"tool", category:"Live Information", tags:["recent earthquakes","earthquakes live","live information","recent","earthquakes","tool","utility"] },
  { title:"Crypto Market", url:"crypto-live.html", type:"tool", category:"Live Information", tags:["crypto market","crypto live","live information","crypto","market","tool","utility"] },
  { title:"Live Alerts", url:"live-alerts.html", type:"tool", category:"Live Information", tags:["live alerts","live information","live","alerts","tool","utility"] },
  { title:"Live Sports", url:"sports-live.html", type:"tool", category:"Live Information", tags:["live sports","sports live","live information","live","sports","tool","utility"] },
  { title:"NexusNova Pulse", url:"pulse.html", type:"tool", category:"Live Information", tags:["nexusnova pulse","pulse","live information","tool","utility"] },
  { title:"Pakistan Today Widget", url:"widget-pakistan-today.html", type:"tool", category:"Live Information", tags:["pakistan today widget","widget pakistan today","live information","pakistan","today","widget","tool","utility"] },
  { title:"Images", url:"image-tools.html", type:"category", category:"", tags:["images","image tools","category","hub"] },
  { title:"PDF & Documents", url:"pdf-tools.html", type:"category", category:"", tags:["pdf & documents","pdf tools","pdf","documents","category","hub"] },
  { title:"Calculators", url:"calculator-tools.html", type:"category", category:"", tags:["calculators","calculator tools","category","hub"] },
  { title:"Pakistan Tools", url:"pakistan-tools.html", type:"category", category:"", tags:["pakistan tools","pakistan","category","hub"] },
  { title:"Security & Network", url:"network-tools.html", type:"category", category:"", tags:["security & network","network tools","security","network","category","hub"] },
  { title:"Developer & Data", url:"developer-tools.html", type:"category", category:"", tags:["developer & data","developer tools","developer","data","category","hub"] },
  { title:"Productivity", url:"productivity-tools.html", type:"category", category:"", tags:["productivity","productivity tools","category","hub"] },
  { title:"Gaming", url:"gaming.html", type:"category", category:"", tags:["gaming","category","hub"] },
  { title:"Live Information", url:"live.html", type:"category", category:"", tags:["live information","live","information","category","hub","today","pakistan today","dashboard","weather","sports","gold","fuel","currency","aqi","crypto","earthquakes"] },
  { title:"CS2 vs Valorant Sensitivity & eDPI", url:"articles/cs2-valorant-sensitivity-edpi-guide.html", type:"article", category:"Articles", tags:["cs2 vs valorant sensitivity & edpi","articles cs2 valorant sensitivity edpi guide","articles","cs2","valorant","sensitivity","edpi","article"] },
  { title:"AI Photo Restoration vs Enhancement", url:"articles/ai-photo-restoration-vs-enhancement.html", type:"article", category:"Articles", tags:["ai photo restoration vs enhancement","articles ai photo restoration vs enhancement","articles","photo","restoration","enhancement","article"] },
  { title:"Online Background Removers in 2026", url:"articles/background-removal-online-guide.html", type:"article", category:"Articles", tags:["online background removers in 2026","articles background removal online guide","articles","background","removers","article"] },
  { title:"Remove EXIF and GPS Metadata Before Sharing", url:"articles/remove-exif-gps-metadata-photos.html", type:"article", category:"Articles", tags:["remove exif and gps metadata before sharing","articles remove exif gps metadata photos","articles","remove","exif","gps","metadata","before","sharing","article"] },
  { title:"JPG vs PNG vs WebP vs AVIF", url:"articles/jpg-png-webp-avif-guide.html", type:"article", category:"Articles", tags:["jpg vs png vs webp vs avif","articles jpg png webp avif guide","articles","jpg","png","webp","avif","article"] },
  { title:"How to Split a PDF and Keep Pages Organized", url:"articles/split-pdf-organize-pages.html", type:"article", category:"Articles", tags:["how to split a pdf and keep pages organized","articles split pdf organize pages","articles","split","pdf","keep","pages","organized","article"] },
  { title:"EMI Calculator Explained", url:"articles/emi-calculator-explained.html", type:"article", category:"Articles", tags:["emi calculator explained","articles emi calculator explained","articles","emi","calculator","explained","article"] },
  { title:"Use a Pomodoro Timer Without Overcomplicating Focus", url:"articles/pomodoro-focus-workflow.html", type:"article", category:"Articles", tags:["use a pomodoro timer without overcomplicating focus","articles pomodoro focus workflow","articles","pomodoro","timer","without","overcomplicating","focus","article"] },
  { title:"7 Resume Mistakes to Fix", url:"articles/resume-mistakes-to-fix.html", type:"article", category:"Articles", tags:["7 resume mistakes to fix","articles resume mistakes to fix","articles","resume","mistakes","fix","article"] },
  { title:"Unix Timestamps Explained", url:"articles/unix-timestamps-explained.html", type:"article", category:"Articles", tags:["unix timestamps explained","articles unix timestamps explained","articles","unix","timestamps","explained","article"] },
  { title:"HEX vs RGB Color Codes", url:"articles/hex-vs-rgb-colors.html", type:"article", category:"Articles", tags:["hex vs rgb color codes","articles hex vs rgb colors","articles","hex","rgb","color","codes","article"] },
  { title:"Compress Images for Web Without Ruining Quality", url:"articles/compress-images-for-web.html", type:"article", category:"Articles", tags:["compress images for web without ruining quality","articles compress images for web","articles","compress","images","web","without","ruining","quality","article"] },
  { title:"Merge PDF Files With Privacy in Mind", url:"articles/merge-pdf-privately.html", type:"article", category:"Articles", tags:["merge pdf files with privacy in mind","articles merge pdf privately","articles","merge","pdf","files","privacy","mind","article"] },
  { title:"QR Code Best Practices", url:"articles/qr-code-best-practices.html", type:"article", category:"Articles", tags:["qr code best practices","articles qr code best practices","articles","code","best","practices","article"] },
  { title:"How to use a weighted decision matrix without fooling yourself.", url:"guides/weighted-decision-matrix.html", type:"guide", category:"Guides", tags:["how to use a weighted decision matrix without fooling yourself.","guides weighted decision matrix","guides","weighted","decision","matrix","without","fooling","yourself","guide","methodology"] },
  { title:"Percentages without confusion", url:"guides/percentage-basics.html", type:"guide", category:"Guides", tags:["percentages without confusion","guides percentage basics","guides","percentages","without","confusion","guide","methodology"] },
  { title:"Stronger password habits for everyday accounts", url:"guides/password-security.html", type:"guide", category:"Guides", tags:["stronger password habits for everyday accounts","guides password security","guides","stronger","password","habits","everyday","accounts","guide","methodology"] },
  { title:"Unit conversion made practical", url:"guides/unit-conversion.html", type:"guide", category:"Guides", tags:["unit conversion made practical","guides unit conversion","guides","unit","conversion","made","practical","guide","methodology"] },
  { title:"Compress images without guesswork.", url:"guides/image-compression.html", type:"guide", category:"Guides", tags:["compress images without guesswork.","guides image compression","guides","compress","images","without","guesswork","guide","methodology"] },
  { title:"Turn JPG images into a PDF properly.", url:"guides/jpg-to-pdf.html", type:"guide", category:"Guides", tags:["turn jpg images into a pdf properly.","guides jpg to pdf","guides","turn","jpg","images","pdf","properly","guide","methodology"] },
  { title:"Build a resume that is easy to scan.", url:"guides/resume-writing.html", type:"guide", category:"Guides", tags:["build a resume that is easy to scan.","guides resume writing","guides","build","resume","easy","scan","guide","methodology"] },
  { title:"Write AI prompts that are easier to verify.", url:"guides/ai-prompting.html", type:"guide", category:"Guides", tags:["write ai prompts that are easier to verify.","guides ai prompting","guides","write","prompts","easier","verify","guide","methodology"] }
]);

const NEXUSNOVA_EXPECTED_COUNTS = Object.freeze({
  tool:94,
  category:9,
  article:14,
  guide:8
});

const NEXUSNOVA_ALIAS_MAP = Object.freeze({
  'salery':['salary-tax-calculator-pakistan.html'],
  'salary':['salary-tax-calculator-pakistan.html','fbr-tax-calculator-pakistan.html'],
  'salary tax':['salary-tax-calculator-pakistan.html','fbr-tax-calculator-pakistan.html'],
  'income tax':['salary-tax-calculator-pakistan.html','fbr-tax-calculator-pakistan.html'],
  'tax calculator':['salary-tax-calculator-pakistan.html','fbr-tax-calculator-pakistan.html'],
  'fbr':['salary-tax-calculator-pakistan.html','fbr-atl-status-checker.html','fbr-tax-calculator-pakistan.html'],
  'fbr tax':['salary-tax-calculator-pakistan.html','fbr-tax-calculator-pakistan.html'],
  'fbr atl':['fbr-atl-status-checker.html'],
  'atl':['fbr-atl-status-checker.html'],
  'filer':['fbr-atl-status-checker.html'],
  'active taxpayer':['fbr-atl-status-checker.html'],
  'fbr status':['fbr-atl-status-checker.html'],
  'bijli bill':['electricity-bill-calculator-pakistan.html'],
  'bijli bil':['electricity-bill-calculator-pakistan.html'],
  'wapda':['electricity-bill-calculator-pakistan.html'],
  'lesco':['electricity-bill-calculator-pakistan.html'],
  'kelectric':['electricity-bill-calculator-pakistan.html'],
  'k electric':['electricity-bill-calculator-pakistan.html'],
  'electric bill':['electricity-bill-calculator-pakistan.html'],
  'jobs':['pakistan-jobs-finder.html'],
  'job':['pakistan-jobs-finder.html'],
  'government jobs':['pakistan-jobs-finder.html'],
  'govt jobs':['pakistan-jobs-finder.html'],
  'vacancies':['pakistan-jobs-finder.html'],
  'whatsapp link':['whatsapp-link-generator.html'],
  'wa link':['whatsapp-link-generator.html'],
  'wa me':['whatsapp-link-generator.html'],
  'click to chat':['whatsapp-link-generator.html'],
  'xray':['xray.html'],
  'x-ray':['xray.html'],
  'link checker':['xray.html'],
  'url scanner':['xray.html'],
  'redirect detector':['xray.html'],
  'phishing link':['xray.html'],
  'zakat':['zakat-calculator-pakistan.html'],
  'qibla':['prayer-times-qibla-pakistan.html']
});

const TYPE_LABELS = Object.freeze({
  tool:'Tool',
  article:'Article',
  guide:'Guide',
  category:'Category'
});

function normalizeSearchText(value){
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function tokenizeSearchText(value){
  const normalized=normalizeSearchText(value);
  return normalized.match(/[\p{L}\p{N}]+/gu)||[];
}

function compactSearchText(value){
  return tokenizeSearchText(value).join('');
}

function levenshteinDistance(a,b){
  const left=String(a||''), right=String(b||'');
  if(left===right) return 0;
  if(!left.length) return right.length;
  if(!right.length) return left.length;

  let previous=Array.from({length:right.length+1},(_,i)=>i);
  let current=new Array(right.length+1);

  for(let row=1;row<=left.length;row+=1){
    current[0]=row;
    for(let column=1;column<=right.length;column+=1){
      const substitution=left[row-1]===right[column-1]?0:1;
      current[column]=Math.min(
        current[column-1]+1,
        previous[column]+1,
        previous[column-1]+substitution
      );
    }
    [previous,current]=[current,previous];
  }
  return previous[right.length];
}

function bigramDiceSimilarity(a,b){
  const left=String(a||''), right=String(b||'');
  if(left===right) return 1;
  if(left.length<2||right.length<2) return 0;

  const leftCounts=new Map(), rightCounts=new Map();
  for(let i=0;i<left.length-1;i+=1){
    const gram=left.slice(i,i+2);
    leftCounts.set(gram,(leftCounts.get(gram)||0)+1);
  }
  for(let i=0;i<right.length-1;i+=1){
    const gram=right.slice(i,i+2);
    rightCounts.set(gram,(rightCounts.get(gram)||0)+1);
  }

  let intersection=0;
  for(const [gram,count] of leftCounts){
    intersection+=Math.min(count,rightCounts.get(gram)||0);
  }

  return (2*intersection)/Math.max(1,(left.length-1)+(right.length-1));
}

function fuzzyTokenScore(queryToken,candidateToken){
  const query=String(queryToken||''), candidate=String(candidateToken||'');
  if(!query||!candidate) return 0;
  if(query===candidate) return 1;

  if(candidate.includes(query)&&query.length>=3) return 0.93;

  const maxLength=Math.max(query.length,candidate.length);
  if(maxLength<4) return 0;

  const distance=levenshteinDistance(query,candidate);
  const allowed=maxLength<=5?1:(maxLength<=8?2:(maxLength<=12?3:4));
  if(distance>allowed) return 0;

  const editSimilarity=1-(distance/maxLength);
  const diceSimilarity=bigramDiceSimilarity(query,candidate);
  return editSimilarity*0.6+diceSimilarity*0.4;
}

function tokenCoverage(queryTokens,candidateTokens){
  if(!queryTokens.length||!candidateTokens.length){
    return {coverage:0,exact:0,fuzzy:0,distance:99};
  }

  let exact=0,fuzzy=0,total=0,totalDistance=0;

  for(const queryToken of queryTokens){
    let bestScore=0,bestDistance=99;

    for(const candidateToken of candidateTokens){
      if(queryToken===candidateToken){
        bestScore=1;
        bestDistance=0;
        break;
      }

      if(candidateToken.includes(queryToken)&&queryToken.length>=3){
        bestScore=Math.max(bestScore,0.93);
        bestDistance=Math.min(bestDistance,Math.abs(candidateToken.length-queryToken.length));
        continue;
      }

      const fuzzy=fuzzyTokenScore(queryToken,candidateToken);
      if(fuzzy>bestScore){
        bestScore=fuzzy;
        bestDistance=levenshteinDistance(queryToken,candidateToken);
      }
    }

    if(bestScore>=0.999) exact+=1;
    else if(bestScore>=0.55) fuzzy+=1;

    total+=bestScore;
    if(bestDistance<99) totalDistance+=bestDistance;
  }

  return {
    coverage:total/Math.max(1,queryTokens.length),
    exact,
    fuzzy,
    distance:totalDistance/Math.max(1,queryTokens.length)
  };
}

function countByType(records){
  return records.reduce((counts,record)=>{
    counts[record.type]=(counts[record.type]||0)+1;
    return counts;
  },{});
}

class NexusNovaSearchCore{
  constructor(options={}){
    this.maxResults=Number.isFinite(options.maxResults)
      ? Math.max(1,Math.floor(options.maxResults))
      : 8;

    this.data=NEXUSNOVA_SEARCH_DATA;

    const counts=countByType(this.data);
    for(const type of Object.keys(NEXUSNOVA_EXPECTED_COUNTS)){
      if(counts[type]!==NEXUSNOVA_EXPECTED_COUNTS[type]){
        throw new Error(
          'NexusNova search index integrity error: '+
          type+' expected '+NEXUSNOVA_EXPECTED_COUNTS[type]+
          ', found '+(counts[type]||0)
        );
      }
    }

    this.records=this.data.map((record,index)=>{
      const title=normalizeSearchText(record.title);
      const url=normalizeSearchText(record.url);
      const tags=record.tags.map(normalizeSearchText).filter(Boolean);

      return Object.freeze({
        ...record,
        _index:index,
        _title:title,
        _url:url,
        _tags:Object.freeze(tags),
        _titleTokens:Object.freeze(tokenizeSearchText(title)),
        _urlTokens:Object.freeze(tokenizeSearchText(url)),
        _tagTokens:Object.freeze([...new Set(tags.flatMap(tokenizeSearchText))]),
        _titleCompact:compactSearchText(title),
        _urlCompact:compactSearchText(url)
      });
    });
  }

  normalize(value){ return normalizeSearchText(value); }
  tokenize(value){ return tokenizeSearchText(value); }

  scoreField(query,queryTokens,field,tokens,weights){
    if(!field) return null;

    if(field===query){
      return {score:weights.exact,coverage:1,exact:queryTokens.length,fuzzy:0,distance:0,mode:'exact'};
    }

    if(field.includes(query)){
      return {score:weights.phrase,coverage:1,exact:queryTokens.length,fuzzy:0,distance:0,mode:'phrase'};
    }

    const coverage=tokenCoverage(queryTokens,tokens);
    if(coverage.coverage<0.62) return null;

    let score=weights.token*coverage.coverage;
    score+=weights.exactToken*coverage.exact;
    score+=weights.fuzzyToken*coverage.fuzzy;

    return {
      score,
      coverage:coverage.coverage,
      exact:coverage.exact,
      fuzzy:coverage.fuzzy,
      distance:coverage.distance,
      mode:coverage.fuzzy?'fuzzy':'token'
    };
  }

  scoreRecord(query,queryTokens,record){
    const title=this.scoreField(
      query,queryTokens,record._title,record._titleTokens,
      {exact:1900,phrase:1550,token:1200,exactToken:70,fuzzyToken:35}
    );

    const url=this.scoreField(
      query,queryTokens,record._url,record._urlTokens,
      {exact:1200,phrase:1000,token:800,exactToken:45,fuzzyToken:24}
    );

    const tags=this.scoreField(
      query,queryTokens,record._tags.join(' '),record._tagTokens,
      {exact:1400,phrase:1150,token:980,exactToken:55,fuzzyToken:30}
    );

    if(!title&&!url&&!tags) return null;

    const best=[title,url,tags].filter(Boolean).reduce((winner,current)=>
      current.score>winner.score?current:winner
    );

    let score=best.score;

    if(title&&tags) score+=170;
    if(title&&url) score+=100;
    if(url&&tags) score+=70;

    if(best.coverage>=0.999) score+=280;
    else if(best.coverage>=0.8) score+=120;

    if(title?.mode==='exact') score+=420;
    if(tags?.mode==='exact') score+=220;

    score+=record.type==='tool'?8:(record.type==='category'?6:0);

    const aliasTargets=NEXUSNOVA_ALIAS_MAP[query];
    const isAliasTarget=aliasTargets?.includes(record.url);
    if(isAliasTarget) score+=3500;

    return {
      record,
      score,
      match:{
        field:best===title?'title':(best===url?'url':'tags'),
        mode:best.mode,
        coverage:best.coverage,
        exactTokens:best.exact,
        fuzzyTokens:best.fuzzy,
        distance:best.distance,
        alias:Boolean(isAliasTarget)
      }
    };
  }

  query(input){
    const query=normalizeSearchText(input);
    if(!query) return [];

    const queryTokens=tokenizeSearchText(query);
    if(!queryTokens.length) return [];

    const aliasTargets=NEXUSNOVA_ALIAS_MAP[query];
    const scored=[];

    for(const record of this.records){
      const result=this.scoreRecord(query,queryTokens,record);
      if(!result) continue;

      if(aliasTargets&&!aliasTargets.includes(result.record.url)) continue;
      scored.push(result);
    }

    scored.sort((left,right)=>{
      if(right.score!==left.score) return right.score-left.score;
      if(right.match.coverage!==left.match.coverage) return right.match.coverage-left.match.coverage;
      if(right.match.exactTokens!==left.match.exactTokens) return right.match.exactTokens-left.match.exactTokens;
      if(right.match.fuzzyTokens!==left.match.fuzzyTokens) return right.match.fuzzyTokens-left.match.fuzzyTokens;
      if(left.match.distance!==right.match.distance) return left.match.distance-right.match.distance;
      return left.record._index-right.record._index;
    });

    const seenUrls=new Set();
    const output=[];

    for(const item of scored){
      if(seenUrls.has(item.record.url)) continue;
      seenUrls.add(item.record.url);

      output.push({
        title:'['+TYPE_LABELS[item.record.type]+'] '+item.record.title,
        displayTitle:item.record.title,
        label:'['+TYPE_LABELS[item.record.type]+']',
        url:item.record.url,
        type:item.record.type,
        category:item.record.category,
        tags:[...item.record.tags],
        match:item.match
      });

      if(output.length>=this.maxResults) break;
    }

    return output;
  }

  get size(){ return this.records.length; }
  getCounts(){ return countByType(this.data); }

  getData(){
    return this.data.map(record=>({
      title:record.title,
      url:record.url,
      type:record.type,
      category:record.category,
      tags:[...record.tags]
    }));
  }

  renderDropdown(panel,results,options={}){
    if(!panel) return;

    const list=Array.isArray(results)?results:[];
    const max=Number.isFinite(options.maxResults)
      ? Math.max(1,Math.floor(options.maxResults))
      : this.maxResults;

    panel.replaceChildren();

    if(!list.length){
      panel.hidden=false;
      const empty=document.createElement('div');
      empty.className=options.emptyClassName||'nn-search-empty';
      empty.setAttribute('role','status');
      empty.textContent=options.emptyText||'No matching NexusNova result found.';
      panel.appendChild(empty);
      return;
    }

    const fragment=document.createDocumentFragment();

    list.slice(0,max).forEach((result,index)=>{
      const item=document.createElement('a');
      item.id='nn-core-search-result-'+(index+1);
      item.className='nn-search-result';
      item.href=result.url;
      item.setAttribute('role','option');
      item.setAttribute('data-nn-search-result','');

      const icon=document.createElement('span');
      icon.className='nn-search-result-icon';
      icon.setAttribute('aria-hidden','true');
      icon.textContent=String(index+1).padStart(2,'0');

      const main=document.createElement('span');
      main.className='nn-search-result-main';

      const title=document.createElement('span');
      title.className='nn-search-result-title';
      title.textContent=result.title;

      const meta=document.createElement('span');
      meta.className='nn-search-result-meta';
      meta.textContent=result.category||result.type;

      main.appendChild(title);
      main.appendChild(meta);
      item.appendChild(icon);
      item.appendChild(main);
      item.appendChild(document.createTextNode('→'));
      fragment.appendChild(item);
    });

    panel.appendChild(fragment);
    panel.hidden=false;
  }

  bindDropdown({input,form,panel,maxResults=this.maxResults}={}){
    if(!input||!form||!panel) return ()=>{};

    let activeIndex=-1;

    const close=()=>{
      panel.replaceChildren();
      panel.hidden=true;
      input.setAttribute('aria-expanded','false');
      input.setAttribute('aria-activedescendant','');
      activeIndex=-1;
    };

    const setActive=(index)=>{
      const items=[...panel.querySelectorAll('[data-nn-search-result]')];
      if(!items.length){
        activeIndex=-1;
        input.setAttribute('aria-activedescendant','');
        return;
      }

      activeIndex=((index%items.length)+items.length)%items.length;

      items.forEach((item,itemIndex)=>{
        item.classList.toggle('is-active',itemIndex===activeIndex);
      });

      const active=items[activeIndex];
      active?.scrollIntoView({block:'nearest'});
      input.setAttribute('aria-activedescendant',active?.id||'');
    };

    const render=()=>{
      const value=String(input.value||'').trim();
      if(!value){
        close();
        return;
      }

      this.renderDropdown(panel,this.query(value).slice(0,maxResults),{maxResults});
      input.setAttribute('aria-expanded','true');
      setActive(-1);
    };

    const onSubmit=event=>{
      const results=this.query(String(input.value||'').trim()).slice(0,maxResults);
      if(!results.length){
        event.preventDefault();
        render();
        return;
      }

      event.preventDefault();
      window.location.assign(results[0].url);
    };

    const onKeyDown=event=>{
      const items=panel.querySelectorAll('[data-nn-search-result]');
      const hasResults=items.length>0;

      if(event.key==='ArrowDown'&&hasResults){
        event.preventDefault();
        setActive(activeIndex+1);
        return;
      }

      if(event.key==='ArrowUp'&&hasResults){
        event.preventDefault();
        setActive(activeIndex-1);
        return;
      }

      if(event.key==='Enter'&&hasResults&&activeIndex>=0){
        event.preventDefault();
        const active=items[activeIndex];
        if(active?.href) window.location.assign(active.href);
        return;
      }

      if(event.key==='Escape'){
        event.preventDefault();
        close();
      }
    };

    const onOutsidePointer=event=>{
      if(!form.contains(event.target)&&!panel.contains(event.target)) close();
    };

    input.addEventListener('input',render);
    input.addEventListener('focus',render);
    input.addEventListener('keydown',onKeyDown);
    form.addEventListener('submit',onSubmit);
    document.addEventListener('pointerdown',onOutsidePointer);

    return ()=>{
      input.removeEventListener('input',render);
      input.removeEventListener('focus',render);
      input.removeEventListener('keydown',onKeyDown);
      form.removeEventListener('submit',onSubmit);
      document.removeEventListener('pointerdown',onOutsidePointer);
      close();
    };
  }
}

NexusNovaSearchCore.DATASET_COUNTS=Object.freeze({
  tool:94,
  category:9,
  article:14,
  guide:8
});

NexusNovaSearchCore.DATASET_SIZE=125;

if(typeof window!=='undefined'){
  window.NexusNovaSearchCore=NexusNovaSearchCore;
  window.NexusNovaSearchData=NEXUSNOVA_SEARCH_DATA;
}

if(typeof globalThis!=='undefined'){
  globalThis.NexusNovaSearchCore=NexusNovaSearchCore;
}
