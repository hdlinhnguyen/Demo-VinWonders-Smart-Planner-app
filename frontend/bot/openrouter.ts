import { VINWONDERS_SYSTEM_PROMPT } from "./prompts";
import type { ChatMessage } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Router tự chọn model free còn hoạt động — ổn định hơn ID model cũ */
const DEFAULT_MODEL =
  process.env.OPENROUTER_MODEL?.trim() || "openrouter/free";

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY chưa được cấu hình. Thêm vào frontend/.env"
    );
  }
  return key;
}

function toOpenRouterMessages(messages: ChatMessage[]) {
  return [
    { role: "system" as const, content: VINWONDERS_SYSTEM_PROMPT },
    ...messages.map((m) => ({
      role: (m.role === "user" ? "user" : "assistant") as
        | "user"
        | "assistant",
      content: m.content,
    })),
  ];
}

/** Gọi OpenRouter (OpenAI-compatible) và stream từng đoạn text */
export async function* streamOpenRouterReply(
  messages: ChatMessage[],
  model = DEFAULT_MODEL
): AsyncGenerator<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      "HTTP-Referer":
        process.env.OPENROUTER_SITE_URL?.trim() || "http://localhost:3000",
      "X-Title":
        process.env.OPENROUTER_APP_NAME?.trim() || "VinWonders Assistant",
    },
    body: JSON.stringify({
      model,
      messages: toOpenRouterMessages(messages),
      stream: true,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${detail}`);
  }

  if (!res.body) {
    throw new Error("OpenRouter không trả về stream");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;

      const payload = trimmed.slice(6);
      if (payload === "[DONE]") return;

      try {
        const json = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        const content = json.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
        /* bỏ qua chunk JSON lỗi */
      }
    }
  }
}
