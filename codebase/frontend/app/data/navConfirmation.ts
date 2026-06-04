export interface NavSuggestion {
  id: string;
  name: string;
}

export function isNavConfirm(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^(có|co|ok|được|duoc|chỉ đường|chi duong|dẫn đường|dan duong|đi thôi|di thoi|muốn|muon|yes|y)\b/.test(
    t
  );
}

export function isNavDecline(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^(không|khong|ko|thôi|thoi|no|n|hủy|huy)\b/.test(t);
}

export function navConfirmReply(name: string): string {
  return (
    `Đã **highlight lộ trình** tới **${name}** trên bản đồ (màu cam).\n\n` +
    `Bấm **Ẩn lộ trình** trên panel bản đồ nếu không cần xem nữa.`
  );
}

export function navDeclineReply(): string {
  return "Đã hiểu. Nếu cần chỉ đường sau, cứ hỏi lại nhé.";
}
