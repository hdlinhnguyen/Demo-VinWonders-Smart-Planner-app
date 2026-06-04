export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}
export type PathType = "happy" | "low-confidence" | "failure" | "correction";