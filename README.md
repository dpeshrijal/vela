# Vela Phase 1 Compliance Orchestration POC

This is a one-day proof of concept for Vela Phase 1 compliance orchestration.

It demonstrates how a customer agent can call Vela MCP tools to verify identity, apply a demo policy, and retrieve the reasoning/audit trail behind the decision.

## Demo Flow

```text
Mock customer agent
-> vela_compliance_verify_identity
-> KYC vendor adapter
-> normalize vendor response
-> apply demo customer policy
-> save reasoning log
-> vela_compliance_get_identity_result
-> fetch latest vendor result
-> normalize latest result
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

The server uses the official `@modelcontextprotocol/sdk` Streamable HTTP transport and registers three MCP tools:

- `vela_compliance_verify_identity`
- `vela_compliance_get_identity_result`
- `vela_audit_get_reasoning`

Demo authentication uses the `x-agent-token` HTTP header:

```text
x-agent-token: demo_agent_token
```

## Included

- MCP tool: `vela_compliance_verify_identity`
- MCP tool: `vela_compliance_get_identity_result`
- MCP tool: `vela_audit_get_reasoning`
- Mock customer agent
- Mock KYC vendor
- Didit sandbox KYC vendor adapter
- Simple policy engine
- In-memory reasoning/audit log

## Out Of Scope

This POC intentionally does not include:

- Production KYC vendor handling
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

## KYC Vendor Selection

The KYC adapter is selected with `KYC_VENDOR`.

Use the mock vendor:

```bash
KYC_VENDOR=mock npm run demo
```

Use the Didit sandbox vendor:

```bash
KYC_VENDOR=didit npm run demo
```

Required Didit environment variables:

```text
DIDIT_BASE_URL=https://verification.didit.me
DIDIT_API_KEY=your_didit_api_key
DIDIT_WORKFLOW_ID=your_didit_workflow_id
KYC_VENDOR=didit
```

`DIDIT_APP_ID` may be present in local environments, but the current Didit session API call does not require it.

The Didit adapter creates a hosted verification session and returns a `review` / `manual_review` result with the Didit session ID, vendor status, and verification URL when returned by Didit.

Use `vela_compliance_get_identity_result` with the returned `verification_id` to fetch the latest Didit session result. Before the user completes Didit verification, the latest result will usually remain `review` / `manual_review` with a vendor status such as `Not Started`, `In Progress`, or `In Review`. When Didit returns `Approved`, Vela normalizes it to `approved` / `allowed`; when Didit returns `Declined` or `Rejected`, Vela normalizes it to `rejected` / `blocked`.

Webhooks are intentionally not implemented yet.

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
    idempotency_key: "request_approved_123"
  }
});

const latestResult = await client.callTool({
  name: "vela_compliance_get_identity_result",
  arguments: {
    verification_id: "<verification_id from first response>"
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
