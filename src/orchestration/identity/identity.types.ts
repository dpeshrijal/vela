export type IdentityVerificationResult = "approved" | "review" | "rejected";

export type DocumentType = "passport" | "drivers_license" | "national_id";

export interface VerifyIdentityRequest {
  external_user_id: string;
  jurisdiction: string;
  document_type: DocumentType;
  document_front: string;
  selfie_or_liveness_session_id: string;
  idempotency_key: string;
}

export interface VerifyIdentityCommand {
  agentToken: string;
  payload: VerifyIdentityRequest;
}

export interface NormalizedIdentityVendorResult {
  verification_id: string;
  result: IdentityVerificationResult;
  risk_score: number;
  vendor_reference_id: string;
  reasons: string[];
}

export interface VerifyIdentityResponse {
  verification_id: string;
  result: IdentityVerificationResult;
  risk_score: number;
  policy_result: "allowed" | "manual_review" | "blocked";
  reasoning_log_id: string;
}
