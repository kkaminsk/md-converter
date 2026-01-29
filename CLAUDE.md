# CLAUDE.md

This file provides guidance for AI assistants working with this codebase.

## Project Overview

MD Converter is a TypeScript tool that converts Markdown files to Microsoft Office formats (DOCX, XLSX, PPTX). It supports YAML front matter for metadata, Excel formulas in tables, and provides both CLI and MCP (Model Context Protocol) server interfaces.

## Tech Stack

- **Language:** TypeScript (ES Modules)
- **Runtime:** Node.js 18+
- **Build:** tsc (TypeScript compiler)
- **Key Dependencies:**
  - `docx` - Word document generation
  - `exceljs` - Excel workbook generation
  - `pptxgenjs` - PowerPoint presentation generation
  - `markdown-it` - Markdown parsing
  - `js-yaml` - YAML front matter parsing
  - `@modelcontextprotocol/sdk` - MCP server integration
  - `commander` - CLI framework
  - `chalk` - Terminal styling

## Project Structure

```
src/
├── index.ts                    # Main exports
├── cli/
│   └── index.ts               # CLI entry point (md-convert command)
├── core/
│   ├── converters/
│   │   ├── docx-converter.ts  # Markdown → Word
│   │   ├── xlsx-converter.ts  # Markdown tables → Excel (with formulas)
│   │   ├── pptx-converter.ts  # Markdown → PowerPoint
│   │   └── section-rules.ts   # Section/slide break logic
│   ├── parsers/
│   │   ├── markdown.ts        # Markdown AST parsing
│   │   ├── frontmatter-parser.ts  # YAML metadata extraction
│   │   ├── table-parser.ts    # Table processing
│   │   └── formula-parser.ts  # Excel formula validation
│   └── validators/
│       └── document-validator.ts  # Document structure validation
└── mcp/
    ├── server.ts              # MCP server (STDIO mode)
    └── tools.ts               # MCP tool definitions
```

## Commands

```bash
# Install dependencies
npm install

# Build TypeScript to dist/
npm run build

# Run CLI in dev mode (uses tsx)
npm run dev -- <input.md> --format docx

# Start MCP server in dev mode
npm run serve

# Type check without building
npm run type-check

# Lint code
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues

# Format code
npm run format        # Format all files
npm run format:check  # Check formatting
```

## CLI Usage

```bash
# Convert single file
md-convert document.md --format docx

# Batch convert with glob
md-convert "**/*.md" --format all

# Validation modes
md-convert document.md --format docx --strict    # Fail on warnings
md-convert document.md --format docx --no-validate  # Skip validation

# Preview/validate commands
md-convert preview document.md    # Show table extraction
md-convert validate document.md   # Validate formulas
md-convert serve                  # Start MCP server
```

## Key Concepts

### YAML Front Matter

Documents can include metadata that controls conversion:

```yaml
---
format: docx                    # Required: docx, xlsx, pptx, or all
title: "Document Title"         # Required
author: "Name"                  # Recommended
date: "2025-01-28"             # YYYY-MM-DD format
classification: "OFFICIAL"
version: "1.0"
status: final                   # draft|review|approved|final
section_breaks: auto            # auto|all|none (DOCX only)
slide_breaks: h2                # h1|h2|hr (PPTX only)
date_format: DD/MM/YYYY         # DD/MM/YYYY|MM/DD/YYYY|YYYY-MM-DD (XLSX tables)
convert: false                  # Skip this file in batch conversion
document_type: reference        # document|email|reference|note|system
---
```

### Excel Formulas

Use `{=FORMULA}` syntax in Markdown tables for Excel formulas:

```markdown
| Item | Amount | Tax | Total |
|------|--------|-----|-------|
| Widget | 100 | {=B2*0.1} | {=B2+C2} |
| **Total** | {=SUM(B2:B2)} | {=SUM(C2:C2)} | {=SUM(D2:D2)} |
```

### Exclusion Rules

Files are automatically excluded from batch conversion:
- `README.md` (any location)
- Files in `/notes/` directory
- Files in `/reference/` or `/references/` directory
- Files with `convert: false` in front matter
- Files with `document_type: email|reference|note|system`

### Section Breaks (DOCX)

- `auto` (recommended): Section break only before `## H2` headings
- `all`: Every `---` becomes a section break
- `none`: Visual dividers only, no section breaks

## MCP Tools

The MCP server exposes 5 tools:
1. `convert_md_to_docx` - Markdown to Word
2. `convert_md_to_xlsx` - Markdown tables to Excel with formulas
3. `convert_md_to_pptx` - Markdown to PowerPoint
4. `preview_tables` - Preview table extraction
5. `validate_formulas` - Validate formula syntax

## Architecture Notes

- **Converters** read markdown content, parse it, and write Office files
- **Parsers** handle markdown AST, front matter, tables, and formulas
- **Validators** check document structure and metadata completeness
- Front matter is parsed first; metadata drives conversion behavior
- Each markdown table becomes a separate Excel worksheet
- Word documents use built-in styles (Normal, Heading 1-6, ListParagraph, Strong, Emphasis)

## Testing

Tests use Jest with ES modules support:

```bash
npm test
```

## Common Patterns

When modifying converters:
- Check `parseFrontMatter()` for metadata extraction
- Check `shouldConvertDocument()` for exclusion logic
- Check `getFormats()` for format detection from metadata
- Section/slide break logic is in `section-rules.ts`

When adding new YAML fields:
1. Add to `DocumentMetadata` interface in `frontmatter-parser.ts`
2. Add validation in `validateFrontMatter()` function
3. Update converters to use the new field
