import "dotenv/config";
import { spawn } from "node:child_process";
import { generateWithSelectedProvider, getAiProviderName, getAiProviderStatus } from "./ai-provider.js";
import { sendTelegramMessage, telegramConfigured } from "./telegram.js";

if (!telegramConfigured()) {
  console.error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required.");
  process.exit(1);
}

let offset = 0;
const conversations = new Map();
const maxHistoryMessages = Number(process.env.TELEGRAM_CHAT_HISTORY_LIMIT || 20);
const chatSystemPrompt =
  process.env.TELEGRAM_CHAT_SYSTEM_PROMPT ||
  "You are a helpful, friendly assistant chatting in Telegram. Keep replies concise unless the user asks for detail.";

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

function appendConversation(chatId, role, content) {
  const history = conversations.get(chatId) || [];
  history.push({ role, content });
  conversations.set(chatId, history.slice(-maxHistoryMessages));
}

function buildPrompt(chatId, latestText) {
  const history = conversations.get(chatId) || [];
  const transcript = history
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n");

  return transcript ? `${transcript}\nUser: ${latestText}` : latestText;
}

function splitTelegramMessage(text) {
  const chunks = [];
  const maxLength = 3900;
  let remaining = text || "(No response text.)";

  while (remaining.length > maxLength) {
    const slice = remaining.slice(0, maxLength);
    const breakAt = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(" "));
    const end = breakAt > 1000 ? breakAt : maxLength;
    chunks.push(remaining.slice(0, end));
    remaining = remaining.slice(end).trimStart();
  }

  chunks.push(remaining);
  return chunks;
}

async function sendTypingAction(chatId) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendChatAction`;
  await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      action: "typing"
    })
  }).catch(() => {});
}

async function replyWithAi(chatId, text) {
  appendConversation(chatId, "user", text);
  await sendTypingAction(chatId);

  let result;

  try {
    result = await generateWithSelectedProvider({
      prompt: buildPrompt(chatId, text),
      system: chatSystemPrompt
    });
  } catch (error) {
    console.error(error.message);
    await sendTelegramMessage(
      `I reached the bot, but the AI provider failed: ${error.message}\n\nSend /debug to check provider configuration.`,
      { chatId }
    );
    return;
  }

  if (!result.text?.trim()) {
    await sendTelegramMessage(
      `I reached ${getAiProviderName()}, but it returned an empty response. Send /debug to check provider configuration.`,
      { chatId }
    );
    return;
  }

  appendConversation(chatId, "assistant", result.text);

  for (const chunk of splitTelegramMessage(result.text)) {
    await sendTelegramMessage(chunk, { chatId });
  }
}

function buildDebugMessage() {
  const status = getAiProviderStatus();

  return [
    "Bot debug:",
    `provider=${status.provider}`,
    `anthropic_key=${status.anthropicConfigured ? "set" : "missing"}`,
    `anthropic_model=${status.anthropicModel}`,
    `openai_key=${status.openaiConfigured ? "set" : "missing"}`,
    `openai_model=${status.openaiModel}`,
    `openrouter_key=${status.openrouterConfigured ? "set" : "missing"}`,
    `openrouter_model=${status.openrouterModel}`,
    `chat_history_limit=${maxHistoryMessages}`
  ].join("\n");
}

console.log("Telegram bot polling. Send /status, /provider, /debug, /test, /reset, or any normal message.");

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
        await sendTelegramMessage("Local automation bot is running.", { chatId });
        continue;
      }

      if (text === "/provider") {
        await sendTelegramMessage(`Current AI provider: ${getAiProviderName()}`, { chatId });
        continue;
      }

      if (text === "/debug") {
        await sendTelegramMessage(buildDebugMessage(), { chatId });
        continue;
      }

      if (text === "/test") {
        await sendTelegramMessage("Running local automation tests...", { chatId });
        const result = await runAutomationTests();
        await sendTelegramMessage(`Automation tests exited ${result.code}.\n\n${result.output.slice(-3000)}`, {
          chatId
        });
        continue;
      }

      if (text === "/reset") {
        conversations.delete(chatId);
        await sendTelegramMessage("Conversation memory reset.", { chatId });
        continue;
      }

      if (text && !text.startsWith("/")) {
        await replyWithAi(chatId, text);
        continue;
      }
    }
  } catch (error) {
    console.error(error.message);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
