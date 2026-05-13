import { saveReasoningLog } from "../../audit/reasoningLog.service.js";
import { authenticateAgent } from "../../auth/authenticateAgent.js";
import { VelaError } from "../../common/errors.js";
import { evaluatePolicy } from "../../policy/policyEngine.js";
import { mockKycVendor } from "../../vendors/kyc/mockKycVendor.adapter.js";
import type {
  IdentityVerificationResult,
  NormalizedIdentityVendorResult,
  VerifyIdentityCommand,
  VerifyIdentityResponse
} from "./identity.types.js";

export async function verifyIdentity(command: VerifyIdentityCommand): Promise<VerifyIdentityResponse> {
  if (!authenticateAgent(command.agentToken)) {
    throw new VelaError("Invalid demo agent token");
  }

  const vendorResult = await mockKycVendor.verifyIdentity(command.payload);
  const normalizedVendorResult = normalizeVendorResult(vendorResult);
  const policyEvaluation = evaluatePolicy(normalizedVendorResult);

  const reasoning_log_id = saveReasoningLog({
    tool_called: "vela_compliance_verify_identity",
    agent_id: "demo_customer_agent",
    external_user_id: command.payload.external_user_id,
    jurisdiction: command.payload.jurisdiction,
    vendor_used: mockKycVendor.name,
    vendor_result: vendorResult,
    normalized_result: normalizedVendorResult,
    risk_score: normalizedVendorResult.risk_score,
    policy_result: policyEvaluation.policy_result,
    final_result: normalizedVendorResult.result,
    reason: [...normalizedVendorResult.reasons, ...policyEvaluation.reasons].join("; ")
  });

  return {
    verification_id: normalizedVendorResult.verification_id,
    result: normalizedVendorResult.result,
    risk_score: normalizedVendorResult.risk_score,
    policy_result: policyEvaluation.policy_result,
    reasoning_log_id
  };
}

function normalizeVendorResult(vendorResult: {
  vendor_reference_id: string;
  decision: "pass" | "review" | "fail";
  risk_score: number;
  reasons: string[];
}): NormalizedIdentityVendorResult {
  const resultByDecision: Record<typeof vendorResult.decision, IdentityVerificationResult> = {
    pass: "approved",
    review: "review",
    fail: "rejected"
  };

  return {
    verification_id: vendorResult.vendor_reference_id.replace("mock_vendor", "kyc"),
    result: resultByDecision[vendorResult.decision],
    risk_score: vendorResult.risk_score,
    vendor_reference_id: vendorResult.vendor_reference_id,
    reasons: vendorResult.reasons
  };
}
