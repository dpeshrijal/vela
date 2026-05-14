import { VelaError } from "../../common/errors.js";
import { logger } from "../../common/logger.js";
import type { VendorLiquidityQuoteResult } from "../common/vendorResult.types.js";
import type { LiquidityVendor } from "./liquidityVendor.interface.js";

interface ConduitConfig {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
}

interface ConduitResponseBody {
  json?: unknown;
  text: string;
}

interface ParsedConduitQuote {
  id: string;
  source: {
    asset: string;
    amount: string;
    network?: string;
  };
  target: {
    asset: string;
    amount: string;
    network?: string;
  };
  createdAt: string;
  expiresAt: string;
  pricing?: {
    client?: {
      pricingModel?: string;
      spreadBps?: number;
    };
  };
}

export const conduitLiquidityVendor: LiquidityVendor = {
  name: "conduit",

  async createQuote(payload): Promise<VendorLiquidityQuoteResult> {
    const config = getConduitConfig();
    const response = await fetch(`${config.baseUrl}/quotes`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-API-Key": config.apiKey,
        "X-API-Secret": config.apiSecret,
        "Api-Version": "2024-12-01"
      },
      body: JSON.stringify({
        source: {
          asset: payload.source_asset,
          amount: payload.source_amount
        },
        target: {
          asset: payload.target_asset,
          network: payload.target_network
        }
      })
    });

    const responseBody = await readConduitResponse(response);

    if (!response.ok) {
      throw new VelaError(
        `Conduit quote creation failed with HTTP ${response.status}: ${summarizeConduitError(responseBody)}`
      );
    }

    if (!responseBody.json) {
      throw new VelaError(
        `Conduit quote creation returned non-JSON response with HTTP ${response.status}: ${summarizePlainText(
          responseBody.text
        )}`
      );
    }

    const conduitQuote = parseConduitQuoteResponse(responseBody.json);

    return {
      vendor_quote_id: conduitQuote.id,
      source: {
        asset: conduitQuote.source.asset,
        amount: conduitQuote.source.amount,
        network: conduitQuote.source.network
      },
      target: {
        asset: conduitQuote.target.asset,
        amount: conduitQuote.target.amount,
        network: conduitQuote.target.network ?? payload.target_network
      },
      pricing_model: conduitQuote.pricing?.client?.pricingModel,
      spread_bps: conduitQuote.pricing?.client?.spreadBps,
      created_at: conduitQuote.createdAt,
      expires_at: conduitQuote.expiresAt,
      raw_response_summary: {
        id: conduitQuote.id,
        source_asset: conduitQuote.source.asset,
        source_amount: conduitQuote.source.amount,
        source_network: conduitQuote.source.network,
        target_asset: conduitQuote.target.asset,
        target_amount: conduitQuote.target.amount,
        target_network: conduitQuote.target.network ?? payload.target_network,
        pricing_model: conduitQuote.pricing?.client?.pricingModel,
        spread_bps: conduitQuote.pricing?.client?.spreadBps,
        createdAt: conduitQuote.createdAt,
        expiresAt: conduitQuote.expiresAt
      }
    };
  }
};

function getConduitConfig(): ConduitConfig {
  const baseUrl = process.env.CONDUIT_BASE_URL?.replace(/\/+$/, "");
  const apiKey = process.env.CONDUIT_API_KEY;
  const apiSecret = process.env.CONDUIT_API_SECRET;
  const liquidityVendor = process.env.LIQUIDITY_VENDOR;

  logConduitConfigPresence({
    CONDUIT_BASE_URL: baseUrl,
    CONDUIT_API_KEY: apiKey,
    CONDUIT_API_SECRET: apiSecret,
    LIQUIDITY_VENDOR: liquidityVendor
  });

  if (liquidityVendor !== "conduit") {
    throw new VelaError("Invalid Conduit configuration. LIQUIDITY_VENDOR must be conduit to use Conduit");
  }

  if (!baseUrl || !apiKey || !apiSecret) {
    throw new VelaError(
      "Missing Conduit configuration. Required env vars: CONDUIT_BASE_URL, CONDUIT_API_KEY, CONDUIT_API_SECRET, LIQUIDITY_VENDOR=conduit"
    );
  }

  return {
    baseUrl,
    apiKey,
    apiSecret
  };
}

