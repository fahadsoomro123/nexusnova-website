'use strict';

/**
 * NexusNova Deep Client-Side Search Core
 * --------------------------------------
 * Public search index for all published homepage content.
 *
 * Static inventory:
 *   94 tools + 9 categories + 14 articles + 8 guides = 125 records.
 * No network requests are used by the search engine.
 */

const NEXUSNOVA_SEARCH_DATA = Object.freeze([
  { title: "Image Compressor", url: "image-compressor.html", type: "tool", category: "Images", tags: ["image compressor","image","compressor","images","process","focused","browser","workflow","tool","utility"] },
  { title: "Image to Text OCR", url: "image-to-text-ocr.html", type: "tool", category: "Images", tags: ["image to text ocr","image","text","ocr","images","extract","readable","focused","browser","workflow","tool","utility"] },
  { title: "Image Metadata Remover", url: "image-metadata-remover.html", type: "tool", category: "Images", tags: ["image metadata remover","image","metadata","remover","images","remove","embedded","before","sharing","publishing","file","tool","utility"] },
  { title: "Image Resizer", url: "image-resizer.html", type: "tool", category: "Images", tags: ["image resizer","image","resizer","images","process","focused","browser","workflow","tool","utility"] },
  { title: "Photo CCTV Enhancer", url: "photo-cctv-enhancer.html", type: "tool", category: "Images", tags: ["photo cctv enhancer","photo","cctv","enhancer","images","enhance","clearer","inspection","practical","image","review","tool","utility"] },
  { title: "AVIF to JPG", url: "avif-to-jpg.html", type: "tool", category: "Images", tags: ["avif to jpg","avif","jpg","images","convert","focused","browser","workflow","clear","outputs","tool","utility"] },
  { title: "HEIC to JPG", url: "heic-to-jpg.html", type: "tool", category: "Images", tags: ["heic to jpg","heic","jpg","images","convert","focused","browser","workflow","clear","outputs","tool","utility"] },
  { title: "JPG to PNG", url: "jpg-to-png.html", type: "tool", category: "Images", tags: ["jpg to png","jpg","png","images","convert","focused","browser","workflow","clear","outputs","tool","utility"] },
  { title: "PNG to JPG", url: "png-to-jpg.html", type: "tool", category: "Images", tags: ["png to jpg","png","jpg","images","convert","focused","browser","workflow","clear","outputs","tool","utility"] },
  { title: "WebP to JPG", url: "webp-to-jpg.html", type: "tool", category: "Images", tags: ["webp to jpg","webp","jpg","images","convert","focused","browser","workflow","clear","outputs","tool","utility"] },
  { title: "WebP to PNG", url: "webp-to-png.html", type: "tool", category: "Images", tags: ["webp to png","webp","png","images","convert","focused","browser","workflow","clear","outputs","tool","utility"] },
  { title: "YouTube Thumbnail Downloader", url: "youtube-thumbnail-downloader.html", type: "tool", category: "Images", tags: ["youtube thumbnail downloader","youtube","thumbnail","downloader","images","retrieve","image","through","simple","browser","workflow","tool","utility"] },
  { title: "JPG to PDF", url: "jpg-to-pdf.html", type: "tool", category: "PDF & Documents", tags: ["jpg to pdf","jpg","pdf","documents","convert","focused","browser","workflow","clear","outputs","tool","utility"] },
  { title: "Merge PDF", url: "merge-pdf.html", type: "tool", category: "PDF & Documents", tags: ["merge pdf","merge","pdf","documents","handle","focused","browser","document","workflow","tool","utility"] },
  { title: "Split PDF", url: "split-pdf.html", type: "tool", category: "PDF & Documents", tags: ["split pdf","split","pdf","documents","handle","focused","browser","document","workflow","tool","utility"] },
  { title: "Text to PDF", url: "text-to-pdf.html", type: "tool", category: "PDF & Documents", tags: ["text to pdf","text","pdf","documents","handle","focused","browser","document","workflow","tool","utility"] },
  { title: "AI Token Calculator", url: "ai-token-calculator.html", type: "tool", category: "Calculators", tags: ["ai token calculator","token","calculator","calculators","calculate","clear","inputs","browser","side","results","tool","utility"] },
  { title: "AI VRAM Calculator", url: "ai-vram-calculator.html", type: "tool", category: "Calculators", tags: ["ai vram calculator","vram","calculator","calculators","calculate","clear","inputs","browser","side","results","tool","utility"] },
  { title: "Paper Size Converter", url: "paper-size-converter.html", type: "tool", category: "Calculators", tags: ["paper size converter","paper","size","converter","calculators","convert","focused","browser","workflow","clear","outputs","tool","utility"] },
  { title: "Paper Size in Pixels", url: "paper-size-in-pixels.html", type: "tool", category: "Calculators", tags: ["paper size in pixels","paper","size","pixels","calculators","convert","focused","browser","workflow","clear","outputs","tool","utility"] },
  { title: "Calculator", url: "calculator.html", type: "tool", category: "Calculators", tags: ["calculator","calculators","calculate","clear","inputs","browser","side","results","tool","utility"] },
  { title: "Percentage Calculator", url: "percentage-calculator.html", type: "tool", category: "Calculators", tags: ["percentage calculator","percentage","calculator","calculators","calculate","clear","inputs","browser","side","results","tool","utility"] },
  { title: "Age Calculator", url: "age-calculator.html", type: "tool", category: "Calculators", tags: ["age calculator","age","calculator","calculators","calculate","clear","inputs","browser","side","results","tool","utility"] },
  { title: "Date Difference Calculator", url: "date-difference-calculator.html", type: "tool", category: "Calculators", tags: ["date difference calculator","date","difference","calculator","calculators","calculate","clear","inputs","browser","side","results","tool","utility"] },
  { title: "Discount Calculator", url: "discount-calculator.html", type: "tool", category: "Calculators", tags: ["discount calculator","discount","calculator","calculators","calculate","clear","inputs","browser","side","results","tool","utility"] },
  { title: "Percentage Change Calculator", url: "percentage-change-calculator.html", type: "tool", category: "Calculators", tags: ["percentage change calculator","percentage","change","calculator","calculators","calculate","clear","inputs","browser","side","results","tool","utility"] },
  { title: "BMI Calculator", url: "bmi-calculator.html", type: "tool", category: "Calculators", tags: ["bmi calculator","bmi","calculator","calculators","calculate","clear","inputs","browser","side","results","tool","utility"] },
  { title: "EMI Calculator", url: "emi-calculator.html", type: "tool", category: "Calculators", tags: ["emi calculator","emi","calculator","calculators","calculate","clear","inputs","browser","side","results","tool","utility"] },
  { title: "Scientific Calculator", url: "scientific-calculator.html", type: "tool", category: "Calculators", tags: ["scientific calculator","scientific","calculator","calculators","calculate","clear","inputs","browser","side","results","tool","utility"] },
  { title: "Unit Converter", url: "unit-converter.html", type: "tool", category: "Calculators", tags: ["unit converter","unit","converter","calculators","convert","focused","browser","workflow","clear","outputs","tool","utility"] },
  { title: "Storage Size Converter", url: "storage-size-converter.html", type: "tool", category: "Calculators", tags: ["storage size converter","storage","size","converter","calculators","convert","focused","browser","workflow","clear","outputs","tool","utility"] },
  { title: "Time Duration Calculator", url: "time-duration-calculator.html", type: "tool", category: "Calculators", tags: ["time duration calculator","time","duration","calculator","calculators","calculate","clear","inputs","browser","side","results","tool","utility"] },
  { title: "Online Timer", url: "online-timer.html", type: "tool", category: "Calculators", tags: ["online timer","timer","calculators","through","focused","browser","utility","tool"] },
  { title: "Stopwatch", url: "stopwatch.html", type: "tool", category: "Calculators", tags: ["stopwatch","calculators","through","focused","browser","utility","tool"] },
  { title: "Pomodoro Timer", url: "pomodoro-timer.html", type: "tool", category: "Calculators", tags: ["pomodoro timer","pomodoro","timer","calculators","through","focused","browser","utility","tool"] },
  { title: "Word Counter", url: "word-counter.html", type: "tool", category: "Calculators", tags: ["word counter","word","counter","calculators","through","focused","browser","utility","tool"] },
  { title: "Roman Numeral Converter", url: "roman-numeral-converter.html", type: "tool", category: "Calculators", tags: ["roman numeral converter","roman","numeral","converter","calculators","convert","focused","browser","workflow","clear","outputs","tool","utility"] },
  { title: "RGB to HEX Converter", url: "rgb-hex-converter.html", type: "tool", category: "Calculators", tags: ["rgb to hex converter","rgb hex converter","rgb","hex","converter","calculators","convert","focused","browser","workflow","clear","outputs","tool","utility"] },
  { title: "Bill Split & Tip Calculator", url: "bill-split-tip-calculator.html", type: "tool", category: "Calculators", tags: ["bill split & tip calculator","bill split tip calculator","bill","split","tip","calculator","calculators","calculate","clear","inputs","browser","side","results","tool","utility"] },
  { title: "Pakistan Salary Tax Calculator", url: "salary-tax-calculator-pakistan.html", type: "tool", category: "Pakistan Tools", tags: ["pakistan salary tax calculator","salary tax calculator pakistan","pakistan","salary","tax","calculator","calculate","clear","inputs","browser","side","results","salery","income","fbr","atl","tool","utility","salary tax","income tax","fbr tax","fbr atl","salaried","salary calculator","tax calculator pakistan","pakistan tax"] },
  { title: "Pakistan Electricity Bill Calculator", url: "electricity-bill-calculator-pakistan.html", type: "tool", category: "Pakistan Tools", tags: ["pakistan electricity bill calculator","electricity bill calculator pakistan","pakistan","electricity","bill","calculator","calculate","clear","inputs","browser","side","results","bijli","bil","wapda","lesco","kelectric","electric","tool","utility","bijli bill","bijli bil","k-electric","electric bill","units","tariff","electricity bill pakistan"] },
  { title: "FBR ATL Checker", url: "fbr-atl-status-checker.html", type: "tool", category: "Pakistan Tools", tags: ["fbr active taxpayer status","fbr atl status checker","fbr","active","taxpayer","status","atl","checker","pakistan","focused","specific","browser","task","tool","utility","active taxpayer","filer","non filer","cnic","ntn","passport","fbr atl","taxpayer status"] },
  { title: "FBR Income Tax Calculator", url: "fbr-tax-calculator-pakistan.html", type: "tool", category: "Pakistan Tools", tags: ["fbr tax calculator","fbr tax calculator pakistan","fbr","tax","calculator","pakistan","calculate","clear","inputs","browser","side","results","tool","utility","fbr tax","income tax","tax calculator","salaried","salary","business","self employed","non salaried","tax slab"] },
  { title: "Pakistan Zakat Calculator", url: "zakat-calculator-pakistan.html", type: "tool", category: "Pakistan Tools", tags: ["pakistan zakat calculator","zakat calculator pakistan","pakistan","zakat","calculator","calculate","clear","inputs","browser","side","results","tool","utility","nisab","2.5 percent","pakistan zakat","charity"] },
  { title: "Prayer Times & Qibla Pakistan", url: "prayer-times-qibla-pakistan.html", type: "tool", category: "Pakistan Tools", tags: ["prayer times & qibla pakistan","prayer times qibla pakistan","prayer","times","qibla","pakistan","focused","specific","browser","task","tool","utility","namaz","salah","karachi method","pakistan prayer times"] },
  { title: "Pakistan Public Holidays 2026", url: "pakistan-public-holidays-2026.html", type: "tool", category: "Pakistan Tools", tags: ["pakistan public holidays 2026","pakistan","public","holidays","2026","focused","specific","browser","task","tool","utility"] },
  { title: "Government Jobs Portal", url: "pakistan-jobs-finder.html", type: "tool", category: "Pakistan Tools", tags: ["pakistan jobs finder","pakistan","jobs","finder","generate","prepare","simple","browser","workflow","tool","utility","job","government jobs","govt jobs","government job","public sector jobs","departmental openings","vacancies","career","employment","pakistan jobs"] },
  { title: "QR Code Generator", url: "qr-code-generator.html", type: "tool", category: "Security", tags: ["qr code generator","code","generator","security","generate","prepare","simple","browser","workflow","tool","utility"] },
  { title: "QR Code Scanner", url: "qr-code-scanner.html", type: "tool", category: "Security", tags: ["qr code scanner","code","scanner","security","check","browser","focused","result","view","tool","utility"] },
  { title: "NexusNova X-Ray", url: "xray.html", type: "tool", category: "Security", tags: ["nexusnova x-ray","xray","ray","security","inspect","url","before","opening","through","dedicated","workflow","link","checker","scanner","redirect","detector","tool","utility","x-ray","link checker","url scanner","redirect detector","inspect link","phishing link","suspicious link"] },
  { title: "DNS Lookup", url: "dns-lookup.html", type: "tool", category: "Security", tags: ["dns lookup","dns","lookup","security","check","browser","focused","result","view","tool","utility"] },
  { title: "SSL Certificate Checker", url: "ssl-certificate-checker.html", type: "tool", category: "Security", tags: ["ssl certificate checker","ssl","certificate","checker","security","check","browser","focused","result","view","tool","utility"] },
  { title: "Public IP Checker", url: "public-ip-checker.html", type: "tool", category: "Security", tags: ["public ip checker","public","checker","security","check","browser","focused","result","view","tool","utility"] },
  { title: "IP CIDR Calculator", url: "ip-cidr-calculator.html", type: "tool", category: "Security", tags: ["ip cidr calculator","cidr","calculator","security","calculate","clear","inputs","browser","side","results","tool","utility"] },
  { title: "Website Reachability Checker", url: "website-reachability-checker.html", type: "tool", category: "Security", tags: ["website reachability checker","website","reachability","checker","security","check","browser","focused","result","view","tool","utility"] },
  { title: "Contrast Checker", url: "contrast-checker.html", type: "tool", category: "Security", tags: ["contrast checker","contrast","checker","security","check","browser","focused","result","view","tool","utility"] },
  { title: "Password Generator", url: "password-generator.html", type: "tool", category: "Security", tags: ["password generator","password","generator","security","generate","prepare","simple","browser","workflow","tool","utility"] },
  { title: "Password Strength Checker", url: "password-strength-checker.html", type: "tool", category: "Security", tags: ["password strength checker","password","strength","checker","security","check","browser","focused","result","view","tool","utility"] },
  { title: "Text Diff Checker", url: "text-diff-checker.html", type: "tool", category: "Security", tags: ["text diff checker","text","diff","checker","security","check","browser","focused","result","view","tool","utility"] },
  { title: "CSV to JSON Converter", url: "csv-json-converter.html", type: "tool", category: "Developer & Data", tags: ["csv to json converter","csv json converter","csv","json","converter","developer","data","convert","focused","browser","workflow","clear","outputs","tool","utility"] },
  { title: "Meta Tag Generator", url: "meta-tag-generator.html", type: "tool", category: "Developer & Data", tags: ["meta tag generator","meta","tag","generator","developer","data","generate","prepare","simple","browser","workflow","tool","utility"] },
  { title: "Unix Timestamp Converter", url: "unix-timestamp-converter.html", type: "tool", category: "Developer & Data", tags: ["unix timestamp converter","unix","timestamp","converter","developer","data","convert","focused","browser","workflow","clear","outputs","tool","utility"] },
  { title: "Magic Drop", url: "magic-drop.html", type: "tool", category: "Productivity", tags: ["magic drop","magic","drop","productivity","utility","focused","browser","based","file","content","workflow","tool"] },
  { title: "AI Prompt Builder", url: "ai-prompt-builder.html", type: "tool", category: "Productivity", tags: ["ai prompt builder","prompt","builder","productivity","generate","prepare","simple","browser","workflow","tool","utility"] },
  { title: "Invoice Maker", url: "invoice-maker.html", type: "tool", category: "Productivity", tags: ["invoice maker","invoice","maker","productivity","generate","prepare","simple","browser","workflow","tool","utility"] },
  { title: "Resume Builder", url: "resume-builder.html", type: "tool", category: "Productivity", tags: ["resume builder","resume","builder","productivity","generate","prepare","simple","browser","workflow","tool","utility"] },
  { title: "Decision Matrix Calculator", url: "decision-matrix-calculator.html", type: "tool", category: "Productivity", tags: ["decision matrix calculator","decision","matrix","calculator","productivity","calculate","clear","inputs","browser","side","results","tool","utility"] },
  { title: "Global Meeting Planner", url: "timezone-meeting-planner.html", type: "tool", category: "Productivity", tags: ["global meeting planner","timezone meeting planner","global","meeting","planner","timezone","productivity","focused","browser","task","tool","utility"] },
  { title: "Number to Words", url: "number-to-words.html", type: "tool", category: "Productivity", tags: ["number to words","number","words","productivity","convert","focused","browser","workflow","clear","outputs","tool","utility"] },
  { title: "WhatsApp Link Generator", url: "whatsapp-link-generator.html", type: "tool", category: "Productivity", tags: ["whatsapp link generator","whatsapp","link","generator","productivity","generate","prepare","simple","browser","workflow","chat","click","tool","utility","wa link","wa.me","chat link","click to chat","business message","whatsapp business"] },
  { title: "Random Number Generator", url: "random-number-generator.html", type: "tool", category: "Productivity", tags: ["random number generator","random","number","generator","productivity","generate","prepare","simple","browser","workflow","tool","utility"] },
  { title: "Random Picker", url: "random-picker.html", type: "tool", category: "Productivity", tags: ["random picker","random","picker","productivity","focused","browser","task","tool","utility"] },
  { title: "Typing Speed Test", url: "typing-speed-test.html", type: "tool", category: "Productivity", tags: ["typing speed test","typing","speed","test","productivity","focused","browser","task","tool","utility"] },
  { title: "Text Case Converter", url: "text-case-converter.html", type: "tool", category: "Productivity", tags: ["text case converter","text","case","converter","productivity","convert","focused","browser","workflow","clear","outputs","tool","utility"] },
  { title: "Private Quick Note", url: "private-quick-note.html", type: "tool", category: "Productivity", tags: ["private quick note","private","quick","note","productivity","keep","small","browser","device","without","sending","server","tool","utility"] },
  { title: "Reaction Time Test", url: "reaction-time-test.html", type: "tool", category: "Gaming", tags: ["reaction time test","reaction","time","test","gaming","focused","utility","workflow","tool"] },
  { title: "eDPI Calculator", url: "edpi-calculator.html", type: "tool", category: "Gaming", tags: ["edpi calculator","edpi","calculator","gaming","calculate","clear","inputs","browser","side","results","tool","utility"] },
  { title: "FPS Frame Time Calculator", url: "fps-frame-time-calculator.html", type: "tool", category: "Gaming", tags: ["fps frame time calculator","fps","frame","time","calculator","gaming","calculate","clear","inputs","browser","side","results","tool","utility"] },
  { title: "Gaming Sensitivity Converter", url: "gaming-sensitivity-converter.html", type: "tool", category: "Gaming", tags: ["gaming sensitivity converter","gaming","sensitivity","converter","convert","focused","browser","workflow","clear","outputs","tool","utility"] },
  { title: "Minecraft Coordinate Converter", url: "minecraft-coordinate-converter.html", type: "tool", category: "Gaming", tags: ["minecraft coordinate converter","minecraft","coordinate","converter","gaming","convert","focused","browser","workflow","clear","outputs","tool","utility"] },
  { title: "Gamer Name Generator", url: "gamer-name-generator.html", type: "tool", category: "Gaming", tags: ["gamer name generator","gamer","name","generator","gaming","generate","prepare","simple","browser","workflow","tool","utility"] },
  { title: "Steam Playtime Calculator", url: "steam-playtime-calculator.html", type: "tool", category: "Gaming", tags: ["steam playtime calculator","steam","playtime","calculator","gaming","calculate","clear","inputs","browser","side","results","tool","utility"] },
  { title: "Pakistan Today Dashboard", url: "live.html", type: "tool", category: "Live Information", tags: ["pakistan today dashboard","live","pakistan","today","dashboard","information","open","focused","current","public","quick","checks","tool","utility","pakistan today","market rates","weather","sports","gold","fuel","currency","aqi","crypto","earthquakes"] },
  { title: "Currency Rates", url: "currency-rates.html", type: "tool", category: "Live Information", tags: ["currency rates","currency","rates","live","information","view","through","focused","browser","page","tool","utility"] },
  { title: "Gold Rates", url: "gold-rates.html", type: "tool", category: "Live Information", tags: ["gold rates","gold","rates","live","information","view","through","focused","browser","page","tool","utility"] },
  { title: "Fuel Rates", url: "fuel-rates.html", type: "tool", category: "Live Information", tags: ["fuel rates","fuel","rates","live","information","view","through","focused","browser","page","tool","utility"] },
  { title: "Pakistan Weather", url: "weather-live.html", type: "tool", category: "Live Information", tags: ["pakistan weather","weather live","pakistan","weather","live","information","view","through","focused","browser","page","tool","utility"] },
  { title: "Air Quality", url: "aqi-live.html", type: "tool", category: "Live Information", tags: ["air quality","aqi live","air","quality","aqi","live","information","view","through","focused","browser","page","tool","utility"] },
  { title: "Recent Earthquakes", url: "earthquakes-live.html", type: "tool", category: "Live Information", tags: ["recent earthquakes","earthquakes live","recent","earthquakes","live","information","view","through","focused","browser","page","tool","utility"] },
  { title: "Crypto Market", url: "crypto-live.html", type: "tool", category: "Live Information", tags: ["crypto market","crypto live","crypto","market","live","information","view","through","focused","browser","page","tool","utility"] },
  { title: "Live Alerts", url: "live-alerts.html", type: "tool", category: "Live Information", tags: ["live alerts","live","alerts","information","view","through","focused","browser","page","tool","utility"] },
  { title: "Live Sports", url: "sports-live.html", type: "tool", category: "Live Information", tags: ["live sports","sports live","live","sports","information","view","through","focused","browser","page","tool","utility"] },
  { title: "NexusNova Pulse", url: "pulse.html", type: "tool", category: "Live Information", tags: ["nexusnova pulse","pulse","live","information","view","through","focused","browser","page","tool","utility"] },
  { title: "Pakistan Today Widget", url: "widget-pakistan-today.html", type: "tool", category: "Live Information", tags: ["pakistan today widget","widget pakistan today","pakistan","today","widget","live","information","view","through","focused","browser","page","tool","utility"] },
  { title: "Images", url: "image-tools.html", type: "category", category: "", tags: ["images","image tools","image","compress","resize","convert","inspect","extract","text","visual","files","category","hub"] },
  { title: "PDF & Documents", url: "pdf-tools.html", type: "category", category: "", tags: ["pdf & documents","pdf tools","pdf","documents","merge","split","create","browser","category","hub"] },
  { title: "Calculators", url: "calculator-tools.html", type: "category", category: "", tags: ["calculators","calculator tools","calculator","mathematical","financial","percentage","date","bmi","scientific","utilities","category","hub"] },
  { title: "Pakistan Tools", url: "pakistan-tools.html", type: "category", category: "", tags: ["pakistan tools","pakistan","localized","tax","electricity","fbr","zakat","prayer","jobs","utilities","category","hub"] },
  { title: "Security & Network", url: "network-tools.html", type: "category", category: "", tags: ["security & network","network tools","security","network","dns","ssl","cidr","reachability","url","inspection","category","hub"] },
  { title: "Developer & Data", url: "developer-tools.html", type: "category", category: "", tags: ["developer & data","developer tools","developer","data","practical","utilities","browser","workflows","category","hub"] },
  { title: "Productivity", url: "productivity-tools.html", type: "category", category: "", tags: ["productivity","productivity tools","writing","links","notes","timers","planning","everyday","category","hub"] },
  { title: "Gaming", url: "gaming.html", type: "category", category: "", tags: ["gaming","sensitivity","edpi","reaction","related","calculation","utilities","category","hub"] },
  { title: "Live Information", url: "live.html", type: "category", category: "", tags: ["live information","live","information","dashboards","weather","rates","air","quality","earthquakes","sports","alerts","category","hub","today","pakistan today","market rates","gold","fuel","currency","aqi","crypto"] },
  { title: "CS2 vs Valorant Sensitivity & eDPI", url: "articles/cs2-valorant-sensitivity-edpi-guide.html", type: "article", category: "Articles", tags: ["cs2 vs valorant sensitivity & edpi","articles cs2 valorant sensitivity edpi guide","cs2","valorant","sensitivity","edpi","articles","guide","understand","conversion","ratios","effective","dpi","why","matched","numbers","still","feel","different","across","game","engines","article","explainer"] },
  { title: "AI Photo Restoration vs Enhancement", url: "articles/ai-photo-restoration-vs-enhancement.html", type: "article", category: "Articles", tags: ["ai photo restoration vs enhancement","articles ai photo restoration vs enhancement","photo","restoration","enhancement","articles","understand","sharpening","reveal","when","generative","algorithms","may","invent","plausible","but","unverified","detail","article","explainer"] },
  { title: "Online Background Removers in 2026", url: "articles/background-removal-online-guide.html", type: "article", category: "Articles", tags: ["online background removers in 2026","articles background removal online guide","background","removers","2026","articles","removal","guide","check","edge","quality","transparency","client","side","privacy","output","resolution","before","trusting","click","automated","result","article","explainer"] },
  { title: "Remove EXIF and GPS Metadata Before Sharing", url: "articles/remove-exif-gps-metadata-photos.html", type: "article", category: "Articles", tags: ["remove exif and gps metadata before sharing","articles remove exif gps metadata photos","remove","exif","gps","metadata","before","sharing","articles","photos","strip","unnecessary","camera","details","location","coordinates","device","timestamps","while","maintaining","uncompressed","copy","article","explainer"] },
  { title: "JPG vs PNG vs WebP vs AVIF", url: "articles/jpg-png-webp-avif-guide.html", type: "article", category: "Articles", tags: ["jpg vs png vs webp vs avif","articles jpg png webp avif guide","jpg","png","webp","avif","articles","guide","choose","sensible","file","format","photos","screenshots","icons","web","graphics","balance","speed","fidelity","article","explainer"] },
  { title: "How to Split a PDF and Keep Pages Organized", url: "articles/split-pdf-organize-pages.html", type: "article", category: "Articles", tags: ["how to split a pdf and keep pages organized","articles split pdf organize pages","split","pdf","keep","pages","organized","articles","organize","extract","specific","page","intervals","name","output","files","clearly","verify","layout","structure","without","cloud","data","uploads","article","explainer"] },
  { title: "EMI Calculator Explained", url: "articles/emi-calculator-explained.html", type: "article", category: "Articles", tags: ["emi calculator explained","articles emi calculator explained","emi","calculator","explained","articles","deconstruct","principal","amortization","reducing","balance","interest","rates","loan","tenure","before","finalizing","financing","scenarios","article","explainer"] },
  { title: "Use a Pomodoro Timer Without Overcomplicating Focus", url: "articles/pomodoro-focus-workflow.html", type: "article", category: "Articles", tags: ["use a pomodoro timer without overcomplicating focus","articles pomodoro focus workflow","pomodoro","timer","without","overcomplicating","focus","articles","workflow","implement","structured","minute","work","blocks","restorative","intervals","turning","tracking","administrative","burden","article","explainer"] },
  { title: "7 Resume Mistakes to Fix", url: "articles/resume-mistakes-to-fix.html", type: "article", category: "Articles", tags: ["7 resume mistakes to fix","articles resume mistakes to fix","resume","mistakes","fix","articles","eliminate","ambiguous","terminology","crowded","typography","formatting","defects","before","submitting","applications","hiring","managers","article","explainer"] },
  { title: "Unix Timestamps Explained", url: "articles/unix-timestamps-explained.html", type: "article", category: "Articles", tags: ["unix timestamps explained","articles unix timestamps explained","unix","timestamps","explained","articles","understand","seconds","epoch","milliseconds","utc","normalization","common","leap","second","edge","cases","system","programming","article","explainer"] },
  { title: "HEX vs RGB Color Codes", url: "articles/hex-vs-rgb-colors.html", type: "article", category: "Articles", tags: ["hex vs rgb color codes","articles hex vs rgb colors","hex","rgb","color","codes","articles","colors","explore","hexadecimal","base","channels","versus","bit","notation","their","practical","usage","across","css","workflows","article","explainer"] },
  { title: "Compress Images for Web Without Ruining Quality", url: "articles/compress-images-for-web.html", type: "article", category: "Articles", tags: ["compress images for web without ruining quality","articles compress images for web","compress","images","web","without","ruining","quality","articles","resize","pixel","dimensions","select","appropriate","lossy","thresholds","benchmark","compression","savings","before","asset","delivery","article","explainer"] },
  { title: "Merge PDF Files With Privacy in Mind", url: "articles/merge-pdf-privately.html", type: "article", category: "Articles", tags: ["merge pdf files with privacy in mind","articles merge pdf privately","merge","pdf","files","privacy","mind","articles","privately","prepare","source","documents","arrange","page","sequences","compile","consolidated","pdfs","locally","browser","session","article","explainer"] },
  { title: "QR Code Best Practices", url: "articles/qr-code-best-practices.html", type: "article", category: "Articles", tags: ["qr code best practices","articles qr code best practices","code","best","practices","articles","design","scannable","matrix","barcodes","adequate","quiet","zones","high","error","correction","levels","strong","foreground","contrast","article","explainer"] },
  { title: "How to use a weighted decision matrix without fooling yourself.", url: "guides/weighted-decision-matrix.html", type: "guide", category: "Guides", tags: ["how to use a weighted decision matrix without fooling yourself.","guides weighted decision matrix","weighted","decision","matrix","without","fooling","yourself","guides","read","practical","guide","continue","linked","workflow","how to","methodology"] },
  { title: "Percentages without confusion", url: "guides/percentage-basics.html", type: "guide", category: "Guides", tags: ["percentages without confusion","guides percentage basics","percentages","without","confusion","guides","percentage","basics","read","practical","guide","continue","linked","workflow","how to","methodology"] },
  { title: "Stronger password habits for everyday accounts", url: "guides/password-security.html", type: "guide", category: "Guides", tags: ["stronger password habits for everyday accounts","guides password security","stronger","password","habits","everyday","accounts","guides","security","read","practical","guide","continue","linked","workflow","how to","methodology"] },
  { title: "Unit conversion made practical", url: "guides/unit-conversion.html", type: "guide", category: "Guides", tags: ["unit conversion made practical","guides unit conversion","unit","conversion","made","practical","guides","read","guide","continue","linked","workflow","how to","methodology"] },
  { title: "Compress images without guesswork.", url: "guides/image-compression.html", type: "guide", category: "Guides", tags: ["compress images without guesswork.","guides image compression","compress","images","without","guesswork","guides","image","compression","read","practical","guide","continue","linked","workflow","how to","methodology"] },
  { title: "Turn JPG images into a PDF properly.", url: "guides/jpg-to-pdf.html", type: "guide", category: "Guides", tags: ["turn jpg images into a pdf properly.","guides jpg to pdf","turn","jpg","images","pdf","properly","guides","read","practical","guide","continue","linked","workflow","how to","methodology"] },
  { title: "Build a resume that is easy to scan.", url: "guides/resume-writing.html", type: "guide", category: "Guides", tags: ["build a resume that is easy to scan.","guides resume writing","build","resume","easy","scan","guides","writing","read","practical","guide","continue","linked","workflow","how to","methodology"] },
  { title: "Write AI prompts that are easier to verify.", url: "guides/ai-prompting.html", type: "guide", category: "Guides", tags: ["write ai prompts that are easier to verify.","guides ai prompting","write","prompts","easier","verify","guides","prompting","read","practical","guide","continue","linked","workflow","how to","methodology"] }
]);

