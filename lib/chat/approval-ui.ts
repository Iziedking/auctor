export type ApprovalPreview = {
  readonly kind: string;
  readonly trade?: {
    readonly amount: string;
    readonly tokenIn: string;
    readonly tokenOut: string;
    readonly chain: string;
  };
  readonly request?: { readonly chainId: string };
  readonly approvalRequired?: boolean;
};

export function isCapturedMockApprovalPreview(preview: ApprovalPreview | null): boolean {
  return preview?.kind === "preview"
    && preview.approvalRequired === true
    && preview.request?.chainId === "8453"
    && preview.trade?.chain.toLowerCase() === "base"
    && preview.trade.amount === "0.001"
    && preview.trade.tokenIn === "ETH"
    && preview.trade.tokenOut === "USDC";
}
