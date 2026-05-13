# Vela Phase 1 Compliance Orchestration POC

This is a one-day proof of concept for Vela Phase 1 compliance orchestration.

It demonstrates how a customer agent can call Vela MCP/API-style compliance tools to verify identity, apply a demo policy, and retrieve the reasoning/audit trail behind the decision.

## Demo Flow

```text
Mock customer agent
-> vela_compliance_verify_identity
-> mock KYC vendor adapter
-> normalize vendor response
-> apply demo customer policy
-> save reasoning log
-> vela_audit_get_reasoning
-> return audit trail
```

## Included

- MCP-style tool: `vela_compliance_verify_identity`
- MCP-style tool: `vela_audit_get_reasoning`
- Mock customer agent
- Mock KYC vendor
- Simple policy engine
- In-memory reasoning/audit log

## Out Of Scope

This POC intentionally does not include:

- Real KYC vendors
- Real sanctions or wallet screening
- Travel Rule
- Liquidity
- Payout routing
- Database
- Dashboard
- Production authentication
- Webhooks
- Bank integration
- Settlement or custody

## Run The Demo

```bash
npm install
npm run build
npm run demo
```

## HTTP Demo Calls

Start the HTTP wrapper:

```bash
npm start
```

Verify identity:

```bash
curl -X POST http://localhost:3000/tools/vela_compliance_verify_identity \
  -H "content-type: application/json" \
  -H "x-agent-token: demo_agent_token" \
  -d '{
    "external_user_id": "user_approved_123",
    "jurisdiction": "US",
    "document_type": "passport",
    "document_front": "mock_valid_document",
    "selfie_or_liveness_session_id": "live_passed",
    "idempotency_key": "request_approved_123"
  }'
```

Retrieve the reasoning log:

```bash
curl http://localhost:3000/audit/log_1 \
  -H "x-agent-token: demo_agent_token"
```

## Expected Demo Outcomes

| Scenario | Verification result | Policy result |
| --- | --- | --- |
| Valid document + liveness passed | `approved` | `allowed` |
| Failed liveness | `rejected` | `blocked` |
| Unclear document | `review` | `manual_review` |

## Product Boundary

Vela does not perform KYC in this POC.

The project simulates a third-party KYC vendor and demonstrates the orchestration layer around that vendor: request handling, vendor response normalization, customer policy evaluation, reasoning log storage, and audit retrieval.
