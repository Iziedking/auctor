import { createPaymentSigner, KeeperHubClient, type PaymentSigner } from "@keeperhub/wallet";
import { decryptSignerSecret } from "./signer-secret.ts";

export function createKeeperHubPaymentSigner(input:{subOrgId:string;walletAddress:`0x${string}`;encryptedHmacSecret:string;encryptionKey:string;baseUrl?:string}):PaymentSigner{
  const hmacSecret=decryptSignerSecret(input.encryptedHmacSecret,input.encryptionKey);
  return createPaymentSigner({walletLoader:async()=>({subOrgId:input.subOrgId,walletAddress:input.walletAddress,hmacSecret}),clientFactory:wallet=>new KeeperHubClient(wallet,input.baseUrl?{baseUrl:input.baseUrl}:undefined)});
}
