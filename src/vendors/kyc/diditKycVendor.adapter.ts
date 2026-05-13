import { VelaError } from "../../common/errors.js";
import { logger } from "../../common/logger.js";
import type { VendorKycResult } from "../common/vendorResult.types.js";
import type { KycVendor } from "./kycVendor.interface.js";

interface DiditCreateSessionResponse {
  session_id?: string;
  session_number?: number;
  vendor_data?: string;
  status?: string;
  workflow_id?: string;
  url?: string;
  verification_url?: string;
}

interface DiditRetrieveSessionResponse {
  session_id?: string;
  vendor_data?: string;
  status?: string;
  decision?: string;
  workflow_id?: string;
  url?: string;
  verification_url?: string;
}

interface DiditConfig {
  baseUrl: string;
  apiKey: string;
  workflowId: string;
}

interface DiditResponseBody {
  json?: unknown;
  text: string;
}

export const diditKycVendor: KycVendor = {
  name: "didit",

  async verifyIdentity(payload): Promise<VendorKycResult> {
    const config = getDiditConfig();
    const response = await fetch(`${config.baseUrl}/v3/session/`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": config.apiKey
      },
      body: JSON.stringify({
        workflow_id: config.workflowId,
        vendor_data: payload.external_user_id,
        metadata: JSON.stringify({
          external_user_id: payload.external_user_id,
          idempotency_key: payload.idempotency_key,
          jurisdiction: payload.jurisdiction
        }),
        language: "en"
      })
    });

    const responseBody = await readDiditResponse(response);

    if (!response.ok) {
      throw new VelaError(
        `Didit session creation failed with HTTP ${response.status}: ${summarizeDiditError(responseBody)}`
      );
    }

    if (!responseBody.json) {
      throw new VelaError(
        `Didit session creation returned non-JSON response with HTTP ${response.status}: ${summarizePlainText(
          responseBody.text
        )}`
      );
    }

    const diditSession = parseDiditSessionResponse(responseBody.json);
    const verificationUrl = diditSession.url ?? diditSession.verification_url;
    const vendorReferenceId = diditSession.session_id ?? `didit_${payload.idempotency_key}`;

    return {
      vendor_reference_id: vendorReferenceId,
      decision: "review",
      risk_score: 50,
      document_status: "unclear",
      liveness_status: "passed",
      reasons: ["Didit hosted verification session created; final result is pending webhook handling"],
      vendor_session_id: diditSession.session_id,
      verification_url: verificationUrl,
      status: diditSession.status ?? "session_created",
      raw_response_summary: {
        session_id: diditSession.session_id,
        session_number: diditSession.session_number,
        vendor_data: diditSession.vendor_data,
        status: diditSession.status,
        workflow_id: diditSession.workflow_id,
        has_verification_url: typeof verificationUrl === "string"
      }
    };
  },

  async getIdentityResult(verificationId): Promise<VendorKycResult> {
    const config = getDiditConfig();
    const response = await fetch(`${config.baseUrl}/v3/session/${encodeURIComponent(verificationId)}/decision/`, {
      method: "GET",
      headers: {
        "x-api-key": config.apiKey
      }
    });

    const responseBody = await readDiditResponse(response);

    if (!response.ok) {
      throw new VelaError(
        `Didit session retrieval failed with HTTP ${response.status}: ${summarizeDiditError(responseBody)}`
      );
    }

    if (!responseBody.json) {
      throw new VelaError(
        `Didit session retrieval returned non-JSON response with HTTP ${response.status}: ${summarizePlainText(
          responseBody.text
        )}`
      );
    }

    const diditResult = parseDiditRetrieveSessionResponse(responseBody.json);
    const vendorStatus = diditResult.status ?? diditResult.decision ?? "unknown";
    const decision = normalizeDiditDecision(vendorStatus);
    const verificationUrl = diditResult.url ?? diditResult.verification_url;

    return {
      vendor_reference_id: diditResult.session_id ?? verificationId,
      decision,
      risk_score: getRiskScoreForDecision(decision),
      document_status: decision === "pass" ? "valid" : "unclear",
      liveness_status: decision === "fail" ? "failed" : "passed",
      reasons: [`Didit latest session status: ${vendorStatus}`],
      vendor_session_id: diditResult.session_id ?? verificationId,
      verification_url: verificationUrl,
      status: vendorStatus,
      raw_response_summary: {
        session_id: diditResult.session_id,
        vendor_data: diditResult.vendor_data,
        status: diditResult.status,
        decision: diditResult.decision,
        workflow_id: diditResult.workflow_id,
        has_verification_url: typeof verificationUrl === "string"
      }
    };
  }
};

