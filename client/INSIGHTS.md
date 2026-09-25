# Web insights

Non-obvious findings and gotchas that should survive across sessions. Add an entry when a discovery would otherwise need to be relearned.

- `NEXT_PUBLIC_API_BASE` defaults to `http://localhost:3001`.
- Shared contracts and UI primitives are vendored under `src/vendor`; the shared-contract tree overlaps with, but is not identical to, the server copy.
- The app shell owns navigation, breadcrumbs, and global `g`-then-key shortcuts.
- Client tests are intended to be hermetic and do not require the server, database, or browser.
- The real browser journeys are maintained separately in `../e2e`.
