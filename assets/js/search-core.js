'use strict';

/**
 * NexusNova Deep Client-Side Search Core
 * 108 tools + 9 categories + 45 articles + 14 guides = 176 records.
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












































  { title:"2026 US Federal Tax Brackets Explained", url:"articles/2026-us-federal-tax-brackets-explained.html", type:"article", category:"Articles", tags:["2026 US Federal Tax Brackets Explained","Understand the 2026 US federal income tax brackets, how marginal rates work, and why taxable income is not the same as salary.","Articles","US TAX PLANNING • OCTOBER 16, 2026"] },
  { title:"AI Photo Restoration vs Enhancement: What Can Be Recovered?", url:"articles/ai-photo-restoration-vs-enhancement.html", type:"article", category:"Articles", tags:["AI Photo Restoration vs Enhancement: What Can Be Recovered?","Understand the difference between sharpening, color correction, upscaling and AI photo restoration — including what an old or blurry photo can and cannot.","Articles","PHOTO RESTORATION"] },
  { title:"AI Search and Planning in 2026: What Google Data Shows", url:"articles/ai-search-planning-decisions-2026.html", type:"article", category:"Articles", tags:["AI Search and Planning in 2026: What Google Data Shows","Google says AI Mode searches are longer and planning queries are growing faster than AI Mode overall. Here is what that means for useful planning tools.","Articles","SEARCH TRENDS // SEP 2, 2026"] },
  { title:"AI Tokens & Context Windows Explained | LLM Guide", url:"articles/ai-token-count-context-window-guide.html", type:"article", category:"Articles", tags:["AI Tokens & Context Windows Explained | LLM Guide","A practical guide to token estimates, context windows, prompt size and why exact token counts depend on the model tokenizer.","Articles","AI PRACTICAL GUIDE"] },
  { title:"AMD Adrenalin 26.8.1: Modern Warfare 4 Support", url:"articles/amd-adrenalin-26-8-1-modern-warfare-4.html", type:"article", category:"Articles", tags:["AMD Adrenalin 26.8.1: Modern Warfare 4 Support","What AMD's August 2026 driver adds for current games and what Radeon players should check before updating.","Articles","CURRENT GAMING // AUG 24"] },
  { title:"Online Background Removers: Quality, Privacy & Checks", url:"articles/background-removal-online-guide.html", type:"article", category:"Articles", tags:["Online Background Removers: Quality, Privacy & Checks","A practical guide to online background removal: edge quality, hair and product cutouts, privacy, transparent PNG output, batch workflows and when local.","Articles","IMAGE EDITING"] },
  { title:"Cloudflare Context-Aware Vulnerability Guide", url:"articles/cloudflare-introduces-context-aware-vulnerability-remediation.html", type:"article", category:"Articles", tags:["Cloudflare Context-Aware Vulnerability Guide","Cloudflare combines code analysis, WAF telemetry and human-reviewed patch proposals to prioritize exposed vulnerabilities in an early-access service.","Articles","SECURITY • SOURCE-BACKED UPDATE"] },
  { title:"Web Image Optimization Checklist", url:"articles/compress-images-for-web.html", type:"article", category:"Articles", tags:["Web Image Optimization Checklist","Practical web image checklist for display dimensions, responsive delivery, format choice, quality checks and repeatable page-speed workflows.","Articles","WEB IMAGE DELIVERY"] },
  { title:"Credit Card Payoff: Avalanche vs. Snowball Method", url:"articles/credit-card-payoff-avalanche-vs-snowball.html", type:"article", category:"Articles", tags:["Credit Card Payoff: Avalanche vs. Snowball Method","Compare the debt avalanche and snowball methods, organize minimum payments, and build a realistic credit-card payoff plan.","Articles","DEBT PLANNING • OCTOBER 16, 2026"] },
  { title:"CS2 vs Valorant Sensitivity & eDPI Guide", url:"articles/cs2-valorant-sensitivity-edpi-guide.html", type:"article", category:"Articles", tags:["CS2 vs Valorant Sensitivity & eDPI Guide","Learn how CS2 and Valorant sensitivity conversion works, what eDPI means, why 360-distance matters and how to test aim settings without guessing.","Articles","GAMING SETTINGS"] },
  { title:"How to Build an Emergency Fund on Irregular Income", url:"articles/emergency-fund-for-irregular-income.html", type:"article", category:"Articles", tags:["How to Build an Emergency Fund on Irregular Income","Build a practical emergency fund when freelance, seasonal, commission, or contract income changes from month to month.","Articles","HOUSEHOLD FINANCE • OCTOBER 16, 2026"] },
  { title:"EMI Calculator Explained — Interest & Loan Tenure", url:"articles/emi-calculator-explained.html", type:"article", category:"Articles", tags:["EMI Calculator Explained — Interest & Loan Tenure","Understand what an EMI calculator estimates, how principal, interest rate and tenure affect monthly payments, and why the final lender amount can differ.","Articles","CALCULATORS"] },
  { title:"Freelance Cash-Flow Budget Guide", url:"articles/freelance-cash-flow-budget.html", type:"article", category:"Articles", tags:["Freelance Cash-Flow Budget Guide","Build a freelance budget around uneven income instead of pretending every month will look like your best month.","Articles","BUDGETING • OCTOBER 16, 2026"] },
  { title:"Freelance Invoice Payment Terms", url:"articles/freelance-invoice-payment-terms.html", type:"article", category:"Articles", tags:["Freelance Invoice Payment Terms","Choose clearer invoice payment terms, reduce avoidable delays, and build a freelance billing process that is easier for clients to follow.","Articles","FREELANCING • OCTOBER 16, 2026"] },
  { title:"GitHub Copilot Global Model Policy Enforces Default States", url:"articles/github-copilot-global-model-policy-enforces-default-states.html", type:"article", category:"Articles", tags:["GitHub Copilot Global Model Policy Enforces Default States","GitHub is rolling out enforcement for Copilot global model policies across enterprise plans, updating unconfigured model states automatically.","Articles","AI • SOURCE-BACKED UPDATE"] },
  { title:"GitHub Copilot in Visual Studio August 2026 Update Details", url:"articles/github-copilot-in-visual-studio-august-2026-update-details.html", type:"article", category:"Articles", tags:["GitHub Copilot in Visual Studio August 2026 Update Details","Learn about the August 2026 update for GitHub Copilot in Visual Studio, including organizational agents, reasoning effort controls, and Git code reviews.","Articles","AI • SOURCE-BACKED UPDATE"] },
  { title:"GitHub Copilot VS Code Updates — August 2026 | NexusNova", url:"articles/github-copilot-in-vs-code-receives-august-2026-agent-updates.html", type:"article", category:"Articles", tags:["GitHub Copilot VS Code Updates — August 2026 | NexusNova","Explore new features in VS Code v1.132 through v1.135, including agent session tools, chat search, integrated browser tweaks, and dictation updates.","Articles","AI • SOURCE-BACKED UPDATE"] },
  { title:"GitHub Copilot Team Model Access & Billing Rules | NexusNova", url:"articles/github-copilot-model-access-ties-to-billing-org-for-team-plans.html", type:"article", category:"Articles", tags:["GitHub Copilot Team Model Access & Billing Rules | NexusNova","GitHub updated Copilot model access rules for users with multiple organizations on Team plans, tying permissions directly to the paying organization.","Articles","AI • SOURCE-BACKED UPDATE"] },
  { title:"Google August 2026 Spam Update & Traffic Drops", url:"articles/google-august-2026-spam-update-traffic-drop.html", type:"article", category:"Articles", tags:["Google August 2026 Spam Update & Traffic Drops","What changed, what not to panic about, and a practical framework for diagnosing a search traffic drop after Google's August 2026 spam update.","Articles","GOOGLE SEARCH • AUGUST 2026"] },
  { title:"Google Preferred Sources 2026: What Website Owners Should Know", url:"articles/google-preferred-sources-2026.html", type:"article", category:"Articles", tags:["Google Preferred Sources 2026: What Website Owners Should Know","Learn how Google Preferred Sources can surface chosen sites in 2026 and what the feature does ? and does not ? guarantee.","Articles","SEARCH DISCOVERY // AUG 26"] },
  { title:"Chrome 152 for Android: Release Timeline", url:"articles/google-releases-chrome-152-for-android.html", type:"article", category:"Articles", tags:["Chrome 152 for Android: Release Timeline","Chrome 152 Android updates moved from .64 to .75 and .82. See official release dates, desktop security notes, and safe update steps.","Articles","BROWSER SECURITY • RELEASE TIMELINE"] },
  { title:"Chrome 152: 327 Security Fixes Explained", url:"articles/google-releases-chrome-152-with-327-security-fixes.html", type:"article", category:"Articles", tags:["Chrome 152: 327 Security Fixes Explained","Chrome 152 brings 327 security patches to Windows, Mac, and Linux, addressing critical use-after-free and memory issues across core browser engines.","Articles","SECURITY • SOURCE-BACKED UPDATE"] },
  { title:"Google Search Console Platform Properties 2026", url:"articles/google-search-console-platform-properties-2026.html", type:"article", category:"Articles", tags:["Google Search Console Platform Properties 2026","Learn how Google Search Console Platform Properties track Instagram, TikTok, X and YouTube performance across Search, Discover and Google News in 2026.","Articles","GOOGLE SEARCH • CREATOR SEO • 2026"] },
  { title:"GPT-5.6 Sol Context Window: 1.05M Tokens Explained", url:"articles/gpt-5-6-sol-context-window-guide.html", type:"article", category:"Articles", tags:["GPT-5.6 Sol Context Window: 1.05M Tokens Explained","Current OpenAI documentation lists a 1,050,000-token context window and 128,000 max output tokens for GPT-5.6 Sol, plus practical long-context guidance.","Articles","AI MODEL GUIDE // AUG 25"] },
  { title:"Gross vs. Net Pay: Take-Home Pay Guide", url:"articles/gross-to-net-paycheck-guide.html", type:"article", category:"Articles", tags:["Gross vs. Net Pay: Take-Home Pay Guide","Learn how gross salary turns into take-home pay, what payroll deductions mean, and how to sanity-check a paycheck estimate before budgeting.","Articles","CALCULATORS • OCTOBER 16, 2026"] },
  { title:"HEX vs RGB Color Codes: Simple Beginner Guide", url:"articles/hex-vs-rgb-colors.html", type:"article", category:"Articles", tags:["HEX vs RGB Color Codes: Simple Beginner Guide","Learn HEX vs RGB color codes, how they represent screen colors, and when each format is useful in web and design work.","Articles","DESIGN BASICS"] },
  { title:"How to Convert Hourly Pay to an Annual Salary", url:"articles/hourly-to-annual-salary-conversion-guide.html", type:"article", category:"Articles", tags:["How to Convert Hourly Pay to an Annual Salary","Convert an hourly wage into weekly, monthly, and annual gross pay, while accounting for unpaid time and benefits.","Articles","PAY AND JOB OFFERS • OCTOBER 16, 2026"] },
  { title:"JPG vs PNG vs WebP vs AVIF: Which Image Format Is Best?", url:"articles/jpg-png-webp-avif-guide.html", type:"article", category:"Articles", tags:["JPG vs PNG vs WebP vs AVIF: Which Image Format Is Best?","A practical guide to choosing JPG, PNG, WebP or AVIF for photos, screenshots, logos and web graphics without making file-size decisions harder than they.","Articles","IMAGE FORMATS"] },
  { title:"How to Merge PDF Files With Privacy in Mind", url:"articles/merge-pdf-privately.html", type:"article", category:"Articles", tags:["How to Merge PDF Files With Privacy in Mind","A practical guide to merging PDF files: prepare the inputs, order pages, inspect the output and handle sensitive documents more carefully.","Articles","PDF WORKFLOW"] },
  { title:"Modern Warfare 4 Beta PC Checklist — Dates, Patch Notes & Setup", url:"articles/modern-warfare-4-beta-pc-checklist.html", type:"article", category:"Articles", tags:["Modern Warfare 4 Beta PC Checklist — Dates, Patch Notes & Setup","A practical Call of Duty: Modern Warfare 4 beta PC checklist with official beta dates, the latest August 22 gameplay adjustments, storage planning.","Articles","CURRENT GAMING // UPDATED AUG 24"] },
  { title:"Extra Mortgage Payments: Interest Savings", url:"articles/mortgage-extra-payments-interest-savings.html", type:"article", category:"Articles", tags:["Extra Mortgage Payments: Interest Savings","Learn how extra principal payments can change mortgage payoff timing and interest, and what to check before sending extra cash.","Articles","HOME FINANCE • OCTOBER 16, 2026"] },
  { title:"Pomodoro Focus Workflow — Practical Guide | NexusNova", url:"articles/pomodoro-focus-workflow.html", type:"article", category:"Articles", tags:["Pomodoro Focus Workflow — Practical Guide | NexusNova","A practical Pomodoro workflow for focused work: choose one task, run a short session, take a real break and adjust the timing when the default pattern.","Articles","PRODUCTIVITY"] },
  { title:"Profit Margin vs. Markup", url:"articles/profit-margin-vs-markup-small-business.html", type:"article", category:"Articles", tags:["Profit Margin vs. Markup","Learn the difference between profit margin and markup, use the correct formulas, and price products or services without confusing the two.","Articles","PRICING AND PROFIT • OCTOBER 16, 2026"] },
  { title:"QR Code Best Practices — Practical Guide | NexusNova", url:"articles/qr-code-best-practices.html", type:"article", category:"Articles", tags:["QR Code Best Practices — Practical Guide | NexusNova","Create QR codes that scan reliably with practical guidance on contrast, quiet zones, size, testing, stable URLs and privacy.","Articles","QR CODES"] },
  { title:"Quarterly Taxes for 1099 Freelancers", url:"articles/quarterly-estimated-taxes-1099.html", type:"article", category:"Articles", tags:["Quarterly Taxes for 1099 Freelancers","How US freelancers can turn irregular 1099 income into a simple quarterly tax reserve without pretending the estimate is an official tax bill.","Articles","FREELANCING • OCTOBER 16, 2026"] },
  { title:"Remove EXIF & GPS Metadata From Photos Before Sharing", url:"articles/remove-exif-gps-metadata-photos.html", type:"article", category:"Articles", tags:["Remove EXIF & GPS Metadata From Photos Before Sharing","Learn how to remove EXIF and GPS metadata from photos before sharing, what metadata can reveal, what re-encoding changes, and what it cannot hide.","Articles","PHOTO PRIVACY"] },
  { title:"Resume Mistakes to Fix — Practical Guide | NexusNova", url:"articles/resume-mistakes-to-fix.html", type:"article", category:"Articles", tags:["Resume Mistakes to Fix — Practical Guide | NexusNova","Seven common resume mistakes: vague summaries, crowded layouts, weak bullet points, irrelevant details, inconsistent formatting and rushed final checks.","Articles","CAREER TOOLS"] },
  { title:"Simple Invoice Checklist: What to Include Before You Send It", url:"articles/simple-invoice-checklist-guide.html", type:"article", category:"Articles", tags:["Simple Invoice Checklist: What to Include Before You Send It","Review sender, client, invoice number, date, line items, totals, tax, payment notes and the final PDF before sending.","Articles","BUSINESS WORKFLOW"] },
  { title:"How to Calculate a Small-Business Break-Even Point", url:"articles/small-business-break-even-point.html", type:"article", category:"Articles", tags:["How to Calculate a Small-Business Break-Even Point","Calculate break-even sales using fixed costs, variable cost per sale, and contribution margin, with a worked small-business example.","Articles","SMALL-BUSINESS FINANCE • OCTOBER 16, 2026"] },
  { title:"2027 Social Security COLA: Official 3.6% Rate and Payment Dates", url:"articles/social-security-cola-2027-estimate.html", type:"article", category:"Articles", tags:["2027 Social Security COLA: Official 3.6% Rate and Payment Dates","SSA announced a 3.6% Social Security COLA for 2027 on October 14, 2026. See timing, examples, limits and the official calculator.","Articles","U.S. BENEFITS • UPDATED OCTOBER 15, 2026"] },
  { title:"How to Split a PDF and Keep Pages Organized", url:"articles/split-pdf-organize-pages.html", type:"article", category:"Articles", tags:["How to Split a PDF and Keep Pages Organized","Learn a simple PDF splitting workflow for extracting pages, naming files clearly, checking page order and avoiding common mistakes before sharing.","Articles","PDF WORKFLOW"] },
  { title:"Typing Speed Guide: WPM, Accuracy & How to Improve", url:"articles/typing-speed-wpm-accuracy-guide.html", type:"article", category:"Articles", tags:["Typing Speed Guide: WPM, Accuracy & How to Improve","Learn how typing WPM and accuracy are measured, why different tests can show different scores, and how to improve speed without sacrificing accuracy.","Articles","PRODUCTIVITY GUIDE"] },
  { title:"Unix Timestamps Explained — Developer Guide | NexusNova", url:"articles/unix-timestamps-explained.html", type:"article", category:"Articles", tags:["Unix Timestamps Explained — Developer Guide | NexusNova","Learn Unix timestamps, why they use seconds from 1970, how time zones fit in, and how to convert them safely.","Articles","DEVELOPER BASICS"] },
  { title:"Windows 11 August 2026 Gaming Crashes & RGB Drivers", url:"articles/windows-11-august-2026-rgb-gaming-crashes.html", type:"article", category:"Articles", tags:["Windows 11 August 2026 Gaming Crashes & RGB Drivers","What Microsoft has confirmed about the August 2026 Windows 11 gaming issue and what PC players should do next.","Articles","CURRENT GAMING // AUG 24"] },
  { title:"YouTube Thumbnail Size Guide 2026: 3840×2160 vs 1280×720", url:"articles/youtube-thumbnail-size-guide-2026.html", type:"article", category:"Articles", tags:["YouTube Thumbnail Size Guide 2026: 3840×2160 vs 1280×720","Understand 3840×2160 vs 1280×720 thumbnail sizes, what each means, and how to choose an appropriate upload size.","Articles","CREATOR GUIDE // 2026"] },
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
  { title:"A Practical AI Prompt Workflow for Midjourney Images and Sora Video", url:"guides/ai-prompt-workflows-2026.html", type:"guide", category:"AI Workflows", tags:["A Practical AI Prompt Workflow for Midjourney Images and Sora Video","AI Workflows","AI Prompt Enhancer","Build clearer image and video prompts by specifying the subject, framing, light, action and continuity, then test revisions systematically."] },
  { title:"Short-Form Video Hooks in 2026: Build a Useful TikTok or Reels Opening", url:"guides/short-form-hooks-2026.html", type:"guide", category:"Creator Workflows", tags:["Short-Form Video Hooks in 2026: Build a Useful TikTok or Reels Opening","Creator Workflows","TikTok & Reels Hook Generator","Write stronger short-form openings with a clear promise, visible evidence, a compact script structure and platform-aware testing."] },
  { title:"How to Set a Freelance Hourly Rate and Quote Remote Projects", url:"guides/freelance-pricing-remote-work.html", type:"guide", category:"Remote Work", tags:["How to Set a Freelance Hourly Rate and Quote Remote Projects","Remote Work","Freelance Rate Calculator","Build a sustainable freelance rate from realistic billable capacity, overhead, reserves, project scope, contingency and delivery risk."] },
  { title:"Crypto Gains and Tax Records in 2026: A Practical US and UK Checklist", url:"guides/crypto-recordkeeping-us-uk-2026.html", type:"guide", category:"Money & Records", tags:["Crypto Gains and Tax Records in 2026: A Practical US and UK Checklist","Money & Records","Crypto Tax & Profit/Loss Estimator","Organize crypto basis, proceeds, fees, disposals and simplified US or UK capital-gains estimates for the relevant tax year."] },
  { title:"A Privacy Policy and Terms Checklist for SaaS and Mobile Apps", url:"guides/app-privacy-terms-checklist.html", type:"guide", category:"Product & Trust", tags:["A Privacy Policy and Terms Checklist for SaaS and Mobile Apps","Product & Trust","Privacy Policy & Terms Generator","Create a data-map-led privacy and terms review for SaaS and mobile apps, covering vendors, retention, user rights, app-store billing and product reality."] },
]);

const NEXUSNOVA_EXPECTED_COUNTS = Object.freeze({
  tool:108,
  category:9,
  article:45,
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

NexusNovaSearchCore.DATASET_COUNTS=Object.freeze({tool:108,category:9,article:45,guide:14});

NexusNovaSearchCore.DATASET_SIZE=176;

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


