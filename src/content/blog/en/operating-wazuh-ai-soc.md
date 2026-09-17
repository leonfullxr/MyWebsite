---
title: "Operating an AI Assistant in a SOC: Admission, Actions, Audit and Incident Response"
date: "2026-07-10"
description: "The operations half of the Wazuh AI assistant: capacity without a load balancer, human-approved actions with zero standing credentials, an audit trail the SIEM watches, and the playbook for cross-tenant exposure."
tags: ["Cybersecurity", "AI", "SIEM", "AWS"]
lang: "en"
translation: "operar-ia-wazuh-soc"
image: "/blog/wazuh/v3-topology.png"
---

In [the first post](/en/blog/wazuh-ai-assistant-poc/) I walked through the design of an AI assistant for Wazuh whose answers are verifiable by construction, and the self-hosted PoC that proves it. That post was about making the assistant tell the truth. This one is about everything that starts mattering the moment real analysts depend on it: how capacity works when you cannot put a load balancer in front of the model, how the assistant is allowed to touch the infrastructure without ever holding a credential, where every record lands, and what happens on the day something smells like cross-tenant exposure. Everything here is the production design that the PoC deliberately mirrors, so each mechanism has a place where you can already poke at it.

*Updated 2026-07-17: the human-approved action path described here has shipped in the PoC. The propose-confirm-execute flow now runs against a live Wazuh, under per-tier least-privilege executor credentials. The design is unchanged. It is simply pokeable now.*

## No load balancer in front of the model

The first instinct when a shared dependency gets busy is to load-balance it. For a managed model API that instinct is a category error. Amazon Bedrock is a regional, stateless service reached over PrivateLink. There is nothing to balance across. Quotas pool per account and region regardless of how many copies of your backend exist. Fairness between hundreds of tenants sharing those quotas is not a routing problem. It is an admission-control problem, and it lives in the application.

[![Two deployment postures sharing one codebase, with per-environment admission, cache, audit and kill switch called out on the multi-environment side](/blog/wazuh/v3-deployment-postures.png)](/blog/wazuh/v3-deployment-postures.png)

*Admission, cache, audit and the kill switch are per-environment properties of the same gateway, whether it serves one environment or many. Click any diagram for full resolution.*

Admission has three layers and no coordinator. Per user: one concurrent stream and six turns a minute, keyed by the JWT subject. That stops one curious analyst from starving their own team. Per tenant: four concurrent model invocations and a monthly token budget that is deliberately soft. It alerts at 80 and 100 percent and never cuts a tenant off. A security tool that goes silent during an incident has failed at the worst possible moment. Per fleet: throttling from the shared quota is absorbed with full-jitter backoff and a bounded thirty-second queue with a busy indicator. After that the assistant rejects the turn honestly, in the analyst's language.

The principle underneath is that there is no silent degradation anywhere in the path. No quiet swap to a cheaper model. No automatic cross-region failover that would move a European tenant's questions to another geography. A rejected turn says it was rejected and why. Honesty under load is the operational twin of the veracity pipeline from the first post.

## The model proposes, a human disposes

Sooner or later every assistant gets asked to do something: restart that agent, isolate that host. The rule that keeps this safe is structural, like everything else in this design: **the AI backend holds zero credentials that can perform actions**. Reads are free. Writes are confirmed. The confirmation path runs through infrastructure the model cannot reach.

[![One turn as icons, with the write path branching down from the read cascade to propose, confirm and execute under a tiered executor credential](/blog/wazuh/v3-turn-flow.png)](/blog/wazuh/v3-turn-flow.png)

*The proposal is validated and its target verified before a human ever sees the card. Execution happens under a scoped executor credential — never the model's, never a standing admin's.*

When the model emits a `propose_action` tool call, the backend validates it against an action allowlist with schemas, rates and per-target cooldowns. It executes nothing. It then verifies the target independently. It queries the indexer as the user for the agent's real name, IP and status. The card the analyst sees contains facts the model never wrote. The card shows the exact API call that would run, with the model's reasoning clearly labeled as model-generated. Approval executes under a per-tier least-privilege credential the reasoning core never holds. A distinct scoped identity handles dashboard, manager and active-response actions. An idempotency key guarantees single execution. The confirmation itself is a deterministic step the model cannot fake. Tier 1 covers agent restarts, group changes and dashboard edits with one confirmation. Tier 2, off by default, covers manager-side changes and active response. It demands that the approver re-type the target name.

This is also the honest answer to prompt injection for actions. A poisoned log line can at most make the model propose something. A proposal is a card containing independently fetched facts, waiting for a human whose own permissions gate the execution. The attack surface ends at a decision that was always a human's to make.

## The SIEM watches the AI

Every turn emits exactly one audit event: user, tenant, tools called with their compiled queries, indices touched, hit counts, model ARN, token counts, guardrail actions, citation results, latency and status. Where those events land is the interesting part. The destination is the tenant's own indexer, under `wazuh-ai-audit-*` indices. Wazuh rules watch them like any other log source. The SIEM monitors its own assistant: guardrail blocks spiking, JWT validation failures, query validation failures, budget exhaustion, off-hours usage, citation-check failure bursts. Each one is a detection that pages the same SOC that uses the tool.

In parallel, events stream asynchronously through Firehose into an S3 bucket with Object Lock and a thirteen-month retention. They are encrypted with a per-tenant KMS key. That turns offboarding into crypto-shredding: revoke the key and the archive is noise. CloudTrail keeps the AWS-side attribution, identities and actions without prompt bodies. One feature is off by design: Bedrock model invocation logging. It captures full prompt bodies into a single account-wide destination. That would commingle every tenant's questions and evidence in one place. Per-tenant application-level audit replaces it deliberately. That choice is the compliance story in one sentence.

## The worst question a platform can face

Every multi-tenant platform eventually rehearses the question "could tenant A have seen tenant B's data?". The playbook treats any signal that makes this thinkable as P1, always. Its first three moves are designed to be boring.

Freeze: the kill switch is the same flag that enables the assistant. `enabled=false` is one Git commit, per tenant or fleet-wide. It was rehearsed during onboarding because it is the onboarding mechanism. Preserve: there is nothing to scramble for. The S3 archive was under Object Lock before the incident existed. CloudTrail plus conversation state complete the picture. Investigate: the per-turn audit events say exactly which user asked what, which queries compiled, which indices were touched and what came back. CloudTrail attributes every AWS call to a tenant-pinned role. If exposure is confirmed, notification runs under the existing incident process with GDPR Article 33 timelines. If not, the root cause gets fixed and the assistant re-enables in waves, internal tenants first. Prompt-injection incidents get one extra framing: the payload sits in the customer's own logs. It is triaged as a detection about the customer's environment, not only as a problem with the AI.

## What operating it taught me

Three lessons, matching the three from the design post. First, honest rejection beats silent degradation. An assistant that says "busy, try in a minute" in your own language preserves trust. One that silently downgrades the model spends it. Second, kill switches only count if they are rehearsed. The cheapest rehearsal is making the kill switch the same mechanism onboarding already uses. Third, audit is only cheap before you need it. Object Lock retention and one event per turn cost almost nothing to build into the pipeline. They are the difference between an incident review that reads logs and one that writes apologies.

The design post argued that a SIEM assistant earns trust by being checkable. The operations half is the same argument at a different timescale. Capacity, actions, audit and incident response are each designed so that the honest behavior is the only behavior available. If you want to see the substrate all of this runs on, the [self-hosted PoC](/en/blog/wazuh-ai-assistant-poc/) is public and reproducible. If you operate something similar, [I want to compare notes](/en/#contact).
