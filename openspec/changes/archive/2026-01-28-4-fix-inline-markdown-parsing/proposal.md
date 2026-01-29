# Change: Fix Inline Markdown Parsing

## Why
The current inline markdown parsing uses simple regex (`/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/`) which fails on nested formatting like `**bold with *italic* inside**`. This causes incorrect formatting in generated documents.

## What Changes
- Replace regex-based inline parsing with markdown-it token-based parsing
- Create shared inline formatting utility used by all converters
- Handle nested formatting correctly (bold containing italic, etc.)
- Maintain backward compatibility for simple formatting cases

## Impact
- Affected specs: Modified `converters` capability
- Affected code:
  - `src/core/converters/docx-converter.ts` (primary fix location)
  - `src/core/converters/pptx-converter.ts` (apply same pattern)
  - Possibly new `src/core/parsers/inline-parser.ts` (shared utility)
- Dependencies: Proposals 1-3 (tests, type safety, linting in place)

## Priority
**4 of 6** - Functional bug fix that should be done after infrastructure improvements.
