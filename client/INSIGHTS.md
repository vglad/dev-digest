# Web insights

- `NEXT_PUBLIC_API_BASE` defaults to `http://localhost:3001`.
- Shared contracts and UI primitives are vendored under `src/vendor`; changes can affect several routes at once.
- The app shell owns navigation, breadcrumbs, and global `g`-then-key shortcuts.
- Client tests are intended to be hermetic and do not require the server, database, or browser.
- The real browser journeys are maintained separately in `../e2e`.
