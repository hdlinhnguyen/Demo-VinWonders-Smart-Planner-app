import { toLLMMessages } from "./messages";
import { parseSSEContentStream } from "./sseStream";
import type { ChatMessage, PathType } from "./types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const DEFAULT_MODEL =
  process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY chưa được cấu hình. Thêm vào frontend/.env"
    );
  }
  return key;
}

export async function* streamOpenAIReply(
  messages: ChatMessage[],
  model = DEFAULT_MODEL,
  positionContext?: string,
  pathType?: PathType
): AsyncGenerator<string> {
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: toLLMMessages(messages, positionContext, pathType),
      stream: true,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenAI ${res.status}: ${detail}`);
  }

  if (!res.body) {
    throw new Error("OpenAI không trả về stream");
  }

  yield* parseSSEContentStream(res.body);
}
