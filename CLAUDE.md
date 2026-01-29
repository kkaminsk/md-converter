# CLAUDE.md

This file provides guidance for AI assistants working with this codebase.

## Project Overview

MD Converter is a TypeScript tool that converts Markdown files to Microsoft Office formats (DOCX, XLSX, PPTX). It supports YAML front matter for metadata, Excel formulas in tables, and provides both CLI and MCP (Model Context Protocol) server interfaces.

**Status:** Migrating to Pandoc-based conversion engine (see [Pandoc Migration](#pandoc-migration) below).

## Tech Stack

- **Language:** TypeScript (ES Modules)
- **Runtime:** Node.js 18+
- **Build:** tsc (TypeScript compiler)
- **Conversion Engine:** Pandoc 3.0+ (external dependency)
- **Key Dependencies:**
  - `exceljs` - Excel workbook generation (retained for XLSX)
  - `markdown-it` - Markdown parsing (for validation/preview)
  - `js-yaml` - YAML front matter parsing
  - `jszip` - OOXML post-processing
  - `@modelcontextprotocol/sdk` - MCP server integration
  - `commander` - CLI framework
  - `chalk` - Terminal styling

### Legacy Dependencies (being removed)
  - `docx` - Word document generation (replaced by Pandoc)
  - `pptxgenjs` - PowerPoint generation (replaced by Pandoc)

## Project Structure

```
src/
├── index.ts                    # Main exports
├── cli/
│   └── index.ts               # CLI entry point (md-convert command)
├── core/
│   ├── converters/
│   │   ├── docx-converter.ts  # Markdown → Word (via Pandoc)
│   │   ├── xlsx-converter.ts  # Markdown tables → Excel (Pandoc AST + ExcelJS)
│   │   ├── pptx-converter.ts  # Markdown → PowerPoint (via Pandoc)
│   │   └── section-rules.ts   # Section/slide break logic
│   ├── pandoc/                # Pandoc integration layer
│   │   ├── executor.ts        # Pandoc process spawning & management
│   │   ├── pre-processor.ts   # Formula extraction, metadata normalization
│   │   ├── post-processor.ts  # Formula injection, OOXML patching
│   │   ├── xlsx-post.ts       # XLSX formula injection (ExcelJS)
│   │   ├── docx-post.ts       # DOCX header/properties patching (jszip)
│   │   ├── pptx-post.ts       # PPTX footer injection (jszip)
│   │   ├── filters.ts         # Filter/template path resolution
│   │   ├── types.ts           # TypeScript interfaces
│   │   ├── errors.ts          # Pandoc-specific error classes
│   │   └── index.ts           # Module exports
├── pandoc/
│   └── filters/               # Lua filters for Pandoc
│       ├── section-breaks.lua # DOCX page break control
│       ├── slide-breaks.lua   # PPTX slide boundary control
│       └── metadata-inject.lua # Metadata normalization
│   ├── parsers/
│   │   ├── markdown.ts        # Markdown AST parsing
│   │   ├── frontmatter-parser.ts  # YAML metadata extraction
│   │   ├── table-parser.ts    # Table processing
│   │   └── formula-parser.ts  # Excel formula validation
│   └── validators/
│       └── document-validator.ts  # Document structure validation
├── mcp/
│   ├── server.ts              # MCP server (STDIO mode)
│   └── tools.ts               # MCP tool definitions
templates/                         # Pandoc reference documents
├── reference.docx                 # Word styling template (generate with script)
├── reference.pptx                 # PowerPoint template (generate with script)
├── generate-references.sh         # Script to create reference docs
├── README.md                      # Template setup documentation
└── defaults/
    ├── docx.yaml                  # Pandoc defaults for DOCX
    └── pptx.yaml                  # Pandoc defaults for PPTX
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

## Pandoc Migration

The project is migrating from library-specific converters to a unified Pandoc-based architecture.

### Why Pandoc?

- Single conversion engine for all formats (vs 3 separate libraries)
- Battle-tested (18+ years, used by publishers/academics)
- Lua filters for extensible transformations
- Reference documents for consistent styling
- Native DOCX/PPTX support; XLSX via hybrid approach

### Migration Status

See `openspec/changes/` for detailed proposals:

| Change | Status | Description |
|--------|--------|-------------|
| A - Pandoc Executor Foundation | **Done** | Core process wrapper, error handling |
| B - Pandoc Pre-Processor | **Done** | Formula extraction, metadata normalization |
| C - Lua Filters & Templates | **Done** | section-breaks.lua, reference docs |
| D - Pandoc Post-Processor | **Done** | Formula injection, OOXML patching |
| E - DOCX Converter Migration | **Done** | Refactor to use Pandoc |
| F - PPTX Converter Migration | Planned | Refactor to use Pandoc |
| G - XLSX Hybrid Implementation | Planned | Pandoc AST + ExcelJS |
| H - Cleanup & Integration | Planned | Remove old deps, integration tests |

### Pandoc Conversion Flow

```
Markdown Input
     │
     ▼
┌─────────────────┐
│ Pre-Processor   │ ← Extract formulas, normalize metadata
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Pandoc Executor │ ← Spawn pandoc with filters & reference docs
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Post-Processor  │ ← Inject formulas, patch properties
└────────┬────────┘
         │
         ▼
   Office Output
```

### Key Files

- `pandoc-specification.md` - Full technical specification
- `openspec/changes/A-*` through `H-*` - Implementation proposals

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `PANDOC_PATH` | Custom Pandoc binary location | Auto-detect |
| `MD_CONVERTER_TEMPLATES` | Custom templates directory | `./templates` |
| `MD_CONVERTER_FILTERS` | Custom filters directory | `./src/pandoc/filters` |
| `PANDOC_TIMEOUT` | Conversion timeout (ms) | `30000` |

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

When working with Pandoc components:
- `PandocExecutor` - Use for all Pandoc process spawning
  - `checkInstallation()` - Verify Pandoc is available
  - `convert(content, options)` - Convert markdown to output format
  - `toAST(content)` - Get Pandoc AST as JSON
- `PreProcessor.process(markdown, options)` - Call before sending content to Pandoc
  - Extracts `{=FORMULA}` patterns from tables → placeholders (`__FORMULA_0_1_2__`)
  - Normalizes metadata (adds `subject` from `classification`, `generator` field)
  - Normalizes line endings (CRLF → LF)
  - Returns `{ content, extractedData: { formulas, metadata, tableCount }, warnings }`
- `PostProcessor.process(options)` - Call after Pandoc generates output
  - Injects formulas into XLSX cells (replaces `__FORMULA_*__` placeholders)
  - Adds classification headers to DOCX documents
  - Adds classification footers to PPTX slides
  - Patches document properties (title, author, subject, keywords)
  - Returns `{ success, outputPath, modifications, warnings }`
- Filter/template path utilities:
  - `getFilterPath(name)` - Resolve Lua filter path (respects `MD_CONVERTER_FILTERS` env var)
  - `getTemplatePath(name)` - Resolve template path (respects `MD_CONVERTER_TEMPLATES` env var)
  - `getDefaultsPath(name)` - Resolve defaults file path
  - `FILTERS`, `TEMPLATES`, `DEFAULTS` - Constants for file names
- Lua filters (in `src/pandoc/filters/`):
  - `section-breaks.lua` - DOCX page breaks (auto/all/none modes)
  - `slide-breaks.lua` - PPTX slide boundaries (h1/h2/hr modes)
  - `metadata-inject.lua` - Metadata normalization
- Reference docs control styling; edit templates/*.docx or templates/*.pptx

When adding new Lua filters:
1. Create filter in `src/pandoc/filters/`
2. Add to defaults file in `templates/defaults/`
3. Test with: `pandoc test.md --lua-filter=yourfilter.lua -t native`

When debugging Pandoc issues:
- View AST: `pandoc input.md -t json | python -m json.tool`
- Verbose output: `pandoc input.md -o out.docx --verbose`
- Check version: `pandoc --version` (need 3.0+)
