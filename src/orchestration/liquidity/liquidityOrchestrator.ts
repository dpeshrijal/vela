import { saveReasoningLog } from "../../audit/reasoningLog.service.js";
import { authenticateAgent } from "../../auth/authenticateAgent.js";
import { VelaError } from "../../common/errors.js";
import type { VendorLiquidityQuoteResult } from "../../vendors/common/vendorResult.types.js";
import { getLiquidityVendor } from "../../vendors/liquidity/liquidityVendor.selector.js";
import type {
  GetLiquidityQuoteCommand,
  LiquidityQuoteRequest,
  LiquidityQuoteResponse,
  NormalizedLiquidityQuote
} from "./liquidity.types.js";

export async function getLiquidityQuote(command: GetLiquidityQuoteCommand): Promise<LiquidityQuoteResponse> {
  if (!authenticateAgent(command.agentToken)) {
    throw new VelaError("Invalid demo agent token");
  }

  validateLiquidityQuoteRequest(command.payload);

  const liquidityVendor = getLiquidityVendor();
  const vendorResult = await liquidityVendor.createQuote(command.payload);
  const normalizedQuote = normalizeVendorQuote(vendorResult);
  const reason = `Conduit returned a time-limited quote for converting ${normalizedQuote.source_amount} ${normalizedQuote.source_asset} to ${normalizedQuote.target_asset} on ${normalizedQuote.target_network}.`;

  const reasoning_log_id = saveReasoningLog({
    tool_called: "vela_liquidity_get_quote",
    agent_id: "demo_customer_agent",
    vendor_used: liquidityVendor.name,
    source_asset: normalizedQuote.source_asset,
    source_amount: normalizedQuote.source_amount,
    target_asset: normalizedQuote.target_asset,
    target_network: normalizedQuote.target_network,
    quote_id: normalizedQuote.quote_id,
    target_amount: normalizedQuote.target_amount,
    effective_rate: normalizedQuote.effective_rate,
    pricing_model: normalizedQuote.pricing_model,
    spread_bps: normalizedQuote.spread_bps,
    expires_at: normalizedQuote.expires_at,
    reason
  });

  return {
    ...normalizedQuote,
    reasoning_log_id
  };
}

function validateLiquidityQuoteRequest(payload: LiquidityQuoteRequest): void {
  if (!isPositiveAmount(payload.source_amount)) {
    throw new VelaError("Invalid field: source_amount must be a positive amount");
  }
}

function normalizeVendorQuote(vendorResult: VendorLiquidityQuoteResult): NormalizedLiquidityQuote {
  const sourceAmount = parseAmount(vendorResult.source.amount, "source.amount");
  const targetAmount = parseAmount(vendorResult.target.amount, "target.amount");

  return {
    quote_id: vendorResult.vendor_quote_id,
    vendor: "conduit",
    source_asset: vendorResult.source.asset,
    source_amount: vendorResult.source.amount,
    target_asset: vendorResult.target.asset,
    target_network: vendorResult.target.network ?? "unknown",
    target_amount: vendorResult.target.amount,
    effective_rate: targetAmount / sourceAmount,
    pricing_model: vendorResult.pricing_model ?? null,
    spread_bps: vendorResult.spread_bps ?? null,
    expires_at: vendorResult.expires_at,
    created_at: vendorResult.created_at
  };
}

function isPositiveAmount(value: string): boolean {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function parseAmount(value: string, field: string): number {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new VelaError(`Conduit quote response field ${field} must be a positive amount`);
  }

  return amount;
}
