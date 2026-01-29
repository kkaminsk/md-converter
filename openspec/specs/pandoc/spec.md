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
