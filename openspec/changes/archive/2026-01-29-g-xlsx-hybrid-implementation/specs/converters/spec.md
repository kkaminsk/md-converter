## ADDED Requirements

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

### Requirement: XLSX converter handles Pandoc errors gracefully

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
