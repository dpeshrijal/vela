export type VendorDecision = "pass" | "review" | "fail";

export interface VendorKycResult {
  vendor_reference_id: string;
  decision: VendorDecision;
  risk_score: number;
  document_status: "valid" | "unclear";
  liveness_status: "passed" | "failed";
  reasons: string[];
  vendor_session_id?: string;
  verification_url?: string;
  status?: string;
  raw_response_summary?: Record<string, unknown>;
}

export interface VendorLiquidityQuoteResult {
  vendor_quote_id: string;
  source: {
    asset: string;
    amount: string;
    network?: string;
  };
  target: {
    asset: string;
    amount: string;
    network?: string;
  };
  pricing_model?: string;
  spread_bps?: number;
  created_at: string;
  expires_at: string;
  raw_response_summary?: Record<string, unknown>;
}
