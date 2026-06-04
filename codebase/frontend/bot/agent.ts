import { streamLLMReply } from "./provider";
import { detectPath } from "./tools";
import { prepareMessagesForLLM } from "@/bot/chatLimits";
import type { ChatMessage, PathType } from "./types";
import { mapProviderError } from "./errors";

export interface AgentStreamResult {
  stream: ReadableStream<Uint8Array>;
  pathType: PathType;
}

const ITINERARY_SUFFIX = `

[YÊU CẦU BẮT BUỘC — PHẢI TUÂN THỦ]
Sau phần trả lời, xuất NGAY một khối JSON duy nhất theo đúng format sau, KHÔNG thêm bất kỳ văn bản nào sau dấu \`\`\` cuối:

\`\`\`json
[{"time":"09:00","name":"Tên địa điểm","reason":"Lý do ngắn","durationMinutes":45}]
\`\`\`

Quy tắc JSON:
- Mỗi hoạt động là một object với đúng 4 field: time, name, reason, durationMinutes
- time: chuỗi "HH:MM" (24 giờ)
- durationMinutes: số nguyên
- Tối thiểu 6 items
- Bắt đầu bằng \`\`\`json, kết thúc bằng \`\`\``;

export async function runAgentStream(
  messages: ChatMessage[],
  positionContext?: string
): Promise<AgentStreamResult> {
  const pathType = detectPath(messages);

  // Append JSON demand directly to last user message for itinerary paths
  const needsItinerary = pathType === "happy" || pathType === "failure" || pathType === "correction";
  const augmented = needsItinerary
    ? messages.map((m, i) =>
        i === messages.length - 1 && m.role === "user"
          ? { ...m, content: m.content + ITINERARY_SUFFIX }
          : m
      )
    : messages;

  const llmMessages = prepareMessagesForLLM(
    augmented.map(m => ({ role: m.role, content: m.content }))
  );

  const generator = streamLLMReply(
    llmMessages,
    positionContext,
    pathType
  );

  // Eagerly pull first token to surface auth/quota errors before returning
  let first: IteratorResult<string, void>;
  try {
    first = await generator.next();
  } catch (err) {
    const { status, message } = mapProviderError(err);
    const e = new Error(message) as Error & { status: number };
    e.status = status;
    throw e;
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      if (!first.done) {
        controller.enqueue(encoder.encode(first.value));
      }
      try {
        for await (const chunk of generator) {
          if (chunk) controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        const { message } = mapProviderError(e);
        controller.enqueue(encoder.encode(`\n\n⚠️ ${message}`));
      }
      controller.close();
    },
  });

  return { stream, pathType };
}
