# Auctor

Auctor is an operating system for onchain capital. It turns a plain-language objective into a reviewable, policy-bounded action and keeps the resulting context available across sessions and devices.

## What Auctor does

- Accepts natural-language commands through the chat workspace.
- Recalls encrypted, user-scoped memory from the AgentQA service.
- Converts supported commands into bounded action templates.
- Applies deterministic limits for chain, asset, amount, slippage, and daily spend.
- Simulates the exact KeeperHub request before any submission.
- Records policy decisions, simulation results, receipts, and notification delivery in PostgreSQL.
- Presents an evidence dossier for every confirmed, refused, pending, or failed decision.

## Product surfaces

- `https://api.auctor.space/chat` � command workspace and reviewable action previews.
- `https://api.auctor.space/audit` � evidence dossiers and execution history.
- `https://api.auctor.space/api/health` � effective capability health without credentials.
- `/api/chat` � conversation, memory, policy, and simulation orchestration.
- `/api/chat/approve` � explicit approval boundary for eligible actions.

## Safety and custody

Auctor never gives a language model authority to spend funds. Application code constructs the allowed request, deterministic policy evaluates it, and KeeperHub remains the sole execution boundary. A request must pass simulation before it can be considered for approval. Missing policy, balance, market, or receipt evidence fails closed.

Every memory operation is authenticated to a user-specific AgentQA namespace. A user can recover their own context on another device; one user cannot recall another user�s memory.

No transaction is broadcast without explicit approval of the exact simulated parameters.

## Local development

Requirements: Node.js 22.6 or newer, PostgreSQL, and the AgentQA memory service.

```bash
npm ci
cp .env.example .env
npx drizzle-kit migrate
npm run typecheck
npm test
npm run build
npm run dev
```

Open `http://127.0.0.1:3200/chat`.

Keep `.env` outside version control. KeeperHub, database, AgentQA, notification, and model credentials are server-only.

## Configuration

Copy `.env.example` and provide the deployment-specific values. In production, provide a valid `KEEPERHUB_WALLET_ADDRESS`, KeeperHub credentials, PostgreSQL URL, and authenticated AgentQA configuration. The public health endpoint reports only whether each capability is configured and reachable.

## Release and deployment

Pull requests run type checking, the complete test suite, and the production build. A passing push to `main` builds an immutable image tagged with the commit SHA, publishes it to GHCR, runs database migrations on the VPS, replaces the application container, waits for health, and verifies the public API.

The production environment keeps `.env`, database volumes, AgentQA data, and ingress configuration on the server. They are never committed or baked into an image. See the local operator notes for GitHub environment setup and the one-time VPS bootstrap.

## Architecture

```text
User command
    ?
Authenticated AgentQA recall
    ?
Bounded action template
    ?
Deterministic policy and spend limits
    ?
KeeperHub simulation
    ?
Explicit approval
    ?
KeeperHub execution ? verified receipt ? PostgreSQL audit ? notifications
```

Auctor�s product is the running, inspectable system: its policy decisions, simulations, memory boundaries, receipts, and health state are available through the product surfaces above.