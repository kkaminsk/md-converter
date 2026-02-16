# Code Audit Report: md-converter

**Date:** 2026-02-15  
**Auditor:** BHG-Bot (automated engineering review)  
**Scope:** Full codebase — `src/`, `tests/`, `templates/`, configuration files  
**Version:** 2.1.0 (package.json says 1.0.0)

---

## Summary

MD Converter is a well-architected TypeScript project that converts Markdown to DOCX, XLSX, PPTX, and PDF using Pandoc. The codebase demonstrates solid modularity, comprehensive error handling with custom error classes, and a clean separation between parsers, converters, and the MCP server interface. Key concerns are: dependencies not installed (tests cannot run), version mismatch between README and package.json, extensive use of `any` in MCP handlers and CLI, and duplicated utility functions across post-processors.

| Severity | Count |
|----------|-------|
| 🔴 High | 3 |
| 🟡 Medium | 6 |
| 🟢 Low | 5 |

---

## 🔴 High Severity

### H1: Dependencies not installed — tests and build cannot run

**Files:** `package.json`, `node_modules/` (missing)  
**Issue:** `node_modules/` does not exist. Running `npm test` fails with `Cannot find module 'jest'`. Running `npm run build` fails similarly. The project is unbuildable and untestable in its current state.  
**Impact:** No CI, no type-checking, no test execution. Any contributor cloning the repo must know to run `npm install` first, but the build/test pipeline is broken if node_modules isn't committed or CI isn't configured.  
**Recommendation:** Run `npm install` to restore dependencies. Add a GitHub Actions CI workflow to ensure build + test pass on every push.

### H2: Version mismatch — README says 2.1.0, package.json says 1.0.0

**Files:** `README.md` (line 1), `package.json` (`"version": "1.0.0"`), `src/cli/index.ts` (`.version('1.0.0')`), `src/mcp/server.ts` (`version: '1.0.0'`)  
**Issue:** The README prominently advertises "Version: 2.1.0" but the package.json, CLI, and MCP server all report version 1.0.0. This confuses users and breaks any version-dependent tooling.  
**Impact:** Users see conflicting version information; `md-convert --version` reports wrong version.  
**Recommendation:** Synchronize all version references to 2.1.0 (or the correct current version). Consider importing version from package.json to avoid future drift.

### H3: MCP server handlers use `any` for all arguments — no input validation

**Files:** `src/mcp/server.ts` (lines: `handleConvertToDocx`, `handleConvertToXlsx`, `handleConvertToPptx`, `handleConvertToPdf`, `handlePreviewTables`, `handleValidateFormulas`)  
**Issue:** All MCP tool handlers accept `args: any` and destructure without validation. A malicious or malformed request could pass arbitrary file paths (path traversal), missing required fields, or unexpected types. No input sanitization occurs before passing `file_path` to `fs.readFile` or converter functions.  
**Impact:** Potential path traversal attacks; unhandled exceptions from missing required fields; poor developer experience with no input validation errors.  
**Recommendation:** Define TypeScript interfaces for each handler's arguments. Validate `file_path` exists and is within an allowed directory. Check required fields before destructuring.

---

## 🟡 Medium Severity

### M1: Duplicated utility functions across post-processors

**Files:** `src/core/pandoc/docx-post.ts`, `src/core/pandoc/pptx-post.ts`  
**Issue:** `escapeXml()`, `updateXmlElement()`, and `patchDocumentProperties()` are copy-pasted between DOCX and PPTX post-processors with identical implementations. The `columnToLetter()` function also appears in both `xlsx-post.ts` and `table-parser.ts` with slightly different signatures.  
**Impact:** Bug fixes or improvements must be applied in multiple places; risk of divergence.  
**Recommendation:** Extract shared XML utilities into a `src/core/pandoc/xml-utils.ts` module. Extract column letter conversion into a single shared utility.

### M2: CLI `handleConvert` uses `options: any` throughout

**File:** `src/cli/index.ts` (lines: `handleConvert`, `getOutputPath`, `convertFile`)  
**Issue:** The `options` parameter from Commander is typed as `any`, propagating untyped data through the entire CLI pipeline. `parseInt(options.fontSize, 10)` will silently produce `NaN` if fontSize is not a valid number string.  
**Impact:** Runtime errors from unexpected option types; no compile-time safety for CLI option handling.  
**Recommendation:** Define a `CliOptions` interface and validate/parse options at the boundary.

### M3: `@types/js-yaml` is in production dependencies

**File:** `package.json`  
**Issue:** `@types/js-yaml` (v4.0.9) is listed under `dependencies` instead of `devDependencies`. Type declaration packages should never be runtime dependencies.  
**Impact:** Unnecessary bloat in production installs; signals dependency hygiene issues.  
**Recommendation:** Move `@types/js-yaml` to `devDependencies`.

### M4: Pre-processor reconstructs YAML front matter manually instead of using js-yaml

