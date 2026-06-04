import {
  handleChat,
  parseClientId,
  parseLastReplyPosition,
  parseMessages,
  parseSavedItinerary,
  parseUserPosition,
} from "@/api/chat";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = parseMessages(body);
  const userPosition = parseUserPosition(body);
  const lastReplyPosition = parseLastReplyPosition(body);
  const savedItinerary = parseSavedItinerary(body);
  const clientKey =
    parseClientId(body) ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous";
  return handleChat(
    messages,
    userPosition,
    lastReplyPosition,
    savedItinerary,
    clientKey
  );
}
