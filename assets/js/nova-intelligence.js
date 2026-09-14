(() => {
  "use strict";

  const prompt = document.getElementById("niPrompt");
  const result = document.getElementById("niResult");
  const buildButton = document.getElementById("niBuild");
  const surpriseButton = document.getElementById("niSurprise");
  const stateBadge = document.getElementById("niState");
  const modeButtons = [...document.querySelectorAll("[data-mode]")];
  const exampleButtons = [...document.querySelectorAll("[data-example]")];

  const CAPABILITIES = Object.freeze([
    { id:"image", label:"Image compression", description:"Reduce common image file sizes in a dedicated browser tool.", href:"image-compressor.html", action:"Open Image Compressor", mode:"tools", patterns:["compress image","reduce image","smaller image","image file size","compress a photo","shrink image"], status:"connected", note:"The repository contains a dedicated Image Compressor tool." },
    { id:"pdf", label:"PDF merge", description:"Combine several PDF files into one document.", href:"merge-pdf.html", action:"Open Merge PDF", mode:"tools", patterns:["merge pdf","combine pdf","join pdf","pdf files","pdf document"], status:"connected", note:"The repository contains a dedicated Merge PDF tool." },
    { id:"currency", label:"Currency rates", description:"Use the live currency-rate surface when current conversion data is required.", href:"currency-rates.html", action:"Open Currency Rates", mode:"travel", patterns:["usd","eur","aed","pkr","gbp","currency","exchange rate","convert money","convert ","forex rate"], status:"live-required", note:"A production answer should use the current rate source and show its timestamp; this preview does not invent a rate." },
    { id:"discount", label:"Discount calculator", description:"Calculate a final price and savings from explicit inputs.", href:"discount-calculator.html", action:"Open Discount Calculator", mode:"tools", patterns:["discount","sale price","savings","off the price"], status:"connected", note:"The repository contains a dedicated Discount & Savings Calculator." },
    { id:"tokens", label:"AI Token Calculator", description:"Estimate token counts for prompt and context planning.", href:"ai-token-calculator.html", action:"Open AI Token Calculator", mode:"tools", patterns:["token","tokens","context window","prompt length","ai prompt"], status:"connected", note:"The repository contains a dedicated AI Token Calculator." },
    { id:"qr", label:"QR Code Scanner", description:"Decode a QR code from an image and review the result before opening it.", href:"qr-code-scanner.html", action:"Open QR Code Scanner", mode:"tools", patterns:["qr code","qr","scan qr","barcode"], status:"connected", note:"The repository contains a dedicated QR Code Scanner." },
    { id:"calculator", label:"Calculator", description:"Handle general arithmetic with the existing NexusNova calculator.", href:"calculator.html", action:"Open Calculator", mode:"tools", patterns:["calculate","calculator","arithmetic","math","percentage"], status:"connected", note:"The repository contains a general-purpose calculator." },
    { id:"travel", label:"Travel planning", description:"Structure a travel request, then hand off to the real data surfaces available in NexusNova.", href:"currency-rates.html", action:"Open a travel data module", mode:"travel", patterns:["travel","trip","flight","hotel","itinerary","istanbul","dubai","baku","holiday"], status:"partial", note:"The preview can structure the request, but it does not provide live flight or hotel inventory." },
    { id:"compare", label:"Comparison workflow", description:"Clarify the options and criteria before choosing a winner.", href:"tools.html", action:"Return to tools", mode:"compare", patterns:["compare","versus"," vs ","trade-off","tradeoffs","which is better","choose between"], status:"guided", note:"There is no dedicated comparison engine in the repository yet; the safe state is guided comparison, not a fabricated verdict." }
  ]);

  let activeMode = "auto";

  function normalize(value) { return String(value || "").toLowerCase().replace(/\s+/g, " ").trim(); }

  function scoreCapability(capability, query) {
    let score = 0;
    for (const pattern of capability.patterns) if (query.includes(pattern)) score += pattern.length > 5 ? 3 : 2;
    if (activeMode !== "auto" && capability.mode === activeMode) score += 2;
    if (activeMode === "general" && capability.id !== "compare") score -= 1;
    return score;
  }

  function route(query) {
    const candidates = CAPABILITIES.map((capability) => ({ capability, score: scoreCapability(capability, query) }))
      .filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
    if (activeMode === "compare" && candidates.every((item) => item.capability.id !== "compare")) {
      candidates.unshift({ capability: CAPABILITIES.find((item) => item.id === "compare"), score: 2 });
    }
    if (!candidates.length) return { capability:null, candidates:[], confidence:"needs-clarification" };
    const top = candidates[0];
    return { capability:top.capability, candidates:candidates.slice(0,3).map((item) => item.capability), confidence:top.score >= 5 ? "strong" : "possible" };
  }

  function detectSignals(query, capability) {
    const signals = [];
    if (/\b(usd|eur|aed|pkr|gbp)\b/.test(query)) signals.push("currency codes");
    if (/\b\d+(?:\.\d+)?\b/.test(query)) signals.push("numeric input");
    if (/image|photo|picture|jpg|png|webp/.test(query)) signals.push("image task");
    if (/pdf|document/.test(query)) signals.push("document task");
    if (/travel|trip|flight|hotel|itinerary/.test(query)) signals.push("travel task");
    if (/compare|versus|\bvs\b|trade-off|tradeoffs/.test(query)) signals.push("comparison");
    if (/qr|barcode/.test(query)) signals.push("QR task");
    if (capability) signals.push(capability.label.toLowerCase());
    return [...new Set(signals)].slice(0,5);
  }

  function missingInputs(query, capability) {
    if (!capability) return ["What are you trying to accomplish?", "What should the result contain?"];
    switch (capability.id) {
      case "currency": return [ /\b\d/.test(query) ? null : "amount", /\b(usd|eur|aed|pkr|gbp)\b/.test(query) ? null : "source and target currencies" ].filter(Boolean);
      case "travel": return [ /from|departure|starting in|origin/.test(query) ? null : "origin", /to |destination|travelling to|traveling to/.test(query) ? null : "destination", /day|days|date|dates|week|weeks/.test(query) ? null : "trip dates or duration", /budget|cost|price|spend/.test(query) ? null : "budget or comfort level" ].filter(Boolean);
      case "compare": return [ /compare|versus|\bvs\b|between/.test(query) ? null : "the options to compare", /budget|cost|price|speed|quality|feature|features|battery|size|performance|trade-off|tradeoffs/.test(query) ? null : "the main decision criterion" ].filter(Boolean);
      case "image": case "pdf": case "qr": return /file|image|photo|pdf|document|scan/.test(query) ? [] : ["the file or source material"];
      default: return [];
    }
  }

  function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function addCard(parent, heading, body, className = "") {
    const card = createEl("div", `ni-result-card ${className}`.trim());
    card.append(createEl("h4", "", heading), createEl("p", "", body));
    parent.append(card);
    return card;
  }

  function render(rawQuery) {
    const normalized = normalize(rawQuery);
    const group = createEl("div", "ni-understood");
    const routed = route(normalized);
    if (!normalized) {
      addCard(group, "Tell Nova the goal", "Start with the task you need to finish. For example: “I need to merge three PDF files.”");
      result.replaceChildren(group); stateBadge.textContent = "NEEDS INPUT"; return;
    }
    addCard(group, "Your request", normalized);
    if (!routed.capability) {
      addCard(group, "What NexusNova understood", "The request is too broad for this preview router. Add the task, file type, or desired outcome and Nova can narrow the next step.");
      addCard(group, "Try this", "“I need to compress a JPG,” “Compare two options,” or “Convert 1250 USD to PKR.”");
      stateBadge.textContent = "CLARIFY"; result.replaceChildren(group); return;
    }
    const cap = routed.capability;
    const signalCard = addCard(group, "Likely intent", `${cap.label} • ${routed.confidence === "strong" ? "strong route" : "possible route"}`);
    const tags = createEl("div", "ni-tags");
    detectSignals(normalized, cap).forEach((signal) => tags.append(createEl("span", "ni-tag", signal)));
    signalCard.append(tags);
    if (routed.candidates.length > 1) addCard(group, "Other plausible routes", routed.candidates.slice(1).map((item) => item.label).join(" • "));
    const missing = missingInputs(normalized, cap);
    addCard(group, "What is needed", missing.length ? `Before a real result can be produced, the workflow still needs: ${missing.join(", ")}.` : "The preview has enough information to hand the request to the selected capability.");

    const action = createEl("div", "ni-result-card ni-action-card");
    action.append(createEl("h4", "", "Recommended next step"));
    action.append(createEl("p", "", `${cap.note} ${cap.status === "live-required" ? "Any live answer must show the source and timestamp." : ""}`.trim()));
    const status = createEl("div", "ni-status-line");
    status.append(createEl("span", "ni-status-dot"));
    status.append(createEl("span", "", cap.status === "connected" ? "Connected capability" : cap.status === "partial" ? "Partially connected" : cap.status === "live-required" ? "Live data required" : "Guided workflow"));
    action.append(status);
    const actionRow = createEl("div", "ni-action-row");
    const link = document.createElement("a"); link.className = "ni-action-link"; link.href = cap.href; link.textContent = cap.action; actionRow.append(link); action.append(actionRow);
    group.append(action);

    if (cap.id === "travel") addCard(group, "Travel limitation", "This preview can structure a travel request, but it does not have a live flight or hotel provider connection. It intentionally avoids inventing prices, availability or weather.");
    if (cap.id === "compare") addCard(group, "Comparison limitation", "No dedicated comparison engine is connected here yet. A production version should collect the options and criteria, then show evidence for each trade-off rather than inventing a score.");
    if (cap.id === "currency") addCard(group, "Data honesty", "No exchange rate is displayed in this preview. Current currency conversion should come from the repository's live-rate surface with a timestamp and source.");

    stateBadge.textContent = cap.status === "connected" ? "ROUTED" : cap.status === "live-required" ? "LIVE REQUIRED" : "GUIDED";
    result.replaceChildren(group);
  }

  function setMode(mode) {
    activeMode = mode;
    modeButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.mode === mode)));
    render(prompt.value);
  }

  function surprise() {
    const options = [
      "Which NexusNova tool should I use to merge several PDF files?",
      "I need to reduce an image file size without losing useful quality.",
      "Convert 1250 USD to PKR and EUR using current rates.",
      "I have two options. Help me compare the trade-offs."
    ];
    const next = options[Math.floor(Math.random() * options.length)];
    prompt.value = next; render(next); prompt.focus();
  }

  modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  exampleButtons.forEach((button) => button.addEventListener("click", () => { prompt.value = button.dataset.example || ""; render(prompt.value); prompt.focus(); }));
  buildButton?.addEventListener("click", () => render(prompt.value));
  surpriseButton?.addEventListener("click", surprise);
  prompt?.addEventListener("keydown", (event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); render(prompt.value); } });
  render(prompt?.value || "");
})();
