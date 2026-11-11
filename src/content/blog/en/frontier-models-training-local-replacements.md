---
title: "Using frontier models to train their local replacements"
date: "2026-11-10"
description: "A reading note on Simon Høiberg's plan to move work from GPT-6 and Opus 5.5 to fine-tuned local models, one job at a time, with training data, evals, and a private benchmark."
tags: ["Artificial Intelligence", "Self-Hosting", "Machine Learning"]
image: "/images/blog/covers/local-models.png"
lang: "en"
translation: "modelos-frontera-entrenando-sus-reemplazos-locales"
---

Simon Høiberg runs four SaaS products with a small team and a lot of AI agents. In [I'm using GPT-6 to train its own replacement](https://www.youtube.com/watch?v=KVM7Tm7Sikw), published on November 9, 2026, he explains why he wants that work off OpenAI's and Anthropic's models and how he plans to move it to open-weight models he runs himself. His team already left AWS, Supabase, and Vercel for a self-hosted setup, so the direction will be familiar to anyone who has read my posts on running services at home.

## The case for leaving

Høiberg credits GPT-6 and Opus 5.5 with much of what his team can do. His complaint is about control. Usage limits tighten without announcement, model quality changes from one day to the next, and the models refuse more routine work than they used to. His examples come from marketing: updating a site as instructed, writing comparison articles, setting up ad campaigns. He describes models that demand proof for every claim and, in one case, move a task he had already approved back to "in progress".

He compares it to a hosting provider that gave you slower servers every time it launched a product and never told you. You would leave that provider the same day. With hosted models, he argues, a company has no say in the intelligence it runs on.

Quality is the obstacle. In an earlier video he let Qwen 3.8 edit a full video, and it finished the job, but it made odd decisions and his harness had to work hard to keep it on track. A small model will not match a frontier model in general. His plan only needs it to match one on a specific job.


<figure class="architecture-figure">
<picture class="diagram-light">
  <source media="(max-width: 600px)" srcset="/images/blog/local-model-loop-en-mobile.svg">
  <img src="/images/blog/local-model-loop-en.svg" alt="Training data, fine-tuning, benchmarking, and evaluation form a loop for replacing a frontier model on one task.">
</picture>
<picture class="diagram-dark">
  <source media="(max-width: 600px)" srcset="/images/blog/local-model-loop-en-dark-mobile.svg">
  <img src="/images/blog/local-model-loop-en-dark.svg" alt="Training data, fine-tuning, benchmarking, and evaluation form a loop for replacing a frontier model on one task.">
</picture>
</figure>

## Training data from the frontier model

The video builds three things around each job, using customer support as the running example. The first is fine-tuning. The team leaves Qwen's weights alone and trains a LoRA, a small set of extra weights applied on top of the base model. One base model can carry several adapters, for example one for support and one for code. Høiberg contrasts this with Claude Code skills, which are instructions the model reads on every run; a LoRA changes the weights themselves.

A training example for support covers the whole session. The agent checks the customer's account and payment in Stripe, pulls logs and traces, decides which tools to call, and only then answers. Nobody can write thousands of those by hand, so the team gives a frontier model its best real cases, the product documentation, and its support rules, and has it generate and work through thousands of synthetic tickets. Weak examples are discarded, and Høiberg reviews a sample himself.

Training runs on a GPU rented from Vast, and the result is an adapter file the team keeps. Inference uses Vast's serverless setup, which scales to zero. Qwen stays idle until a ticket arrives, loads the support adapter, does the work, and shuts down again.

## A referee before anything is sent

A fine-tuned small model still makes more mistakes than GPT-6, and Høiberg does not want to check every reply. The second piece is an eval: a small program that runs after the agent finishes and before the customer sees anything. It returns approved or rejected, with a reason.

His example is a customer whose account was paused after a card expired. The agent finds the failed payment and the new card on file, then replies that it has charged the new card and reactivated the account. It did neither. The rule that catches this says every action the reply claims must have happened.

The eval reads the logged session and never touches the live Stripe account. It checks in two steps. Plain code answers the yes-or-no questions: was there a retry call, did Stripe report success, is the account active now. A small model handles the reply text. It lists each action the reply claims, marks whether the log shows it, and answers in a fixed format that quotes the sentence breaking the rule.

The team tests the eval before trusting it. A frontier model takes good sessions and breaks them on purpose, for instance by removing the retry or by making Stripe decline the card while the reply still says "you're all set". It also produces cases that look wrong but are fine, such as a payment that is still processing. The eval runs against hundreds of these labelled sessions, and the team tightens the rules until it catches the broken ones and passes the good ones. New mistakes from real customers go into the test set. Because the standard lives in a tested eval, swapping GPT-6 for the fine-tuned model keeps the same rules.

<figure class="architecture-figure">
<picture class="diagram-light">
  <source media="(max-width: 600px)" srcset="/images/blog/reply-eval-en-mobile.svg">
  <img src="/images/blog/reply-eval-en.svg" alt="The evaluator compares claims in a support reply against recorded tool results before the reply is approved.">
</picture>
<picture class="diagram-dark">
  <source media="(max-width: 600px)" srcset="/images/blog/reply-eval-en-dark-mobile.svg">
  <img src="/images/blog/reply-eval-en-dark.svg" alt="The evaluator compares claims in a support reply against recorded tool results before the reply is approved.">
</picture>
</figure>

## A private benchmark

The third piece decides when a local model is ready. An eval checks one piece of work; a benchmark scores a model across a fixed set of tasks with known answers. Public benchmarks such as SWE-bench measure what the labs care about, so the team built one from its own work: support cases, code changes, marketing briefs, partnership outreach, and video scripts. Keeping it private reduces the risk that models have seen the test cases during training.

Each case starts from real recent work, and AI expands a handful of good examples into a few hundred variations. A frontier model drafts the reference answer, Høiberg corrects a sample, and every case gets the eval that grades it. Cases that every model passes are removed, while past mistakes become permanent cases with harder variants. The set is then locked, so a score today means the same as a score in three months.

GPT-6, Opus 5.5, plain Qwen, and the fine-tuned Qwen models run through the same cases. In his results the fine-tuned models score well above plain Qwen, and some reach the frontier models. The failures show which training data to generate next. Once a local model handles about as many cases as the frontier models, including the hard and permanent ones, it takes over that job.

## What I take from it

I would copy the eval first, and it works without any fine-tuning. Checking that every action a reply claims appears in the session log follows the same principle as my [evidence-first AI SOC assistant](/en/blog/evidence-first-ai-soc/): the model writes the answer, and checks against recorded evidence decide whether it ships. Code for the facts plus a narrowly scoped model for the text is a split that fits most agent work.

I have two cautions. The benchmark scores are Høiberg's own and the video does not publish the cases, so they show his method more than they prove a result. Before generating training data with a hosted model, also read the provider's terms. OpenAI's and Anthropic's terms have both restricted using their output to develop competing models, and a plan to replace them sits close to that line. The video does not address it.

His closing advice is to pick one job, start from your best real work, and build the training data, the eval, and the benchmark before fine-tuning anything. That order pays off even if you never leave a hosted model, because the eval and the benchmark tell you whether a model change made your work better or worse.
