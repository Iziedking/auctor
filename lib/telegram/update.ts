import { createChannelPairingService } from "../auth/channel-service.ts";
import type { ChatPipelineResult } from "../chat/pipeline.ts";
export type TelegramUpdate = {
  message?: { message_id: number; chat: { id: number }; text?: string };
};
export function parseTelegramUpdate(value: unknown): TelegramUpdate | null {
  if (!value || typeof value !== "object") return null;
  const update = value as TelegramUpdate;
  const message = update.message;
  if (
    !message ||
    !Number.isInteger(message.chat?.id) ||
    typeof message.text !== "string"
  )
    return null;
  return update;
}
export async function handlePairingCommand(input: {
  text: string;
  chatId: string;
  pairing: ReturnType<typeof createChannelPairingService>;
}) {
  const match = /^\/start\s+([0-9]{6})$/i.exec(input.text.trim());
  if (!match) return null;
  const paired = await input.pairing.redeem({
    provider: "telegram",
    externalIdentity: input.chatId,
    code: match[1]!,
  });
  return paired
    ? "Telegram connected to your Auctor agent. You can now chat here and receive transaction updates."
    : "That pairing link is invalid or expired. Generate a new one from Notifications on auctor.space.";
}
export async function handleConnectCommand(input: {
  text: string;
  chatId: string;
  pairing: ReturnType<typeof createChannelPairingService>;
}) {
  const match = /^\/connect\s+(\d{6})$/i.exec(input.text.trim());
  if (!match) return null;
  const paired = await input.pairing.redeem({
    provider: "telegram",
    externalIdentity: input.chatId,
    code: match[1]!,
  });
  return paired
    ? "Telegram connected to your Auctor agent. You can now chat here and receive transaction updates."
    : "That pairing code is invalid or expired. Generate a new code from Notifications on auctor.space.";
}
export function telegramChatText(result: ChatPipelineResult) {
  if (result.kind === "message") return result.message;
  if (result.kind === "refused")
    return `Auctor stopped safely: ${friendlyReason(result.reason)}`;
  return [
    `Preview ready: ${result.trade.amount} ${result.trade.tokenIn} → ${result.trade.tokenOut} on ${result.trade.chain}.`,
    result.simulation?.wouldRevert
      ? "Simulation would revert."
      : "Simulation passed.",
    `To execute, send: /approve swap ${result.trade.amount} ${result.trade.tokenIn} to ${result.trade.tokenOut} on ${result.trade.chain}`,
  ].join("\n");
}
function friendlyReason(reason:string){const messages:Record<string,string>={token_not_found_on_chain:"I could not find that token on this network. Use its contract address or confirm the symbol and network.",token_symbol_ambiguous_use_address:"That symbol matches multiple tokens. Send the token contract address.",unsupported_intent:"I need a clearer request. Ask for your balance, portfolio, research, or an exact swap.",token_approval_required_before_swap:"The input token needs approval before it can be swapped."};return messages[reason]??reason.replaceAll("_"," ")}
