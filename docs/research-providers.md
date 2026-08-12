# Auctor research providers

## MVP

- CoinGecko x402 supplies market prices and token/pool onchain data. Its x402 endpoints are experimental, cost $0.01 USDC per request at verification time, and advertise Base or Solana settlement. Auctor uses the KeeperHub agent wallet and the Base payment option.
- CoinMarketCap x402 supplies market quotes and metadata fallback. Its official examples charge $0.01 USDC per request using USDC on Base mainnet.
- RESEARCH_USD_PER_DAY is an application policy ceiling, not a stored balance. Actual payments leave the provisioned agent wallet and are stored in the research purchase ledger with provider, price, response hash and payment transaction when returned.

For non-crypto-native onboarding, present one instruction: fund the agent's Research balance with Base USDC. This is a purpose-specific view and budget over the same agent wallet, not a second wallet.

## Keyed demo feeds

- Crypto News API offers JSON news, article sentiment, trending headlines and whale transactions. Registration includes a free trial and it is the best narrow demo candidate for news and sentiment.
- Messari provides API-key access. Its free MessariAI allowance is 10 calls per day, while News and specialist datasets may be Enterprise-gated.
- CoinDesk Data has a Personal plan for non-commercial projects with capped lifetime calls. Commercial/start-up usage requires the appropriate licence.

None of these three providers had an official x402 buyer endpoint verified on 2026-08-12. They must use server-side API keys and must not be recorded as x402 payments.

## V2 candidates

Allium announced live x402 onchain data and an agent interface, initially on Base Sepolia. Add it after a stable mainnet endpoint and request contract are documented and tested.
