export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}
export type PathType =
  | "general"
  | "happy"
  | "low-confidence"
  | "failure"
  | "correction";