# dyslibria-converter

Canonical EPUB-to-Dyslibria conversion engine for Node.js.

This repository is the long-term home of the Dyslibria conversion pipeline, extracted from the self-hosted library app without bringing along reader, auth, billing, or UI concerns. The goal of the initial `0.x` series is behavior parity with the current self-hosted converter, backed by a growing golden-fixture suite.

## Breaking Change In 2.0.0

`2.0.0` is a breaking release.

Key upgrade notes:

- the default profile path is now `Dyslibria Default` (`intense-scaffolding`) when no custom profile JSON is supplied
- the CLI and API now support semantic preset selection such as `-balanced`, `-dyslibria_default`, and `presetId: 'focus'`
- the package now exports the shared lab-engine modules so other Dyslibria apps can consume a single typography source of truth
- image optimization is now enabled by default unless you explicitly pass `optimizeImages: false` or `--no-optimize-images`
- the converter now accepts Dyslibria lab profile JSON and full reader-configuration wrappers, which expands the public API surface
- conversion results now expose richer `processingMetrics`, so consumers that assumed the older narrower result shape should review their integrations before upgrading

If you are upgrading from `1.x` or earlier, test your conversion output and CLI automation before rolling this version out broadly.

## Current scope

- safe EPUB archive validation and extraction
- XHTML and HTML traversal
- Dyslibria bionic-text transformation
- optional EPUB image optimization for JPEG and PNG assets
- deterministic EPUB repackaging
- Node.js API
- CLI entry point
- parity-oriented tests and golden fixtures

## Install

```bash
npm install dyslibria-converter
```

## API

```ts
import { convertBook, inspectBook } from 'dyslibria-converter';

const result = await convertBook('/path/to/book.epub', {
  outputPath: '/path/to/book-dyslibria.epub',
  presetId: 'balanced'
});

console.log(result.outputPath);
console.log(result.stats.processedFiles);
console.log(result.stats.imageOptimization?.bytesSaved);
console.log(result.processingMetrics.files[0]?.metrics);

const inspection = await inspectBook('/path/to/book.epub');
console.log(inspection.title, inspection.author);
```

## CLI

```bash
npx dyslibria-convert convert ./input.epub --output ./output.epub
npx dyslibria-convert convert ./input.epub --output ./output.epub -dyslibria_default
npx dyslibria-convert convert ./input.epub --output ./output.epub -balanced
npx dyslibria-convert convert ./input.epub --output ./output.epub --preset focus
npx dyslibria-convert convert ./input.epub --output ./output.epub --profile ./reader-config.json
npx dyslibria-convert convert ./input.epub --output ./output.epub --metrics-output ./book-metrics.json
npx dyslibria-convert convert ./input.epub --output ./output.epub --no-optimize-images
npx dyslibria-convert inspect ./input.epub
```

## Profiles And Reader Configurations

The converter now accepts the same portable Dyslibria profile JSON exported by the lab, or the full reader-configuration wrapper described in the lab docs.

API:

```ts
await convertBook('/path/to/book.epub', {
  profile: {
    emphasisDensity: 0.2,
    outputCompatibilityMode: 'standardEpub'
  }
});
```

Or point at a JSON file:

```ts
await convertBook('/path/to/book.epub', {
  profilePath: './reader-config.json'
});
```

Or select a built-in preset semantically:

```ts
await convertBook('/path/to/book.epub', {
  presetId: 'balanced'
});
```

The nested `profile` object remains the converter-facing source of truth when you pass the reader wrapper.
Use either `presetId` or a custom `profile` / `profilePath`, not both.

If you do not pass a profile at all, the converter now falls back to the built-in `Dyslibria Default` preset (preset id `intense-scaffolding`).

Accepted preset shorthands include:

- `default` or `dyslibria_default` -> `intense-scaffolding`
- `balanced` -> `dyslibria-balanced`
- `dense` -> `dense-text-support`
- `focus` -> `focus-support`
- `dyslexia` -> `dyslexia-spacing`
- `front-load` -> `front-load-emphasis`

