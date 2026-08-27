import { renderAI } from './discover-apps.js';

const CFG_KEY = 'nexusnova_nova_ai_mobile_v1';
const UI_KEY = 'nexusnova_sol57_fresh_ui_v1';
const THREADS_KEY = 'nexusnova_sol57_fresh_threads_v1';
const DRAFT_KEY = 'nexusnova_sol57_fresh_draft_v1';
const VIDEO_JOBS_KEY = 'nexusnova_sol57_video_jobs_v1';
const VOICE_KEY = 'nexusnova_sol57_fresh_voice_v1';
const MAX_THREADS = 30;
const MAX_TURNS = 80;
const MAX_FILES = 6;
const MAX_FILE_BYTES = 220 * 1024;
const MAX_FILES_TOTAL = 700 * 1024;
const CHAT_TIMEOUT_MS = 180_000;
const HEALTH_TIMEOUT_MS = 10_000;
const VIDEO_TIMEOUT_MS = 60_000;

const PROFILE_LABELS = Object.freeze({
  sol: 'NOVA 5.7 Sol',
  terra: 'NOVA 5.7 Terra',
  luna: 'NOVA 5.7 Luna',
  '5.6': 'NOVA 5.6'
});
const VOICE_PROVIDERS = Object.freeze({
  'system-auto': { label: 'Best System Voice', tier: 'FREE', kind: 'system', gender: 'auto' },
  'system-female': { label: 'System Female', tier: 'FREE', kind: 'system', gender: 'female' },
  'system-male': { label: 'System Male', tier: 'FREE', kind: 'system', gender: 'male' },
  piper: { label: 'Local Piper', tier: 'FREE', kind: 'gateway', provider: 'piper' },
  kokoro: { label: 'Local Kokoro', tier: 'FREE', kind: 'gateway', provider: 'kokoro' },
  elevenlabs: { label: 'ElevenLabs Natural', tier: 'PAID', kind: 'gateway', provider: 'elevenlabs' },
  azure: { label: 'Microsoft Azure Neural', tier: 'PAID', kind: 'gateway', provider: 'azure' },
  google: { label: 'Google Cloud Neural', tier: 'PAID', kind: 'gateway', provider: 'google' },
  premium: { label: 'Custom Premium Provider', tier: 'PAID', kind: 'gateway', provider: 'premium' }
});

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));
const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const readJson = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '');
    return value ?? fallback;
  } catch { return fallback; }
};
const writeJson = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
};

function readConfig() {
  const value = readJson(CFG_KEY, {});
  return value && typeof value === 'object' ? value : {};
}
function saveConfig(patch) {
  const next = { ...readConfig(), ...patch };
  writeJson(CFG_KEY, next);
  return next;
}
function readUi() {
  const value = readJson(UI_KEY, {});
  return {
    model: PROFILE_LABELS[value.model] ? value.model : 'sol',
    speed: ['standard', 'fast'].includes(value.speed) ? value.speed : 'fast',
    intelligence: ['max', 'extra-high', 'high', 'medium', 'light'].includes(value.intelligence) ? value.intelligence : 'max',
    mode: ['chat', 'work', 'research'].includes(value.mode) ? value.mode : 'chat',
    currentThreadId: String(value.currentThreadId || '')
  };
}
function saveUi(patch) {
  const next = { ...readUi(), ...patch };
  writeJson(UI_KEY, next);
  return next;
}
function readVoice() {
  const value = readJson(VOICE_KEY, {});
  return {
    provider: VOICE_PROVIDERS[value.provider] ? value.provider : 'system-auto',
    gender: ['auto', 'female', 'male'].includes(value.gender) ? value.gender : 'auto',
    language: ['en-US', 'ur-PK', 'hi-IN', 'en-GB'].includes(value.language) ? value.language : 'en-US',
    autoListen: value.autoListen !== false,
    autoSpeak: value.autoSpeak !== false,
    rate: Number.isFinite(Number(value.rate)) ? Math.max(.75, Math.min(1.2, Number(value.rate))) : .96
  };
}
function saveVoice(patch) {
  const next = { ...readVoice(), ...patch };
  writeJson(VOICE_KEY, next);
  return next;
}

