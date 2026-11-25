---
title: "Keeping credentials out of AI agents, part 2: protecting the token vault"
date: "2027-02-17"
description: "Once an egress gateway holds every upstream token, the question is how much of that vault a compromised controller can read, and what it takes to stop a silent unwrap."
tags: ["Security", "Artificial Intelligence", "Identity"]
image: "/images/blog/covers/token-vault.png"
lang: "en"
translation: "proteger-el-almacen-de-tokens"
---

In [part 1](/en/blog/keeping-credentials-out-of-ai-agents/), I argued that a long-lived API key in an agent's environment is the wrong place to keep an upstream credential. A better design is the one [Christian Posta](https://agentgateway.dev/blog/2026-07-27-credential-injection-ai-agent-egress-cb4a/) and the [Credential Broker for Agents draft](https://datatracker.ietf.org/doc/html/draft-hartman-credential-broker-4-agents-00) call a proxy: the agent authenticates to an egress gateway, the gateway checks policy, and only then is the real token attached to the outgoing request.

That design keeps the token out of the model's memory. It does not make the token disappear. It moves every user's GitHub token, Slack token, and upstream API key into the gateway's vault. The draft is blunt about the consequence: the broker becomes the highest-value target in the architecture. Posta's follow-up, [Credential Injection Patterns for AI Agents: Part 2, Securing the Vault](https://agentgateway.dev/blog/2026-08-03-protecting-token-vault-kms-credential-injection/), asks the question I would start with once that vault exists:

When the process that holds the token store is fully compromised, how much of the store can the attacker read?

"We encrypt at rest" is not an answer to that question. If the same process holds the ciphertext and the ability to decrypt it, a compromise of that process is a compromise of the store. Posta points to the [LiteLLM supply-chain incident](https://docs.litellm.ai/blog/security-update-march-2026) as the kind of failure this is meant to survive: an attacker who reaches the component that can get to the keys. I have not reproduced that incident, and I am not treating his lab or product as a result of my own. What follows is his three-mode design, restated in my words, plus the threat model, alternatives, and failure modes I would insist on before trusting the vault.

## The vault is now the high-value target

In the architecture Posta describes for Solo Enterprise and agentgateway, two components sit on the path of an agentic call. The gateway, the dataplane, terminates the agent's connection, enforces policy, and asks for an upstream credential when the call is allowed. A controller runs the token service, performs the token exchange, and owns the vault. It is the process that has to touch plaintext: it unwraps a row, and it hands that credential to the gateway so the gateway can put it on the wire.

That last hop matters for the threat model. The gateway is inside the confidentiality boundary for the one token a live request is using. It has to be; otherwise it cannot inject the header. What the vault design is trying to protect is everything else at the moment of compromise: other users' credentials, and this user's credentials for other resources.

A prompt injection that tries to exfiltrate a bearer token from the agent should fail in this design, because the agent never received that token. That is the gain from part 1. It does not stop a manipulated agent from asking the gateway to perform an action it is already allowed to perform, and it does not shrink the vault if the controller is taken over.

## Envelope encryption is necessary, not sufficient

A useful vault encrypts each stored credential in two layers. A data encryption key, generated fresh on every write, encrypts the token material itself: access token, refresh token, and identity token, if they are stored together. A key encryption key then wraps that short data key. Reading a row means unwrapping the data key first, then opening the payload.

The wrapping key only ever encrypts a short key, never the token JSON, so it can live in a service the controller cannot reach. Both layers should bind their ciphertext to context, such as a stable owner derived from the user's identity-provider subject and the upstream resource. If that binding is checked at decrypt time, ciphertext cannot be copied from Alice's GitHub row onto Bob's, or from one resource onto another, without the tag failing.

This is ordinary envelope encryption. It answers "what happens if someone steals the database file?" It does not, by itself, answer Posta's question. The remaining issue is who is allowed to unwrap a data key, and whether that permission is standing, silent, and offline.

## Three ways to hold the wrapping key

Posta compares three modes, using AWS KMS as the worked example and leaving HashiCorp Vault or OpenBao for a later post. Other KMS products can play the same role. The modes are distinguished by one fact: how far the "yes" to decrypt sits from the process that holds the ciphertext.

In the first mode, the wrapping key is a secret in the same cluster as the controller, often a Kubernetes Secret read at startup and used for local AES-GCM wrap and unwrap. A stolen database on its own is still ciphertext. A compromised controller is not. Anyone who can read that secret — the controller's service account, a cluster administrator, an etcd backup, a node with the projected token — has the master key and can decrypt the entire store offline, including rows written later, without leaving an application audit trail and without a way to un-leak the key. Posta treats this as a demo default, not a production design, and I agree.

In the second mode, the wrapping key never leaves a KMS customer key. The controller wraps and unwraps by calling the managed service, and it passes the per-row encryption context so the service can authenticate that context and record it. The master key is no longer in the cluster, in etcd, in a backup, or in the controller's memory. Every unwrap becomes an identity-gated, per-call, auditable, revocable event.

That is a real improvement, and it is also easy to over-claim. KMS does not stop a compromised controller from decrypting the store. It stops the controller from doing so silently, in bulk, and offline. The controller still has standing decrypt permission. A live attacker can walk the table one call at a time, under whatever rate limits and alerts you have. Those calls should show up in the KMS audit log, and you can disable the key, but the design has converted a smash-and-grab into a live, observable operation. If "detectable and revocable" is the threat model you are willing to accept, this is an honest place to stop. It is not prevention.

The third mode takes standing decrypt permission away from the controller entirely. The controller still holds the ciphertext, and it is still the only component that is allowed to be the grantee of a decrypt operation, but it cannot ask KMS to unwrap a row on its own. A separate broker, in a different trust domain, holds the right to mint a short-lived, row-scoped grant. The broker has no database, no ciphertext, and no ability to decrypt. Before it mints, it re-verifies the user's subject token, checks a short-lived freshness proof from the gateway, and computes the owner value itself. KMS then enforces that a grant minted for Alice's GitHub row cannot open a row sealed for Bob.

Neither side can read a credential alone. The broker can authorize but cannot unwrap. The controller can unwrap only with a grant it cannot mint. If the broker is compromised as well, the attacker can mint grants for any owner, and the design falls back toward mode 2. The extra cost is latency, operational surface, and a new component that has to be locked down as carefully as the vault.

<figure>
  <img src="/diagrams/protecting-the-token-vault.svg" width="1190" height="892" alt="An egress gateway sends a request to a controller that holds only ciphertext. A broker approves the unwrap in AWS KMS and returns a data key, and the controller hands one access token back to the gateway.">
  <figcaption>In mode 3 the controller holds only ciphertext. A separate broker has to approve each unwrap before a data key comes back, and the gateway is the only process that puts an access token on the wire. The blast-radius claims follow Posta's August 2026 analysis. Pink marks a live token; a lock marks ciphertext.</figcaption>
</figure>

A static KMS key policy is not a substitute for that broker. When the controller calls KMS, KMS authenticates the controller's workload identity, not the end user. A policy can pin encryption context to a constant. It cannot express "the owner must be the user behind this request," because nothing on that path has verified the user. The same limit applies to a Vault mount that the controller can read in full. Per-request, per-user scoping needs a principal that re-verifies the user and then mints a constrained grant. That principal is the broker.

## A threat model for the vault

I would write the threats down before choosing a mode.

A prompt injection that tries to steal a token from the agent is the case part 1 is built for. If isolation is working, there is no upstream token in the agent to exfiltrate. The residual is more ordinary: the agent can still invoke any operation the policy already allows, and it can still move data it was allowed to read. Vault hardening does not replace least privilege, approval for consequential actions, or controls on the response path.

A compromised agent is the same residual, only more durable. The attacker has a workload identity that the gateway trusts, for as long as that identity is valid. Revocation and short-lived agent credentials matter here. They do not shrink the vault.

A compromised gateway can see the token it is about to inject. That is inherent in credential injection. The goal is to keep that exposure to the one live request, not to pretend the dataplane can be outside the confidentiality boundary.

A compromised controller is Posta's question. Mode 1 loses the whole store, offline, with no useful audit. Mode 2 loses the store for as long as the attacker is live and decrypt calls keep being allowed, but you should be able to see it and disable the key. Mode 3 is meant to make a controller-only compromise insufficient to walk the table.

A compromised grant broker is the next trust domain. It should not hold ciphertext. If it can mint arbitrary grants, a second compromise returns you to a world where decrypts are possible for any owner. The broker's identity, its policy, and its ability to talk to KMS have to be narrower than "mint anything."

Key rotation and revocation have to be designed, not assumed. Rotating a wrapping key should re-wrap data keys without inventing a period where old wraps are silently readable by a retired key. Revoking a user's access should stop new grants, and it should not leave a cached data key or a still-valid refresh token useful in the controller. Posta's later note, [where KMS grants stop scaling](https://agentgateway.dev/blog/2026-10-20-credential-brokering-mode-3-at-scale/), is important here: a Mode 3 controller that unwraps an in-use row still sees that row's plaintext, and if the payload includes a refresh token, that leak can outlive the access token. I would treat refresh tokens and client secrets as a separate problem, not as something mode 3 automatically solves.

Audit has to cover more than "KMS was called." I would want the user and workload, the destination and operation, the policy decision, a correlation ID, and the encryption context, with no tokens or authorization headers in the log. The KMS trail is what makes mode 2 and mode 3 decrypts visible. It is not a substitute for an application trail that can explain why that row was opened.

## Tradeoffs against other designs

Environment variables and mounted secret files fail the part 1 test: the agent process can read the credential, and so can anything that shares its environment, image, or logs.

A sidecar that injects a token just before a call can look similar to a gateway, but the token often still lands in the same trust domain as the model or the tool process. If the sidecar is only a convenient way to ship the secret to the agent, the blast radius has not moved. If the sidecar is the thing that makes the upstream call, it has become a small gateway and should be designed like one.

Workload identity and OIDC, including IRSA or equivalent pod identity, are the right way for the controller and the broker to authenticate to KMS or Vault. They are not, on their own, a way to hand an agent a GitHub token. Most of the upstream APIs an investigation assistant needs still expect a user-delegated or application token, not the agent's cloud role. Federation helps where the destination can accept it. It does not remove the vault for the destinations that cannot.

SPIFFE and similar workload identities are a good fit for the gateway and the broker to prove which process is calling. Posta's freshness proof is signed with the gateway's SVID so a compromised controller cannot forge "this request is live" on its own. That is complementary to the vault. It is not a replacement for envelope encryption or for taking standing decrypt permission away from the process that holds the ciphertext.

A shared Vault or OpenBao cluster is a reasonable place to put the wrapping key if that is already how the environment protects secrets. Posta follows that path in [part 3](https://agentgateway.dev/blog/2026-11-02-protecting-token-vault-openbao-credential-injection/). The architectural test stays the same: can the controller decrypt the whole mount with its own identity, or does a separate policy component have to approve each unwrap?

## Failure modes I would not skip

If the identity provider changes the subject it issues, rows bound to the old subject will not unwrap until the user authorizes again. That is preferable to a binding so loose that ciphertext can be moved between users, but it needs an operational path, not a surprise outage.

If the broker, KMS, or the freshness-proof path is down, the request should fail closed. A fallback to a local wrapping key, or to a shared standing decrypt, puts you back in mode 1 or 2 under the conditions when you are least able to watch the system.

A freshness proof that can be replayed, or a grant that stays valid long enough to be reused on a different row, undermines mode 3. The proof should be short-lived, bound to the user and resource, and single-use. The grant should be retired after the unwrap.

A data-key cache in the controller, even as an "optimization," reintroduces standing decrypt for every row already opened. A compromised process will also cache whatever it wants, which is one more reason not to keep refresh tokens in the same payload as the access token.

Honeytoken rows and decrypt-rate alerts make mode 2 much more honest. They do not turn it into mode 3. I would still plant them. I would not treat a quiet log as proof that the store was not read.

<aside role="note" style="margin-block: 2rem; padding: 1rem 1.2rem; border: 1px solid var(--post-line); border-radius: 14px; background: color-mix(in srgb, var(--post-accent) 7%, var(--post-surface));">
<p style="margin: 0 0 0.35rem; font-family: var(--font-display); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--post-accent);">Still to record</p>
<p style="margin: 0; font-size: 0.98rem; line-height: 1.6; color: var(--post-text);">I have not yet built this vault path in front of my own Wazuh assistant, and I will not fill this section with invented timings or decrypt volumes. When I do, I will record whether a controller-only compromise can walk the store in each mode, whether a denied or replayed request ever causes a KMS decrypt, whether a broker or KMS outage fails closed, and whether logs can explain the unwrap without containing a token.</p>
</aside>

## Where I would start

For the same read-only security assistant I described in part 1, I would not stop at "the agent does not see the token." I would ask how the vault is wrapped, who is allowed to unwrap a row, and what a compromise of that process actually yields. If the wrapping key lives next to the ciphertext, I would treat that as a demo. If the wrapping key lives in KMS or Vault but the controller has standing decrypt, I would insist on audit, alerting, revocation, and an honest residual: the live store is still readable. If that residual is too large, the next step is a second trust domain that has to approve each unwrap and cannot read the store itself.

I would still start with one integration, one denied path, and logs that can be shown to someone else. The vault design is what makes that boundary worth the concentration of risk that part 1 accepted.

A [third post in this series](/en/blog/scaling-the-token-vault/) looks at what happens when that design has to run at the rate of every tool call, and at the credentials mode 3 still cannot protect: the ones in use, and the refresh tokens that travel with them.
