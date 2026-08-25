const MINI_APP_URL = "https://nexusnovatools.com/";
const CHANNEL_URL = "https://t.me/NexusNovaTools";
const SUPPORT_URL = "https://nexusnovatools.com/contact.html";
const ALLOWED_ORIGIN = "https://nexusnovatools.com";
const FIREBASE_PROJECT_ID = "nexusnova-6ade2";
const FIREBASE_API_KEY = "AIzaSyBU75WYp5ioaMD1LrNcDyAvROFW2wrTil0";
const FIRESTORE_DATABASE = `projects/${FIREBASE_PROJECT_ID}/databases/(default)`;
const FIRESTORE_DOCUMENTS = `${FIRESTORE_DATABASE}/documents`;
const FIRESTORE_API = `https://firestore.googleapis.com/v1/${FIRESTORE_DATABASE}`;
const MAX_TELEGRAM_AGE_SECONDS = 10 * 60;
const MAX_RECENT_AUTH_SECONDS = 15 * 60;
let googleTokenCache = null;
let signingKeyCache = null;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const token = env.TELEGRAM_BOT_TOKEN;
    const telegramApiPath = url.pathname.startsWith("/api/telegram/");

    if (!token) {
      const response = json({ ok: false, code: "failed-precondition", error: "Telegram service is not configured." }, 500);
      return telegramApiPath ? withCors(request, response) : response;
    }

    try {
      if (telegramApiPath && request.method === "OPTIONS") {
        assertAllowedOrigin(request);
        return withCors(request, new Response(null, { status: 204 }));
      }

      if (request.method === "POST" && url.pathname === "/api/telegram/session") {
        assertAllowedOrigin(request);
        return withCors(request, await telegramAccountSession(request, env));
      }

      if (request.method === "POST" && url.pathname === "/api/telegram/link") {
        assertAllowedOrigin(request);
        return withCors(request, await linkTelegramAccount(request, env));
      }

      if (request.method === "GET" && url.pathname === "/setup") {
        return setupBot(token, url.origin);
      }

      if (request.method === "GET" && url.pathname === "/status") {
        return botStatus(token);
      }

      if (request.method === "POST" && url.pathname === "/webhook") {
        return handleWebhook(request, token);
      }

      if (request.method === "GET" && url.pathname === "/") {
        return new Response("NexusNova Telegram Bot is online ✅");
      }

      return new Response("Not found", { status: 404 });
    } catch (error) {
      console.error("NexusNova Worker error:", safeError(error));
      const response = error instanceof ApiError
        ? json({ ok: false, code: error.code, error: error.publicMessage }, error.status)
        : json({ ok: false, code: "internal", error: "Telegram request failed" }, 502);
      return telegramApiPath ? withCors(request, response) : response;
    }
  }
};

async function setupBot(token, origin) {
  const secretToken = await webhookSecret(token);
  const bot = await telegram(token, "getMe", {});
  const webhook = await telegram(token, "setWebhook", {
    url: `${origin}/webhook`,
    allowed_updates: ["message"],
    secret_token: secretToken
  });
  const commands = await telegram(token, "setMyCommands", {
    commands: [
      { command: "start", description: "Start NexusNova Assistant" },
      { command: "help", description: "Get help and support" },
      { command: "tools", description: "Explore NexusNova tools" },
      { command: "website", description: "Open NexusNova website" },
      { command: "news", description: "Latest NexusNova updates" },
      { command: "support", description: "Contact NexusNova support" }
    ]
  });
  const menuButton = await telegram(token, "setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "🚀 Open NexusNova Tools",
      web_app: { url: MINI_APP_URL }
    }
  });
  const webhookInfo = await telegram(token, "getWebhookInfo", {});

  return json({ ok: true, bot, webhook, commands, menuButton, webhookInfo });
}

async function botStatus(token) {
  const [bot, webhookInfo, commands] = await Promise.all([
    telegram(token, "getMe", {}),
    telegram(token, "getWebhookInfo", {}),
    telegram(token, "getMyCommands", {})
  ]);

  return json({ ok: true, bot, webhookInfo, commands });
}

async function handleWebhook(request, token) {
  const expectedSecret = await webhookSecret(token);
  const receivedSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";

  if (receivedSecret !== expectedSecret) {
    return new Response("Forbidden", { status: 403 });
  }

  const update = await request.json();
  if (update.message?.chat?.id) await handleMessage(token, update.message);
  return new Response("OK");
}

