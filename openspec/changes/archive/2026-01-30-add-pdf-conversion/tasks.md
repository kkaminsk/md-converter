## 1. Pandoc Infrastructure

- [x] 1.1 Add `pdfEngine` field to `PandocOptions` interface in `src/core/pandoc/types.ts`
- [x] 1.2 Update `PandocExecutor.buildArguments()` to pass `--pdf-engine` when pdfEngine is set
- [x] 1.3 Add PDF engine discovery utility function with Windows path searching
- [x] 1.4 Add `WKHTMLTOPDF_PATH` environment variable support

## 2. PDF Converter Core

- [x] 2.1 Create `src/core/converters/pdf-converter.ts` with `PdfConversionOptions` interface
- [x] 2.2 Implement `convertMarkdownToPdf()` function using PreProcessor + PandocExecutor
- [x] 2.3 Implement `convertToPdf()` file-based wrapper function
- [x] 2.4 Add PDF engine fallback logic (wkhtmltopdf → pdflatex → xelatex → lualatex)
- [x] 2.5 Implement page layout options (pageSize, margins, orientation) via Pandoc variables
- [x] 2.6 Implement classification header/footer injection for wkhtmltopdf

## 3. Error Handling

- [x] 3.1 Add PDF-specific error messages with installation instructions
- [x] 3.2 Handle "PDF engine not found" error with platform-specific guidance
- [x] 3.3 Wrap Pandoc/engine errors in ConversionError with descriptive messages

## 4. CLI Integration

- [x] 4.1 Add 'pdf' to format choices in `src/cli/index.ts`
- [x] 4.2 Update format help text to include PDF
- [x] 4.3 Add PDF to batch conversion when `--format all` is specified
- [x] 4.4 Add PDF-specific CLI options (--page-size, --orientation) if needed

## 5. Front Matter Support

- [x] 5.1 Add 'pdf' to valid format values in `src/core/parsers/frontmatter-parser.ts`
- [x] 5.2 Update format validation to accept 'pdf'
- [x] 5.3 Ensure 'all' format includes PDF in `getFormats()` function

## 6. MCP Tool

- [x] 6.1 Add `convert_md_to_pdf` tool definition in `src/mcp/tools.ts`
- [x] 6.2 Implement tool handler with pageSize and margins parameters
- [x] 6.3 Add tool to MCP server tool list

## 7. Exports and Types

- [x] 7.1 Export PDF converter functions from `src/index.ts`
- [x] 7.2 Export `PdfConversionOptions` and `PdfConversionResult` types

## 8. Documentation

- [x] 8.1 Update CLAUDE.md with PDF conversion section
- [x] 8.2 Add PDF engine installation instructions
- [x] 8.3 Document `WKHTMLTOPDF_PATH` environment variable

## 9. Testing

- [ ] 9.1 Add unit tests for PDF engine discovery
- [x] 9.2 Add integration test for basic PDF conversion
- [ ] 9.3 Test PDF conversion with classification metadata
- [ ] 9.4 Test error handling when no PDF engine is available
