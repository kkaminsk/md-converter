# Change: Add Test Infrastructure

## Why
The project has zero test coverage despite a test script in package.json. This creates significant risk for regressions, undetected bugs in formula parsing, and difficulty validating edge cases. Testing infrastructure is foundational for all future development.

## What Changes
- Add Jest configuration with ES modules support
- Create test directory structure mirroring src/
- Add test fixtures for sample markdown files
- Implement initial tests for critical parsers (formula, frontmatter, table)
- Add test coverage reporting
- Update package.json with proper test dependencies

## Impact
- Affected specs: New `testing` capability
- Affected code:
  - `jest.config.mjs` (new)
  - `tests/` directory (new)
  - `package.json` (dev dependencies)
- Dependencies: None (foundational work)

## Priority
**1 of 6** - Must be completed first. All subsequent proposals depend on having tests to verify changes don't break existing functionality.
