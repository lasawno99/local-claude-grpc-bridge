import { generateWithClaude } from "../server/anthropicClient.js";
import { generateWithOpenAI } from "../server/openaiClient.js";

export function getAiProviderName() {
  return (process.env.TELEGRAM_AI_PROVIDER || "anthropic").toLowerCase();
}

export async function generateWithSelectedProvider(request) {
  const provider = getAiProviderName();

  if (provider === "openai") {
    return generateWithOpenAI(request);
  }

  if (provider === "anthropic" || provider === "claude") {
    return generateWithClaude(request);
  }

  throw new Error(`Unsupported TELEGRAM_AI_PROVIDER: ${provider}`);
}
