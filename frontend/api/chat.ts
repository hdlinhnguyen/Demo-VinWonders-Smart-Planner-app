import { mapProviderError } from "@/bot/errors";
import { streamOpenRouterReply } from "@/bot/openrouter";
import type { ChatMessage } from "@/bot/types";
import {
  buildUserPositionContext,
  type SimulatedPosition,
} from "@/app/data/routeSimulation";

export function parseMessages(body: unknown): ChatMessage[] {
  if (!body || typeof body !== "object") return [];
  const messages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) return [];

  return messages
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        (m as ChatMessage).role !== undefined &&
        typeof (m as ChatMessage).content === "string" &&
        ["user", "assistant"].includes((m as ChatMessage).role)
    )
    .map((m) => ({
      role: m.role,
      content: m.content.trim(),
    }))
    .filter((m) => m.content.length > 0);
}

export function parseUserPosition(body: unknown): SimulatedPosition | null {
  if (!body || typeof body !== "object") return null;
  const pos = (body as { userPosition?: unknown }).userPosition;
  if (!pos || typeof pos !== "object") return null;
  const p = pos as SimulatedPosition;
  if (
    typeof p.x !== "number" ||
    typeof p.y !== "number" ||
    typeof p.progress !== "number"
  ) {
    return null;
  }
  return p;
}

export async function handleChat(
  messages: ChatMessage[],
  userPosition?: SimulatedPosition | null
): Promise<Response> {
  if (messages.length === 0) {
    return Response.json(
      { error: "messages không được rỗng" },
      { status: 400 }
    );
  }

  const last = messages[messages.length - 1];
  if (last.role !== "user") {
    return Response.json(
      { error: "Tin nhắn cuối phải từ user" },
      { status: 400 }
    );
  }

  const positionContext = userPosition
    ? buildUserPositionContext(userPosition)
    : undefined;

  const encoder = new TextEncoder();
  const generator = streamOpenRouterReply(messages, undefined, positionContext);

  let first: IteratorResult<string, void>;
  try {
    first = await generator.next();
  } catch (err) {
    console.error("[api/chat]", err);
    const { status, message } = mapProviderError(err);
    return Response.json({ error: message }, { status });
  }

  if (first.done) {
    return Response.json(
      { error: "OpenRouter không trả về nội dung" },
      { status: 502 }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(first.value));
      try {
        for await (const chunk of generator) {
          if (chunk) controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (err) {
        console.error("[api/chat] stream", err);
        const { message } = mapProviderError(err);
        controller.enqueue(encoder.encode(`\n\n⚠️ ${message}`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
