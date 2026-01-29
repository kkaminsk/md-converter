# Tasks: Add Test Infrastructure

## 1. Configuration Setup
- [x] 1.1 Install Jest and related dev dependencies (`jest`, `@types/jest`, `ts-jest`)
- [x] 1.2 Create `jest.config.mjs` with ESM support
- [x] 1.3 Update `package.json` test script if needed
- [x] 1.4 Add `.nvmrc` file specifying Node 20

## 2. Test Directory Structure
- [x] 2.1 Create `tests/` directory structure mirroring `src/`
- [x] 2.2 Create `tests/fixtures/` for sample markdown files
- [x] 2.3 Add sample markdown fixtures with various front matter configurations

## 3. Parser Tests (Priority)
- [x] 3.1 Create `tests/core/parsers/formula-parser.test.ts`
  - Test 60+ Excel function validation
  - Test cell reference patterns
  - Test circular reference detection
  - Test formula sanitization
- [x] 3.2 Create `tests/core/parsers/frontmatter-parser.test.ts`
  - Test all 14 metadata fields
  - Test required field validation
  - Test format detection
- [x] 3.3 Create `tests/core/parsers/table-parser.test.ts`
  - Test table structure extraction
  - Test data type detection
  - Test formula cell handling
- [x] 3.4 Create `tests/core/parsers/markdown.test.ts`
  - Test heading extraction
  - Test content block parsing

## 4. Validator Tests
- [x] 4.1 Create `tests/core/validators/document-validator.test.ts`
  - Test heading hierarchy validation
  - Test required metadata validation

## 5. Converter Tests (Integration)
- [x] 5.1 Create `tests/core/converters/docx-converter.test.ts`
- [x] 5.2 Create `tests/core/converters/xlsx-converter.test.ts`
- [x] 5.3 Create `tests/core/converters/pptx-converter.test.ts`

## 6. Coverage and CI
- [x] 6.1 Configure Jest coverage reporting
- [x] 6.2 Achieve minimum 60% coverage on parsers
- [x] 6.3 Add coverage thresholds to Jest config
