## Context

After Pandoc generates DOCX/PPTX/XLSX output, we need post-processing to:
1. Inject Excel formulas back into cells (replacing placeholders from pre-processor)
2. Add classification headers/footers
3. Patch document properties with additional metadata

The post-processor completes the conversion pipeline started by PreProcessor.

### Current State

- PreProcessor extracts formulas and generates placeholders (`__FORMULA_0_1_2__`)
- PandocExecutor generates Office files
- No post-processing exists to finalize output

### Constraints

- Must not corrupt valid Pandoc output
- DOCX/PPTX are ZIP archives containing XML (OOXML format)
- jszip is already a project dependency
- ExcelJS is already used for XLSX generation

## Goals / Non-Goals

**Goals:**
- Replace formula placeholders with actual Excel formulas in XLSX
- Add classification text to DOCX headers/footers
- Add classification to PPTX slide footers
- Patch document properties (core.xml) with metadata
- Provide clear logging of modifications made

**Non-Goals:**
- Complex styling beyond what reference docs provide
- Theme switching (dark mode etc.) - defer to future
- Speaker notes injection - defer to future
- Auto-fit column widths in Excel - complex to implement correctly

## Decisions

### 1. Architecture: Single Entry Point with Format Dispatching

**Decision:** Single `PostProcessor` class that delegates to format-specific handlers

**Rationale:**
- Clean API for converters to call
- Format-specific logic isolated in separate modules
- Easy to add new formats later

**Structure:**
```
PostProcessor.process(options)
  → docx: DocxPostProcessor.process()
  → pptx: PptxPostProcessor.process()
  → xlsx: XlsxPostProcessor.process()
```

### 2. OOXML Manipulation: jszip for DOCX/PPTX

**Decision:** Use jszip to read/modify/write DOCX and PPTX files

**Rationale:**
- Already a project dependency
- DOCX/PPTX are ZIP archives with XML files inside
- Simple string manipulation for XML modifications
- No need for full XML parser for our use cases

### 3. Excel Manipulation: ExcelJS for XLSX

**Decision:** Use ExcelJS for XLSX post-processing (already used in xlsx-converter)

**Rationale:**
- Already a project dependency
- Provides proper formula handling
- Handles cell references correctly

### 4. Formula Injection Strategy

**Decision:** Load workbook, scan cells for placeholders, replace with formulas

**Rationale:**
- ExcelJS allows setting cell.value = { formula: '...' }
- Placeholders are unique text that won't appear naturally
- Can validate formulas are set correctly

### 5. Classification Header/Footer Approach

**Decision:** Modify existing header/footer XML in DOCX, or create minimal ones if missing

**Rationale:**
- Pandoc may or may not create headers/footers
- Classification text should appear on every page
- Simple text injection into existing XML structure

### 6. Error Handling Strategy

**Decision:** Collect warnings, continue processing, don't fail on non-critical issues

**Rationale:**
- Consistent with PreProcessor approach
- Post-processing should be best-effort
- Critical errors (file not found, corrupt archive) should throw

## Risks / Trade-offs

### XML String Manipulation
**Risk:** String-based XML changes could produce invalid XML
**Mitigation:** Use simple, well-tested patterns. Validate output exists and is readable.

### Formula Reference Validation
**Risk:** Formula references could point to non-existent cells
**Mitigation:** Log warnings for suspicious references but don't block (Excel will show #REF! error)

### Header/Footer Complexity
**Risk:** DOCX header/footer XML is complex with sections
**Mitigation:** Start with simple single-section documents. Add complexity as needed.

## File Structure

```
src/core/pandoc/
├── post-processor.ts    # Main PostProcessor class, format dispatching
├── docx-post.ts         # DOCX-specific: headers, footers, properties
├── pptx-post.ts         # PPTX-specific: slide footers
├── xlsx-post.ts         # XLSX-specific: formula injection
└── index.ts             # Add exports
```

## Interface Design

```typescript
interface PostProcessorOptions {
  format: 'docx' | 'pptx' | 'xlsx';
  extractedData: {
    formulas: FormulaLocation[];
    metadata: DocumentMetadata | null;
    tableCount: number;
  };
  outputPath: string;
}

interface PostProcessorResult {
  success: boolean;
  outputPath: string;
  modifications: string[];
  warnings: string[];
}
```
