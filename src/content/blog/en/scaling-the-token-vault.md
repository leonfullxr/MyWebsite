---
title: "Keeping credentials out of AI agents, part 3: scaling the vault without widening the leak"
date: "2027-03-03"
description: "KMS grants can take standing decrypt away from the controller, but they do not keep up with every tool call, and they do not protect the credentials that are already in use."
tags: ["Security", "Artificial Intelligence", "Identity"]
image: "/images/blog/covers/token-vault-scale.png"
lang: "en"
translation: "escalar-el-almacen-de-tokens"
---

In [part 2](/en/blog/protecting-the-token-vault/), I followed [Christian Posta's](https://agentgateway.dev/blog/2026-08-03-protecting-token-vault-kms-credential-injection/) three modes for protecting the token vault behind an egress gateway. The design I would actually want is the third: the controller holds the ciphertext and has no standing decrypt permission, and a separate broker has to approve each unwrap. Dormant rows should stay unreadable if only the controller is compromised.

That property is worth keeping. It is not the end of the design. Posta's follow-up, [Credential Injection Patterns for AI Agents: Part 2.5, Where KMS Grants Stop Scaling](https://agentgateway.dev/blog/2026-10-20-credential-brokering-mode-3-at-scale/), changes two recommendations from the end of that earlier post. The first is operational: the KMS grant that enforces the split does not hold up under real load, and the obvious workarounds put standing decrypt back. The second is a narrower claim about compromise. An attacker who sits on the controller does not need to walk the store. Every legitimate tool call will eventually hand them a plaintext credential, and if a refresh token travels in the same payload, that leak outlives the access token.

I have not run these quotas or this architecture in front of my own Wazuh assistant. What follows is his argument, restated in my words, plus the threat model and failure modes I would insist on before treating mode 3 as finished.

## The grant becomes the ceiling

In the grant-gated design, every successful exchange is three KMS calls: create a grant, decrypt, and retire the grant. Posta points at the default KMS request quotas here, not at a measurement of his own product. CreateGrant and RetireGrant start at 50 requests per second, per account, per region. Symmetric Decrypt sits much higher, on the order of 10,000 to 100,000 per second depending on the region. The quotas are adjustable, but the mint rate is still the ceiling for the whole system, and it is a ceiling you share with every other AWS service in the account that mints grants on your behalf. Encrypted EBS volume attaches are the example he uses. A shared enterprise gateway that exchanges a token on every tool call will meet 50 requests a second sooner than it meets a decrypt limit.

Grants are also durable. They do not expire on their own. Someone has to retire them, and each key holds at most 50,000. If the broker crashes, if RetireGrant is throttled, or if the retirement path has a bug, grants are left behind. At the default mint ceiling, Posta notes, that key fills in about 17 minutes. After that, CreateGrant returns a limit error and every token exchange in the environment fails. The quieter failure is worse for the threat model. Every grant that is not retired is a row the controller can decrypt later without asking again. A retirement path that is failing in the background has drifted back toward mode 2 for those rows, or has taken the gateway down completely.

Caching grants, or widening them to a session, looks like an obvious fix. It is also how standing decrypt returns. The thing that made mode 3 tighter than mode 2 was that the controller could not unwrap a row without a fresh, constrained yes. A long-lived grant is that yes, left on the table.

## Let the broker unwrap the data key

The grant is only one way to keep the controller from calling decrypt. The variant Posta would use instead is to flip who makes that call. The broker gets standing decrypt permission, but it never holds the database or the ciphertext. The controller keeps the ciphertext and loses decrypt permission entirely. Neither side can read a row alone. Instead of minting a grant and handing it back, the broker unwraps the data key itself and returns that short key to the controller.

The controller sends the subject token, the freshness proof, the resource, the elicitation identifier, and the wrapped data key. It does not send the encrypted token payload, so the broker sees key material, not a credential. The broker still runs the checks from part 2: it re-verifies the subject token against the identity provider, checks the gateway's short-lived freshness proof, enforces a single-use identifier, and evaluates policy. It then computes the owner from the subject it just verified and calls KMS with that encryption context. If the controller presents Alice's token and Bob's wrapped key, the owner binding should fail in KMS, just as it would have under a grant.

The audit trail is cleaner in one respect. Decrypt now happens only under the broker's identity. A decrypt call from the controller is not a normal exchange; it is a signal. You still want the broker's own decision log, and you still want to join it to the KMS trail by owner, resource, and a correlation identifier, with no tokens in either log.

The data key comes back over the authenticated connection between broker and controller. The controller opens the inner layer, hands the upstream token to the gateway, and should zero the data key. A data key belongs to one row and one write, so holding it for the length of a request should yield exactly one credential. That is the honest residual of this variant, and it is also the start of the next problem.

<figure>
  <img src="/diagrams/scaling-the-token-vault.svg" width="1190" height="892" alt="On the hot path, a gateway sends a request to a controller that holds access-token ciphertext. The broker, with standing decrypt, unwraps a data key in AWS KMS and returns it, and the controller hands one access token back to the gateway.">
  <figcaption>Grants stay off the hot path. The broker unwraps the data key itself, and the controller is limited to short-lived access tokens. The default KMS grant quotas that motivate this path follow Posta's October 2026 analysis. Pink marks a live token; a lock marks ciphertext.</figcaption>
</figure>

## The rows the broker cannot protect

Part 2 asked how much of the store an attacker can read when the process that holds it is fully compromised. Mode 3's answer, including this variant, is still "only what the broker will authorize right now, for this user, on this row," for rows that sit unused. That part remains right, and it is still a real improvement over mode 2. On a large install, most users are dormant at any given moment, and those rows should stay closed.

The attacker who owns the controller does not have to open the rest of the store. The controller is on the hot path for every legitimate exchange. If they wait, every active user's token will pass through that process in the clear. On a shared gateway that exchanges on every tool call, Posta's point is that this happens on the timescale of hours, not of a brief smash-and-grab, and that attackers are often not caught within hours.

It is also worse than watching access tokens go by. The data key is created per write, not per request. Once the controller has unwrapped Alice's GitHub row, it can hold that key until a refresh rewrites the row, and a compromised process will cache whatever it wants. The payload that key opens is usually the whole token response: access token, refresh token, and identity token, plus, in the flow he describes, the OAuth client secret that the controller used when the user first authorized the upstream. With a refresh token, the attacker can mint new access tokens after the original one has been evicted. A row seen once stays useful until someone revokes the refresh token at the provider.

So the claim at the end of part 2 needs the same narrowing Posta gave his own. Mode 3 prevents a bulk, offline walk of the rows that are not in use during the compromise. The rows that are in use leak at the rate they are used, and a refresh token in the same payload makes each of those leaks durable. "Prevents mass decrypt" was the wrong goal line. What the attacker can read at the moment of compromise is one thing. How much leaks depends on how long they stay, and on what else was stored next to the access token.

## Take the refresh token off the hot path

Access tokens die on their own, on a timescale the provider sets. Posta cites typical examples: a GitHub App user-to-server token of eight hours if expiry is turned on, a Slack access token of twelve hours with rotation enabled, a Google Cloud OAuth access token of about an hour. An attacker who only harvests access tokens is at least bounded by that expiry. An attacker who harvests refresh tokens only has to see each user once.

The design he adds is a fourth component, the refresher. It holds the refresh tokens and the OAuth client secrets. It is also the OAuth client that completes the authorization-code exchange, so the controller never sees the full token response at creation either. Its store is wrapped the same way, and a broker has to approve each unwrap. Its only output is a fresh access token for one row. A refresh token never leaves the refresher, not to the controller, the gateway, or the broker. When a refresh is needed, the refresher unwraps its own row, calls the upstream token endpoint, stores the rotated refresh token, zeroes the plaintext, and returns only the new access token. The controller's store holds access tokens and nothing else.

The read path does not change while the access token is still valid. Expiry can be stored in the clear next to the ciphertext, so the controller does not need to unwrap a row just to see that it is stale. When it is stale, the controller asks the refresher instead of opening a long-lived secret itself.

What makes this a good place to concentrate the durable credentials is that the refresh path is slow. The hot path runs at one exchange per tool call. The refresh path runs closer to active users divided by the access-token lifetime: a few requests per second on a large install, rather than thousands. That is a volume where a KMS grant is a reasonable control again. Grants were a poor ceiling for every tool call. They are closer to what a low-volume, high-value path can afford. The refresher should also have no ingress from the dataplane, should not store subject tokens, and should be small enough that, if any part of this system ever moved into an enclave, this is the part I would start with. That last idea is Posta's suggestion, not a configuration I have tested.

The cost is a fourth trust domain, with its own identity, its own encryption context, and its own broker policy. The refresher is now where the long-lived credentials live, so a compromise of that component is roughly a mode 2 posture for every user: live, audited, and revocable upstream, but not prevented while the attacker is in the process. That is why it should get the tightest network policy in the system and no path from the agent's gateway. If the refresher is down, exchanges start failing as access tokens expire. The degradation window is the token lifetime, and the floor of that lifetime is set by the upstream, not by you.

It also only helps for upstreams that have a refresh token to split out. Long-lived personal access tokens and static API keys have no short-lived half. Those rows stay in the controller's store, and a controller compromise still sees them as soon as they are used. For a security assistant that talks to Wazuh, a ticketing system, or a cloud API, I would look at each integration on that point rather than assume the refresher covers the lot.

<figure>
  <img src="/diagrams/scaling-the-token-vault-refresh.svg" width="1076" height="807" alt="When an access token is expired, the controller asks a separate refresher, which holds the refresh tokens. The refresher calls the provider's token endpoint and returns only a new access token.">
  <figcaption>Refresh tokens and client secrets never travel with the live request. The refresher is a slower, separately gated path, and it returns only the access token. The split follows Posta's October 2026 analysis. Pink marks a live token; a lock marks ciphertext.</figcaption>
</figure>

## A threat model for the hot path

A prompt injection that tries to steal a token from the agent is still the case [part 1](/en/blog/keeping-credentials-out-of-ai-agents/) was built for. Nothing in this post puts that token back in the model. The residual is unchanged: a manipulated agent can still ask for any operation the policy already allows.

A compromised controller is now two different losses. Dormant rows should remain closed without the broker. Active rows, and anything cached from them, are in the process. If those rows only contain short-lived access tokens, the loss shrinks with expiry and with revocation at the provider. If they also contain refresh tokens or client secrets, the loss lasts until those are revoked. I would treat "how long do we have after a controller compromise" as a function of what that process is allowed to hold, not as a function of how quickly we hope to notice.

A compromised broker with standing decrypt is more dangerous than a broker that can only mint grants, because decrypt permission is already in its identity. It still should not have a path to the database. If it ever does, the store is open. Network policy and audit on any unexpected decrypt or data-store access are part of the design, not extras.

A compromised refresher is a compromise of the durable secrets. It should be harder to reach than the controller, and it should never be reachable from the dataplane. Its output should be an access token, never a refresh token.

A compromised gateway still sees the token it is about to inject. Taking plaintext out of the controller on the read path, by letting the gateway do the final unwrap, is what I take up in [part 5](/en/blog/eliminating-plaintext/). I am not going to recast that work here. The useful reminder is that someone on the request path has to touch the live token. The question is how many components do, and for how long.

Key rotation, grant retirement, and data-key lifetime all have to be explicit. A data key that lives beyond the request is a standing unwrap for that row. A grant that is not retired is the same thing, with a quota problem on top. If the broker or KMS is down, the request should fail closed. If the refresher is down, I would rather have new calls start failing as tokens expire than have the controller fall back to holding refresh tokens again.

## Failure modes I would not skip

Shared quotas are easy to forget. A burst of encrypted volume attaches, or another team minting grants in the same account and region, can starve the gateway even if your own exchange rate looks modest. If I stayed on a grant-gated hot path, I would want a dedicated key, a dedicated quota conversation, and an alert before retirement lag approaches the key's grant limit. The cleaner move is still to keep grants off that path.

A mismatch between the subject token and the wrapped key should fail in KMS, and it should never return a data key. The same is true of a replayed freshness proof. If either case produces a successful decrypt, the broker is not doing the job this variant assigns it.

Expiry stored in the clear next to ciphertext is convenient, and it is also metadata an attacker can read. That is acceptable if it only tells them when a token is stale. It is not acceptable if it leaks a subject, a resource, or a client secret.

Upstreams that do not rotate refresh tokens, or that issue long-lived API keys, will not get the benefit of the split. I would record which integrations in an assistant actually have a short-lived half, and I would not describe the others as protected by the refresher.

<aside role="note" style="margin-block: 2rem; padding: 1rem 1.2rem; border: 1px solid var(--post-line); border-radius: 14px; background: color-mix(in srgb, var(--post-accent) 7%, var(--post-surface));">
<p style="margin: 0 0 0.35rem; font-family: var(--font-display); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--post-accent);">Still to record</p>
<p style="margin: 0; font-size: 0.98rem; line-height: 1.6; color: var(--post-text);">I have not yet run this variant in front of my own stack, and I will not invent exchange rates or grant-retirement timings. When I do, I will record whether the hot path can meet the load without CreateGrant, whether a controller-only compromise can obtain a refresh token, whether a stale or replayed proof ever returns a data key, and how the system behaves when the refresher is down for a full access-token lifetime.</p>
</aside>

## Where I would start

For the same read-only security assistant I have been using as a test case, I would still want mode 3's split: the process that holds the ciphertext should not be able to unwrap a row on its own. I would not implement that split with a grant on every tool call. I would let the broker unwrap the data key, leave the payload where the controller is, and watch decrypt calls from the controller's identity as an exception.

Then I would look at what that controller is allowed to hold. If the first integration can issue a refresh token, that token and the client secret should not sit in the same row as the access token. If it can only issue a long-lived key, I would say so, and I would treat a live controller compromise as a loss of that key until it is revoked.

I follow that work in [part 4](/en/blog/protecting-the-vault-with-openbao/), which rebuilds the same split on Vault and OpenBao, and in [part 5](/en/blog/eliminating-plaintext/), which takes the final unwrap off the controller. The test I would carry into both is the one this post adds to part 2. It is not enough to ask what an attacker can read at the moment they arrive. I would also ask what they can collect if they stay on the hot path, and whether that collection includes something that does not expire on its own.
