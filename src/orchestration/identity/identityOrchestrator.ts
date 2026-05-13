import { saveReasoningLog } from "../../audit/reasoningLog.service.js";
import { authenticateAgent } from "../../auth/authenticateAgent.js";
import { VelaError } from "../../common/errors.js";
import { evaluatePolicy } from "../../policy/policyEngine.js";
import type { VendorKycResult } from "../../vendors/common/vendorResult.types.js";
import { getKycVendor } from "../../vendors/kyc/kycVendor.selector.js";
import type {
  IdentityVerificationResult,
  NormalizedIdentityVendorResult,
  GetIdentityResultCommand,
  GetIdentityResultResponse,
  VerifyIdentityCommand,
  VerifyIdentityResponse
} from "./identity.types.js";

export async function verifyIdentity(command: VerifyIdentityCommand): Promise<VerifyIdentityResponse> {
  if (!authenticateAgent(command.agentToken)) {
    throw new VelaError("Invalid demo agent token");
  }

  const kycVendor = getKycVendor();
  const vendorResult = await kycVendor.verifyIdentity(command.payload);
  const normalizedVendorResult = normalizeVendorResult(vendorResult);
  const policyEvaluation = evaluatePolicy(normalizedVendorResult);

  const reasoning_log_id = saveReasoningLog({
    tool_called: "vela_compliance_verify_identity",
    agent_id: "demo_customer_agent",
    external_user_id: command.payload.external_user_id,
    jurisdiction: command.payload.jurisdiction,
    vendor_used: kycVendor.name,
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
    reasoning_log_id,
    vendor_session_id: normalizedVendorResult.vendor_session_id,
    verification_url: normalizedVendorResult.verification_url,
    vendor_status: normalizedVendorResult.vendor_status
  };
}

export async function getIdentityResult(command: GetIdentityResultCommand): Promise<GetIdentityResultResponse> {
  if (!authenticateAgent(command.agentToken)) {
    throw new VelaError("Invalid demo agent token");
  }

  const kycVendor = getKycVendor();
  const vendorResult = await kycVendor.getIdentityResult(command.verificationId);
  const normalizedVendorResult = normalizeVendorResult(vendorResult);
  const policyEvaluation = evaluatePolicy(normalizedVendorResult);

  const reasoning_log_id = saveReasoningLog({
    tool_called: "vela_compliance_get_identity_result",
    agent_id: "demo_customer_agent",
    external_user_id: getSummaryString(vendorResult.raw_response_summary, "vendor_data") ?? "unknown",
    jurisdiction: "unknown",
    vendor_used: kycVendor.name,
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
    reasoning_log_id,
    vendor_session_id: normalizedVendorResult.vendor_session_id,
    verification_url: normalizedVendorResult.verification_url,
    vendor_status: normalizedVendorResult.vendor_status
  };
}

function normalizeVendorResult(vendorResult: VendorKycResult): NormalizedIdentityVendorResult {
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
    reasons: vendorResult.reasons,
    vendor_session_id: vendorResult.vendor_session_id,
    verification_url: vendorResult.verification_url,
    vendor_status: vendorResult.status,
    raw_response_summary: vendorResult.raw_response_summary
  };
}

function getSummaryString(summary: Record<string, unknown> | undefined, field: string): string | undefined {
  const value = summary?.[field];

  return typeof value === "string" ? value : undefined;
}
