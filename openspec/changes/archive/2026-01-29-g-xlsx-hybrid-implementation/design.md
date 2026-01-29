# Design: G - XLSX Hybrid Implementation

## Context

The current XLSX converter (`src/core/converters/xlsx-converter.ts`) uses:
- `markdown-it` via `parseMarkdown()` for table extraction
- `table-parser.ts` for processing cells (type detection, formula extraction)
- `ExcelJS` for Excel workbook generation

The proposal suggests using Pandoc AST for table extraction while retaining ExcelJS for generation. However, after reviewing the codebase:

1. The current markdown parser already handles tables well
2. The `PreProcessor` already extracts formulas with locations
3. Using Pandoc AST would require new AST walking utilities
4. The existing implementation is mature and well-tested

## Goals / Non-Goals

**Goals:**
- Integrate with the Pandoc pipeline (PreProcessor for formula extraction)
- Use PreProcessor for consistent metadata handling
- Maintain API compatibility with existing converter
- Keep ExcelJS for Excel generation (it's the right tool for this)

**Non-Goals:**
- Replacing markdown-it table parsing with Pandoc AST (unnecessary complexity)
- Adding new table features beyond current implementation
- Supporting non-table content in XLSX (e.g., plain text)

## Decisions

### 1. Use PreProcessor for formula extraction, not Pandoc AST

**Decision:** Use `PreProcessor.process()` for formula extraction and metadata normalization, but continue using `parseMarkdown()` for table structure extraction.

**Rationale:**
- PreProcessor already handles formula extraction with proper locations
- Pandoc AST table parsing would require implementing complex AST walking
- The existing markdown parser handles tables correctly
- This is a "hybrid" approach - Pandoc components where they add value

**Alternatives considered:**
- Full Pandoc AST parsing: More complex, no clear benefit
- No changes: Would miss the PreProcessor integration

### 2. Refactor to use string-based function as primary

**Decision:** Make `convertMarkdownToXlsx(markdown, outputPath, options)` the primary function, with `convertToXlsx(inputPath, outputPath, options)` delegating to it.

**Rationale:** Consistency with DOCX and PPTX converters. The file-based version simply reads the file and calls the string-based version.

### 3. Use PreProcessor formulas instead of re-extracting

**Decision:** Use `preResult.extractedData.formulas` from PreProcessor instead of extracting formulas again in table-parser.

**Rationale:**
- Single source of truth for formula locations
- PreProcessor already does this work
- Avoids duplicate formula extraction logic

### 4. Remove formula re-injection from table-parser flow

**Decision:** Since PreProcessor returns formulas with placeholders, we need to either:
- a) Use the formulas from PreProcessor and inject them post-table-creation, OR
- b) Don't replace formulas with placeholders for XLSX (skip that PreProcessor step)

**Choice:** Option (b) - Pass `skipFormulaPlaceholders: true` or similar to PreProcessor for XLSX, OR simply use the original markdown and just use PreProcessor for metadata. The table-parser already handles `{=FORMULA}` syntax.

**Rationale:** The existing table-parser flow already extracts and processes formulas correctly. We just need PreProcessor for metadata normalization.

## Implementation Approach

Minimal changes to existing working code:

1. **Add `convertMarkdownToXlsx` function** that takes markdown string
2. **Use PreProcessor** for metadata normalization only
3. **Keep table extraction** using existing `parseMarkdown()`
4. **Keep table processing** using existing `processTable()`
5. **Refactor `convertToXlsx`** to delegate to string-based version

This approach:
- Integrates with Pandoc pipeline (PreProcessor for metadata)
- Preserves working formula extraction logic
- Maintains API compatibility
- Minimal risk of breaking existing functionality

## Risks / Trade-offs

### Risk: Not fully using Pandoc for parsing
**Mitigation:** The proposal's "Pandoc AST for tables" idea adds complexity without clear benefit. The current markdown parser works well for tables.

### Trade-off: Less "pure" Pandoc integration
**Acceptance:** XLSX is fundamentally different from DOCX/PPTX - Pandoc can't generate Excel files. A hybrid approach is the right choice here. We use Pandoc components where they help (PreProcessor for metadata) and skip where they don't (table parsing).
