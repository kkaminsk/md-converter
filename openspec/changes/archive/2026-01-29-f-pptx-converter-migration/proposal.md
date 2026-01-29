# Change: F - PPTX Converter Migration

## Why
The current PPTX converter uses `pptxgenjs` with manual slide construction. Migrating to Pandoc:
- Provides native PPTX support with proper slide structures
- Eliminates ESM/CJS interop issues
- Enables consistent slide break logic via Lua filters
- Reduces code complexity

## What Changes

### Refactor `src/core/converters/pptx-converter.ts`

Replace the current implementation with Pandoc-based conversion:

```typescript
export async function convertToPptx(
  markdown: string,
  outputPath: string,
  options?: PptxConversionOptions
): Promise<PptxConversionResult>
```

### New Conversion Flow

```
1. Pre-process markdown
   ├── Parse front matter
   ├── Normalize content
   └── Handle slide_breaks metadata

2. Execute Pandoc
   ├── Use defaults/pptx.yaml configuration
   ├── Apply slide-breaks.lua filter
   ├── Apply metadata-inject.lua filter
   └── Use reference.pptx template

3. Post-process output
   ├── Add classification footers
   ├── Apply theme adjustments
   └── Inject speaker notes metadata

4. Return result
   ├── Success status
   ├── Output path
   ├── Slide count
   └── Warnings collected
```

### Slide Structure Mapping

Pandoc's native PPTX writer creates slides based on heading levels:

| Markdown | Pandoc Behavior | Our Filter Adjustment |
|----------|-----------------|----------------------|
| H1 (first) | Title slide | Keep as-is |
| H1 (subsequent) | Section header | Keep as-is |
| H2 | New content slide | slide_breaks: h1 → demote to prevent break |
| H3+ | Slide content | Keep as-is |
| `---` | Ignored by default | slide_breaks: hr → convert to slide break |

### Implementation

```typescript
import { PandocExecutor } from '../pandoc/executor.js';
import { PreProcessor } from '../pandoc/pre-processor.js';
import { PostProcessor } from '../pandoc/post-processor.js';

export async function convertToPptx(
  markdown: string,
  outputPath: string,
  options: PptxConversionOptions = {}
): Promise<PptxConversionResult> {
  const executor = new PandocExecutor();
  const preProcessor = new PreProcessor();
  const postProcessor = new PostProcessor();

  // 1. Pre-process
  const preResult = preProcessor.process(markdown);
  const { metadata } = preResult.extractedData;

  // 2. Execute Pandoc with slide-level configuration
  const pandocResult = await executor.convert(preResult.content, {
    inputFormat: 'markdown+yaml_metadata_block',
    outputFormat: 'pptx',
    standalone: true,
    defaultsFile: getDefaultsPath('pptx.yaml'),
    variables: {
      'slide-level': metadata.slide_breaks === 'h1' ? '1' : '2'
    },
    metadata: {
      title: metadata.title,
      author: metadata.author,
      date: metadata.date,
      slide_breaks: metadata.slide_breaks || 'h2'
    }
  });

  if (!pandocResult.success) {
    return { success: false, errors: [pandocResult.stderr], ... };
  }

  // 3. Post-process for classification footers, theme
  await postProcessor.process({
    format: 'pptx',
    outputPath: pandocResult.outputPath,
    extractedData: preResult.extractedData
  });

  // 4. Move to final location
  await fs.rename(pandocResult.outputPath, outputPath);

  return {
    success: true,
    outputPath,
    slideCount: await countSlides(outputPath),
    warnings: preResult.warnings
  };
}
```

### Preserve API Compatibility

The function signature and return type remain unchanged:
- Same parameters: `(markdown, outputPath, options?)`
- Same result shape includes slideCount for verification

### Slide Break Modes

Preserve existing behavior controlled by `slide_breaks` metadata:

**h1 mode:**
- Only H1 headings create new slides
- H2/H3 become bold text on current slide
- For long-form presentations with few slides

**h2 mode (default):**
- H1 creates title/section slides
- H2 creates content slides
- Standard presentation structure

**hr mode:**
- Horizontal rules (`---`) create slide breaks
- Manual control over slide boundaries
- Useful for specific layouts

### Theme Support

Preserve theme handling from current implementation:
- `theme: light` (default) - Light background, dark text
- `theme: dark` - Dark background, light text

Theme is applied via reference document variant or post-processing.

## Impact
- **Affected specs**: Updates `converters` capability
- **Affected code**:
  - `src/core/converters/pptx-converter.ts` (major refactor)
- **Dependencies**: Changes A, B, C, D (uses all Pandoc components)
- **Breaking changes**: None for public API

## Acceptance Criteria
1. All existing unit tests pass with new implementation
2. Slide breaks work correctly for all three modes (h1, h2, hr)
3. Title slides render with correct layout
4. Content slides have proper bullet formatting
5. Tables render on slides correctly
6. Images are positioned appropriately
7. Theme (light/dark) is applied correctly
8. Classification footers appear when specified
9. Slide count matches expected for test documents

## Testing Strategy

### Comparison Tests
- Count slides in old vs new output
- Verify slide titles match expected headings
- Check content placement on slides

### Visual Verification
- Manual review of sample presentations
- Verify styling matches reference template

## Priority
**6 of 7** - Second converter migration. Depends on A, B, C, D. Can run parallel with E.