const NEXUSNOVA_EXPECTED_COUNTS = Object.freeze({
  tool: 94,
  category: 9,
  article: 14,
  guide: 8
});

const NEXUSNOVA_ALIAS_MAP = Object.freeze({
  'salery': ['salary-tax-calculator-pakistan.html'],
  'salary': ['salary-tax-calculator-pakistan.html', 'fbr-tax-calculator-pakistan.html'],
  'salary tax': ['salary-tax-calculator-pakistan.html', 'fbr-tax-calculator-pakistan.html'],
  'income tax': ['salary-tax-calculator-pakistan.html', 'fbr-tax-calculator-pakistan.html'],
  'tax calculator': ['salary-tax-calculator-pakistan.html', 'fbr-tax-calculator-pakistan.html'],
  'fbr': ['salary-tax-calculator-pakistan.html', 'fbr-atl-status-checker.html', 'fbr-tax-calculator-pakistan.html'],
  'fbr tax': ['salary-tax-calculator-pakistan.html', 'fbr-tax-calculator-pakistan.html'],
  'fbr atl': ['fbr-atl-status-checker.html'],
  'atl': ['fbr-atl-status-checker.html'],
  'filer': ['fbr-atl-status-checker.html'],
  'active taxpayer': ['fbr-atl-status-checker.html'],
  'fbr status': ['fbr-atl-status-checker.html'],
  'bijli bill': ['electricity-bill-calculator-pakistan.html'],
  'bijli bil': ['electricity-bill-calculator-pakistan.html'],
  'wapda': ['electricity-bill-calculator-pakistan.html'],
  'lesco': ['electricity-bill-calculator-pakistan.html'],
  'kelectric': ['electricity-bill-calculator-pakistan.html'],
  'k electric': ['electricity-bill-calculator-pakistan.html'],
  'electric bill': ['electricity-bill-calculator-pakistan.html'],
  'jobs': ['pakistan-jobs-finder.html'],
  'job': ['pakistan-jobs-finder.html'],
  'government jobs': ['pakistan-jobs-finder.html'],
  'govt jobs': ['pakistan-jobs-finder.html'],
  'vacancies': ['pakistan-jobs-finder.html'],
  'whatsapp link': ['whatsapp-link-generator.html'],
  'wa link': ['whatsapp-link-generator.html'],
  'wa me': ['whatsapp-link-generator.html'],
  'wa me': ['whatsapp-link-generator.html'],
  'click to chat': ['whatsapp-link-generator.html'],
  'xray': ['xray.html'],
  'x-ray': ['xray.html'],
  'link checker': ['xray.html'],
  'url scanner': ['xray.html'],
  'redirect detector': ['xray.html'],
  'phishing link': ['xray.html'],
  'zakat': ['zakat-calculator-pakistan.html'],
  'qibla': ['prayer-times-qibla-pakistan.html']
});

