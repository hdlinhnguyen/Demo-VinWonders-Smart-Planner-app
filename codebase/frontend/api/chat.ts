import {
  prepareMessagesForLLM,
  validateUserMessage,
} from "@/bot/chatLimits";
import { checkChatSpam } from "@/bot/chatSpam";
import { mapProviderError } from "@/bot/errors";
import { runAgentStream } from "@/bot/agent";
import type { ChatMessage } from "@/bot/types";
import type { ItineraryItem } from "@/bot/tools";
import { buildFullUserLocationContext } from "@/app/data/locationProximity";
import { detectProximityIntent } from "@/app/data/locationIntent";
import {
  buildMovedContextNote,
  type PositionSnapshot,
} from "@/app/data/positionChange";
import {
  buildHarmfulRequestRefusal,
  detectHarmfulUserContent,
} from "@/app/data/contentSafety";
import {
  buildUnverifiedInfoReply,
  detectUnverifiedInfoRequest,
} from "@/app/data/hallucinationControl";
import {
  buildUnsupportedParkReply,
  detectOtherParkMention,
} from "@/app/data/parkScope";
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

export function parseClientId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const id = (body as { clientId?: unknown }).clientId;
  return typeof id === "string" && id.trim().length > 0 ? id.trim() : null;
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

export function parseSavedItinerary(body: unknown): ItineraryItem[] | null {
  if (!body || typeof body !== "object") return null;
  const raw = (body as { savedItinerary?: unknown }).savedItinerary;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return raw as ItineraryItem[];
}

function formatSavedItineraryContext(items: ItineraryItem[]): string {
  const lines = items.map(
    (it) =>
      `${it.time} – ${it.name}${it.warning ? ` [⚠️ ${it.warning}]` : ""} (${it.durationMinutes} phút): ${it.reason}`
  );
  return `## Lịch trình đã lưu của người dùng\n${lines.join("\n")}\nKhi người dùng hỏi về lịch trình này, hãy dùng thông tin trên làm cơ sở.`;
}

export async function handleChat(
  messages: ChatMessage[],
  userPosition?: SimulatedPosition | null,
  lastReplyPosition?: PositionSnapshot | null,
  savedItinerary?: ItineraryItem[] | null,
  clientKey = "anonymous"
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

  const spam = checkChatSpam(clientKey, lastUserContent);
  if (!spam.ok) {
    return Response.json(
      { error: spam.error, retryAfterSec: spam.retryAfterSec },
      { status: 429 }
    );
  }

  if (detectHarmfulUserContent(lastUserContent)) {
    return Response.json({
      mode: "policy",
      content: buildHarmfulRequestRefusal(),
      suggestNav: null,
    });
  }

  const unverified = detectUnverifiedInfoRequest(lastUserContent);
  if (unverified) {
    return Response.json({
      mode: "unverified_info",
      content: buildUnverifiedInfoReply(unverified),
      suggestNav: null,
    });
  }

  const otherPark = detectOtherParkMention(lastUserContent);
  if (otherPark) {
    return Response.json({
      mode: "park_scope",
      content: buildUnsupportedParkReply(otherPark),
      suggestNav: null,
    });
  }

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
  if (savedItinerary && savedItinerary.length > 0) {
    const itineraryNote = formatSavedItineraryContext(savedItinerary);
    positionContext = positionContext
      ? `${positionContext}\n\n${itineraryNote}`
      : itineraryNote;
  }

  const llmMessages = prepareMessagesForLLM(
    messages.map((m, i) =>
      i === messages.length - 1 && m.role === "user"
        ? { role: "user", content: lastUserContent }
        : m
    )
  );

  let agentResult: Awaited<ReturnType<typeof runAgentStream>>;
  try {
    agentResult = await runAgentStream(llmMessages, positionContext);
  } catch (err) {
    console.error("[api/chat]", err);
    const status =
      err && typeof err === "object" && "status" in err
        ? (err as { status: number }).status
        : mapProviderError(err).status;
    const message =
      err instanceof Error ? err.message : mapProviderError(err).message;
    return Response.json({ error: message }, { status });
  }

  return new Response(agentResult.stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Path-Type": agentResult.pathType,
    },
  });
}
