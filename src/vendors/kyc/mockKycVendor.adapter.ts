import type { KycVendor } from "./kycVendor.interface.js";

export const mockKycVendor: KycVendor = {
  name: "mock_kyc_vendor",

  async verifyIdentity(payload) {
    const vendor_reference_id = `mock_vendor_${payload.idempotency_key}`;

    if (payload.selfie_or_liveness_session_id === "live_failed") {
      return {
        vendor_reference_id,
        decision: "fail",
        risk_score: 91,
        document_status: "valid",
        liveness_status: "failed",
        reasons: ["Liveness check failed"]
      };
    }

    if (payload.document_front === "mock_unclear_document") {
      return {
        vendor_reference_id,
        decision: "review",
        risk_score: 63,
        document_status: "unclear",
        liveness_status: "passed",
        reasons: ["Document image is unclear"]
      };
    }

    return {
      vendor_reference_id,
      decision: "pass",
      risk_score: 28,
      document_status: "valid",
      liveness_status: "passed",
      reasons: ["Document is valid", "Liveness check passed"]
    };
  },

  async getIdentityResult(verificationId) {
    const vendor_reference_id = verificationId.replace("kyc", "mock_vendor");

    if (verificationId.includes("rejected")) {
      return {
        vendor_reference_id,
        decision: "fail",
        risk_score: 91,
        document_status: "valid",
        liveness_status: "failed",
        reasons: ["Mock latest result: liveness check failed"],
        status: "rejected"
      };
    }

    if (verificationId.includes("review")) {
      return {
        vendor_reference_id,
        decision: "review",
        risk_score: 63,
        document_status: "unclear",
        liveness_status: "passed",
        reasons: ["Mock latest result: document image is unclear"],
        status: "in_review"
      };
    }

    return {
      vendor_reference_id,
      decision: "pass",
      risk_score: 28,
      document_status: "valid",
      liveness_status: "passed",
      reasons: ["Mock latest result: document is valid", "Mock latest result: liveness check passed"],
      status: "approved"
    };
  }
};
