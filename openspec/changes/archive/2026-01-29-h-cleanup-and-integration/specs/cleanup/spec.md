# Spec: Cleanup and Finalization

This spec defines the requirements for finalizing the Pandoc migration.

## ADDED Requirements

### Requirement: Legacy dependencies are removed
The project SHALL NOT depend on `docx` or `pptxgenjs` npm packages after cleanup is complete.

#### Scenario: Package.json has no legacy dependencies
- **WHEN** package.json is read after cleanup
- **THEN** the `dependencies` section SHALL NOT contain `docx` or `pptxgenjs`

#### Scenario: npm install succeeds without legacy packages
- **WHEN** `npm install` is run after cleanup
- **THEN** installation SHALL complete successfully without errors

### Requirement: Documentation reflects Pandoc architecture
The README.md SHALL document Pandoc as a requirement and provide installation instructions.

#### Scenario: README mentions Pandoc requirement
- **WHEN** README.md is read
- **THEN** it SHALL include Pandoc installation instructions
- **AND** it SHALL specify minimum version 3.0+

#### Scenario: Technical details section is updated
- **WHEN** the Technical Details section of README.md is read
- **THEN** it SHALL describe Pandoc as the conversion engine
- **AND** it SHALL NOT reference `docx` or `pptxgenjs` as primary conversion libraries

### Requirement: Pandoc configuration is documented
A PANDOC.md file SHALL exist documenting Pandoc-specific configuration options.

#### Scenario: PANDOC.md covers core topics
- **WHEN** PANDOC.md is read
- **THEN** it SHALL document Lua filter customization
- **AND** it SHALL document reference document customization
- **AND** it SHALL document environment variables (PANDOC_PATH, MD_CONVERTER_TEMPLATES, etc.)

### Requirement: Migration guide exists
A MIGRATION.md file SHALL exist for users upgrading from v1.x.

#### Scenario: Migration guide covers requirements
- **WHEN** MIGRATION.md is read
- **THEN** it SHALL list Pandoc 3.0+ as a new requirement
- **AND** it SHALL explain there are no breaking API changes

#### Scenario: Migration guide has troubleshooting
- **WHEN** MIGRATION.md is read
- **THEN** it SHALL include troubleshooting for common issues
- **AND** it SHALL explain how to verify Pandoc is installed

### Requirement: Integration tests verify conversions
Integration tests SHALL exist that verify end-to-end conversion for each format.

#### Scenario: DOCX integration tests exist
- **WHEN** tests/integration/docx-integration.test.ts is read
- **THEN** it SHALL test basic document conversion
- **AND** it SHALL test section break handling
- **AND** it SHALL test inline formatting (bold, italic)

#### Scenario: PPTX integration tests exist
- **WHEN** tests/integration/pptx-integration.test.ts is read
- **THEN** it SHALL test basic presentation conversion
- **AND** it SHALL test slide break modes
- **AND** it SHALL test content types (lists, tables)

#### Scenario: XLSX integration tests exist
- **WHEN** tests/integration/xlsx-integration.test.ts is read
- **THEN** it SHALL test basic spreadsheet conversion
- **AND** it SHALL test formula handling
- **AND** it SHALL test multiple table worksheets

### Requirement: Error handling is tested
Integration tests SHALL verify graceful handling of Pandoc errors.

#### Scenario: Missing Pandoc error is tested
- **WHEN** tests/integration/error-handling.test.ts is read
- **THEN** it SHALL test behavior when Pandoc is not installed

#### Scenario: Invalid input error is tested
- **WHEN** tests/integration/error-handling.test.ts is read
- **THEN** it SHALL test behavior with malformed markdown input

### Requirement: CI pipeline exists
A GitHub Actions workflow SHALL exist for automated testing.

#### Scenario: Workflow tests on multiple platforms
- **WHEN** .github/workflows/test.yml is read
- **THEN** it SHALL define a matrix with ubuntu-latest, windows-latest, and macos-latest

#### Scenario: Workflow installs Pandoc
- **WHEN** .github/workflows/test.yml is read
- **THEN** it SHALL include a step to install Pandoc 3.x
