# MD Converter - Recommendations for Modernization

**Review Date:** 2026-01-28
**Current Version:** 2.1.0
**Overall Health Score:** 7.4/10

---

## Executive Summary

MD Converter is a well-architected TypeScript project with modern patterns and current dependencies. The primary concern is the complete absence of test coverage. Most dependencies are up-to-date, and the codebase follows good practices with some exceptions noted below.

---

## Critical Issues (Address Immediately)

### 1. Zero Test Coverage

**Impact:** High
**Files Affected:** Entire codebase

No test files exist despite a test script in `package.json`. This creates significant risk for:
- Regression during refactoring
- Undetected bugs in formula parsing
- Difficulty validating edge cases

**Recommendation:**
```bash
# Add Jest configuration
npm install -D jest @types/jest ts-jest

# Create test structure
tests/
├── core/
│   ├── parsers/
│   │   ├── markdown.test.ts
│   │   ├── frontmatter-parser.test.ts
│   │   ├── table-parser.test.ts
│   │   └── formula-parser.test.ts
│   ├── converters/
│   │   ├── docx-converter.test.ts
│   │   ├── xlsx-converter.test.ts
│   │   └── pptx-converter.test.ts
│   └── validators/
│       └── document-validator.test.ts
└── fixtures/
```

**Priority test areas:**
- Formula validation (60+ Excel functions)
- Front matter parsing (14 metadata fields)
- Table structure validation
- Heading hierarchy checks

---

### 2. @ts-nocheck Flags Bypass Type Safety

**Impact:** Medium-High
**Files Affected:**
- `src/core/converters/docx-converter.ts` (line 6)
- `src/core/converters/pptx-converter.ts` (line 6)

These flags disable TypeScript's type checking for core converter modules.

**Recommendation:** Remove the flags and fix type issues. Common fixes:
- Add proper type definitions for `docx` and `pptxgenjs` library interactions
- Use type assertions where library types are incomplete
- Consider contributing missing types to DefinitelyTyped

---

### 3. Inline Markdown Parsing Uses Simple Regex

**Impact:** Medium
**File:** `src/core/converters/docx-converter.ts` (line 268)

Current regex `/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/` fails on nested formatting like `**bold with *italic* inside**`.

**Recommendation:** Use markdown-it's token-based parsing instead of regex for inline formatting. This ensures consistent behavior across all converters.

---

## Dependency Updates

### Current Status: Generally Up-to-Date

| Package | Current | Latest | Action |
|---------|---------|--------|--------|
| typescript | 5.3.3 | 5.7+ | Update (better error messages) |
| @types/node | 20.11.5 | 22+ | Keep (Node 20 LTS is target) |
| docx | 8.5.0 | Current | None |
| exceljs | 4.4.0 | Current | None |
| pptxgenjs | 3.12.0 | Current | None |
| chalk | 5.3.0 | Current | None |
| commander | 12.0.0 | Current | None |
| markdown-it | 14.0.0 | Current | None |
| @modelcontextprotocol/sdk | 1.0.0 | Check | Verify latest |

**Recommended Update:**
```bash
npm install -D typescript@latest
```

---

## Code Quality Improvements

### 1. Add ESLint and Prettier

No linting configuration exists.

```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier
```

### 2. Implement Custom Error Classes

**Current:** Generic `Error` objects
**Recommended:** Specific error types

```typescript
// src/core/errors.ts
export class FormulaValidationError extends Error {
  constructor(public formula: string, public reason: string) {
    super(`Invalid formula "${formula}": ${reason}`);
    this.name = 'FormulaValidationError';
  }
}

export class FrontMatterError extends Error { ... }
export class ConversionError extends Error { ... }
```

### 3. Add JSDoc Documentation

Public APIs lack documentation. Add JSDoc comments for:
- All exported functions in `src/index.ts`
- Converter public methods
- Parser interfaces

---

## Feature Gaps

### Already Planned for v2.2.0
- Image support (`![alt](path)` currently ignored)
- Table of Contents generation

### Additional Recommendations

| Feature | Priority | Effort |
|---------|----------|--------|
| Configurable date format (not just DD/MM/YYYY) | High | Low |
| Custom Word template support | Medium | Medium |
| Better circular formula reference detection | Low | Medium |
| MCP resource tools (file listing) | Low | Low |

---

## Configuration Improvements

### 1. Add Jest Configuration

Create `jest.config.mjs`:
```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
};
```

### 2. Add .nvmrc for Node Version

```
20
```

### 3. Consider Adding GitHub Actions CI

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run type-check
      - run: npm test
```

---

## Security Considerations

### Current Status: Good

- No external network calls
- YAML parsing is safe (no code execution)
- Formula sanitization in place

### Minor Improvements

1. **File path validation:** Consider explicit base directory restriction for glob patterns
2. **MCP input validation:** Define TypeScript interfaces for MCP handler arguments (currently uses `any`)

---

## Performance Notes

### Identified Issues

1. **Column width calculation** in `xlsx-converter.ts` (lines 310-325) iterates all cells per column
2. **Large documents:** No chunking or progressive rendering

### Recommendations

- For documents over 100 pages, consider streaming output
- Cache compiled regex patterns for inline markdown formatting

---

## Action Plan

### Phase 1: Critical (This Sprint)
- [ ] Add Jest configuration and basic test suite
- [ ] Remove `@ts-nocheck` from docx-converter.ts
- [ ] Remove `@ts-nocheck` from pptx-converter.ts
- [ ] Add ESLint + Prettier configuration

### Phase 2: High Priority (Next Release)
- [ ] Achieve 60%+ test coverage
- [ ] Implement custom error classes
- [ ] Add configurable date format support
- [ ] Fix inline markdown parsing to use tokens

### Phase 3: Future Enhancements
- [ ] Image support (v2.2.0)
- [ ] Table of Contents (v2.2.0)
- [ ] Custom Word template support
- [ ] GitHub Actions CI pipeline

---

## Summary

The MD Converter codebase is well-designed with modern TypeScript practices. The most urgent need is establishing a test suite to ensure reliability. Dependencies are current and don't require immediate updates. Focus first on testing infrastructure, then address the type safety issues in the converter modules.
