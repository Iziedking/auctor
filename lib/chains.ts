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

