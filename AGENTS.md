# AGENTS.md

## Project Goal

Build a one-day proof of concept for Vela Phase 1 compliance orchestration.

The POC should demonstrate this flow:

Mock customer agent  
→ MCP server  
→ `vela_compliance_verify_identity`  
→ mock KYC vendor adapter  
→ normalize vendor response  
→ apply demo customer policy  
→ save reasoning log  
→ return `approved`, `review`, or `rejected`.

This is a proof of concept, not a production system.

## Scope

Build only:

- MCP server
- One MCP tool: `vela_compliance_verify_identity`
- Mock customer agent
- Mock KYC vendor adapter
- Simple policy engine
- Simple reasoning/audit log
- Basic agent authentication using a demo token
- Clean TypeScript project structure

Do not build:

- Real KYC vendor integrations
- Real sanctions or wallet screening
- Travel Rule
- Liquidity
- Payout routing
- Dashboard
- Database
- Blockchain
- Custody
- Bank integration
- Settlement
- Real production authentication
- SDK generation
- Webhooks
- Microservices

## Hard Rules

- Do not put everything in one file.
- Do not change the folder structure without asking.
- Do not add extra folders unless absolutely necessary.
- Keep every file focused on one responsibility.
- Keep the code simple, readable, and easy to extend.
- Use TypeScript.
- Use mock data only.
- Do not over-engineer.
- Do not add real vendor APIs.
- Do not add unnecessary abstractions.
- After every change, summarize which files changed and why.

## Required Folder Structure

Create and follow this exact structure:

    src/
      app/
        config.ts
        server.ts

      mcp/
        mcpServer.ts
        registerTools.ts
        tools/
          verifyIdentity.tool.ts

      agent-demo/
        mockCustomerAgent.ts

      auth/
        authenticateAgent.ts
        agentToken.types.ts

      orchestration/
        identity/
          identityOrchestrator.ts
          identity.types.ts

      vendors/
        common/
          vendor.types.ts
          vendorResult.types.ts
        kyc/
          kycVendor.interface.ts
          mockKycVendor.adapter.ts

      policy/
        policyEngine.ts
        policy.types.ts
        demoPolicies.ts

      audit/
        reasoningLog.service.ts
        reasoningLog.types.ts

      common/
        errors.ts
        result.ts
        logger.ts

## Layer Responsibilities

### `src/app`

Application entrypoint and configuration.

### `src/mcp`

MCP server setup and MCP tool registration.

### `src/mcp/tools`

Individual MCP tools. Each tool should be in its own file.

### `src/agent-demo`

Mock customer agent that calls our MCP tool.

### `src/auth`

Demo authentication for the customer agent.

### `src/orchestration`

Business orchestration layer. This layer coordinates the vendor call, policy evaluation, and audit logging.

### `src/vendors`

Vendor adapter layer. Mock vendor integrations live here.

### `src/policy`

Simple customer policy evaluation.

### `src/audit`

Reasoning log / audit trail.

### `src/common`

Shared utilities, errors, logger, and result types.

## Coding Style

- Prefer explicit types.
- Avoid `any` unless absolutely necessary.
- Use clear function names.
- Use small modules.
- Keep mock data realistic but simple.
- Return structured JSON responses.
- Use comments only when they clarify important logic.
- Do not write long explanations inside code comments.

## Demo Scenario

The demo should support three outcomes:

1. User with valid document and liveness passed → `approved`
2. User with failed liveness → `rejected`
3. User with unclear document → `review`

## Expected Tool

The MCP tool name must be:

    vela_compliance_verify_identity

The tool should accept a payload similar to:

    {
      "external_user_id": "user_123",
      "jurisdiction": "US",
      "document_type": "passport",
      "document_front": "mock_file_or_url",
      "selfie_or_liveness_session_id": "live_123",
      "idempotency_key": "unique_request_123"
    }

The tool should return a response similar to:

    {
      "verification_id": "kyc_123",
      "result": "approved",
      "risk_score": 28,
      "policy_result": "allowed",
      "reasoning_log_id": "log_123"
    }

## Important Product Boundary

This POC only demonstrates compliance orchestration.

We do not perform KYC ourselves.

We simulate calling a third-party KYC vendor, normalize the response, apply customer policy, save an audit log, and return the result to the customer agent.