# Change: B - Pandoc Pre-Processor

## Why
Before sending markdown to Pandoc, we need to:
1. Extract Excel formulas (`{=FORMULA}` syntax) that Pandoc doesn't understand
2. Normalize metadata for Pandoc compatibility
3. Prepare content for consistent conversion

The pre-processor bridges our custom markdown features with Pandoc's input requirements.

## What Changes

### New Components
- Create `src/core/pandoc/pre-processor.ts` - Markdown preprocessing pipeline

### Pre-Processor Capabilities

1. **Formula Extraction**
   - Scan markdown tables for `{=FORMULA}` patterns
   - Replace formulas with traceable placeholders (e.g., `__FORMULA_0_2_3__`)
   - Store formula locations with table index, row, column, and formula text
   - Validate extracted formulas using existing `formula-parser.ts`
   - Return formula map for post-processing injection

2. **Metadata Normalization**
   - Parse YAML front matter using existing `frontmatter-parser.ts`
   - Map custom fields to Pandoc-compatible metadata:
     - `classification` → `subject`
     - `section_breaks` → passed to Lua filter via metadata
     - `slide_breaks` → passed to Lua filter via metadata
   - Ensure required Pandoc fields (title, author, date) are present

3. **Content Preparation**
   - Normalize line endings (CRLF → LF)
   - Escape special characters if needed
   - Handle classification headers for insertion

### Interfaces

```typescript
interface FormulaLocation {
  tableIndex: number;
  row: number;
  column: number;
  formula: string;
  placeholder: string;
}

interface PreProcessorResult {
  content: string;  // Modified markdown with placeholders
  extractedData: {
    formulas: FormulaLocation[];
    metadata: DocumentMetadata;
    tableCount: number;
  };
  warnings: string[];
}

interface PreProcessor {
  process(markdown: string): PreProcessorResult;
}
```

### Integration Points
- Uses existing `parseFrontMatter()` from `frontmatter-parser.ts`
- Uses existing `validateFormula()` from `formula-parser.ts`
- Used by refactored converters in subsequent changes

## Impact
- **Affected specs**: Extends `pandoc` capability
- **Affected code**:
  - `src/core/pandoc/pre-processor.ts` (new)
  - `src/core/pandoc/types.ts` (extend with PreProcessor types)
  - `src/core/pandoc/index.ts` (add exports)
- **Dependencies**: Change A (Pandoc Executor Foundation)

## Acceptance Criteria
1. Formula extraction correctly identifies all `{=...}` patterns in tables
2. Placeholders are unique and traceable back to original location
3. Metadata normalization produces Pandoc-compatible YAML
4. Original markdown structure is preserved (only formulas replaced)
5. Warnings collected for any preprocessing issues
6. Unit tests cover formula extraction and metadata normalization

## Priority
**2 of 7** - Required before converter migrations. Depends on A.
