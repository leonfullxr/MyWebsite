---
title: "Keeping credentials out of AI agents, part 5: eliminating plaintext"
date: "2026-11-22"
description: "The gateway already sees the token it puts on the wire. The controller does not need to see it too."
tags: ["Security", "Artificial Intelligence", "Identity"]
image: "/images/blog/covers/token-vault-plaintext.png"
lang: "en"
translation: "eliminar-el-texto-en-claro"
---

This is the fifth and last post in a series about keeping credentials out of AI agents. The numbered order is the reading order, even though [parts 2](/en/blog/protecting-the-token-vault/) and [3](/en/blog/scaling-the-token-vault/) carry later dates than [part 4](/en/blog/protecting-the-vault-with-openbao/) and this one, and so appear first in the blog list. [Part 1](/en/blog/keeping-credentials-out-of-ai-agents/) started with an egress gateway, part 2 asked how the token vault is wrapped, part 3 looked at the hot path at scale, and part 4 at running that split on Vault or OpenBao.

[Christian Posta's](https://agentgateway.dev/blog/2026-11-22-eliminating-plaintext-credential-injection/) 22 November 2026 follow-up, *Credential Injection Patterns for AI Agents: Part 4, Eliminating Plaintext*, is the piece this post follows. The reaction to the earlier articles, as he tells it, was some version of "you didn't remove the risk, you just moved it to the gateway." That is true of the token in flight, and it was already true. The gateway terminates the agent's connection and puts the upstream token on the wire. So does every TLS-intercepting egress proxy you already run. Brokering did not invent that exposure. What it added was a store of every user's tokens, and a controller on the hot path that also saw plaintext. This post asks why a second process should see that token at all.

I have not run this change in front of my own stack. What follows is his argument, restated in my words, plus the threat model and failure modes I would insist on before treating a ciphertext-only controller as finished.

## Why the controller sees plaintext

In the variant from [part 3](/en/blog/scaling-the-token-vault/), the controller sends a subject token, a freshness proof, and the row's wrapped data key to the broker, gets the plaintext data key back, opens the inner layer, and hands the upstream token to the gateway. It does all of that because it is acting as a token exchange: subject token in, upstream token out. That is a reasonable API. The controller needs to find the right row. It does not need to open it.

If only the gateway should see the plaintext, the API has to change. The gateway gets the ciphertext from the controller and the data key from the broker, and only it can decrypt. The gateway was going to hold the token a few milliseconds later anyway, so the only thing that changes on that process is where the open happens. The controller becomes a store and a state machine, with row metadata and expiry, and with no decrypt path and no plaintext credential.

The controller loses encrypt permission too. That only works if the refresher from part 3 is the component that completes the authorization-code exchange and wraps the rows it writes. With the read path moved to the gateway, there is nothing left for the controller to call KMS or Transit for.

## The flow

The broker only accepts the gateway's identity, so a compromised controller cannot ask for an unwrap at all, no matter how many subject tokens it has harvested. In parts 2 to 4, a gateway-signed freshness proof did that job. The broker still verifies the subject token against the identity provider on every unwrap, which limits the gateway to users who are actually active. The controller only releases ciphertext to the gateway for the row's owner, so nobody else can bulk-pull the store.

The same idea works in the grant-shaped designs, with a different party calling decrypt. On KMS, the broker mints a grant with the gateway's role as grantee instead of the controller's. In mode 3b on OpenBao, from [part 4](/en/blog/protecting-the-vault-with-openbao/), the gateway is the one that calls Transit. The vault-login design is the smallest change of all: the gateway already holds the OpenBao token, so it would call Transit itself instead of handing that token to the controller.

<figure>
  <img src="/diagrams/eliminating-plaintext.svg" width="1076" height="888" alt="The controller holds only ciphertext and has no key permission. A separate refresher writes new access-token rows. The gateway collects the ciphertext from the controller and a data key from the broker, opens the row, and puts one access token on the wire to the upstream.">
  <figcaption>The gateway already had to see the token it injects. The change is that the controller no longer sees it too. Refresh tokens stay in the refresher and never take this path. The flow follows Posta's November 2026 analysis. Pink marks a live token; a lock marks ciphertext.</figcaption>
</figure>

## Only the access token

Only the access token should come back from this unwrap. In the store from part 2, each row's payload is the whole token response under one data key, which is fine when the controller opens it and only hands the access token on. If the gateway opened that same row it would get the refresh token too. The refresh token has to live under its own data key, in the refresher's store from part 3, that the gateway never gets. When an access token expires, the refresher writes a new wrapped access-token row and the gateway unwraps it like any other. Neither the gateway nor the controller ever sees a refresh token.

## What a compromise still gets

"So now the most exposed component on the network does all of the decrypting. How is that better?"

The gateway already held the plaintext for every in-use token, in every mode, because it is the thing putting the token on the wire. What this change does is stop a second component from holding it too. An attacker who sits on the gateway harvests in-use tokens at the rate of use whether or not the gateway does the open, and that was true in part 2. An attacker who sits on the controller, which in part 3 harvested exactly the same tokens, now gets ciphertext.

For tokens in flight, a compromised brokering gateway sees exactly what a compromised intercepting proxy would. The one thing it can do that a proxy cannot is ask for credentials. With Alice's live subject token it can call the broker for her other rows even if her agents only touched one of them that day, because the gateway is the one naming the resource. That is a confused deputy, and it works for as long as her subject token is valid after her last request. It is capped at the rows of users who are active during the compromise. Nothing works offline, dormant users are out of reach, and every pull shows up in the broker's decision log. [Part 4](/en/blog/protecting-the-vault-with-openbao/)'s two OpenBao designs have the same residual, so moving the unwrap does not change it.

The trickle does not stop when you evict the attacker. The gateway collects at the rate of use while the attacker sits on it, but whatever it logged stays usable until the upstream expires it, so the lifetime of those access tokens is part of the gateway's blast radius. Posta notes that this varies a lot by provider, and that some issue tokens that do not expire unless you turn expiration on. I would treat that as a property of each integration, not as a constant.

Here is what each single compromise gets you after the change.

A compromised controller holds ciphertext only, never plaintext, never a data key. It can serve a stale row for the same user and resource, or refuse to serve anything. The two attacks from part 3, sitting on the hot path and seeing plaintext at creation, are both gone.

A compromised gateway holds plaintext for in-use tokens, the same as any intercepting proxy, plus the other rows of active users described above. That is the same residual every earlier design already had at the gateway.

A compromised broker still has standing decrypt and the wrapped data keys it sees on live requests, but never a payload, so on its own it reads nothing. Paired with the controller, or with any other path to the database, it reads the whole store, which makes it the high-value target. That is the same residual as in part 3. Broker-to-database isolation is still what stops it from using that decrypt on the store, so that path has to stay locked down, and the broker and the controller still belong in separate trust domains.

A compromised refresher is unchanged from part 3: roughly a mode 2 posture for refresh tokens, which is why it still gets the tightest network policy in the system.

The one thing a ciphertext-only controller can still do is let an attacker steal ciphertext now and hope to get the wrapping key later, for example through a key-policy mistake during a migration. On OpenBao, Posta's answer is to rewrap on a schedule and then raise the minimum decryption version on the Transit key, so ciphertext stolen before the rewrap goes stale. Rewrap on its own does not help, because the old key version still decrypts whatever the attacker took.

## The two gaps that remain

Everything above leaves the gateway with the same two problems every earlier design had. The plaintext token is in the gateway, so whatever a compromised gateway logs keeps working after you evict it. And the gateway decides which credential to fetch, so with a live subject token it can ask for an active user's other rows. An agent-signed proof can take that choice away from the gateway. A trusted execution environment can take the plaintext off the gateway host. I have not implemented either. They are the directions Posta points to, and they are worth being precise about.

To take the choice of row away from the gateway, the agent has to sign a proof bound to what it is trying to reach, which the gateway can carry to the broker but cannot mint on its own. The IETF WIMSE working group has drafts that do this, a Workload Proof Token and an HTTP Message Signatures profile. The agent holds a Workload Identity Token, signs a short-lived proof on every request with the request's target as the audience, and the broker verifies that the signer is an agent workload, not the gateway signing with its own identity. The broker maps that path to an upstream from its own configuration, and only unwraps that row. One proof buys one unwrap, of the token the gateway was going to put on the wire anyway.

That mapping has to live at the broker. A virtual MCP server that puts several upstreams behind one endpoint gives every tool the same audience, and a compromised gateway could still ask for any of those rows. If the client also sends the tool name, the agent can sign that too, and the broker maps the tool to the upstream instead of the path. Either way, the broker needs its own copy of that mapping. If it takes the gateway's word, the proof does nothing.

With that in place, a compromised gateway only gets the tokens agents actually asked for while they are asking, the same as any intercepting proxy. It does nothing for the plaintext. The cost is that every agent signs every request, which is a small change for runtimes you control and something many desktop clients would need an extension point for.

For the plaintext itself, the direction is to move the step that attaches the token into a small injector running inside a trusted execution environment, a hardware-isolated enclave whose memory the host operating system, the hypervisor, and root on the machine cannot read. The hardware can attest to exactly what code is running in it, which is how the broker would know it is releasing the data key to the injector rather than to the gateway. If the key fetch, the open, the header, and the TLS session to the upstream all happen in there, the plaintext token never exists on the gateway host. A compromised gateway can still push requests through the enclave as Alice while she is active, but it walks away with nothing, so the trickle stops when you evict it. The gateway still picks the row, so this pairs with the agent-signed proof rather than replacing it.

This is not a thing I would claim to have deployed. Posta is careful about the constraints: on AWS, KMS can return the data key encrypted to the enclave's attested key, and the broker can make that call without seeing the key itself. The enclave often has no network of its own, so the host relays the bytes, but it has to be the enclave's TLS session to the upstream, and the enclave has to check the upstream certificate against roots baked into its image, for the hostname bound to the row. Otherwise a compromised gateway could point it at a server it controls. OpenBao Transit has no equivalent of that recipient-bound decrypt, so on the part 4 design the broker would have to verify the attestation itself. Posta describes that as the direction of Agentgateway Enterprise. I am not going to recast that product here.

## Failure modes I would not skip

If the broker still accepts a caller that is not the gateway, the controller can ask for unwraps again, and the plaintext is back in a second process. That is the first test I would run.

If a row still holds a refresh token or a client secret under the same data key as the access token, moving the unwrap to the gateway has made the most exposed component more dangerous, not less. I would refuse to ship that row shape.

If the controller can still call KMS or Transit, "ciphertext only" is a comment in the architecture diagram, not a property of the system. Those permissions have to be absent, and a call from the controller's identity should be an exception in the audit log.

A subject token that stays valid long after the last user action widens the window in which a compromised gateway can ask for that user's other rows. I would want to know, for each integration, how long that token actually lives.

Rewrapping ciphertext without raising the minimum decryption version does not retire what an attacker already stole. The two steps have to happen together, or neither is doing the job.

<aside role="note" style="margin-block: 2rem; padding: 1rem 1.2rem; border: 1px solid var(--post-line); border-radius: 14px; background: color-mix(in srgb, var(--post-accent) 7%, var(--post-surface));">
<p style="margin: 0 0 0.35rem; font-family: var(--font-display); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--post-accent);">Still to record</p>
<p style="margin: 0; font-size: 0.98rem; line-height: 1.6; color: var(--post-text);">I have not yet moved the unwrap to the gateway in front of my own stack, and I will not invent residual windows or token lifetimes. When I do, I will record whether a controller-only compromise can obtain plaintext, whether the broker ever accepts a caller that is not the gateway, whether the gateway can unwrap a refresh-token row, and whether a stale or replayed proof ever returns a data key.</p>
</aside>

## Where I would start

For the same read-only security assistant I have been using as a test case, I would only do this after the split in [parts 3](/en/blog/scaling-the-token-vault/) and [4](/en/blog/protecting-the-vault-with-openbao/) is in place: refresh tokens already live in the refresher, and the process that holds the store cannot unwrap a row on its own. Then I would move the final open to the gateway, take every KMS and Transit permission away from the controller, and let the broker accept only the gateway.

After that I would look at whether the first integrations share a user across more than one upstream. If they do, an agent-signed proof is how I would stop a compromised gateway from asking for the rows the agent did not. A trusted execution environment is worth watching. It is not something I would describe as done.

The test I would carry through the whole series is the same one [part 3](/en/blog/scaling-the-token-vault/) added to [part 2](/en/blog/protecting-the-token-vault/). It is not enough to ask what an attacker can read at the moment they arrive. I would also ask what they can collect if they stay on the path, whether a second process still sees the token, and whether that collection expires on its own.
