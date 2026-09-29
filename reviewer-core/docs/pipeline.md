# Review-engine architecture

## Public boundary

[`src/index.ts`](../src/index.ts) exports `reviewPullRequest`, prompt and structured
output helpers, grounding, reduction, and GitHub payload conversion. The server
consumes the TypeScript source through its path alias; this package's build is
a typecheck, with no emitted JavaScript.

`ReviewInput` contains a parsed unified diff, model/system prompt, an injected
`LLMProvider`, and optional resolved context strings. The caller retrieves
skills, memory, specifications, repository maps, and callers; the engine neither
queries storage nor reads repository files. Progress and cancellation are callback
seams. Review execution's external model work goes through the injected provider.

## Pipeline

1. [`review/run.ts`](../src/review/run.ts) selects single-pass or file map-reduce
   and assembles a whole-diff prompt for trace metadata.
2. [`prompt.ts`](../src/prompt.ts) combines trusted system instructions with the
   fixed injection guard. Untrusted diff and contextual material are wrapped as
   data. Optional absent context leaves its section out.
3. Each chunk gets its own prompt and structured provider request using the
   shared Review schema. The provider owns the structured-output retry loop;
   [`llm/structured.ts`](../src/llm/structured.ts) supplies JSON extraction,
   validation, and repair messages.
4. [`reduceReviews`](../src/review/reduce.ts) concatenates findings, joins summaries,
   and retains the worst model verdict across partial reviews.
5. [`groundFindings`](../src/grounding.ts) checks locations against the original
   parsed diff. The engine reports dropped findings and recomputes the final
   score from survivors.
6. The outcome returns the review, grounding diagnostics, prompt assembly, chunk
   labels, tokens, cost, and raw responses. Persistence and SSE remain in the
   server; the engine has no database or Fastify dependency.

A model verdict and the deterministic downstream gate are distinct. Grounding
can remove all findings while leaving the model verdict intact. Consumers needing
a gate use `gateTriggered`/`countBlockers`; `toReviewPayload` computes its GitHub
event from findings and policy rather than copying the model verdict.

## Output conversion and tests

[`output/to-review.ts`](../src/output/to-review.ts) builds a Markdown body and
optional inline comments without posting to GitHub. With a diff supplied, inline
comments use a real new-side line in the finding's range; findings that cannot be
anchored still appear in the body.

The [behavioral contract](../specs/review-engine.md) defines strategy boundaries,
grounding exceptions, and scores. Tests under `test/` use stub providers and
resolved input fixtures; they need no keys, database, or cloned repository.
