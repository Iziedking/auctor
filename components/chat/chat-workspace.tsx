"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Check, CheckCircle2, Circle, ExternalLink, X } from "lucide-react";
import { AuctorSymbol } from "../brand/auctor-symbols";

type ChatResult = {
  kind: string;
  conversationId?: string;
  message?: string;
  interpretation?: string;
  reason?: string;
  recalledMemory?: readonly string[];
  trade?: { amount: string; tokenIn: string; tokenOut: string; chain: string };
  simulation?: { gasEstimate: string; wouldRevert: boolean };
  approvalRequired?: boolean;
  checks?: readonly string[];
  request?: { chainId: string; action: { functionName: string; to: string } };
};
type ApprovalResult =
  | {
      kind: "executed";
      audit: { id: string; status: string; transactionHash?: string };
    }
  | { kind: "refused"; error: { code: string; message: string } }
  | { kind: "unavailable"; reason: string }
  | { error: string; reason?: string };
type Health = {
  execution: string;
  memory: { state: string };
  llm: string;
  database: string;
  approval: { available: boolean; mode: "live" | "fixture" };
};
type AgentProfile = {
  name: string;
  autonomyMode: string;
  budgetUsd: string;
  dailyCapUsd: string;
  khWalletAddress?: string | null;
};

const lifecycle = ["Interpret", "Recall", "Research", "Policy", "Simulate", "Approve", "Execute", "Audit"];

