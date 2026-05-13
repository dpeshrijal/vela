# Vela Phase 1 Compliance Orchestration POC

This is a one-day proof of concept for Vela Phase 1 compliance orchestration.

It demonstrates how a customer agent can call Vela MCP tools to verify identity, apply a demo policy, and retrieve the reasoning/audit trail behind the decision.

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

## Primary Interface

The primary product interface is a real MCP server exposed at:

```text
POST /mcp
```

The server uses the official `@modelcontextprotocol/sdk` Streamable HTTP transport and registers two MCP tools:

- `vela_compliance_verify_identity`
- `vela_audit_get_reasoning`

Demo authentication uses the `x-agent-token` HTTP header:

```text
x-agent-token: demo_agent_token
```

## Included

- MCP tool: `vela_compliance_verify_identity`
- MCP tool: `vela_audit_get_reasoning`
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

## Run The MCP Server

```bash
npm start
```

The server binds to `process.env.PORT || 3000`.

A customer agent should connect to `http://localhost:3000/mcp` with an MCP Streamable HTTP client, list available tools, then call the tool by name.

Example client setup:

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3000/mcp"), {
  requestInit: {
    headers: {
      "x-agent-token": "demo_agent_token"
    }
  }
});

const client = new Client({ name: "customer-agent", version: "0.1.0" });
await client.connect(transport);

const tools = await client.listTools();

const verification = await client.callTool({
  name: "vela_compliance_verify_identity",
  arguments: {
    external_user_id: "user_approved_123",
    jurisdiction: "US",
    document_type: "passport",
    document_front: "mock_valid_document",
    selfie_or_liveness_session_id: "live_passed",
    idempotency_key: "request_approved_123"
  }
});
```

## Debug REST Calls

These endpoints are convenience wrappers for demos and manual debugging only. The product interface is MCP at `/mcp`.

Health check:

```bash
curl http://localhost:3000/health
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
