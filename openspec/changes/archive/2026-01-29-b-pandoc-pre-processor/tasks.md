## 1. Types Setup

- [x] 1.1 Add PreProcessor types to `src/core/pandoc/types.ts` (FormulaLocation, PreProcessorResult, PreProcessorOptions)
- [x] 1.2 Add PreProcessorError to `src/core/pandoc/errors.ts`

## 2. Core Implementation

- [x] 2.1 Create `src/core/pandoc/pre-processor.ts` with PreProcessor class skeleton
- [x] 2.2 Implement line ending normalization (CRLF/CR → LF)
- [x] 2.3 Implement metadata normalization using existing parseFrontMatter()
- [x] 2.4 Implement pipe table detection with regex-based scanning
- [x] 2.5 Implement formula extraction from table cells with placeholder generation
- [x] 2.6 Implement formula validation integration using existing validateFormula()
- [x] 2.7 Implement warning collection without blocking
- [x] 2.8 Implement options handling (validateFormulas, preserveLineEndings)

## 3. Exports

- [x] 3.1 Export PreProcessor and types from `src/core/pandoc/index.ts`

## 4. Tests

- [x] 4.1 Add tests for single formula extraction with correct placeholder
- [x] 4.2 Add tests for multiple formulas across multiple tables
- [x] 4.3 Add tests for formula validation warnings
- [x] 4.4 Add tests for metadata normalization (classification → subject mapping)
- [x] 4.5 Add tests for line ending normalization
- [x] 4.6 Add tests for formulas outside tables being ignored
- [x] 4.7 Add tests for PreProcessorOptions (validateFormulas: false, preserveLineEndings: true)
- [x] 4.8 Add tests for malformed YAML error handling
