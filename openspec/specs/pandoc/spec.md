# Pandoc Capability Specification

## Requirements

### Requirement: Pre-processor extracts formulas from markdown tables

The PreProcessor SHALL scan markdown content for pipe tables and extract all `{=FORMULA}` patterns, replacing them with traceable placeholders.

The placeholder format SHALL be `__FORMULA_{tableIndex}_{row}_{column}__` where:
- `tableIndex` is the 0-based index of the table in the document
- `row` is the 0-based row index within the table (header row is 0, separator is skipped, first data row is 1)
- `column` is the 0-based column index

The PreProcessor SHALL return a `FormulaLocation` array containing the original formula, its placeholder, and position coordinates for each extracted formula.

#### Scenario: Single formula in table cell

- **WHEN** markdown contains a table with `{=SUM(B2:B5)}` in cell (row 2, column 3)
- **THEN** the formula is replaced with `__FORMULA_0_2_3__`
- **AND** extractedData.formulas contains one entry with formula `SUM(B2:B5)` and the placeholder

#### Scenario: Multiple formulas across multiple tables

- **WHEN** markdown contains two tables, first with 2 formulas, second with 1 formula
- **THEN** placeholders use correct tableIndex (0 for first table, 1 for second)
- **AND** extractedData.formulas contains 3 entries with correct coordinates
- **AND** extractedData.tableCount equals 2

#### Scenario: Formula with special characters

- **WHEN** markdown contains `{=IF(A1>0,"Yes","No")}`
- **THEN** the entire formula including quotes and comparison operator is extracted
- **AND** the placeholder replaces the full `{=...}` pattern

#### Scenario: No formulas in document

- **WHEN** markdown contains tables but no `{=...}` patterns
- **THEN** content is returned unchanged
- **AND** extractedData.formulas is an empty array

#### Scenario: Formulas outside tables are ignored

- **WHEN** markdown contains `{=SUM(A1:A10)}` in a paragraph (not in a table)
- **THEN** the formula pattern is left unchanged in the content
- **AND** extractedData.formulas does not include this formula

### Requirement: Pre-processor validates extracted formulas

The PreProcessor SHALL validate each extracted formula using the existing `validateFormula()` function from `formula-parser.ts`.

Invalid formulas SHALL still be extracted (to preserve document structure) but SHALL generate a warning.

#### Scenario: Valid formula extraction

- **WHEN** formula `{=SUM(B2:B5)}` is extracted
- **THEN** no warning is added for this formula
- **AND** the formula is included in extractedData.formulas

#### Scenario: Invalid formula generates warning

- **WHEN** formula `{=SUM(B2:B5}` (missing closing paren) is extracted
- **THEN** a warning is added: "Invalid formula at table 0, row 2, column 3: Mismatched parentheses"
- **AND** the formula is still included in extractedData.formulas with its placeholder

### Requirement: Pre-processor normalizes metadata for Pandoc

The PreProcessor SHALL parse YAML front matter using existing `parseFrontMatter()` and produce Pandoc-compatible metadata.

The following field mappings SHALL be applied:
- `classification` → also copied to `subject` (for DOCX document properties)
- `section_breaks` → passed through for Lua filter consumption
- `slide_breaks` → passed through for Lua filter consumption
- Add `generator: "md-converter"` field

The PreProcessor SHALL ensure `title` is present (required by Pandoc for standalone documents).

#### Scenario: Metadata with classification

- **WHEN** front matter contains `classification: "OFFICIAL"`
- **THEN** extractedData.metadata contains both `classification: "OFFICIAL"` and `subject: "OFFICIAL"`

#### Scenario: Metadata with section_breaks

- **WHEN** front matter contains `section_breaks: auto`
- **THEN** extractedData.metadata contains `section_breaks: "auto"` unchanged

#### Scenario: Metadata without optional fields

- **WHEN** front matter contains only required `title` and `format` fields
- **THEN** extractedData.metadata contains those fields plus `generator: "md-converter"`
- **AND** no error is thrown for missing optional fields

#### Scenario: Missing front matter

- **WHEN** markdown has no YAML front matter
- **THEN** a warning is added: "No YAML front matter found"
- **AND** extractedData.metadata contains default values with `generator: "md-converter"`

### Requirement: Pre-processor normalizes line endings

The PreProcessor SHALL normalize all line endings to LF (Unix-style) before processing.

