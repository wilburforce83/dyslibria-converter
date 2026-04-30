# Changelog

## 1.0.1

GitHub-aligned follow-up release for the preset/profile refinements shipped after `1.0.0`.

- syncs the committed source with the published preset/profile updates
- retires `minimal-intervention` and `technical-reading` from the visible preset list while preserving compatibility aliases
- adds the new `intense-scaffolding` preset and increases the `dyslexia-spacing` preset spacing profile
- bumps the shared profile schema version to `2.1.0`

## 1.0.0

Breaking change release.

- promotes the package to `1.0.0`
- enables EPUB image optimization by default for standard conversions
- adds portable Dyslibria profile and reader-configuration support to the public converter API
- exports the shared lab-engine profile and rendering helpers for downstream consumers
- expands conversion metrics output for richer regression analysis and downstream tooling
- simplifies the public preset surface by retiring `minimal-intervention` and `technical-reading` from the visible preset list
- adds the new `intense-scaffolding` preset and increases the `dyslexia-spacing` preset spacing profile

Upgrade carefully from `0.x`:

- pass `optimizeImages: false` or `--no-optimize-images` if you need the old non-optimizing default
- re-check any code that depends on the exact conversion result shape or CLI output
- validate existing automation against the richer processing metrics and profile-handling paths
- update any preset-specific automation that referenced `minimal-intervention` or `technical-reading`; compatibility aliases remain, but the preferred ids changed
