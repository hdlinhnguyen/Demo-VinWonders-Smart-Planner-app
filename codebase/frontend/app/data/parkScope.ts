import { PARK_DATA } from "./locations";

/** Công viên duy nhất prototype hỗ trợ (mock_data + bản đồ) */
export const SUPPORTED_PARK_NAME = PARK_DATA.meta.park;

/** Sau normalize (bỏ dấu) */
const PHU_QUOC_CUE =
  /phu quoc|dao phu quoc|vinwonders?\s*phu quoc|vin wonders?\s*phu quoc/i;

/** Cơ sở VinWonders / địa điểm khác — chưa có dữ liệu trong repo */
/** Pattern chạy trên chuỗi đã bỏ dấu (normalize) */
const OTHER_PARK_LOCATIONS: { label: string; pattern: RegExp }[] = [
  {
    label: "VinWonders Nam Hội An / Hội An",
    pattern:
      /nam\s*hoi\s*an|vinwonders?\s*hoi\s*an|vin\s*wonders?\s*hoi\s*an|\bhoi\s*an\b/i,
  },
  {
    label: "VinWonders Nha Trang",
    pattern:
      /vinwonders?\s*nha\s*trang|vin\s*wonders?\s*nha\s*trang|\bnha\s*trang\b/i,
  },
  {
    label: "VinKE / VinWonders Hà Nội",
    pattern: /vinke|vinwonders?\s*ha\s*noi|times\s*city/i,
  },
  {
    label: "VinWonders (cơ sở khác / chưa xác định)",
    pattern: /vinwonders?\s*(da lat|sapa)/i,
  },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

/** Trả về tên cơ sở khác nếu user nhắc tới — null nếu chỉ trong phạm vi Phú Quốc */
export function detectOtherParkMention(text: string): string | null {
  const t = normalize(text);

  if (
    PHU_QUOC_CUE.test(t) &&
    !/(hoi an|nha trang|vinke|ha noi|nam hoi an)/.test(t)
  ) {
    return null;
  }

  for (const loc of OTHER_PARK_LOCATIONS) {
    if (loc.pattern.test(t)) return loc.label;
  }

  // "Vin Wonder(s)" + tên thành phố khác, không nhắc Phú Quốc
  if (
    /vin\s*wonders?/.test(t) &&
    !PHU_QUOC_CUE.test(t) &&
    /(hoi an|nha trang|ha noi|da lat|sapa)/.test(t)
  ) {
    return "VinWonders (cơ sở ngoài Phú Quốc)";
  }

  return null;
}

export function buildUnsupportedParkReply(mentionedPark: string): string {
  return (
    `Hiện trợ lý này **chỉ hỗ trợ ${SUPPORTED_PARK_NAME}** (bản đồ & 64 địa điểm trong app).\n\n` +
    `Bạn đang nhắc tới **${mentionedPark}** — cơ sở này **chưa được hỗ trợ** trên phiên bản demo.\n\n` +
    `**Bạn có thể:**\n` +
    `1. Nếu đang ở **${SUPPORTED_PARK_NAME}**, mở **Bản đồ & địa điểm** trên app rồi hỏi lại (vd: lịch trình buổi sáng, địa điểm gần nhất).\n` +
    `2. Hỏi lịch trình / “gần nhất” / trạm y tế **trong ${SUPPORTED_PARK_NAME}**.\n` +
    `3. Tra cứu **${mentionedPark}** trên website/app chính thức của VinWonders.\n\n` +
    `Bạn trả lời nếu muốn mình lên kế hoạch cho **${SUPPORTED_PARK_NAME}** nhé!`
  );
}
