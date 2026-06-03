export interface Spot {
  id: string;
  name: string;
  location: string;
  category: string;
  rating: number;
  waitTime: string;
  gradient: string;
  tags: string[];
}

export const VINWONDERS_SPOTS: Spot[] = [
  {
    id: "aquarium",
    name: "Thủy cung VinWonders",
    location: "Khu A · Phú Quốc",
    category: "Khám phá",
    rating: 4.8,
    waitTime: "~15 phút",
    gradient: "from-cyan-500 to-blue-700",
    tags: ["gia đình", "trẻ em", "thủy cung", "khám phá"],
  },
  {
    id: "rollercoaster",
    name: "Tàu lượn siêu tốc",
    location: "Khu cảm giác mạnh",
    category: "Mạo hiểm",
    rating: 4.9,
    waitTime: "~45 phút",
    gradient: "from-orange-500 to-red-600",
    tags: ["cảm giác mạnh", "tàu lượn", "mạo hiểm"],
  },
  {
    id: "waterpark",
    name: "Công viên nước",
    location: "Khu B · Phú Quốc",
    category: "Giải trí",
    rating: 4.7,
    waitTime: "~20 phút",
    gradient: "from-sky-400 to-indigo-600",
    tags: ["gia đình", "nước", "trẻ em", "bơi"],
  },
  {
    id: "show",
    name: "Show nhạc nước",
    location: "Quảng trường trung tâm",
    category: "Biểu diễn",
    rating: 4.9,
    waitTime: "19:30 hôm nay",
    gradient: "from-violet-500 to-purple-800",
    tags: ["show", "lịch diễn", "tối", "biểu diễn"],
  },
  {
    id: "food",
    name: "Khu ẩm thực",
    location: "Trung tâm công viên",
    category: "Ăn uống",
    rating: 4.5,
    waitTime: "Mở cả ngày",
    gradient: "from-amber-400 to-orange-600",
    tags: ["ăn", "uống", "nghỉ", "ẩm thực"],
  },
  {
    id: "kids",
    name: "Nhà banh & khu trẻ em",
    location: "Khu gia đình",
    category: "Trẻ em",
    rating: 4.6,
    waitTime: "~10 phút",
    gradient: "from-pink-400 to-rose-600",
    tags: ["trẻ em", "trẻ nhỏ", "gia đình", "nhẹ nhàng"],
  },
];

export const QUICK_CHIPS = [
  "Cuối tuần này",
  "Gia đình có trẻ nhỏ",
  "Trò chơi mạo hiểm",
  "Surprise me",
];

export const WELCOME_MESSAGE = `Chào bạn! Mình là trợ lý VinWonders — giúp bạn lên **lịch chơi trong vài phút**, không phải vài giờ.

Cho mình biết thêm:
• Bạn đi **mấy người**, có **trẻ nhỏ** không?
• Muốn chơi **nhẹ nhàng** hay **cảm giác mạnh**?
• Dự định đi **ngày nào**?

Chọn gợi ý bên dưới hoặc bấm **+ Chọn** ở panel bên phải để thêm vào lịch trình nhé.`;

export function filterSpotsByText(text: string, spots: Spot[]): Spot[] {
  const t = text.toLowerCase();
  if (!t.trim()) return spots;

  const matched = spots.filter((s) =>
    s.tags.some((tag) => t.includes(tag) || tag.includes(t.slice(0, 4)))
  );

  if (matched.length > 0) return matched;

  if (/vé|giá|combo/.test(t)) return spots.slice(0, 3);
  if (/giờ|mở cửa|show|lịch/.test(t)) return spots.filter((s) => s.id === "show" || s.id === "food");
  if (/surprise|bất ngờ|gợi ý/.test(t)) return [...spots].sort(() => Math.random() - 0.5).slice(0, 4);

  return spots;
}
