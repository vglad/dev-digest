# Review engine insights

- The server consumes TypeScript source through a path alias; this package does not emit JavaScript.
- Structured output constraints are provider parameters, not prose in agent prompts.
- Prompt slots for skills, memory, specs, and callers already exist even when the starter does not populate all of them.
- Grounding can change the finding list and score after the model returns.
- Verdict currently passes through from the model, unlike score; prompt verdict semantics are therefore load-bearing.
