import { OpenRouter } from "@openrouter/sdk";
import { callModel, tool } from "@openrouter/agent";
import { z } from "zod";

const DEFAULT_MODEL = "anthropic/claude-sonnet-4";

const weatherTool = tool({
  name: "get_weather",
  description: "Get the current weather for a location",
  inputSchema: z.object({
    location: z.string().describe("City name")
  }),
  execute: async ({ location }) => {
    return { temperature: 72, condition: "sunny", location };
  }
});

export async function generateWithOpenRouter({ prompt, system }) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required.");
  }

  const client = new OpenRouter({ apiKey });
  const messages = [];

  if (system) {
    messages.push({ role: "system", content: system });
  }

  messages.push({ role: "user", content: prompt });

  const result = callModel(client, {
    model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
    messages,
    tools: [weatherTool]
  });

  const text = await result.getText();

  return {
    text,
    model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
    stopReason: ""
  };
}
