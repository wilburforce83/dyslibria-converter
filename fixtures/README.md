# Fixtures

This directory will hold public-domain and synthetic EPUB inputs plus golden conversion outputs.

The initial `0.x` converter work relies mostly on synthetic fixtures generated during tests. As the parity suite grows, add:

- `inputs/` for source EPUBs
- `golden/` for expected converted EPUBs or extracted XHTML snapshots
- `pathological/` for malformed but supported edge cases

Real-world commercial EPUB regression corpora should stay outside the repository. Use:

- `real-world-regression.sample.json` as the manifest shape for a trusted local subset
- `real-world-notes.md` as the human QA template
- `fixtures/local/` or another gitignored directory for private manifests
