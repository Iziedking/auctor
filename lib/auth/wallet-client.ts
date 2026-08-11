export interface Eip1193Request {
  readonly method: string;
  readonly params?: readonly unknown[];
}

export interface Eip1193Provider {
  request(input: Eip1193Request): Promise<unknown>;
}

interface WalletSignInOptions {
  readonly provider: Eip1193Provider | undefined;
  readonly fetcher?: typeof fetch;
}

export interface WalletSignInResult {
  readonly authenticated: boolean;
  readonly walletReady: boolean;
  readonly [key: string]: unknown;
}

function apiError(body: unknown, fallback: string): Error {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") return new Error(body.error);
  return new Error(fallback);
}

async function postJson(fetcher: typeof fetch, url: string, body: unknown): Promise<unknown> {
  const response = await fetcher(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result: unknown = await response.json();
  if (!response.ok) throw apiError(result, "Wallet sign-in failed.");
  return result;
}

export async function connectWalletWithSiwe(options: WalletSignInOptions): Promise<WalletSignInResult> {
  if (!options.provider) throw new Error("Install or enable an EIP-1193 wallet extension to continue.");
  const fetcher = options.fetcher ?? fetch;
  const accounts = await options.provider.request({ method: "eth_requestAccounts" });
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string") throw new Error("The wallet did not return an account.");
  const walletAddress = accounts[0];
  const chainHex = await options.provider.request({ method: "eth_chainId" });
  if (typeof chainHex !== "string" || !/^0x[0-9a-f]+$/i.test(chainHex)) throw new Error("The wallet returned an invalid chain id.");
  const chainId = Number.parseInt(chainHex.slice(2), 16);
  const challenge = await postJson(fetcher, "/backend/api/auth/siwe/challenge", { walletAddress, chainId });
  if (!challenge || typeof challenge !== "object" || !("message" in challenge) || typeof challenge.message !== "string") throw new Error("The SIWE challenge was invalid.");
  const message = challenge.message;
  const signature = await options.provider.request({ method: "personal_sign", params: [message, walletAddress] });
  if (typeof signature !== "string" || signature.length === 0) throw new Error("The wallet did not return a signature.");
  const result = await postJson(fetcher, "/backend/api/auth/siwe/verify", { message, signature, walletAddress, chainId });
  if (!result || typeof result !== "object" || !("authenticated" in result)) throw new Error("The SIWE verification response was invalid.");
  return result as WalletSignInResult;
}
