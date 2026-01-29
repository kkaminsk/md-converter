## ADDED Requirements

### Requirement: Configurable Date Format
The system SHALL support configurable date format detection in tables via front matter metadata.

#### Scenario: Default date format (Australian)
- **WHEN** no `date_format` is specified in front matter
- **THEN** dates are parsed as DD/MM/YYYY
- **AND** "25/12/2025" is recognized as December 25, 2025

#### Scenario: US date format
- **WHEN** `date_format: MM/DD/YYYY` is specified in front matter
- **THEN** dates are parsed as MM/DD/YYYY
- **AND** "12/25/2025" is recognized as December 25, 2025

#### Scenario: ISO date format
- **WHEN** `date_format: YYYY-MM-DD` is specified in front matter
- **THEN** dates are parsed as YYYY-MM-DD
- **AND** "2025-12-25" is recognized as December 25, 2025

#### Scenario: Invalid date format value
- **WHEN** `date_format` contains an unsupported value
- **THEN** validation error is reported
- **AND** error message lists valid options

## MODIFIED Requirements

### Requirement: Date Detection in Tables
The table parser SHALL detect date values according to the configured date format.

#### Scenario: Date cell detection
- **WHEN** a table cell contains a date string matching the configured format
- **THEN** cell is typed as `date`
- **AND** value is parsed into a Date object

#### Scenario: Ambiguous date handling
- **WHEN** a date string like "01/02/2025" is parsed
- **THEN** interpretation follows the configured format
- **AND** DD/MM/YYYY interprets as February 1
- **AND** MM/DD/YYYY interprets as January 2

### Requirement: Excel Date Formatting
The XLSX converter SHALL apply appropriate Excel date formatting based on configured format.

#### Scenario: Date display in Excel
- **WHEN** a date cell is converted to Excel
- **THEN** Excel displays the date in the configured format
- **AND** date calculations work correctly
