## MODIFIED Requirements

### Requirement: Consistent version across all surfaces (H2)
All version references SHALL report the same version number: package.json, CLI `--version`, and MCP server handshake.

#### Problem
README says 2.1.0 but package.json, CLI, and MCP server all report 1.0.0.

#### Fix
Update version to `2.1.0` in:
- `package.json` → `"version": "2.1.0"`
- `src/cli/index.ts` → `.version('2.1.0')`
- `src/mcp/server.ts` → `version: '2.1.0'`

#### Scenario: Version is consistent
- **GIVEN** the version has been synchronized
- **WHEN** a user runs `md-convert --version`
- **THEN** the output SHALL be `2.1.0`
- **AND** the MCP server SHALL report version `2.1.0` during handshake

---

## ADDED Requirements

### Requirement: CI pipeline for automated quality checks (M6)
The repository SHALL include a GitHub Actions workflow that runs build, type-check, lint, and tests on every push and pull request.

#### Fix
Create `.github/workflows/ci.yml`.

#### Scenario: PR with type errors is rejected
- **GIVEN** a pull request introduces a TypeScript type error
- **WHEN** the CI workflow runs
- **THEN** the `type-check` step SHALL fail and block merge

---

### Requirement: Test output excluded from version control (L3)
Generated test output files SHALL be excluded from Git tracking via `.gitignore`.

#### Fix
Add `tests/output/` to `.gitignore`.

#### Scenario: Test artifacts not tracked
- **GIVEN** `tests/output/` is in `.gitignore`
- **WHEN** tests generate output files in that directory
- **THEN** `git status` SHALL NOT show those files as untracked