const TYPE_LABELS = Object.freeze({
  tool: 'Tool',
  article: 'Article',
  guide: 'Guide',
  category: 'Category'
});

function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeSearchText(value) {
  const normalized = normalizeSearchText(value);
  return normalized.match(/[\p{L}\p{N}]+/gu) || [];
}

function compactSearchText(value) {
  return tokenizeSearchText(value).join('');
}

function levenshteinDistance(a, b) {
  const left = String(a || '');
  const right = String(b || '');

  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  let previous = new Array(right.length + 1);
  let current = new Array(right.length + 1);

  for (let i = 0; i <= right.length; i += 1) {
    previous[i] = i;
  }

  for (let row = 1; row <= left.length; row += 1) {
    current[0] = row;

    for (let column = 1; column <= right.length; column += 1) {
      const substitution = left[row - 1] === right[column - 1] ? 0 : 1;
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + substitution
      );
    }

    [previous, current] = [current, previous];
  }

  return previous[right.length];
}

function bigramDiceSimilarity(a, b) {
  const left = String(a || '');
  const right = String(b || '');

  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;

  const leftCounts = new Map();
  const rightCounts = new Map();

  for (let i = 0; i < left.length - 1; i += 1) {
    const gram = left.slice(i, i + 2);
    leftCounts.set(gram, (leftCounts.get(gram) || 0) + 1);
  }

  for (let i = 0; i < right.length - 1; i += 1) {
    const gram = right.slice(i, i + 2);
    rightCounts.set(gram, (rightCounts.get(gram) || 0) + 1);
  }

  let intersection = 0;
  for (const [gram, count] of leftCounts) {
    intersection += Math.min(count, rightCounts.get(gram) || 0);
  }

  return (2 * intersection) / Math.max(1, (left.length - 1) + (right.length - 1));
}