function normalizeEndpoint(raw) {
  const input = String(raw || '').trim().replace(/\/+$/, '');
  if (!input) throw new Error('Enter the PC NOVA gateway address first.');
  let url;
  try { url = new URL(input); }
  catch { throw new Error('Enter a valid NOVA gateway URL.'); }
  if (url.username || url.password || url.search || url.hash) throw new Error('Use the plain gateway base URL.');
  const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !localHttp) throw new Error('Phone gateway connection requires HTTPS.');
  return `${url.origin}${url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, '')}`;
}
function pairedConfig() {
  const config = readConfig();
  const token = String(config.token || '').trim();
  if (!token) return null;
  try { return { ...config, endpoint: normalizeEndpoint(config.endpoint), token }; }
  catch { return null; }
}
async function fetchWithTimeout(url, options = {}, timeoutMs = CHAT_TIMEOUT_MS) {
  const controller = options.controller || new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, controller: undefined, signal: controller.signal, cache: 'no-store' });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Request timed out or was stopped.');
    throw error;
  } finally { clearTimeout(timer); }
}
async function safeJson(response) {
  try { return await response.json(); }
  catch { return {}; }
}
async function gatewayHealth(config = pairedConfig()) {
  if (!config) throw new Error('NOVA gateway is not paired yet.');
  const response = await fetchWithTimeout(`${config.endpoint}/health`, { method: 'GET' }, HEALTH_TIMEOUT_MS);
  const data = await safeJson(response);
  if (!response.ok || data?.ok === false) throw new Error(String(data?.error || `Gateway HTTP ${response.status}`));
  const model = String(data?.model || data?.ollama?.model || '').trim();
  if (model) saveConfig({ localObservedModel: model.slice(0, 160), localModelVerifiedAt: Date.now() });
  return { ...data, model };
}
async function runSecureGatewayTest(endpointValue, tokenValue) {
  const endpoint = normalizeEndpoint(endpointValue);
  const token = String(tokenValue || '').trim();
  if (!token) throw new Error('Enter the pairing token first.');
  const config = saveConfig({ endpoint, token, useGateway: true });
  const health = await gatewayHealth(config);
  const response = await fetchWithTimeout(`${endpoint}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-NexusNova-Token': token },
    body: JSON.stringify({
      message: 'NEXUSNOVA_57_CONNECTION_TEST. Reply briefly that the connection is working.',
      mode: 'chat',
      history: [],
      app_context: 'NexusNova Fresh NOVA 5.7 Sol secure connection diagnostic. No GitHub write action requested.',
      connection_test: true
    })
  }, CHAT_TIMEOUT_MS);
  const chat = await safeJson(response);
  if (!response.ok || chat?.ok === false) throw new Error(String(chat?.error || `NOVA request HTTP ${response.status}`));
  const reply = String(chat?.reply || '').trim();
  if (!reply) throw new Error('Gateway returned no model reply.');
  const model = String(chat?.model || health?.model || 'Local Ollama model').trim();
  saveConfig({ endpoint, token, useGateway: true, localObservedModel: model.slice(0, 160), localModelVerifiedAt: Date.now() });
  return { model, reply, githubWrites: Boolean(chat?.github_writes ?? health?.github_writes) };
}

function readThreads() {
  const value = readJson(THREADS_KEY, []);
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object').slice(0, MAX_THREADS) : [];
}
function writeThreads(list) {
  return writeJson(THREADS_KEY, (Array.isArray(list) ? list : []).slice(0, MAX_THREADS));
}
function ensureThread(ui) {
  let list = readThreads();
  let thread = list.find(item => item.id === ui.currentThreadId);
  if (!thread) {
    thread = { id: uid('chat'), title: 'New chat', updatedAt: Date.now(), turns: [] };
    list = [thread, ...list];
    writeThreads(list);
    saveUi({ currentThreadId: thread.id });
  }
  thread.turns = Array.isArray(thread.turns) ? thread.turns.slice(-MAX_TURNS) : [];
  return thread;
}
function updateThread(thread) {
  const next = { ...thread, turns: (thread.turns || []).slice(-MAX_TURNS), updatedAt: Date.now() };
  const list = readThreads().filter(item => item.id !== next.id);
  writeThreads([next, ...list]);
  return next;
}
function newThread() {
  const thread = { id: uid('chat'), title: 'New chat', updatedAt: Date.now(), turns: [] };
  writeThreads([thread, ...readThreads()]);
  saveUi({ currentThreadId: thread.id });
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
  return thread;
}
function threadTitle(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean ? clean.slice(0, 46) : 'New chat';
}

function installStyle() {
  if (document.getElementById('nxNovaSol57FreshStyle')) return;
  const style = document.createElement('style');
  style.id = 'nxNovaSol57FreshStyle';
  style.textContent = `
    .nx-sol57-host>.nx-app-head{display:none!important}
    .nx-sol57-root{position:relative;min-height:calc(100dvh - 86px);background:#151515;color:#f4f4f4;border-radius:24px;overflow:hidden;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .nx-sol57-root *{box-sizing:border-box}.nx-sol57-top{height:62px;display:flex;align-items:center;gap:10px;padding:0 14px;border-bottom:1px solid #303030;background:#171717;position:sticky;top:0;z-index:10}.nx-sol57-top__title{min-width:0;flex:1}.nx-sol57-top__title strong,.nx-sol57-top__title small{display:block}.nx-sol57-top__title strong{font-size:16px}.nx-sol57-top__title small{margin-top:2px;color:#8e8e8e;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .nx-sol57-icon{width:40px;height:40px;border:0;border-radius:50%;background:#272727;color:#f2f2f2;font-size:19px;display:inline-grid;place-items:center}.nx-sol57-icon:active{transform:scale(.97);background:#333}.nx-sol57-modes{display:flex;gap:6px;padding:10px 12px 0;background:#151515}.nx-sol57-mode{flex:1;min-height:36px;border:1px solid #333;border-radius:11px;background:#1e1e1e;color:#a9a9a9;font-weight:700;font-size:11px}.nx-sol57-mode.active{background:#eee;color:#111;border-color:#eee}
    .nx-sol57-main{display:flex;flex-direction:column;min-height:calc(100dvh - 158px)}.nx-sol57-messages{flex:1;min-height:300px;padding:18px 14px 174px;overflow:auto;scroll-behavior:smooth}.nx-sol57-welcome{max-width:620px;margin:9vh auto 26px;text-align:center}.nx-sol57-welcome h2{margin:0 0 8px;font-size:26px}.nx-sol57-welcome p{margin:0;color:#8e8e8e;line-height:1.55}.nx-sol57-msg{max-width:760px;margin:0 auto 16px;display:flex}.nx-sol57-msg.user{justify-content:flex-end}.nx-sol57-bubble{max-width:min(88%,680px);padding:12px 14px;border-radius:18px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.55;font-size:14px}.nx-sol57-msg.user .nx-sol57-bubble{background:#2b2b2b;border-bottom-right-radius:5px}.nx-sol57-msg.assistant .nx-sol57-bubble{padding-left:2px;background:transparent;color:#efefef}.nx-sol57-msg-meta{display:block;margin-top:6px;color:#737373;font-size:9px}
    .nx-sol57-composer-wrap{position:absolute;left:0;right:0;bottom:0;padding:9px 10px 12px;background:linear-gradient(180deg,rgba(21,21,21,0),#151515 22%,#151515)}.nx-sol57-chips{display:flex;gap:6px;overflow:auto;padding:0 2px 7px;scrollbar-width:none}.nx-sol57-chip{flex:0 0 auto;min-height:30px;padding:0 9px;border:1px solid #3a3a3a;border-radius:999px;background:#202020;color:#bcbcbc;font-size:10px}.nx-sol57-chip strong{color:#eee}.nx-sol57-compose{border:1px solid #3b3b3b;border-radius:22px;background:#202020;padding:9px}.nx-sol57-attachments{display:flex;gap:6px;flex-wrap:wrap}.nx-sol57-file{max-width:170px;border:1px solid #393939;border-radius:10px;background:#292929;padding:5px 7px;color:#cfcfcf;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nx-sol57-compose textarea{width:100%;max-height:120px;min-height:42px;border:0;outline:0;resize:none;background:transparent;color:#f3f3f3;font:inherit;padding:8px 6px}.nx-sol57-compose textarea::placeholder{color:#777}.nx-sol57-compose-actions{display:flex;align-items:center;gap:7px}.nx-sol57-plus{width:36px;height:36px;border:0;border-radius:50%;background:#2f2f2f;color:#fff;font-size:22px}.nx-sol57-send{margin-left:auto;min-width:40px;height:40px;border:0;border-radius:50%;background:#f1f1f1;color:#111;font-weight:900}.nx-sol57-send.stop{background:#d8a1a1}.nx-sol57-voice{width:40px;height:40px;border:0;border-radius:50%;background:#2d2d2d;color:#fff}.nx-sol57-status{padding:5px 4px 0;color:#797979;font-size:9px;min-height:17px}
    .nx-sol57-backdrop{position:fixed;inset:0;z-index:2147482500;background:rgba(0,0,0,.68);display:flex;align-items:flex-end;justify-content:center}.nx-sol57-sheet{width:min(760px,100%);max-height:90dvh;overflow:auto;background:#181818;color:#f1f1f1;border:1px solid #373737;border-bottom:0;border-radius:26px 26px 0 0}.nx-sol57-sheet-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;padding:15px 16px;background:#181818;border-bottom:1px solid #303030}.nx-sol57-sheet-head>div{flex:1}.nx-sol57-sheet-head strong,.nx-sol57-sheet-head small{display:block}.nx-sol57-sheet-head small{margin-top:3px;color:#858585}.nx-sol57-sheet-body{padding:14px 16px 28px}.nx-sol57-list-button{width:100%;display:flex;align-items:center;gap:12px;min-height:52px;border:0;border-bottom:1px solid #2e2e2e;background:transparent;color:#eee;text-align:left}.nx-sol57-list-button span:first-child{width:30px;text-align:center;font-size:19px}.nx-sol57-list-button small{display:block;color:#808080;margin-top:2px}.nx-sol57-field{display:block;margin:11px 0}.nx-sol57-field>span{display:block;margin:0 0 5px;color:#9a9a9a;font-size:10px}.nx-sol57-field input,.nx-sol57-field select,.nx-sol57-field textarea{width:100%;border:1px solid #3b3b3b;border-radius:11px;background:#222;color:#eee;padding:10px}.nx-sol57-row{display:flex;gap:8px;flex-wrap:wrap}.nx-sol57-btn{min-height:40px;padding:0 12px;border:1px solid #414141;border-radius:11px;background:#292929;color:#eee;font-weight:700;font-size:11px}.nx-sol57-btn.primary{background:#eee;color:#111;border-color:#eee}.nx-sol57-note{color:#888;font-size:10px;line-height:1.5}.nx-sol57-ready-row{display:flex;align-items:center;gap:9px;padding:10px;border:1px solid #343434;border-radius:12px;margin-bottom:7px;background:#202020}.nx-sol57-dot{width:9px;height:9px;border-radius:50%;background:#e0c57d}.nx-sol57-dot.ready{background:#91d5a0}.nx-sol57-ready-row div{flex:1}.nx-sol57-ready-row strong,.nx-sol57-ready-row small{display:block}.nx-sol57-ready-row small{margin-top:3px;color:#888}
    .nx-sol57-drawer{position:fixed;inset:0;z-index:2147482600;background:rgba(0,0,0,.62)}.nx-sol57-drawer-panel{height:100%;width:min(330px,88vw);padding:15px;background:#171717;color:#eee;overflow:auto;box-shadow:10px 0 34px rgba(0,0,0,.35)}.nx-sol57-drawer-brand{display:flex;align-items:center;gap:10px;padding:8px 4px 15px;border-bottom:1px solid #2c2c2c}.nx-sol57-mark{width:36px;height:36px;border-radius:12px;background:#eee;color:#111;display:grid;place-items:center;font-weight:900}.nx-sol57-drawer-brand div{flex:1}.nx-sol57-drawer-brand strong,.nx-sol57-drawer-brand small{display:block}.nx-sol57-drawer-brand small{color:#7f7f7f;margin-top:2px}.nx-sol57-drawer .nx-sol57-list-button{border-radius:10px;border-bottom:0;margin-top:3px;padding:0 8px}.nx-sol57-drawer .nx-sol57-list-button:active{background:#252525}
    .nx-sol57-plus-menu{position:absolute;left:10px;bottom:70px;width:min(310px,calc(100vw - 24px));padding:7px;border:1px solid #3b3b3b;border-radius:16px;background:#202020;box-shadow:0 18px 50px rgba(0,0,0,.45);z-index:15}.nx-sol57-plus-menu button{width:100%;min-height:48px;border:0;border-radius:10px;background:transparent;color:#eee;display:flex;align-items:center;gap:10px;text-align:left}.nx-sol57-plus-menu button:active{background:#2b2b2b}
    .nx-sol57-voice-back{position:fixed;inset:0;z-index:2147483000;background:#111;color:#eee;display:flex;flex-direction:column}.nx-sol57-voice-top{height:62px;display:flex;align-items:center;padding:0 14px;gap:10px}.nx-sol57-voice-top strong{flex:1;text-align:center}.nx-sol57-voice-stage{flex:1;display:grid;place-content:center;text-align:center;padding:24px}.nx-sol57-orb{width:148px;height:148px;margin:0 auto 24px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f3f3f3,#777 28%,#2a2a2a 60%,#111);box-shadow:0 0 0 18px rgba(255,255,255,.025),0 0 70px rgba(255,255,255,.08);transition:.2s}.nx-sol57-orb.listening{transform:scale(1.06);box-shadow:0 0 0 24px rgba(255,255,255,.04),0 0 90px rgba(255,255,255,.14)}.nx-sol57-orb.speaking{animation:nxSol57Pulse 1.1s ease-in-out infinite}.nx-sol57-voice-stage h2{margin:0 0 7px}.nx-sol57-voice-stage p{color:#8b8b8b;max-width:520px}.nx-sol57-voice-controls{height:92px;display:flex;justify-content:center;align-items:center;gap:18px}.nx-sol57-round{width:58px;height:58px;border:0;border-radius:50%;background:#292929;color:#fff;font-size:22px}.nx-sol57-round.primary{background:#eee;color:#111}.nx-sol57-round.danger{background:#4a2626}.nx-sol57-provider-badge{margin-top:14px;display:inline-block;border:1px solid #353535;border-radius:999px;padding:7px 10px;color:#9a9a9a;font-size:10px}
    .nx-sol57-video-job{padding:10px;border:1px solid #343434;border-radius:12px;margin:8px 0;background:#202020}.nx-sol57-video-job strong,.nx-sol57-video-job small{display:block}.nx-sol57-video-job small{margin-top:3px;color:#888}.nx-sol57-video-job video{width:100%;max-height:300px;border-radius:10px;background:#000;margin-top:8px}
    @keyframes nxSol57Pulse{50%{transform:scale(1.08);filter:brightness(1.2)}}
    @media(min-width:820px){.nx-sol57-root{min-height:720px}.nx-sol57-messages{padding-left:28px;padding-right:28px}.nx-sol57-backdrop{align-items:center;padding:20px}.nx-sol57-sheet{border-bottom:1px solid #373737;border-radius:26px}.nx-sol57-compose{max-width:820px;margin:auto}.nx-sol57-chips{max-width:820px;margin:auto}.nx-sol57-status{max-width:820px;margin:auto}}
  `;
  document.head.appendChild(style);
}

function responseGuidance(ui) {
  const intelligence = {
    max: 'Use maximum careful reasoning and verify assumptions before answering.',
    'extra-high': 'Use deep reasoning and check edge cases.',
    high: 'Use strong reasoning with concise explanation.',
    medium: 'Balance speed and reasoning.',
    light: 'Prioritize a short, direct answer.'
  }[ui.intelligence] || '';
  const speed = ui.speed === 'fast' ? 'Prefer a faster concise response when quality is not harmed.' : 'Use standard response pacing.';
  return `${PROFILE_LABELS[ui.model] || PROFILE_LABELS.sol}. ${intelligence} ${speed}`.trim();
}
function modeForGateway(mode) {
  if (mode === 'work') return 'dev';
  if (mode === 'research') return 'web';
  return 'chat';
}
function attachmentContext(files) {
  if (!files.length) return '';
  return files.map(file => `--- FILE: ${file.name} ---\n${file.text}`).join('\n\n').slice(0, 650_000);
}

function createFallbackEngine(root) {
  const shell = root.querySelector('.nx-ai-shell');
  const input = shell?.querySelector('[data-ai-input]');
  const send = shell?.querySelector('[data-ai-send]');
  const messages = shell?.querySelector('[data-ai-messages]');
  if (shell) {
    shell.setAttribute('aria-hidden', 'true');
    shell.style.display = 'none';
  }
  async function ask(text, ui) {
    if (!input || !send || !messages) throw new Error('Built-in AI fallback is unavailable.');
    const before = messages.querySelectorAll('.nx-ai-msg.bot').length;
    const prefix = `${responseGuidance(ui)}${ui.mode === 'research' ? ' Fresh web browsing is not available in this fallback; do not claim live/current research.' : ''}`;
    input.value = `${prefix}\n\nUser request:\n${String(text || '')}`;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return await new Promise((resolve, reject) => {
      let finished = false;
      const cleanup = () => { observer.disconnect(); clearTimeout(timer); };
      const check = () => {
        const bots = [...messages.querySelectorAll('.nx-ai-msg.bot')];
        if (bots.length <= before) return false;
        const value = String(bots.at(-1)?.querySelector('p')?.textContent || '').trim();
        if (!value) return false;
        finished = true; cleanup(); resolve(value); return true;
      };
      const observer = new MutationObserver(check);
      observer.observe(messages, { childList: true, subtree: true, characterData: true });
      const timer = setTimeout(() => {
        if (finished) return;
        cleanup(); reject(new Error('Built-in AI fallback timed out.'));
      }, 120_000);
      try { send.click(); } catch (error) { cleanup(); reject(error); }
      queueMicrotask(check);
    });
  }
  return { ask };
}

function gatewayChat(message, ui, history, files, controller) {
  const config = pairedConfig();
  if (!config) throw new Error('Local NOVA gateway is not paired.');
  const fileContext = attachmentContext(files);
  const appContext = [
    'NexusNova Fresh NOVA 5.7 Sol assistant.',
    `UI profile: ${PROFILE_LABELS[ui.model] || PROFILE_LABELS.sol}.`,
    `Speed: ${ui.speed}. Intelligence: ${ui.intelligence}. Mode: ${ui.mode}.`,
    'Do not fabricate tools, account values, live data, provider results or completed actions.',
    fileContext ? `Attached text/code context follows:\n${fileContext}` : 'No text/code attachments.'
  ].join('\n');
  return fetchWithTimeout(`${config.endpoint}/api/chat`, {
    method: 'POST',
    controller,
    headers: { 'Content-Type': 'application/json', 'X-NexusNova-Token': config.token },
    body: JSON.stringify({
      message,
      mode: modeForGateway(ui.mode),
      history: history.slice(-24).map(turn => ({ role: turn.role, content: turn.text })),
      app_context: appContext,
      nova_ui: { product: PROFILE_LABELS[ui.model] || PROFILE_LABELS.sol, speed: ui.speed, intelligence: ui.intelligence, mode: ui.mode },
      attachments: files.map(file => ({ name: file.name, type: file.type || 'text/plain', characters: file.text.length }))
    })
  }, CHAT_TIMEOUT_MS).then(async response => {
    const data = await safeJson(response);
    if (!response.ok || data?.ok === false) throw new Error(String(data?.error || data?.message || `Gateway HTTP ${response.status}`));
    const reply = String(data?.reply || '').trim();
    if (!reply) throw new Error('Local NOVA returned no text.');
    const model = String(data?.model || '').trim();
    if (model) saveConfig({ localObservedModel: model.slice(0, 160), localModelVerifiedAt: Date.now() });
    return { reply, model, provider: String(data?.provider || '').trim(), githubWrites: Boolean(data?.github_writes) };
  });
}

function makeSheet(title, subtitle = '') {
  document.querySelector('.nx-sol57-backdrop')?.remove();
  const back = document.createElement('div');
  back.className = 'nx-sol57-backdrop';
  back.innerHTML = `<section class="nx-sol57-sheet" role="dialog" aria-modal="true"><header class="nx-sol57-sheet-head"><div><strong>${esc(title)}</strong>${subtitle ? `<small>${esc(subtitle)}</small>` : ''}</div><button type="button" class="nx-sol57-icon" data-close>×</button></header><div class="nx-sol57-sheet-body" data-body></div></section>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector('[data-close]').addEventListener('click', close);
  back.addEventListener('click', event => { if (event.target === back) close(); });
  return { back, body: back.querySelector('[data-body]'), close };
}

function fileAllowed(file) {
  const name = String(file?.name || '').toLowerCase();
  const type = String(file?.type || '').toLowerCase();
  return type.startsWith('text/') || /\.(txt|md|markdown|js|mjs|cjs|ts|tsx|jsx|json|html|htm|css|scss|py|java|kt|kts|xml|yaml|yml|csv|sql|sh|ps1|bat|ini|log)$/i.test(name);
}

export function renderNovaSol57() {
  installStyle();
  const root = renderAI();
  const fallback = createFallbackEngine(root);
  const uiState = readUi();
  let thread = ensureThread(uiState);
  let files = [];
  let busy = false;
  let activeController = null;
  let plusMenu = null;
  let voiceSession = false;
  let voiceRecognition = null;
  let voiceAudio = null;
  let voiceSpeaking = false;
  let voiceListening = false;
  let voiceResumeTimer = 0;
  let videoPollTimer = 0;
  let hostScreen = null;

  const shell = document.createElement('section');
  shell.className = 'nx-sol57-root';
  shell.innerHTML = `
    <header class="nx-sol57-top">
      <button type="button" class="nx-sol57-icon" data-drawer aria-label="Menu">☰</button>
      <div class="nx-sol57-top__title"><strong>NOVA 5.7 Sol</strong><small data-subtitle>Smart assistant • checking backend…</small></div>
      <button type="button" class="nx-sol57-icon" data-live-voice aria-label="Live Voice">◉</button>
      <button type="button" class="nx-sol57-icon" data-new aria-label="New chat">＋</button>
    </header>
    <div class="nx-sol57-modes">
      <button type="button" class="nx-sol57-mode" data-mode="chat">CHAT</button>
      <button type="button" class="nx-sol57-mode" data-mode="work">WORK</button>
      <button type="button" class="nx-sol57-mode" data-mode="research">RESEARCH</button>
    </div>
    <div class="nx-sol57-main">
      <div class="nx-sol57-messages" data-messages></div>
      <div class="nx-sol57-composer-wrap">
        <div class="nx-sol57-chips">
          <button type="button" class="nx-sol57-chip" data-profile><strong>${esc(PROFILE_LABELS[uiState.model])}</strong> ▾</button>
          <button type="button" class="nx-sol57-chip" data-speed>Speed: <strong>${esc(uiState.speed === 'fast' ? 'Fast' : 'Standard')}</strong> ▾</button>
          <button type="button" class="nx-sol57-chip" data-intelligence>Intelligence: <strong>${esc(uiState.intelligence.replace('-', ' '))}</strong> ▾</button>
        </div>
        <div class="nx-sol57-compose">
          <div class="nx-sol57-attachments" data-attachments></div>
          <textarea rows="1" maxlength="12000" data-input placeholder="Message NOVA…"></textarea>
          <div class="nx-sol57-compose-actions">
            <button type="button" class="nx-sol57-plus" data-plus aria-label="Add">＋</button>
            <button type="button" class="nx-sol57-voice" data-mic aria-label="Live Voice">🎤</button>
            <button type="button" class="nx-sol57-send" data-send aria-label="Send">↑</button>
          </div>
        </div>
        <div class="nx-sol57-status" data-status>NOVA ready.</div>
      </div>
    </div>
  `;
  root.appendChild(shell);

  const messages = shell.querySelector('[data-messages]');
  const input = shell.querySelector('[data-input]');
  const sendButton = shell.querySelector('[data-send]');
  const status = shell.querySelector('[data-status]');
  const subtitle = shell.querySelector('[data-subtitle]');
  const attachmentsHost = shell.querySelector('[data-attachments]');

  const setStatus = text => { status.textContent = String(text || '').slice(0, 280); };
  const currentUi = () => readUi();
  const refreshTop = () => {
    const config = readConfig();
    const actual = String(config.localObservedModel || '').trim();
    const paired = pairedConfig();
    subtitle.textContent = paired ? `Paired local NOVA${actual ? ` • ${actual}` : ' • model unverified'}` : 'Built-in AI fallback • local gateway optional';
    const ui = currentUi();
    shell.querySelectorAll('[data-mode]').forEach(button => button.classList.toggle('active', button.dataset.mode === ui.mode));
    shell.querySelector('[data-profile]').innerHTML = `<strong>${esc(PROFILE_LABELS[ui.model])}</strong> ▾`;
    shell.querySelector('[data-speed]').innerHTML = `Speed: <strong>${esc(ui.speed === 'fast' ? 'Fast' : 'Standard')}</strong> ▾`;
    shell.querySelector('[data-intelligence]').innerHTML = `Intelligence: <strong>${esc(ui.intelligence.replace('-', ' '))}</strong> ▾`;
  };

  const addBubble = (turn, persist = false) => {
    const row = document.createElement('div');
    row.className = `nx-sol57-msg ${turn.role === 'user' ? 'user' : 'assistant'}`;
    const meta = turn.role === 'assistant' && turn.meta ? `<span class="nx-sol57-msg-meta">${esc(turn.meta)}</span>` : '';
    row.innerHTML = `<div class="nx-sol57-bubble"></div>`;
    row.querySelector('.nx-sol57-bubble').textContent = turn.text;
    if (meta) row.querySelector('.nx-sol57-bubble').insertAdjacentHTML('beforeend', meta);
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    if (persist) {
      thread.turns.push({ role: turn.role, text: turn.text, at: Date.now(), meta: turn.meta || '' });
      if (thread.title === 'New chat' && turn.role === 'user') thread.title = threadTitle(turn.text);
      thread = updateThread(thread);
    }
  };
  const drawThread = () => {
    messages.innerHTML = '';
    if (!thread.turns.length) {
      messages.innerHTML = `<div class="nx-sol57-welcome"><h2>How can I help?</h2><p>NOVA 5.7 Sol • Chat, Work, Research, Files, Live Voice and provider-ready Video Studio.</p></div>`;
      return;
    }
    thread.turns.forEach(turn => addBubble(turn, false));
  };
  const renderFiles = () => {
    attachmentsHost.innerHTML = files.map((file, index) => `<button type="button" class="nx-sol57-file" data-file-remove="${index}" title="Remove ${esc(file.name)}">${esc(file.name)} ×</button>`).join('');
    attachmentsHost.querySelectorAll('[data-file-remove]').forEach(button => button.addEventListener('click', () => {
      files.splice(Number(button.dataset.fileRemove), 1); renderFiles();
    }));
  };

  async function chooseFiles() {
    const picker = document.createElement('input');
    picker.type = 'file'; picker.multiple = true;
    picker.accept = '.txt,.md,.markdown,.js,.mjs,.cjs,.ts,.tsx,.jsx,.json,.html,.htm,.css,.scss,.py,.java,.kt,.kts,.xml,.yaml,.yml,.csv,.sql,.sh,.ps1,.bat,.ini,.log,text/*';
    picker.onchange = async () => {
      const selected = [...(picker.files || [])].slice(0, Math.max(0, MAX_FILES - files.length));
      let total = files.reduce((sum, file) => sum + file.bytes, 0);
      for (const file of selected) {
        if (!fileAllowed(file)) { setStatus(`${file.name}: unsupported text/code type.`); continue; }
        if (file.size > MAX_FILE_BYTES || total + file.size > MAX_FILES_TOTAL) { setStatus(`${file.name}: file/context limit exceeded.`); continue; }
        try {
          const text = await file.text();
          files.push({ name: file.name.slice(0, 120), type: file.type || 'text/plain', text: text.slice(0, 220_000), bytes: file.size });
          total += file.size;
        } catch { setStatus(`${file.name}: could not read file.`); }
      }
      renderFiles();
      if (files.length) setStatus(`${files.length} text/code file${files.length === 1 ? '' : 's'} ready for context.`);
    };
    picker.click();
  }

  async function sendMessage(forcedText = '', { fromVoice = false } = {}) {
    if (busy) return '';
    const text = String(forcedText || input.value || '').trim();
    if (!text) return '';
    const ui = currentUi();
    const prior = [...thread.turns];
    busy = true;
    sendButton.classList.add('stop'); sendButton.textContent = '■';
    input.value = '';
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    addBubble({ role: 'user', text }, true);
    setStatus(pairedConfig() ? 'Working with local NOVA…' : 'Using built-in AI fallback…');
    let reply = '';
    let meta = '';
    try {
      const config = pairedConfig();
      if (config) {
        activeController = new AbortController();
        try {
          const result = await gatewayChat(text, ui, prior, files, activeController);
          reply = result.reply;
          meta = [result.model || 'Local model', ui.mode === 'work' ? 'Work' : ui.mode === 'research' ? 'Research' : 'Chat'].filter(Boolean).join(' • ');
          setStatus(`${result.model || 'Local NOVA'} • ${ui.mode}${result.githubWrites ? ' • GitHub writes ON' : ''}`);
        } catch (error) {
          if (activeController?.signal?.aborted) throw error;
          setStatus(`Local gateway unavailable • built-in fallback: ${String(error?.message || error).slice(0, 100)}`);
          const fallbackText = files.length ? `${text}\n\nAttached text/code context:\n${attachmentContext(files)}` : text;
          reply = await fallback.ask(fallbackText, ui);
          meta = ui.mode === 'research' ? 'Built-in AI • no live browsing verified' : 'Built-in AI fallback';
        } finally { activeController = null; }
      } else {
        const fallbackText = files.length ? `${text}\n\nAttached text/code context:\n${attachmentContext(files)}` : text;
        reply = await fallback.ask(fallbackText, ui);
        meta = ui.mode === 'research' ? 'Built-in AI • no live browsing verified' : 'Built-in AI';
        setStatus(ui.mode === 'research' ? 'Built-in AI replied • fresh web research not verified without a capable gateway.' : 'Built-in AI replied.');
      }
      addBubble({ role: 'assistant', text: reply, meta }, true);
      files = []; renderFiles();
      if (fromVoice && voiceSession && readVoice().autoSpeak) await voiceSpeak(reply);
      return reply;
    } catch (error) {
      const stopped = /timed out or was stopped/i.test(String(error?.message || '')) && activeController?.signal?.aborted;
      if (!stopped) {
        const message = `NOVA could not complete that request: ${String(error?.message || error || 'Unknown error').slice(0, 220)}`;
        addBubble({ role: 'assistant', text: message, meta: 'No action completed' }, true);
        setStatus(message);
      } else setStatus('Stopped.');
      return '';
    } finally {
      busy = false; activeController = null;
      sendButton.classList.remove('stop'); sendButton.textContent = '↑';
    }
  }

  function stopRequest() {
    if (activeController) activeController.abort();
    busy = false; activeController = null;
    sendButton.classList.remove('stop'); sendButton.textContent = '↑';
    setStatus('Stop requested.');
  }

  function openChoice(title, options, value, onChoose) {
    const { body, close } = makeSheet(title);
    body.innerHTML = options.map(option => `<button type="button" class="nx-sol57-list-button" data-value="${esc(option.value)}"><span>${option.value === value ? '●' : '○'}</span><span><strong>${esc(option.label)}</strong>${option.note ? `<small>${esc(option.note)}</small>` : ''}</span></button>`).join('');
    body.querySelectorAll('[data-value]').forEach(button => button.addEventListener('click', () => {
      onChoose(button.dataset.value); close(); refreshTop();
    }));
  }

  function openSettings() {
    const config = readConfig();
    const { body } = makeSheet('NOVA Settings', 'Local gateway • secure pairing');
    body.innerHTML = `
      <p class="nx-sol57-note">Built-in AI remains available. Pair your PC gateway to use your own local Ollama model such as Qwen. Pairing tokens stay on this device; provider secrets should remain on the gateway/server.</p>
      <label class="nx-sol57-field"><span>Gateway HTTPS address</span><input type="url" data-endpoint value="${esc(config.endpoint || '')}" placeholder="https://your-secure-gateway.example"></label>
      <label class="nx-sol57-field"><span>Pairing token</span><input type="password" data-token value="${esc(config.token || '')}" placeholder="Pairing token"></label>
      <div class="nx-sol57-row"><button type="button" class="nx-sol57-btn primary" data-test>TEST & SAVE</button><button type="button" class="nx-sol57-btn" data-save>SAVE ONLY</button><button type="button" class="nx-sol57-btn" data-clear>CLEAR LOCAL LINK</button></div>
      <p class="nx-sol57-note" data-settings-status>${config.localObservedModel ? `Last observed model: ${esc(config.localObservedModel)}` : 'No local model verified yet.'}</p>`;
    const endpoint = body.querySelector('[data-endpoint]');
    const token = body.querySelector('[data-token]');
    const note = body.querySelector('[data-settings-status]');
    body.querySelector('[data-save]').addEventListener('click', () => {
      try {
        const ep = normalizeEndpoint(endpoint.value), tk = String(token.value || '').trim();
        if (!tk) throw new Error('Enter the pairing token first.');
        saveConfig({ endpoint: ep, token: tk, useGateway: true });
        note.textContent = 'Gateway saved. Use TEST & SAVE to verify a real model reply.'; refreshTop();
      } catch (error) { note.textContent = String(error?.message || error); }
    });
    body.querySelector('[data-test]').addEventListener('click', async event => {
      const button = event.currentTarget; if (button.disabled) return;
      button.disabled = true; button.textContent = 'TESTING…'; note.textContent = 'Checking health, token and real model reply…';
      try {
        const result = await runSecureGatewayTest(endpoint.value, token.value);
        note.textContent = `Connected • ${result.model} • real model reply OK • GitHub writes ${result.githubWrites ? 'ON' : 'OFF'}`; refreshTop();
      } catch (error) { note.textContent = `Connection failed: ${String(error?.message || error)}`; }
      finally { button.disabled = false; button.textContent = 'TEST & SAVE'; }
    });
    body.querySelector('[data-clear]').addEventListener('click', () => {
      saveConfig({ endpoint: '', token: '', useGateway: false, localObservedModel: '', localModelVerifiedAt: 0 });
      endpoint.value = ''; token.value = ''; note.textContent = 'Local link cleared. Built-in AI fallback remains available.'; refreshTop();
    });
  }

  function readinessRows() {
    const config = readConfig();
    const paired = pairedConfig();
    const speechIn = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    const speechOut = 'speechSynthesis' in window;
    return [
      { label: 'Internet', ready: navigator.onLine, detail: navigator.onLine ? 'Device reports online' : 'Offline' },
      { label: 'NOVA gateway', ready: Boolean(paired), detail: paired ? `Paired${config.localObservedModel ? ` • ${config.localObservedModel}` : ' • model not verified in this session'}` : 'Optional • pair in Settings for local Ollama' },
      { label: 'Built-in AI fallback', ready: true, detail: 'Firebase AI path is retained from the Fresh app' },
      { label: 'Files', ready: true, detail: `Text/code context • up to ${MAX_FILES} files` },
      { label: 'Live Voice', ready: speechIn && speechOut, detail: speechIn && speechOut ? 'System speech input + output detected' : 'Device/WebView speech support is partial; gateway voices may still work' },
      { label: 'Video Studio', ready: Boolean(paired), detail: paired ? 'Gateway paired; video provider is verified only by a real generation request' : 'Requires a video-capable gateway/provider' },
      { label: 'Research', ready: Boolean(paired), detail: paired ? 'Routes as web/research mode; fresh browsing still depends on backend tools' : 'Built-in fallback has no verified live browsing' },
      { label: 'OTA NOVA 5.7 Sol', ready: true, detail: 'Fresh-app OTA module loaded' }
    ];
  }

  function openSystemCheck() {
    const { body } = makeSheet('NOVA System Check', 'Real readiness • no fake capability claims');
    const draw = () => {
      body.innerHTML = `<div data-ready-list></div><div class="nx-sol57-row"><button class="nx-sol57-btn primary" data-health>TEST GATEWAY</button><button class="nx-sol57-btn" data-refresh>REFRESH</button><button class="nx-sol57-btn" data-settings>SETTINGS</button></div><p class="nx-sol57-note" data-check-status>Green means directly available/detected. Video and live research remain provider/backend dependent.</p>`;
      const list = body.querySelector('[data-ready-list]');
      readinessRows().forEach(row => {
        const item = document.createElement('div'); item.className = 'nx-sol57-ready-row';
        item.innerHTML = `<span class="nx-sol57-dot ${row.ready ? 'ready' : ''}"></span><div><strong>${esc(row.label)}</strong><small>${esc(row.detail)}</small></div>`;
        list.appendChild(item);
      });
      body.querySelector('[data-refresh]').addEventListener('click', draw);
      body.querySelector('[data-settings]').addEventListener('click', openSettings);
      body.querySelector('[data-health]').addEventListener('click', async () => {
        const note = body.querySelector('[data-check-status]'); note.textContent = 'Testing saved gateway…';
        try {
          const cfg = pairedConfig(); if (!cfg) throw new Error('Pair the gateway in Settings first.');
          const result = await runSecureGatewayTest(cfg.endpoint, cfg.token);
          note.textContent = `Verified • ${result.model} • real reply OK.`; refreshTop();
        } catch (error) { note.textContent = String(error?.message || error); }
      });
    };
    draw();
  }

  function openRecents(searchMode = false) {
    const { body, close } = makeSheet(searchMode ? 'Search chats' : 'Recent chats', searchMode ? 'Search device-local NOVA history' : 'Device-local conversation history');
    body.innerHTML = `${searchMode ? '<label class="nx-sol57-field"><span>Search</span><input data-search placeholder="Search chat text…"></label>' : ''}<div data-thread-list></div>`;
    const list = body.querySelector('[data-thread-list]');
    const draw = query => {
      const q = String(query || '').trim().toLowerCase();
      const items = readThreads().filter(item => !q || `${item.title} ${(item.turns || []).map(turn => turn.text).join(' ')}`.toLowerCase().includes(q));
      list.innerHTML = items.length ? items.map(item => `<button type="button" class="nx-sol57-list-button" data-thread="${esc(item.id)}"><span>◫</span><span><strong>${esc(item.title || 'Chat')}</strong><small>${new Date(item.updatedAt || 0).toLocaleString()}</small></span></button>`).join('') : '<p class="nx-sol57-note">No matching chats.</p>';
      list.querySelectorAll('[data-thread]').forEach(button => button.addEventListener('click', () => {
        const chosen = readThreads().find(item => item.id === button.dataset.thread); if (!chosen) return;
        thread = chosen; saveUi({ currentThreadId: chosen.id }); drawThread(); close();
      }));
    };
    if (searchMode) body.querySelector('[data-search]').addEventListener('input', event => draw(event.target.value));
    draw('');
  }

  function openDrawer() {
    document.querySelector('.nx-sol57-drawer')?.remove();
    const drawer = document.createElement('div'); drawer.className = 'nx-sol57-drawer';
    drawer.innerHTML = `<aside class="nx-sol57-drawer-panel"><div class="nx-sol57-drawer-brand"><span class="nx-sol57-mark">N</span><div><strong>NOVA 5.7 Sol</strong><small>NexusNova assistant</small></div><button type="button" class="nx-sol57-icon" data-close>×</button></div><nav data-nav></nav></aside>`;
    const nav = drawer.querySelector('[data-nav]');
    const actions = [
      ['＋', 'New chat', 'Start a clean conversation', () => { thread = newThread(); drawThread(); }],
      ['⌕', 'Search', 'Search local chat history', () => openRecents(true)],
      ['◫', 'Recents', 'Open a previous conversation', () => openRecents(false)],
      ['◉', 'Live Voice', 'Two-way voice conversation', () => openLiveVoice()],
      ['▣', 'Video Studio', 'Text/Image → Video provider-ready', () => openVideoStudio()],
      ['◇', 'System Check', 'Backend and feature readiness', () => openSystemCheck()],
      ['⚙', 'Settings', 'Local gateway and pairing', () => openSettings()]
    ];
    actions.forEach(([icon, label, note, action]) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'nx-sol57-list-button';
      button.innerHTML = `<span>${icon}</span><span><strong>${esc(label)}</strong><small>${esc(note)}</small></span>`;
      button.addEventListener('click', () => { drawer.remove(); action(); }); nav.appendChild(button);
    });
    drawer.querySelector('[data-close]').addEventListener('click', () => drawer.remove());
    drawer.addEventListener('click', event => { if (event.target === drawer) drawer.remove(); });
    document.body.appendChild(drawer);
  }

  function openPlusMenu() {
    plusMenu?.remove(); plusMenu = document.createElement('div'); plusMenu.className = 'nx-sol57-plus-menu';
    plusMenu.innerHTML = `<button type="button" data-files>📎 <span><strong>Files</strong><small>Attach text/code context</small></span></button><button type="button" data-video>▣ <span><strong>Create video</strong><small>Real provider-ready Video Studio</small></span></button><button type="button" data-check>◇ <span><strong>System Check</strong><small>See what is actually ready</small></span></button>`;
    shell.querySelector('.nx-sol57-compose').appendChild(plusMenu);
    plusMenu.querySelector('[data-files]').addEventListener('click', () => { plusMenu.remove(); plusMenu = null; chooseFiles(); });
    plusMenu.querySelector('[data-video]').addEventListener('click', () => { plusMenu.remove(); plusMenu = null; openVideoStudio(); });
    plusMenu.querySelector('[data-check]').addEventListener('click', () => { plusMenu.remove(); plusMenu = null; openSystemCheck(); });
  }

  function chooseSystemVoice(gender, language) {
    const voices = window.speechSynthesis?.getVoices?.() || [];
    if (!voices.length) return null;
    const lang = String(language || '').split('-')[0].toLowerCase();
    const female = /(female|zira|jenny|aria|sonia|samantha|ava|victoria|natasha|serena|hazel|susan|karen)/i;
    const male = /(male|david|mark|guy|daniel|george|ryan|james|thomas)/i;
    return [...voices].sort((a, b) => {
      const score = voice => {
        let n = String(voice.lang || '').toLowerCase().startsWith(lang) ? 4 : 0;
        if (gender === 'female' && female.test(voice.name)) n += 3;
        if (gender === 'male' && male.test(voice.name)) n += 3;
        if (gender === 'auto' && female.test(voice.name)) n += 1;
        if (/natural|neural|online/i.test(voice.name)) n += 2;
        return n;
      };
      return score(b) - score(a);
    })[0] || null;
  }
  function stopVoiceOutput() {
    voiceSpeaking = false;
    try { window.speechSynthesis?.cancel?.(); } catch {}
    try { voiceAudio?.pause?.(); } catch {}
    voiceAudio = null;
    syncVoiceUi();
  }
  function stopVoiceListening() {
    clearTimeout(voiceResumeTimer);
    try { voiceRecognition?.stop?.(); } catch {}
    voiceRecognition = null; voiceListening = false; syncVoiceUi();
  }
  function syncVoiceUi() {
    const orb = document.querySelector('[data-voice-orb]');
    const state = document.querySelector('[data-voice-state]');
    if (!orb) return;
    orb.classList.toggle('listening', voiceListening && !voiceSpeaking);
    orb.classList.toggle('speaking', voiceSpeaking);
    if (state) state.textContent = voiceSpeaking ? 'NOVA is speaking' : voiceListening ? 'Listening' : 'Voice paused';
  }
  async function gatewayVoiceSpeak(text, providerDef, voice) {
    const config = pairedConfig();
    if (!config) throw new Error('Pair the NOVA gateway first; provider secrets stay server-side.');
    const response = await fetchWithTimeout(`${config.endpoint}/api/voice/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NexusNova-Token': config.token },
      body: JSON.stringify({ provider: providerDef.provider, text: String(text || '').slice(0, 5000), language: voice.language, gender: voice.gender, quality: 'natural', format: 'mp3' })
    }, 60_000);
    if (!response.ok) {
      const data = await safeJson(response); throw new Error(String(data?.error || `Voice backend HTTP ${response.status}`));
    }
    const type = String(response.headers.get('content-type') || '');
    let src = '';
    if (type.includes('application/json')) {
      const data = await safeJson(response);
      if (data?.audio_url) src = data.audio_url;
      else if (data?.audio_base64) src = `data:audio/mpeg;base64,${data.audio_base64}`;
      else throw new Error(String(data?.error || 'Voice backend returned no audio.'));
    } else src = URL.createObjectURL(await response.blob());
    await new Promise((resolve, reject) => {
      voiceAudio = new Audio(src);
      voiceAudio.onended = resolve; voiceAudio.onerror = () => reject(new Error('Voice playback failed.'));
      voiceAudio.play().catch(reject);
    });
  }
  async function voiceSpeak(text) {
    if (!voiceSession || !text || !readVoice().autoSpeak) return;
    stopVoiceListening(); stopVoiceOutput(); voiceSpeaking = true; syncVoiceUi();
    const voice = readVoice(); const providerDef = VOICE_PROVIDERS[voice.provider] || VOICE_PROVIDERS['system-auto'];
    const voiceStatus = document.querySelector('[data-voice-status]');
    try {
      if (providerDef.kind === 'system') {
        if (!('speechSynthesis' in window)) throw new Error('System speech output is not supported here.');
        const selected = chooseSystemVoice(providerDef.gender === 'auto' ? voice.gender : providerDef.gender, voice.language);
        await new Promise(resolve => {
          const utterance = new SpeechSynthesisUtterance(String(text).slice(0, 5000));
          utterance.lang = voice.language; utterance.rate = voice.rate; utterance.pitch = 1;
          if (selected) utterance.voice = selected;
          utterance.onend = resolve; utterance.onerror = resolve;
          window.speechSynthesis.speak(utterance);
        });
      } else await gatewayVoiceSpeak(text, providerDef, voice);
      if (voiceStatus) voiceStatus.textContent = 'Ready for your reply.';
    } catch (error) { if (voiceStatus) voiceStatus.textContent = String(error?.message || error); }
    finally { voiceSpeaking = false; syncVoiceUi(); }
    if (voiceSession && voice.autoListen) voiceResumeTimer = setTimeout(startVoiceListening, 300);
  }
  function startVoiceListening() {
    if (!voiceSession || voiceListening) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const voiceStatus = document.querySelector('[data-voice-status]');
    if (!SpeechRecognition) { if (voiceStatus) voiceStatus.textContent = 'Speech recognition is not supported in this WebView. Voice output can still work.'; return; }
    stopVoiceOutput();
    try {
      const voice = readVoice();
      voiceRecognition = new SpeechRecognition(); voiceRecognition.lang = voice.language; voiceRecognition.interimResults = true; voiceRecognition.continuous = false;
      voiceRecognition.onstart = () => { voiceListening = true; syncVoiceUi(); if (voiceStatus) voiceStatus.textContent = 'Listening… speak naturally.'; };
      voiceRecognition.onresult = event => {
        let final = '', interim = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const text = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) final += text; else interim += text;
        }
        if (voiceStatus) voiceStatus.textContent = final ? `Heard: ${final}` : interim ? `Hearing: ${interim}` : 'Listening…';
        if (final.trim()) { stopVoiceListening(); sendMessage(final.trim(), { fromVoice: true }); }
      };
      voiceRecognition.onerror = event => { voiceListening = false; syncVoiceUi(); if (voiceStatus && !['aborted', 'no-speech'].includes(event.error)) voiceStatus.textContent = `Microphone: ${event.error || 'voice input error'}`; };
      voiceRecognition.onend = () => { voiceListening = false; syncVoiceUi(); if (voiceSession && voice.autoListen && !voiceSpeaking && !busy) voiceResumeTimer = setTimeout(startVoiceListening, 500); };
      voiceRecognition.start();
    } catch (error) { voiceListening = false; syncVoiceUi(); if (voiceStatus) voiceStatus.textContent = String(error?.message || error); }
  }
  function interruptVoice() {
    stopVoiceOutput(); stopVoiceListening();
    const voiceStatus = document.querySelector('[data-voice-status]'); if (voiceStatus) voiceStatus.textContent = 'Interrupted • ready for you.';
    if (voiceSession) setTimeout(startVoiceListening, 120);
  }
  function openVoiceSettings() {
    const voice = readVoice();
    const { body } = makeSheet('Live Voice Settings', 'FREE + PAID options');
    body.innerHTML = `
      <label class="nx-sol57-field"><span>Voice provider</span><select data-v-provider>${Object.entries(VOICE_PROVIDERS).map(([key, item]) => `<option value="${key}">${esc(item.label)} — ${item.tier}</option>`).join('')}</select></label>
      <label class="nx-sol57-field"><span>Voice style</span><select data-v-gender><option value="auto">Auto / best match</option><option value="female">Female</option><option value="male">Male</option></select></label>
      <label class="nx-sol57-field"><span>Language</span><select data-v-lang><option value="en-US">English / Roman Urdu</option><option value="ur-PK">Urdu</option><option value="hi-IN">Hindi</option><option value="en-GB">English (UK)</option></select></label>
      <label class="nx-sol57-field"><span>Speech rate</span><input data-v-rate type="range" min="0.75" max="1.2" step="0.05" value="${voice.rate}"></label>
      <label class="nx-sol57-list-button"><input data-v-listen type="checkbox" ${voice.autoListen ? 'checked' : ''}><span><strong>Continue listening automatically</strong></span></label>
      <label class="nx-sol57-list-button"><input data-v-speak type="checkbox" ${voice.autoSpeak ? 'checked' : ''}><span><strong>Speak NOVA replies automatically</strong></span></label>
      <p class="nx-sol57-note">FREE system voices use the device. FREE local Piper/Kokoro and PAID providers need the paired gateway. Provider API keys are never requested or stored in this page.</p>
      <button type="button" class="nx-sol57-btn primary" data-v-save>SAVE VOICE SETTINGS</button>`;
    body.querySelector('[data-v-provider]').value = voice.provider;
    body.querySelector('[data-v-gender]').value = voice.gender;
    body.querySelector('[data-v-lang]').value = voice.language;
    body.querySelector('[data-v-save]').addEventListener('click', () => {
      saveVoice({
        provider: body.querySelector('[data-v-provider]').value,
        gender: body.querySelector('[data-v-gender]').value,
        language: body.querySelector('[data-v-lang]').value,
        rate: Number(body.querySelector('[data-v-rate]').value),
        autoListen: body.querySelector('[data-v-listen]').checked,
        autoSpeak: body.querySelector('[data-v-speak]').checked
      });
      setStatus('Live Voice settings saved.');
    });
  }
  function closeLiveVoice() {
    voiceSession = false; stopVoiceListening(); stopVoiceOutput(); document.querySelector('.nx-sol57-voice-back')?.remove();
  }
  function openLiveVoice() {
    closeLiveVoice(); voiceSession = true;
    const voice = readVoice(); const provider = VOICE_PROVIDERS[voice.provider] || VOICE_PROVIDERS['system-auto'];
    const back = document.createElement('div'); back.className = 'nx-sol57-voice-back';
    back.innerHTML = `<header class="nx-sol57-voice-top"><button type="button" class="nx-sol57-icon" data-close>×</button><strong>NOVA Live Voice</strong><button type="button" class="nx-sol57-icon" data-settings>⚙</button></header><main class="nx-sol57-voice-stage"><div class="nx-sol57-orb" data-voice-orb></div><h2 data-voice-state>Voice paused</h2><p data-voice-status>Tap the microphone and speak naturally.</p><span class="nx-sol57-provider-badge">${esc(provider.label)} • ${provider.tier}${provider.kind === 'gateway' && !pairedConfig() ? ' • not configured' : ''}</span></main><footer class="nx-sol57-voice-controls"><button type="button" class="nx-sol57-round danger" data-interrupt>■</button><button type="button" class="nx-sol57-round primary" data-talk>🎤</button><button type="button" class="nx-sol57-round" data-voice-settings>☰</button></footer>`;
    document.body.appendChild(back); syncVoiceUi();
    back.querySelector('[data-close]').addEventListener('click', closeLiveVoice);
    back.querySelector('[data-settings]').addEventListener('click', openVoiceSettings);
    back.querySelector('[data-voice-settings]').addEventListener('click', openVoiceSettings);
    back.querySelector('[data-interrupt]').addEventListener('click', interruptVoice);
    back.querySelector('[data-talk]').addEventListener('click', () => voiceListening || voiceSpeaking ? interruptVoice() : startVoiceListening());
    const voiceStatus = back.querySelector('[data-voice-status]');
    if (provider.kind === 'gateway' && !pairedConfig()) voiceStatus.textContent = `${provider.label} selected, but the NOVA gateway is not paired. Choose a FREE system voice or configure Settings.`;
  }

  function videoJobs() {
    const value = readJson(VIDEO_JOBS_KEY, []); return Array.isArray(value) ? value.slice(0, 30) : [];
  }
  function saveVideoJobs(list) { writeJson(VIDEO_JOBS_KEY, (Array.isArray(list) ? list : []).slice(0, 30)); }
  function videoRemoteId(data) { return String(data?.job_id || data?.id || data?.job?.id || '').trim(); }
  function videoUrl(data) { return String(data?.video_url || data?.output_url || data?.url || data?.result?.video_url || data?.result?.url || '').trim(); }
  function videoStatus(data) { return String(data?.status || data?.job?.status || 'queued').toLowerCase(); }
  function videoTerminal(value) { return ['completed', 'complete', 'succeeded', 'success', 'failed', 'error', 'cancelled', 'canceled'].includes(String(value || '').toLowerCase()); }
  async function videoApi(path, options = {}) {
    const config = pairedConfig(); if (!config) throw new Error('Video backend is not configured in NOVA Settings.');
    const headers = { Accept: 'application/json', 'X-NexusNova-Token': config.token, ...(options.headers || {}) };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const response = await fetchWithTimeout(`${config.endpoint}${path}`, { ...options, headers }, VIDEO_TIMEOUT_MS);
    const data = await safeJson(response);
    if (!response.ok) throw new Error(String(data?.error || data?.message || `Video backend HTTP ${response.status}`));
    return data;
  }
  async function imageToDataUrl(file) {
    if (!file || !String(file.type || '').startsWith('image/')) throw new Error('Choose an image file.');
    if (file.size > 4 * 1024 * 1024) throw new Error('Image must be 4 MB or smaller.');
    return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.onerror = () => reject(new Error('Could not read image.')); reader.readAsDataURL(file); });
  }
  function drawVideoJobs(host) {
    const jobs = videoJobs(); host.innerHTML = jobs.length ? '' : '<p class="nx-sol57-note">No video jobs yet.</p>';
    jobs.forEach(job => {
      const item = document.createElement('div'); item.className = 'nx-sol57-video-job';
      item.innerHTML = `<strong>${esc(job.prompt || 'NOVA video')}</strong><small>${esc(job.mode === 'image-to-video' ? 'Image → Video' : 'Text → Video')} • ${esc(job.status || 'queued')}${job.model ? ` • ${esc(job.model)}` : ''}</small>${job.error ? `<small style="color:#e8a0a0">${esc(job.error)}</small>` : ''}`;
      if (job.url) { const video = document.createElement('video'); video.controls = true; video.preload = 'metadata'; video.src = job.url; item.appendChild(video); }
      host.appendChild(item);
    });
  }
  async function refreshVideoJobs(host) {
    const jobs = videoJobs(); let changed = false;
    for (const job of jobs.filter(item => item.remoteId && !videoTerminal(item.status)).slice(0, 5)) {
      try {
        const data = await videoApi(`/api/video/job/${encodeURIComponent(job.remoteId)}`, { method: 'GET' });
        Object.assign(job, { status: videoStatus(data), url: videoUrl(data) || job.url || '', model: String(data?.model || job.model || ''), provider: String(data?.provider || job.provider || ''), error: '' }); changed = true;
      } catch (error) { job.error = String(error?.message || error).slice(0, 180); changed = true; }
    }
    if (changed) saveVideoJobs(jobs); drawVideoJobs(host);
  }
  function openVideoStudio() {
    clearInterval(videoPollTimer);
    const { body, back } = makeSheet('NOVA Video Studio', 'Text → Video • Image → Video • real backend only');
    body.innerHTML = `<form data-video-form><label class="nx-sol57-field"><span>Mode</span><select name="mode"><option value="text-to-video">Text → Video</option><option value="image-to-video">Image → Video</option></select></label><label class="nx-sol57-field"><span>Prompt</span><textarea name="prompt" rows="5" maxlength="1800" placeholder="Describe scene, motion, camera and style…"></textarea></label><div class="nx-sol57-row"><label class="nx-sol57-field" style="flex:1"><span>Aspect</span><select name="aspect"><option>16:9</option><option>9:16</option><option>1:1</option></select></label><label class="nx-sol57-field" style="flex:1"><span>Seconds</span><input name="duration" type="number" min="2" max="20" value="6"></label><label class="nx-sol57-field" style="flex:1"><span>Quality</span><select name="quality"><option value="standard">Standard</option><option value="high">High</option></select></label></div><label class="nx-sol57-field"><span>Source image for Image → Video</span><input type="file" accept="image/*" data-video-image></label><div class="nx-sol57-row"><button type="submit" class="nx-sol57-btn primary">GENERATE VIDEO</button><button type="button" class="nx-sol57-btn" data-video-refresh>REFRESH JOBS</button><button type="button" class="nx-sol57-btn" data-video-settings>BACKEND SETTINGS</button></div><p class="nx-sol57-note" data-video-status>${pairedConfig() ? 'Gateway paired. Provider support is verified only by a real request.' : 'Video backend not configured. Pair a video-capable gateway in Settings.'}</p></form><hr style="border:0;border-top:1px solid #303030;margin:18px 0"><div data-video-jobs></div>`;
    const form = body.querySelector('[data-video-form]'); const jobsHost = body.querySelector('[data-video-jobs]'); const videoNote = body.querySelector('[data-video-status]');
    drawVideoJobs(jobsHost);
    form.addEventListener('submit', async event => {
      event.preventDefault(); const data = new FormData(form); const prompt = String(data.get('prompt') || '').trim(); const mode = String(data.get('mode') || 'text-to-video');
      if (!prompt) { videoNote.textContent = 'Write a video prompt first.'; return; }
      if (!pairedConfig()) { videoNote.textContent = 'Video backend is not configured. Pair a capable gateway first.'; return; }
      const local = { id: uid('video'), remoteId: '', prompt: prompt.slice(0, 1800), mode, aspect: String(data.get('aspect') || '16:9'), duration: Math.max(2, Math.min(20, Number(data.get('duration')) || 6)), quality: String(data.get('quality') || 'standard'), status: 'submitting', url: '', model: '', provider: '', error: '', at: Date.now() };
      saveVideoJobs([local, ...videoJobs()]); drawVideoJobs(jobsHost); videoNote.textContent = 'Submitting to the real video backend…';
      try {
        const payload = { mode, prompt: local.prompt, aspect_ratio: local.aspect, duration_seconds: local.duration, quality: local.quality, nova_client: { product: 'NOVA 5.7 Sol', surface: 'fresh-ota-video-v1' } };
        if (mode === 'image-to-video') payload.image = await imageToDataUrl(body.querySelector('[data-video-image]').files?.[0]);
        const result = await videoApi('/api/video/generate', { method: 'POST', body: JSON.stringify(payload) });
        const jobs = videoJobs(); const job = jobs.find(item => item.id === local.id); if (job) Object.assign(job, { remoteId: videoRemoteId(result), url: videoUrl(result), status: videoUrl(result) ? 'completed' : videoStatus(result), model: String(result?.model || ''), provider: String(result?.provider || '') }); saveVideoJobs(jobs);
        if (!videoUrl(result) && !videoRemoteId(result)) { if (job) { job.status = 'failed'; job.error = 'Backend returned no video URL or job ID.'; saveVideoJobs(jobs); } videoNote.textContent = 'Backend returned no video URL or job ID.'; }
        else videoNote.textContent = videoUrl(result) ? 'Video generated successfully.' : 'Video job submitted. Real status will be refreshed.';
      } catch (error) {
        const jobs = videoJobs(); const job = jobs.find(item => item.id === local.id); if (job) { job.status = 'failed'; job.error = String(error?.message || error).slice(0, 180); saveVideoJobs(jobs); } videoNote.textContent = `Video generation failed: ${String(error?.message || error)}`;
      }
      drawVideoJobs(jobsHost);
    });
    body.querySelector('[data-video-refresh]').addEventListener('click', () => refreshVideoJobs(jobsHost));
    body.querySelector('[data-video-settings]').addEventListener('click', openSettings);
    videoPollTimer = setInterval(() => { if (document.body.contains(back)) refreshVideoJobs(jobsHost); else clearInterval(videoPollTimer); }, 7000);
  }

  function startNewChat() { thread = newThread(); drawThread(); setStatus('New chat ready.'); }

  shell.querySelector('[data-drawer]').addEventListener('click', openDrawer);
  shell.querySelector('[data-new]').addEventListener('click', startNewChat);
  shell.querySelector('[data-live-voice]').addEventListener('click', openLiveVoice);
  shell.querySelector('[data-mic]').addEventListener('click', openLiveVoice);
  shell.querySelector('[data-plus]').addEventListener('click', openPlusMenu);
  sendButton.addEventListener('click', () => busy ? stopRequest() : sendMessage());
  input.addEventListener('input', () => {
    input.style.height = '42px'; input.style.height = `${Math.min(120, Math.max(42, input.scrollHeight))}px`;
    try { const value = input.value; if (value.trim()) localStorage.setItem(DRAFT_KEY, value.slice(0, 12000)); else localStorage.removeItem(DRAFT_KEY); } catch {}
  });
  input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); sendMessage(); } });
  shell.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => { saveUi({ mode: button.dataset.mode }); refreshTop(); setStatus(`${button.dataset.mode} mode ready.`); }));
  shell.querySelector('[data-profile]').addEventListener('click', () => openChoice('NOVA Profile', Object.entries(PROFILE_LABELS).map(([value, label]) => ({ value, label, note: 'NexusNova response profile; actual backend model is shown separately.' })), currentUi().model, value => saveUi({ model: value })));
  shell.querySelector('[data-speed]').addEventListener('click', () => openChoice('Response Speed', [{ value: 'standard', label: 'Standard' }, { value: 'fast', label: 'Fast' }], currentUi().speed, value => saveUi({ speed: value })));
  shell.querySelector('[data-intelligence]').addEventListener('click', () => openChoice('Intelligence', [{ value: 'max', label: 'Max' }, { value: 'extra-high', label: 'Extra High' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'light', label: 'Light' }], currentUi().intelligence, value => saveUi({ intelligence: value })));

  try {
    const draft = localStorage.getItem(DRAFT_KEY) || '';
    if (draft && !input.value) { input.value = draft.slice(0, 12000); input.dispatchEvent(new Event('input')); setStatus('Draft restored.'); }
  } catch {}

  drawThread(); refreshTop();
  queueMicrotask(() => {
    hostScreen = root.closest('.nx-screen');
    if (hostScreen) hostScreen.classList.add('nx-sol57-host');
  });
  setTimeout(() => { hostScreen = root.closest('.nx-screen'); if (hostScreen) hostScreen.classList.add('nx-sol57-host'); }, 0);
  if (pairedConfig() && navigator.onLine) gatewayHealth().then(refreshTop).catch(() => refreshTop());

  const keyHandler = event => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = String(event.key || '').toLowerCase();
    if (key === 'k') { event.preventDefault(); openRecents(true); }
    else if (key === 'n' && event.shiftKey) { event.preventDefault(); startNewChat(); }
    else if (key === 's' && event.shiftKey) { event.preventDefault(); openSystemCheck(); }
    else if (key === ',' && !event.shiftKey) { event.preventDefault(); openSettings(); }
  };
  document.addEventListener('keydown', keyHandler, true);

  root.__cleanup = () => {
    document.removeEventListener('keydown', keyHandler, true);
    hostScreen?.classList.remove('nx-sol57-host');
    plusMenu?.remove(); document.querySelector('.nx-sol57-drawer')?.remove(); document.querySelector('.nx-sol57-backdrop')?.remove();
    closeLiveVoice(); clearInterval(videoPollTimer); if (activeController) activeController.abort();
  };
  return root;
}

export const novaSol57Renderers = Object.freeze({ ai: renderNovaSol57 });
