import type { ReasoningLogEntry, ReasoningLogId } from "./reasoningLog.types.js";
import { VelaError } from "../common/errors.js";

const reasoningLogs: ReasoningLogEntry[] = [];

export function saveReasoningLog(
  entry: Omit<ReasoningLogEntry, "reasoning_log_id" | "created_at">
): ReasoningLogId {
  const reasoning_log_id = `log_${reasoningLogs.length + 1}`;

  reasoningLogs.push({
    reasoning_log_id,
    created_at: new Date().toISOString(),
    ...entry
  });

  return reasoning_log_id;
}

export function getReasoningLogById(reasoningLogId: ReasoningLogId): ReasoningLogEntry {
  const reasoningLog = reasoningLogs.find((entry) => entry.reasoning_log_id === reasoningLogId);

  if (!reasoningLog) {
    throw new VelaError(`Reasoning log not found: ${reasoningLogId}`);
  }

  return reasoningLog;
}

export function listReasoningLogs(): ReasoningLogEntry[] {
  return [...reasoningLogs];
}
