# Real-World Regression Notes

Use this file as a lightweight release log for manual QA passes against real EPUBs.

Suggested structure:

- package version tested
- date
- corpus location
- total books in corpus
- batch conversion result summary
- list of manually opened books
- what each book is good at catching:
  - cover handling
  - image-heavy layouts
  - unicode/entity handling
  - long-form chapter flow
  - front matter or footnotes
- any visual problems found
- release decision

Keep proprietary EPUB files outside the repository. If you maintain a private manifest for trusted regression books, place it under `fixtures/local/` or another gitignored path.
