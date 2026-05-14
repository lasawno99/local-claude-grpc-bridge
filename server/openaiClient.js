const DEFAULT_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1-mini";

function extractText(payload) {
  if (payload.output_text) {
    return payload.output_text;
  }

  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .filter((content) => content.type === "output_text")
    .map((content) => content.text)
    .join("\n");
}

export async function generateWithOpenAI({ prompt, system }) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required.");
  }

  const input = [];

  if (system) {
    input.push({
      role: "system",
      content: system
    });
  }

  input.push({
    role: "user",
    content: prompt
  });

  const body = {
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    input
  };

  if (process.env.OPENAI_MAX_OUTPUT_TOKENS) {
    body.max_output_tokens = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS);
  }

  const response = await fetch(process.env.OPENAI_API_URL || DEFAULT_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload?.error?.message || response.statusText;
    throw new Error(`OpenAI API request failed (${response.status}): ${detail}`);
  }

  return {
    text: extractText(payload),
    model: payload.model || body.model,
    stopReason: payload.status || ""
  };
}
