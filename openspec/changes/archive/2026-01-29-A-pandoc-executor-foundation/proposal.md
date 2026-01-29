# Change: A - Pandoc Executor Foundation

## Why
The current MD Converter uses three separate libraries (docx, exceljs, pptxgenjs) with different APIs, maintenance cycles, and ESM/CJS compatibility issues. Pandoc provides a unified, battle-tested conversion engine that handles 60+ output formats through a single interface.

This foundational change creates the core infrastructure for spawning and managing Pandoc processes, enabling all subsequent converter migrations.

## What Changes

### New Components
- Create `src/core/pandoc/executor.ts` - Core Pandoc process wrapper
- Create `src/core/pandoc/types.ts` - TypeScript interfaces for Pandoc integration
- Create `src/core/pandoc/errors.ts` - Pandoc-specific error classes
- Create `src/core/pandoc/index.ts` - Module exports

### PandocExecutor Capabilities
1. **Installation Detection**
   - Check if Pandoc is installed via `pandoc --version`
   - Validate minimum version (3.0+)
   - Return installation path and version info

2. **Process Management**
   - Spawn Pandoc via `child_process.spawn`
   - Support stdin piping for content input
   - Capture stdout/stderr streams
   - Implement configurable timeout (default: 30s)
   - Clean temp files on completion or error

3. **Command Building**
   - Build argument arrays from typed options
   - Support all major Pandoc flags (--from, --to, --standalone, etc.)
   - Handle Lua filters, reference docs, metadata, variables

4. **AST Operations**
   - `toAST()` - Convert markdown to Pandoc JSON AST
   - `fromAST()` - Convert JSON AST to output format

### Error Classes
- `PandocNotFoundError` - Pandoc not installed
- `PandocVersionError` - Version too old
- `PandocConversionError` - Conversion failed
- `PandocTimeoutError` - Process timed out

### Environment Variables
- `PANDOC_PATH` - Custom binary location
- `PANDOC_TIMEOUT` - Conversion timeout (ms)

## Impact
- **Affected specs**: New `pandoc` capability
- **Affected code**:
  - `src/core/pandoc/executor.ts` (new)
  - `src/core/pandoc/types.ts` (new)
  - `src/core/pandoc/errors.ts` (new)
  - `src/core/pandoc/index.ts` (new)
- **Dependencies**: None (foundation change)
- **External dependency**: Pandoc 3.0+ must be installed on system

## Acceptance Criteria
1. `PandocExecutor.checkInstallation()` correctly detects Pandoc presence and version
2. `PandocExecutor.convert()` successfully converts simple markdown to DOCX
3. `PandocExecutor.toAST()` returns valid Pandoc JSON AST
4. Proper error handling for missing Pandoc, timeouts, and conversion failures
5. All new code has TypeScript types and JSDoc documentation
6. Unit tests cover executor functionality

## Priority
**1 of 7** - Foundation for all Pandoc integration work. Must be completed first.