**File:** `src/core/pandoc/pre-processor.ts` (`reconstructContent` method)  
**Issue:** The method manually serializes metadata to YAML using string concatenation, handling quoting, arrays, and booleans with custom logic. This is fragile and doesn't handle edge cases (e.g., strings containing both single and double quotes, multiline values, special YAML characters like `{}[]`).  
**Impact:** Corrupted YAML output for edge-case metadata values; potential conversion failures.  
**Recommendation:** Use `yaml.dump()` from `js-yaml` (already a dependency) to serialize metadata.

### M5: Regex-based markdown formatting in xlsx-converter doesn't handle nested formatting

**File:** `src/core/converters/xlsx-converter.ts` (`parseMarkdownFormatting` function)  
**Issue:** The regex `/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/` fails on nested formatting like `**bold with *italic* inside**`. The project already has a proper token-based `inline-parser.ts` but the XLSX converter doesn't use it.  
**Impact:** Incorrect formatting in Excel cells with nested bold/italic.  
**Recommendation:** Use `parseInlineTokens()` from `inline-parser.ts` for XLSX cell formatting, matching the approach already available.

### M6: No GitHub Actions CI pipeline

**Issue:** No `.github/workflows/` directory exists. There is no automated build, type-check, lint, or test verification on push/PR.  
**Impact:** Regressions can be merged without detection; contributors have no feedback loop.  
**Recommendation:** Add a basic CI workflow that runs `npm ci`, `npm run type-check`, `npm run lint`, and `npm test`.

---

## 🟢 Low Severity

### L1: `docx` and `pptxgenjs` listed as dependencies but no longer used

**File:** `package.json`  
**Issue:** CLAUDE.md notes these are "Legacy Dependencies (being removed)" since DOCX and PPTX conversion has migrated to Pandoc. However, they remain in `dependencies`, adding ~2MB to install size.  
**Impact:** Unnecessary dependency bloat; potential security surface from unused packages.  
**Recommendation:** Remove `docx` and `pptxgenjs` from dependencies. Verify no code imports them (confirmed: current converters use Pandoc).

### L2: `jszip` used but not declared in package.json

**Files:** `src/core/converters/pptx-converter.ts`, `src/core/pandoc/docx-post.ts`, `src/core/pandoc/pptx-post.ts`  
**Issue:** Multiple files import `JSZip from 'jszip'` but `jszip` is not listed in `package.json` dependencies. It likely works as a transitive dependency of `exceljs`, but this is fragile.  
**Impact:** Could break if `exceljs` changes its dependency tree; violates explicit dependency principle.  
**Recommendation:** Add `jszip` to `dependencies` in package.json.

### L3: Test output files committed to repository

**File:** `tests/output/` directory  
**Issue:** `tests/output/` contains `.md` files that appear to be test artifacts. These should be gitignored or generated during test runs.  
**Impact:** Repository clutter; potential merge conflicts on generated files.  
**Recommendation:** Add `tests/output/` to `.gitignore` (keep the directory with a `.gitkeep` file).

### L4: `pdf` format not included in `DocumentMetadata.format` type union

**File:** `src/core/parsers/frontmatter-parser.ts`  
**Issue:** The `format` field type includes `'docx,pdf'` but doesn't include all valid combinations (e.g., `'pptx,pdf'`, `'xlsx,pdf'`). The `VALID_FORMATS` array also lacks these combinations. This means users can't specify some valid format combinations in front matter.  
**Impact:** Limited format combination support in front matter; inconsistent with CLI which accepts any combination.  
**Recommendation:** Either enumerate all valid combinations, or change to accept a comma-separated string and validate individual formats.

### L5: Unused imports and exports

**Files:** `src/core/converters/section-rules.ts` exports `getSectionBreakType`, `getSlideBreakType`, `countExpectedSections`, `countExpectedSlides` — none are imported anywhere in the codebase.  
**Impact:** Dead code increases maintenance burden; misleads developers about the API surface.  
**Recommendation:** Remove unused exports or document their intended use (e.g., for future features or external consumers).

---

## Positive Observations

- **Excellent error hierarchy**: Custom error classes (`ConverterError`, `FormulaValidationError`, `FrontMatterError`, `ConversionError`, `ValidationError`, and Pandoc-specific errors) provide rich context for debugging.
- **Clean architecture**: Clear separation between parsers, converters, validators, and the Pandoc integration layer.
- **Token-based inline parser**: `inline-parser.ts` correctly uses markdown-it's tokenizer for nested formatting — a proper solution that should be adopted more widely.
- **Comprehensive documentation**: README, CLAUDE.md, and FRONTMATTER.md are thorough and well-written.
- **Good TypeScript config**: Strict mode enabled with all recommended checks (`noUnusedLocals`, `noImplicitReturns`, etc.).
- **ESLint + Prettier configured**: Code formatting and linting tooling is in place.
- **Pandoc migration well-planned**: The openspec-driven migration from library-specific converters to Pandoc is methodical.
- **Test structure exists**: 14 test files covering all major modules, with fixtures and Jest config ready.