function fuzzyTokenScore(queryToken, candidateToken) {
  const query = String(queryToken || '');
  const candidate = String(candidateToken || '');

  if (!query || !candidate) return 0;
  if (query === candidate) return 1;

  if (candidate.includes(query) || query.includes(candidate)) {
    return 0.93;
  }

  const maxLength = Math.max(query.length, candidate.length);
  if (maxLength < 4) return 0;

  const distance = levenshteinDistance(query, candidate);
  const allowed =
    maxLength <= 5 ? 1 :
    maxLength <= 8 ? 2 :
    maxLength <= 12 ? 3 : 4;

  if (distance > allowed) return 0;

  const editSimilarity = 1 - (distance / maxLength);
  const diceSimilarity = bigramDiceSimilarity(query, candidate);

  return editSimilarity * 0.6 + diceSimilarity * 0.4;
}

function tokenCoverage(queryTokens, candidateTokens) {
  if (!queryTokens.length || !candidateTokens.length) {
    return { coverage: 0, exact: 0, fuzzy: 0, distance: 99 };
  }

  let exact = 0;
  let fuzzy = 0;
  let total = 0;
  let totalDistance = 0;

  for (const queryToken of queryTokens) {
    let bestScore = 0;
    let bestDistance = 99;

    for (const candidateToken of candidateTokens) {
      if (queryToken === candidateToken) {
        bestScore = 1;
        bestDistance = 0;
        break;
      }

      if (candidateToken.includes(queryToken) || queryToken.includes(candidateToken)) {
        bestScore = Math.max(bestScore, 0.93);
        bestDistance = Math.min(
          bestDistance,
          Math.abs(candidateToken.length - queryToken.length)
        );
        continue;
      }

      const fuzzy = fuzzyTokenScore(queryToken, candidateToken);

      if (fuzzy > bestScore) {
        bestScore = fuzzy;
        bestDistance = levenshteinDistance(queryToken, candidateToken);
      }
    }

    if (bestScore >= 0.999) {
      exact += 1;
    } else if (bestScore >= 0.55) {
      fuzzy += 1;
    }

    total += bestScore;
    if (bestDistance < 99) totalDistance += bestDistance;
  }

  return {
    coverage: total / Math.max(1, queryTokens.length),
    exact,
    fuzzy,
    distance: totalDistance / Math.max(1, queryTokens.length)
  };
}

