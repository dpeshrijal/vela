import type { VerifyIdentityRequest } from "../../orchestration/identity/identity.types.js";
import type { VendorKycResult } from "../common/vendorResult.types.js";

export interface KycVendor {
  readonly name: string;
  verifyIdentity(payload: VerifyIdentityRequest): Promise<VendorKycResult>;
  getIdentityResult(verificationId: string): Promise<VendorKycResult>;
}
