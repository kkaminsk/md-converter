# Change: Fix Type Safety in Converters

## Why
Two core converter files (`docx-converter.ts` and `pptx-converter.ts`) use `@ts-nocheck` directives that disable TypeScript's type checking. This bypasses the project's strict mode settings and creates risk for runtime errors that would otherwise be caught at compile time.

## What Changes
- Remove `@ts-nocheck` from `src/core/converters/docx-converter.ts`
- Remove `@ts-nocheck` from `src/core/converters/pptx-converter.ts`
- Add proper type definitions for `docx` library interactions
- Add proper type definitions for `pptxgenjs` library interactions
- Use type assertions where library types are incomplete
- Fix any resulting type errors

## Impact
- Affected specs: Modified `converters` capability
- Affected code:
  - `src/core/converters/docx-converter.ts`
  - `src/core/converters/pptx-converter.ts`
- Dependencies: Proposal 1 (tests needed to verify no regressions)

## Priority
**2 of 6** - Must be completed after test infrastructure is in place to verify changes don't break conversion logic.
