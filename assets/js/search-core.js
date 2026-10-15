'use strict';

/**
 * NexusNova Deep Client-Side Search Core
 * 97 tools + 9 categories + 34 articles + 14 guides = 154 records.
 * Local-only, dependency-free, network-free search.
 */

const NEXUSNOVA_SEARCH_DATA = Object.freeze([
  { title:"Image Compressor", url:"image-compressor.html", type:"tool", category:"Images", tags:["image compressor","images","image","compressor","tool","utility"] },
  { title:"Image to Text OCR", url:"image-to-text-ocr.html", type:"tool", category:"Images", tags:["image to text ocr","images","image","text","ocr","tool","utility"] },
  { title:"Image Metadata Remover", url:"image-metadata-remover.html", type:"tool", category:"Images", tags:["image metadata remover","images","image","metadata","remover","tool","utility"] },
  { title:"Image Resizer", url:"image-resizer.html", type:"tool", category:"Images", tags:["image resizer","images","image","resizer","tool","utility"] },
  { title:"Photo CCTV Enhancer", url:"photo-cctv-enhancer.html", type:"tool", category:"Images", tags:["photo cctv enhancer","images","photo","cctv","enhancer","tool","utility"] },
  { title:"AVIF to JPG", url:"avif-to-jpg.html", type:"tool", category:"Images", tags:["avif to jpg","images","avif","jpg","tool","utility"] },
  { title:"HEIC to JPG", url:"heic-to-jpg.html", type:"tool", category:"Images", tags:["heic to jpg","heic to jpg converter","batch heic to jpg","convert multiple heic photos","heic zip download","iphone photos to jpg","heif to jpg","images","heic","heif","jpg","tool","utility"] },
  { title:"JPG to PNG", url:"jpg-to-png.html", type:"tool", category:"Images", tags:["jpg to png","images","jpg","png","tool","utility"] },
  { title:"PNG to JPG", url:"png-to-jpg.html", type:"tool", category:"Images", tags:["png to jpg","images","png","jpg","tool","utility"] },
  { title:"WebP to JPG", url:"webp-to-jpg.html", type:"tool", category:"Images", tags:["webp to jpg","images","webp","jpg","tool","utility"] },
  { title:"WebP to PNG", url:"webp-to-png.html", type:"tool", category:"Images", tags:["webp to png","images","webp","png","tool","utility"] },
  { title:"YouTube Thumbnail Downloader", url:"youtube-thumbnail-downloader.html", type:"tool", category:"Images", tags:["youtube thumbnail downloader","images","youtube","thumbnail","downloader","tool","utility"] },
  { title:"JPG to PDF", url:"jpg-to-pdf.html", type:"tool", category:"PDF & Documents", tags:["jpg to pdf","jpg to pdf converter","images to pdf","convert jpg to pdf","photo to pdf","multiple images to pdf","A4 PDF","US Letter PDF","pdf & documents","jpg","pdf","tool","utility"] },
  { title:"PDF Document Workbench", url:"document-workbench.html", type:"tool", category:"PDF & Documents", tags:["pdf document workbench","pdf & documents","merge pdf","merge PDFs","split pdf","extract pages","page ranges","combine PDFs","document workflow","local processing","tool","utility"] },
  { title:"Text to PDF", url:"text-to-pdf.html", type:"tool", category:"PDF & Documents", tags:["text to pdf","pdf & documents","text","pdf","tool","utility"] },
  { title:"AI Token Calculator", url:"ai-token-calculator.html", type:"tool", category:"Calculators", tags:["ai token calculator","calculators","token","calculator","tool","utility"] },
  { title:"2027 Social Security COLA Calculator", url:"social-security-cola-calculator-2027.html", type:"tool", category:"Calculators", tags:["2027 social security cola calculator","social security cola calculator","cola 2027","social security cost of living adjustment","cola estimate","benefit increase","retirement benefits","monthly benefit","ssa","cpi-w","calculator","tool","utility"] },
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
  { title:"Recent Earthquakes", url:"earthquakes-live.html", type:"tool", category:"Live Information", tags:["recent earthquakes","earthquakes live","live information","recent","earthquakes","tool","utility"] },
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
  { title:"Gaming", url:"gaming.html", type:"category", category:"", tags:["gaming","game","edpi","sensitivity","reaction","category","hub"] },
  { title:"Live Information", url:"live.html", type:"category", category:"", tags:["live information","live","information","category","hub","today","pakistan today","dashboard","weather","sports","gold","fuel","currency","aqi","crypto","earthquakes"] },
  { title:"2027 Social Security COLA: Official 3.6% Rate and Payment Dates", url:"articles/social-security-cola-2027-estimate.html", type:"article", category:"Articles", tags:["2027 Social Security COLA official 3.6 percent payment dates","SSA announced the official 3.6% 2027 COLA on October 14, 2026. Check payment timing, transparent gross-benefit examples, and the limits of a simple estimate.","U.S. Benefits","2027 social security cola official rate 3.6 percent SSA October 14 2026 CPI-W retirement benefits monthly increase SSI payment timing calculator gross benefit example"] },
  { title:"CS2 vs Valorant Sensitivity & eDPI Guide", url:"articles/cs2-valorant-sensitivity-edpi-guide.html", type:"article", category:"Articles", tags:["CS2 vs Valorant Sensitivity & eDPI Guide","Learn how CS2 and Valorant sensitivity conversion works, what eDPI means, why 360-distance matters and how to test aim settings without guessing.","Articles","CS2 vs Valorant sensitivity and eDPI: a practical guide. | CS2 to Valorant sensitivity formula | What eDPI means | Why eDPI is not automatically comparable between games | 360-distance is a starting point, not the whole feel | A simple way to test a new sensitivity | Why this topic matters now | Related tools | sensitivity formula A common yaw-based conversion is: Valorant sensitivity ≈ CS2 | game. Calculate your eDPI → Why eDPI is not automatically comparable between games | scoped multipliers and visual design. A converted sensitivity should be treated | games. That makes sensitivity and aim-setting searches a repeat-use problem rather"] },
  { title:"AI Photo Restoration vs Enhancement", url:"articles/ai-photo-restoration-vs-enhancement.html", type:"article", category:"Articles", tags:["AI Photo Restoration vs Enhancement","Understand the difference between sharpening, color correction, upscaling and AI photo restoration — including what an old or blurry photo can and cannot.","Articles","AI Photo Restoration vs Enhancement: What Can Really Be Recovered? | Enhancement works with the pixels you have | AI restoration can infer missing detail | Why faces need extra caution | What sharpening can actually do | A safer restoration workflow | When 2× upscaling helps | Bottom line ? Separate enhancement from reconstruction | Try a transparent browser-based workflow | Better-looking is not the same as recovered truth. | image-processing operations. They can make existing edges easier to see and faded | information to prove those details. For family memories that may be acceptable | side by side with the source. Label generative AI restorations as reconstructed | settings first, and be clear about which method produced the final image. Try"] },
  { title:"Online Background Removers: What to Check in 2026", url:"articles/background-removal-online-guide.html", type:"article", category:"Articles", tags:["Online Background Removers: What to Check in 2026","A practical guide to online background removal: edge quality, hair and product cutouts, privacy, transparent PNG output, batch workflows and when local.","Articles","Online Background Removers: Quality, Privacy and What to Check in 2026 | The hard part is the edge | Product photos need different checks | Transparent PNG is usually the practical output | Privacy matters when the photo is personal | Local processing has trade-offs | What to check before downloading | Do you always need AI? | Bottom line — Online Background Removers | Related NexusNova tools | Check edges, output format and privacy. | difficult edge cases. A good result should preserve believable boundaries without | background removers process images on a remote server. That can be perfectly acceptable | Check for a white or dark halo around the subject. Inspect transparent areas such | privacy before uploading personal photos. A trustworthy tool should explain whether"] },
  { title:"Remove EXIF & GPS Metadata From Photos Before Sharing", url:"articles/remove-exif-gps-metadata-photos.html", type:"article", category:"Articles", tags:["Remove EXIF & GPS Metadata From Photos Before Sharing","Learn how to remove EXIF and GPS metadata from photos before sharing, what metadata can reveal, what re-encoding changes, and what it cannot hide.","Articles","How to Remove EXIF and GPS Metadata From Photos Before Sharing | What photo metadata actually is | Why remove EXIF or GPS data before sharing? | A practical example | How a browser-based metadata remover works | Step by step: remove metadata before sharing | What metadata removal does not hide | Does removing metadata reduce image quality? | Should you rely on social networks to strip metadata? | A simple privacy checklist | unnecessary. A product photo posted to a marketplace does not normally need your | original camera file with a few fields edited. Step by step: remove metadata before | files for photographs. If your goal is both privacy and a smaller upload, you | copy, stripping them is a sensible final step before sharing. Combine that with"] },
  { title:"JPG vs PNG vs WebP vs AVIF: Which Image Format Is Best?", url:"articles/jpg-png-webp-avif-guide.html", type:"article", category:"Articles", tags:["JPG vs PNG vs WebP vs AVIF: Which Image Format Is Best?","A practical guide to choosing JPG, PNG, WebP or AVIF for photos, screenshots, logos and web graphics without making file-size decisions harder than they.","Articles","JPG vs PNG vs WebP vs AVIF: Which Image Format Should You Use? | JPG: still useful for ordinary photos | PNG: useful for transparency and crisp graphics | WebP: a flexible web-friendly option | AVIF: very efficient, but check your workflow | A simple way to choose | Dimensions matter as much as format | Do one visual check before you publish | Bottom line — JPG vs PNG vs WebP vs AVIF | Related NexusNova tools | Reader discussion — JPG vs PNG vs WebP vs AVIF | screenshots look fuzzy when quality is pushed too low. If you already have a large | NexusNova's WebP to JPG and WebP to PNG tools can help. Converting is useful for | remain easy for most people and apps. Dimensions matter as much as format A 5000-pixel | is no prize for choosing the newest format. The useful choice is the one that"] },
  { title:"How to Split a PDF and Keep Pages Organized", url:"articles/split-pdf-organize-pages.html", type:"article", category:"Articles", tags:["How to Split a PDF and Keep Pages Organized","Learn a simple PDF splitting workflow for extracting pages, naming files clearly, checking page order and avoiding common mistakes before sharing.","Articles","How to Split a PDF and Keep the Pages Organized | Know what you are trying to extract | Use clear file names from the start | Keep the original untouched | A simple splitting workflow | When splitting is better than sending the full PDF | What if you need to put pages back together? | Avoid unnecessary conversions | Check the final file, not just the preview | Bottom line ? Organize the extracted pages | Related NexusNova tools | document may show “Page 1” inside the design while your PDF viewer calls it page | tool to create the smaller file. Give the output a descriptive name immediately. | designed for that direction, and the related article on merging PDFs with privacy | clearly and inspect the result. The tool does the extraction; a short checking"] },
  { title:"EMI Calculator Explained: Principal, Interest and Loan Tenure", url:"articles/emi-calculator-explained.html", type:"article", category:"Articles", tags:["EMI Calculator Explained: Principal, Interest and Loan Tenure","Understand what an EMI calculator estimates, how principal, interest rate and tenure affect monthly payments, and why the final lender amount can differ.","Articles","EMI Calculator Explained: Principal, Interest and Loan Tenure | What the EMI formula represents | The three inputs that matter most | Why a longer tenure lowers the monthly payment | What the formula is doing | A sensible comparison routine | Why the bank's number may be different | Do not compare loans by EMI alone | Use estimates to ask better questions | Bottom line — EMI Calculator Explained | Related NexusNova tools | inputs that matter most Principal is the amount borrowed. Interest rate is the | the outstanding balance to zero by the end of the term. You do not need to calculate | comparison, not as a promise of the final contract amount. Do not compare loans | real fees, terms and repayment schedule with the lender before making a financial"] },
  { title:"How to Use a Pomodoro Timer Without Making Focus Complicated", url:"articles/pomodoro-focus-workflow.html", type:"article", category:"Articles", tags:["How to Use a Pomodoro Timer Without Making Focus Complicated","A practical Pomodoro workflow for focused work: choose one task, run a short session, take a real break and adjust the timing when the default pattern.","Articles","How to Use a Pomodoro Timer Without Making Focus Complicated | Start with one specific task | The classic timing is only a starting point | Do not spend the break inside the same task | Keep interruptions somewhere safe | A practical four-step routine | What if you finish early? | What if you keep missing sessions? | Use the stopwatch for open-ended work | Bottom line ? Use a sustainable focus cycle | Related NexusNova tools | during the session. The classic timing is only a starting point A common pattern | somewhere safe During a focus block, random thoughts will appear: reply to a message, | What if you keep missing sessions? That usually means the session is too long, | are doing. If the timer becomes another thing to manage, simplify it again. Related"] },
  { title:"7 Resume Mistakes That Make a Good Candidate Hard to Notice", url:"articles/resume-mistakes-to-fix.html", type:"article", category:"Articles", tags:["7 Resume Mistakes That Make a Good Candidate Hard to Notice","Seven common resume mistakes: vague summaries, crowded layouts, weak bullet points, irrelevant details, inconsistent formatting and rushed final checks.","Articles","7 Resume Mistakes That Make a Good Candidate Hard to Notice | 1. Starting with a summary that says almost nothing | 2. Listing duties without showing outcomes | 3. Making every section equally important | 4. Using a layout that fights the reader | 5. Adding skills without evidence | 6. Sending the same resume everywhere | 7. Skipping the final boring checks | A useful final checklist | Bottom line ? Make evidence easy to scan | Related NexusNova tools | subject strengths, student support or school responsibilities instead of using | and long blocks of text can make a resume harder to scan. Clean spacing, predictable | evidence is easy to spot. Do not copy job-posting keywords blindly. Use only terms | scan and check the final file carefully. Clear and truthful usually beats decorative"] },
  { title:"Unix Timestamps Explained Without the Confusion", url:"articles/unix-timestamps-explained.html", type:"article", category:"Articles", tags:["Unix Timestamps Explained Without the Confusion","Learn Unix timestamps, why they use seconds from 1970, how time zones fit in, and how to convert them safely.","Articles","Unix Timestamps Explained Without the Confusion | What the number actually means | Why developers use timestamps | Time zones are a display problem | Use a converter instead of guessing | Seconds vs milliseconds: check the length | A simple debugging routine | What about dates before 1970? | Do timestamps solve every date problem? | Bottom line ? Treat timestamps as instants | Related NexusNova tools | Reader discussion ? Unix timestamps | Unix Timestamp Converter | place and a 13-digit value in another. Confusing seconds and milliseconds is one | converter instead of guessing The NexusNova Unix Timestamp Converter can turn | before 1970? Many systems represent earlier dates using negative Unix timestamps, | the visible time zone, timestamps become much less mysterious. Related NexusNova"] },
  { title:"HEX vs RGB Color Codes: Simple Beginner Guide", url:"articles/hex-vs-rgb-colors.html", type:"article", category:"Articles", tags:["HEX vs RGB Color Codes: Simple Beginner Guide","Learn HEX vs RGB color codes, how they represent screen colors, and when each format is useful in web and design work.","Articles","HEX vs RGB Color Codes: A Simple Guide for Beginners | RGB uses three visible number ranges | HEX writes those values in base 16 | Why websites use both | Short HEX codes | Uppercase or lowercase? | Color values do not guarantee identical appearance | Do not forget contrast | A quick conversion workflow | Bottom line — HEX vs RGB Color Codes | Related NexusNova tools | Reader discussion — HEX vs RGB Color Codes | RGB ↔ HEX Converter | rgb(255, 255, 255) is white. When all three values are equal, you get a shade | Converter is useful when a design file gives you one format but your code or tool | not forget contrast Choosing a nice HEX value is only part of interface design. | contrast than on memorizing hexadecimal math. Related NexusNova tools RGB ↔ HEX"] },
  { title:"Web Image Optimization Checklist: Size, Format & Quality", url:"articles/compress-images-for-web.html", type:"article", category:"Articles", tags:["Web Image Optimization Checklist: Size, Format & Quality","Practical web image checklist for display dimensions, responsive delivery, format choice, quality checks and repeatable page-speed workflows.","Articles","Web Image Optimization Checklist: Size, Format & Quality | 1. Measure the actual display slot first | 2. Separate resizing from compression | 3. Match the format to the visual job | 4. Check the image inside the page, not only in a file viewer | 5. Use different budgets for different page roles | 6. Keep originals and generate web copies | 7. Treat privacy as part of the workflow | A practical pre-publish checklist | Example: article thumbnail versus hero image | every image as a full-resolution photograph. 2. Separate resizing from compression | edges and smooth gradients. If quality is poor, return to the original and change | pre-publish checklist Identify where the image appears: hero, article body, thumbnail, | ratio. Bottom line — Web Image Optimization Checklist For web delivery, optimize"] },
  { title:"How to Merge PDF Files With Privacy in Mind", url:"articles/merge-pdf-privately.html", type:"article", category:"Articles", tags:["How to Merge PDF Files With Privacy in Mind","A practical guide to merging PDF files: prepare the inputs, order pages, inspect the output and handle sensitive documents more carefully.","Articles","How to Merge PDF Files in Your Browser With Privacy in Mind | Why browser-based PDF work can be useful | Put the files in the right order first | Check orientation and page size | Images can become PDFs too | A reliable merge checklist | Do not skip the final inspection | Privacy is a process, not a badge | When not to use a general browser tool | Bottom line ? Prepare, merge and inspect | Related NexusNova Tools | Reader discussion ? Private PDF merging | Merge PDF | document tasks. For sensitive material, read the privacy information and avoid | and readable. Images can become PDFs too If part of your package exists only as | PDF will be printed, also check margins and orientation in print preview. A file | preparation and verification. Clean the inputs, order them deliberately, merge"] },
  { title:"QR Code Best Practices: Size, Contrast, Testing and Privacy", url:"articles/qr-code-best-practices.html", type:"article", category:"Articles", tags:["QR Code Best Practices: Size, Contrast, Testing and Privacy","Create QR codes that scan reliably with practical guidance on contrast, quiet zones, size, testing, stable URLs and privacy.","Articles","QR Code Best Practices: Size, Contrast, Testing and Privacy | A QR code is only useful if people can scan it | Keep strong contrast | Protect the quiet zone | Match physical size to scanning distance | Use a stable destination | Test before publishing | Be careful with privacy and tracking | Make the destination trustworthy | Bottom line — QR Code Best Practices | Related NexusNova Tools | Reader discussion — QR Code Best Practices | QR Code Generator | contrast Dark modules on a light background remain the safest visual pattern. | universal pixel size because print dimensions, viewing distance and camera quality | URL. Anyone who scans or decodes it may be able to read that information, so do | real-world testing. A few minutes of testing can prevent a broken campaign or"] },
  { title:"AI Search and Planning in 2026: What Google Data Shows", url:"articles/ai-search-planning-decisions-2026.html", type:"article", category:"Articles", tags:["AI Search and Planning in 2026: What Google Data Shows","Google says AI Mode searches are longer and planning queries are growing faster than AI Mode overall. Here is what that means for useful planning tools.","AI & Search","AI search is becoming a planning surface, not just a shorter answer box. | The strongest signal: planning queries are growing faster | People are also asking longer questions | AI Mode has become a large search surface | Why a simple decision tool still matters in an AI-search world | Search can discover options; a matrix can compare them | Useful tool design is different from trend chasing | What this means for publishers and utility sites | about three times the length of a traditional Search query . Google also reported | matrix makes priorities explicit. If cost matters twice as much as support, the | useful one. A more durable strategy is to look for repeated user needs behind | May 19, 2026. Google, “A new era for AI Search” , May 19, 2026. Google, “New ways"] },
  { title:"AI Tokens & Context Windows Explained: Practical LLM Guide", url:"articles/ai-token-count-context-window-guide.html", type:"article", category:"Articles", tags:["AI Tokens & Context Windows Explained: Practical LLM Guide","A practical guide to token estimates, context windows, prompt size and why exact token counts depend on the model tokenizer.","AI & LLM","AI tokens and context windows, explained without the jargon. | What is an AI token? | Why do token counts differ between models? | What does “about four characters per token” mean? | What is a context window? | Why 100% context usage is a bad planning target | A practical estimation example | When should you use an exact tokenizer? | How to reduce prompt size without losing the goal | AI token count FAQ | Are tokens the same as words? | prose may be much less accurate for code, numbers, non-English text or symbol-heavy | workflow is to leave headroom and use the provider's exact tokenizer or request | headings so the model can distinguish requirements from examples. Try the tool: | token estimator predict my exact API bill? Not reliably unless it uses the exact"] },
  { title:"AMD Adrenalin 26.8.1: Modern Warfare 4 Beta Support & Fixes", url:"articles/amd-adrenalin-26-8-1-modern-warfare-4.html", type:"article", category:"Articles", tags:["AMD Adrenalin 26.8.1: Modern Warfare 4 Beta Support & Fixes","What AMD&#x27;s August 2026 driver adds for current games and what Radeon players should check before updating.","Gaming","AMD Adrenalin 26.8.1: Modern Warfare 4 beta support and gaming fixes. | What AMD officially added | Game issues AMD says it fixed | Should every Radeon player update immediately? | Before updating | Useful NexusNova gaming tools | Zero Company and Call of Duty: Modern Warfare 4 Open Beta Early Access. It also | driver is most relevant when it adds support for a game you are about to play, | Restart after installation. A clean restart helps ensure the new display driver | Warfare 4 Beta PC Checklist . If a crash began after the August Windows update"] },
  { title:"Cloudflare Introduces Context-Aware Vulnerability Remediation", url:"articles/cloudflare-introduces-context-aware-vulnerability-remediation.html", type:"article", category:"Articles", tags:["Cloudflare Introduces Context-Aware Vulnerability Remediation","Cloudflare launches an early-access service using OpenAI Daybreak models and WAF network telemetry to find, prioritize, and patch code vulnerabilities.","Security","Cloudflare Introduces Context-Aware Vulnerability Remediation | Prioritizing Vulnerabilities with Production Signals | AI-Driven Hunting and Edge Rule Mitigations | Safety Boundaries and Model Architecture | Next steps — Cloudflare Introduces Context-Awar | Make this update useful — Cloudflare Introduces Context-Awar | service offered through Cloudflare Managed Defense. The service combines code | on high-traffic or heavily probed paths. Every vulnerability finding must be confirmed | All proposed WAF rules undergo syntax validation and synthetic fixture testing | before deploying fixes to production. Primary source: Cloudflare Blog . This brief"] },
  { title:"GitHub Copilot Global Model Policy Enforces Default States", url:"articles/github-copilot-global-model-policy-enforces-default-states.html", type:"article", category:"Articles", tags:["GitHub Copilot Global Model Policy Enforces Default States","GitHub is rolling out enforcement for Copilot global model policies across enterprise plans, updating unconfigured model states automatically.","Developer & AI","GitHub Copilot Global Model Policy Enforces Default States | Understanding the policy enforcement rollout | Exclusions and model-management states | What GitHub is considering next | Next steps — GitHub Copilot Global Model Policy | Make this update useful — GitHub Copilot Global Model Policy | rollout scheduled to complete by September 1. The policy applies to GitHub Copilot | model-management states GitHub excludes open-weight models, such as DeepSeek and | management model. One option under evaluation is requiring an explicit administrator | Primary source: GitHub Changelog — Global model policy generally available . NexusNova"] },
  { title:"GitHub Copilot in Visual Studio August 2026 Update Details", url:"articles/github-copilot-in-visual-studio-august-2026-update-details.html", type:"article", category:"Articles", tags:["GitHub Copilot in Visual Studio August 2026 Update Details","Learn about the August 2026 update for GitHub Copilot in Visual Studio, including organizational agents, reasoning effort controls, and Git code reviews.","Developer & AI","GitHub Copilot in Visual Studio August 2026 Update Details | Expanded Agent and Model Management Controls | Adjustable Reasoning Effort and Integrated Git Reviews | Next steps — GitHub Copilot in Visual Studio Au | Make this update useful — GitHub Copilot in Visual Studio Au | deploy custom agents across all repositories within their organization. Visual | context window. Adjustable Reasoning Effort and Integrated Git Reviews To balance | panel. Developers can also interact with Copilot Chat to clarify or fix flagged | suggestions prior to opening a pull request. Primary source: GitHub Blog . This"] },
  { title:"GitHub Copilot in VS Code Receives August 2026 Agent Updates", url:"articles/github-copilot-in-vs-code-receives-august-2026-agent-updates.html", type:"article", category:"Articles", tags:["GitHub Copilot in VS Code Receives August 2026 Agent Updates","Explore new features in VS Code v1.132 through v1.135, including agent session tools, chat search, integrated browser tweaks, and dictation updates.","Developer & AI","GitHub Copilot in VS Code Receives August 2026 Agent Updates | Expanded Agent Sessions and Layout Flexibility | Model Choices and Experimental Agent Capabilities | Enhanced Chat Controls, Search, and Diff Viewing | Multilingual Dictation and Command Cleanup | Next steps — GitHub Copilot in VS Code Receives | Make this update useful — GitHub Copilot in VS Code Receives | session state across tools and windows has also been streamlined. The Agent Host | Copilot subscription. To assist with rigorous code analysis, the release includes | upgraded. A hybrid Markdown editor experiment combines editing and diff viewing | access all August 2026 features. Try typing /btw in an active chat session to"] },
  { title:"GitHub Copilot Model Access Ties to Billing Org for Team Plans", url:"articles/github-copilot-model-access-ties-to-billing-org-for-team-plans.html", type:"article", category:"Articles", tags:["GitHub Copilot Model Access Ties to Billing Org for Team Plans","GitHub updated Copilot model access rules for users with multiple organizations on Team plans, tying permissions directly to the paying organization.","Developer & AI","GitHub Copilot Model Access Ties to Billing Org for Team Plans | New Policy Rules for Multi-Organization Users | Impact on Enterprise Accounts and User Configurations | Next steps — GitHub Copilot Model Access Ties t | Make this update useful — GitHub Copilot Model Access Ties t | who maintain active GitHub Copilot seats across more than one organization under | security governance, ensuring paying entities have absolute control over the specific | Copilot features management area in GitHub and locate the specific entity listed | generated from an official-source monitoring workflow and is checked by NexusNova's"] },
  { title:"Google August 2026 Spam Update & Traffic Drops", url:"articles/google-august-2026-spam-update-traffic-drop.html", type:"article", category:"Articles", tags:["Google August 2026 Spam Update & Traffic Drops","What changed, what not to panic about, and a practical framework for diagnosing a search traffic drop after Google&#x27;s August 2026 spam update.","SEO & Search","Google August 2026 Spam Update & Traffic Drops | What happened in August 2026? | First: confirm whether the traffic drop is actually search traffic | Second: check for a migration or major URL change | Third: look for scaled or low-value expansion | Fourth: strengthen topical focus instead of chasing every trend | Fifth: audit titles, headings and snippets for intent | Sixth: verify crawl and indexing signals | Seventh: improve what users experience after the click | traffic Before changing content, compare the same date range in analytics and | they each solve a distinct task, provide original functionality, add first-hand | canonical, useful pages only. Internal navigation links to priority tools and | August 2026 added an official interactive publisher button. Readers who choose"] },
  { title:"Google Preferred Sources 2026: What Website Owners Should Know", url:"articles/google-preferred-sources-2026.html", type:"article", category:"Articles", tags:["Google Preferred Sources 2026: What Website Owners Should Know","Learn how Google Preferred Sources can surface chosen sites in 2026 and what the feature does ? and does not ? guarantee.","SEO & Search","Google Preferred Sources in 2026: what website owners should know. | What is Google Preferred Sources? | Is it a general ranking boost? | What changed in August 2026? | Who can use it? | What should publishers do besides adding a button? | Why this matters for smaller websites | Primary sources for source-selection guidance | Google preferred sources FAQ | Does choosing a preferred source guarantee every article will appear? | available. Is it a general ranking boost? No. This is not a switch that makes | NexusNova in Google: If NexusNova Tools appears for your Google account in the | goal is therefore to earn repeat readers first, then make the preference option | valuable, unique content and warns against manipulative scaled content. A smaller"] },
  { title:"Chrome 152 for Android: Release Timeline and Security Fixes", url:"articles/google-releases-chrome-152-for-android.html", type:"article", category:"Articles", tags:["Google Releases Chrome 152 for Android","Chrome 152 Android release timeline and security fixes","152.0.7977.64 26 August 2026","152.0.7977.75 1 September 2026","152.0.7977.82 3 September 2026","Google Play staged rollout Chrome 154 stable Android update","Desktop security-fix notes 327 fixes 26 fixes 12 fixes"] },
  { title:"Google Releases Chrome 152 with 327 Security Fixes", url:"articles/google-releases-chrome-152-with-327-security-fixes.html", type:"article", category:"Articles", tags:["Google Releases Chrome 152 with 327 Security Fixes","Chrome 152 brings 327 security patches to Windows, Mac, and Linux, addressing critical use-after-free and memory issues across core browser engines.","Browser Security","Google Releases Chrome 152 with 327 Security Fixes | Overview of the Chrome 152 Desktop Rollout | Critical and High-Severity Security Patches | Release Context and Testing Mechanisms | Next steps — Google Releases Chrome 152 with 32 | Make this update useful — Google Releases Chrome 152 with 32 | over the coming days and weeks. This release serves as a major maintenance update, | variable bugs. In addition to critical issues, the update resolves a vast array | Mechanisms Many of the disclosed security bugs were captured prior to release | Chrome to complete the installation of the security patches. Primary source: Chrome"] },
  { title:"Google Search Console Platform Properties 2026", url:"articles/google-search-console-platform-properties-2026.html", type:"article", category:"Articles", tags:["Google Search Console Platform Properties 2026","Learn how Google Search Console Platform Properties track Instagram, TikTok, X and YouTube performance across Search, Discover and Google News in 2026.","SEO & Search","Google Search Console Platform Properties 2026 | What is a Search Console Platform Property? | Which platforms are supported? | What data can you see? | Why this matters for creators and website owners | Use trending query groups as research — not as a content factory | A practical NexusNova-style workflow | What Platform Properties do not mean | How to turn the data into better content | SEO takeaway for 2026 | Official references for Search Console | X, or a public creator post can be discovered from Instagram or TikTok. Platform | It can help identify which tutorials deserve videos, which questions work as short | title, internal links and tool experience. Measure again: compare the website | increasingly multi-format, but the strategy remains simple: understand what people"] },
  { title:"GPT-5.6 Sol Context Window: 1.05M Tokens Explained", url:"articles/gpt-5-6-sol-context-window-guide.html", type:"article", category:"Articles", tags:["GPT-5.6 Sol Context Window: 1.05M Tokens Explained","Current OpenAI documentation lists a 1,050,000-token context window and 128,000 max output tokens for GPT-5.6 Sol, plus practical long-context guidance.","AI & LLM","GPT-5.6 Sol's 1.05M-token context window: what it actually means. | What are the documented GPT-5.6 Sol limits? | Does 1.05 million tokens mean 1.05 million words? | Does this number apply to every ChatGPT conversation? | Why the output limit matters too | What is the knowledge cutoff? | How should you estimate a long prompt? | Why long context is useful | Primary sources for model-context details | GPT-5.6 Sol context window FAQ | text fragment. The exact split depends on the tokenizer and the text, so converting | knowledge cutoff? The current model page lists a February 16, 2026 knowledge cutoff. | documents, working through large code references or keeping more project material | exact provider tooling when a request is near a hard limit. Should I fill the"] },
  { title:"Modern Warfare 4 Beta PC Checklist — Dates, Patch Notes & Setup", url:"articles/modern-warfare-4-beta-pc-checklist.html", type:"article", category:"Articles", tags:["Modern Warfare 4 Beta PC Checklist — Dates, Patch Notes & Setup","A practical Call of Duty: Modern Warfare 4 beta PC checklist with official beta dates, the latest August 22 gameplay adjustments, storage planning.","Gaming","Modern Warfare 4 beta PC checklist. | Official beta schedule | Latest official beta changes: August 22 | PC checklist before you download | Do not treat beta performance as final release performance | Useful NexusNova tools for PC prep | Sources and update policy | Latest official beta changes: August 22 Infinity Ward's August 22 beta notes say | extra headroom beyond the download itself because patches and temporary install | Expect changes. A beta is not a finished benchmark. Balance, performance and settings | Calculator for mouse settings. Sources and update policy Schedule and access details"] },
  { title:"Simple Invoice Checklist: What to Include Before You Send It", url:"articles/simple-invoice-checklist-guide.html", type:"article", category:"Articles", tags:["Simple Invoice Checklist: What to Include Before You Send It","Review sender, client, invoice number, date, line items, totals, tax, payment notes and the final PDF before sending.","Productivity","A simple invoice checklist before you print, save or send. | 1. Identify who is sending the invoice | 2. Identify the customer | 3. Use a clear invoice number and date | 4. Review every line item | 5. Recheck the math | 6. State useful payment information | 7. Review the final PDF, not only the form | 8. Keep your own copy | Quick pre-send checklist | Invoice checklist FAQ | Is an invoice maker the same as accounting software? | Does every invoice need tax? | department, reference number or purchase order number, add those details before | calculator. 6. State useful payment information Add any relevant payment terms | use the browser's Print / Save PDF flow. It does not provide accounting, payment | business status and transaction type. Check the rules that apply to you. Can I"] },
  { title:"Typing Speed Guide: WPM, Accuracy & How to Improve", url:"articles/typing-speed-wpm-accuracy-guide.html", type:"article", category:"Articles", tags:["Typing Speed Guide: WPM, Accuracy & How to Improve","Learn how typing WPM and accuracy are measured, why different tests can show different scores, and how to improve speed without sacrificing accuracy.","Productivity","Typing speed, WPM and accuracy: a practical guide. | What does WPM mean? | Why can two typing tests give different scores? | What is typing accuracy? | 30 seconds or 60 seconds? | How to improve without forcing speed | A simple weekly practice routine | What score is “good”? | Typing speed FAQ | Should I look at WPM or accuracy first? | Does a shorter test inflate WPM? | Can typing practice help with coding? | Typing Speed Test | Word Counter | Pomodoro Timer | mistakes are penalized, whether corrected errors count, and how they calculate | without forcing speed Start with accuracy. Slow down enough that your fingers | sharply, reduce the pace and rebuild control. What score is “good”? There is no | typing practice help with coding? It can improve keyboard familiarity, but code"] },
  { title:"Windows 11 August 2026 Gaming Crashes & RGB Drivers", url:"articles/windows-11-august-2026-rgb-gaming-crashes.html", type:"article", category:"Articles", tags:["Windows 11 August 2026 Gaming Crashes & RGB Drivers","What Microsoft has confirmed about the August 2026 Windows 11 gaming issue and what PC players should do next.","Gaming","Windows 11 August 2026 gaming crashes: what RGB drivers have to do with it. | What Microsoft has confirmed | Reported symptoms | Games named in Microsoft's report | What should PC players do? | Is there an official fix yet? | Useful NexusNova tools while troubleshooting | or internal components that support RGB lighting. The affected systems can include | crash in those games has the same cause. What should PC players do? Confirm your | manually can create a bigger problem. Microsoft has not published a universal | tools while troubleshooting Use the FPS & Frame-Time Calculator when comparing"] },
  { title:"YouTube Thumbnail Size Guide 2026: 3840×2160 vs 1280×720", url:"articles/youtube-thumbnail-size-guide-2026.html", type:"article", category:"Articles", tags:["YouTube Thumbnail Size Guide 2026: 3840×2160 vs 1280×720","Understand 3840×2160 vs 1280×720 thumbnail sizes, what each means, and how to choose an appropriate upload size.","Creator Tools","YouTube thumbnail size in 2026: why you may see both 3840×2160 and 1280×720. | The short answer | Why the two size recommendations are not a contradiction | Which size should a creator design? | Why does maxres sometimes fail? | What about vertical videos? | Can you reuse another creator's thumbnail? | Primary sources for thumbnail dimensions | YouTube thumbnail size FAQ | Is 1280×720 still a YouTube thumbnail size? | Should I upload only 1280×720? | thumbnail renditions: 120×90 default , 320×180 medium , 480×360 high , 640×480 | maxres sometimes fail? The Data API documentation says standard and maxres are | rules that apply to your situation. Try the tool: Use the NexusNova YouTube Thumbnail | thumbnail. Why does a downloader show several versions? YouTube resources can"] },
  { title:"How to use a weighted decision matrix without fooling yourself.", url:"guides/weighted-decision-matrix.html", type:"guide", category:"Guides", tags:["how to use a weighted decision matrix without fooling yourself.","guides weighted decision matrix","guides","weighted","decision","matrix","without","fooling","yourself","guide","methodology"] },
  { title:"Percentages without confusion", url:"guides/percentage-basics.html", type:"guide", category:"Guides", tags:["percentages without confusion","guides percentage basics","guides","percentages","without","confusion","guide","methodology"] },
  { title:"Stronger password habits for everyday accounts", url:"guides/password-security.html", type:"guide", category:"Guides", tags:["stronger password habits for everyday accounts","guides password security","guides","stronger","password","habits","everyday","accounts","guide","methodology"] },
  { title:"Unit conversion made practical", url:"guides/unit-conversion.html", type:"guide", category:"Guides", tags:["unit conversion made practical","guides unit conversion","guides","unit","conversion","made","practical","guide","methodology"] },
  { title:"Compress images without guesswork.", url:"guides/image-compression.html", type:"guide", category:"Guides", tags:["compress images without guesswork.","guides image compression","guides","compress","images","without","guesswork","guide","methodology"] },
  { title:"Turn JPG images into a PDF properly.", url:"guides/jpg-to-pdf.html", type:"guide", category:"Guides", tags:["turn jpg images into a pdf properly.","guides jpg to pdf","guides","turn","jpg","images","pdf","properly","guide","methodology"] },
  { title:"Build a resume that is easy to scan.", url:"guides/resume-writing.html", type:"guide", category:"Guides", tags:["build a resume that is easy to scan.","guides resume writing","guides","build","resume","easy","scan","guide","methodology"] },
  { title:"Write AI prompts that are easier to verify.", url:"guides/ai-prompting.html", type:"guide", category:"Guides", tags:["write ai prompts that are easier to verify.","guides ai prompting","guides","write","prompts","easier","verify","guide","methodology"] },
  { title:"FBR ATL status: check CNIC/NTN and resolve missing results", url:"guides/fbr-atl-status.html", type:"guide", category:"Guides", tags:["FBR ATL status","active taxpayer list","CNIC","NTN","passport","Pakistan","filer status","SMS 9966","not active","late return","official FBR","tax guide"] },
  { title:"AI Prompt Enhancer for Midjourney & Sora", url:"ai-prompt-enhancer.html", type:"tool", category:"Developer & Data", tags:["ai prompt enhancer","midjourney prompt enhancer","sora prompt generator","ai video prompt","image prompt","camera movement","lighting","prompt writing"] },
  { title:"TikTok & Reels Hook Generator", url:"short-form-video-hook-generator.html", type:"tool", category:"Developer & Data", tags:["tiktok hook generator","reels hook generator","short form video script","instagram reels","youtube shorts","creator hooks","video script","cta generator"] },
  { title:"Freelance Rate & Project Quote Calculator", url:"freelance-rate-calculator.html", type:"tool", category:"Calculators", tags:["freelance hourly rate calculator","freelance pricing","project quote calculator","billable hours","freelancer rate","remote work","contractor estimate"] },
  { title:"Crypto Tax & Profit/Loss Estimator", url:"crypto-tax-profit-estimator.html", type:"tool", category:"Calculators", tags:["crypto tax calculator","crypto profit loss","capital gains tax calculator","bitcoin tax estimator","US crypto tax","UK crypto tax","capital gains","cost basis"] },
  { title:"Privacy Policy & Terms Generator", url:"privacy-policy-terms-generator.html", type:"tool", category:"Developer & Data", tags:["privacy policy generator","terms of service generator","SaaS privacy policy","mobile app terms","privacy notice","app legal templates","GDPR template"] },
  { title:"A Practical AI Prompt Workflow for Midjourney Images and Sora Video", url:"guides/ai-prompt-workflows-2026.html", type:"guide", category:"AI Workflows", tags:["A Practical AI Prompt Workflow for Midjourney Images and Sora Video","AI Workflows","AI Prompt Enhancer","Build clearer image and video prompts by specifying the subject, framing, light, action and continuity, then test revisions systematically."] },
  { title:"Short-Form Video Hooks in 2026: Build a Useful TikTok or Reels Opening", url:"guides/short-form-hooks-2026.html", type:"guide", category:"Creator Workflows", tags:["Short-Form Video Hooks in 2026: Build a Useful TikTok or Reels Opening","Creator Workflows","TikTok & Reels Hook Generator","Write stronger short-form openings with a clear promise, visible evidence, a compact script structure and platform-aware testing."] },
  { title:"How to Set a Freelance Hourly Rate and Quote Remote Projects", url:"guides/freelance-pricing-remote-work.html", type:"guide", category:"Remote Work", tags:["How to Set a Freelance Hourly Rate and Quote Remote Projects","Remote Work","Freelance Rate Calculator","Build a sustainable freelance rate from realistic billable capacity, overhead, reserves, project scope, contingency and delivery risk."] },
  { title:"Crypto Gains and Tax Records in 2026: A Practical US and UK Checklist", url:"guides/crypto-recordkeeping-us-uk-2026.html", type:"guide", category:"Money & Records", tags:["Crypto Gains and Tax Records in 2026: A Practical US and UK Checklist","Money & Records","Crypto Tax & Profit/Loss Estimator","Organize crypto basis, proceeds, fees, disposals and simplified US or UK capital-gains estimates for the relevant tax year."] },
  { title:"A Privacy Policy and Terms Checklist for SaaS and Mobile Apps", url:"guides/app-privacy-terms-checklist.html", type:"guide", category:"Product & Trust", tags:["A Privacy Policy and Terms Checklist for SaaS and Mobile Apps","Product & Trust","Privacy Policy & Terms Generator","Create a data-map-led privacy and terms review for SaaS and mobile apps, covering vendors, retention, user rights, app-store billing and product reality."] },
]);