export function ChatWorkspace() {
  const [text, setText] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [result, setResult] = useState<ChatResult | null>(null);
  const [approval, setApproval] = useState<ApprovalResult | null>(null);
  const [conversationId, setConversationId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [approving, setApproving] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  useEffect(() => {
    void Promise.all([
      fetch("/backend/api/health", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((v) => setHealth(v as Health | null)),
      fetch("/backend/api/agent", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((v) => setAgent(v as AgentProfile | null)),
    ]).catch(() => undefined);
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const command = text.trim();
    if (!command || busy) return;
    setBusy(true);
    setApproval(null);
    try {
      const timeZone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const response = await fetch("/backend/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: command,
          correlationId: "chat-" + Date.now(),
          timeZone,
          ...(conversationId ? { conversationId } : {}),
        }),
      });
      const next = (await response.json()) as ChatResult;
      setResult(next);
      setSubmittedText(command);
      if (next.conversationId) setConversationId(next.conversationId);
    } finally {
      setBusy(false);
    }
  }
  async function approveTrade() {
    if (
      !result ||
      result.kind !== "preview" ||
      !health?.approval.available ||
      approving
    )
      return;
    setApproving(true);
    setApproval(null);
    try {
      const response = await fetch("/backend/api/chat/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: submittedText,
          correlationId: "approval-" + Date.now(),
          recalledMemory: result.recalledMemory ?? [],
        }),
      });
      setApproval((await response.json()) as ApprovalResult);
    } catch {
      setApproval({
        kind: "unavailable",
        reason: "The live execution service could not be reached.",
      });
    } finally {
      setApproving(false);
    }
  }
  const approvable =
    result?.kind === "preview" && result.approvalRequired === true;
  const stages = lifecycleState({ result, approval, busy, approving });
  return (
    <section className="chatWorkspace" aria-label="Auctor command center">
      <header className="chatHeader">
        <div>
          <p className="chatKicker">AUTONOMOUS CAPITAL COMMAND</p>
          <h1>
            {agent?.name ? `${agent.name} is ready.` : "Your agent is ready."}
          </h1>
          <p>
            Ask naturally. Auctor remembers your preferences, evaluates risk,
            simulates the action, and uses KeeperHub for approved execution.
          </p>
          {health?.llm === "disabled" && (
            <p className="capabilityWarning">
              Natural-language AI is not configured. Command is currently using
              the limited deterministic parser.
            </p>
          )}
        </div>
        <div className="instrumentStrip">
          <span>
            <AuctorSymbol name="execution" />
            <small>EXECUTION</small>
            <b>
              {health?.execution === "configured"
                ? "KeeperHub ready"
                : "Unavailable"}
            </b>
          </span>
          <span>
            <AuctorSymbol name="memory" />
            <small>MEMORY</small>
            <b>
              {health?.memory.state === "available"
                ? "AgentQA online"
                : (health?.memory.state ?? "Checking")}
            </b>
          </span>
          <span>
            <AuctorSymbol name="research" />
            <small>LANGUAGE</small>
            <b>
              {health?.llm === "configured" ? "LLM enabled" : "Parser only"}
            </b>
          </span>
        </div>
      </header>
      <div className="chatBody">
        <section className="agentContext" aria-label="Agent context">
          <div>
            <span>Agent</span>
            <b>{agent?.name ?? "Auctor"}</b>
          </div>
          <div>
            <span>Autonomy</span>
            <b>
              {agent?.autonomyMode === "autonomous"
                ? "Within your limits"
                : "Approval required"}
            </b>
          </div>
          <div>
            <span>Daily limit</span>
            <b>{agent ? `$${agent.dailyCapUsd}` : "Loading"}</b>
          </div>
          <div>
            <span>Agent wallet</span>
            <b>
              {agent?.khWalletAddress
                ? shortAddress(agent.khWalletAddress)
                : "KeeperHub provisioned"}
            </b>
          </div>
        </section>
        <div className="lifecyclePanel">
          <div className="lifecycleHeading"><span>COMMAND LIFECYCLE</span><b>{busy ? "Processing request" : result?.kind === "refused" ? "Stopped safely" : result?.kind === "preview" ? "Awaiting authorization" : approval && "audit" in approval ? "Receipt recorded" : "Ready"}</b></div>
          <ol className="executionLifecycle" aria-label="Execution lifecycle">
            {stages.map((stage) => <li key={stage.label} className={stage.state} aria-current={stage.state === "current" ? "step" : undefined}><span>{stage.state === "complete" ? <Check /> : stage.state === "stopped" ? <X /> : <Circle />}</span><div><b>{stage.label}</b><small>{stage.detail}</small></div></li>)}
          </ol>
        </div>
        <div className="conversationPanel">
          <div className="chatTranscript" aria-live="polite">
            {result ? (
              <article className={"chatResult " + result.kind}>
                <span className="chatResultLabel">
                  {result.kind === "preview"
                    ? "ACTION PREVIEW"
                    : result.kind.toUpperCase()}
                </span>
                {result.interpretation && <div className="interpretation"><span>UNDERSTOOD AS</span><p>{result.interpretation}</p></div>}
                {result.message && <p>{result.message}</p>}
                {result.reason && <p>{result.reason}</p>}
                {result.trade && (
                  <h2>
                    {result.trade.amount} {result.trade.tokenIn} <ArrowRight />{" "}
                    {result.trade.tokenOut}
                  </h2>
                )}
                {result.request && (
                  <div className="executionCard">
                    <div>
                      <span>Network</span>
                      <b>
                        {result.trade?.chain} / {result.request.chainId}
                      </b>
                    </div>
                    <div>
                      <span>Simulation</span>
                      <b
                        className={
                          result.simulation?.wouldRevert ? "danger" : "success"
                        }
                      >
                        {result.simulation?.wouldRevert
                          ? "Would revert"
                          : "Passed"}
                      </b>
                    </div>
                    <div>
                      <span>Execution</span>
                      <b>KeeperHub</b>
                    </div>
                    <div>
                      <span>Approval</span>
                      <b>
                        {result.approvalRequired ? "Required" : "Not required"}
                      </b>
                    </div>
                  </div>
                )}
                {result.checks?.length ? (
                  <div className="previewChecks">
                    {result.checks.map((check) => (
                      <span key={check}>
                        <CheckCircle2 />
                        {humanize(check)}
                      </span>
                    ))}
                  </div>
                ) : null}
                {result.recalledMemory?.length ? (
                  <div className="recalled">
                    <b>MEMORY USED FOR THIS DECISION</b>
                    {result.recalledMemory.map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </div>
                ) : null}
                {approvable && (
                  <div className="approvalPanel">
                    <b>Ready for guarded execution</b>
                    <p>
                      This exact simulated action will be checked against your
                      current budget again before KeeperHub submits it.
                    </p>
                    <button
                      type="button"
                      onClick={approveTrade}
                      disabled={!health?.approval.available || approving}
                    >
                      {approving
                        ? "Executing through KeeperHub…"
                        : "Approve and execute"}
                    </button>
                    {!health?.approval.available && (
                      <small>
                        Execution is temporarily unavailable. Your preview
                        remains safe and no transaction was submitted.
                      </small>
                    )}
                  </div>
                )}
                {approval && <ApprovalView approval={approval} />}
              </article>
            ) : (
              <div className="chatEmpty">
                <p>Start with a goal, not transaction syntax.</p>
                <div>
                  <button
                    type="button"
                    onClick={() => setText("Swap 0.001 ETH to USDC on Base")}
                  >
                    Swap ETH safely
                  </button>
                  <button
                    type="button"
                    onClick={() => setText("How is my portfolio?")}
                  >
                    Review my portfolio
                  </button>
                  <button
                    type="button"
                    onClick={() => setText("Remember: never risk more than 5%")}
                  >
                    Set a preference
                  </button>
                </div>
              </div>
            )}
          </div>
          <form className="chatComposer" onSubmit={submit}>
            <label htmlFor="chat-input">What should your agent do?</label>
            <textarea
              id="chat-input"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Ask about your portfolio, set a rule, or describe an onchain action…"
              rows={3}
            />
            <button type="submit" disabled={busy}>
              {busy ? "Thinking…" : "Send to Auctor"}
              <ArrowRight />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
function ApprovalView({ approval }: { approval: ApprovalResult }) {
  if ("audit" in approval)
    return (
      <div className="approvalResult executed">
        <AuctorSymbol name="execution" />
        <div>
          <b>Executed through KeeperHub</b>
          <p>
            Audit {approval.audit.id} · {approval.audit.status}
          </p>
          {approval.audit.transactionHash && (
            <p className="transactionHash">
              <ExternalLink />
              {approval.audit.transactionHash}
            </p>
          )}
        </div>
      </div>
    );
  const message =
    "error" in approval
      ? typeof approval.error === "string"
        ? approval.error
        : `${approval.error.code}: ${approval.error.message}`
      : approval.reason;
  return (
    <div className="approvalResult refused">
      <AuctorSymbol name="policy" />
      <div>
        <b>Execution stopped safely</b>
        <p>{message}</p>
      </div>
    </div>
  );
}
function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
function lifecycleState(input:{result:ChatResult|null;approval:ApprovalResult|null;busy:boolean;approving:boolean}){const memory=Boolean(input.result?.recalledMemory?.length);const research=Boolean(input.result&&"researchUsed"in input.result);const refused=input.result?.kind==="refused";const executed=Boolean(input.approval&&"audit"in input.approval);const approvalStopped=Boolean(input.approval&&!("audit"in input.approval));const details=["Intent bounded","Context recalled","Evidence gathered","Limits enforced","KeeperHub preview","Human gate","KeeperHub submit","Receipt trail"];return lifecycle.map((label,index)=>{let state:"complete"|"current"|"pending"|"stopped"="pending";if(input.busy||!input.result)state=index===0?"current":"pending";else if(refused)state=index<4?"complete":index===4?"stopped":"pending";else if(input.result.kind!=="preview")state=index===0||index===1&&memory||index===2&&research?"complete":index===3?"current":"pending";else if(executed)state="complete";else if(approvalStopped)state=index<6?"complete":index===6?"stopped":"pending";else if(input.approving)state=index<6?"complete":index===6?"current":"pending";else state=index<5?"complete":index===5?"current":"pending";return{label,state,detail:index===1&&!memory?"No relevant memory":index===2&&!research?"Not requested":details[index]!}})}
