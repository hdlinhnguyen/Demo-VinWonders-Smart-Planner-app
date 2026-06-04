import { streamOpenAIReply } from "./openai";
import { streamOpenRouterReply } from "./openrouter";
import type { ChatMessage, PathType } from "./types";

export function usesOpenAI(): boolean {
  return !!process.env.OPENAI_API_KEY?.trim();
}

export async function* streamLLMReply(
  messages: ChatMessage[],
  positionContext?: string,
  pathType?: PathType
): AsyncGenerator<string> {
  if (usesOpenAI()) {
    yield* streamOpenAIReply(messages, undefined, positionContext, pathType);
  } else {
    yield* streamOpenRouterReply(
      messages,
      undefined,
      positionContext,
      pathType
    );
  }
}
