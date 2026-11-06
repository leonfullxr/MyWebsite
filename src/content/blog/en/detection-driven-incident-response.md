---
title: "Connecting detection alerts to incident response"
date: "2026-11-06"
description: "How detection-specific guidance, response procedures, and runbooks can help analysts move from an alert to an authorized action."
tags: ["Security", "Detection Engineering", "Incident Response"]
lang: "en"
translation: "respuesta-incidentes-desde-deteccion"
---

An alert lands in the queue. The rule matched something suspicious, but now what? The analyst still needs to work out what happened, where to look next, and who can approve a response. Those answers might be scattered across a wiki, a customer agreement, and a runbook that nobody has opened in months.

In an [article for Detect FYI](https://detect.fyi/re-writing-the-playbook-a-detection-driven-approach-to-incident-response-5269e2eb33ca), Rcegan suggests connecting the guidance for each detection to the wider incident response process. The detection plan helps an analyst investigate. The procedure sets out who makes decisions and who needs to know. The runbook covers the steps for a particular system or customer.

## Follow one alert through the response

Imagine an alert for a suspicious sign-in. The analyst needs the account, the time, the source address, and an explanation of why the rule fired. From there, the detection plan can point to recent account activity and identity-provider logs. A sign-in from an unusual location deserves a look, but it does not prove that someone stole the account.

If the evidence warrants escalation, the analyst can follow the account-compromise procedure to find out who to notify and who can authorize containment. An environment-specific runbook then explains how an approved responder can revoke sessions or disable the account, check that the action worked, and record what happened. If the logs are missing, that gap belongs in the investigation too. An empty search is not proof that the account is safe.

This gets more complicated in a managed SOC. Two customers might use the same identity platform but have different contacts and rules for disabling accounts. A shared detection plan can link to each customer's details, so the analyst doesn't have to guess what they are allowed to do.

## Keep the links useful

The plan needs to be easy to find when an alert fires. Link it from the detection, and ask an analyst to try the queries before the rule goes live. After an incident or exercise, revisit the parts that slowed the team down. Maybe a field was missing, a link was broken, or nobody knew who was on call for the customer.

Give someone responsibility for keeping the plan current and set a date to review it. Automating repetitive evidence collection can save time, but actions that change access still need the right authorization, whether a person or a tool carries them out.

The [detection engineering maturity model](/en/blog/detection-engineering-maturity-model/) offers a way to build on this work. Start with one detection, test the guidance with the people who use it, and carry those lessons into the next review.
