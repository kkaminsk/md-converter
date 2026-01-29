# Tasks: Add Custom Error Classes

## 1. Create Error Module
- [x] 1.1 Create `src/core/errors.ts`
- [x] 1.2 Implement base `ConverterError` class extending Error
- [x] 1.3 Implement `FormulaValidationError` with formula and reason properties
- [x] 1.4 Implement `FrontMatterError` with field and value properties
- [x] 1.5 Implement `ConversionError` with format and source properties
- [x] 1.6 Implement `ValidationError` with rule and location properties
- [x] 1.7 Export all error classes from `src/index.ts`

## 2. Update Formula Parser
- [x] 2.1 Import `FormulaValidationError` in formula-parser.ts
- [x] 2.2 Replace generic errors with `FormulaValidationError`
- [x] 2.3 Include formula string and specific reason in error

## 3. Update Frontmatter Parser
- [x] 3.1 Import `FrontMatterError` in frontmatter-parser.ts
- [x] 3.2 Replace generic errors with `FrontMatterError`
- [x] 3.3 Include field name and invalid value in error

## 4. Update Validators
- [x] 4.1 Import `ValidationError` in document-validator.ts
- [x] 4.2 Replace generic errors with `ValidationError`
- [x] 4.3 Include validation rule and document location in error

## 5. Update Converters
- [x] 5.1 Import `ConversionError` in each converter
- [x] 5.2 Wrap conversion failures with `ConversionError`
- [x] 5.3 Include format and source file information

## 6. Update CLI Error Handling
- [x] 6.1 Import error classes in cli/index.ts
- [x] 6.2 Add instanceof checks for different error types
- [x] 6.3 Provide context-specific error messages and suggestions
- [x] 6.4 Use chalk for error type color coding

## 7. Update MCP Tools
- [x] 7.1 Import error classes in mcp/tools.ts
- [x] 7.2 Return structured error information in tool responses
- [x] 7.3 Include error type and details in response

## 8. Testing
- [x] 8.1 Add unit tests for each error class
- [x] 8.2 Add tests for error handling in parsers
- [x] 8.3 Add tests for CLI error output formatting
