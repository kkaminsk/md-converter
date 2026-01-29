# Change: Add Code Quality Tools (ESLint + Prettier)

## Why
The project lacks linting and formatting configuration. Consistent code style and automated quality checks prevent common errors, improve maintainability, and ensure consistent contributions.

## What Changes
- Add ESLint with TypeScript support
- Add Prettier for consistent formatting
- Configure ESLint to work with Prettier (no conflicts)
- Add npm scripts for linting and formatting
- Apply initial formatting pass to codebase

## Impact
- Affected specs: New `tooling` capability
- Affected code:
  - `.eslintrc.json` or `eslint.config.mjs` (new)
  - `.prettierrc` (new)
  - `package.json` (scripts and dev dependencies)
  - All `.ts` files (formatting changes)
- Dependencies: Proposals 1-2 (want tests and type safety before mass reformatting)

## Priority
**3 of 6** - Should be added after tests and type safety are in place, so formatting changes can be verified.