function countByType(records) {
  return records.reduce((counts, record) => {
    counts[record.type] = (counts[record.type] || 0) + 1;
    return counts;
  }, {});
}

class NexusNovaSearchCore {
  constructor(options = {}) {
    this.maxResults = Number.isFinite(options.maxResults)
      ? Math.max(1, Math.floor(options.maxResults))
      : 8;

    this.data = NEXUSNOVA_SEARCH_DATA;

    const counts = countByType(this.data);

    for (const type of Object.keys(NEXUSNOVA_EXPECTED_COUNTS)) {
      if (counts[type] !== NEXUSNOVA_EXPECTED_COUNTS[type]) {
        throw new Error(
          'NexusNova search index integrity error: ' +
          type +
          ' expected ' +
          NEXUSNOVA_EXPECTED_COUNTS[type] +
          ', found ' +
          (counts[type] || 0)
        );
      }
    }

    this.records = this.data.map((record, index) => {
      const title = normalizeSearchText(record.title);
      const url = normalizeSearchText(record.url);
      const tags = record.tags.map(normalizeSearchText).filter(Boolean);

      return Object.freeze({
        ...record,
        _index: index,
        _title: title,
        _url: url,
        _titleTokens: Object.freeze(tokenizeSearchText(title)),
        _urlTokens: Object.freeze(tokenizeSearchText(url)),
        _tags: Object.freeze(tags),
        _tagTokens: Object.freeze(
          [...new Set(tags.flatMap((tag) => tokenizeSearchText(tag)))]
        ),
        _titleCompact: compactSearchText(title),
        _urlCompact: compactSearchText(url)
      });
    });
  }

