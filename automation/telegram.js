export function telegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function sendTelegramMessage(text, options = {}) {
  if (!telegramConfigured()) {
    return {
      skipped: true,
      reason: "TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required."
    };
  }

  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.description || `Telegram request failed with ${response.status}`);
    }

    return {
      skipped: false,
      payload
    };
  } catch (error) {
    if (options.strict) {
      throw error;
    }

    return {
      skipped: true,
      reason: error.message
    };
  }
}