async function handleMessage(token, message) {
  const chatId = message.chat.id;
  const firstName = message.from?.first_name || "there";
  const rawText = message.text || "";
  const command = rawText.trim().split(/\s+/)[0].split("@")[0].toLowerCase();
  const privateChat = message.chat?.type === "private";

  if (command === "/start") return sendWelcome(token, chatId, firstName, privateChat);

  if (command === "/help") {
    return sendMessage(token, chatId,
      `🆘 <b>NexusNova Help</b>\n\n/start - Start NexusNova Assistant\n/tools - Explore NexusNova tools\n/website - Open the official website\n/news - Latest NexusNova updates\n/support - Get support\n/help - Show this help message\n\n🌐 nexusnovatools.com`,
      mainKeyboard(privateChat));
  }

  if (command === "/tools") {
    return sendMessage(token, chatId,
      `🛠 <b>NexusNova Tools</b>\n\nFree browser tools for PDF, images, AI, gaming, calculators, productivity and more.\n\nTap the button below to explore.`,
      { inline_keyboard: [
        [miniAppButton("🛠 Open NexusNova Tools", MINI_APP_URL, privateChat)],
        [miniAppButton("🔥 Trending Tools", `${MINI_APP_URL}trending-tools.html`, privateChat)]
      ] });
  }

  if (command === "/website") {
    return sendMessage(token, chatId,
      `🌐 <b>NexusNova Official Website</b>\n\n${MINI_APP_URL}`,
      { inline_keyboard: [[miniAppButton("🚀 Open Mini App", MINI_APP_URL, privateChat)]] });
  }

  if (command === "/news") {
    return sendMessage(token, chatId,
      `📰 <b>NexusNova Updates</b>\n\nRead the latest tools, guides and technology updates inside NexusNova.`,
      { inline_keyboard: [[miniAppButton("📰 Open Latest Updates", `${MINI_APP_URL}articles.html`, privateChat)]] });
  }

  if (command === "/support") {
    return sendMessage(token, chatId,
      `💬 <b>NexusNova Support</b>\n\nFor help, questions or reporting a problem, use our official support page or Telegram channel.\n\n⚠️ Never send passwords, API tokens or private keys.`,
      { inline_keyboard: [
        [{ text: "🆘 Contact Support", url: SUPPORT_URL }],
        [{ text: "📢 NexusNova Channel", url: CHANNEL_URL }]
      ] });
  }

  return sendMessage(token, chatId,
    `👋 Welcome to <b>NexusNova AI Assistant</b>.\n\nChoose a command from the menu or tap a button below.`,
    mainKeyboard(privateChat));
}

async function sendWelcome(token, chatId, firstName, privateChat) {
  const caption = `🚀 <b>Welcome to NexusNova, ${escapeHtml(firstName)}!</b>\n\nYour official NexusNova assistant for free online tools, updates and support.\n\n🛠 Explore useful tools\n🔥 Discover trending utilities\n🌐 Visit NexusNova Tools\n💬 Get official support\n\nChoose an option below 👇`;

  try {
    const me = await telegram(token, "getMe", {});
    const photos = await telegram(token, "getUserProfilePhotos", {
      user_id: me.result.id,
      limit: 1
    });
    const firstPhoto = photos.result?.photos?.[0];

    if (firstPhoto?.length) {
      const photo = firstPhoto[firstPhoto.length - 1].file_id;
      return await telegram(token, "sendPhoto", {
        chat_id: chatId,
        photo,
        caption,
        parse_mode: "HTML",
        reply_markup: mainKeyboard(privateChat)
      });
    }
  } catch (error) {
    console.error("Welcome photo fallback:", safeError(error));
  }

  return sendMessage(token, chatId, caption, mainKeyboard(privateChat));
}

function miniAppButton(text, url, privateChat) {
  return privateChat ? { text, web_app: { url } } : { text, url };
}

function mainKeyboard(privateChat = true) {
  return {
    inline_keyboard: [
      [miniAppButton("🚀 Open NexusNova Mini App", MINI_APP_URL, privateChat)],
      [
        miniAppButton("📰 Updates", `${MINI_APP_URL}articles.html`, privateChat),
        { text: "📢 Telegram", url: CHANNEL_URL }
      ],
      [{ text: "💬 Support", url: SUPPORT_URL }]
    ]
  };
}

