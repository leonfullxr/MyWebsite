---
title: "What user context changes in LLM alert triage"
date: "2027-02-03"
description: "Applying a paired with-and-without-context triage experiment to a Wazuh stack, and a policy for when that context should not be allowed to close an alert."
tags: ["Security", "Wazuh", "Artificial Intelligence", "Detection Engineering"]
image: "/images/blog/covers/llm-context.png"
lang: "en"
---

Security analysts do not triage alerts in a vacuum. They look up the account, the role, the shift, and whether the host is a shared workstation. That context often changes the next question they ask. It can also become a reason to close something that still deserves a closer look.

An LLM that is asked to triage the same queue will use whatever context you give it. The question is not only whether that context makes the write-up richer. It is whether the model starts treating a job title or a working-hours window as a substitute for the telemetry.

This post was prompted by [Sourabh Kulkarni's account of a small lab that tested that tradeoff](https://www.linkedin.com/pulse/what-happens-when-you-give-llm-context-soc-analyst-has-kulkarni-nw3tc/). He ran each alert through Claude twice, once with the user's identity record and once without, and compared the verdicts. His telemetry path used Elasticsearch and Kibana. I want the same experimental shape on a Wazuh stack, which is the platform I actually work with, and then to be more explicit about the threat model, the detection logic, the prompt constraints, and the rule for when a human still has to look. That last part is the same concern I have been working through in [an evidence-first Wazuh assistant](/en/blog/evidence-first-ai-soc/): context is useful, but it is not evidence that a detection did not happen.

## A paired triage, not a single opinion

The design below keeps Kulkarni's fork and orients the collection path to Wazuh. Atomic Red Team generates the activity on a Windows 11 endpoint. A Wazuh agent on that host, with Sysmon as the telemetry source, ships the events to a Wazuh manager and indexer, where detection rules fire on the same techniques. n8n polls for open alerts, strips the event down to useful fields, converts the timestamp to local time, and looks up only that alert's user in a short identity table. It then clones the alert. Both copies use the same prompt and the same model. One includes the user record; the other does not. The JSON verdicts are stored and written into DFIR-IRIS as alerts, so the pair can be compared side by side.

Kulkarni's original lab used Elasticsearch, Kibana rules, and winlogbeat instead of this Wazuh path. I have redrawn the experiment around Wazuh, and I have annotated the outcomes he reported. Those outcomes are his, from the Elastic lab, not a run I have completed on my own stack.

<figure>
  <img src="/diagrams/llm-context-soc-triage-lab.svg" alt="A Windows 11 endpoint with a Wazuh agent and Sysmon sends events to the Wazuh manager and indexer. n8n polls for alerts, looks up the user, and clones each alert. Claude triages the same alert twice, once without a user record and once with one. Both verdicts are stored and sent to DFIR-IRIS. A note credits Kulkarni's original Elasticsearch and Kibana lab. The diagram annotates his October 2026 results: for an LSASS dump by IT admin rskipper, the model escalated as a high-confidence true positive without context, then escalated as undetermined with medium confidence once the user record was included. For Domain Admins enumeration, it escalated both users without context; with context it closed rskipper as a benign true positive and escalated mailroom clerk srico, whose command ran after shift at 17:05 MDT." width="1253" height="1142" style="width: 100%; height: auto;" />
  <figcaption>A Wazuh-oriented split: the same alert is triaged twice. The outcome annotations follow Kulkarni's Elastic lab (October 2026) and are not a local Wazuh reproduction.</figcaption>
</figure>

The value of the design is the fork. If you only ever score a model that has been given enrichment, you cannot tell whether the context helped, added nothing, or talked the model out of a finding it would otherwise have held.

## What the detections actually establish

The original lab used two rules, and they are not equally sensitive to identity context.

The first is an LSASS memory dump via `comsvcs.dll`. In Kulkarni's Kibana rules this was scored High, with a risk score of 73; a Wazuh rerun would use its own rule IDs and levels, which I have not assigned here. In practice this is credential access. The useful telemetry is a process-access event on LSASS (Sysmon event ID 10) whose call path involves `comsvcs.dll` and the MiniDump export. Atomic Red Team tracks this technique as T1003.001. A dump of LSASS is a credential theft technique whether or not the operator has an administrative job title. An "IT admin on a shared workstation during working hours" story can explain why someone was at the keyboard. It does not make MiniDump a routine troubleshooting step. If the session itself cannot be verified, that uncertainty belongs in the case, not in a close decision.

The second is domain group enumeration via `net`. His Kibana rule scored this Medium, with a risk score of 47. A command that lists Domain Admins from the domain is discovery (T1069.002). Administrators run it legitimately, so context is more relevant here than in the LSASS case. It is still only a starting point. The command can fail and still be worth reviewing: in Kulkarni's screenshots the lab VM was not domain-joined, and the command returned system error 1355, yet the detection fired and the model still had to issue a verdict. A failed discovery attempt is not the same thing as no discovery attempt. The host was a shared workstation, and the account in the event was a local user on that host. Those facts should survive the enrichment step rather than being replaced by the role in the HR record.

I would treat these two rules differently in a close policy even before an LLM is involved. That is the same distinction I argued for when [connecting Wazuh detections to investigation guidance and runbooks](/en/blog/detection-driven-incident-response/): the detection tells you that a rule matched. The response decision depends on what the evidence can actually support.

## What the original runs showed

Kulkarni reported two tests. I am restating his results, not claiming them as mine.

For the LSASS dump, run as the IT administrator `rskipper`, the model without context called the alert a true positive with high confidence and escalated. With the admin's record, it still escalated, but the verdict dropped to undetermined and the confidence to medium. The write-up began to suggest the activity "might be legitimate troubleshooting." Context made the model less sure about a high-severity credential access event. It did not, in this case, close the case.

For Domain Admins enumeration, the model without context escalated for both `rskipper` and the mailroom clerk `srico`. With context, it closed the administrator's alert as a benign true positive, with no action needed, and became more suspicious of the clerk. The `rskipper` session ran at 15:45 MDT, inside his 08:00–17:00 window. The `srico` session ran at 17:05 MDT, three hours after her shift ended. Both of those with-context calls are defensible as analysis. The uncomfortable one is the close: it auto-closed activity by a highly privileged account, on a shared workstation, and the model itself noted that confidence was only medium because the host is shared and the session could not be verified. That caveat, as Kulkarni pointed out, should have been enough to keep the case open.

The with-context titles were also rewritten to include the role and the hours. That makes the case easier to scan. It also shows how readily the model will lead with the identity story once the record is in the prompt.

<aside role="note" style="margin-block: 2rem; padding: 1rem 1.2rem; border: 1px solid var(--post-line); border-radius: 14px; background: color-mix(in srgb, var(--post-accent) 7%, var(--post-surface));">
<p style="margin: 0 0 0.35rem; font-family: var(--font-display); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--post-accent);">Still to record</p>
<p style="margin: 0; font-size: 0.98rem; line-height: 1.6; color: var(--post-text);">I have not yet rerun this experiment on my own Wazuh stack. When I do, I will record the paired verdicts, confidence, and close decisions here, including any disagreement with Kulkarni's results.</p>
</aside>

## A threat model for context

Two failure modes matter more than a slightly worse label on a single alert.

The first is over-trust. The model is given a tidy record: role, group, working hours, manager. It then uses that record to explain away telemetry. The LSASS case is the mild version: confidence falls and a troubleshooting narrative appears, even though a MiniDump of LSASS is not explained by "this person is an administrator." The Domain Admins close is the severe version: a medium-confidence, unverified session is marked benign because the role and the clock line up. Privileged users are exactly the accounts where this bias is most expensive. A compromised administrator looks, in an HR file, like an administrator at work.

The second is context poisoning. The identity record, the ticket, or the change window is itself an input an attacker can influence. A stale or attacker-edited title, a planted "approved troubleshooting" note, a service account whose purpose is described too generously, or a user who is already on a notice period can all be used to talk a model into a close. Shared workstations make this worse, because the person in the directory may not be the person in the session. If the close decision is automated, the poisoned context becomes an evasion, not just a bad write-up.

There is a narrower issue in the prompt itself. Alert fields are untrusted data. A command line, a process name, or a comment in a ticket can carry text that looks like an instruction. If those fields are interpolated into the prompt as if they were developer guidance, the model may follow them. The fields have to be treated as data: delimited, clearly attributed to the event, and never as instructions to execute.

## Guardrails in the prompt

The useful discipline in Kulkarni's prompt design is the split between what was observed and what was inferred. I would keep that split, and I would make it binding on the close path.

Observed claims are things the telemetry actually contains: the process, the target, the timestamp, the host, the account in the event, the success or failure of the command. Inferred claims are everything else: that the operator was the person in the HR record, that the activity was troubleshooting, that a shift window makes the action expected, that a manager would approve it. Inferred claims can appear in the write-up. They should not be sufficient to close.

A few other rules belong in the same place. Role is not authorization for credential dumping. A medium or lower confidence, or a caveat the model has already written ("session could not be verified", "shared host"), is not a benign true positive. Alert fields are data, not instructions. If the close would rest on an inferred identity story, the verdict should be held for an analyst even when the model would prefer to close.

## How I would score a rerun

A single anecdotal pair is a good story and a weak evaluation. The lab already has the right structure for something more careful: a paired with-context and without-context run of the same alert, with the same prompt and model. I would keep that pairing, and I would repeat each pair more than once, because a model's verdict can move between runs.

The metric I care about most is an unsafe-close rate: of the alerts a reviewer would still want open, how often did the model close them? The reviewer's "should stay open" set should include high-severity credential access, activity by privileged or service accounts, unverified sessions on shared hosts, and any close whose rationale is mostly inferred. I would report that rate separately for the with-context and without-context conditions. Context that improves write-ups but raises the unsafe-close rate is not an improvement.

Secondary measures are still useful: agreement with a labeled expected decision, whether confidence moves in the right direction, and whether the model is consistent across repeated trials of the same pair. Failed model calls and missing user lookups should be counted as missing results, not as quiet closes. That is the same reporting habit I want in the Wazuh assistant: a failed check must not look like a successful all-clear.

<aside role="note" style="margin-block: 2rem; padding: 1rem 1.2rem; border: 1px solid var(--post-line); border-radius: 14px; background: color-mix(in srgb, var(--post-accent) 7%, var(--post-surface));">
<p style="margin: 0 0 0.35rem; font-family: var(--font-display); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--post-accent);">Still to measure</p>
<p style="margin: 0; font-size: 0.98rem; line-height: 1.6; color: var(--post-text);">After the local runs, I will put the trial count, the labeled expected decisions, the unsafe-close rates for both conditions, and the disagreement cases here.</p>
</aside>

## Where a human still has to look

Kulkarni's rule of thumb is the right starting point: send verdicts that lean on inferred claims to an analyst, and let the model carry more of the ones backed by observed evidence. I would turn that into an explicit close policy before hooking the output to a case system.

A model may recommend a close. It should not be allowed to close, at least not in this kind of pipeline, when the detection is high severity; when the account is privileged, a service account, or otherwise high value; when the host is shared and the session is unverified; when confidence is medium or lower; when the rationale depends on inferred role, hours, or intent; or when the model has already written a caveat that contradicts a benign close. Context can raise suspicion more freely than it can clear a privileged action. The mailroom clerk enumerating Domain Admins after hours is a good example: the identity record made the case more suspicious, which is a safer use of context than using the administrator's record to close.

This is consistent with the way I have been designing the Wazuh assistant. That service is read-only. It gathers a bounded evidence pack, and it leaves the decision with the analyst. User context, if I add it later, should arrive as a clearly labeled input in that pack, not as a silent prior that the model is allowed to treat as proof.

## Limits of a lab like this

The original experiment is a lab, not a SOC. It used two techniques, a handful of fictional users, a manually triggered workflow, and one model. The identity table is cleaner than a real directory or HR export. The Windows 11 VM was not domain-joined, so the enumeration command failed in a way a production domain would not. Those limits do not make the findings uninteresting. They do mean the unsafe close on a privileged account should be read as a warning about the method, not as a measurement of how often a particular product would do the same thing.

My own rerun will have limits of its own. I will document the Wazuh stack I actually use, including rule IDs and any place the pipeline differs from his Elasticsearch lab, rather than implying that I reproduced his environment exactly.

If you are buying an AI SOC tool, the question I would take from this lab is simple: can the vendor show paired reasoning, including the cases it would close, or only a richer write-up with an LLM attached? If you are building one, plan the context sources, the untrusted-data handling, and the human gate at the same time as the prompt. The context will change the answer. The design has to decide, in advance, when that change is not allowed to close the case.
