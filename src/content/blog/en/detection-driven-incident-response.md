---
title: "Connecting detection alerts to incident response"
date: "2026-11-06"
description: "How detection-specific guidance, response procedures, and runbooks can help analysts move from an alert to an authorized action."
tags: ["Security", "Detection Engineering", "Incident Response"]
lang: "en"
translation: "respuesta-incidentes-desde-deteccion"
---

An alert tells an analyst that a detection matched. It does not necessarily say what evidence to collect next, who can approve containment, or how to act in the affected environment. Those answers often live in separate documents, if they are written down at all.

In [Re-Writing the Playbook: A detection-driven approach to Incident Response](https://detect.fyi/re-writing-the-playbook-a-detection-driven-approach-to-incident-response-5269e2eb33ca), published on Detect FYI on October 15, 2025, Rcegan proposes connecting detection-specific response plans to broader incident procedures and detailed runbooks. The distinction gives each document a job: one helps an analyst interpret an alert, another establishes the response process, and another explains how to carry out a particular action.

## Follow one alert through the response

Consider a hypothetical alert for a suspicious sign-in. A useful detection response plan starts with the context needed to investigate: the affected account, sign-in time, source address, and the reason the activity matched. It can point the analyst to recent account activity and identity-provider records, while noting that an unusual location alone does not prove compromise.

If the evidence supports escalation, the plan can link to the account-compromise procedure. That procedure identifies who to notify and how containment decisions are authorized. A separate, environment-specific runbook can explain how an approved responder revokes sessions or disables an account, including how to confirm the change and record the outcome. If the required records are unavailable, the analyst should record that gap rather than infer that the account is safe.

The exact evidence, approval path, and containment steps depend on the organization. For a managed SOC, they may also differ between customers. A shared detection plan can point to each customer's approved contacts and runbooks without assuming that the same action is authorized everywhere.

## Keep the links useful

A response plan is most useful when analysts can reach it from the alert and improve it after an investigation. Before deploying a detection, have an analyst check whether the described fields and queries are available. After a relevant incident or exercise, review the guidance against what actually happened, including missing telemetry and confusing handoffs.

Track an owner and review date for the plan, and test links to procedures and runbooks. Automate repetitive collection where it helps, but keep authorization and human review appropriate to the action. A response step that changes access needs a clear decision point, whether a person or a tool executes it.

This is also a practical way to apply the [detection engineering maturity model](/en/blog/detection-engineering-maturity-model/): improve the evidence and response around one detection, test the result, and use what the team learns to choose the next improvement.
