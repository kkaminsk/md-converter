## Requirements

### Requirement: Type-Safe Converter Implementation
All converter modules SHALL be fully type-checked by TypeScript without bypass directives.

#### Scenario: DOCX converter type safety
- **WHEN** `npm run type-check` is executed
- **THEN** `docx-converter.ts` passes type checking without errors
- **AND** no `@ts-nocheck` or `@ts-ignore` directives are present

#### Scenario: PPTX converter type safety
- **WHEN** `npm run type-check` is executed
- **THEN** `pptx-converter.ts` passes type checking without errors
- **AND** no `@ts-nocheck` or `@ts-ignore` directives are present

#### Scenario: XLSX converter type safety (baseline)
- **WHEN** `npm run type-check` is executed
- **THEN** `xlsx-converter.ts` passes type checking without errors
- **AND** this serves as the reference for proper typing patterns

#### Scenario: PDF converter type safety
- **WHEN** `npm run type-check` is executed
- **THEN** `pdf-converter.ts` passes type checking without errors
- **AND** no `@ts-nocheck` or `@ts-ignore` directives are present

### Requirement: Inline Markdown Formatting
Converters SHALL correctly parse and render inline markdown formatting including nested patterns.

#### Scenario: Simple bold formatting
- **WHEN** markdown contains `**bold text**`
- **THEN** output document renders "bold text" in bold

#### Scenario: Simple italic formatting
- **WHEN** markdown contains `*italic text*`
- **THEN** output document renders "italic text" in italic

#### Scenario: Inline code formatting
- **WHEN** markdown contains `` `code text` ``
- **THEN** output document renders "code text" in monospace font

#### Scenario: Nested bold and italic
- **WHEN** markdown contains `**bold with *italic* inside**`
- **THEN** output document renders:
  - "bold with " in bold only
  - "italic" in bold AND italic
  - " inside" in bold only

#### Scenario: Multiple formatting in paragraph
- **WHEN** markdown contains `Normal **bold** and *italic* and **more *nested* bold**`
- **THEN** each segment renders with correct formatting
- **AND** formatting does not bleed into adjacent text

### Requirement: Shared Inline Parser
The project SHALL provide a shared inline parsing utility for consistent formatting across converters.

#### Scenario: Parse inline tokens
- **WHEN** `parseInlineTokens()` is called with markdown text
- **THEN** returns array of segments with formatting properties
- **AND** nested formatting is correctly represented

#### Scenario: Consistent across formats
- **WHEN** same markdown is converted to DOCX and PPTX
- **THEN** inline formatting is identical in both outputs

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

### Requirement: PPTX converter uses Pandoc pipeline

The PPTX converter SHALL use the Pandoc-based conversion pipeline consisting of PreProcessor, PandocExecutor, and PostProcessor.

#### Scenario: Basic conversion through Pandoc

- **WHEN** `convertMarkdownToPptx()` is called with markdown content
- **THEN** PreProcessor.process() is called to extract metadata
- **AND** PandocExecutor.convert() is called with the processed content
- **AND** PostProcessor.process() is called on the output file
- **AND** a valid PPTX file is produced

#### Scenario: File-based conversion delegates to string conversion

- **WHEN** `convertToPptx(inputPath, outputPath)` is called
- **THEN** the file is read and `convertMarkdownToPptx()` is called
- **AND** the result has the same shape as before migration

### Requirement: PPTX converter preserves API compatibility

The PPTX converter SHALL maintain backward-compatible function signatures and result shapes.

#### Scenario: convertToPptx signature unchanged

- **WHEN** calling `convertToPptx(inputPath: string, outputPath?: string, options?: PptxConversionOptions)`
- **THEN** the call succeeds with the same parameter handling as before
- **AND** outputPath defaults to inputPath with .pptx extension if not provided

#### Scenario: convertMarkdownToPptx signature unchanged

- **WHEN** calling `convertMarkdownToPptx(markdown: string, outputPath: string, options?: PptxConversionOptions)`
- **THEN** the call succeeds with the same parameter handling as before

#### Scenario: PptxConversionResult shape unchanged

- **WHEN** conversion completes successfully
- **THEN** result contains `{ success: true, outputPath: string, slideCount: number, warnings: string[] }`
- **AND** existing code consuming this result continues to work

### Requirement: PPTX converter applies slide breaks via Lua filter

The PPTX converter SHALL pass `slide_breaks` metadata to Pandoc for processing by the slide-breaks.lua filter.

#### Scenario: H2 slide breaks (default)

- **WHEN** markdown has `slide_breaks: h2` or no slide_breaks specified
- **THEN** H1 headings create title/section slides
- **AND** H2 headings create content slides
- **AND** Pandoc is invoked with slide-level=2

#### Scenario: H1 slide breaks

- **WHEN** markdown has `slide_breaks: h1`
- **THEN** only H1 headings create new slides
- **AND** H2+ headings become bold text on the current slide
- **AND** the slide-breaks.lua filter demotes H2+ headers

#### Scenario: HR slide breaks

- **WHEN** markdown has `slide_breaks: hr`
- **THEN** horizontal rules (`---`) create new slides
- **AND** H1/H2 also create slides (same as h2 mode)
- **AND** the slide-breaks.lua filter converts HRs to slide boundaries

