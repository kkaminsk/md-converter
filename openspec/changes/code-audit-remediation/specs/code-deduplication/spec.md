## MODIFIED Requirements

### Requirement: Shared XML utilities (M1)
Duplicated XML helper functions SHALL be extracted into a single shared module to eliminate code duplication across post-processors.

#### Problem
`escapeXml()` and `updateXmlElement()` are copy-pasted identically in `docx-post.ts` and `pptx-post.ts`. The `columnToLetter()` function also appears in both `xlsx-post.ts` and `table-parser.ts`.

#### Fix
Create `src/core/pandoc/xml-utils.ts` with shared functions. Update imports in both post-processors.

#### Scenario: Single source of truth for XML escaping
- **GIVEN** a developer needs to fix a bug in XML escaping
- **WHEN** they update `xml-utils.ts`
- **THEN** both DOCX and PPTX post-processors SHALL use the fixed implementation

---

### Requirement: Use js-yaml for YAML serialization (M4)
The pre-processor SHALL use the `js-yaml` library for YAML serialization instead of manual string concatenation.

#### Problem
`PreProcessor.reconstructContent()` manually builds YAML strings, handling quoting, arrays, and booleans with custom logic. This fails on edge cases like strings containing both quote types or special YAML characters.

#### Fix
Replace manual serialization with `yaml.dump(metadata)`.

#### Scenario: Metadata with special characters serializes correctly
- **GIVEN** a document has metadata with value `Project: "Alpha" & 'Beta'`
- **WHEN** the pre-processor reconstructs the content
- **THEN** the YAML front matter SHALL be valid and parseable by js-yaml

---

### Requirement: Token-based inline parsing for XLSX (M5)
The XLSX converter SHALL use the token-based inline parser for markdown formatting instead of regex-based parsing.

#### Problem
`parseMarkdownFormatting()` in `xlsx-converter.ts` uses a regex that fails on nested formatting. The project already has `parseInlineTokens()` in `inline-parser.ts` that handles nesting correctly.

#### Fix
Refactor `parseMarkdownFormatting()` to delegate to `parseInlineTokens()` and convert the result to ExcelJS rich text format.

#### Scenario: Nested bold/italic renders correctly in Excel
- **GIVEN** a cell contains `**bold with *italic* inside**`
- **WHEN** the cell is converted to XLSX
- **THEN** "bold with " SHALL be bold, "italic" SHALL be bold+italic, " inside" SHALL be bold
