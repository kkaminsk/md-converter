## Context

The MD Converter currently passes markdown directly to conversion libraries. With the Pandoc migration, we need a pre-processing layer that:

1. Extracts custom `{=FORMULA}` syntax that Pandoc doesn't understand
2. Normalizes metadata to Pandoc-compatible format
3. Prepares content for consistent cross-platform conversion

The pre-processor runs **before** the PandocExecutor (from Change A) and produces:
- Modified markdown with formula placeholders
- Extracted data for post-processing (Change D)

### Current State

- `frontmatter-parser.ts` handles YAML parsing and validation
- `formula-parser.ts` validates Excel formulas and extracts cell references
- No integration layer exists to prepare content for Pandoc

### Constraints

- Must preserve original markdown structure (only formulas replaced)
- Must work with existing parser functions (no duplication)
- Placeholders must be unique and traceable for post-processor injection
- Must handle edge cases: multiple tables, nested formulas, empty cells

## Goals / Non-Goals

**Goals:**
- Extract all `{=FORMULA}` patterns from markdown tables with precise location tracking
- Generate deterministic, collision-free placeholders
- Normalize YAML front matter for Pandoc compatibility
- Collect warnings without blocking conversion
- Provide clean interface for converter integration

**Non-Goals:**
- Formula evaluation or calculation (Excel does this)
- Deep validation of formula semantics (existing `formula-parser.ts` handles syntax)
- Modification of non-table content
- Handling of non-markdown input formats

## Decisions

### 1. Placeholder Format

**Decision:** Use `__FORMULA_{tableIndex}_{row}_{column}__` pattern

**Rationale:**
- Deterministic: Same input always produces same placeholders
- Traceable: Location encoded in placeholder for post-processing
- Collision-free: Double underscore prefix/suffix unlikely in normal text
- Human-readable: Easy to debug when viewing intermediate output

**Alternatives considered:**
- UUID-based (`__FORMULA_a1b2c3d4__`): Not deterministic, harder to debug
- Hash-based (`__F_abc123__`): Shorter but obscures location info
- Indexed only (`__F_0__`): Loses table/row/column context

### 2. Table Detection Strategy

**Decision:** Use regex-based line scanning to detect markdown pipe tables

**Rationale:**
- Pipe tables are the only table format we support for formulas
- Regex is fast and sufficient for our use case
- No need to build full AST for simple pattern extraction

**Pattern:** Lines matching `|...|` structure with separator row `|---|---|`

**Alternatives considered:**
- Full markdown AST parsing: Overkill for formula extraction
- markdown-it plugin: Adds dependency, less control over extraction

### 3. Metadata Normalization Approach

**Decision:** Additive transformation - keep original fields, add Pandoc-specific mappings

**Rationale:**
- Preserves all original metadata for our post-processor
- Adds `subject` field from `classification` for Pandoc DOCX properties
- Passes `section_breaks` and `slide_breaks` through metadata for Lua filters

**Mappings:**
- `classification` → also set as `subject` (DOCX document property)
- `section_breaks` → passed as-is for Lua filter consumption
- `slide_breaks` → passed as-is for Lua filter consumption
- Add `generator: "md-converter"` for identification

### 4. Processing Pipeline Order

**Decision:** Line endings → Metadata → Formula extraction

**Rationale:**
1. Normalize line endings first for consistent regex matching
2. Parse metadata to get conversion options
3. Extract formulas from normalized content

This order ensures consistent table detection across platforms.

### 5. Warning Collection Strategy

**Decision:** Collect all warnings, never block on warnings

**Rationale:**
- Pre-processor should be lenient to allow partial conversions
- Warnings surfaced to user for optional review
- Only true errors (malformed YAML) should block processing

## Risks / Trade-offs

### Regex Table Detection Limitations
**Risk:** Complex tables (merged cells, nested pipes) may not parse correctly
**Mitigation:** Document supported table format. Use markdown-it for complex cases in future.

### Placeholder Collision (Theoretical)
**Risk:** User content containing `__FORMULA_` pattern would conflict
**Mitigation:** Pattern is highly unlikely in normal content. Document as reserved syntax.

### Formula in Non-Table Context
**Risk:** User places `{=FORMULA}` outside tables
**Mitigation:** Ignore formulas outside tables - they're meaningless without cell context.

### Large Document Performance
**Risk:** Regex scanning on very large documents could be slow
**Mitigation:** Stream processing is out of scope. Current approach handles typical document sizes. Add metrics for monitoring.

## Interface Design

```typescript
interface FormulaLocation {
  tableIndex: number;    // 0-based table index in document
  row: number;           // 0-based row within table (excludes header separator)
  column: number;        // 0-based column index
  formula: string;       // Original formula text (without {= })
  placeholder: string;   // Generated placeholder
}

interface PreProcessorResult {
  content: string;              // Markdown with placeholders
  extractedData: {
    formulas: FormulaLocation[];
    metadata: DocumentMetadata;
    tableCount: number;
  };
  warnings: string[];
}

interface PreProcessorOptions {
  validateFormulas?: boolean;   // Run formula validation (default: true)
  preserveLineEndings?: boolean; // Skip normalization (default: false)
}

class PreProcessor {
  process(markdown: string, options?: PreProcessorOptions): PreProcessorResult;
}
```

## File Structure

```
src/core/pandoc/
├── pre-processor.ts      # Main PreProcessor class
├── types.ts              # Extended with PreProcessor types (FormulaLocation, etc.)
├── errors.ts             # Existing, no changes needed
└── index.ts              # Add PreProcessor export
```