  normalize(value) {
    return normalizeSearchText(value);
  }

  tokenize(value) {
    return tokenizeSearchText(value);
  }

  scoreField(query, queryTokens, normalizedField, tokenField, weights) {
    if (!normalizedField) return null;

    if (normalizedField === query) {
      return {
        score: weights.exact,
        coverage: 1,
        exact: queryTokens.length,
        fuzzy: 0,
        distance: 0,
        mode: 'exact'
      };
    }

    if (normalizedField.includes(query)) {
      return {
        score: weights.phrase,
        coverage: 1,
        exact: queryTokens.length,
        fuzzy: 0,
        distance: 0,
        mode: 'phrase'
      };
    }

    const coverage = tokenCoverage(queryTokens, tokenField);

    if (coverage.coverage < 0.62) return null;

    let score = weights.token * coverage.coverage;

    if (coverage.exact) score += weights.exactToken * coverage.exact;
    if (coverage.fuzzy) score += weights.fuzzyToken * coverage.fuzzy;

    return {
      score,
      coverage: coverage.coverage,
      exact: coverage.exact,
      fuzzy: coverage.fuzzy,
      distance: coverage.distance,
      mode: coverage.fuzzy ? 'fuzzy' : 'token'
    };
  }

  scoreTags(query, queryTokens, tags, tagTokens) {
    let best = this.scoreField(
      query,
      queryTokens,
      tags.join(' | '),
      tagTokens,
      { exact: 1220, phrase: 1060, token: 900, exactToken: 40, fuzzyToken: 24 }
    );

    for (const tag of tags) {
      const tagResult = this.scoreField(
        query,
        queryTokens,
        tag,
        tokenizeSearchText(tag),
        { exact: 1350, phrase: 1120, token: 960, exactToken: 48, fuzzyToken: 30 }
      );

      if (tagResult && (!best || tagResult.score > best.score)) {
        best = tagResult;
      }
    }

    return best;
  }

