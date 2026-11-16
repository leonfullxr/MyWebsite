---
title: "A practical way to assess detection engineering maturity"
date: "2026-11-06"
description: "A reading note on Elastic's Detection Engineering Behavior Maturity Model: what each tier asks of a team, how to assess one data source with evidence, and how to choose the next improvement."
tags: ["Security", "Detection Engineering", "Elastic"]
image: "/images/blog/covers/maturity.png"
lang: "en"
translation: "modelo-madurez-ingenieria-deteccion"
---

Ask a security team how its detection program is doing and you will often hear a number: 400 custom rules, 70% of ATT&CK covered, a few new rules a week. Those numbers are easy to collect and hard to interpret. Some of those rules may depend on logs nobody ingests anymore. Others fire so often that analysts close the alerts without reading them, and a few have never fired at all, which can mean the behavior never happened or that the rule is broken. The count says nothing about which case applies.

[Rcegan's article on Detect FYI](https://detect.fyi/from-zero-to-expert-level-detection-engineering-with-elastics-maturity-model-bc230107741e), published on October 5, 2024, made me look at a better way to frame the question. It walks through Elastic's [Detection Engineering Behavior Maturity Model](https://www.elastic.co/security-labs/threat-command/elastic-releases-debmm) (DEBMM), which Mika Ayenson, Terrance DeJesus, and Samir Bousseaden published at Elastic Security Labs on September 6, 2024. This post summarizes the model, then applies it to a single Wazuh data source, which is how I would start using it.

## What the model measures

DEBMM assesses the behaviors of a detection engineering team, not individual engineers and not one ruleset in isolation. The question it asks is whether the team has repeatable habits for building, testing, tuning, and retiring detections. A team with 50 well-maintained rules and a reliable review process can be more mature than one with 500 rules that nobody owns.

The model works on two axes. Five tiers, numbered 0 to 4, group the criteria from foundational to expert. Within each criterion, a team sits at one of five levels: Initial, Repeatable, Defined, Managed, or Optimized. Elastic notes that these levels loosely follow the maturity levels used with the NIST Cybersecurity Framework.

Each criterion also has two sides. The qualitative side describes the state of the ruleset: is the documentation complete, is there a defined schema, does someone review changes? Elastic is open about this part being subjective, since two assessors may read the same ruleset differently. The quantitative side measures the activities that keep that state healthy, such as how many false positives the team removed this quarter or how quickly it ships a rule for a new threat. Those numbers are easier to compare over time.

The scope is narrower than the name suggests. The model targets search-based SIEM rules and does not cover detections that run on the event stream or machine learning detections. Most Wazuh rules are evaluated as events arrive, but the behaviors the model asks about (ownership, review, testing, tuning) apply to them just as well.

<figure data-diagram="maturity" data-alt="Elastic's five maturity tiers and an illustrative assessment cycle: choose scope, record evidence, improve, and reassess.">
  <figcaption>Adapted tier overview based on Elastic's <a href="https://www.elastic.co/security-labs/threat-command/elastic-releases-debmm">DEBMM article</a>; the assessment workflow is an illustrative application.</figcaption>
</figure>

## The five tiers

Tier 0, Foundation, is where rule creation stops being ad hoc. The criteria ask for a structured approach to writing and managing rules, ongoing creation and maintenance, a documented or planned roadmap, and some form of threat modeling. A team at this tier may still write rules in reaction to the latest incident, but it has started to write down what it builds and why.

Tier 1, Basic, establishes baseline coverage and manages the ruleset as code. The team has rules for the core tactics and major threats relevant to it, keeps them in version control, and tests a release end to end before it reaches production. It reviews changes in the threat landscape, works with product owners on the features detections depend on, and, optionally, works on the quality of the telemetry itself. This is the tier where "Detections as Code" usually appears.

Tier 2, Intermediate, is about precision and verified coverage. The team tunes false positives continuously instead of when someone complains, documents the gaps it knows about, and tests its rules internally with emulation or malware detonation. A rule that has never been triggered on purpose counts as untested.

Tier 3, Advanced, turns to the alerts that never arrive. The team triages false negatives, meaning attacks or tests that should have produced an alert and did not, and invites outside scrutiny through red teams, penetration tests, or third-party assessments. It also extends coverage to more advanced techniques.

Tier 4, Expert, adds hunting in the team's own telemetry and continuous improvement through automation, including the use of generative AI to suggest or check rule changes. Elastic adds that this tier is not a finish line. Maturity moves up and down as staff, tools, and threats change.

## Example metrics, and how to read them

The Elastic article attaches example thresholds to each level, and they make the levels concrete. A few of them:

| Criterion | Example threshold | Level |
| --- | --- | --- |
| Rule documentation (Tier 0) | Under 20% of rules fully documented | Repeatable |
| Baseline coverage (Tier 1) | 90% or more of baseline ATT&CK techniques per data source | Managed |
| Emerging threats (Tier 1) | Rule for a new threat deployed within 24 hours | Managed |
| False positive tuning (Tier 2) | 10 to 25% reduction per quarter | Repeatable |
| Automated testing (Tier 2) | 80% of rules covered by automated tests | Defined |
| False negative triage (Tier 3) | 70 to 90% of tested samples trigger alerts | Defined |

Elastic presents these as examples to adapt, and the article tells readers to define calculations that fit their own organization. I would treat them as a starting point for a discussion with the team rather than as targets. A false positive reduction target, for instance, is easy to meet by disabling noisy rules, which also removes whatever those rules caught. Any metric you adopt needs a second one watching for that kind of shortcut, such as the share of tested attacks that still produce an alert.

## Assess one data source, with evidence

Elastic suggests auditing the current tier with a questionnaire of yes/no and multiple-choice questions, then scoping the work, setting goals, and building a roadmap starting from the highest-risk areas. Assessing a whole program in one pass tends to produce a spreadsheet of optimistic answers. I would start smaller: one data source or one threat scenario that matters to the organization, assessed against evidence.

Take Linux SSH authentication logs in Wazuh, the same example I used in the [post on detection-driven incident response](/en/blog/detection-driven-incident-response/). The questions follow the tiers.

For Tier 0 and Tier 1, list the rules that cover SSH activity, including the built-in sshd rules and any custom rules in `local_rules.xml`. Wazuh's [SSH brute-force walkthrough](https://documentation.wazuh.com/current/user-manual/capabilities/active-response/ar-use-cases/blocking-ssh-brute-force.html) uses rule `5763`, but check the rule IDs and decoded fields in your own version. For each rule, record whether it lives in a repository, who reviews changes to it, and whether a deployment goes through any test before reaching the manager. A rule edited directly on a production manager has no history to review.

For Tier 2, look at what the rules produced over the last few months. How many alerts did each SSH rule raise, and how many did analysts close as benign? Write down known gaps explicitly. If the environment has hosts that send no auth logs, that is a gap, even if every rule is perfect. Then check whether anyone has triggered the rules on purpose. Running [Wazuh logtest](https://documentation.wazuh.com/current/user-manual/ruleset/testing.html) against sample log lines shows how an event decodes and which rule matches. An authorized brute-force attempt against a lab host shows something different: whether the alert reached the dashboard and an analyst could act on it.

For Tier 3, look for missed detections. Did any incident or exercise involve SSH activity that should have alerted and did not? If the answer is "we have never checked", the honest assessment is that the team does not know.

Record each answer next to the evidence that supports it: a repository link, an alert count, a test result, a ticket. A mapped ATT&CK technique without a test is a claim, and the assessment should say so. The value of the exercise comes from the gaps it exposes, and an assessment without evidence hides them.

## Choose one improvement the team can keep up

The assessment will produce more gaps than a team can fix at once. Pick one improvement that the team can sustain with its current staff. For the SSH example, that could mean moving the custom rules into version control with a review step, or agreeing on a monthly review of the noisiest rule and recording the outcome of each tuning change. For a high-priority detection, it could mean an authorized test in a lab every quarter, with the result written down.

Then repeat the assessment after a fixed period and share both the gaps and the progress with whoever funds the work. A table showing that SSH detections moved from "untested" to "tested quarterly, with two false negatives found and fixed" is more useful to a manager than a rule count.

## Cautions from the model's authors

Elastic warns against skipping criteria from lower tiers. Advanced practices depend on foundational ones: hunting is less useful when nobody can say which data sources are reliable, and AI-generated rule suggestions are hard to trust without version control and tests to catch a bad one. The authors also say that teams may work on higher-tier behaviors when the risk justifies it, but that "rushing through the maturity model without proper budget and staff can lead to burnout."

That warning is the main reason I would not present a tier as a certification. The model is most useful as a shared vocabulary for deciding what to fix next, and as a record that shows whether the last fix held.
