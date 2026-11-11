---
title: "Keeping credentials out of AI agents"
date: "2026-08-01"
description: "How an egress gateway can broker API access for AI agents, and which security boundaries still need attention."
tags: ["Security", "Artificial Intelligence", "Identity"]
image: "/images/blog/covers/credentials.png"
lang: "en"
translation: "credenciales-fuera-agentes-ia"
---

An AI agent may need to read an alert, look up an account, or open a ticket. Each action crosses a security boundary. If I put a long-lived API key in the agent's environment, the agent can use it, but so can anyone who manages to extract it. A prompt injection does not need to break the API's authentication if it can persuade an agent to disclose a working bearer token.

[Christian Posta's article on credential injection](https://agentgateway.dev/blog/2026-07-27-credential-injection-ai-agent-egress-cb4a/) describes an alternative: keep the upstream credential in a separate service and attach it only when an authorized request leaves for the API. This fits the same principle I use in my [evidence-first AI SOC assistant](/en/blog/evidence-first-ai-soc/): give the model a bounded job and enforce access outside the model.

## Move the credential out of the agent

A bearer token grants access to whoever presents it. Short expiration and narrow permissions reduce the damage if it leaks. Sender-constrained tokens add a proof tied to a key, but the authorization server and the receiving API both need to support and enforce that binding. Many integrations still depend on ordinary API keys or bearer tokens.

A proxy gateway takes a different route. The agent authenticates to the gateway with its own identity or delegated context. The gateway checks the requested destination and action against policy. If the request is allowed, a separate credential service supplies the upstream credential and the gateway adds it to the outgoing request. The response returns to the agent without exposing that credential.

<figure class="architecture-figure">
<picture class="diagram-light">
  <source media="(max-width: 600px)" srcset="/images/blog/credential-flow-en-mobile.svg">
  <img src="/images/blog/credential-flow-en.svg" alt="An agent sends an authenticated request to a gateway. Policy authorizes the request, the credential store supplies a token, and the gateway injects it before calling the API.">
</picture>
<picture class="diagram-dark">
  <source media="(max-width: 600px)" srcset="/images/blog/credential-flow-en-dark-mobile.svg">
  <img src="/images/blog/credential-flow-en-dark.svg" alt="An agent sends an authenticated request to a gateway. Policy authorizes the request, the credential store supplies a token, and the gateway injects it before calling the API.">
</picture>
</figure>

The agent still needs a way to authenticate to the gateway. That identity is sensitive too, and its permissions should be limited to the agent and task. The distinction is that the agent does not receive the reusable credential for the destination service.

The [Credential Broker for Agents Internet-Draft](https://datatracker.ietf.org/doc/html/draft-hartman-credential-broker-4-agents-00) calls this proxy approach Model A. Its Model B instead gives the agent a short-lived, scoped credential. The draft is work in progress, not a published standard. Posta argues that a proxy is particularly useful where upstream services cannot issue or verify sender-constrained tokens. The right choice depends on what each service supports and whether keeping credentials out of the agent is worth placing the gateway on every request path.

## What the gateway actually decides

A valid identity tells the gateway who is calling. It does not explain whether the call is appropriate. For a support agent, I would make the policy consider the user, the workload, the destination, the operation, and the resource. A request to read one customer's ticket is different from an instruction to export every customer record. A broad OAuth scope at the provider does not automatically make both requests acceptable inside the gateway.

The policy decision and credential delivery have different jobs. The policy engine evaluates the request without needing the secret. The delivery component retrieves the credential only after an allow decision, and should not be able to decide its own permissions. The gateway needs a trustworthy way to connect that decision to the request it forwards; otherwise a valid decision for one operation might be reused for another. The CB4A draft describes this separation as an architectural goal, not proof that every gateway deployment provides it.

For example, imagine an analyst asks an agent to gather context for an alert. The agent requests an approved read operation for the relevant tenant. The gateway verifies the agent and user context, evaluates the tenant and operation, retrieves a credential scoped to the destination, and forwards the request. If the policy denies the request, the gateway returns a denial and does not retrieve or inject the upstream token. An unavailable policy engine should produce a failure, not an implicit approval.

This is an illustrative design. I would verify how the actual gateway identifies workloads, binds policy decisions to requests, and protects the credential store before treating these properties as guarantees.

## One identity, two authorization steps

Authenticating a user to a gateway does not automatically give that gateway permission to use the user's GitHub or other third-party account. Those services may require their own OAuth consent.

In the flow Posta describes for Solo Enterprise, the user first signs in through an identity provider. If the gateway lacks a credential for the requested upstream service, it returns an authorization URL. The user completes consent in a browser; the credential service stores the resulting tokens against the user and resource. Later requests can use that credential after policy checks. Posta distinguishes this commercial flow from the open-source gateway's token-exchange capabilities, so I would check the features available in the edition I plan to deploy.

Consent is not blanket authority. The gateway still needs to decide whether this agent, acting for this user, may perform this particular operation. A read-only investigation should not inherit permission to delete an issue just because the same user can do so in a browser.

The first connection and the first call are worth distinguishing. A user signs in to the identity provider to establish who is using the gateway. On the first call to a service without a stored token, the gateway can return a consent URL. The user authorizes the third-party application in a browser, and the credential service stores the access and refresh tokens. Subsequent calls look up the credential for that user and resource. Token expiry, refresh failure, revoked consent, and a user leaving the organization all need explicit handling; an old token should not survive simply because it is still cached.

Posta also discusses cross-app access and ID-JAG as a possible alternative to an individual consent flow when both the identity provider and the destination support it. That changes how authorization is obtained. It does not remove the need to protect an upstream credential wherever it is held or cached. Compatibility varies by service, so I would validate a specific integration rather than assume a common OAuth label implies the same flow everywhere.

## The gateway becomes a sensitive target

Moving credentials out of agents reduces their exposure there, but it concentrates access in the broker. A compromised gateway or credential store can expose multiple users and services. I would treat the broker as security infrastructure: isolate its network access, restrict administrative access, encrypt stored credentials with keys managed separately, rotate and revoke credentials, and record access without logging secrets. Separation between policy decisions and credential delivery also limits what a single compromised component can do.

There are limits to the proxy. If an agent can bypass it and reach an upstream API directly, or if a tool exposes secrets through its responses or logs, the design has a gap. Network controls, destination allowlists, TLS, and response handling need to support the same boundary. If policy or the credential service is unavailable, the request should fail closed rather than fall back to a shared key.

A stolen gateway identity can still be used to make requests within its allowed scope. A prompt-injected agent can also ask the gateway to perform an action it is permitted to perform. Credential isolation is therefore not a substitute for least privilege, operation-level authorization, approval for consequential actions, and audit records that link a request to its user and workload.

<figure class="architecture-figure">
<picture class="diagram-light">
  <source media="(max-width: 600px)" srcset="/images/blog/credential-risk-en-mobile.svg">
  <img src="/images/blog/credential-risk-en.svg" alt="Two residual risks: a manipulated agent can misuse permitted actions, while a broker compromise may expose credentials and upstream accounts.">
</picture>
<picture class="diagram-dark">
  <source media="(max-width: 600px)" srcset="/images/blog/credential-risk-en-dark-mobile.svg">
  <img src="/images/blog/credential-risk-en-dark.svg" alt="Two residual risks: a manipulated agent can misuse permitted actions, while a broker compromise may expose credentials and upstream accounts.">
</picture>
</figure>

### What to test before trusting the boundary

I would test the broker from the perspective of an agent that has been manipulated, not only a well-behaved client. Try a different tenant, an unapproved method, a destination outside the allowlist, and a request after the user's access has been revoked. Each should fail without returning a credential. Then simulate a policy or token-store outage and confirm that no alternate route provides access.

The response path deserves the same attention as the request. An upstream error can echo an authorization header or a tool can return data the user is not entitled to see. Redact secrets from errors and traces, enforce authorization for returned data, and check what the agent can send to other destinations. Even with a perfect broker, an authorized read can expose sensitive content to a model or allow that content to be sent elsewhere if other controls permit it.

For the audit trail, I would record the requesting user and workload, destination, operation, policy decision, time, and a correlation ID. The record should be protected from alteration and should not contain tokens, authorization headers, or full sensitive request bodies by default. Those records help investigate a misuse; they do not prevent it on their own.

## Where I would start

For a security assistant, I would start with one read-only integration and map its actual calls. Identify the user and workload, restrict the destinations and operations, and test a denied request as well as an allowed one. Then check whether the logs explain who requested access, what policy decided, and which service received the request, without recording the token.

Only after that would I add more integrations or write access. The useful outcome is a boundary that can be tested and audited, not just an extra proxy in the architecture.
