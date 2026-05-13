import type { NormalizedIdentityVendorResult } from "../orchestration/identity/identity.types.js";
import type { PolicyEvaluation } from "./policy.types.js";

export function evaluatePolicy(vendorResult: NormalizedIdentityVendorResult): PolicyEvaluation {
  if (vendorResult.result === "approved") {
    return {
      policy_result: "allowed",
      reasons: ["Demo policy allows approved identity results"]
    };
  }

  if (vendorResult.result === "rejected") {
    return {
      policy_result: "blocked",
      reasons: ["Demo policy blocks rejected identity results"]
    };
  }

  return {
    policy_result: "manual_review",
    reasons: ["Demo policy sends review identity results to manual review"]
  };
}
