import { VelaError } from "../../common/errors.js";
import { verifyIdentity } from "../../orchestration/identity/identityOrchestrator.js";
import type {
  DocumentType,
  VerifyIdentityRequest,
  VerifyIdentityResponse
} from "../../orchestration/identity/identity.types.js";
import type { McpToolDefinition } from "../mcpServer.js";

export const verifyIdentityToolName = "vela_compliance_verify_identity";

export interface VerifyIdentityToolInput {
  agent_token: string;
  payload: VerifyIdentityRequest;
}

export const verifyIdentityInputSchema = {
  required: ["external_user_id", "jurisdiction", "idempotency_key"],
  optional: ["document_type", "document_front", "selfie_or_liveness_session_id"]
} as const;

export const verifyIdentityTool: McpToolDefinition<unknown, VerifyIdentityResponse> = {
  name: verifyIdentityToolName,
  description: "Verify identity through mock KYC orchestration.",
  async handler(input) {
    const parsedInput = parseVerifyIdentityInput(input);

    return verifyIdentity({
      agentToken: parsedInput.agent_token,
      payload: parsedInput.payload
    });
  }
};

function parseVerifyIdentityInput(input: unknown): VerifyIdentityToolInput {
  if (!isRecord(input)) {
    throw new VelaError("Tool input must be an object");
  }

  if (typeof input.agent_token !== "string" || input.agent_token.length === 0) {
    throw new VelaError("Missing required field: agent_token");
  }

  if (!isRecord(input.payload)) {
    throw new VelaError("Missing required field: payload");
  }

  const payload = input.payload;

  for (const field of verifyIdentityInputSchema.required) {
    getRequiredString(payload, field);
  }

  const documentType = getOptionalDocumentType(payload);

  return {
    agent_token: input.agent_token,
    payload: {
      external_user_id: getRequiredString(payload, "external_user_id"),
      jurisdiction: getRequiredString(payload, "jurisdiction"),
      idempotency_key: getRequiredString(payload, "idempotency_key"),
      document_type: documentType,
      document_front: getOptionalString(payload, "document_front"),
      selfie_or_liveness_session_id: getOptionalString(payload, "selfie_or_liveness_session_id")
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRequiredString(payload: Record<string, unknown>, field: string): string {
  const value = payload[field];

  if (typeof value !== "string" || value.length === 0) {
    throw new VelaError(`Missing required field: payload.${field}`);
  }

  return value;
}

function getOptionalString(payload: Record<string, unknown>, field: string): string | undefined {
  const value = payload[field];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.length === 0) {
    throw new VelaError(`Invalid field: payload.${field}`);
  }

  return value;
}

function getOptionalDocumentType(payload: Record<string, unknown>): DocumentType | undefined {
  const value = getOptionalString(payload, "document_type");

  if (value === undefined) {
    return undefined;
  }

  if (!isDocumentType(value)) {
    throw new VelaError("Invalid field: payload.document_type");
  }

  return value;
}

function isDocumentType(value: string): value is DocumentType {
  return value === "passport" || value === "drivers_license" || value === "national_id";
}