async function sendMessage(token, chatId, text, keyboard = null) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true }
  };

  if (keyboard) body.reply_markup = keyboard;
  return telegram(token, "sendMessage", body);
}

async function telegram(token, method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(`Telegram ${method} failed: ${result.description || response.status}`);
  }
  return result;
}

async function webhookSecret(token) {
  const bytes = new TextEncoder().encode(`NexusNova:${token}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

class ApiError extends Error {
  constructor(status, code, publicMessage, detail = publicMessage) {
    super(detail);
    this.status = status;
    this.code = code;
    this.publicMessage = publicMessage;
  }
}

function assertAllowedOrigin(request) {
  if (request.headers.get("Origin") !== ALLOWED_ORIGIN) {
    throw new ApiError(403, "permission-denied", "This request origin is not allowed.");
  }
}

function withCors(request, response) {
  const headers = new Headers(response.headers);
  if (request.headers.get("Origin") === ALLOWED_ORIGIN) {
    headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    headers.set("Access-Control-Max-Age", "600");
    headers.set("Vary", "Origin");
  }
  return new Response(response.body, { status: response.status, headers });
}

async function readApiBody(request) {
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > 12_000) {
    throw new ApiError(413, "invalid-argument", "Request is too large.");
  }
  const text = await request.text();
  if (text.length > 12_000) {
    throw new ApiError(413, "invalid-argument", "Request is too large.");
  }
  try {
    return JSON.parse(text || "{}");
  } catch (_) {
    throw new ApiError(400, "invalid-argument", "Request body is invalid.");
  }
}

async function telegramAccountSession(request, env) {
  const body = await readApiBody(request);
  const verified = await verifyTelegramInitData(body.initData, env.TELEGRAM_BOT_TOKEN);
  const telegramUser = verified.user;
  const credentials = serviceAccount(env);
  const accessToken = await googleAccessToken(credentials);
  const identity = await firestoreGet(accessToken, "telegramIdentities", telegramUser.id);

  if (!identity) {
    return json({ ok: true, linked: false, user: telegramUser });
  }

  const uid = firestoreString(identity, "uid");
  assertFirebaseUid(uid);
  const [reverse, profile] = await Promise.all([
    firestoreGet(accessToken, "telegramUserLinks", uid),
    firestoreGet(accessToken, "users", uid)
  ]);
  const reverseTelegramId = reverse ? firestoreString(reverse, "telegramId") : "";
  if (reverseTelegramId && reverseTelegramId !== telegramUser.id) {
    throw new ApiError(409, "failed-precondition", "Telegram account mapping needs repair.");
  }
  if (!profile) {
    throw new ApiError(404, "not-found", "Linked NexusNova profile no longer exists.");
  }

  const now = new Date().toISOString();
  const linkedAt = firestoreTimestamp(identity, "linkedAt") || now;
  await firestoreCommit(accessToken, telegramLinkWrites({
    telegramUser,
    uid,
    authDate: verified.authDate,
    linkedAt,
    updatedAt: now
  }));

  const customToken = await createFirebaseCustomToken(credentials, uid, telegramUser.id);
  return json({ ok: true, linked: true, customToken, user: telegramUser });
}

async function linkTelegramAccount(request, env) {
  const body = await readApiBody(request);
  const firebaseUser = await verifyFirebaseIdToken(request.headers.get("Authorization"));
  const verified = await verifyTelegramInitData(body.initData, env.TELEGRAM_BOT_TOKEN);
  const telegramUser = verified.user;
  const uid = firebaseUser.uid;
  const credentials = serviceAccount(env);
  const accessToken = await googleAccessToken(credentials);
  const transaction = await firestoreBeginTransaction(accessToken);
  let transactionOpen = true;

  try {
    const names = [
      firestoreDocumentName("telegramIdentities", telegramUser.id),
      firestoreDocumentName("telegramUserLinks", uid),
      firestoreDocumentName("users", uid)
    ];
    const documents = await firestoreBatchGet(accessToken, names, transaction);
    const identity = documents.get(names[0]) || null;
    const reverse = documents.get(names[1]) || null;
    const profile = documents.get(names[2]) || null;

    if (!profile) {
      throw new ApiError(404, "not-found", "NexusNova profile not found.");
    }

    const identityUid = identity ? firestoreString(identity, "uid") : "";
    const accountTelegramId = reverse ? firestoreString(reverse, "telegramId") : "";
    if (identityUid && identityUid !== uid) {
      throw new ApiError(409, "already-exists", "This Telegram account is already linked to another NexusNova account.");
    }
    if (accountTelegramId && accountTelegramId !== telegramUser.id) {
      throw new ApiError(409, "already-exists", "This NexusNova account is already linked to another Telegram account.");
    }

    const now = new Date().toISOString();
    const linkedAt = (identity && firestoreTimestamp(identity, "linkedAt")) ||
      (reverse && firestoreTimestamp(reverse, "linkedAt")) || now;
    await firestoreCommit(accessToken, telegramLinkWrites({
      telegramUser,
      uid,
      authDate: verified.authDate,
      linkedAt,
      updatedAt: now
    }), transaction);
    transactionOpen = false;

    return json({
      ok: true,
      linked: true,
      idempotent: identityUid === uid && accountTelegramId === telegramUser.id,
      user: telegramUser
    });
  } catch (error) {
    if (transactionOpen) await firestoreRollback(accessToken, transaction);
    throw error;
  }
}

async function verifyFirebaseIdToken(authorization) {
  const match = /^Bearer\s+([^\s]+)$/i.exec(String(authorization || ""));
  if (!match || match[1].length > 10_000) {
    throw new ApiError(401, "unauthenticated", "Sign in to NexusNova first.");
  }
  const idToken = match[1];
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });
  const result = await response.json().catch(() => ({}));
  const user = result.users?.[0];
  if (!response.ok || !user?.localId) {
    throw new ApiError(401, "unauthenticated", "Firebase session is invalid.");
  }

  const payload = decodeJwtPayload(idToken);
  const uid = String(user.localId);
  assertFirebaseUid(uid);
  if (payload.sub !== uid || payload.aud !== FIREBASE_PROJECT_ID ||
      payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) {
    throw new ApiError(401, "unauthenticated", "Firebase session is invalid.");
  }
  const now = Math.floor(Date.now() / 1000);
  const authTime = Number(payload.auth_time || 0);
  if (!authTime || now - authTime > MAX_RECENT_AUTH_SECONDS || authTime - now > 30) {
    throw new ApiError(412, "failed-precondition", "Sign in again before linking Telegram.");
  }
  return { uid, authTime };
}

function decodeJwtPayload(token) {
  try {
    const encoded = token.split(".")[1];
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), char => char.charCodeAt(0))));
  } catch (_) {
    throw new ApiError(401, "unauthenticated", "Firebase session is invalid.");
  }
}

async function verifyTelegramInitData(rawInitData, botToken) {
  const raw = String(rawInitData || "");
  if (!botToken || !raw || raw.length > 8192) {
    throw new ApiError(403, "permission-denied", "Telegram session could not be verified.");
  }

  const params = new URLSearchParams(raw);
  const seen = new Set();
  for (const [key] of params.entries()) {
    if (seen.has(key)) throw new ApiError(403, "permission-denied", "Telegram session could not be verified.");
    seen.add(key);
  }
  const receivedHash = params.get("hash") || "";
  if (!/^[a-f0-9]{64}$/i.test(receivedHash)) {
    throw new ApiError(403, "permission-denied", "Telegram session could not be verified.");
  }

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = await hmacSha256(new TextEncoder().encode("WebAppData"), new TextEncoder().encode(botToken));
  const calculatedHash = await hmacSha256(secretKey, new TextEncoder().encode(dataCheckString));
  const receivedBytes = hexToBytes(receivedHash);
  if (!constantTimeEqual(calculatedHash, receivedBytes)) {
    throw new ApiError(403, "permission-denied", "Telegram session could not be verified.");
  }

  const authDate = Number(params.get("auth_date"));
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isInteger(authDate) || now - authDate > MAX_TELEGRAM_AGE_SECONDS || authDate - now > 30) {
    throw new ApiError(403, "permission-denied", "Telegram verification expired. Reopen the Mini App.");
  }

  let rawUser;
  try {
    rawUser = JSON.parse(params.get("user") || "null");
  } catch (_) {
    throw new ApiError(403, "permission-denied", "Telegram session could not be verified.");
  }
  return { authDate, user: normalizeTelegramUser(rawUser) };
}

function normalizeTelegramUser(rawUser) {
  const id = String(rawUser?.id || "");
  const firstName = cleanText(rawUser?.first_name, 128);
  if (!/^[1-9]\d{0,19}$/.test(id) || !firstName) {
    throw new ApiError(403, "permission-denied", "Telegram user data is invalid.");
  }
  const usernameCandidate = String(rawUser?.username || "").trim();
  const username = /^[A-Za-z0-9_]{1,64}$/.test(usernameCandidate) ? usernameCandidate : "";
  let photoUrl = "";
  try {
    const parsed = new URL(String(rawUser?.photo_url || ""));
    if (parsed.protocol === "https:" && parsed.href.length <= 2048) photoUrl = parsed.href;
  } catch (_) {}

  return {
    id,
    username,
    firstName,
    lastName: cleanText(rawUser?.last_name, 128),
    photoUrl,
    languageCode: cleanText(rawUser?.language_code, 16),
    isPremium: rawUser?.is_premium === true,
    allowsWriteToPm: rawUser?.allows_write_to_pm === true
  };
}

function cleanText(value, maxLength) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

async function hmacSha256(keyBytes, dataBytes) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, dataBytes));
}

function hexToBytes(hex) {
  return Uint8Array.from(hex.match(/.{2}/g) || [], value => Number.parseInt(value, 16));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left[index] ^ right[index];
  return mismatch === 0;
}

function serviceAccount(env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new ApiError(503, "failed-precondition", "Telegram account linking is not configured yet.");
  }
  let credentials;
  try {
    credentials = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch (_) {
    throw new ApiError(503, "failed-precondition", "Telegram account linking is not configured yet.");
  }
  if (credentials.project_id !== FIREBASE_PROJECT_ID || !credentials.client_email ||
      !credentials.private_key || !credentials.private_key_id) {
    throw new ApiError(503, "failed-precondition", "Telegram account linking is not configured yet.");
  }
  return credentials;
}

async function googleAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  if (googleTokenCache?.keyId === credentials.private_key_id && googleTokenCache.expiresAt > now + 60) {
    return googleTokenCache.token;
  }
  const assertion = await signJwt(credentials, {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  });
  const form = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString()
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) {
    throw new ApiError(502, "unavailable", "Firebase backend authentication failed.", `Google OAuth failed: ${result.error || response.status}`);
  }
  googleTokenCache = {
    keyId: credentials.private_key_id,
    token: result.access_token,
    expiresAt: now + Number(result.expires_in || 3600) - 120
  };
  return googleTokenCache.token;
}

async function createFirebaseCustomToken(credentials, uid, telegramId) {
  const now = Math.floor(Date.now() / 1000);
  return signJwt(credentials, {
    iss: credentials.client_email,
    sub: credentials.client_email,
    aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
    iat: now,
    exp: now + 3600,
    uid,
    claims: { telegram: true, telegram_id: telegramId }
  });
}

async function signJwt(credentials, claims) {
  const header = { alg: "RS256", typ: "JWT", kid: credentials.private_key_id };
  const unsigned = `${base64UrlJson(header)}.${base64UrlJson(claims)}`;
  const key = await signingKey(credentials);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64UrlBytes(new Uint8Array(signature))}`;
}

async function signingKey(credentials) {
  if (signingKeyCache?.keyId === credentials.private_key_id) return signingKeyCache.key;
  const pem = credentials.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const keyBytes = Uint8Array.from(atob(pem), char => char.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  signingKeyCache = { keyId: credentials.private_key_id, key };
  return key;
}

function base64UrlJson(value) {
  return base64UrlBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function base64UrlBytes(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function assertFirebaseUid(uid) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(String(uid || ""))) {
    throw new ApiError(409, "failed-precondition", "NexusNova account mapping is invalid.");
  }
}

function firestoreDocumentName(collection, id) {
  return `${FIRESTORE_DOCUMENTS}/${collection}/${id}`;
}

async function firestoreGet(accessToken, collection, id) {
  const url = `${FIRESTORE_API}/documents/${collection}/${encodeURIComponent(id)}`;
  return firestoreJson(url, { accessToken, allowNotFound: true });
}

async function firestoreBeginTransaction(accessToken) {
  const result = await firestoreJson(`${FIRESTORE_API}/documents:beginTransaction`, {
    accessToken,
    method: "POST",
    body: { options: { readWrite: {} } }
  });
  if (!result.transaction) throw new ApiError(502, "unavailable", "Firebase transaction could not start.");
  return result.transaction;
}

async function firestoreBatchGet(accessToken, names, transaction) {
  const rows = await firestoreJson(`${FIRESTORE_API}/documents:batchGet`, {
    accessToken,
    method: "POST",
    body: { documents: names, transaction }
  });
  const documents = new Map(names.map(name => [name, null]));
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row.found?.name) documents.set(row.found.name, row.found);
    if (row.missing) documents.set(row.missing, null);
  }
  return documents;
}

