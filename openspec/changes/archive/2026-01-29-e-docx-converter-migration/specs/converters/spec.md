## ADDED Requirements

### Requirement: DOCX converter uses Pandoc pipeline

The DOCX converter SHALL use the Pandoc-based conversion pipeline consisting of PreProcessor, PandocExecutor, and PostProcessor.

#### Scenario: Basic conversion through Pandoc

- **WHEN** `convertMarkdownToDocx()` is called with markdown content
- **THEN** PreProcessor.process() is called to extract metadata
- **AND** PandocExecutor.convert() is called with the processed content
- **AND** PostProcessor.process() is called on the output file
- **AND** a valid DOCX file is produced

#### Scenario: File-based conversion delegates to string conversion

- **WHEN** `convertToDocx(inputPath, outputPath)` is called
- **THEN** the file is read and `convertMarkdownToDocx()` is called
- **AND** the result has the same shape as before migration

### Requirement: DOCX converter preserves API compatibility

The DOCX converter SHALL maintain backward-compatible function signatures and result shapes.

#### Scenario: convertToDocx signature unchanged

- **WHEN** calling `convertToDocx(inputPath: string, outputPath?: string, options?: DocxConversionOptions)`
- **THEN** the call succeeds with the same parameter handling as before
- **AND** outputPath defaults to inputPath with .docx extension if not provided

#### Scenario: convertMarkdownToDocx signature unchanged

- **WHEN** calling `convertMarkdownToDocx(markdown: string, outputPath: string, options?: DocxConversionOptions)`
- **THEN** the call succeeds with the same parameter handling as before

#### Scenario: DocxConversionResult shape unchanged

- **WHEN** conversion completes successfully
- **THEN** result contains `{ success: true, outputPath: string, warnings: string[] }`
- **AND** existing code consuming this result continues to work

### Requirement: DOCX converter applies section breaks via Lua filter

The DOCX converter SHALL pass `section_breaks` metadata to Pandoc for processing by the section-breaks.lua filter.

#### Scenario: Auto section breaks (default)

- **WHEN** markdown has `section_breaks: auto` or no section_breaks specified
- **THEN** page breaks are inserted before H2 headings only
- **AND** horizontal rules render as visual dividers

#### Scenario: All section breaks

- **WHEN** markdown has `section_breaks: all`
- **THEN** page breaks are inserted before H2 and H3 headings
- **AND** horizontal rules become page breaks

#### Scenario: No section breaks

- **WHEN** markdown has `section_breaks: none`
- **THEN** no automatic page breaks are inserted
- **AND** horizontal rules render as visual dividers

### Requirement: DOCX converter applies classification headers

The DOCX converter SHALL use PostProcessor to add classification headers when metadata.classification is set.

#### Scenario: Classification header added

- **WHEN** markdown has `classification: "OFFICIAL"` in front matter
- **THEN** the output DOCX has "OFFICIAL" in the document header
- **AND** the header appears on every page

#### Scenario: No classification specified

- **WHEN** markdown has no classification in front matter
- **THEN** no classification header is added to the output

### Requirement: DOCX converter sets document properties

The DOCX converter SHALL use PostProcessor to set document properties from metadata.

#### Scenario: Full metadata applied

- **WHEN** markdown has title, author, and keywords in front matter
- **THEN** docProps/core.xml contains the corresponding values
- **AND** the document appears with correct properties in Word

#### Scenario: Partial metadata applied

- **WHEN** markdown has only title in front matter
- **THEN** only title is set in document properties
- **AND** missing fields are not added

### Requirement: DOCX converter handles Pandoc errors gracefully

The DOCX converter SHALL wrap Pandoc errors in ConversionError for consistent error handling.

#### Scenario: Pandoc not installed

- **WHEN** Pandoc is not installed on the system
- **THEN** ConversionError is thrown with message indicating Pandoc is required

#### Scenario: Pandoc conversion fails

- **WHEN** Pandoc returns a non-zero exit code
- **THEN** ConversionError is thrown with the stderr message
- **AND** any partial output is cleaned up

### Requirement: DOCX converter collects warnings from pipeline

The DOCX converter SHALL collect and return warnings from all pipeline stages.

#### Scenario: Warnings from PreProcessor

- **WHEN** PreProcessor generates warnings (e.g., missing recommended fields)
- **THEN** those warnings appear in the result.warnings array

#### Scenario: Warnings from PostProcessor

- **WHEN** PostProcessor generates warnings (e.g., missing header file)
- **THEN** those warnings appear in the result.warnings array

#### Scenario: Combined warnings

- **WHEN** both PreProcessor and PostProcessor generate warnings
- **THEN** all warnings are combined in the result.warnings array
