function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

/** Mẫu trên chuỗi đã bỏ dấu — ưu tiên chặn sớm, không gọi LLM */
const HARMFUL_PATTERNS: { id: string; pattern: RegExp }[] = [
  {
    id: "vandalism",
    pattern:
      /pha hoai|vandal|sabotage|dap pha|dot pha|lam hong|hu hong|pha do|pha trò|pha may|gay hu hai cho cong vien|gay thiet hai/i,
  },
  {
    id: "violence",
    pattern:
      /danh nhao|danh nguoi|gay thuong|giet|giết|hanh hung|tan cong|doa giết|mang vu khi/i,
  },
  {
    id: "illegal",
    pattern:
      /tron ve|vuot rao|vuot tuong|trom|an cap|buon lau|ma tuy|hack|pha khoa|lam gia ve|ve gia/i,
  },
  {
    id: "safety_bypass",
    pattern:
      /thao day an toan|bo day an toan|vuot quy dinh an toan|ne an toan|lach an toan|khong dung day|tat may an toan|vao khu cam|vuot quy dinh/i,
  },
  {
    id: "disruption",
    pattern:
      /gay roi|gay on ao|quay pha|lam roi|khung bo|de doa/i,
  },
  {
    id: "how_to_harm",
    pattern:
      /(cach|huong dan|chi toi cach|lam sao de|huong dan de).{0,40}(pha hoai|dap pha|tron|trom|danh|gay roi|hu hong|vuot rao|ne an toan)/i,
  },
];

export type HarmfulCategory =
  | "vandalism"
  | "violence"
  | "illegal"
  | "safety_bypass"
  | "disruption"
  | "how_to_harm";

export function detectHarmfulUserContent(text: string): HarmfulCategory | null {
  const t = normalize(text);
  if (!t) return null;

  for (const rule of HARMFUL_PATTERNS) {
    if (rule.pattern.test(t)) return rule.id as HarmfulCategory;
  }

  return null;
}

/** Từ chối cố định — không mô tả khu vui chơi, không “xoay” sang tips */
export function buildHarmfulRequestRefusal(): string {
  return (
    `Mình **không thể hỗ trợ** yêu cầu liên quan đến **phá hoại, bạo lực, gây nguy hiểm, lách quy định an toàn** hoặc **hành vi vi phạm pháp luật / nội quy công viên**.\n\n` +
    `Nếu bạn cần thông tin **hợp pháp** tại **VinWonders Phú Quốc** (lịch trình, địa điểm gần nhất, chỉ đường, quy định an toàn chính thức), hãy hỏi cụ thể — mình sẽ hỗ trợ trong phạm vi đó.`
  );
}
