const MINI_APP_URL = "https://nexusnovatools.com/";
const CHANNEL_URL = "https://t.me/NexusNovaTools";
const SUPPORT_URL = "https://nexusnovatools.com/contact.html";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const token = env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      return json({ ok: false, error: "TELEGRAM_BOT_TOKEN missing" }, 500);
    }

    try {
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
      return json({ ok: false, error: "Telegram request failed" }, 502);
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
