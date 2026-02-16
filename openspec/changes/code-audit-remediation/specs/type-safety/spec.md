## MODIFIED Requirements

### Requirement: Typed MCP handler arguments (H3)
The MCP server SHALL validate and type-check all tool arguments before processing, rejecting malformed requests with descriptive error messages.

#### Problem
All MCP tool handlers in `src/mcp/server.ts` accept `args: any` and destructure without validation. Missing required fields cause unhandled exceptions. File paths are not validated for existence or traversal attacks.

#### Fix
Create `src/mcp/types.ts` with interfaces for each tool's arguments. Add validation at the top of each handler.

**File:** `src/mcp/types.ts` (new)
```typescript
export interface ConvertToDocxArgs {
  file_path: string;
  output_path?: string;
  options?: { fontSize?: number; fontFamily?: string };
}
// ... similar for each tool
```

**File:** `src/mcp/server.ts` — validate before use:
```typescript
async function handleConvertToDocx(args: unknown) {
  const validated = validateConvertArgs(args, 'docx');
  // use validated.file_path, etc.
}
```

#### Scenario: Missing required field returns structured error
- **GIVEN** an MCP client sends a `convert_md_to_docx` request without `file_path`
- **WHEN** the server processes the request
- **THEN** the response SHALL contain `isError: true` with message "Required field missing: file_path"

#### Scenario: Non-existent file returns descriptive error
- **GIVEN** an MCP client sends `file_path: "/nonexistent/file.md"`
- **WHEN** the server processes the request
- **THEN** the response SHALL contain `isError: true` with message indicating the file does not exist

---

### Requirement: Typed CLI options (M2)
The CLI SHALL use a typed interface for parsed command-line options to prevent runtime type errors.

#### Problem
`handleConvert`, `getOutputPath`, and `convertFile` in `src/cli/index.ts` accept `options: any`. `parseInt(options.fontSize, 10)` can produce `NaN` silently.

#### Fix
Define `CliOptions` interface and validate numeric options.

#### Scenario: Invalid fontSize falls back to default
- **GIVEN** a user runs `md-convert file.md --font-size "abc"`
- **WHEN** the CLI parses options
- **THEN** fontSize SHALL default to 12 instead of becoming NaN
