# Change: D - Pandoc Post-Processor

## Why
After Pandoc generates output files, we need to:
1. Inject Excel formulas back into XLSX (replacing placeholders)
2. Apply formatting that reference documents can't handle
3. Patch document properties and metadata
4. Handle format-specific finalization

The post-processor transforms Pandoc's output into our final deliverables.

## What Changes

### New Components
- Create `src/core/pandoc/post-processor.ts` - Output post-processing pipeline
- Create `src/core/pandoc/docx-post.ts` - DOCX-specific post-processing
- Create `src/core/pandoc/pptx-post.ts` - PPTX-specific post-processing
- Create `src/core/pandoc/xlsx-post.ts` - XLSX-specific post-processing

### Post-Processor Interface

```typescript
interface PostProcessorOptions {
  format: 'docx' | 'xlsx' | 'pptx';
  extractedData: {
    formulas: FormulaLocation[];
    metadata: DocumentMetadata;
    tableCount: number;
  };
  outputPath: string;
}

interface PostProcessorResult {
  success: boolean;
  outputPath: string;
  modifications: string[];  // List of changes made
  warnings: string[];
}

interface PostProcessor {
  process(options: PostProcessorOptions): Promise<PostProcessorResult>;
}
```

### DOCX Post-Processing (`docx-post.ts`)
Uses `jszip` to modify DOCX (which is a ZIP archive):

1. **Classification Headers/Footers**
   - Inject classification text into header/footer XML if metadata.classification exists
   - Apply to all sections

2. **Document Properties**
   - Patch `docProps/core.xml` with additional metadata
   - Set custom properties like version, status

3. **Style Fixes**
   - Apply any styles not achievable via reference doc
   - Fix table borders if needed

### PPTX Post-Processing (`pptx-post.ts`)
Uses `jszip` to modify PPTX:

1. **Slide Footers**
   - Add classification to slide footers
   - Inject date/version into placeholders

2. **Theme Adjustments**
   - Apply dark theme variant if metadata.theme === 'dark'
   - Adjust color mappings

3. **Speaker Notes**
   - Add metadata as speaker notes on first slide

### XLSX Post-Processing (`xlsx-post.ts`)
Uses `exceljs` (retained for XLSX manipulation):

1. **Formula Injection**
   - Locate placeholder strings in cells
   - Replace with actual Excel formulas from FormulaLocation map
   - Validate formula references are within worksheet bounds

2. **Cell Formatting**
   - Apply number formats (currency, percentage)
   - Apply date formats based on metadata.date_format
   - Style header rows (bold, background color)

3. **Worksheet Configuration**
   - Freeze header rows
   - Auto-fit column widths
   - Set worksheet properties (name, tab color)

### Utility Functions
- `openOoxmlArchive(path)` - Open DOCX/PPTX as ZIP
- `saveOoxmlArchive(archive, path)` - Save modified archive
- `patchXml(xml, changes)` - Apply XML modifications

## Impact
- **Affected specs**: Extends `pandoc` capability
- **Affected code**:
  - `src/core/pandoc/post-processor.ts` (new)
  - `src/core/pandoc/docx-post.ts` (new)
  - `src/core/pandoc/pptx-post.ts` (new)
  - `src/core/pandoc/xlsx-post.ts` (new)
  - `src/core/pandoc/index.ts` (add exports)
- **Dependencies**: Changes A, B (uses executor and pre-processor types)
- **New dependency**: `jszip` for OOXML manipulation

## Acceptance Criteria
1. Formula placeholders correctly replaced with Excel formulas
2. DOCX classification headers appear in output
3. PPTX footers contain classification when specified
4. All post-processing is non-destructive (doesn't break valid Pandoc output)
5. Modifications are logged for debugging
6. Unit tests cover each format's post-processing

## Priority
**4 of 7** - Required before converter migrations. Depends on A, B.
