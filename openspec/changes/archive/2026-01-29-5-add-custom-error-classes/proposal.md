# Change: Add Custom Error Classes

## Why
The project uses generic `Error` objects throughout, making it difficult to:
- Distinguish between error types programmatically
- Provide context-specific error messages
- Handle different errors differently in the CLI and MCP interfaces

## What Changes
- Create `src/core/errors.ts` with custom error classes
- Implement specific error types:
  - `FormulaValidationError` - Invalid Excel formula syntax
  - `FrontMatterError` - YAML parsing or validation failures
  - `ConversionError` - Document conversion failures
  - `ValidationError` - Document structure validation failures
- Update CLI to provide better error messages based on error type
- Update MCP tools to return structured error information

## Impact
- Affected specs: New `error-handling` capability
- Affected code:
  - `src/core/errors.ts` (new)
  - `src/core/parsers/formula-parser.ts`
  - `src/core/parsers/frontmatter-parser.ts`
  - `src/core/validators/document-validator.ts`
  - `src/cli/index.ts`
  - `src/mcp/tools.ts`
- Dependencies: Proposals 1-4

## Priority
**5 of 6** - Enhancement that improves developer and user experience.
