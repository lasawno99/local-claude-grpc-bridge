import "dotenv/config";
import { spawn } from "node:child_process";
import { sendTelegramMessage, telegramConfigured } from "./telegram.js";

if (!telegramConfigured()) {
  console.error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required.");
  process.exit(1);
}

let offset = 0;

async function getUpdates() {
  const url = new URL(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getUpdates`);
  url.searchParams.set("timeout", "25");
  if (offset) {
    url.searchParams.set("offset", String(offset));
  }

  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.description || "Telegram getUpdates failed.");
  }

  return payload.result || [];
}

function runAutomationTests() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["automation/run-local-tests.js"], {
      cwd: process.cwd(),
      env: process.env
    });

    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("close", (code) => {
      resolve({ code, output: output.trim() });
    });
  });
}

console.log("Telegram bot polling. Send /status or /test.");

while (true) {
  try {
    const updates = await getUpdates();

    for (const update of updates) {
      offset = update.update_id + 1;
      const text = update.message?.text?.trim();
      const chatId = String(update.message?.chat?.id || "");

      if (chatId !== String(process.env.TELEGRAM_CHAT_ID)) {
        continue;
      }

      if (text === "/status") {
        await sendTelegramMessage("Local automation bot is running.");
      }

      if (text === "/test") {
        await sendTelegramMessage("Running local automation tests...");
        const result = await runAutomationTests();
        await sendTelegramMessage(`Automation tests exited ${result.code}.\n\n${result.output.slice(-3000)}`);
      }
    }
  } catch (error) {
    console.error(error.message);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
