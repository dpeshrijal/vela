export type PolicyResult = "allowed" | "manual_review" | "blocked";

export interface PolicyEvaluation {
  policy_result: PolicyResult;
  reasons: string[];
}
