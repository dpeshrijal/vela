import { VelaError } from "../../common/errors.js";
import { logger } from "../../common/logger.js";
import { conduitLiquidityVendor } from "./conduitLiquidityVendor.adapter.js";
import type { LiquidityVendor } from "./liquidityVendor.interface.js";

export function getLiquidityVendor(): LiquidityVendor {
  const vendorName = process.env.LIQUIDITY_VENDOR;
  const liquidityVendorPresence = vendorName ? "present" : "missing";

  logger.info(`Liquidity vendor config: LIQUIDITY_VENDOR is ${liquidityVendorPresence}`);

  if (vendorName === "conduit") {
    return conduitLiquidityVendor;
  }

  throw new VelaError("Unsupported LIQUIDITY_VENDOR. Expected: conduit");
}
