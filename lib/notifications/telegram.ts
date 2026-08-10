import type { Result } from "../result.ts";
export interface NotificationMessage { readonly chatId: string; readonly text: string; }
export type NotificationResult = { readonly delivered: boolean; readonly preview: boolean; readonly messageId: number | null; readonly reason?: "telegram_not_configured" | "telegram_failed"; };
export function createTelegramNotifier(deps: { token: string | null; mockMode: boolean; fetch?: typeof globalThis.fetch }) {
  return { async send(message: NotificationMessage): Promise<NotificationResult> {
    if (deps.mockMode) return { delivered: false, preview: true, messageId: null };
    if (!deps.token) return { delivered: false, preview: false, messageId: null, reason: "telegram_not_configured" };
    const response = await (deps.fetch ?? fetch)(`https://api.telegram.org/bot${deps.token}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: message.chatId, text: message.text }) });
    if (!response.ok) return { delivered: false, preview: false, messageId: null, reason: "telegram_failed" };
    const body = await response.json() as { result?: { message_id?: number } };
    return { delivered: true, preview: false, messageId: body.result?.message_id ?? null };
  } };
}