  aliasBoost(query, record) {
    const targets = NEXUSNOVA_ALIAS_MAP[query];
    if (!targets || !targets.includes(record.url)) return 0;

    return record.type === 'tool' ? 2400 : 500;
  }

  scoreRecord(query, queryTokens, record) {
    const title = this.scoreField(
      query,
      queryTokens,
      record._title,
      record._titleTokens,
      { exact: 1800, phrase: 1500, token: 1180, exactToken: 60, fuzzyToken: 36 }
    );

    const url = this.scoreField(
      query,
      queryTokens,
      record._url,
      record._urlTokens,
      { exact: 1150, phrase: 980, token: 790, exactToken: 40, fuzzyToken: 22 }
    );

    const tags = this.scoreTags(
      query,
      queryTokens,
      record._tags,
      record._tagTokens
    );

    if (!title && !url && !tags) return null;

    const fields = [title, url, tags].filter(Boolean);
    const best = fields.reduce((winner, current) =>
      current.score > winner.score ? current : winner
    );

    let score = best.score;

    score += this.aliasBoost(query, record);

    if (title && tags) score += 160;
    if (title && url) score += 100;
    if (url && tags) score += 70;

    if (best.coverage >= 0.999) {
      score += 260;
    } else if (best.coverage >= 0.8) {
      score += 120;
    }

    if (title?.mode === 'exact') score += 400;
    if (tags?.mode === 'exact') score += 220;

    score += (TYPE_LABELS[record.type] ? 1 : 0);
    score += (record.type === 'tool' ? 4 : record.type === 'category' ? 3 : 0);

    return {
      record,
      score,
      match: {
        field:
          best === title ? 'title' :
          best === url ? 'url' : 'tags',
        mode: best.mode,
        coverage: best.coverage,
        exactTokens: best.exact,
        fuzzyTokens: best.fuzzy,
        distance: best.distance
      }
    };
  }

