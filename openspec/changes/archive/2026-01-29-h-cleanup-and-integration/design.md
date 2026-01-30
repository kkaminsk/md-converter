# Design: H - Cleanup and Integration Testing

## Context

The Pandoc migration (Changes A-G) is complete. All three converters (DOCX, PPTX, XLSX) now use the Pandoc-based pipeline. The legacy dependencies (`docx` and `pptxgenjs`) are no longer imported anywhere in the codebase but remain in `package.json`.

Current state:
- `docx` and `pptxgenjs` packages are in `package.json` but not imported
- README.md still references the old library-based architecture
- No integration tests exist to verify end-to-end Pandoc conversion
- No CI/CD pipeline exists
- CLAUDE.md is partially updated but needs final review

This change finalizes the migration by removing dead code, updating docs, and adding verification.

## Goals / Non-Goals

**Goals:**
- Remove unused dependencies to reduce bundle size and security surface
- Update all documentation to reflect Pandoc-based architecture
- Add integration tests to verify conversions work end-to-end
- Establish CI/CD pipeline for ongoing quality assurance
- Provide migration guide for users upgrading from v1.x

**Non-Goals:**
- Adding new features or capabilities
- Changing the public API
- Performance optimization (benchmarks are for verification only)
- Supporting Pandoc versions below 3.0

## Decisions

### 1. Dependency Removal Strategy

**Decision:** Remove `docx` and `pptxgenjs` from package.json in a single commit.

**Rationale:** Both packages are confirmed unused (grep shows no imports). Removing together is cleaner than separate commits since they're being removed for the same reason.

**Alternatives considered:**
- Gradual removal: Rejected - no benefit since neither is used
- Keep as optional: Rejected - adds maintenance burden with no value

### 2. Documentation Structure

**Decision:** Update existing files (README.md, CLAUDE.md) rather than creating many new files. Create only PANDOC.md and MIGRATION.md as new documentation.

**Rationale:**
- Keeps documentation discoverable in expected locations
- Avoids documentation sprawl
- PANDOC.md needed for Pandoc-specific configuration details
- MIGRATION.md needed for upgrade guidance

**Alternatives considered:**
- Full docs/ restructure: Rejected - over-engineering for this project size
- Single CHANGELOG entry only: Rejected - insufficient for Pandoc setup guidance

### 3. Test Organization

**Decision:** Create `tests/integration/` directory with format-specific test files:
- `docx-integration.test.ts`
- `pptx-integration.test.ts`
- `xlsx-integration.test.ts`
- `error-handling.test.ts`

**Rationale:**
- Separates integration tests from unit tests
- Format-specific files allow targeted test runs
- Error handling tests in separate file for clarity

**Alternatives considered:**
- Single integration test file: Rejected - would become unwieldy
- Tests alongside converters: Rejected - integration tests span multiple modules

### 4. CI/CD Approach

**Decision:** GitHub Actions with matrix builds for Ubuntu, Windows, macOS.

**Rationale:**
- Pandoc behavior can vary by OS
- Users run this tool on all three platforms
- GitHub Actions is standard and free for open source

**Alternatives considered:**
- Single OS testing: Rejected - Pandoc has platform-specific behaviors
- CircleCI/Travis: Rejected - GitHub Actions is simpler for GitHub repos

### 5. Performance Benchmarks

**Decision:** Include performance tests but don't make them blocking in CI.

**Rationale:**
- CI runners have variable performance
- Hard time limits cause flaky tests
- Benchmarks are for regression detection, not gates

**Alternatives considered:**
- Strict time limits in CI: Rejected - too flaky
- No benchmarks: Rejected - want visibility into regressions

## Risks / Trade-offs

### R1: Pandoc Version Differences
**Risk:** Users may have older Pandoc versions that behave differently.
**Mitigation:** Document minimum version (3.0+), add version check in CLI startup, provide clear error message.

### R2: Platform-Specific Pandoc Behavior
**Risk:** Pandoc output may vary slightly between OS versions.
**Mitigation:** Integration tests focus on structural correctness (file created, has content) rather than byte-exact output.

### R3: Test Fixture Maintenance
**Risk:** Integration test fixtures may drift from real-world usage.
**Mitigation:** Use fixtures that cover documented features. Keep fixtures minimal.

### R4: Breaking Changes for Users
**Risk:** Users relying on undocumented behavior may be affected.
**Mitigation:** Public API unchanged. Migration guide documents what to expect.

## Migration Plan

1. **Phase 1: Cleanup** (no user impact)
   - Remove unused dependencies
   - Update package.json

2. **Phase 2: Documentation** (informational)
   - Update README.md with Pandoc requirements
   - Create PANDOC.md configuration guide
   - Create MIGRATION.md upgrade guide
   - Final review of CLAUDE.md

3. **Phase 3: Testing** (internal quality)
   - Add integration tests
   - Add performance benchmarks
   - Verify all tests pass locally

4. **Phase 4: CI/CD** (automation)
   - Create GitHub Actions workflow
   - Verify pipeline passes on all platforms

**Rollback:** If issues discovered, dependencies can be re-added. No data migrations involved.

## Open Questions

None - this is a straightforward cleanup change with well-defined scope.
