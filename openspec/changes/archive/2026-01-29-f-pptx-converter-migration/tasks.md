# Tasks: F - PPTX Converter Migration

## 1. Refactor PPTX Converter to Use Pandoc Pipeline

- [x] 1.1 Import Pandoc components (PandocExecutor, PreProcessor, PostProcessor) and path utilities
- [x] 1.2 Add buildPandocOptions function for PPTX configuration (filters, reference doc, slide-level)
- [x] 1.3 Refactor convertMarkdownToPptx to use PreProcessor → PandocExecutor → PostProcessor flow
- [x] 1.4 Refactor convertToPptx to delegate to convertMarkdownToPptx (same pattern as DOCX)

## 2. Implement Slide Counting

- [x] 2.1 Add countSlides utility function that reads PPTX and counts slide files

## 3. Error Handling and Cleanup

- [x] 3.1 Add error handling for PandocNotFoundError and PandocConversionError
- [x] 3.2 Add cleanup of partial output on error

## 4. Remove Dead Code

- [x] 4.1 Remove pptxgenjs import and createRequire workaround
- [x] 4.2 Remove all pptxgenjs-specific helper functions and types (getThemeColors, createSlidesFromContent, createTitleSlide, createSectionSlide, createContentSlide, addTableToSlide, etc.)