async function readConduitResponse(response: Response): Promise<ConduitResponseBody> {
  const text = await response.text();

  if (text.length === 0) {
    return {
      json: {},
      text
    };
  }

  try {
    return {
      json: JSON.parse(text) as unknown,
      text
    };
  } catch {
    return {
      text
    };
  }
}

function logConduitConfigPresence(fields: Record<string, string | undefined>): void {
  const statuses = Object.entries(fields).map(([field, value]) => {
    return `${field}=${value ? "present" : "missing"}`;
  });

  logger.info(`Conduit config fields: ${statuses.join(", ")}`);
}

function summarizeConduitError(responseBody: ConduitResponseBody): string {
  if (responseBody.json) {
    return summarizeJson(responseBody.json);
  }

  return summarizePlainText(responseBody.text);
}

function summarizeJson(value: unknown): string {
  if (!isRecord(value)) {
    return "Conduit returned an error response";
  }

  const detail = getOptionalString(value, "detail");
  const message = getOptionalString(value, "message");
  const error = getOptionalString(value, "error");

  return detail ?? message ?? error ?? "Conduit returned an error response";
}

function summarizePlainText(text: string): string {
  const normalizedText = text.replace(/\s+/g, " ").trim();

  if (normalizedText.length === 0) {
    return "Conduit returned an empty response";
  }

  return normalizedText.slice(0, 300);
}

function parseConduitQuoteResponse(value: unknown): ParsedConduitQuote {
  if (!isRecord(value)) {
    throw new VelaError("Conduit quote response must be an object");
  }

  const source = getRequiredRecord(value, "source");
  const target = getRequiredRecord(value, "target");
  const pricing = getOptionalPricing(value);

  return {
    id: getRequiredString(value, "id"),
    source: {
      asset: getRequiredString(source, "asset", "source.asset"),
      amount: getRequiredString(source, "amount", "source.amount"),
      network: getOptionalString(source, "network")
    },
    target: {
      asset: getRequiredString(target, "asset", "target.asset"),
      amount: getRequiredString(target, "amount", "target.amount"),
      network: getOptionalString(target, "network")
    },
    createdAt: getRequiredString(value, "createdAt"),
    expiresAt: getRequiredString(value, "expiresAt"),
    pricing
  };
}

function getOptionalPricing(record: Record<string, unknown>): ParsedConduitQuote["pricing"] {
  const pricing = record.pricing;

  if (!isRecord(pricing)) {
    return undefined;
  }

  const client = pricing.client;

  if (!isRecord(client)) {
    return undefined;
  }

  return {
    client: {
      pricingModel: getOptionalString(client, "pricingModel"),
      spreadBps: getOptionalNumber(client, "spreadBps")
    }
  };
}

function getRequiredRecord(record: Record<string, unknown>, field: string): Record<string, unknown> {
  const value = record[field];

  if (!isRecord(value)) {
    throw new VelaError(`Conduit quote response missing required field: ${field}`);
  }

  return value;
}

function getRequiredString(record: Record<string, unknown>, field: string, displayName = field): string {
  const value = record[field];

  if (typeof value !== "string" || value.length === 0) {
    throw new VelaError(`Conduit quote response missing required field: ${displayName}`);
  }

  return value;
}

function getOptionalString(record: Record<string, unknown>, field: string): string | undefined {
  const value = record[field];

  return typeof value === "string" ? value : undefined;
}

function getOptionalNumber(record: Record<string, unknown>, field: string): number | undefined {
  const value = record[field];

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.length > 0) {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
