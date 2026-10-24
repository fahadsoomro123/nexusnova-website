'use strict';

/**
 * NexusNova Deep Client-Side Search Core
 * 109 tools + 9 categories + 100 articles + 14 guides = 232 records.
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
  { title:"Instant Quote Card Maker", url:"tools/quote-card-maker.html", type:"tool", category:"Creator & Social", tags:["quote card maker","status card generator","roman urdu quote card","urdu status card","whatsapp status","instagram quote"] },
  { title:"Gold & Jewellery Calculator Pakistan", url:"tools/gold-calculator-pakistan.html", type:"tool", category:"Pakistan", tags:["gold calculator pakistan","gold rate calculator","tola calculator","masha calculator","ratti calculator","jewellery calculator"] },
  { title:"Solar Bill Calculator", url:"tools/solar-bill-calculator.html", type:"tool", category:"Pakistan", tags:["solar calculator pakistan","electric bill savings","solar panel calculator","battery backup calculator","solar system size"] },
  { title:"US Tip & Bill Splitter", url:"tools/us-tip-bill-splitter.html", type:"tool", category:"Money & Records", tags:["tip calculator","restaurant tip calculator","bill splitter","us tax calculator","split restaurant bill"] },
  { title:"Hourly-to-Salary Calculator", url:"tools/hourly-to-salary-calculator.html", type:"tool", category:"Money & Records", tags:["hourly to salary","paycheck calculator","salary calculator","take home pay","us paycheck"] },
  { title:"Instant PDF Invoice Generator", url:"tools/instant-pdf-invoice-generator.html", type:"tool", category:"PDF & Documents", tags:["pdf invoice generator","invoice maker","freelance invoice","client invoice","download invoice pdf"] },












































  { title:"2026 US Federal Tax Brackets Explained: Marginal vs. Effective Rate", url:"articles/2026-us-federal-tax-brackets-explained.html", type:"article", category:"Articles", tags:["2026 US Federal Tax Brackets Explained: Marginal vs. Effective Rate","Understand the 2026 US federal income tax brackets, how marginal rates work, and why taxable income is not the same as salary.","Articles","US TAX PLANNING • OCTOBER 16, 2026"] },
  { title:"The 50/30/20 Budget Rule: Adapt Percentages to Your Pay", url:"articles/50-30-20-budget-rule.html", type:"article", category:"Articles", tags:["The 50/30/20 Budget Rule: Adapt Percentages to Your Pay","Apply the 50/30/20 budget rule to take-home pay, classify needs and wants, and adapt the targets when housing or other essentials exceed 50%.","Articles","BUDGET FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"AI Photo Restoration vs Enhancement: What Can Really Be Recovered?", url:"articles/ai-photo-restoration-vs-enhancement.html", type:"article", category:"Articles", tags:["AI Photo Restoration vs Enhancement: What Can Really Be Recovered?","Compare sharpening, color correction, upscaling and AI photo restoration, including what an old or blurry photo can and cannot reliably recover.","Articles","PHOTO RESTORATION"] },
  { title:"Air Conditioner Running Cost: Estimate Cost from Hours and Load", url:"articles/air-conditioner-running-cost.html", type:"article", category:"Articles", tags:["Air Conditioner Running Cost: Estimate Cost from Hours and Load","Estimate AC daily and monthly electricity cost from average input kW, runtime and tariff, with examples for inverter use and seasonal changes.","Articles","ENERGY FIELD GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"APR vs. APY: Compare Borrowing Costs and Savings Returns", url:"articles/apr-vs-apy.html", type:"article", category:"Articles", tags:["APR vs. APY: Compare Borrowing Costs and Savings Returns","Understand APR and APY, including compounding and fees, before comparing loan and savings offers.","Articles","DEBT FIELD GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"Average vs Weighted Average Explained", url:"articles/average-vs-weighted-average.html", type:"article", category:"Articles", tags:["Average vs Weighted Average Explained","Choose between a simple average and weighted average, with formulas and worked examples for grades, prices, surveys and business metrics.","Articles","PRACTICAL DECISION GUIDE • OCTOBER 17, 2026"] },
  { title:"Online Background Removers: Quality, Privacy and What to Check in 2026", url:"articles/background-removal-online-guide.html", type:"article", category:"Articles", tags:["Online Background Removers: Quality, Privacy and What to Check in 2026","Compare online background removers for edge quality, transparent PNG output, privacy, batch workflows, and when local processing is worth it.","Articles","IMAGE EDITING"] },
  { title:"Internet Speed: Bandwidth, Latency, and the Delay You Feel", url:"articles/bandwidth-vs-latency.html", type:"article", category:"Articles", tags:["Internet Speed: Bandwidth, Latency, and the Delay You Feel","Compare bandwidth, latency, jitter and packet loss; learn why faster download speeds may not fix gaming lag, video calls or network delays.","Articles","NETWORK FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"Battery Runtime: Estimate Hours from Capacity and Load", url:"articles/battery-runtime-estimator.html", type:"article", category:"Articles", tags:["Battery Runtime: Estimate Hours from Capacity and Load","Estimate battery backup hours from usable Wh, inverter efficiency and average watts, with notes on startup surge, cold temperatures and battery age.","Articles","BATTERY FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"Bond Yield and Duration: Separate Income from Price Risk", url:"articles/bond-yield-duration-risk.html", type:"article", category:"Articles", tags:["Bond Yield and Duration: Separate Income from Price Risk","Understand bond yield and modified duration, estimate price sensitivity to yield changes, and separate rate risk from credit and reinvestment risk.","Articles","INVESTMENT FIELD GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"Break-Even Volume vs Break-Even Revenue", url:"articles/break-even-volume-vs-revenue.html", type:"article", category:"Articles", tags:["Break-Even Volume vs Break-Even Revenue","Distinguish break-even units from break-even sales revenue, calculate both, and see when product mix makes a revenue target unreliable.","Articles","PRACTICAL DECISION GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"Business Cash Runway: Months of Cash", url:"articles/business-cash-runway-calculation.html", type:"article", category:"Articles", tags:["Business Cash Runway: Months of Cash","Calculate small-business cash runway from unrestricted cash and realistic monthly net burn, with a worked example, scenario checks and practical limits.","Articles","PRACTICAL DECISION GUIDE • OCTOBER 17, 2026"] },
  { title:"CAGR vs. Average Annual Return: Compare Growth Honestly", url:"articles/cagr-vs-average-return.html", type:"article", category:"Articles", tags:["CAGR vs. Average Annual Return: Compare Growth Honestly","Calculate compound annual growth and see why arithmetic average returns can misstate the growth experience.","Articles","INVESTMENT FIELD GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"How to Calculate Net Worth and Track Real Progress", url:"articles/calculate-net-worth.html", type:"article", category:"Articles", tags:["How to Calculate Net Worth and Track Real Progress","Build a net-worth snapshot from assets and liabilities without confusing wealth with spendable cash.","Articles","BUDGET FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"Capital Gains and Cost Basis: Record the Real Gain", url:"articles/capital-gains-cost-basis.html", type:"article", category:"Articles", tags:["Capital Gains and Cost Basis: Record the Real Gain","Estimate a capital gain from net sale proceeds and adjusted cost basis, track common basis adjustments, and understand why tax treatment varies.","Articles","TAX FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"Car Loan Total Cost: Go Beyond the Monthly Payment", url:"articles/car-loan-total-cost.html", type:"article", category:"Articles", tags:["Car Loan Total Cost: Go Beyond the Monthly Payment","Compare car-loan terms by monthly payment, total interest, fees and loan balance, then add insurance, fuel, maintenance and depreciation.","Articles","DEBT FIELD GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"Small-Business Cash Flow Forecast: A Practical Weekly Method", url:"articles/cash-flow-forecast-small-business.html", type:"article", category:"Articles", tags:["Small-Business Cash Flow Forecast: A Practical Weekly Method","Forecast small-business cash flow weekly with opening cash, expected invoice collections, supplier bills, payroll and tax reserves. Includes formulas and a worked example.","Articles","SMALL-BUSINESS FINANCE FIELD GUIDE • OCTOBER 17, 2026"] },
  { title:"Cash Reserve vs Business Credit Line", url:"articles/cash-reserve-vs-credit-line.html", type:"article", category:"Articles", tags:["Cash Reserve vs Business Credit Line","Compare cash reserves with a revolving credit line for working capital, including access conditions, financing costs and resilience trade-offs.","Articles","PRACTICAL DECISION GUIDE • OCTOBER 17, 2026"] },
  { title:"Cloud Storage Cost Growth: Forecast Space and Monthly Bill", url:"articles/cloud-storage-cost-growth.html", type:"article", category:"Articles", tags:["Cloud Storage Cost Growth: Forecast Space and Monthly Bill","Forecast cloud storage use from current GB and monthly net growth; check quota thresholds, retained file versions, backup copies, retrieval charges and renewal pricing.","Articles","NETWORK FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"How Compounding Frequency Changes Savings Growth", url:"articles/compound-interest-frequency.html", type:"article", category:"Articles", tags:["How Compounding Frequency Changes Savings Growth","Compare annual, monthly and daily compounding with correct future-value and APY formulas, worked numbers, and fee and deposit caveats.","Articles","SAVINGS FIELD GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"Web Image Optimization Checklist: Size, Format & Quality", url:"articles/compress-images-for-web.html", type:"article", category:"Articles", tags:["Web Image Optimization Checklist: Size, Format & Quality","Practical web image checklist for display dimensions, responsive delivery, format choice, quality checks and repeatable page-speed workflows.","Articles","WEB IMAGE DELIVERY"] },
  { title:"Credit Card Minimum Payment Cost Explained", url:"articles/credit-card-minimum-payment-cost.html", type:"article", category:"Articles", tags:["Credit Card Minimum Payment Cost Explained","See how minimum payments affect payoff time and interest, using a transparent balance example and a checklist for reviewing card terms.","Articles","PRACTICAL DECISION GUIDE • OCTOBER 17, 2026"] },
  { title:"Credit Card Payoff: Avalanche vs. Snowball Method", url:"articles/credit-card-payoff-avalanche-vs-snowball.html", type:"article", category:"Articles", tags:["Credit Card Payoff: Avalanche vs. Snowball Method","Compare the debt avalanche and snowball methods, organize minimum payments, and build a realistic credit-card payoff plan.","Articles","DEBT PLANNING • OCTOBER 16, 2026"] },
  { title:"Credit Utilization: Calculate the Ratio and Manage Timing", url:"articles/credit-utilization-explained.html", type:"article", category:"Articles", tags:["Credit Utilization: Calculate the Ratio and Manage Timing","Calculate revolving utilisation per card and across limits, and understand why reported balances can differ from current balances.","Articles","DEBT FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"CS2 vs Valorant sensitivity and eDPI: a practical guide.", url:"articles/cs2-valorant-sensitivity-edpi-guide.html", type:"article", category:"Articles", tags:["CS2 vs Valorant sensitivity and eDPI: a practical guide.","Learn how CS2 and Valorant sensitivity conversion works, what eDPI means, why 360-distance matters and how to test aim settings without guessing.","Articles","GAMING SETTINGS"] },
  { title:"Currency Conversion Fees: Find the Rate You Actually Receive", url:"articles/currency-conversion-fees.html", type:"article", category:"Articles", tags:["Currency Conversion Fees: Find the Rate You Actually Receive","Compare FX quotes by net received amount after exchange spread, fixed charges and percentage fees.","Articles","CURRENCY FIELD GUIDE • OCTOBER 17, 2026"] },
  { title:"Customer Acquisition Cost vs Lifetime Value", url:"articles/customer-acquisition-cost-vs-lifetime-value.html", type:"article", category:"Articles", tags:["Customer Acquisition Cost vs Lifetime Value","Compare customer acquisition cost with customer lifetime value using consistent margin and retention assumptions, a worked unit-economics example and cautions.","Articles","PRACTICAL DECISION GUIDE • OCTOBER 17, 2026"] },
  { title:"Debt Avalanche vs. Snowball: Compare Cost and Motivation", url:"articles/debt-avalanche-vs-snowball.html", type:"article", category:"Articles", tags:["Debt Avalanche vs. Snowball: Compare Cost and Motivation","Compare repayment methods using balances, APRs, minimum payments and the motivation needed to stay consistent.","Articles","DEBT FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"Dividend Yield vs. Total Return: Measure the Whole Investment", url:"articles/dividend-yield-vs-total-return.html", type:"article", category:"Articles", tags:["Dividend Yield vs. Total Return: Measure the Whole Investment","Compare dividend yield with holding-period total return, including share-price changes and cash distributions; see how a falling price can raise yield while causing a loss.","Articles","INVESTMENT FIELD GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"Education Savings: Estimate the Monthly Amount Needed", url:"articles/education-savings-time-value.html", type:"article", category:"Articles", tags:["Education Savings: Estimate the Monthly Amount Needed","Estimate future education costs while stress-testing cost growth, contributions and the date money will be needed.","Articles","SAVINGS FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"Effective vs Marginal Tax Rate Explained", url:"articles/effective-vs-marginal-tax-rate.html", type:"article", category:"Articles", tags:["Effective vs Marginal Tax Rate Explained","Learn how effective and marginal tax rates differ, calculate a simple example and avoid using one tax percentage to estimate every dollar of income.","Articles","PRACTICAL DECISION GUIDE • OCTOBER 17, 2026"] },
  { title:"Electricity Cost per Appliance: Convert Watts into kWh", url:"articles/electricity-appliance-kwh-cost.html", type:"article", category:"Articles", tags:["Electricity Cost per Appliance: Convert Watts into kWh","Estimate appliance energy from average power draw, runtime and tariff rather than treating rated watts as continuous use.","Articles","ENERGY FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"Electricity Fixed Charges vs Usage Cost", url:"articles/electricity-fixed-charges-vs-usage-cost.html", type:"article", category:"Articles", tags:["Electricity Fixed Charges vs Usage Cost","Separate electricity standing charges from energy usage and taxes, then estimate how kWh consumption and tariff changes affect a bill.","Articles","PRACTICAL DECISION GUIDE • OCTOBER 17, 2026"] },
  { title:"How to Build an Emergency Fund on Irregular Income", url:"articles/emergency-fund-for-irregular-income.html", type:"article", category:"Articles", tags:["How to Build an Emergency Fund on Irregular Income","Build a practical emergency fund when freelance, seasonal, commission, or contract income changes from month to month.","Articles","HOUSEHOLD FINANCE • OCTOBER 16, 2026"] },
  { title:"Emergency Fund Size: Build a Target That Fits Your Life", url:"articles/emergency-fund-size-guide.html", type:"article", category:"Articles", tags:["Emergency Fund Size: Build a Target That Fits Your Life","Calculate a cash reserve from essential monthly expenses, income stability and household risk.","Articles","FINANCE FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"EMI Calculator Explained: Principal, Interest and Loan Tenure", url:"articles/emi-calculator-explained.html", type:"article", category:"Articles", tags:["EMI Calculator Explained: Principal, Interest and Loan Tenure","Understand what an EMI calculator estimates, how principal, interest rate and tenure affect monthly payments, and why the final lender amount can differ.","Articles","CALCULATORS"] },
  { title:"How to Evaluate an Employer Retirement Match", url:"articles/employer-retirement-match.html", type:"article", category:"Articles", tags:["How to Evaluate an Employer Retirement Match","Calculate the maximum employer match from eligible pay, contribution caps and match rates, then check vesting and payroll true-up rules.","Articles","SAVINGS FIELD GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"Estimated Tax Payments: Build Cash for Uneven Income", url:"articles/estimated-tax-payment-buffer.html", type:"article", category:"Articles", tags:["Estimated Tax Payments: Build Cash for Uneven Income","Estimate an unpaid tax cash buffer after withholding and credits, plan transfers before deadlines, and keep cash reserves separate from legal installment rules.","Articles","TAX FIELD GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"Fixed vs Variable Business Costs", url:"articles/fixed-vs-variable-business-costs.html", type:"article", category:"Articles", tags:["Fixed vs Variable Business Costs","Separate fixed, variable and mixed costs for planning, pricing and break-even analysis, with a worked example and cost classification checklist.","Articles","PRACTICAL DECISION GUIDE • OCTOBER 17, 2026"] },
  { title:"Freelance Cash-Flow Budget: Plan Around Your Worst Normal Month", url:"articles/freelance-cash-flow-budget.html", type:"article", category:"Articles", tags:["Freelance Cash-Flow Budget: Plan Around Your Worst Normal Month","Build a freelance budget around uneven income instead of pretending every month will look like your best month.","Articles","BUDGETING • OCTOBER 16, 2026"] },
  { title:"Freelance Invoice Payment Terms: Net 15, Net 30 and Better Cash Flow", url:"articles/freelance-invoice-payment-terms.html", type:"article", category:"Articles", tags:["Freelance Invoice Payment Terms: Net 15, Net 30 and Better Cash Flow","Choose clearer invoice payment terms, reduce avoidable delays, and build a freelance billing process that is easier for clients to follow.","Articles","FREELANCING • UPDATED OCTOBER 24, 2026"] },
  { title:"Freelance Tax Reserve: Plan Cash Before the Due Date", url:"articles/freelance-tax-reserve.html", type:"article", category:"Articles", tags:["Freelance Tax Reserve: Plan Cash Before the Due Date","Estimate a reserve from projected profit and verify local rules rather than applying a universal percentage.","Articles","TAX FIELD GUIDE • OCTOBER 17, 2026"] },
  { title:"Freelancer Hourly Rate: Price the Work Behind the Work", url:"articles/freelancer-hourly-rate.html", type:"article", category:"Articles", tags:["Freelancer Hourly Rate: Price the Work Behind the Work","Build an hourly floor from target pay, overhead, tax reserve and realistic billable hours, then stress-test the rate against utilization and project quotes.","Articles","BUDGET FIELD GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"Fuel Cost per Trip: Plan a Journey from Distance and Economy", url:"articles/fuel-cost-per-trip.html", type:"article", category:"Articles", tags:["Fuel Cost per Trip: Plan a Journey from Distance and Economy","Estimate trip fuel from distance, realistic economy and local price, with a buffer for traffic and detours.","Articles","FUEL FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"Generator Fuel Cost: Budget for Runtime and Load", url:"articles/generator-fuel-cost.html", type:"article", category:"Articles", tags:["Generator Fuel Cost: Budget for Runtime and Load","Estimate fuel expense from load-specific burn rate, hours and local price, while treating safety separately.","Articles","FUEL FIELD GUIDE • OCTOBER 17, 2026"] },
  { title:"Gross Pay vs Take-Home Pay Explained", url:"articles/gross-pay-vs-take-home-pay.html", type:"article", category:"Articles", tags:["Gross Pay vs Take-Home Pay Explained","Understand gross salary, payroll deductions and take-home pay with a transparent example, budgeting checklist and notes on location-specific tax rules.","Articles","PRACTICAL DECISION GUIDE • OCTOBER 17, 2026"] },
  { title:"Gross vs Net Pay in the US: How to Estimate Your Take-Home Pay", url:"articles/gross-to-net-paycheck-guide.html", type:"article", category:"Articles", tags:["Gross vs Net Pay in the US: How to Estimate Your Take-Home Pay","Learn how gross salary turns into take-home pay, what payroll deductions mean, and how to sanity-check a paycheck estimate before budgeting.","Articles","CALCULATORS • OCTOBER 16, 2026"] },
  { title:"HEX vs RGB Color Codes: A Simple Guide for Beginners", url:"articles/hex-vs-rgb-colors.html", type:"article", category:"Articles", tags:["HEX vs RGB Color Codes: A Simple Guide for Beginners","Learn HEX vs RGB color codes, how they represent screen colors, and when each format is useful in web and design work.","Articles","DESIGN BASICS"] },
  { title:"Home Insulation Payback: Estimate Savings Before Upgrading", url:"articles/home-insulation-payback.html", type:"article", category:"Articles", tags:["Home Insulation Payback: Estimate Savings Before Upgrading","Estimate insulation payback from actual bills and a realistic savings range rather than a best-case sales claim.","Articles","ENERGY FIELD GUIDE • OCTOBER 17, 2026"] },
  { title:"How to Convert Hourly Pay to an Annual Salary", url:"articles/hourly-to-annual-salary-conversion-guide.html", type:"article", category:"Articles", tags:["How to Convert Hourly Pay to an Annual Salary","Convert an hourly wage into weekly, monthly, and annual gross pay, while accounting for unpaid time and benefits.","Articles","PAY AND JOB OFFERS • OCTOBER 16, 2026"] },
  { title:"Inflation and Purchasing Power: Convert Future Money to Today's Value", url:"articles/inflation-purchasing-power.html", type:"article", category:"Articles", tags:["Inflation and Purchasing Power: Convert Future Money to Today's Value","Estimate how inflation changes purchasing power and distinguish nominal growth from a real improvement.","Articles","INFLATION FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"Insurance Deductible vs. Premium: Compare the Trade-Off", url:"articles/insurance-deductible-tradeoff.html", type:"article", category:"Articles", tags:["Insurance Deductible vs. Premium: Compare the Trade-Off","Compare annual premium savings with the extra deductible, calculate a simple break-even period, and check whether a claim would be affordable.","Articles","INSURANCE FIELD GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"International Transfer Fees: Compare the Recipient's Net Amount", url:"articles/international-transfer-fees.html", type:"article", category:"Articles", tags:["International Transfer Fees: Compare the Recipient's Net Amount","Estimate international transfer costs using upfront charges, FX spread and the final amount credited.","Articles","CURRENCY FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"Inventory Turnover and Days Inventory", url:"articles/inventory-turnover-days-inventory.html", type:"article", category:"Articles", tags:["Inventory Turnover and Days Inventory","Calculate inventory turnover and days inventory on hand, interpret stock movement and avoid mixing revenue with cost-based inventory measures.","Articles","PRACTICAL DECISION GUIDE • OCTOBER 17, 2026"] },
  { title:"Net 30 Invoice Terms Explained", url:"articles/invoice-payment-terms-net-30.html", type:"article", category:"Articles", tags:["Net 30 Invoice Terms Explained","Understand net 30 invoice due dates, cash-flow effects, late-payment clauses and practical ways for small businesses to track receivables.","Articles","PRACTICAL DECISION GUIDE • OCTOBER 17, 2026"] },
  { title:"JPG vs PNG vs WebP vs AVIF: Which Image Format Should You Use?", url:"articles/jpg-png-webp-avif-guide.html", type:"article", category:"Articles", tags:["JPG vs PNG vs WebP vs AVIF: Which Image Format Should You Use?","A practical guide to choosing JPG, PNG, WebP or AVIF for photos, screenshots, logos and web graphics without making file-size decisions harder than they.","Articles","IMAGE FORMATS"] },
  { title:"Loan Amortization: See Where Every Payment Goes", url:"articles/loan-amortization-breakdown.html", type:"article", category:"Articles", tags:["Loan Amortization: See Where Every Payment Goes","Break a fixed loan payment into principal and interest and compare terms beyond the monthly instalment.","Articles","DEBT FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"Loan Payment vs Total Loan Cost", url:"articles/loan-payment-vs-total-loan-cost.html", type:"article", category:"Articles", tags:["Loan Payment vs Total Loan Cost","Compare a loan’s monthly payment with its full cost over time, including interest, fees and term length in a worked example.","Articles","PRACTICAL DECISION GUIDE • OCTOBER 17, 2026"] },
  { title:"Markup vs. Profit Margin: Do Not Confuse the Percentages", url:"articles/markup-vs-margin.html", type:"article", category:"Articles", tags:["Markup vs. Profit Margin: Do Not Confuse the Percentages","Compare markup on cost with gross margin on selling price, convert target rates, and price a $60 item for a 40% gross margin.","Articles","BUSINESS FIELD GUIDE • OCTOBER 17, 2026"] },
  { title:"How to Merge PDF Files in Your Browser With Privacy in Mind", url:"articles/merge-pdf-privately.html", type:"article", category:"Articles", tags:["How to Merge PDF Files in Your Browser With Privacy in Mind","A practical guide to merging PDF files: prepare the inputs, order pages, inspect the output and handle sensitive documents more carefully.","Articles","PDF WORKFLOW"] },
  { title:"Mobile Data Budget: Estimate How Much Your Plan Needs", url:"articles/mobile-data-budget.html", type:"article", category:"Articles", tags:["Mobile Data Budget: Estimate How Much Your Plan Needs","Estimate mobile data from video, music, maps, downloads and background use before selecting an allowance.","Articles","NETWORK FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"Extra Mortgage Payments: How to Estimate Interest Savings", url:"articles/mortgage-extra-payments-interest-savings.html", type:"article", category:"Articles", tags:["Extra Mortgage Payments: How to Estimate Interest Savings","Learn how extra principal payments can change mortgage payoff timing and interest, and what to check before sending extra cash.","Articles","HOME FINANCE • OCTOBER 16, 2026"] },
  { title:"Mortgage Points: Calculate the Break-Even Month", url:"articles/mortgage-points-break-even.html", type:"article", category:"Articles", tags:["Mortgage Points: Calculate the Break-Even Month","Compare an upfront discount-point fee with monthly savings and the expected period you will keep the loan.","Articles","DEBT FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"MPG vs. L/100 km: Compare Fuel Economy Across Units", url:"articles/mpg-vs-l100km-conversion.html", type:"article", category:"Articles", tags:["MPG vs. L/100 km: Compare Fuel Economy Across Units","Convert US mpg and L/100 km, distinguish imperial mpg, and compare annual fuel use and cost using the same distance and fuel price.","Articles","FUEL FIELD GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"Overdraft Fees: Calculate the Cost of a Cash-Flow Gap", url:"articles/overdraft-fee-opportunity-cost.html", type:"article", category:"Articles", tags:["Overdraft Fees: Calculate the Cost of a Cash-Flow Gap","Measure repeated overdraft charges and compare a small cash buffer with the account's actual terms.","Articles","BUDGET FIELD GUIDE • OCTOBER 17, 2026"] },
  { title:"Paycheck Budgeting: Allocate Each Paycheque Before It Disappears", url:"articles/paycheck-budget-allocation.html", type:"article", category:"Articles", tags:["Paycheck Budgeting: Allocate Each Paycheque Before It Disappears","Map pay dates to bill dates so monthly totals do not hide a near-term cash-flow problem.","Articles","BUDGET FIELD GUIDE • OCTOBER 17, 2026"] },
  { title:"PC Electricity Cost: Estimate a Computer’s Power Bill", url:"articles/pc-electricity-cost.html", type:"article", category:"Articles", tags:["PC Electricity Cost: Estimate a Computer’s Power Bill","Estimate PC and monitor electricity cost from measured wall draw, daily use and your tariff; distinguish PSU capacity from actual power consumption.","Articles","ENERGY FIELD GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"Percent Change vs Percent Difference", url:"articles/percent-change-vs-percent-difference.html", type:"article", category:"Articles", tags:["Percent Change vs Percent Difference","Learn the difference between percent change and percent difference, how to choose a base and how to report comparisons fairly.","Articles","PRACTICAL DECISION GUIDE • OCTOBER 17, 2026"] },
  { title:"Percent vs Percentage Point: The Difference", url:"articles/percent-vs-percentage-point.html", type:"article", category:"Articles", tags:["Percent vs Percentage Point: The Difference","See when to use percent change and percentage points, with clear examples for rates, surveys, fees and financial comparisons.","Articles","PRACTICAL DECISION GUIDE • OCTOBER 17, 2026"] },
  { title:"How to Use a Pomodoro Timer Without Making Focus Complicated", url:"articles/pomodoro-focus-workflow.html", type:"article", category:"Articles", tags:["How to Use a Pomodoro Timer Without Making Focus Complicated","A practical Pomodoro workflow for focused work: choose one task, run a short session, take a real break and adjust the timing when the default pattern.","Articles","PRODUCTIVITY"] },
  { title:"Portfolio Rebalancing Bands: Control Drift Without Guessing Markets", url:"articles/portfolio-rebalancing-bands.html", type:"article", category:"Articles", tags:["Portfolio Rebalancing Bands: Control Drift Without Guessing Markets","Set a repeatable rebalancing rule to keep an investment mix close to its intended risk allocation.","Articles","INVESTMENT FIELD GUIDE • OCTOBER 17, 2026"] },
  { title:"Printer Cost per Page: Compare Ink, Toner and Maintenance", url:"articles/printer-cost-per-page.html", type:"article", category:"Articles", tags:["Printer Cost per Page: Compare Ink, Toner and Maintenance","Calculate printer cost per usable page from ink or toner yield, paper and maintenance, then estimate annual cost at your print volume.","Articles","BUYING COST FIELD GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"Profit Margin vs. Markup: The Difference Small Businesses Must Know", url:"articles/profit-margin-vs-markup-small-business.html", type:"article", category:"Articles", tags:["Profit Margin vs. Markup: The Difference Small Businesses Must Know","Learn the difference between profit margin and markup, use the correct formulas, and price products or services without confusing the two.","Articles","PRICING AND PROFIT • OCTOBER 16, 2026"] },
  { title:"QR Code Best Practices: Size, Contrast, Testing and Privacy", url:"articles/qr-code-best-practices.html", type:"article", category:"Articles", tags:["QR Code Best Practices: Size, Contrast, Testing and Privacy","Create QR codes that scan reliably with practical guidance on contrast, quiet zones, size, testing, stable URLs and privacy.","Articles","QR CODES"] },
  { title:"Quarterly Estimated Taxes for 1099 Freelancers: A Practical Planning Guide", url:"articles/quarterly-estimated-taxes-1099.html", type:"article", category:"Articles", tags:["Quarterly Estimated Taxes for 1099 Freelancers: A Practical Planning Guide","Plan 1099 tax reserves, check the IRS estimated-tax threshold and prior-year safe harbor, and review the 2026 federal payment dates.","Articles","FREELANCING • UPDATED OCTOBER 23, 2026"] },
  { title:"Refinancing Break-Even: Is the New Loan Worth It?", url:"articles/refinance-break-even.html", type:"article", category:"Articles", tags:["Refinancing Break-Even: Is the New Loan Worth It?","Estimate refinance break-even from upfront costs and monthly savings, then compare loan balances and total cost over your expected holding period.","Articles","DEBT FIELD GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"How to Remove EXIF and GPS Metadata From Photos Before Sharing", url:"articles/remove-exif-gps-metadata-photos.html", type:"article", category:"Articles", tags:["How to Remove EXIF and GPS Metadata From Photos Before Sharing","Learn how to remove EXIF and GPS metadata from photos before sharing, what metadata can reveal, what re-encoding changes, and what it cannot hide.","Articles","PHOTO PRIVACY"] },
  { title:"7 Resume Mistakes That Make a Good Candidate Hard to Notice", url:"articles/resume-mistakes-to-fix.html", type:"article", category:"Articles", tags:["7 Resume Mistakes That Make a Good Candidate Hard to Notice","Seven common resume mistakes: vague summaries, crowded layouts, weak bullet points, irrelevant details, inconsistent formatting and rushed final checks.","Articles","CAREER TOOLS"] },
  { title:"Retirement Withdrawal Rate: Stress-Test Income, Not Just a Percentage", url:"articles/retirement-withdrawal-rate.html", type:"article", category:"Articles", tags:["Retirement Withdrawal Rate: Stress-Test Income, Not Just a Percentage","Understand the 4% rule, inflation-adjusted withdrawals and percentage-of-balance methods; stress-test market losses, fees, taxes and retirement length.","Articles","INVESTMENT FIELD GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"Sales Tax-Inclusive Pricing: Back Out Tax Correctly", url:"articles/sales-tax-inclusive-pricing.html", type:"article", category:"Articles", tags:["Sales Tax-Inclusive Pricing: Back Out Tax Correctly","Calculate sales tax added to a pre-tax price or extract the tax portion from a tax-inclusive total, with formulas, examples and rounding caveats.","Articles","TAX FIELD GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"Savings Rate: Measure How Much Income You Keep", url:"articles/savings-rate-calculator-guide.html", type:"article", category:"Articles", tags:["Savings Rate: Measure How Much Income You Keep","Calculate a savings rate using gross or take-home income, and distinguish personal contributions, employer match, debt principal and investment gains.","Articles","SAVINGS FIELD GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"Seasonal Gas Heating Budget: Estimate Cold-Weather Bills", url:"articles/seasonal-gas-heating-budget.html", type:"article", category:"Articles", tags:["Seasonal Gas Heating Budget: Estimate Cold-Weather Bills","Estimate winter gas cost by subtracting baseline use, matching billing units and tariff, and adjusting the forecast for comparable weather and fixed charges.","Articles","ENERGY FIELD GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"A simple invoice checklist before you print, save or send.", url:"articles/simple-invoice-checklist-guide.html", type:"article", category:"Articles", tags:["A simple invoice checklist before you print, save or send.","Review sender, client, invoice number, date, line items, totals, tax, payment notes and the final PDF before sending.","Articles","BUSINESS WORKFLOW"] },
  { title:"Sinking Funds vs. Emergency Funds: Give Known Costs Their Own Bucket", url:"articles/sinking-funds-vs-emergency-funds.html", type:"article", category:"Articles", tags:["Sinking Funds vs. Emergency Funds: Give Known Costs Their Own Bucket","Calculate monthly sinking-fund transfers from the bill, current balance and due date, then keep emergency savings for uncertain expenses.","Articles","BUDGET FIELD GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"How to Calculate a Small-Business Break-Even Point", url:"articles/small-business-break-even-point.html", type:"article", category:"Articles", tags:["How to Calculate a Small-Business Break-Even Point","Calculate break-even sales using fixed costs, variable cost per sale, and contribution margin, with a worked small-business example.","Articles","SMALL-BUSINESS FINANCE • OCTOBER 16, 2026"] },
  { title:"Small-Business Break-Even: Calculate the Sales You Need", url:"articles/small-business-break-even.html", type:"article", category:"Articles", tags:["Small-Business Break-Even: Calculate the Sales You Need","Calculate break-even units and revenue, estimate the margin of safety and target-profit sales, and stress-test price and variable costs.","Articles","BUSINESS FIELD GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"2027 Social Security COLA: Official 3.6% Rate and Payment Timing", url:"articles/social-security-cola-2027-estimate.html", type:"article", category:"Articles", tags:["2027 Social Security COLA: Official 3.6% Rate and Payment Timing","The official 3.6% 2027 COLA, announced by SSA on October 14, 2026. Review payment timing, benefit examples, limits, and official SSA resources.","Articles","U.S. BENEFITS • UPDATED OCTOBER 23, 2026"] },
  { title:"Solar Panel Payback: Calculate the Simple Recovery Period", url:"articles/solar-panel-payback-period.html", type:"article", category:"Articles", tags:["Solar Panel Payback: Calculate the Simple Recovery Period","Estimate solar payback from net installed cost and annual net bill savings, including export credits, maintenance, degradation and equipment replacement.","Articles","ENERGY FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"How to Split a PDF and Keep the Pages Organized", url:"articles/split-pdf-organize-pages.html", type:"article", category:"Articles", tags:["How to Split a PDF and Keep the Pages Organized","Learn a simple PDF splitting workflow for extracting pages, naming files clearly, checking page order and avoiding common mistakes before sharing.","Articles","PDF WORKFLOW"] },
  { title:"Subscription Costs: Find the Annual Price of Monthly Convenience", url:"articles/subscription-annual-cost.html", type:"article", category:"Articles", tags:["Subscription Costs: Find the Annual Price of Monthly Convenience","Compare first-year and renewal subscription costs, including promotional pricing, annual plans, add-ons, taxes and cancellation dates.","Articles","BUDGET FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"Tax Withholding: Estimate Whether Paycheck Deductions Need Review", url:"articles/tax-withholding-adjustment.html", type:"article", category:"Articles", tags:["Tax Withholding: Estimate Whether Paycheck Deductions Need Review","Review tax withholding after bonuses, a second job, freelance income or household changes; compare projected tax with payments already credited.","Articles","TAX FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"Time-of-Use Electricity: Estimate Savings from Shifting Loads", url:"articles/time-of-use-electricity-savings.html", type:"article", category:"Articles", tags:["Time-of-Use Electricity: Estimate Savings from Shifting Loads","Estimate time-of-use electricity savings by shifting flexible kWh to cheaper periods, accounting for rate windows, extra usage and demand charges.","Articles","ENERGY FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"Tyre Pressure and Fuel Use: Estimate Realistic Savings", url:"articles/tire-pressure-fuel-savings.html", type:"article", category:"Articles", tags:["Tyre Pressure and Fuel Use: Estimate Realistic Savings","Estimate fuel-cost changes without promising a fixed saving, and learn how to check cold tyre pressure using the vehicle placard or owner’s manual.","Articles","FUEL FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"Typing speed, WPM and accuracy: a practical guide.", url:"articles/typing-speed-wpm-accuracy-guide.html", type:"article", category:"Articles", tags:["Typing speed, WPM and accuracy: a practical guide.","Learn how typing WPM and accuracy are measured, why different tests can show different scores, and how to improve speed without sacrificing accuracy.","Articles","PRODUCTIVITY GUIDE"] },
  { title:"Unix Timestamps Explained Without the Confusion", url:"articles/unix-timestamps-explained.html", type:"article", category:"Articles", tags:["Unix Timestamps Explained Without the Confusion","Learn Unix timestamps, why they use seconds from 1970, how time zones fit in, and how to convert them safely.","Articles","DEVELOPER BASICS"] },
  { title:"Vehicle Total Cost of Ownership Guide", url:"articles/vehicle-total-cost-of-ownership.html", type:"article", category:"Articles", tags:["Vehicle Total Cost of Ownership Guide","Estimate the full cost of owning a vehicle beyond the purchase price, including financing, fuel, insurance, maintenance, taxes and resale value.","Articles","PRACTICAL DECISION GUIDE • OCTOBER 17, 2026"] },
  { title:"Water Heater Energy Cost: Estimate Daily Hot-Water Energy", url:"articles/water-heater-energy-cost.html", type:"article", category:"Articles", tags:["Water Heater Energy Cost: Estimate Daily Hot-Water Energy","Estimate water-heater energy and cost from litres, temperature rise and efficiency, including standby losses and real tariff units.","Articles","WATER FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"Water Leak Cost: Estimate the Bill Before the Next Reading", url:"articles/water-leak-bill-estimate.html", type:"article", category:"Articles", tags:["Water Leak Cost: Estimate the Bill Before the Next Reading","Estimate leak volume and bill impact from flow rate and duration, convert litres to billed units, and check for continuous meter movement safely.","Articles","WATER FIELD GUIDE • UPDATED OCTOBER 24, 2026"] },
  { title:"YouTube Thumbnail Sizes in 2026: Upload Recommendations vs API Renditions", url:"articles/youtube-thumbnail-size-guide-2026.html", type:"article", category:"Articles", tags:["YouTube Thumbnail Sizes in 2026: Upload Recommendations vs API Renditions","Compare YouTube’s 3840×2160 video-thumbnail upload recommendation with API thumbnail renditions, including 1280×720 maxres and higher sizes when available.","Articles","CREATOR GUIDE // 2026"] },
  { title:"Zero-Based Budgeting: Give Every Unit of Income a Job", url:"articles/zero-based-budget.html", type:"article", category:"Articles", tags:["Zero-Based Budgeting: Give Every Unit of Income a Job","Build a zero-based budget by assigning take-home income to bills, sinking funds, debt, savings and flexible spending without double-counting cash.","Articles","BUDGET FIELD GUIDE • UPDATED OCTOBER 23, 2026"] },
  { title:"Images", url:"image-tools.html", type:"category", category:"", tags:["images","image tools","category","hub"] },
  { title:"PDF & Documents", url:"pdf-tools.html", type:"category", category:"", tags:["pdf & documents","pdf tools","pdf","documents","category","hub"] },
  { title:"Calculators", url:"calculator-tools.html", type:"category", category:"", tags:["calculators","calculator tools","category","hub"] },
  { title:"Pakistan Tools", url:"pakistan-tools.html", type:"category", category:"", tags:["pakistan tools","pakistan","category","hub"] },
  { title:"Security & Network", url:"network-tools.html", type:"category", category:"", tags:["security & network","network tools","security","network","category","hub"] },
  { title:"Developer & Data", url:"developer-tools.html", type:"category", category:"", tags:["developer & data","developer tools","developer","data","category","hub"] },
  { title:"Productivity", url:"productivity-tools.html", type:"category", category:"", tags:["productivity","productivity tools","category","hub"] },
  { title:"Gaming", url:"gaming.html", type:"category", category:"", tags:["gaming","game","edpi","sensitivity","reaction","category","hub"] },
  { title:"Live Information", url:"live.html", type:"category", category:"", tags:["live information","live","information","category","hub","today","pakistan today","dashboard","weather","sports","gold","fuel","currency","aqi","crypto","earthquakes"] },












































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
  { title:"2026 US Federal Tax Bracket Calculator", url:"tools/us-federal-tax-bracket-calculator.html", type:"tool", category:"Money & Records", tags:["us federal tax brackets","2026 federal tax brackets","federal income tax calculator","tax bracket calculator","tax bracket calculator 2026","irs tax brackets","income tax brackets","marginal tax rate","taxable income","single filer","married filing jointly","married filing separately","head of household","2026 US tax estimator"] },
  { title:"Mortgage Payoff Calculator", url:"tools/mortgage-payoff-calculator.html", type:"tool", category:"Money & Records", tags:["mortgage payoff calculator","mortgage payoff calculator with extra payments","early mortgage payoff","home loan payoff calculator","pay off mortgage calculator","extra principal payment","mortgage interest savings","remaining mortgage balance","mortgage amortization","mortgage repayment calculator"] },
  { title:"Loan Payoff Calculator", url:"tools/loan-payoff-calculator.html", type:"tool", category:"Money & Records", tags:["loan payoff calculator","loan payback calculator","loan repayment calculator","loan calculator online","early loan payoff","loan amortization calculator","loan payoff with extra payments","personal loan payoff","car loan payoff","remaining loan balance","calculate loan interest"] },
  { title:"Stock Profit Calculator", url:"tools/stock-profit-calculator.html", type:"tool", category:"Money & Records", tags:["stock profit calculator","share profit calculator","stock return calculator","calculate stock gains","stock trading profit","investment return calculator","share price profit loss","brokerage fees","stock break even price","dividend return","fractional shares"] },
  { title:"Crypto Profit Calculator", url:"tools/crypto-profit-calculator.html", type:"tool", category:"Money & Records", tags:["crypto profit calculator","cryptocurrency profit calculator","bitcoin profit calculator","crypto trade calculator","crypto P&L calculator","crypto trading fees","crypto ROI","break even crypto price","entry price exit price","spot trade profit","crypto gain loss","transaction fee calculator"] },
  { title:"SEO Audit Studio", url:"seo-audit-studio.html", type:"tool", category:"Developer & Data", tags:["seo audit studio","technical seo audit","website seo checker","website health report","page speed insights","mobile performance","desktop performance","core web vitals","structured data audit","meta tags","search visibility","seo score","website audit","nexusnova"] },
  { title:"A Practical AI Prompt Workflow for Midjourney Images and Sora Video", url:"guides/ai-prompt-workflows-2026.html", type:"guide", category:"AI Workflows", tags:["A Practical AI Prompt Workflow for Midjourney Images and Sora Video","AI Workflows","AI Prompt Enhancer","Build clearer image and video prompts by specifying the subject, framing, light, action and continuity, then test revisions systematically."] },
  { title:"Short-Form Video Hooks in 2026: Build a Useful TikTok or Reels Opening", url:"guides/short-form-hooks-2026.html", type:"guide", category:"Creator Workflows", tags:["Short-Form Video Hooks in 2026: Build a Useful TikTok or Reels Opening","Creator Workflows","TikTok & Reels Hook Generator","Write stronger short-form openings with a clear promise, visible evidence, a compact script structure and platform-aware testing."] },
  { title:"How to Set a Freelance Hourly Rate and Quote Remote Projects", url:"guides/freelance-pricing-remote-work.html", type:"guide", category:"Remote Work", tags:["How to Set a Freelance Hourly Rate and Quote Remote Projects","Remote Work","Freelance Rate Calculator","Build a sustainable freelance rate from realistic billable capacity, overhead, reserves, project scope, contingency and delivery risk."] },
  { title:"Crypto Gains and Tax Records in 2026: A Practical US and UK Checklist", url:"guides/crypto-recordkeeping-us-uk-2026.html", type:"guide", category:"Money & Records", tags:["Crypto Gains and Tax Records in 2026: A Practical US and UK Checklist","Money & Records","Crypto Tax & Profit/Loss Estimator","Organize crypto basis, proceeds, fees, disposals and simplified US or UK capital-gains estimates for the relevant tax year."] },
  { title:"A Privacy Policy and Terms Checklist for SaaS and Mobile Apps", url:"guides/app-privacy-terms-checklist.html", type:"guide", category:"Product & Trust", tags:["A Privacy Policy and Terms Checklist for SaaS and Mobile Apps","Product & Trust","Privacy Policy & Terms Generator","Create a data-map-led privacy and terms review for SaaS and mobile apps, covering vendors, retention, user rights, app-store billing and product reality."] },
]);

const NEXUSNOVA_EXPECTED_COUNTS = Object.freeze({
  tool:109,
  category:9,
  article:100,
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
  if(query.length<2) return 0;

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

      if(candidateToken.includes(queryToken)&&queryToken.length>=4){
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

    // Single-character searches are discovery queries, not fuzzy full-text queries.
    // Do not let article prose or generic tags such as "tool" dominate a query like "t".
    const singleCharacterQuery=queryTokens.length===1 && query.length===1;
    const aliasTargets=NEXUSNOVA_ALIAS_MAP[query];
    const scored=[];

    for(const record of this.records){
      const result=this.scoreRecord(query,queryTokens,record);
      if(!result) continue;

      if(aliasTargets&&!aliasTargets.includes(result.record.url)) continue;

      if(singleCharacterQuery){
        const token=queryTokens[0];
        const titlePrefix=record._titleTokens.some(candidate=>candidate.startsWith(token));
        const urlPrefix=record._urlTokens.some(candidate=>candidate.startsWith(token));
        if(!titlePrefix&&!urlPrefix) continue;
        result.singleCharacterPrefix=titlePrefix?2:1;
      }

      scored.push(result);
    }

    if(singleCharacterQuery&&scored.some(item=>item.record.type==='tool')){
      const tools=scored.filter(item=>item.record.type==='tool');
      const nonTools=scored.filter(item=>item.record.type!=='tool');
      scored.length=0;
      scored.push(...tools,...nonTools);
    }

    scored.sort((left,right)=>{
      if(singleCharacterQuery){
        const prefixDiff=(right.singleCharacterPrefix||0)-(left.singleCharacterPrefix||0);
        if(prefixDiff) return prefixDiff;
      }
      const typePriority=type=>type==='tool'?0:(type==='category'?1:2);
      const priorityDiff=typePriority(left.record.type)-typePriority(right.record.type);
      if(priorityDiff) return priorityDiff;
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

      const url=document.createElement('span');
      url.className='nn-search-result-url';
      url.textContent=result.url;

      main.appendChild(title);
      main.appendChild(meta);
      main.appendChild(url);
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

NexusNovaSearchCore.DATASET_COUNTS=Object.freeze({tool:109,category:9,article:100,guide:14});

NexusNovaSearchCore.DATASET_SIZE=232;

if(typeof window!=='undefined'){
  window.NexusNovaSearchCore=NexusNovaSearchCore;
  window.NexusNovaSearchData=NEXUSNOVA_SEARCH_DATA;
}

if(typeof globalThis!=='undefined'){
  globalThis.NexusNovaSearchCore=NexusNovaSearchCore;
}

if(typeof window!=='undefined'&&window.document&&!window.__nexusNovaRelatedToolsBootstrapScriptRequested){
  window.__nexusNovaRelatedToolsBootstrapScriptRequested=true;
  const relatedBootstrap=document.createElement('script');
  relatedBootstrap.src='/assets/js/related-tools-bootstrap.js?v=20261016-related-content-v1';
  relatedBootstrap.async=true;
  relatedBootstrap.dataset.nexusnovaRelatedToolsBootstrap='';
  relatedBootstrap.onerror=()=>{window.__nexusNovaRelatedToolsBootstrapScriptRequested=false;};
  document.head.appendChild(relatedBootstrap);
}


