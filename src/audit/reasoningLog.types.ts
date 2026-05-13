import type { NormalizedIdentityVendorResult } from "../orchestration/identity/identity.types.js";
import type { PolicyResult } from "../policy/policy.types.js";
import type { VendorKycResult } from "../vendors/common/vendorResult.types.js";

export type ReasoningLogId = string;

export interface ReasoningLogEntry {
  reasoning_log_id: ReasoningLogId;
  tool_called: string;
  agent_id: string;
  external_user_id: string;
  jurisdiction: string;
  vendor_used: string;
  vendor_result: VendorKycResult;
  normalized_result: NormalizedIdentityVendorResult;
  risk_score: number;
  policy_result: PolicyResult;
  final_result: "approved" | "review" | "rejected";
  reason: string;
  created_at: string;
}
