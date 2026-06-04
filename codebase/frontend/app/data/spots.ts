export type { Spot } from "./locations";
export {
  ALL_SPOTS as VINWONDERS_SPOTS,
  filterSpotsByText,
} from "./locations";

export const QUICK_CHIPS = [
  "Tôi đang ở đâu?",
  "Mạo hiểm gần tôi",
  "Cuối tuần này",
  "Gia đình có trẻ nhỏ",
  "Surprise me",
];

export const WELCOME_MESSAGE = `Chào bạn! Mình là trợ lý VinWonders — giúp bạn lên **lịch chơi trong vài phút**, không phải vài giờ.

Mình biết **vị trí chấm xanh** trên bản đồ và tính khoảng cách **theo đường route** (mock_data). Hỏi thử:
• **Tôi đang gần địa điểm nào nhất?**
• **Trò chơi mạo hiểm gần tôi nhất** là gì?

Bản đồ bên phải có **64 địa điểm**. Bấm **+ Chọn** hoặc **Chỉ đường** để xem lộ trình trên bản đồ.`;
