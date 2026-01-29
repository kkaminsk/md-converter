## 1. Types and Interfaces

- [x] 1.1 Add PostProcessorOptions and PostProcessorResult types to `src/core/pandoc/types.ts`
- [x] 1.2 Add PostProcessorError to `src/core/pandoc/errors.ts`

## 2. XLSX Post-Processing

- [x] 2.1 Create `src/core/pandoc/xlsx-post.ts` with formula injection logic
- [x] 2.2 Implement placeholder scanning in worksheet cells
- [x] 2.3 Implement formula replacement using ExcelJS

## 3. DOCX Post-Processing

- [x] 3.1 Create `src/core/pandoc/docx-post.ts` with jszip-based OOXML manipulation
- [x] 3.2 Implement classification header injection
- [x] 3.3 Implement document properties patching (docProps/core.xml)

## 4. PPTX Post-Processing

- [x] 4.1 Create `src/core/pandoc/pptx-post.ts` with slide footer handling
- [x] 4.2 Implement classification footer injection

## 5. Main Post-Processor

- [x] 5.1 Create `src/core/pandoc/post-processor.ts` with format dispatching
- [x] 5.2 Export PostProcessor and types from `src/core/pandoc/index.ts`

## 6. Tests

- [x] 6.1 Add tests for XLSX formula injection
- [x] 6.2 Add tests for DOCX header injection
- [x] 6.3 Add tests for PPTX footer injection
- [x] 6.4 Add tests for document properties patching
- [x] 6.5 Add tests for format dispatching and error handling
