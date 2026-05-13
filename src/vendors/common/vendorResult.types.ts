export type VendorDecision = "pass" | "review" | "fail";

export interface VendorKycResult {
  vendor_reference_id: string;
  decision: VendorDecision;
  risk_score: number;
  document_status: "valid" | "unclear";
  liveness_status: "passed" | "failed";
  reasons: string[];
}
