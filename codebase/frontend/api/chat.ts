import {
  prepareMessagesForLLM,
  validateUserMessage,
} from "@/bot/chatLimits";
import { mapProviderError } from "@/bot/errors";
import { streamOpenRouterReply } from "@/bot/openrouter";
import type { ChatMessage } from "@/bot/types";
import { buildFullUserLocationContext } from "@/app/data/locationProximity";
import { detectProximityIntent } from "@/app/data/locationIntent";
import {
  buildMovedContextNote,
  type PositionSnapshot,
} from "@/app/data/positionChange";
import {
  buildProximityReply,
  formatMissingPositionReply,
} from "@/app/data/proximityReply";
import type { SimulatedPosition } from "@/app/data/routeSimulation";

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
    .map((m) => {
      if (m.role === "user") {
        const v = validateUserMessage(m.content);
        return { role: m.role, content: v.ok ? v.content : "" };
      }
      return { role: m.role, content: m.content.trim() };
    })
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

export function parseLastReplyPosition(body: unknown): PositionSnapshot | null {
  if (!body || typeof body !== "object") return null;
  const snap = (body as { lastReplyPosition?: unknown }).lastReplyPosition;
  if (!snap || typeof snap !== "object") return null;
  const s = snap as PositionSnapshot;
  if (typeof s.x !== "number" || typeof s.y !== "number") return null;
  return {
    x: s.x,
    y: s.y,
    nearLocationId:
      typeof s.nearLocationId === "string" ? s.nearLocationId : null,
  };
}

function streamPlainText(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

export async function handleChat(
  messages: ChatMessage[],
  userPosition?: SimulatedPosition | null,
  lastReplyPosition?: PositionSnapshot | null
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

  const lastValidation = validateUserMessage(last.content);
  if (!lastValidation.ok) {
    return Response.json({ error: lastValidation.error }, { status: 400 });
  }
  const lastUserContent = lastValidation.content;

  const proximityIntent = detectProximityIntent(lastUserContent);
  if (proximityIntent) {
    if (!userPosition) {
      return Response.json({
        mode: "proximity",
        content: formatMissingPositionReply(),
        suggestNav: null,
      });
    }
    const result = buildProximityReply(userPosition, proximityIntent);
    return Response.json({
      mode: "proximity",
      content: result.text,
      suggestNav: result.suggestNav,
    });
  }

  let positionContext = userPosition
    ? buildFullUserLocationContext(userPosition)
    : undefined;
  const movedNote = userPosition
    ? buildMovedContextNote(lastReplyPosition, userPosition)
    : undefined;
  if (positionContext && movedNote) {
    positionContext = `${positionContext}\n\n${movedNote}`;
  } else if (!positionContext && movedNote) {
    positionContext = movedNote;
  }

  const llmMessages = prepareMessagesForLLM(
    messages.map((m, i) =>
      i === messages.length - 1 && m.role === "user"
        ? { role: "user", content: lastUserContent }
        : m
    )
  );

  const encoder = new TextEncoder();
  const generator = streamOpenRouterReply(
    llmMessages,
    undefined,
    positionContext
  );

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
