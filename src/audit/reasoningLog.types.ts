import type { NormalizedIdentityVendorResult } from "../orchestration/identity/identity.types.js";
import type { PolicyResult } from "../policy/policy.types.js";
import type { VendorKycResult } from "../vendors/common/vendorResult.types.js";

export type ReasoningLogId = string;

interface BaseReasoningLogEntry {
  reasoning_log_id: ReasoningLogId;
  tool_called: string;
  agent_id: string;
  vendor_used: string;
  reason: string;
  created_at: string;
}

export interface IdentityReasoningLogEntry extends BaseReasoningLogEntry {
  external_user_id: string;
  jurisdiction: string;
  vendor_result: VendorKycResult;
  normalized_result: NormalizedIdentityVendorResult;
  risk_score: number;
  policy_result: PolicyResult;
  final_result: "approved" | "review" | "rejected";
}

export interface LiquidityQuoteReasoningLogEntry extends BaseReasoningLogEntry {
  tool_called: "vela_liquidity_get_quote";
  vendor_used: "conduit";
  source_asset: string;
  source_amount: string;
  target_asset: string;
  target_network: string;
  quote_id: string;
  target_amount: string;
  effective_rate: number;
  pricing_model: string | null;
  spread_bps: number | null;
  expires_at: string;
}

export type ReasoningLogEntry = IdentityReasoningLogEntry | LiquidityQuoteReasoningLogEntry;

export type ReasoningLogDraft =
  | Omit<IdentityReasoningLogEntry, "reasoning_log_id" | "created_at">
  | Omit<LiquidityQuoteReasoningLogEntry, "reasoning_log_id" | "created_at">;