  query(input) {
    const query = normalizeSearchText(input);
    if (!query) return [];

    const queryTokens = tokenizeSearchText(query);
    if (!queryTokens.length) return [];

    const scored = [];

    for (const record of this.records) {
      const result = this.scoreRecord(query, queryTokens, record);
      if (result) scored.push(result);
    }

    scored.sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.match.coverage !== left.match.coverage) {
        return right.match.coverage - left.match.coverage;
      }
      if (right.match.exactTokens !== left.match.exactTokens) {
        return right.match.exactTokens - left.match.exactTokens;
      }
      if (right.match.fuzzyTokens !== left.match.fuzzyTokens) {
        return right.match.fuzzyTokens - left.match.fuzzyTokens;
      }
      if (left.match.distance !== right.match.distance) {
        return left.match.distance - right.match.distance;
      }
      return left.record._index - right.record._index;
    });

    const aliasTargets = NEXUSNOVA_ALIAS_MAP[query];
    const ranked = aliasTargets
      ? scored.filter((item) => aliasTargets.includes(item.record.url))
      : scored;

    const seenUrls = new Set();
    const output = [];

    for (const item of ranked) {
      if (seenUrls.has(item.record.url)) continue;

      seenUrls.add(item.record.url);
      output.push({
        title: '[' + TYPE_LABELS[item.record.type] + '] ' + item.record.title,
        displayTitle: item.record.title,
        label: '[' + TYPE_LABELS[item.record.type] + ']',
        url: item.record.url,
        type: item.record.type,
        category: item.record.category,
        tags: [...item.record.tags],
        match: item.match
      });

      if (output.length >= this.maxResults) break;
    }

    return output;
  }

  get size() {
    return this.records.length;
  }

  getCounts() {
    return countByType(this.data);
  }

  getData() {
    return this.data.map((record) => ({
      title: record.title,
      url: record.url,
      type: record.type,
      category: record.category,
      tags: [...record.tags]
    }));
  }

  renderDropdown(panel, results, options = {}) {
    if (!panel) return;

    const list = Array.isArray(results) ? results : [];
    const maxResults = Number.isFinite(options.maxResults)
      ? Math.max(1, Math.floor(options.maxResults))
      : this.maxResults;

    panel.replaceChildren();

    if (!list.length) {
      panel.hidden = false;

      const empty = document.createElement('div');
      empty.className = options.emptyClassName || 'nn-search-empty';
      empty.setAttribute('role', 'status');
      empty.textContent =
        options.emptyText || 'No matching NexusNova result found.';

      panel.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();

    list.slice(0, maxResults).forEach((result, index) => {
      const item = document.createElement('a');
      item.id = 'nn-core-search-result-' + (index + 1);
      item.className = 'nn-search-result';
      item.href = result.url;
      item.setAttribute('role', 'option');
      item.setAttribute('data-nn-search-result', '');

      const icon = document.createElement('span');
      icon.className = 'nn-search-result-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = String(index + 1).padStart(2, '0');

      const main = document.createElement('span');
      main.className = 'nn-search-result-main';

      const title = document.createElement('span');
      title.className = 'nn-search-result-title';
      title.textContent = result.title;

      const meta = document.createElement('span');
      meta.className = 'nn-search-result-meta';
      meta.textContent = result.category || result.type;

      main.appendChild(title);
      main.appendChild(meta);
      item.appendChild(icon);
      item.appendChild(main);
      item.appendChild(document.createTextNode('→'));

      fragment.appendChild(item);
    });

    panel.appendChild(fragment);
    panel.hidden = false;
  }

  bindDropdown({ input, form, panel, maxResults = this.maxResults } = {}) {
    if (!input || !form || !panel) return () => {};

    let activeIndex = -1;

    const close = () => {
      panel.replaceChildren();
      panel.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.setAttribute('aria-activedescendant', '');
      activeIndex = -1;
    };

    const setActive = (index) => {
      const items = [...panel.querySelectorAll('[data-nn-search-result]')];

      if (!items.length) {
        activeIndex = -1;
        input.setAttribute('aria-activedescendant', '');
        return;
      }

      activeIndex = ((index % items.length) + items.length) % items.length;

      items.forEach((item, itemIndex) => {
        item.classList.toggle('is-active', itemIndex === activeIndex);
      });

      const active = items[activeIndex];
      active?.scrollIntoView({ block: 'nearest' });
      input.setAttribute('aria-activedescendant', active?.id || '');
    };

    const render = () => {
      const value = String(input.value || '').trim();

      if (!value) {
        close();
        return;
      }

      const results = this.query(value).slice(0, maxResults);
      this.renderDropdown(panel, results, { maxResults });
      input.setAttribute('aria-expanded', 'true');
      setActive(-1);
    };

    const onInput = render;

    const onSubmit = (event) => {
      const value = String(input.value || '').trim();
      const results = this.query(value).slice(0, maxResults);

      if (!results.length) {
        event.preventDefault();
        render();
        return;
      }

      event.preventDefault();
      window.location.assign(results[0].url);
    };

    const onKeyDown = (event) => {
      const items = panel.querySelectorAll('[data-nn-search-result]');
      const hasResults = items.length > 0;

      if (event.key === 'ArrowDown' && hasResults) {
        event.preventDefault();
        setActive(activeIndex + 1);
        return;
      }

      if (event.key === 'ArrowUp' && hasResults) {
        event.preventDefault();
        setActive(activeIndex - 1);
        return;
      }

      if (event.key === 'Enter' && hasResults && activeIndex >= 0) {
        event.preventDefault();
        const active = items[activeIndex];
        if (active?.href) window.location.assign(active.href);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    const onOutsidePointer = (event) => {
      if (!form.contains(event.target) && !panel.contains(event.target)) {
        close();
      }
    };

    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeyDown);
    input.addEventListener('focus', onInput);
    form.addEventListener('submit', onSubmit);
    document.addEventListener('pointerdown', onOutsidePointer);

    return () => {
      input.removeEventListener('input', onInput);
      input.removeEventListener('keydown', onKeyDown);
      input.removeEventListener('focus', onInput);
      form.removeEventListener('submit', onSubmit);
      document.removeEventListener('pointerdown', onOutsidePointer);
      close();
    };
  }
}

NexusNovaSearchCore.DATASET_COUNTS = Object.freeze({
  tool: 94,
  category: 9,
  article: 14,
  guide: 8
});

NexusNovaSearchCore.DATASET_SIZE = 125;

if (typeof window !== 'undefined') {
  window.NexusNovaSearchCore = NexusNovaSearchCore;
  window.NexusNovaSearchData = NEXUSNOVA_SEARCH_DATA;
}

if (typeof globalThis !== 'undefined') {
  globalThis.NexusNovaSearchCore = NexusNovaSearchCore;
}
