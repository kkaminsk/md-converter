# Change: E - DOCX Converter Migration

## Why
The current DOCX converter uses the `docx` library directly, with manual AST-to-document mapping. Migrating to Pandoc:
- Eliminates ESM/CJS interop issues with the docx library
- Provides more reliable markdown parsing
- Enables consistent handling across all output formats
- Reduces maintenance burden

## What Changes

### Refactor `src/core/converters/docx-converter.ts`

Replace the current implementation with Pandoc-based conversion:

```typescript
export async function convertToDocx(
  markdown: string,
  outputPath: string,
  options?: DocxConversionOptions
): Promise<DocxConversionResult>
```

### New Conversion Flow

```
1. Pre-process markdown
   ├── Extract formulas (store for reference)
   ├── Parse front matter
   └── Normalize content

2. Execute Pandoc
   ├── Use defaults/docx.yaml configuration
   ├── Apply section-breaks.lua filter
   ├── Apply metadata-inject.lua filter
   └── Use reference.docx template

3. Post-process output
   ├── Inject classification headers/footers
   ├── Patch document properties
   └── Apply any final style fixes

4. Return result
   ├── Success status
   ├── Output path
   ├── Warnings collected
   └── Metadata extracted
```

### Implementation

```typescript
import { PandocExecutor } from '../pandoc/executor.js';
import { PreProcessor } from '../pandoc/pre-processor.js';
import { PostProcessor } from '../pandoc/post-processor.js';
import { getDefaultsPath, getTemplatePath } from '../pandoc/filters.js';

export async function convertToDocx(
  markdown: string,
  outputPath: string,
  options: DocxConversionOptions = {}
): Promise<DocxConversionResult> {
  const executor = new PandocExecutor();
  const preProcessor = new PreProcessor();
  const postProcessor = new PostProcessor();

  // 1. Pre-process
  const preResult = preProcessor.process(markdown);

  // 2. Validate (if enabled)
  if (options.validate !== false) {
    const validation = await validateDocument(markdown);
    if (!validation.valid && options.strict) {
      return { success: false, errors: validation.errors, ... };
    }
  }

  // 3. Build Pandoc command
  const pandocResult = await executor.convert(preResult.content, {
    inputFormat: 'markdown+yaml_metadata_block',
    outputFormat: 'docx',
    standalone: true,
    defaultsFile: getDefaultsPath('docx.yaml'),
    metadata: preResult.extractedData.metadata
  });

  if (!pandocResult.success) {
    return { success: false, errors: [pandocResult.stderr], ... };
  }

  // 4. Post-process
  await postProcessor.process({
    format: 'docx',
    outputPath: pandocResult.outputPath,
    extractedData: preResult.extractedData
  });

  // 5. Move to final location
  await fs.rename(pandocResult.outputPath, outputPath);

  return { success: true, outputPath, warnings: preResult.warnings, ... };
}
```

### Preserve API Compatibility

The function signature and return type remain unchanged:
- Same parameters: `(markdown, outputPath, options?)`
- Same result shape: `{ success, outputPath?, warnings, errors, metadata }`
- Same options: `{ strict?, validate? }`

### Remove Old Dependencies

After migration is complete:
- Remove direct `docx` library usage from this file
- The `docx` package can be removed from package.json in Change G

### Section Break Behavior

Preserve existing behavior controlled by `section_breaks` metadata:
- **auto**: Page break before H2 (handled by section-breaks.lua)
- **all**: Page break before H2/H3 and at HR
- **none**: No automatic breaks

## Impact
- **Affected specs**: Updates `converters` capability
- **Affected code**:
  - `src/core/converters/docx-converter.ts` (major refactor)
- **Dependencies**: Changes A, B, C, D (uses all Pandoc components)
- **Breaking changes**: None for public API

## Acceptance Criteria
1. All existing unit tests pass with new implementation
2. Output quality matches or exceeds current implementation
3. Section breaks work correctly for all three modes
4. Document properties (title, author, date) are correctly set
5. Tables render with proper styling
6. Code blocks use correct formatting
7. Inline formatting (bold, italic, code) preserved
8. Links are clickable
9. Performance is within acceptable range (<500ms for typical documents)

## Testing Strategy

### Comparison Tests
Run both old and new converters on test fixtures, compare:
- Paragraph count
- Heading hierarchy
- Table structure
- Text content extraction

### Regression Tests
- All existing test cases must pass
- Add new tests for edge cases discovered during migration

## Priority
**5 of 7** - First converter migration. Depends on A, B, C, D.
