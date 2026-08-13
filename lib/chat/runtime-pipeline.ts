import { createLiveChatPipeline } from "./live-pipeline.ts";
import { createChatPipeline } from "./pipeline.ts";
import { createKeeperHubClient } from "../keeperhub/client.ts";
import { createMockKeeperHubClient } from "../keeperhub/mock.ts";
import type { Address, KeeperHubClient } from "../keeperhub/types.ts";
interface RuntimeChatConfig { readonly mockMode: boolean; readonly keeperhub: { readonly baseUrl: string; readonly apiKey: string | null; readonly walletAddress: string | null }; }
type RuntimeConfig=RuntimeChatConfig&{readonly uniswap?:{readonly apiKey:string|null;readonly baseUrl:string}};
interface RuntimeChatFactories { readonly createLiveClient: (input: { readonly baseUrl: string; readonly apiKey: string | null }) => Pick<KeeperHubClient, "simulate">; readonly createMockClient: () => Pick<KeeperHubClient, "simulate">; }
const defaults: RuntimeChatFactories = { createLiveClient: createKeeperHubClient, createMockClient: createMockKeeperHubClient };
export function createRuntimeChatPipeline(config: RuntimeConfig, factories: RuntimeChatFactories = defaults) {
  if (config.mockMode) return createChatPipeline({ mode: "mock", chains: { base: "8453" }, tokens: { USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", ETH: "0x4200000000000000000000000000000000000006", WETH: "0x4200000000000000000000000000000000000006" }, router: "0x2626664c2603336E57B271c5C0b26F421741e481", simulator: factories.createMockClient() });
  if (!config.keeperhub.walletAddress || !/^0x[0-9a-fA-F]{40}$/.test(config.keeperhub.walletAddress)) throw new Error("KEEPERHUB_WALLET_ADDRESS must be a valid EVM address in live mode.");
  const live={ walletAddress: config.keeperhub.walletAddress as Address, simulator: factories.createLiveClient({ baseUrl: config.keeperhub.baseUrl, apiKey: config.keeperhub.apiKey }) }; return config.uniswap?.apiKey?createLiveChatPipeline({...live,uniswap:{apiKey:config.uniswap.apiKey,baseUrl:config.uniswap.baseUrl}}):createLiveChatPipeline(live);
}
