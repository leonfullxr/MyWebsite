---
title: "A practical way to assess detection engineering maturity"
date: "2026-11-06"
description: "A reading note on Elastic's detection engineering maturity model and how to turn an assessment into a useful improvement plan."
tags: ["Security", "Detection Engineering", "Elastic"]
lang: "en"
translation: "modelo-madurez-ingenieria-deteccion"
---

How do you show that a detection program is improving? Counting rules alone says little about whether they work or whether analysts can respond to their alerts. [Rcegan's article on Detect FYI](https://detect.fyi/from-zero-to-expert-level-detection-engineering-with-elastics-maturity-model-bc230107741e), published on October 5, 2024, introduces Elastic's Detection Engineering Behavior Maturity Model (DEBMM) as a way to have that conversation.

Elastic's original article, [Elastic releases the Detection Engineering Behavior Maturity Model](https://www.elastic.co/security-labs/threat-command/elastic-releases-debmm), by Mika Ayenson, Terrance DeJesus, and Samir Bousseaden, describes five tiers, from foundational work on individual rules to an expert program that incorporates threat hunting and automation. Between those points are practices such as version control, tuning false positives, documenting coverage gaps, and testing for missed threats. Each tier has criteria for assessing both the state of a ruleset and the work needed to maintain it.

![Elastic's maturity model shown as a cycle: tier 0 foundation, tier 1 basic, tier 2 intermediate, tier 3 advanced, tier 4 expert, followed by refine, repeat, and mature.](https://images.contentstack.io/v3/assets/bltefdd0b53724fa2ce/blt181534fe2ef46811/6a7c80d18fc2d05fa33e889c/image5.png)

*Image: Elastic, from its [DEBMM article](https://www.elastic.co/security-labs/threat-command/elastic-releases-debmm).*

## Put the model to work

Start with a narrow assessment: pick an important data source or threat scenario, then record which detections cover it, who owns them, and when they were last tested. Capture known gaps alongside the evidence for each claim. A map of ATT&CK techniques can help organize the review, but a mapped rule is not proof that it fires against the behavior it describes.

Choose one improvement that the team can sustain. For example, agree on a review date for noisy rules and track the outcome of each tuning change. For a high-priority detection, run a safe, authorized test and record whether the expected alert reached an analyst. These examples are starting points, not prescribed targets from Elastic.

Repeat the assessment and share the gaps and progress with stakeholders. Elastic cautions that advanced practices need time and staffing, and that skipping foundational work can weaken them. Use the model to prioritize the next useful change, rather than treating a tier as a certification.
