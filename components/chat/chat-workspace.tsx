"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { isCapturedMockApprovalPreview } from "../../lib/chat/approval-ui";

type ChatResult = {
  kind: string;
  conversationId?: string;
  message?: string;
  reason?: string;
  recalledMemory?: readonly string[];
  trade?: { amount: string; tokenIn: string; tokenOut: string; chain: string };
  simulation?: { gasEstimate: string; wouldRevert: boolean };
  approvalRequired?: boolean;
  checks?: readonly string[];
  request?: { chainId: string; action: { functionName: string; to: string } };
};
type ApprovalResult =
  | { kind: "executed"; audit: { id: string; status: string; transactionHash?: string } }
  | { kind: "refused"; error: { code: string; message: string } }
  | { kind: "unavailable"; reason: string }
  | { error: string; reason?: string };
type Health = { execution: string; memory: { state: string }; approval: { available: boolean; mode: "fixture" } };

export function ChatWorkspace() {
  const [text, setText] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [result, setResult] = useState<ChatResult | null>(null);
  const [approval, setApproval] = useState<ApprovalResult | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [approving, setApproving] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch("/backend/api/health")
      .then((response) => response.ok ? response.json() : null)
      .then((value) => setHealth(value as Health | null))
      .catch(() => setHealth(null));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const command = text.trim();
    if (!command || busy) return;
    setBusy(true);
    setApproval(null);
    try {
      const payload = { text: command, correlationId: "chat-" + Date.now(), ...(conversationId ? { conversationId } : {}) };
      const response = await fetch("/backend/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const next = await response.json() as ChatResult;
      setResult(next);
      setSubmittedText(command);
      if (next.conversationId) setConversationId(next.conversationId);
    } finally {
      setBusy(false);
    }
  }

  async function approveFixture() {
    if (!result || !health?.approval.available || !isCapturedMockApprovalPreview(result) || approving) return;
    setApproving(true);
    setApproval(null);
    try {
      const response = await fetch("/backend/api/chat/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: submittedText, correlationId: "approval-" + Date.now(), recalledMemory: result.recalledMemory ?? [] }),
      });
      setApproval(await response.json() as ApprovalResult);
    } catch {
      setApproval({ kind: "unavailable", reason: "The fixture approval service could not be reached." });
    } finally {
      setApproving(false);
    }
  }

  const approvable = isCapturedMockApprovalPreview(result);
  return <section className="chatWorkspace" aria-label="Chat workspace">
    <header className="chatHeader"><div><p className="chatKicker">AUCTOR / COMMAND INTAKE</p><h1>Decision console</h1><p>State an intent in plain language. Auctor will classify it, apply a fixed template, and show a preview.</p></div><div className="chatHeaderMeta"><span className="chatMode">MOCK / FIXTURE EXECUTION</span>{health && <span className="chatHealth">EXEC / {health.execution.toUpperCase()} - MEMORY / {health.memory.state.toUpperCase()}</span>}</div></header>
    <div className="chatBody"><div className="chatTranscript" aria-live="polite"><div className="chatNotice"><strong>SAFE MODE</strong><span>Approval replays captured evidence through the mock execution path. It never broadcasts a transaction.</span></div>
      {result ? <article className={"chatResult " + result.kind}><span className="chatResultLabel">{result.kind.toUpperCase()}</span>{result.message && <p>{result.message}</p>}{result.reason && <p>{result.reason}</p>}{result.trade && <h2>{result.trade.amount} {result.trade.tokenIn} → {result.trade.tokenOut}</h2>}{result.request && <dl><dt>NETWORK</dt><dd>{result.trade?.chain.toUpperCase()} / {result.request.chainId}</dd><dt>CALL</dt><dd>{result.request.action.functionName}</dd><dt>ROUTER</dt><dd>{result.request.action.to}</dd>{result.simulation && <><dt>GAS UNITS</dt><dd>{result.simulation.gasEstimate}</dd><dt>SIMULATION</dt><dd>{result.simulation.wouldRevert ? "WOULD REVERT" : "PASSED / FIXTURE"}</dd></>}{result.approvalRequired && <><dt>APPROVAL</dt><dd>REQUIRED BEFORE MOCK EXECUTION</dd></>}</dl>}{result.checks?.length ? <div className="previewChecks">{result.checks.map((check) => <span key={check}>✓ {check.replaceAll("_", " ")}</span>)}</div> : null}{result.recalledMemory?.length ? <div className="recalled"><b>RECALLED MEMORY</b>{result.recalledMemory.map((item) => <p key={item}>{item}</p>)}</div> : null}
        {approvable && <div className="approvalPanel"><b>CAPTURED MOCK TRADE</b><p>Only the recorded Base trade, 0.001 ETH to USDC, can run here.</p><button type="button" onClick={approveFixture} disabled={!health?.approval.available || approving}>{approving ? "REPLAYING..." : "APPROVE FIXTURE EXECUTION"}</button>{!health?.approval.available && <small>Unavailable until mock mode, Postgres, and AUCTOR_AGENT_ID are configured.</small>}</div>}
        {approval && <div className={"approvalResult " + ("kind" in approval ? approval.kind : "error")}><b>APPROVAL RESULT</b>{"audit" in approval ? <p>Audit {approval.audit.id}: {approval.audit.status}{approval.audit.transactionHash ? ` / ${approval.audit.transactionHash}` : ""}</p> : <p>{"error" in approval ? (typeof approval.error === "string" ? approval.error : `${approval.error.code}: ${approval.error.message}`) : approval.reason}</p>}</div>}
      </article> : <p className="chatEmpty">No command received. Try <code>swap 0.001 ETH to USDC on base</code>.</p>}
    </div><form className="chatComposer" onSubmit={submit}><label htmlFor="chat-input">COMMAND</label><textarea id="chat-input" value={text} onChange={(event) => setText(event.target.value)} placeholder="swap 0.001 ETH to USDC on base" rows={3} /><button type="submit" disabled={busy}>{busy ? "CLASSIFYING..." : "RUN PREVIEW"}</button></form></div>
  </section>;
}
