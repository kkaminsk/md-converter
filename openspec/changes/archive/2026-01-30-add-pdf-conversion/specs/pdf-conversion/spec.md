## ADDED Requirements

### Requirement: PDF converter uses Pandoc pipeline

The PDF converter SHALL use the Pandoc-based conversion pipeline consisting of PreProcessor and PandocExecutor (no PostProcessor needed for PDF).

#### Scenario: Basic conversion through Pandoc

- **WHEN** `convertMarkdownToPdf()` is called with markdown content
- **THEN** PreProcessor.process() is called to extract metadata
- **AND** PandocExecutor.convert() is called with outputFormat 'pdf'
- **AND** a valid PDF file is produced

#### Scenario: File-based conversion delegates to string conversion

- **WHEN** `convertToPdf(inputPath, outputPath)` is called
- **THEN** the file is read and `convertMarkdownToPdf()` is called
- **AND** the result has the same shape as other converters

### Requirement: PDF converter API compatibility

The PDF converter SHALL provide function signatures consistent with other converters.

#### Scenario: convertToPdf signature

- **WHEN** calling `convertToPdf(inputPath: string, outputPath?: string, options?: PdfConversionOptions)`
- **THEN** the call succeeds
- **AND** outputPath defaults to inputPath with .pdf extension if not provided

#### Scenario: convertMarkdownToPdf signature

- **WHEN** calling `convertMarkdownToPdf(markdown: string, outputPath: string, options?: PdfConversionOptions)`
- **THEN** the call succeeds with the provided parameters

#### Scenario: PdfConversionResult shape

- **WHEN** conversion completes successfully
- **THEN** result contains `{ success: true, outputPath: string, warnings: string[] }`

### Requirement: PDF engine discovery

The PDF converter SHALL automatically discover available PDF engines.

#### Scenario: wkhtmltopdf in PATH

- **WHEN** wkhtmltopdf is available in system PATH
- **THEN** the converter uses wkhtmltopdf as the PDF engine

#### Scenario: wkhtmltopdf in common Windows location

- **WHEN** wkhtmltopdf is not in PATH
- **AND** wkhtmltopdf is installed at `C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe`
- **THEN** the converter discovers and uses that installation

#### Scenario: Custom engine path via environment variable

- **WHEN** `WKHTMLTOPDF_PATH` environment variable is set
- **THEN** the converter uses the specified path

#### Scenario: Fallback to LaTeX engines

- **WHEN** wkhtmltopdf is not available
- **AND** pdflatex, xelatex, or lualatex is available
- **THEN** the converter uses the available LaTeX engine

#### Scenario: No PDF engine available

- **WHEN** no PDF engine is found
- **THEN** ConversionError is thrown with message indicating PDF engine is required
- **AND** the error message includes installation instructions

### Requirement: PDF page layout options

The PDF converter SHALL support page layout configuration.

#### Scenario: Default page size

- **WHEN** no pageSize option is specified
- **THEN** the converter uses A4 page size

#### Scenario: Letter page size

- **WHEN** `options.pageSize` is 'letter'
- **THEN** the PDF is generated with US Letter dimensions

#### Scenario: Custom margins

- **WHEN** `options.margins` is provided with top, right, bottom, left values
- **THEN** the PDF uses the specified margins

#### Scenario: Landscape orientation

- **WHEN** `options.orientation` is 'landscape'
- **THEN** the PDF is generated in landscape mode

### Requirement: PDF classification header/footer

The PDF converter SHALL include classification markings when specified in metadata.

#### Scenario: Classification in header

- **WHEN** markdown has `classification: "OFFICIAL"` in front matter
- **THEN** the PDF has "OFFICIAL" displayed in the header of each page

#### Scenario: Classification in footer

- **WHEN** markdown has `classification: "OFFICIAL"` in front matter
- **THEN** the PDF has "OFFICIAL" displayed in the footer of each page

#### Scenario: No classification specified

- **WHEN** markdown has no classification in front matter
- **THEN** no classification markings are added to the PDF

### Requirement: PDF document properties

The PDF converter SHALL set document properties from metadata.

#### Scenario: Title from metadata

- **WHEN** markdown has `title: "Document Title"` in front matter
- **THEN** the PDF title property is set to "Document Title"

#### Scenario: Author from metadata

- **WHEN** markdown has `author: "John Doe"` in front matter
- **THEN** the PDF author property is set to "John Doe"

### Requirement: PDF error handling

The PDF converter SHALL handle errors gracefully with clear messages.

#### Scenario: Pandoc not installed

- **WHEN** Pandoc is not installed on the system
- **THEN** ConversionError is thrown with message indicating Pandoc is required

#### Scenario: PDF engine conversion fails

- **WHEN** the PDF engine returns an error
- **THEN** ConversionError is thrown with the error message from the engine

#### Scenario: Invalid markdown content

- **WHEN** markdown content cannot be parsed
- **THEN** ConversionError is thrown with descriptive message

### Requirement: CLI PDF format support

The CLI SHALL accept 'pdf' as a valid format option.

#### Scenario: Single file PDF conversion

- **WHEN** user runs `md-convert document.md --format pdf`
- **THEN** a PDF file is generated at document.pdf

#### Scenario: PDF in format choices

- **WHEN** user runs `md-convert --help`
- **THEN** 'pdf' is listed as a valid format option

#### Scenario: Batch conversion includes PDF

- **WHEN** user runs `md-convert "**/*.md" --format all`
- **THEN** PDF files are generated alongside DOCX, XLSX, and PPTX

### Requirement: Front matter PDF format

The `format` field in YAML front matter SHALL accept 'pdf' as a valid value.

#### Scenario: format pdf in front matter

- **WHEN** markdown has `format: pdf` in front matter
- **THEN** the file is converted to PDF format

#### Scenario: format all includes PDF

- **WHEN** markdown has `format: all` in front matter
- **THEN** the file is converted to all formats including PDF

### Requirement: MCP tool for PDF conversion

The MCP server SHALL expose a tool for PDF conversion.

#### Scenario: convert_md_to_pdf tool exists

- **WHEN** MCP client requests available tools
- **THEN** `convert_md_to_pdf` is listed as an available tool

#### Scenario: convert_md_to_pdf execution

- **WHEN** MCP client calls `convert_md_to_pdf` with markdown content and output path
- **THEN** a PDF file is generated at the specified path
- **AND** the tool returns success status with output path

#### Scenario: convert_md_to_pdf with options

- **WHEN** MCP client calls `convert_md_to_pdf` with pageSize and margins options
- **THEN** the PDF is generated with the specified layout options
