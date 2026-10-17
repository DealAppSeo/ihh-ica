import Anthropic from "@anthropic-ai/sdk";
import path from "node:path";

// The key lives in the repo-root .env (git-ignored). Next only reads env files from ica/, so load it here.
if (!process.env.ANTHROPIC_API_KEY) {
  try {
    process.loadEnvFile(path.join(process.cwd(), "..", ".env"));
  } catch {
    /* no root .env; rely on the environment */
  }
}

export const MODEL = "claude-opus-5-5";
// Opus 5.5 list price, $ per million tokens.
export const PRICE = { input: 4, output: 20 };

let client: Anthropic | null = null;
export function claude() {
  client ??= new Anthropic({ maxRetries: 4 });
  return client;
}

export function cost(usage: { input_tokens: number; output_tokens: number }) {
  return (usage.input_tokens * PRICE.input + usage.output_tokens * PRICE.output) / 1e6;
}
