import { ALL_LOCATIONS, PARK_DATA } from "./locations";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

/** Câu hỏi cần thông tin không có trong mock_data — trả lời cố định, không gọi LLM */
export type UnverifiedInfoKind = "ticket_price" | "show_schedule";

export function detectUnverifiedInfoRequest(
  text: string
): UnverifiedInfoKind | null {
  const t = normalize(text);

  if (
    /gia ve|gia tien|bao nhieu tien|combo|uu dai|mien phi|ve vao|ve cuop|bang gia|price/.test(
      t
    )
  ) {
    return "ticket_price";
  }

  if (
    /lich show|gio show|gio bieu dien|suat dien|lich dien|may gio.*(show|dien)|show.*may gio|bieu dien.*may gio|khung gio.*show/.test(
      t
    )
  ) {
    return "show_schedule";
  }

  return null;
}

export function buildUnverifiedInfoReply(kind: UnverifiedInfoKind): string {
  if (kind === "ticket_price") {
    return (
      `**Giá vé / combo** không có trong dữ liệu mock_data của app — mình **không thể** đưa mức giá cụ thể.\n\n` +
      `Vui lòng kiểm tra **website hoặc app chính thức VinWonders Phú Quốc** (hoặc quầy vé tại cổng) để xem giá và ưu đãi **đã được cập nhật**.\n\n` +
      `Mình có thể giúp bạn **lên lịch tham quan** và **gợi ý địa điểm** có trong bản đồ (64 điểm) nếu bạn cần.`
    );
  }

  return (
    `**Lịch show / giờ biểu diễn cụ thể** không có trong mock_data — mình **không thể** khẳng định suất diễn hay giờ diễn chính xác.\n\n` +
    `Hãy xem **bảng lịch trên website/app chính thức** hoặc hỏi **quầy thông tin** tại công viên.\n\n` +
    `Trong app, mình chỉ gợi ý **địa điểm / khu** liên quan show (nếu có trong danh mục) — không bịa giờ diễn.`
  );
}

/** Block ghép vào system message mỗi lần gọi LLM */
export function buildHallucinationControlBlock(): string {
  const names = ALL_LOCATIONS.map((l) => l.name);
  const sample = names.slice(0, 8).join(", ");

  return [
    "## Hallucination control (BẮT BUỘC)",
    `Danh mục địa điểm: **${ALL_LOCATIONS.length}** tên trong mock_data ${PARK_DATA.meta.park} (vd: ${sample}…).`,
    "- **Chỉ** nhắc trò chơi / điểm / khu có **đúng tên** trong danh mục trên. **Không** tạo địa điểm, trò chơi, show, nhà hàng mới.",
    "- **Giá vé, combo, ưu đãi:** mock_data **không có** — **không** đưa số tiền; nói *chưa kiểm chứng / chưa cập nhật trong app* và hướng website/app chính thức.",
    "- **Lịch show / giờ biểu diễn cụ thể:** mock_data **không có** — **không** bịa HH:MM show; hướng quầy thông tin hoặc nguồn chính thức.",
    `- **Giờ mở cửa:** chỉ nêu khi trùng **openingHours** của địa điểm trong danh mục (mô tả từng điểm); **không** khẳng định giờ cả công viên nếu không có trong dữ liệu.`,
    "- **Không chắc** → trả lời: *\"Thông tin này chưa được kiểm chứng / cập nhật trong hệ thống demo; vui lòng xác nhận trên kênh chính thức VinWonders Phú Quốc.\"*",
    "- Lịch trình gợi ý: dùng **tên địa điểm thật** + khung giờ **ước lượng** (sáng/trưa/chiều); **không** ghi giờ show cụ thể.",
  ].join("\n");
}
