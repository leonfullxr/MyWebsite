---
title: "A Trustworthy AI Assistant for Wazuh: Design and a Self-Hosted PoC"
date: "2026-07-09"
description: "How I designed and self-hosted an AI security assistant for Wazuh whose answers are verifiable by construction, with a real identity chain and pluggable inference from Amazon Bedrock to fully local models."
tags: ["Cybersecurity", "AI", "SIEM", "AWS"]
lang: "en"
translation: "asistente-ia-wazuh-poc"
image: "/blog/wazuh/8-production-topology.png"
---

Every SOC team I know is experimenting with the same idea: let analysts ask their SIEM questions in plain language. "How many authentication failures in the last 24 hours, and which users are targeted?" is a better interface than a query DSL, and large language models are clearly good enough to power it. The uncomfortable part is what happens next. A language model will answer that question fluently whether or not the answer is true, and in a security operations context a confident wrong number is worse than no number at all.

So the interesting engineering problem is not "can an AI answer questions about my alerts". It is "can I prove the answer is true, every time, structurally". This post walks through a proof of concept I designed and self-hosted that takes that question seriously: an AI assistant for [Wazuh](https://wazuh.com/) where veracity is a property of the architecture rather than a hope expressed in a system prompt. The whole thing runs on one Linux machine with Docker, and inference is pluggable, from Amazon Bedrock down to a fully air-gapped local model.

## The core principle: the model never writes queries

The single decision everything else follows from is this: **the language model never writes a datastore query and never computes a number**. Instead, the assistant routes every question through a ladder of lanes, ordered by how verifiable the resulting answer is:

- **Lane 0, no model at all.** The question is embedded and matched against a curated corpus of bilingual exemplars. If the similarity clears a threshold (0.80), a pre-approved typed template executes directly and the answer is rendered by deterministic code. Roughly 40 milliseconds, zero model tokens.
- **Lane 1, typed tools.** The model chooses from a small catalog of typed tools (`count_alerts`, `top_rules`, `auth_failures`, `alert_histogram` and friends). Parameters are schema-validated. The model picks, it never composes.
- **Lane 2, a constrained query plan.** For questions the catalog cannot express, the model emits a typed intermediate representation (a Query IR) instead of a raw query. The IR is validated against a field allowlist, compiled to OpenSearch DSL server-side, and can never contain scripts, regexes or wildcards because the compiler has no code path that emits them.
- **Lane 3, free query generation, exists as a concept and stays off.**

Every query that survives validation then passes through four veracity checks before its results reach the model:

1. **Mapping-aware validation**: fields are checked against the live index mapping, not just the allowlist.
2. **Pre-execution dry-run**: the datastore validates the compiled query before running it.
3. **Datastore-computed counts**: every "how many" answer comes from `total_matching` or aggregation buckets that OpenSearch computed. The sampled alert list handed to the model is explicitly truncated, so counting it is impossible by construction.
4. **Zero-hit differential diagnosis**: when a query returns nothing, the pipeline probes the time window and each filter individually, so the answer can distinguish "verified: 214 documents in the window, none from agent db-99" from "the query was wrong".

Finally, every claim in a synthesized answer must cite an `[alert:id]` or `[agg:name]` identifier, and the service verifies each citation against what was actually retrieved. An invented citation surfaces as a correction event instead of a confident lie, and every answer carries a verifiability label stating which lane produced it and which checks ran.

[![The four query lanes ranked by verifiability, from template matching to gated generation](/blog/wazuh/5-veracity-lanes.png)](/blog/wazuh/5-veracity-lanes.png)

*The router always prefers the lowest lane that can express the question. Escalation is logged and metered, so drift toward less-verifiable lanes shows up in the metrics instead of in an incident.*

## The architecture on one machine

The PoC is a Docker Compose overlay on top of the official `wazuh-docker` single-node stack, which provides a real Wazuh 4.14 indexer, manager and dashboard. Around it sit four containers:

[![What runs where: the self-hosted stack on one machine and the pluggable inference port](/blog/wazuh/1-local-poc-harness.png)](/blog/wazuh/1-local-poc-harness.png)

*Everything except inference runs on one machine, and even inference can. Click any diagram for full resolution.*

The division of labor matters. n8n is the front door and nothing more, a chat channel and workflow glue. The brain is a headless **tool service** that owns the entire agent loop and exposes three surfaces: an SSE chat API with token streaming, a synchronous JSON endpoint, and a per-tool HTTP surface that executes exactly one validated tool with no model involved. The same hardened internals answer through every door.

## The identity chain: the AI queries as you

The property I wanted to demonstrate is that the reasoning core can never forge an identity and holds no standing credential that reads telemetry. The chain has four hops and each hop verifies the previous one.

[![One question end to end: the identity chain, then the veracity pipeline on every tool call](/blog/wazuh/2-turn-data-flow.png)](/blog/wazuh/2-turn-data-flow.png)

*One question end to end: the identity chain first, then the veracity pipeline on every tool call, with the lane 0 fast path branching off early.*

The analyst authenticates against the identity provider and gets an OIDC token. A dedicated **auth-shim** sidecar verifies that token against the IdP JWKS, checks that the user carries the analyst role, and mints a turn credential: an RS256 JWT with a dual audience, a lifetime of at most ten minutes, and a tenant claim that comes from deployment configuration rather than from anything in the request. The shim is the only container holding the signing key. The tool service verifies with the public key only, so a compromised reasoning core still cannot mint identities.

The fourth hop is my favorite part. The Wazuh indexer's security configuration gains a JWT auth domain trusting the same public key, so the tool service forwards the analyst's own token and the indexer resolves it to a read-only role scoped to alert indices. Telemetry queries execute **as the logged-in analyst**, and you can prove the ceiling directly, with no AI in the loop:

```bash
# allowed: read alerts as the analyst
curl -sk -H "Authorization: Bearer $TURN" \
  "https://localhost:9200/wazuh-alerts-*/_count" | jq

# denied: the analyst role cannot write, delete, or read other indices
curl -sk -X DELETE -H "Authorization: Bearer $TURN" \
  "https://localhost:9200/wazuh-alerts-4.x-2026.07.08"
```

The assistant can never show a user more than that token can query, because the assistant queries with that token. The negative cases fail closed: a token signed by any other key dies at signature verification, a token for another tenant is rejected and audited, and a user without the analyst role never receives a turn credential in the first place.

## One port, three inference postures

Everything above sits on top of a single provider port. The loop speaks the Bedrock Converse shape internally, and one adapter translates to and from the OpenAI chat-completions dialect, tool calls included. Switching backends is an `.env` change plus a container recreate, and nothing above the port moves: same loop, same IR, same veracity checks, same identity chain, same audit.

[![One provider port, three postures: what actually leaves your machine per backend](/blog/wazuh/3-inference-backends.png)](/blog/wazuh/3-inference-backends.png)

*One provider port, three postures. What crosses the machine boundary depends entirely on which backend you bind.*

That one seam yields three very different sovereignty postures:

| Backend | What crosses the machine boundary | When to use it |
|---|---|---|
| Amazon Bedrock | The question plus compacted evidence, under AWS no-retention and no-training terms | Production semantics, Guardrails attach per invocation |
| Ollama (local) | Nothing. Fully air-gapped | The strictest sovereignty demo, and free |
| Groq or another OpenAI-compatible cloud | Question plus evidence under that provider's terms | Lab experiments only |

The two model tiers (a small router model for cheap decisions, a larger analysis model for the investigation loop) can each bind to a different provider, so a local router with Bedrock analysis is a two-line configuration. For local serving, sparse mixture-of-experts models turned out to be the practical unlock: `gpt-oss:20b` gives big-model quality with about 3.6B active parameters and runs on a 16 GB machine, and `qwen3:30b-a3b` fits entirely in 24 GB of VRAM. At the extreme end I wired an experimental depth lane around AirLLM-style layer streaming, which really does run 70B-class models on a 4 GB GPU, at 0.07 to 0.7 tokens per second. That is not an interactive assistant and no configuration makes it one, so it is honestly positioned as a batch lane for one hard question overnight, never the chat path.

## When the logs attack back

A SIEM assistant has an unusual threat model: its most dangerous input is not the user's question, it is the evidence. Alert bodies contain whatever an attacker managed to write into a log line, which means every piece of evidence the model reads is potentially an adversarial instruction. The pipeline treats it that way. The analyst's question passes a prompt-attack filter, retrieved evidence passes its own guardrail before the model sees it, the model's output passes a third check for secrets, PII and grounding, and citation verification then strips and flags any claim that references evidence that was never retrieved. What reaches the browser is sanitized Markdown: no HTML, no external links, no auto-loading images.

[![Prompt-injection defense: guardrails on the question, the evidence and the output, citation verification, and the audit trail watching all of it](/blog/wazuh/6-injection-defense.png)](/blog/wazuh/6-injection-defense.png)

*Evidence is treated as untrusted input from the moment it leaves the indexer, and every guardrail intervention lands in the audit index.*

The honest defense, though, is structural: every tool the model can call is read-only and tenant-scoped, so even a perfectly successful injection has nothing dangerous to hijack. And because guardrail interventions and citation failures are audit events in the tenant's own indexer, an injection *attempt* becomes a SOC detection about the attacker. The assistant turns the attack into telemetry.

## Recognition before reasoning

The optimization I like most needed no GPU at all. Analysts ask the same operational questions constantly, and those questions do not need a reasoning model. Lane 0 embeds each incoming question with a small local embedding model (`bge-m3`, which handles English and Spanish in one space), matches it against curated exemplars by cosine similarity, extracts slots like time windows and agent names with deterministic bilingual rules, and executes the matched template through the exact same veracity pipeline as every other lane. A hit answers in tens of milliseconds with zero model tokens, and on Bedrock that literally means the most frequent questions cost nothing. A miss escalates silently, so lane 0 can never break the assistant, only relieve it.

[![Query cascade: lane 0, the router and analysis tiers, the depth lane, and the shared veracity pipeline](/blog/wazuh/4-query-cascade.png)](/blog/wazuh/4-query-cascade.png)

*Recognition before reasoning: each stage only sees what the previous one could not answer, and every stage passes through the same veracity pipeline.*

Next to it sits an evidence cache keyed on a hash of the canonical query plan, with time bounds floored to a TTL grid so that "last 24 hours" asked twice in the same minute is one query, not two. Cached answers disclose `served_from_cache`, because an assistant built on verifiability does not get to hide its shortcuts.

## Proving it works instead of demoing it

Demos convince nobody, so the harness turns its claims into assertions. A seeder writes about two thousand synthetic alerts with a deterministic seed and records the exact ground truths into a file. A bilingual golden set of evaluation cases then runs against the live stack through the full chain, from the OIDC login to the final answer, asserting tool selection, ground-truth counts, zero-hit honesty, prompt-injection resistance, and the absence of unverified citations. It exits nonzero on any failure, which makes it a CI gate: prompt changes become physically unable to merge unevaluated. A separate unit suite of 26 tests covers the deterministic core, meaning IR validation, DSL compilation, lane 0 slot extraction and cache keying.

[![The eval harness: deterministic seeding, a bilingual golden set driving the full chain, and assertions that gate CI](/blog/wazuh/7-eval-harness.png)](/blog/wazuh/7-eval-harness.png)

*The golden set mocks nothing: it logs in through OIDC, asks through the chat API, and asserts against ground truths recorded at seed time.*

The operational edges got the same treatment. Answers stream token by token, capacity is a bounded queue that rejects honestly instead of degrading silently, a kill switch turns every surface into a 503 when needed, and a Prometheus endpoint exposes turns by lane, tool outcomes and latency histograms.

## Run it yourself

The complete harness is published in [`integrations/ai-assistant`](https://github.com/leonfullxr/Wazuh/tree/main/integrations/ai-assistant) of my Wazuh repository, next to the other integrations and PoCs I have built around the platform. It is reproducible on any Linux machine with Docker and about 8 GB of free RAM (more if you want local inference):

```bash
cp .env.example .env      # pick an inference backend inside
make keys                 # per-tenant JWT signing keypair
make wazuh                # official wazuh-docker single node, with certs
make securityconfig       # JWT auth domain + read-only analyst role
make ollama               # optional: fully local inference
make poc                  # keycloak, n8n, auth-shim, tool service
make seed                 # ~2000 synthetic alerts with known ground truths
make evals                # the bilingual golden set, end to end
make test                 # 26 unit tests for the deterministic core
```

Everything is there: the compose overlay, the auth shim, the tool service, the alert seeder, the golden set and its runner, and a README that walks every section of this post in runnable detail, from the Bedrock setup to the air-gapped variant. If you try it and want to compare notes, [reach out](/en/#contact).

## From one machine to a fleet

The PoC mirrors the production design on purpose: the JWT auth domain, the read-only analyst role and the securityconfig additions are the same YAML a fleet pipeline would template. In production the harness unfolds into EKS with one namespace per tenant behind a default-deny NetworkPolicy, and every tenant gets its own IAM role (IRSA), its own Bedrock inference profile and guardrail, and its own KMS key. The AI path never touches the internet, since Bedrock, STS, Secrets Manager and logging are all reached through VPC interface endpoints, and audit lands both in the tenant's own indexer and in an Object Lock S3 bucket. The only shared hop on the data path is Bedrock's stateless model fleet, and that is exactly the hop with no retention.

[![The multi-tenant production topology: per-tenant namespaces, IAM roles, inference profiles and guardrails, with PrivateLink as the only path to Bedrock](/blog/wazuh/8-production-topology.png)](/blog/wazuh/8-production-topology.png)

*Two tenants side by side: identical shapes, disjoint credentials. Any one of the four isolation gates - network, credentials, IAM, identity - blocks a cross-tenant path on its own.*

## What I'd harden next

A PoC earns the right to be taken seriously by knowing its own gaps, so here is my list, in order:

- **The evidence cache must key on identity, not just on the query plan.** Two analysts with different index permissions must never share a cache entry, so the effective role set belongs in the cache key. It is the kind of bug that only exists because the cache works.
- **Lane 0 needs a margin, not just a threshold.** A single 0.80 cosine cutoff will eventually fire the wrong template on a paraphrase with a negation in it. The fix is requiring a gap between the best and second-best match, checking that every template slot was actually extracted, and logging near-misses in shadow mode to grow the corpus safely.
- **Turn JWTs need a revocation path.** Ten minutes is short, but a kill switch should not have to wait for expiry; a small in-memory denylist of `jti` values closes that window.
- **Zero-hit diagnosis should pay for itself under admission control.** The differential probes multiply indexer queries on every zero-hit turn; they should run under the same semaphore as everything else, tagged in the audit record.
- **Local models deserve constrained decoding.** Grammar-constrained output for the Query IR turns parse-and-retry loops into first-try validity, which on a 20B local model is real latency back.
- **Conversation replay needs compaction.** Multi-turn context grows without bound; old turns should compact into a summary that preserves citation IDs, so follow-ups stay verifiable.
- **Escalation drift should page someone.** The per-lane metrics already exist; an alert on a rising lane-2 rate catches a prompt regression before anyone notices the answers got slower and more expensive.

None of these change the architecture. That is the point of getting the structure right first: everything on the list is a hardening pass inside a seam that already exists.

Three additions go further than hardening, and they are the next milestones. A **knowledge lane**: analysts also ask "what does rule 5710 mean" and "how do I enroll an agent", so a retrieval lane over the official Wazuh documentation, with citations verified against retrieved passages exactly like `[alert:id]`, would give questions about the platform the same veracity treatment as questions about telemetry. **Multi-turn golden cases and lane 0 canaries**: conversations with follow-ups that reference earlier evidence, plus deliberately ambiguous near-miss questions that assert the router escalates instead of guessing, testing the honesty of the routing rather than only the answers. And **cost inside the verifiability label**: the label already states the lane and the checks, so disclosing the tokens each answer spent makes the economics of recognition-before-reasoning visible to the analyst, not just to Prometheus.

## What I took away

Three lessons survived contact with the implementation. First, veracity is structural or it is nothing: allowlists, server-side compilation, datastore-computed counts and verified citations do more for trust than any amount of prompt engineering, because they hold even when the model is wrong. Second, identity is the feature nobody demos and everybody needs. Queries-as-user through a JWT auth domain means the AI inherits exactly the permissions of the person asking, and that single property answers most of the hard multi-tenancy questions before they are asked. And third, honest engineering beats impressive engineering. The layer-streaming depth lane is technically the flashiest part of the stack, and the most valuable thing I did with it was measure it, state that 0.2 tokens per second is not a chat experience, and confine it to the lane where it genuinely helps.

A SIEM assistant does not earn trust by sounding right. It earns trust by being checkable, and that is an architecture decision.

*This is the design half of the story. The operations half - capacity without a load balancer, human-approved actions, the audit map and the incident-response playbook - is in [Operating an AI Assistant in a SOC](/en/blog/operating-wazuh-ai-soc/).*
