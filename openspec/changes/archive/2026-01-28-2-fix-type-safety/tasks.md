# Tasks: Fix Type Safety in Converters

## 1. DOCX Converter Type Safety
- [x] 1.1 Remove `@ts-nocheck` directive from `docx-converter.ts`
- [x] 1.2 Identify all type errors reported by TypeScript
- [x] 1.3 Add type definitions for `docx` library paragraph/run builders
- [x] 1.4 Add proper typing for document section configuration
- [x] 1.5 Use type assertions for complex nested structures where library types are incomplete
- [x] 1.6 Run type-check and verify no errors: `npm run type-check`
- [x] 1.7 Run tests to verify conversion still works correctly

## 2. PPTX Converter Type Safety
- [x] 2.1 Remove `@ts-nocheck` directive from `pptx-converter.ts`
- [x] 2.2 Identify all type errors reported by TypeScript
- [x] 2.3 Add type definitions for `pptxgenjs` slide and text operations
- [x] 2.4 Add proper typing for slide master and layout configuration
- [x] 2.5 Use type assertions for complex nested structures where library types are incomplete
- [x] 2.6 Run type-check and verify no errors: `npm run type-check`
- [x] 2.7 Run tests to verify conversion still works correctly

## 3. Validation
- [x] 3.1 Build project: `npm run build`
- [x] 3.2 Run full test suite
- [x] 3.3 Manual smoke test: convert sample markdown to DOCX
- [x] 3.4 Manual smoke test: convert sample markdown to PPTX