This ensures consistent table detection regex behavior across Windows and Unix platforms.

#### Scenario: CRLF line endings

- **WHEN** markdown content uses CRLF (`\r\n`) line endings
- **THEN** output content uses LF (`\n`) line endings
- **AND** table structure is correctly detected

#### Scenario: Mixed line endings

- **WHEN** markdown content has mixed CR, LF, and CRLF line endings
- **THEN** all are normalized to LF in output content

### Requirement: Pre-processor preserves document structure

The PreProcessor SHALL NOT modify any content except:
- Replacing `{=FORMULA}` patterns with placeholders in table cells
- Normalizing line endings

All markdown formatting, headings, paragraphs, code blocks, and other elements SHALL remain unchanged.

#### Scenario: Complex document structure

- **WHEN** markdown contains headings, code blocks, blockquotes, lists, and tables
- **THEN** only table cell formulas are modified
- **AND** all other content is byte-for-byte identical (after line ending normalization)

#### Scenario: Table without formulas

- **WHEN** markdown contains a table with no formulas
- **THEN** the table content is unchanged
- **AND** tableCount is incremented

### Requirement: Pre-processor collects warnings without blocking

The PreProcessor SHALL collect all warnings into the result's `warnings` array without throwing exceptions.

Processing SHALL continue even when warnings are generated.

Only malformed YAML that cannot be parsed SHALL cause an error.

#### Scenario: Multiple warnings collected

- **WHEN** markdown has missing recommended fields and an invalid formula
- **THEN** all warnings are collected in the warnings array
- **AND** processing completes successfully with partial results

#### Scenario: Malformed YAML throws error

- **WHEN** YAML front matter has syntax errors (e.g., unclosed quotes)
- **THEN** a PreProcessorError is thrown with details about the YAML error
- **AND** processing stops

### Requirement: Pre-processor options control behavior

The PreProcessor SHALL accept optional configuration:
- `validateFormulas`: boolean (default: true) - whether to validate formulas
- `preserveLineEndings`: boolean (default: false) - skip line ending normalization

#### Scenario: Disable formula validation

- **WHEN** process() is called with `{ validateFormulas: false }`
- **THEN** formulas are extracted but not validated
- **AND** no formula validation warnings are generated

#### Scenario: Preserve line endings

- **WHEN** process() is called with `{ preserveLineEndings: true }`
- **THEN** original line endings are preserved in output content

### Requirement: Section breaks filter controls DOCX page breaks

The `section-breaks.lua` filter SHALL read the `section_breaks` metadata field and insert page breaks in DOCX output according to the mode:

- **auto** (default): Insert page break before H2 headings only
- **all**: Insert page break before H2, H3 headings and at horizontal rules
- **none**: No automatic page breaks inserted

Page breaks SHALL be implemented as raw OpenXML blocks.

#### Scenario: Auto mode inserts break before H2

- **WHEN** document has `section_breaks: auto` and contains H2 headings
- **THEN** a page break is inserted before each H2 heading
- **AND** no break is inserted before H3 or at horizontal rules

#### Scenario: All mode inserts breaks at multiple points

- **WHEN** document has `section_breaks: all`
- **THEN** page breaks are inserted before H2 and H3 headings
- **AND** horizontal rules are converted to page breaks

#### Scenario: None mode inserts no breaks

- **WHEN** document has `section_breaks: none`
- **THEN** no page breaks are inserted
- **AND** horizontal rules remain as visual dividers

#### Scenario: Default behavior when not specified

- **WHEN** document has no `section_breaks` metadata
- **THEN** auto mode is used (breaks before H2 only)

### Requirement: Slide breaks filter controls PPTX slide boundaries

The `slide-breaks.lua` filter SHALL read the `slide_breaks` metadata field and control slide creation in PPTX output:

- **h1**: Only H1 headings create new slides
- **h2** (default): H1 and H2 headings create new slides
- **hr**: Horizontal rules create slide breaks (in addition to H1/H2)

#### Scenario: H1 mode creates slides only at H1

- **WHEN** document has `slide_breaks: h1`
- **THEN** only H1 headings start new slides
- **AND** H2 and H3 appear as content within slides

#### Scenario: H2 mode creates slides at H1 and H2

- **WHEN** document has `slide_breaks: h2`
- **THEN** H1 and H2 headings start new slides
- **AND** H3 appears as content within slides

