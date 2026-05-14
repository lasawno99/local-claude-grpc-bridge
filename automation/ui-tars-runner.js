import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { GUIAgent } from "@ui-tars/sdk";
import { NutJSOperator } from "@ui-tars/operator-nut-js";
import { sendTelegramMessage } from "./telegram.js";

const liveMode = process.env.UI_TARS_ENABLE_LIVE === "true";
const instruction =
  process.argv.slice(2).join(" ").trim() ||
  process.env.UI_TARS_INSTRUCTION ||
  "Verify the local application is visible.";

function requireLiveConfig() {
  const missing = ["UI_TARS_BASE_URL", "UI_TARS_API_KEY", "UI_TARS_MODEL"].filter(
    (key) => !process.env[key]
  );

  if (missing.length) {
    throw new Error(`Missing UI-TARS config: ${missing.join(", ")}`);
  }
}

async function writeReport(report) {
  await writeFile("automation/latest-ui-tars-report.json", JSON.stringify(report, null, 2));
}

async function runDryMode() {
  const report = {
    ok: true,
    mode: "dry-run",
    instruction,
    message:
      "UI-TARS dependencies loaded. Set UI_TARS_ENABLE_LIVE=true to let it control the GUI."
  };

  await writeReport(report);
  await sendTelegramMessage(`UI-TARS dry-run passed.\nInstruction: ${instruction}`);
  console.log(JSON.stringify(report, null, 2));
}

async function runLiveMode() {
  requireLiveConfig();

  const events = [];
  const abortController = new AbortController();
  const timeoutMs = Number(process.env.UI_TARS_TIMEOUT_MS || 120000);
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  const guiAgent = new GUIAgent({
    model: {
      baseURL: process.env.UI_TARS_BASE_URL,
      apiKey: process.env.UI_TARS_API_KEY,
      model: process.env.UI_TARS_MODEL
    },
    operator: new NutJSOperator(),
    signal: abortController.signal,
    maxLoopCount: Number(process.env.UI_TARS_MAX_LOOPS || 8),
    onData: ({ data }) => {
      events.push(data);
      console.log(JSON.stringify(data));
    },
    onError: ({ error, data }) => {
      events.push({ error: error.message, data });
      console.error(error.message);
    }
  });

  try {
    await guiAgent.run(instruction);
    const report = {
      ok: true,
      mode: "live",
      instruction,
      events: events.length
    };

    await writeReport(report);
    await sendTelegramMessage(`UI-TARS live test passed.\nInstruction: ${instruction}`);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    clearTimeout(timeout);
  }
}

try {
  if (liveMode) {
    await runLiveMode();
  } else {
    await runDryMode();
  }
} catch (error) {
  const report = {
    ok: false,
    mode: liveMode ? "live" : "dry-run",
    instruction,
    error: error.message
  };

  await writeReport(report);
  await sendTelegramMessage(`UI-TARS test failed.\n${error.message}`);
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
