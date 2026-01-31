## Context

The md-convert tool uses Pandoc as its conversion engine for DOCX and PPTX formats. The existing architecture follows a three-stage pipeline: PreProcessor → PandocExecutor → PostProcessor. Adding PDF support fits naturally into this architecture since Pandoc natively supports PDF output via external PDF engines.

Key constraints:
- Pandoc requires an external PDF engine (wkhtmltopdf, pdflatex, xelatex, etc.)
- wkhtmltopdf is preferred to avoid LaTeX dependency (simpler installation)
- PDF engine binaries may not be in PATH (especially on Windows)
- No post-processing needed for PDF (unlike DOCX/PPTX which need OOXML patching)

## Goals / Non-Goals

**Goals:**
- Add PDF as a first-class output format alongside DOCX/PPTX/XLSX
- Support wkhtmltopdf as the primary PDF engine (no LaTeX required)
- Fall back to LaTeX engines (pdflatex, xelatex, lualatex) if available
- Auto-detect PDF engine locations on Windows (common install paths)
- Expose PDF-specific options: page size, margins, orientation
- Integrate with CLI (`--format pdf`) and MCP tools

**Non-Goals:**
- Installing PDF engines automatically (user responsibility)
- Supporting all Pandoc PDF engines (focus on wkhtmltopdf + LaTeX family)
- PDF form fields or interactive elements
- PDF/A archival format compliance
- Custom fonts or advanced typography (use defaults from engine)

## Decisions

### Decision 1: Use wkhtmltopdf as primary PDF engine

**Choice:** wkhtmltopdf over LaTeX-based engines as the default.

**Rationale:**
- Single binary install (~50MB) vs full LaTeX distribution (~2GB+)
- No configuration needed (works out of the box)
- Renders HTML/CSS, familiar to web developers
- Already installed on the test system

**Alternatives considered:**
- pdflatex: More precise typography but requires TeX distribution
- weasyprint: Python-based, additional dependency management
- prince: Commercial license

**Trade-off:** wkhtmltopdf is deprecated (last update 2020) but remains widely used and stable for document conversion.

### Decision 2: Extend PandocOptions with pdfEngine field

**Choice:** Add `pdfEngine?: string` to `PandocOptions` interface.

**Rationale:**
- Maps directly to Pandoc's `--pdf-engine` argument
- Allows specifying full path to engine binary
- Consistent with existing options pattern

**Implementation:**
```typescript
interface PandocOptions {
  // ... existing fields
  pdfEngine?: string;  // Path or name of PDF engine
}
```

### Decision 3: Windows PDF engine auto-discovery

**Choice:** Search common Windows installation paths for wkhtmltopdf.

**Rationale:**
- Windows installers don't always add binaries to PATH
- Discovered this issue during manual testing (wkhtmltopdf installed but not found)
- Same pattern already used for Pandoc discovery in `executor.ts`

**Paths to search:**
```typescript
const WINDOWS_WKHTMLTOPDF_PATHS = [
  path.join(process.env.PROGRAMFILES || '', 'wkhtmltopdf', 'bin', 'wkhtmltopdf.exe'),
  path.join(process.env['PROGRAMFILES(X86)'] || '', 'wkhtmltopdf', 'bin', 'wkhtmltopdf.exe'),
  'C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe',
];
```

### Decision 4: No post-processing for PDF

**Choice:** Skip PostProcessor for PDF format.

**Rationale:**
- PDF is a final format, not an OOXML container
- Classification headers/footers must be injected before PDF generation (via HTML template or Pandoc variables)
- Document properties are set during Pandoc conversion

**Implementation:** PDF converter calls PreProcessor and PandocExecutor only.

### Decision 5: PDF options via Pandoc variables

**Choice:** Pass page size, margins, and orientation as Pandoc variables.

**Rationale:**
- wkhtmltopdf accepts these via command line (Pandoc passes them through)
- Consistent across different PDF engines
- No custom template files needed

**Variables:**
- `papersize`: a4, letter, legal
- `margin-top`, `margin-right`, `margin-bottom`, `margin-left`: in mm or inches
- `orientation`: portrait, landscape (if supported by engine)

### Decision 6: Classification via header/footer HTML

**Choice:** For documents with `classification` metadata, inject it via Pandoc's `--include-in-header` option.

**Rationale:**
- wkhtmltopdf supports header/footer HTML
- Classification appears on every page
- Cleaner than post-processing PDF (which requires complex libraries)

**Alternative considered:** Use a Lua filter to inject classification. Rejected because wkhtmltopdf already has header/footer support and this is simpler.

## Risks / Trade-offs

**[Risk] wkhtmltopdf is unmaintained** → Mitigation: Support fallback to LaTeX engines. wkhtmltopdf still works reliably for document conversion use cases.

**[Risk] PDF engine not installed** → Mitigation: Clear error message with installation instructions. Check for engine before attempting conversion.

**[Risk] Different engines produce different output** → Mitigation: Document that output may vary by engine. Recommend wkhtmltopdf for consistency.

**[Risk] Page breaks differ from DOCX** → Mitigation: Accept this limitation. Users can adjust content or use DOCX for precise pagination control.

**[Trade-off] No PDF post-processing** → Classification must be handled during generation, not after. This is simpler but less flexible than DOCX/PPTX approach.

## Open Questions

1. **Should `--format all` include PDF?** Leaning yes for completeness, but PDF generation is slower than DOCX/PPTX.

2. **Should we support custom CSS for PDF styling?** Could add `--pdf-css` option, but increases complexity. Defer to future enhancement.

3. **What error message when no PDF engine found?** Need to craft helpful message with install instructions for each platform.
