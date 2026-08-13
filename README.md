# Auctor

Auctor is a specialized memory-recall agent for onchain capital. It remembers a user's past activity, preferences, limits, research, and execution outcomes, then uses that context to make every future onchain interaction more useful and consistent.

Instead of treating each command as a blank session, Auctor combines long-lived memory with live market data and guarded onchain execution. Users can research, inspect balances, prepare transactions, approve actions, and retrieve evidence from one conversational interface across the web and Telegram.

## The core advantage: capital with memory

Onchain agents work better when they remember what came before. Auctor can recall previous decisions, risk preferences, network choices, research findings, refusals, simulations, and completed activity before responding to a new command.

This creates an agent that can understand instructions such as:

```text
Use the same risk limit as last time.
What happened with my previous Base trade?
Remember that I prefer Base and never exceed my daily limit.
Research this token, then prepare a guarded swap if it fits my policy.
```

Memory is encrypted, user-scoped, and available across sessions and communication channels. The goal is not merely to automate transactions, but to give each user an onchain agent that develops durable context around how their capital should operate.

## Research that pays for itself

Auctor can purchase specialized research through x402 using its provisioned agent wallet. Research spending is policy-bounded, recorded, and attached to the resulting evidence, allowing the agent to pay for the market intelligence it needs instead of depending entirely on static or free data.

The research layer can combine paid market and onchain data with news, sentiment, token discovery, persistent memory, and the user's operating rules before proposing an action.

## Working MVP

- Wallet authentication and per-user KeeperHub agent-wallet provisioning.
- Plain-language web and Telegram commands.
- Live native agent-wallet balance queries for Ethereum, Base, Ethereum Sepolia, and Base Sepolia.
- Visible agent-wallet address with a copy action and testnet funding guidance.
- Zero-native-balance funding alerts in balance responses.
- Uniswap Trading API quotes and calldata generation.
- BEST_PRICE Classic routing across Uniswap V2, V3, and V4 liquidity.
- Native-token swaps through Uniswap, mandatory KeeperHub simulation, explicit approval, execution, and receipt-backed audit.
- Honest ERC-20 approval boundary: ERC-20 inputs stop with an approval-required response instead of pretending approval occurred.
- Direct token-address input, chain-scoped DexScreener symbol discovery, and onchain symbol/decimal lookup.
- Encrypted AgentQA memory, PostgreSQL conversation history, x402 research, in-app notifications, and Telegram transaction updates.

## Supported networks

Mainnets:

- Ethereum
- Base
- Arbitrum
- Optimism
- Polygon
- BNB Chain
- Avalanche
- Unichain

Testnets:

- Ethereum Sepolia
- Base Sepolia

Canonical Circle USDC addresses are used on Sepolia and Base Sepolia so testnet swaps do not depend on market-indexer symbol discovery.

## Demo flow

1. Connect a wallet and create an agent.
2. Copy the provisioned agent-wallet address from Agent or Command.
3. Fund that address on the network you intend to use. For the testnet demo, send Base Sepolia ETH to the agent wallet.
4. Ask `what is my testnet balance?` to read the agent wallet from Base Sepolia RPC.
5. Ask `swap 0.001 base sepolia eth to usdc`.
6. Review the Uniswap route and KeeperHub simulation.
7. Explicitly approve the exact preview.
8. Verify the receipt in Audit and the update in Notifications or Telegram.

Useful balance commands:

```text
what is my testnet balance?
what is my base balance?
what is my ethereum balance?
```

## Product surfaces

- `https://auctor.space/` — authentication and onboarding.
- `https://auctor.space/agent` — agent identity, policy, wallet, and capabilities.
- `https://auctor.space/chat` — commands, research, previews, approval, and execution.
- `https://auctor.space/portfolio` — live agent-wallet balance view.
- `https://auctor.space/audit` — policy, simulation, transaction, and receipt evidence.
- `https://auctor.space/notifications` — in-app execution history and Telegram pairing.
- `https://api.auctor.space/api/health` — credential-safe production capability health.

## Safety and custody

A language model never receives direct spending authority. Application code constructs the transaction, deterministic policy checks chain, asset, amount, slippage, balance, daily spend, and approval requirements, and KeeperHub remains the execution boundary.

Every swap must pass KeeperHub simulation. No transaction is broadcast without explicit approval of the exact simulated action. Missing configuration, policy, balance, simulation, or receipt evidence fails closed.

## Local development

Requirements: Node.js 22.6 or newer, PostgreSQL, and an AgentQA memory service.

```bash
npm ci
cp .env.example .env
npm run db:migrate
npm run typecheck
npm test
npm run build
npm run dev
```

Open `http://127.0.0.1:3200/`. Keep `.env` outside version control. KeeperHub, Uniswap, AgentQA, database, Telegram, research-provider, and model credentials are server-only.

## Production migration

The production Compose file provides a dedicated migration service. Use the same immutable image that will run the application:

```bash
cd /opt/auctor
AUCTOR_IMAGE=ghcr.io/iziedking/auctor:<commit-sha> \
  docker compose --env-file .env -f docker-compose.prod.yml run --rm migrate
```

Do not run `npm run db:migrate` through the `app` service. Use the dedicated `migrate` service so its command, network, and database configuration remain consistent with production.

## Architecture

```text
Web or Telegram command
    ↓
Authenticated user + provisioned agent wallet
    ↓
AgentQA memory recall and intent routing
    ↓
Live balance / research / Uniswap quote
    ↓
Deterministic policy validation
    ↓
Mandatory KeeperHub simulation
    ↓
Explicit approval
    ↓
KeeperHub execution → verified receipt → PostgreSQL audit → web/Telegram update
```

## Current limitation

Balance questions and zero-native-balance funding alerts are live. Continuous alerts whenever any native or ERC-20 balance decreases on any supported chain require a scheduled watcher with persisted balance snapshots; that monitoring loop is not yet part of the MVP.

## Roadmap

Auctor is being developed into a single command surface for increasingly sophisticated onchain capital operations:

- Persistent multi-chain position monitoring with web and Telegram alerts.
- Automated detection of native-token and ERC-20 balance changes.
- Liquidity provision and active liquidity-position management.
- Cross-chain capital routing based on cost, liquidity, risk, and remembered preferences.
- Guarded large-value money movement with stronger approval, simulation, and evidence policies.
- Meme-token discovery and policy-bounded sniping with liquidity, contract, and execution-risk checks.
- Portfolio-wide position monitoring, profit/loss context, exposure limits, and exit rules.
- Recurring strategies and autonomous actions operating only inside user-defined authority.
- A richer plugin ecosystem for onchain protocols, research providers, execution venues, and notification channels.

The long-term experience is intentionally simple: remember the user's capital history, gather or purchase the required intelligence, and coordinate complex onchain activity from one place with a command.

See [RUNBOOK.md](RUNBOOK.md) for deployment, migration, health verification, and recovery procedures.
