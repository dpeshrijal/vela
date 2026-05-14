import type { ReasoningLogDraft, ReasoningLogEntry, ReasoningLogId } from "./reasoningLog.types.js";
import { VelaError } from "../common/errors.js";

const reasoningLogs: ReasoningLogEntry[] = [];

export function saveReasoningLog(entry: ReasoningLogDraft): ReasoningLogId {
  const reasoning_log_id = `log_${reasoningLogs.length + 1}`;

  const reasoningLog = {
    reasoning_log_id,
    created_at: new Date().toISOString(),
    ...entry
  } as ReasoningLogEntry;

  reasoningLogs.push(reasoningLog);

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
