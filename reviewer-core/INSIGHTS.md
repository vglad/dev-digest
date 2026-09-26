# Review engine insights

Non-obvious findings and gotchas that should survive across sessions. Add an entry when a discovery would otherwise need to be relearned.

## What Works

## What Doesn't Work

## Codebase Patterns

- Prompt slots for skills, memory, specs, and callers already exist even when the starter does not populate all of them.
- Grounding can change the finding list and score after the model returns.
- Verdict currently passes through from the model, unlike score; prompt verdict semantics are therefore load-bearing.

## Tool & Library Notes

- The server consumes TypeScript source through a path alias; this package does not emit JavaScript.
- Structured output constraints are provider parameters, not prose in agent prompts.

## Recurring Errors & Fixes

## Session Notes

## Open Questions