const NEXUSNOVA_EXPECTED_COUNTS = Object.freeze({
  tool:97,
  category:9,
  article:34,
  guide:14
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
  if(query.length<4) return 0;

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

      // Prefix matches are essential while a person is still typing ("t", "tik", "tax").
      // Keep one-letter substring matches weaker because they are intentionally broad.
      if(candidateToken.startsWith(queryToken)){
        bestScore=Math.max(bestScore,0.97);
        bestDistance=Math.min(bestDistance,Math.abs(candidateToken.length-queryToken.length));
        continue;
      }

      if(queryToken.length>=2&&candidateToken.includes(queryToken)){
        bestScore=Math.max(bestScore,0.82);
        bestDistance=Math.min(bestDistance,Math.abs(candidateToken.length-queryToken.length));
        continue;
      }

      if(queryToken.length===1&&candidateToken.includes(queryToken)){
        bestScore=Math.max(bestScore,0.68);
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

    if(query.length>=4&&field.includes(query)){
      return {score:weights.phrase,coverage:1,exact:queryTokens.length,fuzzy:0,distance:0,mode:'phrase'};
    }

    if(queryTokens.length===1&&tokens.includes(query)){
      return {score:weights.token+weights.exactToken*2,coverage:1,exact:1,fuzzy:0,distance:0,mode:'token'};
    }

    if(queryTokens.length===1&&tokens.some(token=>token.startsWith(query))){
      return {score:weights.prefix??Math.round(weights.token*0.97),coverage:1,exact:0,fuzzy:1,distance:0,mode:'prefix'};
    }

    if(queryTokens.length===1&&query.length>=2&&tokens.some(token=>token.includes(query))){
      return {score:weights.substring??Math.round(weights.token*0.82),coverage:0.82,exact:0,fuzzy:1,distance:0,mode:'substring'};
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
      {exact:1900,phrase:1550,prefix:1620,substring:1020,token:1200,exactToken:70,fuzzyToken:35}
    );

    const url=this.scoreField(
      query,queryTokens,record._url,record._urlTokens,
      {exact:1200,phrase:1000,prefix:980,substring:680,token:800,exactToken:45,fuzzyToken:24}
    );

    const tags=this.scoreField(
      query,queryTokens,record._tags.join(' '),record._tagTokens,
      {exact:1400,phrase:1150,prefix:1160,substring:820,token:980,exactToken:55,fuzzyToken:30}
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

    const TYPE_PRIORITY={tool:0,category:1,guide:2,article:3};
    scored.sort((left,right)=>{
      // Keep the interactive dropdown tool-first regardless of article SEO metadata or tag length.
      const leftPriority=TYPE_PRIORITY[left.record.type]??99;
      const rightPriority=TYPE_PRIORITY[right.record.type]??99;
      if(leftPriority!==rightPriority) return leftPriority-rightPriority;
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
      item.href='/'+String(result.url||'').replace(/^\\/+/, '');
      item.setAttribute('role','option');
      item.setAttribute('data-nn-search-result','');
      item.setAttribute('aria-label',(result.displayTitle||result.title)+', '+(result.category||TYPE_LABELS[result.type]||result.type)+', '+item.href);

      const icon=document.createElement('span');
      icon.className='nn-search-result-icon';
      icon.setAttribute('aria-hidden','true');
      icon.textContent=String(index+1).padStart(2,'0');

      const main=document.createElement('span');
      main.className='nn-search-result-main';

      const title=document.createElement('span');
      title.className='nn-search-result-title';
      title.textContent=result.displayTitle||String(result.title||'').replace(/^\\[(?:Tool|Category|Guide|Article)\\]\\s*/,'');

      const meta=document.createElement('span');
      meta.className='nn-search-result-meta';
      const typeLabel=TYPE_LABELS[result.type]||result.type||'Result';
      meta.textContent=(result.category||typeLabel)+' · '+typeLabel;

      const route=document.createElement('span');
      route.className='nn-search-result-url';
      route.textContent='/'+String(result.url||'').replace(/^\\/+/, '');

      main.appendChild(title);
      main.appendChild(meta);
      main.appendChild(route);
      item.appendChild(icon);
      item.appendChild(main);
      item.appendChild(document.createTextNode('→'));
      fragment.appendChild(item);
    });

    panel.appendChild(fragment);
    panel.hidden=false;
  }

  bindDropdown({input,form,panel,maxResults=this.maxResults,filterType}={}){
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

      this.renderDropdown(panel,this.query(value).filter(result=>!filterType||result.type===filterType).slice(0,maxResults),{maxResults});
      input.setAttribute('aria-expanded','true');
      setActive(-1);
    };

    const onSubmit=event=>{
      const results=this.query(String(input.value||'').trim()).filter(result=>!filterType||result.type===filterType).slice(0,maxResults);
      if(!results.length){
        event.preventDefault();
        render();
        return;
      }

      event.preventDefault();
      window.location.assign('/'+String(results[0].url||'').replace(/^\\/+/, ''));
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
  tool:97,
  category:9,
  article:34,
  guide:14
});

NexusNovaSearchCore.DATASET_SIZE=154;

if(typeof window!=='undefined'){
  window.NexusNovaSearchCore=NexusNovaSearchCore;
  window.NexusNovaSearchData=NEXUSNOVA_SEARCH_DATA;
}

if(typeof globalThis!=='undefined'){
  globalThis.NexusNovaSearchCore=NexusNovaSearchCore;
}
