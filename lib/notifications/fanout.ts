import { createTelegramNotifier, type NotificationMessage, type NotificationResult } from "./telegram.ts";

export type NotificationSpec = NotificationMessage & { readonly channel: "telegram" };
export type FanoutResult = {
  readonly attempted: number;
  readonly delivered: number;
  readonly results: readonly NotificationResult[];
};

export function createNotificationFanout(deps: { readonly telegram: ReturnType<typeof createTelegramNotifier> }) {
  return {
    async send(specs: readonly NotificationSpec[]): Promise<FanoutResult> {
      const results: NotificationResult[] = [];
      for (const spec of specs) {
        if (spec.channel === "telegram") {
          results.push(await deps.telegram.send({ chatId: spec.chatId, text: spec.text }));
        }
      }
      return {
        attempted: results.length,
        delivered: results.filter((result) => result.delivered).length,
        results,
      };
    },
  };
}
