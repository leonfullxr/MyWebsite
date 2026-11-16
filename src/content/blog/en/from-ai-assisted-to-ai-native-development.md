---
title: "From AI-assisted to AI-native development"
date: "2026-11-14"
description: "A reading note on Amazon's frontier team experiments with coding agents: what the 20x and 4.5x figures measure, what independent studies found, and the engineering practices that seem to make the difference."
tags: ["Artificial Intelligence", "Software Engineering", "Agents"]
image: "/images/blog/covers/agents.png"
lang: "en"
translation: "de-asistido-por-ia-a-nativo-de-ia"
---

Two sets of numbers about AI coding tools have been circulating this year, and they are hard to reconcile. Amazon reports that six engineers rebuilt the inference engine behind Amazon Bedrock in 76 days, a project once estimated at 30 developers and more than a year, and describes a 20x gain in individual productivity. Meanwhile, DX looked at pull request throughput across more than 400 companies and found a median increase of 7.76%, and a randomized study by METR found experienced developers were 19% slower when they were allowed to use AI.

I came to this through two talks: ForrestKnight's [I Looked Into How Devs Are Actually Using AI](https://www.youtube.com/watch?v=qCheZDyFX2U) and Clare Liguori's [From AI-Assisted to AI-Native: Building a Frontier Development Team](https://www.youtube.com/watch?v=pqlWNihgdjI), in which the AWS senior principal engineer walks through Amazon's experiments. The figures below come from Amazon's written accounts, the [AWS post on frontier teams](https://aws.amazon.com/blogs/machine-learning/how-frontier-teams-are-reinventing-ai-native-development/) by Swami Sivasubramanian and the [Kiro case study on Bedrock](https://kiro.dev/case-studies/bedrock/), so they can be checked. My reading is that the size of the gain depends less on which tool a team picks than on how much of its development process it changes around the tool. The evidence for that is thinner than the headlines suggest, and the rest of this post looks at both.

## Assisted and native are different workflows

Most teams use coding tools in an assisted way. An autocomplete model finishes lines, or a chat assistant writes a function that the developer pastes in, runs, and corrects. Agents such as Claude Code, Codex, Cursor, and Kiro go further: they read the repository, edit files, run commands and tests, and try again when something fails.

Installing an agent does not change the workflow by itself. If the developer watches every command, approves each small decision, and steps in every few minutes, the work still moves at the speed of the human, only with a different tool doing the typing. The developer has become the supervisor of individual model responses.

An AI-native team arranges its work so that an agent can carry a well-defined task from start to finish without that supervision. The engineer spends more of the day on decisions about what to build, how to divide it, and how to check the result, and less on writing the code. The AWS post says some teams working this way report writing only 1 to 2% of their code by hand. It does not say which teams or how that was measured, so I read it as an indication of direction, not a benchmark.

## Three experiments at Amazon

The AWS post describes three experiments in quite different conditions. The conditions matter as much as the results.

The first was a pathfinder team that rebuilt Mantle, the inference engine behind Amazon Bedrock. Six senior engineers delivered it in 76 days, using Kiro as their main environment, against an original estimate of 30 developers over 12 to 18 months. Amazon measured the 20x figure as normalized commit velocity, meaning commits per developer per week adjusted for repository complexity and team size, which rose from about 2 to about 40. The Kiro case study adds that about 95% of the roughly 100,000 lines of new Rust came through the agent. The team also changed almost everything around the code. They kept code and documentation in one monorepo with small, isolated modules, picked Rust partly for its compile-time checks, built a small purpose-built MCP server for operations and debugging, relied on high-fidelity mocks for testing, and cleared their calendars down to one 30-minute daily standup. Agents kept working on queued tasks outside office hours.

The second was a Prime Video Financial Systems team. Six engineers spent a 10-day sprint in one room with no on-call duty, no other projects, and few meetings. They made 556 commits against a baseline of 96 for a comparable period, and the project's estimate dropped from 90 weeks to 24. Before the sprint, a senior engineer spent three weeks breaking the work into well-scoped tasks with detailed requirements. The 24 weeks is a revised estimate, not a delivered project, and the three weeks of preparation are part of the cost.

The third experiment is the closest to ordinary work. Amazon Stores studied more than 50 teams working their regular backlogs, with no handpicked engineers and no special conditions. About half of them, 25 teams, adopted new practices along with the tools. Those teams reached a median gain of 4.5x in normalized deployment velocity, which Amazon defines as features deployed per sprint against each team's own history, and some passed 10x. The AWS post says they outperformed the teams that only added AI to the workflow they already had.

## What those numbers do and do not show

The three experiments use three different measures. Commit velocity rewards small commits, and the Bedrock team deliberately scoped each prompt to a single reviewable commit, so the 20x partly reflects a change in how work was split up. Deployment velocity is closer to what a business cares about, but neither measure says much about maintainability or how many incidents the new code causes later. The teams in the first two experiments were senior, protected from interruptions, and part of a high-profile internal initiative. All of the figures are self-reported by AWS, and the Kiro case study is also a product page.

Independent research gives more modest numbers. [DX's longitudinal analysis](https://getdx.com/report/ai-and-engineering-velocity-a-longitudinal-analysis/) followed PR throughput from November 2024 to February 2026 in more than 400 companies where AI tool usage rose by an average of 65%. Median throughput increased by 7.76%, and the report concludes that 5 to 15% is what most organizations are getting from the current generation of tools. [METR's randomized study](https://arxiv.org/abs/2507.09089) assigned 246 real tasks from 16 experienced open-source developers to be done with or without AI, using early-2025 tools such as Cursor with Claude 3.5 and 3.7 Sonnet. With AI allowed, tasks took 19% longer. The developers had expected a 24% speedup, and afterwards they still believed they had been about 20% faster.

These results measure different things and do not cancel each other out. A controlled study of individual tasks in mature open-source codebases is not the same as an internal pilot measuring deployments. The DX numbers describe what happens when tools spread through organizations that mostly kept their existing processes, which is the condition the AWS post says produces the smallest gains. Workflow change is a plausible explanation for the gap, but experience, task selection, existing test infrastructure, and measurement method all differ between these studies, and none of them isolates one cause.

## The five practices behind the larger gains

The AWS post names five practices shared by the teams that did best. None of them is new. Each is a familiar engineering habit that pays off more when an agent is doing the work.

### Invest in agent context

A team carries a lot of knowledge that is never written down: which service owns which responsibility, which module is fragile, which pattern was tried and rejected two years ago. A new colleague picks this up from code reviews, chat threads, and lunch. An agent reads the repository and nothing else, so it may produce code that compiles and passes tests while duplicating an existing helper, editing the wrong service, or adding a dependency the team deliberately avoids.

The fix is to write that knowledge where an agent will find it, in files such as `AGENTS.md`, `CLAUDE.md`, Kiro steering files, or skills, plus ordinary repository documentation. I would cover the repository layout and service boundaries, the conventions for errors, logging, and dependencies, the security and data-access limits, and the exact commands to build and test. Detailed, task-specific material can live in separate documents the agent reads when it needs them. A single huge instruction file costs tokens on every run and buries the constraints that matter.

The Amazon teams treat repeated agent mistakes as a signal that some knowledge is missing from that context. When an agent makes the same mistake twice, someone asks what it did not know and writes it down. My own instructions for coding agents include a rule to start any long-running job in a detached tmux session, because a desktop crash would otherwise kill any job started as a child of the agent's shell. Not every failure deserves a new rule, though. Sometimes the model had the right information and got it wrong anyway, and rules written around the limits of an older model can become noise once the model improves. Agent context needs the same maintenance as code: review, testing, and deletion of what no longer helps.

### Slow down to speed up

The AWS post warns that the first two weeks feel slower. The teams stopped pushing features and spent the time on test coverage, repository structure, documentation, and tooling. On a dashboard that tracks feature output, that period looks like a regression.

Agents benefit from the same properties that make code easy for people to maintain. Clear module boundaries limit how much an agent has to understand at once. Strong types and compilers report a whole class of mistakes before anything runs, which is part of why the Bedrock team chose Rust. That does not mean rewriting a Python service in Rust. Type annotations, static analysis, schema validation, and better tests move errors earlier in any language.

Error messages are part of this too. A command that fails with "Operation failed" gives an agent nothing to work with, so it guesses or asks a human. A message that names the operation, the service, the constraint that was violated, and the next diagnostic step lets the agent fix the problem itself. The same reasoning applies to MCP servers and other tools you give an agent: a few reliable ones that cover search, tests, and the operations it actually needs are better than a long list of integrations nobody has reviewed, each of which adds attack surface.

### Feed agents instead of babysitting them

If an agent needs guidance every 30 seconds, the human is still the bottleneck. The goal is a task complete enough for the agent to finish on its own. For a substantial change in a production codebase, I would expect a task description to state:

- the outcome to achieve
- which modules or services may change, and which interfaces and behaviors must not
- the acceptance criteria and the exact commands that have to pass
- what the agent should do if an assumption turns out to be wrong, and which decisions need a human
- what evidence to return with the change: test output, logs, and a short explanation

"Add audit logging" is not enough for a security-sensitive service. A usable task names the events to log, the schema, the retention period, the privacy constraints, what happens when logging fails, and the tests that prove it works. With that, the agent works toward a target instead of renegotiating the requirements halfway through.

Once tasks can run unattended, several can run at once. One agent implements an endpoint while another writes integration tests and a third investigates a bug. That needs isolation, such as separate git worktrees or containers, clear ownership of each task, and some care about order. A task that depends on an interface still under discussion should wait until the interface is settled. More agents running does not mean more work finished, and the useful measure is how much validated work comes out the other end.

### Make intent explicit before code is written

The most expensive failure with an agent is a convincing implementation of the wrong thing. The developer then spends hours explaining the misunderstanding while the agent rewrites twenty files. For complex or ambiguous work, the AWS post recommends agreeing on a specification first, much like spec-driven or behavior-driven development.

A useful spec covers normal behavior, edge cases, failure handling, authorization, compatibility, and the tests that define done. For a new endpoint that returns audit events, it might require that requests are authorized for the right tenant, that results are sorted consistently and paginated, that sensitive fields are excluded, that invalid filters return documented errors, and that existing clients keep working. A missing requirement is much cheaper to spot in half a page of spec than in a finished pull request. The amount of spec should match the risk of the change, and a one-line fix does not need a design document.

### Shift testing left

Agents make mistakes, so the environment has to catch them quickly and cheaply. The validation order is familiar: formatting and lint, type checks or compilation, unit tests, integration and contract tests, security and dependency checks, and broader end-to-end tests before deployment. Each earlier stage is cheaper to fail.

The detail that stood out to me is that the Amazon teams made integration tests run locally against mocked services. A suite that needs several cloud services deployed before it can run gives an agent one attempt every half hour. A deterministic local suite lets it write code, run the tests, read the failure, and try again many times without a person involved. Mocks have limits, since they can drift from the real service and rarely reproduce network failures or authentication edge cases, so they need contract tests, a realistic integration environment, and production monitoring behind them. The aim is feedback the agent can trust about whether its change is correct.

<figure data-diagram="agent-loop" data-alt="A specification becomes a scoped task. An agent works in an isolated environment and retries against local checks until they pass, then a person reviews the change and its evidence. Review findings update the specification and agent context."></figure>

## The bottleneck moves to review and decisions

Faster code generation does not make review, integration, or deployment faster. An engineer running five agents may get more code in an afternoon than they could write in a week, but someone still has to understand it, check the assumptions, and decide whether to merge it. Reading code someone else wrote is often harder than writing it, and that is especially true for less experienced engineers, who are still learning what a subtle architectural problem looks like.

Automated checks should take over everything mechanical, so human review can focus on whether the change solves the right problem, fits the architecture, and handles security correctly. Passing tests do not replace that review. A fully tested change can still expose data through an unexpected path or add a dependency the team cannot operate.

Organizational decisions become the next constraint. A two-month approval process barely registers on a nine-month project. On a project that now takes three weeks, it dominates the schedule. Teams that speed up implementation will feel pressure on product planning, architecture approvals, security review, and release management, and those processes need to change too.

## Treat agents as identities with limited authority

An agent that can edit files, run commands, and call external systems is an automation identity, and it should be managed like one. That means least-privilege access for the task at hand, sandboxed environments instead of a developer's main machine or production, and credentials delivered through a controlled path rather than pasted into prompts or committed to instruction files. I wrote about one way to do that in [keeping credentials out of AI agents](/en/blog/keeping-credentials-out-of-ai-agents/). Tool calls and changes should be logged, and destructive or production-facing operations should need explicit approval.

Prompt injection deserves its own line. Repository files, issue text, logs, web pages, and tool output can all contain instructions, and an agent should treat them as data. Every MCP server added to extend what an agent can do also widens what an attacker can reach through it. The Bedrock team's choice to give operators no direct access to production hosts, and to work through CloudWatch, is a good example of designing those limits in from the start.

## Measure outcomes, not activity

Lines of code, commits, and agent runs are easy to count and say little about value. Ten poorly designed pull requests are not worth more than one good one, and an agent that writes thousands of lines can leave a lot of maintenance behind. I would track four groups of measures side by side:

| Dimension | What to measure |
| --- | --- |
| Delivery | Lead time for changes, deployment frequency, PR cycle time |
| Quality | Change failure rate, escaped defects, rework |
| Agent effectiveness | Tasks finished without intervention, how often a person had to step in, retry cost |
| Sustainability | Review load, incident burden, compute spend |

If I were running a pilot, I would first record a baseline on comparable tasks under the current process. Then I would introduce agents gradually under the same quality bar, and count the whole lifecycle: writing specs, reviewing, debugging, deploying, the compute bill, and the time spent maintaining the agent setup. Faster code generation alone is not a result. The gain has to survive all the way to reliable production.

## Where I would start

For a small team or a solo developer on an existing project, I would not try to automate the whole process at once. A first month could look like this:

1. Measure how a few representative tasks take today, and where the time goes: implementation, tests, review, debugging, deployment.
2. Write a short agent context file, make the build and test commands reliable, fix flaky tests, and rewrite the error messages that say nothing.
3. Run agents on a few bounded tasks in isolated worktrees, each with acceptance criteria and validation commands, and note every time a person had to step in and why: missing context, an ambiguous requirement, weak tooling, or a model mistake.
4. Only then try several agents in parallel on tasks that do not overlap, and compare delivery, review load, quality, and cost against the baseline.

The goal of that month is a setup you can measure and improve, and a 10x headline is unlikely to come out of it.

## What I take from it

What strikes me most is that almost none of the enabling practices are new. Specs, automated tests, modular design, documentation, continuous integration, observability, and least privilege have been good engineering for decades. Agents give teams another reason to invest in them. A better test suite now helps the next agent as well as the next person, and a clear interface makes it easier to split work into tasks an agent can finish alone.

The same discipline cuts the other way. Autonomy without validation is a risk, parallel agents without coordination produce merge conflicts and inconsistent assumptions, and faster code without better decisions produces technical debt faster. For less experienced engineers there is a further problem: if agents do most of the routine implementation, teams have to find another way for them to build the judgment needed to review and direct that work.

I doubt most teams will become ten times more productive. Amazon's experiments still show that the engineering environment around an agent decides much of what it can do, and that part is under a team's control.

## References

- Clare Liguori, [From AI-Assisted to AI-Native: Building a Frontier Development Team](https://www.youtube.com/watch?v=pqlWNihgdjI) (talk)
- ForrestKnight, [I Looked Into How Devs Are Actually Using AI](https://www.youtube.com/watch?v=qCheZDyFX2U) (video)
- Swami Sivasubramanian, [How frontier teams are reinventing AI-native development](https://aws.amazon.com/blogs/machine-learning/how-frontier-teams-are-reinventing-ai-native-development/), AWS, June 10, 2026
- Kiro, [Six engineers completed a 30-person project in 76 days](https://kiro.dev/case-studies/bedrock/) (case study)
- DX, [AI and engineering velocity: a longitudinal analysis](https://getdx.com/report/ai-and-engineering-velocity-a-longitudinal-analysis/)
- Joel Becker, Nate Rush, Elizabeth Barnes, and David Rein, [Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity](https://arxiv.org/abs/2507.09089), METR, 2025

The Amazon results are company-reported. The task checklist, pilot design, and first-month plan are my own suggestions built on these sources, not practices the talks or the AWS post describe in that form.