function getDiditConfig(): DiditConfig {
  const baseUrl = process.env.DIDIT_BASE_URL?.replace(/\/+$/, "");
  const apiKey = process.env.DIDIT_API_KEY;
  const workflowId = process.env.DIDIT_WORKFLOW_ID;
  const kycVendor = process.env.KYC_VENDOR;

  logDiditConfigPresence({
    DIDIT_BASE_URL: baseUrl,
    DIDIT_API_KEY: apiKey,
    DIDIT_WORKFLOW_ID: workflowId,
    KYC_VENDOR: kycVendor
  });

  if (kycVendor !== "didit") {
    throw new VelaError("Invalid Didit configuration. KYC_VENDOR must be didit to use Didit");
  }

  if (!baseUrl || !apiKey || !workflowId) {
    throw new VelaError(
      "Missing Didit configuration. Required env vars: DIDIT_BASE_URL, DIDIT_API_KEY, DIDIT_WORKFLOW_ID, KYC_VENDOR=didit"
    );
  }

  return {
    baseUrl,
    apiKey,
    workflowId
  };
}

async function readDiditResponse(response: Response): Promise<DiditResponseBody> {
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

function logDiditConfigPresence(fields: Record<string, string | undefined>): void {
  const statuses = Object.entries(fields).map(([field, value]) => {
    return `${field}=${value ? "present" : "missing"}`;
  });

  logger.info(`Didit config fields: ${statuses.join(", ")}`);
}

function summarizeDiditError(responseBody: DiditResponseBody): string {
  if (responseBody.json) {
    return summarizeJson(responseBody.json);
  }

  return summarizePlainText(responseBody.text);
}

function summarizeJson(value: unknown): string {
  if (!isRecord(value)) {
    return "Didit returned an error response";
  }

  const detail = getOptionalString(value, "detail");
  const message = getOptionalString(value, "message");
  const error = getOptionalString(value, "error");

  return detail ?? message ?? error ?? "Didit returned an error response";
}

function summarizePlainText(text: string): string {
  const normalizedText = text.replace(/\s+/g, " ").trim();

  if (normalizedText.length === 0) {
    return "Didit returned an empty response";
  }

  return normalizedText.slice(0, 300);
}

function parseDiditSessionResponse(value: unknown): DiditCreateSessionResponse {
  if (!isRecord(value)) {
    throw new VelaError("Didit session response must be an object");
  }

  return {
    session_id: getOptionalString(value, "session_id"),
    session_number: getOptionalNumber(value, "session_number"),
    vendor_data: getOptionalString(value, "vendor_data"),
    status: getOptionalString(value, "status"),
    workflow_id: getOptionalString(value, "workflow_id"),
    url: getOptionalString(value, "url"),
    verification_url: getOptionalString(value, "verification_url")
  };
}

function parseDiditRetrieveSessionResponse(value: unknown): DiditRetrieveSessionResponse {
  if (!isRecord(value)) {
    throw new VelaError("Didit session retrieval response must be an object");
  }

  const decisionValue = value.decision;

  return {
    session_id: getOptionalString(value, "session_id"),
    vendor_data: getOptionalString(value, "vendor_data"),
    status: getOptionalString(value, "status"),
    decision: typeof decisionValue === "string" ? decisionValue : getNestedStatus(decisionValue),
    workflow_id: getOptionalString(value, "workflow_id"),
    url: getOptionalString(value, "url"),
    verification_url: getOptionalString(value, "verification_url")
  };
}

function normalizeDiditDecision(status: string): "pass" | "review" | "fail" {
  const normalizedStatus = status.trim().toLowerCase().replace(/[_-]/g, " ");

  if (normalizedStatus === "approved") {
    return "pass";
  }

  if (normalizedStatus === "declined" || normalizedStatus === "rejected") {
    return "fail";
  }

  return "review";
}

function getRiskScoreForDecision(decision: "pass" | "review" | "fail"): number {
  if (decision === "pass") {
    return 28;
  }

  if (decision === "fail") {
    return 91;
  }

  return 50;
}

function getNestedStatus(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return getOptionalString(value, "status") ?? getOptionalString(value, "decision");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getOptionalString(record: Record<string, unknown>, field: string): string | undefined {
  const value = record[field];

  return typeof value === "string" ? value : undefined;
}

function getOptionalNumber(record: Record<string, unknown>, field: string): number | undefined {
  const value = record[field];

  return typeof value === "number" ? value : undefined;
}
