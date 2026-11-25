---
title: "Keeping credentials out of AI agents, part 4: protecting the vault with OpenBao"
date: "2026-11-02"
description: "Mode 3 does not have to live in a hyperscaler KMS. On Vault or OpenBao, the choice is how far one live request is allowed to reach."
tags: ["Security", "Artificial Intelligence", "Identity"]
image: "/images/blog/covers/token-vault-openbao.png"
lang: "en"
translation: "proteger-el-almacen-con-openbao"
---

This is the fourth post in a series about keeping credentials out of AI agents. The numbered order is the reading order: [part 1](/en/blog/keeping-credentials-out-of-ai-agents/) started with an egress gateway, [part 2](/en/blog/protecting-the-token-vault/) looked at how the token vault is wrapped, and [part 3](/en/blog/scaling-the-token-vault/) at what happens when that design has to run at the rate of every tool call. Parts 2 and 3 carry later dates than this one, so they appear first in the blog list.

[Parts 2 and 3](/en/blog/protecting-the-token-vault/) built that split on AWS KMS. A lot of the organizations that care most about credential concentration cannot, or will not, put the key that guards every user's credentials in a hyperscaler's hands. [Christian Posta's](https://agentgateway.dev/blog/2026-11-02-protecting-token-vault-openbao-credential-injection/) 2 November 2026 follow-up, *Credential Injection Patterns for AI Agents: Part 3, Protecting the Token Vault with OpenBao*, is the piece this post follows. He lays out two ways to run mode 3 on Vault or OpenBao, what each one costs, and how he would pick between them. I have not run either design in front of my own stack. What follows is his argument, restated in my words, plus the threat model and failure modes I would insist on before treating a self-hosted key service as a finished substitute for KMS.

## Why the key would live here

Some of the reasons are the usual ones: on-prem, air-gapped, or a sovereign or regional cloud where AWS KMS is not an option; one policy model and one audit trail across more than one provider, so the keys move with the workload instead of staying locked in a single cloud's KMS; a Vault or OpenBao cluster that already has a team, a review process, and a pipeline the new token store should plug into. The sharper reason is custody. You hold the wrapping key, you can read the source, and the authorization config lives in git.

I will talk about OpenBao, the community fork after HashiCorp moved Vault to the Business Source License in 2023, because that is the product Posta uses. The same designs apply to Vault, with one caveat I will come back to: the cleaner of the two depends on a feature that landed in OpenBao 2.7.

There are two reasonable ways to do mode 3 here. Either the gateway logs in to OpenBao as the user, or you keep the broker from parts 2 and 3 and point it at OpenBao. Posta calls that second design mode 3b. I do not think either one wins outright. The login is simpler, but the token it hands back is scoped to the user, so a live request for one of that user's credentials can open whichever of them the controller picks. The broker scopes each decrypt to the one row the request is for, and you pay for that with another component on the request path.

## Who has to say yes

Parts 2 and 3 already covered the foundation, so I will not recast it. A per-row data key encrypts the token payload. A wrapping key, which the controller cannot reach, only wraps and unwraps those data keys. Mode 3 then takes the "yes" away from the controller: reading one credential needs the ciphertext from the store and an approval for that one row.

The thing that changes when the key custodian is OpenBao Transit, rather than KMS, is who plays the user-verifier and authorizer. KMS only ever sees an IAM role. OpenBao can authenticate an end user directly. That is why a second design even exists.

In the first design there is no broker. OpenBao verifies the user, mints a short-lived decrypt token, and also holds the wrapping key. On each live request the gateway calls `auth/jwt/login` with the user's subject token, OpenBao returns the decrypt token, and the gateway passes it to the controller. If only the gateway is allowed to call that login, a decrypt token only exists while a real request is in flight.

In mode 3b the broker keeps the authorizer role, but it does not mint anything. The controller asks OpenBao for the decrypt, OpenBao holds the request instead of running it, and the broker checks the subject token and approves that one request. OpenBao only plays key custodian.

## Let the gateway log in as the user

This design starts from a fact about KMS: the broker only exists because KMS cannot authenticate the end user. OpenBao's JWT auth method can, so the authorize step becomes a built-in, audited, fail-closed auth mount with no custom code. Posta credits a working demo from Mesut Özdil here, and he is right that in a few places, including token lifetime and fail-closed audit, this is tidier than what the KMS designs had to invent.

On a live request, the gateway logs in to OpenBao with the user's subject token. OpenBao verifies it against the identity provider and returns a short-lived token whose policy is templated to that user's Transit key. The token carries no key material, only permission to call Transit. Each user has their own Transit key, created with `derived=true`, and each row's `context` derives a different subkey, so a wrapped data key only unwraps with its own row's context. The controller sends the row's wrapped key and context to `transit/decrypt`, gets the plaintext data key back, and opens the upstream token locally. OpenBao never sees the credential itself.

The first thing to get right is who may call `auth/jwt/login`. A JWT login proves who the user is, not that they are making a request right now, and in this architecture the user may be asleep while a machine still holds their subject token. The controller has to hold that token: it is the input to the token exchange. If the controller can reach the login path, a compromised controller can do this after the fact. Posta's timeline is the one I would use as the test, not as a measurement of my own: Alice makes a real call, the controller keeps her subject JWT, and forty minutes later, with no traffic anywhere, it logs in, OpenBao sees a signature, an expiry, and an audience that all still pass, and the controller decrypts using ciphertext and context from its own database. It can repeat that for every JWT it harvested in the window. Every check passed the way it was supposed to. Liveness went from a short-lived token minted during a live request to about an hour of replay.

`token_bound_cidrs` does not close that gap. OpenBao checks the same list at login and on every use, so it cannot let the gateway log in and then stop the controller from using the token. What does help is letting only the gateway call `auth/jwt/login`, over a mutually authenticated channel, with every other caller denied. The only OpenBao tokens the controller ever sees are the ones the gateway hands it during a live request.

With the login path locked down, this is a good design. There is no broker to run or compromise, nothing writes OpenBao policy at runtime, and every authorization rule is config a Vault team can review in git.

The residual sits in what the login actually returns. The token is scoped to the user. The subject token says who, and nothing in it says which of that user's credentials the request is for. The per-row subkeys do not help, because the `context` is not a secret: it sits in the controller's database next to the wrapped key. The controller can send any of Alice's rows with that row's own matching context, and the policy, which only names her key, lets it through.

You can cap how much one token opens. Set `token_num_uses=1` on the JWT role and leave `batch_input` out of the decrypt path's allowed parameters, as the demo does, and one live request gets at most one row. The controller still picks which one. An attacker who sits on the controller spends each of Alice's live requests on her most valuable credential. Part 2 promised to protect this user's other credentials. This design weakens that on a live request. Pushing the row into the login is not really available: the gateway does not know the elicitation identifier, and `bound_claims` only matches static values in the JWT.

The login also drops the per-request checks the broker did in parts 2 and 3: policy over which resource, audience, and action a request is for, honeytoken rows that alert when someone asks for a decoy, and a log of why a decrypt was denied. `auth/jwt/login` only evaluates the claims in the JWT, so it never sees that request context. If you want those checks, you build them into the gateway before it calls the login, and the gateway is the most exposed component in the system. A compromised gateway takes the checks down with it.

A vault login gets you liveness if only the gateway can reach it, but even capped at one use, the token it gets back opens whichever of that user's credentials the controller picks. How much that matters depends on how many upstreams your users connect, and how valuable the ones a request was not for are. For a security assistant that talks to Wazuh, a ticketing system, and a cloud API, I would not treat those as one credential.


<figure>
  <img src="/diagrams/protecting-the-vault-with-openbao.svg" width="1076" height="974" alt="The egress gateway logs in to OpenBao as the user and receives a short-lived token scoped to that user's key. The controller then unwraps a row, and still picks which of the user's rows to open.">
  <figcaption>Only the gateway may call the login. Even then, the token names the user, not the row. How much that matters depends on how many credentials that user has. The flow follows Posta's November 2026 analysis. Pink marks a live token; a lock marks ciphertext.</figcaption>
</figure>

## Keep the broker, and point it at OpenBao

Mode 3b keeps the broker and leaves OpenBao as only the key custodian, but the broker does not mint a grant. The controller asks OpenBao for the decrypt itself. OpenBao holds that request instead of running it, and the broker either approves it or lets it expire. Before it approves, the broker verifies the user's subject token and the gateway's freshness proof, computes the owner from the subject, evaluates policy, and then checks that the request OpenBao is holding is for exactly the row this live request is about.

Those are two changes, and they are easy to conflate. OpenBao trusts nothing external: there is no JWT auth mount at all, so harvested subject tokens are worthless at OpenBao, and the only way a decrypt runs is a broker approval of that specific request. And the approval is per-row: the broker approves OpenBao's own copy of one request, which names one user's key and one row's context. Because only the controller knows the elicitation identifier, that request has to start at the controller.

The broker is also the natural place to add the agent's identity to the policy. The broker should verify the agent's identity itself. An agent identifier the gateway copies into its own proof is just the gateway's word.

The mechanism is control groups, added in OpenBao 2.7. A `control_group` on a policy path means a request to that path does not run until some other identity approves it. You name who can approve in the policy, which in this design is a group with one member, the broker. OpenBao does not run the request. It stores a copy and hands the caller a wrapping token instead of a result. Think of that token as a claim ticket for a request that has not run yet. Like every OpenBao token it also has an accessor, which is an identifier other components can use to refer to the token without being able to use it.

The controller sends the broker the accessor, plus the subject token and the gateway's proof. The broker looks up the stored request with `sys/control-group/request`, which returns the path and the exact parameters the controller sent, and if it checks out the broker approves it with `sys/control-group/authorize`. Then the controller calls `sys/wrapping/unwrap` with its wrapping token, and that is when OpenBao actually runs the decrypt and returns the result. Unwrap before the approval and you get an error. If nobody approves before the control group's `ttl`, the request expires. The controller gets a static Transit policy, in git, with its decrypt path gated on the broker, and nothing writes OpenBao config at runtime. The policy should also leave `batch_input` out, and `self_auth_allowed` should be false, so the controller cannot approve its own request.

The broker logs in with its own identity, for example a certificate, as an entity in that broker group. Its whole policy is `update` on `sys/control-group/request` and `sys/control-group/authorize`. It has no Transit path, it cannot mint tokens, and it cannot write policy. Do not give it `policy-write` anywhere in OpenBao. That turns it into an effective admin. When it reviews a held request, OpenBao returns its stored copy of exactly what the controller sent: the path, and the ciphertext and context in the original parameters.

The broker computes the context it expects from things it verified itself, the owner from the subject token, the resource from the gateway's proof, plus the elicitation identifier the controller named, and approves only if the path is that user's key and the context matches. Mode 3's two independent checks still hold. The ciphertext is bound to the row at wrap time, because a derived key plus a per-row context produces a different subkey. The caller is bound to the row at approval time, because the broker checks the context. Send some other ciphertext with this row's context and the broker may approve, but derivation fails when the decrypt runs. Send another row's ciphertext with its own context and the broker never approves it.

Nobody in this design holds a standing decrypt. The controller can only propose one. The broker can only approve what the controller already asked for, and it only ever sees the accessor, never the wrapping token. A compromised broker on its own decrypts nothing. A compromised controller on its own gets nothing approved without a live proof from the gateway. That is a tighter spot than either KMS variant: in part 2 the broker holds `CreateGrant`, and in part 3 it holds `kms:Decrypt`. There is also no per-row state in OpenBao. The only state is the held request, and it expires with the `ttl`.

If you are on Vault, or cannot run OpenBao 2.7 yet, Posta's fallback is the broker-unwrap variant from [part 3](/en/blog/scaling-the-token-vault/): the broker gets a static `transit/decrypt` policy, computes the context itself, and hands back the data key. That works, and you should be honest that the broker then holds a standing decrypt, the same residual it has on KMS.


<figure>
  <img src="/diagrams/protecting-the-vault-with-openbao-broker.svg" width="1076" height="807" alt="The controller proposes a decrypt, OpenBao holds the request, and a broker approves only that path and context. The controller then receives the data key. Nobody holds a standing decrypt.">
  <figcaption>The broker only ever sees an accessor, never the wrapping token, so a compromised broker cannot decrypt on its own. A compromised controller gets nothing approved without a live proof from the gateway. Pink marks a live token; a lock marks ciphertext.</figcaption>
</figure>

## The two side by side

Both designs stop a compromised controller from mass-decrypting the store, and in both a decrypt only happens during a live request through the gateway. The difference is scope and cost. In the vault login, a decrypt token opens one of the user's credentials of the controller's choosing, or all of them without the one-use cap. Request-context policy lives in the gateway or nowhere, and the whole thing is OpenBao config with no broker to run. In mode 3b the broker approves one row's decrypt at a time, that policy lives in a component the gateway does not control, and nothing, not the controller and not the broker, holds a decrypt it can run on its own. You pay for it with another component on the request path, four OpenBao calls per decrypt instead of two, and a dependency on control groups, which were still new when Posta wrote.

## A threat model for a self-hosted key service

A prompt injection that tries to steal a token from the agent is still the case [part 1](/en/blog/keeping-credentials-out-of-ai-agents/) was built for. Nothing here puts that token back in the model.

A compromised controller should not be able to walk the store in either design, provided the login path is locked down in the first and the broker cannot be bypassed in the second. On a live request, the designs part company. In the vault login, the controller can open a different row of the same user than the one the request was for. In mode 3b, it can only open the row the broker approved. I would treat "what can this process do with one live request" as part of the design, not as a footnote.

A compromised gateway still sees every token it is about to put on the wire. In the vault login it also holds the only path that can mint a decrypt token, and any request-context policy you bolted on in front of the login. In mode 3b the broker can still refuse a request the gateway has already accepted, which is the point of keeping that policy off the gateway.

A compromised broker, in mode 3b, should be able to approve a request and nothing else. If it can also write policy, or if it has a Transit path, the split has already failed. A compromised OpenBao node is a compromise of the wrapping key, in either design. That is the cost of holding the key yourself. The audit log has to live somewhere none of these components can reach. An audit trail that sits next to the cluster is not a trail.

## Failure modes I would not skip

If the controller can call `auth/jwt/login`, the vault login is not mode 3. It is a delayed, user-scoped unwrap of whatever the controller harvested. I would test that path the way Posta describes it: a subject token reused after the original request has finished, from a caller that is not the gateway.

A one-use decrypt token that still opens the wrong row is a passing test only if you have already accepted user-scoped decrypt. If you have not, the test has failed.

A control group that the controller can approve itself, a broker that never looks at the held `context`, or an approval that outlives a short `ttl` and can be unwrapped later, all drift back toward standing decrypt. The held request has to expire, and the broker has to approve OpenBao's copy of the request, not a description the controller sent it out of band.

If the broker or OpenBao is down, the request should fail closed. A fallback that lets the controller decrypt on its own, or that mints a longer-lived OpenBao token "just for outages," is the residual you were trying to remove, reintroduced as an operational convenience.

Do not install a JWT auth mount in mode 3b "for debugging." Harvested subject tokens become useful again the moment that mount exists.

If you port the broker-unwrap variant because you cannot run control groups, say so. It is a valid design. It is also the same standing-decrypt residual [part 3](/en/blog/scaling-the-token-vault/) already accepted on KMS.

<aside role="note" style="margin-block: 2rem; padding: 1rem 1.2rem; border: 1px solid var(--post-line); border-radius: 14px; background: color-mix(in srgb, var(--post-accent) 7%, var(--post-surface));">
<p style="margin: 0 0 0.35rem; font-family: var(--font-display); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--post-accent);">Still to record</p>
<p style="margin: 0; font-size: 0.98rem; line-height: 1.6; color: var(--post-text);">I have not yet run either OpenBao design in front of my own stack, and I will not invent login-replay windows or control-group timings. When I do, I will record whether a caller other than the gateway can obtain a decrypt token, whether a one-use token can still open a different row of the same user, whether the broker ever approves a held request whose context does not match, and whether an unapproved request can be unwrapped after the control group's lifetime.</p>
</aside>

## Where I would start

For the same read-only security assistant I have been using as a test case, I would start from how far one live request should reach. If that assistant talks to more than one upstream, I would want per-row scoping, which means mode 3b on OpenBao 2.7, a broker whose policy is only `sys/control-group/*`, and no JWT auth mount. If I were already on Vault and could not run that feature, I would port the broker-unwrap from part 3 and be explicit that the broker holds a standing decrypt. If the first integration is the only one that matters, I would start with the vault login, lock the login path down, set the token to a single use, and write down which other credentials of the same user that still leaves open.

Either way, I would ship the audit log somewhere none of the components can reach, and I would still ask the question [part 3](/en/blog/scaling-the-token-vault/) added: not only what an attacker can read when they arrive, but what they can collect if they stay on the hot path.

The controller, in both of these designs, still opens the row and still sees a plaintext access token. A [fifth post in this series](/en/blog/eliminating-plaintext/) looks at moving that last unwrap to the gateway, so the process that holds the store never sees the credential at all.
