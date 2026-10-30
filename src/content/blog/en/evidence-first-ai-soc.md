---
title: "Building an evidence-first AI SOC assistant"
date: "2026-10-28"
description: "How a read-only Wazuh assistant can help analysts investigate alerts while keeping evidence, access, and uncertainty visible."
tags: ["Security", "Wazuh", "Artificial Intelligence"]
lang: "en"
---

Security analysts spend much of an investigation gathering context. An alert may point to a failed login, a vulnerable package, or a service problem, but the alert alone rarely explains what happened. The analyst has to find the relevant records, establish the time window, and decide whether the available data supports a conclusion.

An AI assistant can help organize that work. It also introduces a problem: a fluent answer can make an unsupported conclusion sound convincing. I am developing a read-only Wazuh AI SOC assistant around a more constrained approach. The service gathers evidence first, gives a model a bounded set of facts, and checks its proposed findings before showing them to the analyst.

This post was prompted by [Cloudflare's account of its agentic security operations design](https://blog.cloudflare.com/agentic-security-operations/). Its discussion of evidence, scope, and missing data applies beyond one platform. My project takes a different shape: it answers analyst questions about Wazuh, rather than processing Cloudflare's alert queue.

## Why the evidence path matters

A detection rule is a starting point for an investigation. A failed login alert can tell you that a rule matched, but it does not establish whether a password was compromised or whether an attacker gained access. To make that claim, an analyst may need to connect authentication events, the affected account, the source, and a time window. Each connection needs evidence.

An assistant can make the same mistake in two directions. It can treat a detection as proof of an incident. It can also interpret an empty search as proof that nothing happened, even when the search used the wrong time window or lacked access to a source. A convincing explanation does not repair either mistake.

The design therefore separates the work of collecting records from the work of interpreting them. It also records what the assistant could not check. The difference is operational: an analyst can decide whether to widen the investigation instead of relying on an unsupported all-clear.

<style>
.soc-diagram-light, .soc-diagram-dark { width: 75%; max-width: 480px; margin: 2rem auto; }
.soc-diagram-dark { display: none; }
.dark .soc-diagram-light { display: none; }
.dark .soc-diagram-dark { display: block; }
</style>
<img class="soc-diagram-light" src="/images/blog/ai-soc-evidence-flow.svg" alt="An analyst asks a question, the assistant gathers evidence under their permissions, checks model findings, and returns an answer for review.">
<img class="soc-diagram-dark" src="/images/blog/ai-soc-evidence-flow-dark.svg" alt="An analyst asks a question, the assistant gathers evidence under their permissions, checks model findings, and returns an answer for review.">

The diagram follows one topic through the service. A question can produce more than one topic plan, with a separate evidence pack and judgment for each.

## Start with a question and a bounded plan

The assistant starts with an analyst's question. A deterministic planner maps that question to reviewed topics, a time window, and approved data requests. If the question is ambiguous or lacks information needed for a plan, the assistant asks for clarification instead of guessing.

For example, a question about LDAP alerts needs a time window before a count has a useful meaning. A count over the last day answers a different question from a count over the last month. The plan makes that boundary explicit before the service queries Wazuh.

Each query uses a service-owned template and an allowed set of fields. The analyst cannot supply an arbitrary index name or query. Reads use the analyst's own site authority, so the assistant does not gain broader access just because it can call a model.

## Give the model evidence, not access

For each topic, the service collects fetch results, check results, and evidence items into an evidence pack. The pack is hashed and tied to its topic. A model can judge that pack, but it has no tools and cannot fetch raw logs or expand the investigation on its own.

The distinction matters when a question covers more than one topic. The assistant produces a separate judgment for each topic, and a finding cannot cite evidence from another topic's pack. That makes it easier to trace a statement back to the records that support it.

The model proposes structured findings using approved templates. Application code then checks the citations, required values, and prerequisites. If a finding refers to unknown evidence, uses an unsupported value, or fails a required check, the service removes it and records why. The service renders the accepted finding; the model does not write its final wording.

These checks limit what the assistant can claim. They do not prove that it found every relevant threat. A model can still miss something, and a valid citation alone is not a substitute for an analyst's judgment.

Consider a hypothetical authentication investigation. The service may retrieve an aggregate count and a sample of matching records for the requested period. A model might propose a finding about an account or source address. The validator checks that the cited evidence belongs to the topic and contains the values used by the proposed finding. If the model names a different account, the finding is removed. A plausible sentence cannot turn an absent value into evidence.

This also explains a deliberate trade-off. Approved templates restrict the kinds of findings the assistant can express. That limits creative but unsupported explanations, while also meaning a real pattern outside the reviewed templates may not appear as a finding. Analysts still need access to the underlying records and a way to investigate beyond the assistant's answer.

## Keep missing data visible

An empty result and an unavailable source mean different things. A query may return no matching records, or the analyst may lack visibility into part of the data. A source may also be unavailable. Treating all of those cases as "nothing found" would give the analyst a false sense of coverage.

The assistant reports missing, filtered, denied, unsupported, or unavailable telemetry as such. Even a confirmed empty result applies only to the queried scope and time window. It does not establish that the environment is healthy.

Counts need the same care. The service uses backend aggregates rather than counting the rows shown on a page. It labels approximate counts, and it requires exact counts or a demonstrably complete cohort for threshold and absence statements. A first page of results is not the whole population.

## What a Wazuh-based benchmark found

A recent [Alert-Bench research preprint](https://arxiv.org/abs/2610.10608) gives a useful example of why empty searches deserve attention. The authors replayed enterprise telemetry through a Wazuh SIEM and evaluated five AI investigation approaches on the same 1,247 alerts. The sample included 225 attack-related alerts and 1,022 benign alerts from a four-day attack scenario.

In that study, the strongest of the five approaches by F1 score missed 40.4% of attack-related alerts. The authors also found that attacks were often dismissed after searches returned no records. A search that returns nothing can be relevant evidence, but its meaning depends on what was searched, the time window, and the available telemetry. Without those conditions, an empty result is a weak basis for closing an investigation.

The researchers then tested AIDA, a separate multi-agent design that adds an explicit proposed decision, an independent challenge, and a judge. On the same sample and with GPT-4.1, they reported a 3.1% false-negative rate and an F1 score of 0.958. The stronger coverage came with more analyst escalations: 18.4% of all alerts, compared with 8.5% to 14.0% for the five earlier approaches. AIDA averaged 33,942 tokens and 12.7 seconds per alert in that experiment.

Those figures describe the paper's system, data, and setup, not my assistant. Most attack alerts in the sample came from two reconnaissance categories, and the authors call for evaluation on independently collected SOC telemetry. A lower missed-attack rate is useful only alongside the number of benign alerts sent to analysts, the cost of the work, and the kinds of attacks in the test set. The study also starts with alerts already generated by a detector; it does not measure threats the detector never surfaced.

Cloudflare describes a related lesson in its own implementation: it separates evidence collection and scope enforcement from model analysis, and it records gaps when a source is unavailable. Its infrastructure and telemetry differ from Wazuh, but both examples show why an investigation needs to preserve the distinction between a search result and a conclusion.

## How I would evaluate the assistant

For AI SOC, a useful benchmark needs more than a collection of well-formed answers. I want to know whether an analyst receives the right evidence, whether a finding is supported, and whether the answer exposes a missing source. Those are different questions from whether the prose sounds convincing.

A replay set with reviewed labels can compare the assistant against the same questions and records across versions. It should include routine cases as well as cases with partial visibility, denied access, empty results, and incomplete time windows. Results need denominators: how many cases were evaluated, how many were left out, and how many relevant findings were missed. False positives and false negatives matter together, because reducing analyst workload by dismissing genuine attacks is not an improvement.

The repository also specifies separate reporting for missing runs, failed model calls, and an empty set of candidate findings. That distinction prevents a failed evaluation from looking like a successful run with no findings. The current local fixture uses a synthetic model and synthetic data. It is useful for testing behavior, but it cannot establish detection quality, production latency, or an analyst time saving.

## Leave the decision with the analyst

AI SOC is read-only with respect to Wazuh. It does not change configuration or run active response. Its role is to help the analyst inspect evidence and decide what to investigate next, not to make changes on their behalf.

The service records the provenance of an answer, including the service and content versions and the evidence pack digest. It publishes an answer only after its audit record is durably acknowledged. If a stage cannot complete, the answer identifies what was left out and why.

That audit trail makes a finding easier to examine, but it is not a measure of detection quality. The project's tests exercise the boundaries described here; measuring how often the assistant finds real threats requires labeled outcomes and a replay baseline. The local development setup uses synthetic fixtures, so its answers are not evidence of performance in a live Wazuh environment.

The goal is an assistant that saves investigation time without hiding the limits of its evidence. The analyst still decides what the evidence means and what action, if any, to take.
