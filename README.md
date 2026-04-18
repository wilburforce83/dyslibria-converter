# dyslibria-converter

Canonical EPUB-to-Dyslibria conversion engine for Node.js.

This repository is the long-term home of the Dyslibria conversion pipeline, extracted from the self-hosted library app without bringing along reader, auth, billing, or UI concerns. The goal of the initial `0.x` series is behavior parity with the current self-hosted converter, backed by a growing golden-fixture suite.

## Current scope

- safe EPUB archive validation and extraction
- XHTML and HTML traversal
- Dyslibria bionic-text transformation
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
  outputPath: '/path/to/book-dyslibria.epub'
});

console.log(result.outputPath);
console.log(result.stats.processedFiles);

const inspection = await inspectBook('/path/to/book.epub');
console.log(inspection.title, inspection.author);
```

## CLI

```bash
npx dyslibria-convert convert ./input.epub --output ./output.epub
npx dyslibria-convert inspect ./input.epub
```

## Development

```bash
npm install
npm test
npm run build
```

## Notes

- The current package targets Node.js first.
- The self-hosted Dyslibria library remains separate for now and is used only as a behavioral reference.
- Future hosted-worker and npm use cases should call this package rather than duplicating conversion logic.
