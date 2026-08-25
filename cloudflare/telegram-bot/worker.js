export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const token = env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      return new Response("TELEGRAM_BOT_TOKEN missing", { status: 500 });
    }

    if (request.method === "GET" && url.pathname === "/setup") {
      const webhookUrl = `${url.origin}/webhook`;

      const webhook = await telegram(token, "setWebhook", {
        url: webhookUrl,
        allowed_updates: ["message"]
      });

      const commands = await telegram(token, "setMyCommands", {
        commands: [
          { command: "start", description: "Start NexusNova Assistant" },
          { command: "help", description: "Get help and support" },
          { command: "tools", description: "Explore NexusNova tools" },
          { command: "website", description: "Open NexusNova website" },
          { command: "support", description: "Contact NexusNova support" }
        ]
      });

      return Response.json({ success: true, webhook, commands });
    }

    if (request.method === "POST" && url.pathname === "/webhook") {
      try {
        const update = await request.json();
        if (update.message?.chat?.id) await handleMessage(token, update.message);
        return new Response("OK");
      } catch (error) {
        console.error(error);
        return new Response("OK");
      }
    }

    if (request.method === "GET") {
      return new Response("NexusNova Telegram Bot is online ✅");
    }

    return new Response("OK");
  }
};

async function handleMessage(token, message) {
  const chatId = message.chat.id;
  const firstName = message.from?.first_name || "there";
  const rawText = message.text || "";
  const command = rawText.trim().split(/\s+/)[0].split("@")[0].toLowerCase();

  if (command === "/start") return sendWelcome(token, chatId, firstName);

  if (command === "/help") {
    return sendMessage(token, chatId,
      `🆘 <b>NexusNova Help</b>\n\n/start - Start NexusNova Assistant\n/tools - Explore NexusNova tools\n/website - Open the official website\n/support - Get support\n/help - Show this help message\n\n🌐 nexusnovatools.com`,
      mainKeyboard());
  }

  if (command === "/tools") {
    return sendMessage(token, chatId,
      `🛠 <b>NexusNova Tools</b>\n\nFree browser tools for PDF, images, AI, gaming, calculators, productivity and more.\n\nTap the button below to explore.`,
      { inline_keyboard: [
        [{ text: "🛠 Open NexusNova Tools", url: "https://nexusnovatools.com/" }],
        [{ text: "🔥 Trending Tools", url: "https://nexusnovatools.com/trending-tools.html" }]
      ] });
  }

  if (command === "/website") {
    return sendMessage(token, chatId,
      `🌐 <b>NexusNova Official Website</b>\n\nhttps://nexusnovatools.com/`,
      { inline_keyboard: [[{ text: "🌐 Open Website", url: "https://nexusnovatools.com/" }]] });
  }

  if (command === "/support") {
    return sendMessage(token, chatId,
      `💬 <b>NexusNova Support</b>\n\nFor help, questions or reporting a problem, use our official support page or Telegram channel.\n\n⚠️ Never send passwords, API tokens or private keys.`,
      { inline_keyboard: [
        [{ text: "🆘 Contact Support", url: "https://nexusnovatools.com/contact.html" }],
        [{ text: "📢 NexusNova Channel", url: "https://t.me/NexusNovaTools" }]
      ] });
  }

  return sendMessage(token, chatId,
    `👋 Welcome to <b>NexusNova AI Assistant</b>.\n\nChoose a command from the menu or tap a button below.`,
    mainKeyboard());
}

async function sendWelcome(token, chatId, firstName) {
  const caption = `🚀 <b>Welcome to NexusNova, ${escapeHtml(firstName)}!</b>\n\nYour official NexusNova assistant for free online tools, updates and support.\n\n🛠 Explore useful tools\n🔥 Discover trending utilities\n🌐 Visit NexusNova Tools\n💬 Get official support\n\nChoose an option below 👇`;

  try {
    const me = await telegram(token, "getMe", {});
    if (me.ok && me.result?.id) {
      const photos = await telegram(token, "getUserProfilePhotos", { user_id: me.result.id, limit: 1 });
      const firstPhoto = photos?.result?.photos?.[0];
      if (photos.ok && firstPhoto?.length) {
        const photo = firstPhoto[firstPhoto.length - 1].file_id;
        const result = await telegram(token, "sendPhoto", {
          chat_id: chatId,
          photo,
          caption,
          parse_mode: "HTML",
          reply_markup: mainKeyboard()
        });
        if (result.ok) return result;
      }
    }
  } catch (error) {
    console.error("Welcome photo error:", error);
  }

  return sendMessage(token, chatId, caption, mainKeyboard());
}

function mainKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🛠 Explore Tools", url: "https://nexusnovatools.com/" }],
      [
        { text: "🌐 Website", url: "https://nexusnovatools.com/" },
        { text: "📢 Telegram", url: "https://t.me/NexusNovaTools" }
      ],
      [{ text: "💬 Support", url: "https://nexusnovatools.com/contact.html" }]
    ]
  };
}

async function sendMessage(token, chatId, text, keyboard = null) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true
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
  return response.json();
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