### Requirement: PPTX converter applies classification footers

The PPTX converter SHALL use PostProcessor to add classification footers when metadata.classification is set.

#### Scenario: Classification footer added

- **WHEN** markdown has `classification: "OFFICIAL"` in front matter
- **THEN** the output PPTX has "OFFICIAL" in the footer of each slide
- **AND** the footer appears on all slides

#### Scenario: No classification specified

- **WHEN** markdown has no classification in front matter
- **THEN** no classification footer is added to the slides

### Requirement: PPTX converter sets document properties

The PPTX converter SHALL use PostProcessor to set document properties from metadata.

#### Scenario: Full metadata applied

- **WHEN** markdown has title, author, and keywords in front matter
- **THEN** docProps/core.xml contains the corresponding values
- **AND** the document appears with correct properties in PowerPoint

#### Scenario: Partial metadata applied

- **WHEN** markdown has only title in front matter
- **THEN** only title is set in document properties
- **AND** missing fields are not added

### Requirement: PPTX converter handles Pandoc errors gracefully

The PPTX converter SHALL wrap Pandoc errors in ConversionError for consistent error handling.

#### Scenario: Pandoc not installed

- **WHEN** Pandoc is not installed on the system
- **THEN** ConversionError is thrown with message indicating Pandoc is required

#### Scenario: Pandoc conversion fails

- **WHEN** Pandoc returns a non-zero exit code
- **THEN** ConversionError is thrown with the stderr message
- **AND** any partial output is cleaned up

### Requirement: PPTX converter collects warnings from pipeline

The PPTX converter SHALL collect and return warnings from all pipeline stages.

#### Scenario: Warnings from PreProcessor

- **WHEN** PreProcessor generates warnings (e.g., missing recommended fields)
- **THEN** those warnings appear in the result.warnings array

#### Scenario: Warnings from PostProcessor

- **WHEN** PostProcessor generates warnings (e.g., could not add footer)
- **THEN** those warnings appear in the result.warnings array

#### Scenario: Combined warnings

- **WHEN** both PreProcessor and PostProcessor generate warnings
- **THEN** all warnings are combined in the result.warnings array

### Requirement: PPTX converter reports slide count

The PPTX converter SHALL count slides in the output and return the count in the result.

#### Scenario: Slide count from single H1

- **WHEN** markdown has one H1 heading with content
- **THEN** slideCount reflects the number of slides in the output

#### Scenario: Slide count from multiple sections

- **WHEN** markdown has multiple H1 and H2 headings
- **THEN** slideCount reflects the total number of slides generated

#### Scenario: Slide count read from OOXML

- **WHEN** conversion completes
- **THEN** slideCount is determined by counting slide files in the PPTX archive
- **AND** the count matches the actual slides in the presentation

### Requirement: XLSX converter provides string-based conversion function

The XLSX converter SHALL provide a `convertMarkdownToXlsx` function that converts markdown content directly to Excel.

#### Scenario: String-based conversion

- **WHEN** `convertMarkdownToXlsx(markdown, outputPath, options)` is called
- **THEN** the markdown is parsed for tables
- **AND** an Excel workbook is generated at outputPath
- **AND** result contains worksheetNames, tableCount, formulaCount, warnings

#### Scenario: File-based conversion delegates to string conversion

- **WHEN** `convertToXlsx(inputPath, outputPath, options)` is called
- **THEN** the file is read and `convertMarkdownToXlsx()` is called
- **AND** the result has the same shape as string-based conversion

### Requirement: XLSX converter uses PreProcessor for metadata

The XLSX converter SHALL use PreProcessor for document metadata extraction and normalization.

#### Scenario: Metadata applied to workbook

- **WHEN** markdown has title, author, keywords in front matter
- **THEN** workbook.title, workbook.creator, workbook.keywords are set
- **AND** these appear in Excel document properties

#### Scenario: Date format from metadata

- **WHEN** markdown has `date_format: MM/DD/YYYY` in front matter
- **THEN** date cells use mm/dd/yyyy Excel format
- **AND** PreProcessor extracts this metadata

### Requirement: XLSX converter handles errors gracefully

The XLSX converter SHALL handle errors from Pandoc components and wrap them in ConversionError.

#### Scenario: PreProcessor error

- **WHEN** PreProcessor encounters an error
- **THEN** ConversionError is thrown with descriptive message

#### Scenario: No tables found

- **WHEN** markdown contains no tables
- **THEN** ConversionError is thrown indicating no tables found

### Requirement: XLSX converter collects warnings from pipeline

The XLSX converter SHALL collect and return warnings from PreProcessor and table processing.

#### Scenario: Warnings from PreProcessor

- **WHEN** PreProcessor generates warnings (e.g., missing recommended fields)
- **THEN** those warnings appear in the result.warnings array

#### Scenario: Warnings from formula validation

- **WHEN** formula validation generates warnings
- **THEN** those warnings appear in the result.warnings array

#### Scenario: Combined warnings

- **WHEN** both PreProcessor and formula validation generate warnings
- **THEN** all warnings are combined in the result.warnings array
