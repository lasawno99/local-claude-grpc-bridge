import "dotenv/config";
import { sendTelegramMessage } from "./telegram.js";

const result = await sendTelegramMessage("Local automation test alert: Telegram is configured.", {
  strict: true
});

if (result.skipped) {
  console.log(`Skipped: ${result.reason}`);
} else {
  console.log("Telegram test message sent.");
}
