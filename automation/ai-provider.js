import { generateWithClaude } from "../server/anthropicClient.js";
import { generateWithOpenAI } from "../server/openaiClient.js";

export function getAiProviderName() {
  return (process.env.TELEGRAM_AI_PROVIDER || "anthropic").toLowerCase();
}

export function getAiProviderStatus() {
  const provider = getAiProviderName();

  return {
    provider,
    anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
    openaiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini"
  };
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
