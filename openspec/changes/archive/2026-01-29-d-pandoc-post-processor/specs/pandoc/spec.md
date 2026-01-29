## ADDED Requirements

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