## Shared Lab Engine Surface

The package now also exposes the browser-safe lab engine modules that power Dyslibria typography work in other repos:

- `dyslibria-converter/lab-engine/core`
- `dyslibria-converter/lab-engine/core/*`
- `dyslibria-converter/lab-engine/language`
- `dyslibria-converter/lab-engine/language/*`
- `dyslibria-converter/lab-engine/profiles/*`

That exported surface is intended to be the single point of truth for profile logic, language rules, and text-engine behavior across the Dyslibria suite.

## Processing Metrics

Each conversion now returns a full per-file processing report in `result.processingMetrics`.

That JSON includes:

- the resolved profile source and normalized profile used
- per-content-file metrics, warnings, debug data, and compatibility mode
- aggregate book totals such as total words, anchors, spans, and language counts

This is designed to mirror the lab-style processing metrics closely enough for downstream analysis and regression reporting.

## Image Optimization

Image optimization is enabled by default for EPUB inputs. It is designed for ebook reading, not archival reproduction.

Use the default ebook profile in the API:

```ts
await convertBook('/path/to/book.epub', {
  optimizeImages: true
});
```

Disable it:

```ts
await convertBook('/path/to/book.epub', {
  optimizeImages: false
});
```

Or customize it:

```ts
await convertBook('/path/to/book.epub', {
  optimizeImages: {
    maxWidth: 1400,
    maxHeight: 1400,
    quality: 70,
    skipCover: false
  }
});
```

The simple `true` or `--optimize-images` path uses an intentionally assertive ebook-focused preset:

- `maxWidth: 1600`
- `maxHeight: 1600`
- `quality: 75`
- `skipCover: true`
- `pngPalette: true`
- `stripMetadata: true`

Behavior:

- downscales oversized JPEG and PNG images without upscaling smaller ones
- recompresses JPEGs with ebook-friendly defaults
- recompresses PNGs with PNG-safe settings and optional palette reduction
- preserves transparent PNGs as PNGs with alpha intact
- skips unsupported or risky image types instead of failing the whole conversion
- keeps cover images untouched by default when they can be detected

Image optimization stats are exposed on `result.stats.imageOptimization`, including processed counts and bytes saved.

## Limitations

- EPUB is still the only supported input format.
- The optimizer currently targets embedded `.jpg`, `.jpeg`, and `.png` assets. Other image types are passed through unchanged.
- Cover detection prefers OPF metadata and manifest declarations such as `meta[name="cover"]` and `properties="cover-image"`, with a conservative filename fallback for common cover names when metadata is absent.
- If an individual image cannot be optimized safely, it is left unchanged and conversion continues.

## Development

```bash
npm install
npm test
npm run build
```

## Release Checks

Before publishing a new package version:

```bash
npm run release:check
```

That runs:

- unit and parity tests
- the package build
- a dry-run tarball check

## Real-World Regression Workflow

For release confidence, keep a trusted local EPUB corpus outside the repository and run the published converter against it before shipping.

Quick batch run:

```bash
npm run build
npm run qa:real-world -- \
  --input-dir /path/to/raw-epubs \
  --output-dir ./reports/real-world-output \
  --report ./reports/real-world-regression.json
```

If you want to exercise only a hand-picked regression subset, create a private manifest using [fixtures/real-world-regression.sample.json](./fixtures/real-world-regression.sample.json) as the shape:

```bash
npm run qa:real-world -- \
  --input-dir /path/to/raw-epubs \
  --manifest ./fixtures/local/release-candidate.json \
  --output-dir ./reports/regression-output \
  --report ./reports/regression-report.json
```

Use [fixtures/real-world-notes.md](./fixtures/real-world-notes.md) to record which books you manually opened and what they are good at catching.

## Notes

- The current package targets Node.js first.
- The self-hosted Dyslibria library remains separate for now and is used only as a behavioral reference.
- Future hosted-worker and npm use cases should call this package rather than duplicating conversion logic.
