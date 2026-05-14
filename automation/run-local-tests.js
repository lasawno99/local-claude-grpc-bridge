import "dotenv/config";
import { spawn } from "node:child_process";
import { sendTelegramMessage } from "./telegram.js";

const checks = [
  ["server syntax", process.execPath, ["--check", "server/index.js"]],
  ["anthropic adapter syntax", process.execPath, ["--check", "server/anthropicClient.js"]],
  ["openai adapter syntax", process.execPath, ["--check", "server/openaiClient.js"]],
  ["grpc server syntax", process.execPath, ["--check", "server/grpcServer.js"]],
  ["grpc client syntax", process.execPath, ["--check", "client/index.js"]],
  ["provider router syntax", process.execPath, ["--check", "automation/ai-provider.js"]],
  ["ui-tars runner syntax", process.execPath, ["--check", "automation/ui-tars-runner.js"]],
  ["telegram bot syntax", process.execPath, ["--check", "automation/telegram-bot.js"]],
  ["token optimizer config", process.execPath, ["automation/token-optimizer-config.js"]],
  ["ui-tars dry-run", process.execPath, ["automation/ui-tars-runner.js"]]
];

function runCheck([name, command, args]) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
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
      resolve({ name, code, output: output.trim() });
    });
  });
}

const results = [];

for (const check of checks) {
  const result = await runCheck(check);
  results.push(result);
  const mark = result.code === 0 ? "PASS" : "FAIL";
  console.log(`${mark} ${result.name}`);
  if (result.output) {
    console.log(result.output);
  }
}

const failed = results.filter((result) => result.code !== 0);
const summary = failed.length
  ? `Local automation checks failed: ${failed.map((result) => result.name).join(", ")}`
  : "Local automation checks passed.";

await sendTelegramMessage(summary);

if (failed.length) {
  process.exit(1);
}
