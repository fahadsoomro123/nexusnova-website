const command = String(process.env.WRANGLER_COMMAND || '');

if (command !== 'deploy') {
  console.log(`Skipping Telegram webhook repair for wrangler command: ${command || 'unknown'}`);
  process.exit(0);
}

const base = 'https://nexusnova-telegram-bot.fahadsoomro123.workers.dev';
let lastError = null;

for (let attempt = 1; attempt <= 6; attempt += 1) {
  try {
    const response = await fetch(`${base}/setup`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000)
    });
    const data = await response.json();
    const webhookUrl = String(data?.webhookInfo?.result?.url || '');

    if (response.ok && data?.ok === true && webhookUrl === `${base}/webhook`) {
      const pending = data?.webhookInfo?.result?.pending_update_count ?? 0;
      const lastTelegramError = data?.webhookInfo?.result?.last_error_message || 'none';
      console.log(`Telegram webhook configured; pending=${pending}; last_error=${lastTelegramError}`);
      process.exit(0);
    }

    lastError = new Error(`Unexpected setup response (${response.status})`);
  } catch (error) {
    lastError = error;
  }

  if (attempt < 6) {
    await new Promise(resolve => setTimeout(resolve, 5_000));
  }
}

throw new Error(`Telegram webhook repair failed before deploy: ${lastError?.message || 'unknown error'}`);
