function parseOpenRouterMessage(raw: string): string | null {
  const match = raw.match(/OpenRouter \d+: (\{.*\})/s);
  if (!match) return null;
  try {
    const body = JSON.parse(match[1]) as {
      error?: { message?: string };
    };
    return body.error?.message ?? null;
  } catch {
    return null;
  }
}

export function mapProviderError(err: unknown): {
  status: number;
  message: string;
} {
  const raw = err instanceof Error ? err.message : String(err);
  const apiMsg = parseOpenRouterMessage(raw);

  if (raw.includes("OPENROUTER_API_KEY")) {
    return { status: 503, message: raw };
  }

  if (raw.includes("401") || raw.includes("User not found")) {
    return {
      status: 401,
      message:
        "OpenRouter API key không hợp lệ. Kiểm tra OPENROUTER_API_KEY tại https://openrouter.ai/keys",
    };
  }

  if (
    raw.includes("404") ||
    raw.includes("No endpoints found") ||
    apiMsg?.includes("No endpoints found")
  ) {
    return {
      status: 404,
      message:
        `Model không tồn tại hoặc đã gỡ trên OpenRouter${apiMsg ? `: ${apiMsg}` : ""}. Đổi OPENROUTER_MODEL trong .env thành openrouter/free hoặc meta-llama/llama-3.3-70b-instruct:free rồi restart npm run dev.`,
    };
  }

  if (
    raw.includes("429") ||
    raw.includes("rate") ||
    raw.includes("quota") ||
    raw.includes("Too Many Requests")
  ) {
    return {
      status: 429,
      message:
        "OpenRouter hết quota hoặc vượt giới hạn (429). Đợi vài phút hoặc đổi OPENROUTER_MODEL.",
    };
  }

  if (raw.includes("402") || raw.includes("credits")) {
    return {
      status: 402,
      message:
        "Tài khoản OpenRouter thiếu credits. Nạp thêm hoặc dùng OPENROUTER_MODEL=openrouter/free.",
    };
  }

  if (apiMsg) {
    return { status: 500, message: `OpenRouter: ${apiMsg}` };
  }

  return {
    status: 500,
    message: "Không thể kết nối tới OpenRouter. Vui lòng thử lại.",
  };
}
