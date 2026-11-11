---
title: "Building incident response around Wazuh detections"
date: "2026-11-06"
description: "A practical approach to connecting Wazuh alerts with investigation guidance, incident procedures, and response runbooks."
tags: ["Security", "Wazuh", "Detection Engineering", "Incident Response"]
image: "/images/blog/covers/incident.png"
lang: "en"
translation: "respuesta-incidentes-desde-deteccion"
---

A Wazuh alert can tell us that a rule matched an event. The next questions are less likely to fit in the alert itself. Is this activity expected? What else happened on the host? Who can authorize a block, and how do we undo it if we get it wrong?

Those answers often live in different places. The incident response plan may tell us who has authority, while the technical steps sit in a wiki or in someone's memory. At three in the morning, an analyst needs a way to get from the alert to both.

This post builds on [Rcegan's article on detection-driven incident response](https://detect.fyi/re-writing-the-playbook-a-detection-driven-approach-to-incident-response-5269e2eb33ca). The central idea is to connect the guidance for an individual detection to broader incident procedures and detailed runbooks. Here I apply that idea to Wazuh, using an SSH alert as a worked example. The process and diagrams below are proposed ways to organize the work, not built-in Wazuh features.

## Give each document a job

An organization may need a formal incident response policy for management, contracts, or compliance. That document can define ownership, reporting, and decision-making authority. It does not need to explain which Wazuh fields to inspect during an SSH investigation.

A scenario procedure handles a narrower problem, such as a compromised server or account. It explains when to escalate, who to contact, and what containment actions may be authorized. For a managed SOC, the procedure also needs to identify the customer and any agreed restrictions.

The detection guidance sits closer to the alert. It describes what a particular rule is looking for, what evidence to check, and what might make the match benign. A technical runbook then explains how to perform an approved action on a specific platform and how to check or reverse it. Keeping these pieces separate lets a team change a firewall command without rewriting its incident policy.

<figure class="ir-diagram-figure architecture-figure">
  <picture class="diagram-light">
  <source media="(max-width: 600px)" srcset="/images/blog/incident-response-layers-en-mobile.svg">
  <img src="/images/blog/incident-response-layers-en.svg" alt="Policy guides incident procedures, which inform detection guidance linked to a technical runbook.">
</picture>
  <picture class="diagram-dark">
  <source media="(max-width: 600px)" srcset="/images/blog/incident-response-layers-en-dark-mobile.svg">
  <img src="/images/blog/incident-response-layers-en-dark.svg" alt="Policy guides incident procedures, which inform detection guidance linked to a technical runbook.">
</picture>
  <figcaption class="ir-diagram-caption">A proposed way to connect response documents, from authority to the steps an analyst can use.</figcaption>
</figure>

The links between those pieces matter. A rule owner can maintain one investigation guide for a detection, while each customer or environment has its own contacts and runbooks. Wazuh does not create those documents or enforce that link for you. The team can keep them in an accessible wiki or case system and include a stable reference wherever analysts work with alerts.

## Start with an SSH alert

Imagine Wazuh raises an alert for repeated SSH authentication failures. The alert is a reason to investigate, not proof that an attacker logged in. Wazuh's [SSH brute-force example](https://documentation.wazuh.com/current/user-manual/capabilities/active-response/ar-use-cases/blocking-ssh-brute-force.html) uses rule `5763` in a particular setup. Treat that as an example and verify the rules and decoded fields in your own version and environment.

Open the alert and record its timestamp, `rule.id`, rule description, agent identity, and any relevant source IP or account fields that are actually present. The exact fields depend on the event and decoder. The manager may also have alerts in `/var/ossec/logs/alerts/alerts.json` when JSON alert logging is enabled. Our [alert-search example](https://github.com/leonfullxr/Wazuh/tree/main/scripts/alert-search) shows how to search that file by rule ID and time window, though it only searches the local file and the window you choose.

Next, widen the time window and look for related authentication events on the affected host. Did the failures involve one account or several? Is there a later successful login from the same source? Is the source a known scanner, a jump host, or a shared address? If a login succeeded, look for subsequent activity using the telemetry available in that environment.

A source address alone rarely settles the case. A shared VPN or NAT address can represent many users, and an expected scanner can produce a noisy alert. Record what supports the assessment and what you could not check. Missing logs, an offline agent, or a search outside the right time window should remain visible in the handoff.

<figure class="ir-diagram-figure architecture-figure">
  <picture class="diagram-light">
  <source media="(max-width: 600px)" srcset="/images/blog/incident-response-flow-en-mobile.svg">
  <img src="/images/blog/incident-response-flow-en.svg" alt="A Wazuh SSH alert goes to analyst triage, a response decision, and an approved runbook. Separately configured Active Response can trigger an endpoint action automatically.">
</picture>
  <picture class="diagram-dark">
  <source media="(max-width: 600px)" srcset="/images/blog/incident-response-flow-en-dark-mobile.svg">
  <img src="/images/blog/incident-response-flow-en-dark.svg" alt="A Wazuh SSH alert goes to analyst triage, a response decision, and an approved runbook. Separately configured Active Response can trigger an endpoint action automatically.">
</picture>
  <figcaption class="ir-diagram-caption">An illustrative investigation. Active Response runs automatically when configured; it does not wait for the analyst's approval.</figcaption>
</figure>

## Write the response plan alongside the rule

The detection engineer knows which event or combination of events caused the rule to fire. That context belongs in the response plan before the rule reaches production. An analyst can then review the plan and check whether the recommended data and queries are available in the environment they cover.

For an SSH detection, the plan could name the fields to collect, describe normal administrative or scanning activity that may explain the alert, and link to the compromised-host procedure. It should say when to escalate and what evidence to preserve. It should also name an owner and a review date, so a changed log format or an obsolete contact does not quietly make the guide useless.

Test the detection as well as the document. [Wazuh logtest](https://documentation.wazuh.com/current/user-manual/ruleset/testing.html) can help verify how sample events are decoded and which rules match. Include a relevant match and a benign or near-miss example. Our [custom rules checklist](https://github.com/leonfullxr/Wazuh/tree/main/rules) also calls for checking IDs and decoded fields, then monitoring alert volume after rollout. A logtest result does not by itself prove that an alert reached the analyst or that the response procedure works end to end, so exercise that path separately.

## Put authorization before containment

If the investigation points to an active threat, the scenario procedure should make the next decision clear. Who can approve a network block? Does the customer need to be contacted first? Which systems or shared addresses must not be blocked without additional review?

The runbook can then explain the actual steps for that environment, including how to verify the change, how long it should remain in place, and how to reverse it. Record who made the decision and what was done. A host firewall change is not the same as blocking traffic at a perimeter firewall, and either action can affect legitimate users.

Wazuh [Active Response](https://documentation.wazuh.com/current/user-manual/capabilities/active-response/index.html) can execute configured scripts in response to matching alerts. For example, the official SSH walkthrough uses `firewall-drop` on the endpoint that generated the event. This is an automated response when configured, not an approval workflow. If approval is required, design that decision and execution path separately rather than assuming a rule waits for a person.

Scope matters. The [configuration reference](https://documentation.wazuh.com/current/user-manual/reference/ossec-conf/active-response.html) describes where commands run, the rules that can trigger them, and timeouts for supported responses. A timeout is meaningful only when the command supports reversal. Test the chosen rule, source field, target, and rollback in a lab before enabling a response. The [local Active Response notes](https://github.com/leonfullxr/Wazuh/tree/main/scripts/active-response) provide examples to compare with the official documentation and your installed version.

## Close the loop after the incident

A detection response plan should change when an analyst finds a better query or an incident exposes a missing step. After a real investigation or a tabletop exercise, review whether the alert contained enough context, whether the links worked, and whether the right person could make the containment decision. Check that the runbook explains how to confirm and undo the action.

You do not need to rewrite every playbook at once. Pick a noisy or high-impact Wazuh rule, follow it from alert to decision with an analyst, and fix the first gap you find. That is also a useful way to put the [detection engineering maturity model](/en/blog/detection-engineering-maturity-model/) into practice.
