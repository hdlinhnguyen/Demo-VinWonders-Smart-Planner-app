function readLimit(envKey: string, fallback: number): number {
  const raw = process.env[envKey]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const MIN_INTERVAL_MS = readLimit("CHAT_SPAM_MIN_INTERVAL_MS", 1500);
const MAX_PER_MINUTE = readLimit("CHAT_SPAM_MAX_PER_MINUTE", 10);
const DUPLICATE_WINDOW_MS = readLimit("CHAT_SPAM_DUPLICATE_MS", 30_000);
const BUCKET_TTL_MS = 120_000;

type Bucket = {
  timestamps: number[];
  lastContent: string;
  lastContentAt: number;
};

const buckets = new Map<string, Bucket>();

function pruneBucket(bucket: Bucket, now: number) {
  const cutoff = now - 60_000;
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
}

function fingerprint(content: string): string {
  return content.toLowerCase().replace(/\s+/g, " ").trim();
}

export type SpamCheckResult =
  | { ok: true }
  | { ok: false; error: string; retryAfterSec: number };

export function checkChatSpam(clientKey: string, content: string): SpamCheckResult {
  const now = Date.now();
  const key = clientKey.slice(0, 128) || "anonymous";
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { timestamps: [], lastContent: "", lastContentAt: 0 };
    buckets.set(key, bucket);
  }

  pruneBucket(bucket, now);

  const fp = fingerprint(content);
  const lastSend = bucket.timestamps[bucket.timestamps.length - 1];

  if (lastSend && now - lastSend < MIN_INTERVAL_MS) {
    const retryAfterSec = Math.ceil((MIN_INTERVAL_MS - (now - lastSend)) / 1000);
    return {
      ok: false,
      error: `Bạn gửi quá nhanh. Vui lòng đợi ${retryAfterSec} giây.`,
      retryAfterSec,
    };
  }

  if (
    bucket.lastContent === fp &&
    bucket.lastContentAt &&
    now - bucket.lastContentAt < DUPLICATE_WINDOW_MS
  ) {
    return {
      ok: false,
      error: "Tin nhắn trùng với lần gửi trước. Hãy chỉnh nội dung hoặc đợi một chút.",
      retryAfterSec: Math.ceil(DUPLICATE_WINDOW_MS / 1000),
    };
  }

  if (bucket.timestamps.length >= MAX_PER_MINUTE) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((60_000 - (now - oldest)) / 1000));
    return {
      ok: false,
      error: `Đã gửi ${MAX_PER_MINUTE} tin trong 1 phút. Thử lại sau ${retryAfterSec} giây.`,
      retryAfterSec,
    };
  }

  bucket.timestamps.push(now);
  bucket.lastContent = fp;
  bucket.lastContentAt = now;

  if (buckets.size > 500) {
    for (const [k, b] of buckets) {
      const last = b.timestamps[b.timestamps.length - 1] ?? 0;
      if (now - last > BUCKET_TTL_MS) buckets.delete(k);
    }
  }

  return { ok: true };
}
