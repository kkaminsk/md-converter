# Tasks: Fix Inline Markdown Parsing

## 1. Analysis
- [x] 1.1 Document current inline parsing behavior in docx-converter.ts:268
- [x] 1.2 Identify all inline formatting patterns that need support:
  - Bold: `**text**`
  - Italic: `*text*`
  - Code: `` `text` ``
  - Nested: `**bold *italic* bold**`
  - Links: `[text](url)`
- [x] 1.3 Review markdown-it token structure for inline content

## 2. Create Shared Inline Parser
- [x] 2.1 Create `src/core/parsers/inline-parser.ts`
- [x] 2.2 Implement `parseInlineTokens(text: string)` using markdown-it
- [x] 2.3 Define `InlineSegment` interface with text, bold, italic, code properties
- [x] 2.4 Handle nested formatting by tracking state stack
- [x] 2.5 Add comprehensive unit tests for inline parser

## 3. Update DOCX Converter
- [x] 3.1 Import inline parser in docx-converter.ts
- [x] 3.2 Replace regex-based `formatInlineMarkdown()` with token-based approach
- [x] 3.3 Map `InlineSegment` to docx `TextRun` with proper properties
- [x] 3.4 Test nested formatting in generated DOCX files

## 4. Update PPTX Converter
- [x] 4.1 Apply same inline parsing approach to pptx-converter.ts
- [x] 4.2 Map `InlineSegment` to pptxgenjs text formatting
- [x] 4.3 Test nested formatting in generated PPTX files

## 5. Validation
- [x] 5.1 Create test fixture with complex nested formatting
- [x] 5.2 Verify DOCX output renders correctly in Word
- [x] 5.3 Verify PPTX output renders correctly in PowerPoint
- [x] 5.4 Run full test suite
