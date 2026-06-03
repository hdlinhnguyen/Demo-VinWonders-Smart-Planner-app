export type { Spot } from "./locations";
export {
  ALL_SPOTS as VINWONDERS_SPOTS,
  filterSpotsByText,
} from "./locations";

export const QUICK_CHIPS = [
  "Cuối tuần này",
  "Gia đình có trẻ nhỏ",
  "Tôi đang ở đâu?",
  "Amazon Van",
  "Surprise me",
];

export const WELCOME_MESSAGE = `Chào bạn! Mình là trợ lý VinWonders — giúp bạn lên **lịch chơi trong vài phút**, không phải vài giờ.

Bản đồ bên phải có **64 địa điểm** thật từ dữ liệu công viên (mock_data). Bạn có thể:
• Bấm **+ Chọn** để thêm vào lịch trình
• Hỏi tên khu như **Thế giới Lốc xoáy**, **Amazon Van**, **Cổng vào**

Cho mình biết thêm:
• Bạn đi **mấy người**, có **trẻ nhỏ** không?
• Muốn chơi **nhẹ nhàng** hay **cảm giác mạnh**?
• Dự định đi **ngày nào**?`;
