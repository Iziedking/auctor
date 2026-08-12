export const KEEPERHUB_STABLE_CHAINS = [
  { id: "1", name: "Ethereum" },
  { id: "8453", name: "Base" },
  { id: "42161", name: "Arbitrum" },
  { id: "10", name: "Optimism" },
  { id: "137", name: "Polygon" },
  { id: "56", name: "BNB Chain" },
  { id: "43114", name: "Avalanche" },
  { id: "130", name: "Unichain" },
] as const;

export const KEEPERHUB_STABLE_CHAIN_IDS = KEEPERHUB_STABLE_CHAINS.map(chain => chain.id);

export const KEEPERHUB_TEST_CHAINS = [
  { id: "11155111", name: "Ethereum Sepolia", faucetUrl: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia" },
  { id: "84532", name: "Base Sepolia", faucetUrl: "https://www.alchemy.com/faucets/base-sepolia" },
] as const;
export const KEEPERHUB_TEST_CHAIN_IDS = KEEPERHUB_TEST_CHAINS.map(chain => chain.id);

export type ChainEnvironment = "mainnet" | "testnet";
export function chainsForEnvironment(environment: ChainEnvironment) { return environment === "mainnet" ? KEEPERHUB_STABLE_CHAINS : KEEPERHUB_TEST_CHAINS; }
export function faucetForChain(chainId: string): string | null { return KEEPERHUB_TEST_CHAINS.find(chain => chain.id === chainId)?.faucetUrl ?? null; }
export function inferChainEnvironment(chainIds: readonly string[]): ChainEnvironment { return chainIds.some(id => KEEPERHUB_TEST_CHAINS.some(chain => chain.id === id)) ? "testnet" : "mainnet"; }
export function isLegacyMainnetDefault(chainIds: readonly string[]): boolean { return chainIds.length===KEEPERHUB_STABLE_CHAIN_IDS.length&&KEEPERHUB_STABLE_CHAIN_IDS.every((id,index)=>chainIds[index]===id); }
