export interface LiquidityQuoteRequest {
  source_asset: string;
  source_amount: string;
  target_asset: string;
  target_network: string;
  idempotency_key: string;
}

export interface GetLiquidityQuoteCommand {
  agentToken: string;
  payload: LiquidityQuoteRequest;
}

export interface NormalizedLiquidityQuote {
  quote_id: string;
  vendor: "conduit";
  source_asset: string;
  source_amount: string;
  target_asset: string;
  target_network: string;
  target_amount: string;
  effective_rate: number;
  pricing_model: string | null;
  spread_bps: number | null;
  expires_at: string;
  created_at: string;
}

export interface LiquidityQuoteResponse extends NormalizedLiquidityQuote {
  reasoning_log_id: string;
}
