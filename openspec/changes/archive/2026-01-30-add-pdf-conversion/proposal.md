## Why

The md-convert tool currently supports DOCX, XLSX, and PPTX output formats, but PDF is a commonly requested format for document distribution. Users need to convert Markdown documents to PDF for sharing finalized documents, printing, and archival purposes. Since the project is already migrating to Pandoc as the conversion engine, adding PDF support leverages existing infrastructure with minimal additional complexity.

## What Changes

- Add `pdf` as a supported output format in CLI (`--format pdf`)
- Add `pdf` as valid value for `format:` in YAML front matter
- Create new `pdf-converter.ts` following the existing Pandoc pipeline pattern
- Add `convert_md_to_pdf` MCP tool for programmatic PDF generation
- Support wkhtmltopdf as the PDF engine (no LaTeX dependency required)
- Add PDF-specific options: page size, margins, orientation
- Update batch conversion to include PDF when `--format all` is specified

## Capabilities

### New Capabilities

- `pdf-conversion`: PDF output format support using Pandoc with wkhtmltopdf engine. Includes CLI integration, MCP tool, and conversion options for page layout.

### Modified Capabilities

- `converters`: Add PDF converter requirements alongside existing DOCX/PPTX/XLSX converters. The PDF converter will follow the same Pandoc pipeline pattern (PreProcessor → PandocExecutor → PostProcessor).

## Impact

**Code Changes:**
- `src/core/converters/pdf-converter.ts` - New converter module
- `src/cli/index.ts` - Add `pdf` to format choices
- `src/mcp/tools.ts` - Add `convert_md_to_pdf` tool
- `src/core/parsers/frontmatter-parser.ts` - Add `pdf` to valid formats
- `src/index.ts` - Export PDF converter functions

**Dependencies:**
- External: wkhtmltopdf must be installed (or pdflatex as alternative)
- No new npm dependencies required (uses existing Pandoc integration)

**Environment:**
- New env var `WKHTMLTOPDF_PATH` for custom binary location
- Falls back to LaTeX engines if wkhtmltopdf unavailable

**Documentation:**
- Update CLAUDE.md with PDF conversion details
- Update CLI help text
