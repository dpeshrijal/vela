import type { LiquidityQuoteRequest } from "../../orchestration/liquidity/liquidity.types.js";
import type { VendorLiquidityQuoteResult } from "../common/vendorResult.types.js";

export interface LiquidityVendor {
  name: "conduit";
  createQuote(payload: LiquidityQuoteRequest): Promise<VendorLiquidityQuoteResult>;
}
