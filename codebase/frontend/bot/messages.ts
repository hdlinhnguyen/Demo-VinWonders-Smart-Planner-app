import {
  VINWONDERS_SYSTEM_PROMPT,
  HAPPY_PATH_PROMPT,
  LOW_CONFIDENCE_PROMPT,
  FAILURE_PATH_PROMPT,
  CORRECTION_PATH_PROMPT,
} from "./prompts";
import type { ChatMessage, PathType } from "./types";

function selectPrompt(pathType: PathType): string {
  switch (pathType) {
    case "happy":
      return HAPPY_PATH_PROMPT;
    case "low-confidence":
      return LOW_CONFIDENCE_PROMPT;
    case "failure":
      return FAILURE_PATH_PROMPT;
    case "correction":
      return CORRECTION_PATH_PROMPT;
  }
}

export function toLLMMessages(
  messages: ChatMessage[],
  positionContext?: string,
  pathType?: PathType
) {
  const basePrompt = pathType
    ? selectPrompt(pathType)
    : VINWONDERS_SYSTEM_PROMPT;

  const systemContent = positionContext
    ? `${basePrompt}\n\n## Vị trí người dùng & khoảng cách route (cập nhật mỗi tin nhắn)\n${positionContext}`
    : basePrompt;

  return [
    { role: "system" as const, content: systemContent },
    ...messages.map((m) => ({
      role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    })),
  ];
}
