"use client";
import { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
type State = {
  connected: boolean;
  connection?: { externalIdentity: string; createdAt: string } | null;
  botUsername?: string | null;
};
export function TelegramConnection() {
  const [state, setState] = useState<State | null>(null);
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/backend/api/channels/telegram", {
      cache: "no-store",
    });
    if (response.ok) setState(await response.json());
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function issue() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/backend/api/channels/telegram", {
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.error === "telegram_not_configured"
            ? "The Auctor Telegram bot is not configured on this deployment."
            : "A pairing code could not be created.",
        );
      setCode(body.code);
      setExpiresAt(body.expiresAt);
      setState((current) => ({
        ...current,
        connected: false,
        botUsername: body.botUsername,
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pairing failed.");
    } finally {
      setBusy(false);
    }
  }
  async function disconnect() {
    setBusy(true);
    await fetch("/backend/api/channels/telegram", { method: "DELETE" });
    setCode("");
    await load();
    setBusy(false);
  }
  const username = state?.botUsername ?? "auctorOnchainBot";
  return (
    <section className="telegramConnection">
      <div>
        <span>Command your agent anywhere</span>
        <h2>
          {state?.connected
            ? "Telegram agent connected"
            : "Connect your Auctor agent"}
        </h2>
        <p>
          {state?.connected
            ? "Talk to your Auctor agent from anywhere in plain English. Ask for portfolio updates, research, or a guarded trade preview."
            : "Pair Telegram with this Auctor agent, then use plain-English commands from anywhere."}
        </p>
      </div>
      {state?.connected ? (
        <div className="telegramConnected">
          <b>Chat ID {mask(state.connection?.externalIdentity ?? "")}</b>
          <button
            type="button"
            onClick={() => void disconnect()}
            disabled={busy}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="telegramPairing">
          {code ? (
            <>
              <div className="pairingCode">
                <b>{code}</b>
                <button
                  type="button"
                  aria-label="Copy pairing command"
                  onClick={async () => {await navigator.clipboard.writeText("/connect " + code);setCopied(true);window.setTimeout(()=>setCopied(false),1800)}}
                >
                  <Copy /> {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p>
                Send <code>/connect {code}</code> to <b>@{username}</b> before{" "}
                {new Date(expiresAt).toLocaleTimeString()}.
              </p>
              <a
                href={`https://t.me/${username}`}
                target="_blank"
                rel="noreferrer"
              >
                Open @{username} <ExternalLink />
              </a>
            </>
          ) : (
            <button type="button" onClick={() => void issue()} disabled={busy}>
              {busy ? "Creating code" : "Generate pairing code"}
            </button>
          )}
        </div>
      )}
      {message && (
        <p className="telegramError" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
function mask(value: string) {
  return value.length > 6 ? `${value.slice(0, 3)}...${value.slice(-3)}` : value;
}
