# Review-engine behavioral contract

## Strategy and provider requests

- `single-pass` sends the whole diff as one chunk.
- `auto` uses map-reduce only when additions plus deletions exceed the configured
  threshold (default 400) and the diff has more than one file. Exactly 400 stays
  single-pass. Explicit `map-reduce` also falls back for a single file.
- Map-reduce calls the provider sequentially once per file chunk, subject to the
  provider's structured-output retries. `maxRetries` defaults to 2.
- A supplied cancellation callback runs before each chunk's provider call and
  can abort by throwing. A supplied session ID is forwarded to every chunk.
- Token counts sum across returned chunk responses. Cost sums only when every
  chunk reports cost; one unknown chunk makes the overall cost null.

These rules live in [`review/run.ts`](../src/review/run.ts).

## Prompt and parsing

Trusted system instructions retain the shared injection guard. Diff and
untrusted contextual inputs are delimiter-wrapped; content claiming to be a test
or asking the reviewer to ignore defects does not become an instruction.
Empty optional context sections are omitted.

Structured parsing first attempts the raw JSON, then extraction from surrounding
text/fences. Successful parsing must satisfy the supplied Zod schema. Invalid
JSON or schema mismatch returns a repair message; parsing helpers themselves do
not call an LLM. See [`prompt.ts`](../src/prompt.ts) and
[`llm/structured.ts`](../src/llm/structured.ts).

## Grounding, reduction, and score

1. Every finding must refer to a file present in the diff.
2. Ordinary findings must have a line range intersecting that file's new-side
   hunk line index. Explicit hunk line numbers take precedence; otherwise the
   declared new-side range is used (at least one line). Reversed finding range
   endpoints are normalized for the intersection check.
3. Kinds `secret_leak`, `lethal_trifecta`, `phantom`, and `hook` are full-file
   exceptions: presence of the file suffices, without a hunk intersection.
4. Rejected locations appear in `dropped` with reasons, and grounding is reported
   as `kept/total passed`.
5. Partial review reduction concatenates findings and takes the worst model
   verdict: request_changes > comment > approve. Final grounding preserves that
   verdict but replaces score with `max(0, 100 - 35*C - 12*W - 3*S)` for surviving
   findings. Empty survivors therefore score 100.

## GitHub payload contract

`toReviewPayload` does not perform network I/O. Empty findings yield APPROVE;
otherwise a triggered policy yields REQUEST_CHANGES, and the rest yield COMMENT.
Policies are `critical`, `warning`, `any`, and `never`. Inline comments default to
on. With a diff, the anchor is the available line in the finding range nearest
its end; without one, the legacy anchor is `end_line`. An unanchorable finding
stays in the summary body even when its inline comment is omitted.

## Regression evidence

[`run.test.ts`](../test/run.test.ts) covers single-pass orchestration, grounding,
score, session forwarding, and cancellation. [`prompt.test.ts`](../test/prompt.test.ts) covers
prompt guards and context wrapping. [`to-review.test.ts`](../test/to-review.test.ts)
covers gate policies and inline anchors. Run the package's hermetic test lane
as documented in [TESTING.md](../../TESTING.md).
