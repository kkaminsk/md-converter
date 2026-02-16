## Why

A comprehensive code audit ([CodeAudit.md](../../../CodeAudit.md)) identified 14 issues across high, medium, and low severity. Three high-severity issues — missing dependencies preventing build/test, version mismatch across files, and unvalidated MCP input — pose immediate risk to usability and security. Medium issues affect maintainability, type safety, and CI. This change proposal remediates all actionable findings.

## What Changes

- **Fix**: Synchronize version to 2.1.0 across package.json, CLI, and MCP server (H2)
- **Fix**: Add TypeScript interfaces and input validation for MCP handler arguments (H3)
- **Fix**: Extract duplicated XML utilities into shared module (M1)
- **Fix**: Add CLI options interface to replace `any` types (M2)
- **Fix**: Move `@types/js-yaml` to devDependencies (M3)
- **Fix**: Use `yaml.dump()` for YAML serialization in pre-processor (M4)
- **Fix**: Use token-based inline parser for XLSX formatting (M5)
- **New**: Add GitHub Actions CI workflow (M6)
- **Fix**: Remove unused legacy dependencies `docx` and `pptxgenjs` (L1)
- **Fix**: Add `jszip` as explicit dependency (L2)
- **Fix**: Add `tests/output/` to .gitignore (L3)
- **Fix**: Improve format type to support all valid combinations (L4)

## Capabilities

### Modified Capabilities
- `type-safety`: Fixes H3, M2 — adds typed interfaces for MCP and CLI argument handling
- `dependency-hygiene`: Fixes M3, L1, L2 — corrects dependency declarations
- `code-deduplication`: Fixes M1, M4, M5 — eliminates duplicated code and uses proper libraries
- `ci-and-versioning`: Fixes H2, M6, L3 — version sync, CI pipeline, gitignore cleanup

## Impact

- **Risk reduction**: Eliminates input validation gaps and version confusion
- **Breaking changes**: None — all changes are additive or corrective
- **Effort**: ~2 hours total across all remediations
- **Dependencies**: `jszip` added as explicit dependency (already used transitively)
