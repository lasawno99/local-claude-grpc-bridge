const DEFAULT_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-5";

function extractText(content = []) {
  return content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

export async function generateWithClaude({ prompt, system }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required.");
  }

  const body = {
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: Number(process.env.ANTHROPIC_MAX_TOKENS || 1024),
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  };

  if (system) {
    body.system = system;
  }

  const response = await fetch(process.env.ANTHROPIC_API_URL || DEFAULT_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": process.env.ANTHROPIC_VERSION || DEFAULT_VERSION
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload?.error?.message || response.statusText;
    throw new Error(`Claude API request failed (${response.status}): ${detail}`);
  }

  return {
    text: extractText(payload.content),
    model: payload.model || body.model,
    stopReason: payload.stop_reason || ""
  };
}