#### Scenario: HR mode adds slide breaks at horizontal rules

- **WHEN** document has `slide_breaks: hr`
- **THEN** horizontal rules create slide boundaries
- **AND** H1 and H2 also create slides as normal

#### Scenario: Default behavior when not specified

- **WHEN** document has no `slide_breaks` metadata
- **THEN** h2 mode is used (H1 and H2 create slides)

### Requirement: Metadata inject filter normalizes document metadata

The `metadata-inject.lua` filter SHALL normalize and validate document metadata:

- Ensure `title` is present (default: "Untitled Document")
- Copy `classification` to `subject` field for document properties
- Pass through `section_breaks` and `slide_breaks` for other filters
- Add `generator: md-converter` field

#### Scenario: Missing title gets default

- **WHEN** document has no title in metadata
- **THEN** title is set to "Untitled Document"

#### Scenario: Classification maps to subject

- **WHEN** document has `classification: OFFICIAL`
- **THEN** `subject` field is set to "OFFICIAL"

#### Scenario: Existing metadata preserved

- **WHEN** document has author, date, and keywords
- **THEN** all fields are preserved unchanged

### Requirement: Filter path resolution supports custom directories

The `getFilterPath()` function SHALL resolve filter paths using:

1. `MD_CONVERTER_FILTERS` environment variable (if set)
2. Default path: `src/pandoc/filters/` relative to package root

The `getTemplatePath()` function SHALL resolve template paths using:

1. `MD_CONVERTER_TEMPLATES` environment variable (if set)
2. Default path: `templates/` relative to package root

#### Scenario: Env var overrides default path

- **WHEN** `MD_CONVERTER_FILTERS` is set to `/custom/filters`
- **THEN** `getFilterPath('section-breaks.lua')` returns `/custom/filters/section-breaks.lua`

#### Scenario: Default path used when no env var

- **WHEN** `MD_CONVERTER_FILTERS` is not set
- **THEN** `getFilterPath('section-breaks.lua')` returns path relative to package root

#### Scenario: Template path resolution

- **WHEN** `MD_CONVERTER_TEMPLATES` is set to `/custom/templates`
- **THEN** `getTemplatePath('reference.docx')` returns `/custom/templates/reference.docx`

### Requirement: Pandoc defaults files configure conversion

Defaults files SHALL be provided for DOCX and PPTX conversion:

`defaults/docx.yaml`:
- Input format: markdown with extensions
- Output format: docx
- Reference document: reference.docx
- Filters: metadata-inject.lua, section-breaks.lua

`defaults/pptx.yaml`:
- Input format: markdown with extensions
- Output format: pptx
- Reference document: reference.pptx
- Filters: metadata-inject.lua, slide-breaks.lua
- Slide level: 2

#### Scenario: DOCX defaults include correct filters

- **WHEN** using `pandoc --defaults=docx.yaml`
- **THEN** metadata-inject and section-breaks filters are applied
- **AND** reference.docx is used for styling

#### Scenario: PPTX defaults include correct filters

- **WHEN** using `pandoc --defaults=pptx.yaml`
- **THEN** metadata-inject and slide-breaks filters are applied
- **AND** reference.pptx is used for styling
- **AND** slide-level is set to 2

### Requirement: Reference documents define output styles

`reference.docx` SHALL define styles for:
- Title, Heading 1-6 (document structure)
- Normal, First Paragraph (body text)
- Source Code (code blocks)
- Block Text (blockquotes)
- Hyperlink (links)

`reference.pptx` SHALL define:
- Title slide layout
- Content slide layout
- Consistent color theme

#### Scenario: DOCX output uses reference styles

- **WHEN** converting markdown with headings and code blocks
- **THEN** output DOCX uses styles from reference.docx

#### Scenario: PPTX output uses reference layouts

- **WHEN** converting markdown to presentation
- **THEN** output PPTX uses layouts from reference.pptx

### Requirement: Post-processor injects formulas into XLSX output

The PostProcessor SHALL replace formula placeholders (`__FORMULA_{t}_{r}_{c}__`) in XLSX cells with actual Excel formulas.

For each FormulaLocation from pre-processing:
- Locate the cell containing the placeholder text
- Replace cell content with the formula (as Excel formula, not text)
- Log each injection as a modification

#### Scenario: Single formula injection

