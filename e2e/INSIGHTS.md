# E2E insights

- The flows share one browser session per run.
- Several journeys assume the seeded demo repository is the first and only repository.
- The hermetic runner uses alternate ports and an ephemeral database, so it can coexist with normal development.
- Failure screenshots are CI artifacts, not tracked source.
- The suite uses browser automation but no LLM.
