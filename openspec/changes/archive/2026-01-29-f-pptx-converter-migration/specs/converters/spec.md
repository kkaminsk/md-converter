## ADDED Requirements

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
