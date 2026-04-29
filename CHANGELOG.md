# Changelog

## 1.0.0

Breaking change release.

- promotes the package to `1.0.0`
- enables EPUB image optimization by default for standard conversions
- adds portable Dyslibria profile and reader-configuration support to the public converter API
- exports the shared lab-engine profile and rendering helpers for downstream consumers
- expands conversion metrics output for richer regression analysis and downstream tooling

Upgrade carefully from `0.x`:

- pass `optimizeImages: false` or `--no-optimize-images` if you need the old non-optimizing default
- re-check any code that depends on the exact conversion result shape or CLI output
- validate existing automation against the richer processing metrics and profile-handling paths
