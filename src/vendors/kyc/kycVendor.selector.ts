import { VelaError } from "../../common/errors.js";
import { logger } from "../../common/logger.js";
import type { KycVendor } from "./kycVendor.interface.js";
import { diditKycVendor } from "./diditKycVendor.adapter.js";
import { mockKycVendor } from "./mockKycVendor.adapter.js";

export function getKycVendor(): KycVendor {
  const vendorName = process.env.KYC_VENDOR ?? "mock";
  const kycVendorPresence = process.env.KYC_VENDOR ? "present" : "missing, defaulting to mock";

  logger.info(`KYC vendor config: KYC_VENDOR is ${kycVendorPresence}`);

  if (vendorName === "mock") {
    return mockKycVendor;
  }

  if (vendorName === "didit") {
    return diditKycVendor;
  }

  throw new VelaError("Unsupported KYC_VENDOR. Expected one of: mock, didit");
}