async function firestoreCommit(accessToken, writes, transaction = "") {
  const body = { writes };
  if (transaction) body.transaction = transaction;
  return firestoreJson(`${FIRESTORE_API}/documents:commit`, {
    accessToken,
    method: "POST",
    body
  });
}

async function firestoreRollback(accessToken, transaction) {
  try {
    await firestoreJson(`${FIRESTORE_API}/documents:rollback`, {
      accessToken,
      method: "POST",
      body: { transaction }
    });
  } catch (_) {}
}

async function firestoreJson(url, { accessToken, method = "GET", body = null, allowNotFound = false }) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (allowNotFound && response.status === 404) return null;
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const conflict = response.status === 409 || result.error?.status === "ABORTED";
    throw new ApiError(
      conflict ? 409 : 502,
      conflict ? "aborted" : "unavailable",
      conflict ? "Account linking changed during this request. Please retry." : "Firebase profile service is unavailable.",
      `Firestore ${response.status}: ${result.error?.status || "request-failed"}`
    );
  }
  return result;
}

function telegramLinkWrites({ telegramUser, uid, authDate, linkedAt, updatedAt }) {
  const identityFields = {
    ...telegramFirestoreFields(telegramUser),
    uid: fsString(uid),
    authDate: fsInteger(authDate),
    linkedAt: fsTimestamp(linkedAt),
    updatedAt: fsTimestamp(updatedAt)
  };
  const reverseFields = {
    uid: fsString(uid),
    telegramId: fsString(telegramUser.id),
    linkedAt: fsTimestamp(linkedAt),
    updatedAt: fsTimestamp(updatedAt)
  };
  const profileTelegramFields = {
    ...telegramFirestoreFields(telegramUser),
    linked: fsBoolean(true),
    linkedAt: fsTimestamp(linkedAt),
    updatedAt: fsTimestamp(updatedAt)
  };
  return [
    firestoreUpdate(firestoreDocumentName("telegramIdentities", telegramUser.id), identityFields),
    firestoreUpdate(firestoreDocumentName("telegramUserLinks", uid), reverseFields),
    firestoreUpdate(firestoreDocumentName("users", uid), {
      telegram: { mapValue: { fields: profileTelegramFields } }
    })
  ];
}

function telegramFirestoreFields(user) {
  return {
    id: fsString(user.id),
    username: fsString(user.username),
    firstName: fsString(user.firstName),
    lastName: fsString(user.lastName),
    photoUrl: fsString(user.photoUrl),
    languageCode: fsString(user.languageCode),
    isPremium: fsBoolean(user.isPremium),
    allowsWriteToPm: fsBoolean(user.allowsWriteToPm)
  };
}

function firestoreUpdate(name, fields) {
  return {
    update: { name, fields },
    updateMask: { fieldPaths: Object.keys(fields) }
  };
}

function firestoreString(document, field) {
  return String(document?.fields?.[field]?.stringValue || "");
}

function firestoreTimestamp(document, field) {
  return String(document?.fields?.[field]?.timestampValue || "");
}

function fsString(value) {
  return { stringValue: String(value || "") };
}

function fsInteger(value) {
  return { integerValue: String(Number(value) || 0) };
}

function fsBoolean(value) {
  return { booleanValue: value === true };
}

function fsTimestamp(value) {
  return { timestampValue: String(value) };
}

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

function safeError(error) {
  return error instanceof Error ? error.message : "Unknown error";
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
