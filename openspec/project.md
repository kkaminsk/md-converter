# Project Context

## Purpose
MD Converter is a TypeScript tool that converts Markdown files to Microsoft Office formats (DOCX, XLSX, PPTX). It enables document automation workflows by:
- Converting Markdown with YAML front matter metadata to Word, Excel, and PowerPoint
- Supporting Excel formulas in Markdown tables using `{=FORMULA}` syntax
- Providing both a CLI for direct usage and an MCP (Model Context Protocol) server for AI assistant integration
- Batch processing multiple Markdown files with smart exclusion rules

## Tech Stack
- **Language:** TypeScript 5.3+ (ES Modules, strict mode)
- **Runtime:** Node.js 18+
- **Build:** tsc (TypeScript compiler) targeting ES2022
- **Module System:** NodeNext (ES Modules with .js extensions)
- **Core Dependencies:**
  - `docx` (8.5+) - Word document generation
  - `exceljs` (4.4+) - Excel workbook generation with formula support
  - `pptxgenjs` (3.12+) - PowerPoint presentation generation
  - `markdown-it` (14+) - Markdown AST parsing
  - `js-yaml` (4.1+) - YAML front matter parsing
  - `@modelcontextprotocol/sdk` (1.0+) - MCP server integration
  - `commander` (12+) - CLI framework
  - `chalk` (5.3+) - Terminal styling
  - `glob` (10.3+) - File pattern matching

## Project Conventions

### Code Style
- TypeScript strict mode enabled with additional checks:
  - `noUnusedLocals`, `noUnusedParameters`
  - `noImplicitReturns`, `noFallthroughCasesInSwitch`
- ES Modules with explicit `.js` extensions in imports
- Source maps and declaration files generated for debugging
- File naming: kebab-case for files (e.g., `docx-converter.ts`, `frontmatter-parser.ts`)
- Interface naming: PascalCase with descriptive names (e.g., `DocumentMetadata`)

### Architecture Patterns
- **Layered Architecture:**
  - `cli/` - Command-line interface entry point
  - `core/converters/` - Format-specific conversion logic
  - `core/parsers/` - Input parsing (Markdown, YAML, tables, formulas)
  - `core/validators/` - Document structure validation
  - `mcp/` - MCP server and tool definitions
- **Single Responsibility:** Each converter handles one output format
- **Parser Pipeline:** Front matter → Markdown AST → Format-specific conversion
- **Metadata-Driven:** YAML front matter controls conversion behavior

### Testing Strategy
- Jest with ES modules support (`--experimental-vm-modules`)
- Test files excluded from TypeScript compilation
- Run tests with: `npm test`

### Git Workflow
- Main branch: `main`
- Conventional commit messages (e.g., `docs:`, `feat:`, `fix:`)
- Recent commits show documentation-focused development

## Domain Context
- **YAML Front Matter:** Metadata block at the start of Markdown files that controls conversion settings (format, title, author, date, classification, etc.)
- **Excel Formula Syntax:** `{=FORMULA}` notation in Markdown tables that gets converted to actual Excel formulas (e.g., `{=SUM(B2:B10)}`)
- **Section Breaks:** DOCX-specific feature controlling how documents are divided (auto/all/none)
- **Slide Breaks:** PPTX-specific feature controlling how slides are created from headings (h1/h2/hr)
- **Document Types:** Classification system (document, email, reference, note, system) affecting batch processing

## Important Constraints
- Node.js 18+ required for ES module support
- Files must have valid YAML front matter for metadata-driven features
- Excel formulas must use proper Excel syntax within `{=...}` delimiters
- Batch processing automatically excludes:
  - `README.md` files
  - Files in `/notes/`, `/reference/`, or `/references/` directories
  - Files with `convert: false` or non-document `document_type`

## External Dependencies
- No external APIs or services required
- All processing is local/offline
- MCP server communicates via STDIO for AI assistant integration
- Output files written to local filesystem

## Current Status (as of 2026-01-28)

**Version:** 2.1.0
**Health Score:** 7.4/10

### Strengths
- Well-architected with clear separation of concerns
- Modern TypeScript (ES2022, strict mode, ESM)
- Dependencies are current (no outdated packages)
- Excellent documentation (CLAUDE.md, FRONTMATTER.md)
- Metadata-driven conversion pipeline

### Known Issues
- **Zero test coverage** - No Jest tests despite test script in package.json
- **Type safety bypassed** - `@ts-nocheck` in docx-converter.ts and pptx-converter.ts
- **No linting** - ESLint/Prettier not configured
- **Simple regex parsing** - Inline markdown uses regex instead of token-based parsing
- **Generic errors** - No custom error classes for specific failure types
- **Hardcoded date format** - Only DD/MM/YYYY supported

### Pending Feature Work (v2.2.0)
- Image support in all formats
- Table of Contents generation
