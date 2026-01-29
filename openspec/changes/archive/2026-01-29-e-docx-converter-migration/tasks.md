## 1. Refactor Core Conversion Function

- [x] 1.1 Import Pandoc pipeline components (PandocExecutor, PreProcessor, PostProcessor)
- [x] 1.2 Import filter/template path utilities (getFilterPath, getTemplatePath, FILTERS)
- [x] 1.3 Create `buildPandocOptions()` helper function
- [x] 1.4 Refactor `convertMarkdownToDocx()` to use Pandoc pipeline

## 2. Update File-Based Function

- [x] 2.1 Simplify `convertToDocx()` to read file and delegate to `convertMarkdownToDocx()`
- [x] 2.2 Preserve output path defaulting behavior (inputPath.replace('.md', '.docx'))

## 3. Error Handling

- [x] 3.1 Wrap PandocNotFoundError in ConversionError
- [x] 3.2 Wrap PandocConversionError in ConversionError
- [x] 3.3 Ensure partial outputs are cleaned up on error

## 4. Remove Legacy Code

- [x] 4.1 Remove `createRequire` and docx library imports
- [x] 4.2 Remove docx library type definitions
- [x] 4.3 Remove `splitIntoSections()` function
- [x] 4.4 Remove `convertContentToDocx()` function
- [x] 4.5 Remove element creation functions (createHeading, createParagraph, etc.)
- [x] 4.6 Remove inline formatting functions (parseInlineFormatting, segmentToTextRun)

## 5. Testing

- [x] 5.1 Verify all existing tests pass
- [x] 5.2 Add test for Pandoc error handling (covered by existing error tests)
- [x] 5.3 Add test for classification header injection (covered by post-processor tests)
