# Design: DOCX Converter Migration

## Overview

Refactor the DOCX converter to use the Pandoc-based pipeline (PreProcessor → PandocExecutor → PostProcessor) instead of the `docx` library directly.

## Current Architecture

```
markdown.ts (parser)
      │
      ▼
docx-converter.ts
      │
      ├── parseFrontMatter()
      ├── parseMarkdown()
      ├── splitIntoSections()
      ├── convertContentToDocx()  ← manual element creation
      └── docx library
            ├── Document, Paragraph, TextRun
            ├── Table, TableRow, TableCell
            └── Packer.toBuffer()
```

**Problems:**
- ESM/CJS interop issues with `docx` library (requires `createRequire` workaround)
- Manual AST-to-document mapping (~400 lines of conversion code)
- Inconsistent parsing vs. other formats
- Harder to maintain

## Target Architecture

```
docx-converter.ts
      │
      ├── PreProcessor.process()
      │     ├── Extract formulas (not used for DOCX, but consistent pipeline)
      │     ├── Parse metadata
      │     └── Normalize line endings
      │
      ├── PandocExecutor.convert()
      │     ├── Use defaults/docx.yaml
      │     ├── Apply section-breaks.lua filter
      │     └── Apply metadata-inject.lua filter
      │
      └── PostProcessor.process()
            ├── Add classification headers
            └── Patch document properties
```

**Benefits:**
- Consistent pipeline across all formats
- Pandoc handles markdown parsing and DOCX generation
- Lua filters handle section breaks
- PostProcessor handles classification/properties
- ~100 lines vs ~400 lines

## API Preservation

Both functions maintain their existing signatures:

```typescript
// File-based conversion (reads file, infers output path)
convertToDocx(inputPath: string, outputPath?: string, options?: DocxConversionOptions)
  → Promise<DocxConversionResult>

// String-based conversion (takes content directly)
convertMarkdownToDocx(markdown: string, outputPath: string, options?: DocxConversionOptions)
  → Promise<DocxConversionResult>
```

**Result shape unchanged:**
```typescript
interface DocxConversionResult {
  success: boolean;
  outputPath: string;
  pageCount?: number;  // May not be available with Pandoc
  warnings: string[];
}
```

## Implementation Strategy

### Phase 1: Refactor `convertMarkdownToDocx`

This is the core function that takes markdown content and produces DOCX.

```typescript
export async function convertMarkdownToDocx(
  markdown: string,
  outputPath: string,
  options: DocxConversionOptions = {}
): Promise<DocxConversionResult> {
  const executor = new PandocExecutor();
  const preProcessor = new PreProcessor();
  const postProcessor = new PostProcessor();

  // 1. Pre-process (extract metadata, normalize content)
  const preResult = preProcessor.process(markdown);
  const allWarnings = [...preResult.warnings];

  // 2. Build Pandoc options
  const pandocOptions = buildPandocOptions(preResult.extractedData.metadata);

  // 3. Execute Pandoc conversion
  const pandocResult = await executor.convert(
    preResult.content,
    pandocOptions,
    outputPath
  );

  if (!pandocResult.success) {
    throw new ConversionError(pandocResult.stderr, 'docx', outputPath);
  }

  // 4. Post-process (classification headers, properties)
  const postResult = await postProcessor.process({
    format: 'docx',
    outputPath,
    extractedData: preResult.extractedData,
  });

  allWarnings.push(...postResult.warnings);

  return {
    success: true,
    outputPath,
    warnings: allWarnings,
  };
}
```

### Phase 2: Update `convertToDocx`

File-based function becomes a thin wrapper:

```typescript
export async function convertToDocx(
  inputPath: string,
  outputPath?: string,
  options: DocxConversionOptions = {}
): Promise<DocxConversionResult> {
  // Read file
  const markdown = await fs.readFile(inputPath, 'utf-8');

  // Determine output path
  const output = outputPath || inputPath.replace(/\.md$/, '.docx');

  // Ensure output directory exists
  await fs.mkdir(path.dirname(output), { recursive: true });

  // Delegate to string-based conversion
  return convertMarkdownToDocx(markdown, output, options);
}
```

### Phase 3: Build Pandoc Options Helper

```typescript
function buildPandocOptions(metadata: DocumentMetadata | null): PandocOptions {
  const options: PandocOptions = {
    inputFormat: 'markdown+yaml_metadata_block+pipe_tables+fenced_code_blocks',
    outputFormat: 'docx',
    standalone: true,
    filters: [
      getFilterPath(FILTERS.METADATA_INJECT),
      getFilterPath(FILTERS.SECTION_BREAKS),
    ],
  };

  // Add reference doc if it exists
  const refDoc = getTemplatePath('reference.docx');
  if (existsSync(refDoc)) {
    options.referenceDoc = refDoc;
  }

  // Pass metadata for filters
  if (metadata) {
    options.metadata = {
      section_breaks: metadata.section_breaks || 'auto',
    };
  }

  return options;
}
```

## Section Breaks Handling

Section breaks are now handled by the `section-breaks.lua` filter:

| Mode | Behavior |
|------|----------|
| `auto` (default) | Page break before H2 only |
| `all` | Page break before H2, H3, and at HR |
| `none` | No automatic page breaks |

The filter reads `section_breaks` from metadata and inserts raw OpenXML page breaks.

## Error Handling

```typescript
try {
  // ... conversion logic
} catch (error) {
  if (error instanceof PandocNotFoundError) {
    throw new ConversionError('Pandoc not installed', 'docx', outputPath);
  }
  if (error instanceof PandocConversionError) {
    throw new ConversionError(error.message, 'docx', outputPath);
  }
  throw error;
}
```

## Removed Code

The following will be removed:
- `createRequire` workaround for `docx` library
- All `docx` library type definitions (lines 12-130)
- `splitIntoSections()` function
- `convertContentToDocx()` function
- `createHeading()`, `createParagraph()`, `createList()`, etc.
- `parseInlineFormatting()`, `segmentToTextRun()`
- `createTable()`, `createCodeBlock()`, `createHorizontalRule()`

## Testing Strategy

All existing tests should pass without modification:
- `convertToDocx` with file path
- `convertMarkdownToDocx` with string content
- Tables, code blocks, inline formatting
- Section breaks
- Metadata handling

Additional tests:
- Verify Pandoc errors are properly wrapped
- Verify classification headers are added
- Verify document properties are set

## Dependencies

**Requires (already implemented):**
- Change A: PandocExecutor
- Change B: PreProcessor
- Change C: Lua filters (section-breaks.lua)
- Change D: PostProcessor (classification headers, properties)

**Removes (in Change H):**
- `docx` library dependency
