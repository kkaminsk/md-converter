## ADDED Requirements

### Requirement: Custom Error Classes
The project SHALL provide specific error classes for different failure types.

#### Scenario: Formula validation error
- **WHEN** an invalid Excel formula is encountered
- **THEN** `FormulaValidationError` is thrown
- **AND** error includes the formula string
- **AND** error includes specific reason for failure

#### Scenario: Front matter error
- **WHEN** YAML front matter is invalid or missing required fields
- **THEN** `FrontMatterError` is thrown
- **AND** error includes the field name
- **AND** error includes the invalid value (if applicable)

#### Scenario: Conversion error
- **WHEN** document conversion fails
- **THEN** `ConversionError` is thrown
- **AND** error includes the target format
- **AND** error includes the source file path

#### Scenario: Validation error
- **WHEN** document structure validation fails
- **THEN** `ValidationError` is thrown
- **AND** error includes the validation rule that failed
- **AND** error includes the location in document

### Requirement: CLI Error Formatting
The CLI SHALL display context-appropriate error messages based on error type.

#### Scenario: Formula error in CLI
- **WHEN** conversion fails due to formula error
- **THEN** CLI displays the invalid formula
- **AND** CLI suggests how to fix the formula
- **AND** exit code is non-zero

#### Scenario: Missing required field in CLI
- **WHEN** conversion fails due to missing front matter field
- **THEN** CLI displays which field is missing
- **AND** CLI shows example of correct format
- **AND** exit code is non-zero

### Requirement: MCP Error Responses
MCP tools SHALL return structured error information.

#### Scenario: Error in MCP tool
- **WHEN** an MCP tool encounters an error
- **THEN** response includes error type
- **AND** response includes error message
- **AND** response includes relevant context (formula, field, etc.)