- **WHEN** XLSX contains cell with `__FORMULA_0_1_2__`
- **AND** extractedData.formulas contains `{ tableIndex: 0, row: 1, column: 2, formula: "SUM(B2:B5)" }`
- **THEN** cell value is replaced with formula `=SUM(B2:B5)`
- **AND** modifications includes "Injected formula at Sheet1!C2"

#### Scenario: Multiple formulas across worksheets

- **WHEN** XLSX has multiple tables (worksheets) with placeholders
- **THEN** formulas are injected into correct worksheets based on tableIndex
- **AND** all formulas are replaced

#### Scenario: Placeholder not found

- **WHEN** placeholder `__FORMULA_0_1_2__` is not found in XLSX
- **THEN** a warning is added: "Formula placeholder not found: __FORMULA_0_1_2__"
- **AND** processing continues

#### Scenario: No formulas to inject

- **WHEN** extractedData.formulas is empty
- **THEN** XLSX is unchanged
- **AND** no formula-related modifications are logged

### Requirement: Post-processor adds classification to DOCX headers

The PostProcessor SHALL add classification text to DOCX document headers when `metadata.classification` is set.

The classification text SHALL appear centered in the header of every page.

#### Scenario: Classification added to header

- **WHEN** DOCX is processed with `metadata.classification: "OFFICIAL"`
- **THEN** header contains "OFFICIAL" text
- **AND** modifications includes "Added classification header: OFFICIAL"

#### Scenario: No classification specified

- **WHEN** DOCX is processed with no classification in metadata
- **THEN** headers are unchanged
- **AND** no classification modification is logged

#### Scenario: Existing header preserved

- **WHEN** DOCX already has header content
- **THEN** classification is added without removing existing content

### Requirement: Post-processor adds classification to PPTX footers

The PostProcessor SHALL add classification text to PPTX slide footers when `metadata.classification` is set.

#### Scenario: Classification in slide footers

- **WHEN** PPTX is processed with `metadata.classification: "OFFICIAL"`
- **THEN** each slide footer contains "OFFICIAL"
- **AND** modifications includes "Added classification to slide footers"

#### Scenario: No classification for PPTX

- **WHEN** PPTX is processed with no classification in metadata
- **THEN** slide footers are unchanged

### Requirement: Post-processor patches document properties

The PostProcessor SHALL update OOXML document properties (docProps/core.xml) with metadata fields:

- `dc:title` from metadata.title
- `dc:creator` from metadata.author
- `dc:subject` from metadata.classification
- `cp:keywords` from metadata.keywords (joined by comma)
- `dcterms:modified` to current timestamp

#### Scenario: Properties patched with metadata

- **WHEN** document is processed with title, author, and classification
- **THEN** docProps/core.xml contains updated values
- **AND** modifications includes "Updated document properties"

#### Scenario: Partial metadata

- **WHEN** document is processed with only title (no author)
- **THEN** title is updated
- **AND** missing fields are not added

### Requirement: Post-processor returns detailed result

The PostProcessor SHALL return a PostProcessorResult containing:
- `success`: boolean indicating completion without critical errors
- `outputPath`: path to the processed file
- `modifications`: array of changes made (for logging/debugging)
- `warnings`: array of non-critical issues encountered

#### Scenario: Successful processing with modifications

- **WHEN** post-processing completes with formula injection and header addition
- **THEN** result.success is true
- **AND** result.modifications lists all changes
- **AND** result.warnings is empty or contains only non-critical issues

#### Scenario: Processing with warnings

- **WHEN** post-processing encounters missing placeholder
- **THEN** result.success is true
- **AND** result.warnings contains the issue
- **AND** processing completes

#### Scenario: Critical error

- **WHEN** output file does not exist
- **THEN** PostProcessorError is thrown
- **AND** error message includes file path

### Requirement: Post-processor handles all output formats

The PostProcessor SHALL accept format parameter and dispatch to appropriate handler:
- `docx`: DOCX-specific processing (headers, properties)
- `pptx`: PPTX-specific processing (footers, properties)
- `xlsx`: XLSX-specific processing (formulas, properties)

#### Scenario: Format dispatching

- **WHEN** PostProcessor.process() called with format "docx"
- **THEN** DOCX-specific post-processing is applied

#### Scenario: Unknown format

- **WHEN** PostProcessor.process() called with unsupported format
- **THEN** PostProcessorError is thrown with "Unsupported format" message
