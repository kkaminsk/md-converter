# Pandoc Integration Specification

## Executive Summary

This specification details the migration of MD Converter from library-specific converters (`docx`, `exceljs`, `pptxgenjs`) to a Pandoc-based conversion architecture. Pandoc provides a unified, battle-tested document conversion engine with native support for multiple input/output formats, reducing maintenance burden while expanding format support.

---

## 1. Rationale for Migration

### Current Architecture Limitations

| Aspect | Current Approach | Issues |
|--------|-----------------|--------|
| **Dependencies** | 3 separate libraries (docx, exceljs, pptxgenjs) | Different APIs, update cycles, breaking changes |
| **Markdown parsing** | Custom markdown-it integration | Must manually map AST to each output format |
| **Format fidelity** | Library-specific workarounds | ESM/CJS interop issues, incomplete feature coverage |
| **Maintenance** | 3 converter implementations | Triplicated formatting logic, divergent behavior |
| **Extensibility** | Requires new library per format | Cannot easily add PDF, HTML, LaTeX, etc. |

### Pandoc Advantages

1. **Single conversion engine** - One tool handles all format transformations
2. **Battle-tested** - 18+ years of development, used by publishers and academics worldwide
3. **Rich format support** - 40+ input formats, 60+ output formats
4. **Lua filters** - Extensible transformation pipeline without modifying source
5. **Reference documents** - Template-based styling for consistent output
6. **Active maintenance** - Regular releases with backward compatibility
7. **Native Office support** - First-class DOCX, PPTX output; XLSX via extensions

---

## 2. Pandoc Overview

### Installation Requirements

```bash
# Windows (winget)
winget install JohnMacFarlane.Pandoc

# macOS (Homebrew)
brew install pandoc

# Linux (apt)
sudo apt install pandoc

# Verify installation
pandoc --version
```

**Minimum Version:** Pandoc 3.0+ (for modern Office format support)

### Core Conversion Model

```
Input Document → Pandoc AST → Output Document
     ↑               ↑              ↑
  Readers         Filters        Writers
```

Pandoc converts all inputs to an internal Abstract Syntax Tree (AST), then writes to output formats. This allows:
- Consistent transformation regardless of input/output pairing
- Lua/JSON filters to modify the AST
- Custom templates for output styling

---

## 3. Architecture Overview

### Proposed System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLI / MCP Layer                            │
│                         (unchanged interface)                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Conversion Orchestrator                        │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────────┐ │
│  │ Front Matter    │  │ Validation       │  │ Format Router          │ │
│  │ Parser          │  │ Engine           │  │ (docx/xlsx/pptx/pdf)   │ │
│  │ (unchanged)     │  │ (unchanged)      │  │                        │ │
│  └─────────────────┘  └──────────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Pandoc Adapter Layer                           │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────────┐ │
│  │ Pre-Processor   │  │ Pandoc Executor  │  │ Post-Processor         │ │
│  │ - Formula       │  │ - spawn pandoc   │  │ - Formula injection    │ │
│  │   extraction    │  │ - manage temp    │  │ - Metadata patching    │ │
│  │ - Metadata      │  │   files          │  │ - Style application    │ │
│  │   injection     │  │ - handle errors  │  │                        │ │
│  └─────────────────┘  └──────────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            Pandoc Runtime                               │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────────┐ │
│  │ Lua Filters     │  │ Reference Docs   │  │ Custom Templates       │ │
│  │ (src/pandoc/    │  │ (templates/)     │  │ (templates/)           │ │
│  │  filters/)      │  │                  │  │                        │ │
│  └─────────────────┘  └──────────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Directory Structure Changes

```
src/
├── index.ts                    # Main exports (unchanged)
├── cli/
│   └── index.ts               # CLI entry point (unchanged)
├── core/
│   ├── converters/
│   │   ├── pandoc-adapter.ts  # NEW: Pandoc process wrapper
│   │   ├── docx-converter.ts  # REFACTOR: Uses pandoc-adapter
│   │   ├── xlsx-converter.ts  # REFACTOR: Pandoc + post-processing
│   │   ├── pptx-converter.ts  # REFACTOR: Uses pandoc-adapter
│   │   └── section-rules.ts   # KEEP: Section/slide break logic
│   ├── parsers/
│   │   ├── markdown.ts        # KEEP: For validation/preview
│   │   ├── frontmatter-parser.ts  # KEEP: YAML metadata
│   │   ├── table-parser.ts    # KEEP: For XLSX formula processing
│   │   └── formula-parser.ts  # KEEP: Formula validation
│   ├── validators/
│   │   └── document-validator.ts  # KEEP: Document validation
│   └── pandoc/                # NEW: Pandoc-specific components
│       ├── executor.ts        # Process spawning & management
│       ├── pre-processor.ts   # Markdown preprocessing
│       ├── post-processor.ts  # Output post-processing
│       └── filters/           # Lua filter files
│           ├── section-breaks.lua
│           ├── slide-breaks.lua
│           └── metadata-inject.lua
├── mcp/
│   ├── server.ts              # MCP server (unchanged)
│   └── tools.ts               # MCP tool definitions (unchanged)
└── templates/                  # NEW: Reference documents
    ├── reference.docx         # Word styling template
    ├── reference.pptx         # PowerPoint template
    └── defaults/
        ├── docx.yaml          # Pandoc defaults for DOCX
        ├── pptx.yaml          # Pandoc defaults for PPTX
        └── xlsx.yaml          # Pandoc defaults for table extraction
```

---

## 4. Component Specifications

### 4.1 Pandoc Executor (`src/core/pandoc/executor.ts`)

The core module for spawning and managing Pandoc processes.

```typescript
interface PandocOptions {
  inputFormat: 'markdown' | 'markdown+yaml_metadata_block';
  outputFormat: 'docx' | 'pptx' | 'json';
  filters?: string[];
  referenceDoc?: string;
  variables?: Record<string, string>;
  metadata?: Record<string, unknown>;
  resourcePath?: string[];
  dataDir?: string;
  standalone?: boolean;
  tableOfContents?: boolean;
  numberSections?: boolean;
}

interface PandocResult {
  success: boolean;
  outputPath?: string;
  outputBuffer?: Buffer;
  stderr: string;
  exitCode: number;
  duration: number;
}

interface PandocExecutor {
  /**
   * Check if Pandoc is installed and meets version requirements
   */
  checkInstallation(): Promise<{
    installed: boolean;
    version?: string;
    path?: string;
    error?: string;
  }>;

  /**
   * Convert content using Pandoc
   * @param input - Markdown content or path to input file
   * @param options - Conversion options
   * @param outputPath - Optional output file path (uses temp file if not provided)
   */
  convert(
    input: string | Buffer,
    options: PandocOptions,
    outputPath?: string
  ): Promise<PandocResult>;

  /**
   * Convert to Pandoc AST JSON for inspection/manipulation
   */
  toAST(input: string): Promise<PandocAST>;

  /**
   * Convert from Pandoc AST JSON to output format
   */
  fromAST(ast: PandocAST, options: PandocOptions): Promise<PandocResult>;
}
```

**Implementation Details:**

1. **Process Management**
   - Use `child_process.spawn` for better stream handling
   - Pipe stdin for content input (avoids temp files when possible)
   - Capture stdout/stderr for output/errors
   - Implement timeout handling (default: 30 seconds)
   - Clean up temp files on completion or error

2. **Error Handling**
   ```typescript
   class PandocNotFoundError extends Error {
     constructor() {
       super('Pandoc is not installed or not in PATH');
       this.name = 'PandocNotFoundError';
     }
   }

   class PandocVersionError extends Error {
     constructor(required: string, found: string) {
       super(`Pandoc version ${required}+ required, found ${found}`);
       this.name = 'PandocVersionError';
     }
   }

   class PandocConversionError extends Error {
     constructor(
       message: string,
       public stderr: string,
       public exitCode: number
     ) {
       super(message);
       this.name = 'PandocConversionError';
     }
   }
   ```

3. **Command Building**
   ```typescript
   function buildCommand(options: PandocOptions): string[] {
     const args: string[] = [
       '--from', options.inputFormat,
       '--to', options.outputFormat,
     ];

     if (options.standalone) args.push('--standalone');
     if (options.referenceDoc) args.push('--reference-doc', options.referenceDoc);
     if (options.tableOfContents) args.push('--toc');
     if (options.numberSections) args.push('--number-sections');

     for (const filter of options.filters ?? []) {
       args.push('--lua-filter', filter);
     }

     for (const [key, value] of Object.entries(options.variables ?? {})) {
       args.push('--variable', `${key}=${value}`);
     }

     for (const [key, value] of Object.entries(options.metadata ?? {})) {
       args.push('--metadata', `${key}=${JSON.stringify(value)}`);
     }

     for (const path of options.resourcePath ?? []) {
       args.push('--resource-path', path);
     }

     return args;
   }
   ```

### 4.2 Pre-Processor (`src/core/pandoc/pre-processor.ts`)

Transforms markdown content before Pandoc processing.

```typescript
interface PreProcessorResult {
  content: string;
  extractedData: {
    formulas: FormulaLocation[];
    metadata: DocumentMetadata;
    tableCount: number;
  };
  warnings: string[];
}

interface FormulaLocation {
  tableIndex: number;
  row: number;
  column: number;
  formula: string;
  placeholder: string;
}

interface PreProcessor {
  /**
   * Process markdown before sending to Pandoc
   */
  process(markdown: string): PreProcessorResult;
}
```

**Key Responsibilities:**

1. **Formula Extraction**
   - Scan tables for `{=FORMULA}` patterns
   - Replace with placeholders (e.g., `__FORMULA_0_2_3__`)
   - Store formula locations for post-processing
   - Validate formulas during extraction

2. **Metadata Normalization**
   - Parse YAML front matter
   - Convert to Pandoc-compatible format
   - Handle custom fields (section_breaks, slide_breaks, etc.)

3. **Content Preparation**
   - Normalize line endings
   - Handle special characters
   - Process classification headers

### 4.3 Post-Processor (`src/core/pandoc/post-processor.ts`)

Transforms Pandoc output to final format.

```typescript
interface PostProcessorOptions {
  format: 'docx' | 'xlsx' | 'pptx';
  extractedData: PreProcessorResult['extractedData'];
  metadata: DocumentMetadata;
}

interface PostProcessor {
  /**
   * Process Pandoc output
   * @param outputPath - Path to Pandoc output file
   * @param options - Post-processing options
   * @returns Path to final output file
   */
  process(outputPath: string, options: PostProcessorOptions): Promise<string>;
}
```

**Format-Specific Processing:**

1. **DOCX Post-Processing**
   - Apply custom styles not available via reference doc
   - Inject section breaks based on metadata
   - Add classification headers/footers
   - Patch document properties

2. **XLSX Post-Processing**
   - Replace formula placeholders with actual formulas
   - Apply cell formatting (dates, numbers, currency)
   - Add worksheet metadata
   - Freeze header rows

3. **PPTX Post-Processing**
   - Adjust slide layouts
   - Apply theme colors
   - Add speaker notes metadata

### 4.4 Lua Filters

Lua filters modify the Pandoc AST during conversion.

#### Section Breaks Filter (`filters/section-breaks.lua`)

```lua
-- section-breaks.lua
-- Inserts section breaks before H2 headings based on metadata

local section_breaks_mode = 'auto'

function Meta(meta)
  if meta.section_breaks then
    section_breaks_mode = pandoc.utils.stringify(meta.section_breaks)
  end
  return meta
end

function Header(elem)
  if section_breaks_mode == 'auto' and elem.level == 2 then
    -- Insert page break before H2
    local pagebreak = pandoc.RawBlock('openxml',
      '<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
    return {pagebreak, elem}
  elseif section_breaks_mode == 'all' and elem.level <= 3 then
    local pagebreak = pandoc.RawBlock('openxml',
      '<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
    return {pagebreak, elem}
  end
  return elem
end

function HorizontalRule(elem)
  if section_breaks_mode == 'all' then
    return pandoc.RawBlock('openxml',
      '<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
  end
  return elem
end
```

#### Slide Breaks Filter (`filters/slide-breaks.lua`)

```lua
-- slide-breaks.lua
-- Controls slide breaking behavior for PPTX output

local slide_breaks_mode = 'h2'

function Meta(meta)
  if meta.slide_breaks then
    slide_breaks_mode = pandoc.utils.stringify(meta.slide_breaks)
  end
  return meta
end

function Header(elem)
  -- Pandoc's default PPTX writer creates slides at H1 and H2
  -- This filter adjusts behavior based on metadata

  if slide_breaks_mode == 'h1' then
    -- Only H1 creates new slides
    if elem.level > 1 then
      elem.level = elem.level + 1  -- Demote to prevent slide break
    end
  elseif slide_breaks_mode == 'h2' then
    -- H1 and H2 create slides (default Pandoc behavior)
    -- No modification needed
  end

  return elem
end

function HorizontalRule(elem)
  if slide_breaks_mode == 'hr' then
    -- Convert HR to a slide-breaking header
    return pandoc.Header(1, {pandoc.Str("")})
  end
  return elem
end
```

#### Metadata Injection Filter (`filters/metadata-inject.lua`)

```lua
-- metadata-inject.lua
-- Injects custom metadata into document properties

function Meta(meta)
  -- Ensure standard fields are set
  if not meta.title then
    meta.title = pandoc.MetaString("Untitled Document")
  end

  -- Map our custom fields to standard Pandoc metadata
  if meta.classification then
    meta.subject = meta.classification
  end

  -- Convert date format
  if meta.date then
    local date_str = pandoc.utils.stringify(meta.date)
    -- Pandoc expects ISO 8601 format
    meta.date = pandoc.MetaString(date_str)
  end

  return meta
end
```

---

## 5. Format-Specific Implementation

### 5.1 DOCX Conversion

**Pandoc Command:**
```bash
pandoc input.md \
  --from markdown+yaml_metadata_block \
  --to docx \
  --output output.docx \
  --reference-doc templates/reference.docx \
  --lua-filter filters/section-breaks.lua \
  --lua-filter filters/metadata-inject.lua \
  --standalone
```

**Reference Document (`templates/reference.docx`):**

Create a Word document with custom styles:

| Style Name | Purpose | Formatting |
|------------|---------|------------|
| Title | Document title | 24pt, Bold, Centered |
| Heading 1 | H1 headings | 18pt, Bold, Blue |
| Heading 2 | H2 headings | 16pt, Bold |
| Heading 3 | H3 headings | 14pt, Bold |
| Normal | Body text | 11pt, Calibri |
| Code | Code blocks | 10pt, Consolas, Gray background |
| Table | Table cells | 10pt, Bordered |
| Block Text | Blockquotes | 11pt, Italic, Indented |

**Converter Implementation:**

```typescript
// src/core/converters/docx-converter.ts
import { PandocExecutor } from '../pandoc/executor.js';
import { PreProcessor } from '../pandoc/pre-processor.js';
import { PostProcessor } from '../pandoc/post-processor.js';
import { parseFrontMatter } from '../parsers/frontmatter-parser.js';

export interface DocxConversionOptions {
  strict?: boolean;
  validate?: boolean;
}

export interface DocxConversionResult {
  success: boolean;
  outputPath?: string;
  warnings: string[];
  errors: string[];
  metadata: DocumentMetadata;
}

export async function convertToDocx(
  markdown: string,
  outputPath: string,
  options: DocxConversionOptions = {}
): Promise<DocxConversionResult> {
  const executor = new PandocExecutor();
  const preProcessor = new PreProcessor();
  const postProcessor = new PostProcessor();

  // Pre-process markdown
  const preResult = preProcessor.process(markdown);
  const { content, extractedData, warnings } = preResult;
  const { metadata } = extractedData;

  // Validate if requested
  if (options.validate !== false) {
    const validation = await validateDocument(markdown);
    if (!validation.valid && options.strict) {
      return {
        success: false,
        warnings: validation.warnings,
        errors: validation.errors,
        metadata
      };
    }
    warnings.push(...validation.warnings);
  }

  // Build Pandoc options
  const pandocOptions: PandocOptions = {
    inputFormat: 'markdown+yaml_metadata_block',
    outputFormat: 'docx',
    standalone: true,
    referenceDoc: getTemplatePath('reference.docx'),
    filters: [
      getFilterPath('section-breaks.lua'),
      getFilterPath('metadata-inject.lua')
    ],
    metadata: {
      title: metadata.title,
      author: metadata.author,
      date: metadata.date,
      subject: metadata.classification
    }
  };

  // Execute Pandoc
  const tempOutput = getTempPath('.docx');
  const result = await executor.convert(content, pandocOptions, tempOutput);

  if (!result.success) {
    return {
      success: false,
      warnings,
      errors: [result.stderr],
      metadata
    };
  }

  // Post-process if needed
  await postProcessor.process(tempOutput, {
    format: 'docx',
    extractedData,
    metadata
  });

  // Move to final location
  await fs.rename(tempOutput, outputPath);

  return {
    success: true,
    outputPath,
    warnings,
    errors: [],
    metadata
  };
}
```

### 5.2 PPTX Conversion

**Pandoc Command:**
```bash
pandoc input.md \
  --from markdown+yaml_metadata_block \
  --to pptx \
  --output output.pptx \
  --reference-doc templates/reference.pptx \
  --lua-filter filters/slide-breaks.lua \
  --lua-filter filters/metadata-inject.lua \
  --standalone
```

**Reference Document (`templates/reference.pptx`):**

PowerPoint template with:
- Title slide layout
- Content slide layout
- Two-column layout
- Section header layout
- Consistent theme (light/dark variants)
- Master slide with footer placeholders

**Slide Structure Mapping:**

| Markdown Element | PPTX Output |
|-----------------|-------------|
| H1 (first) | Title slide |
| H1 (subsequent) | Section header slide |
| H2 | Content slide title |
| H3 | Slide subtitle or bold text |
| Bullet list | Slide body bullets |
| Image | Slide with image |
| Table | Slide with table |
| `---` | Slide break (if slide_breaks: hr) |

### 5.3 XLSX Conversion

XLSX conversion requires special handling since Pandoc doesn't natively output Excel format.

**Strategy: Hybrid Approach**

1. Use Pandoc to parse markdown and extract structured table data
2. Use existing ExcelJS integration for Excel generation
3. Leverage Pandoc AST for consistent table parsing

**Alternative: Pandoc → CSV → Excel**

```bash
# Extract tables as CSV
pandoc input.md --to plain --lua-filter extract-tables.lua > tables.csv

# Or use JSON AST
pandoc input.md --to json | node process-tables.js
```

**Recommended Implementation:**

```typescript
// src/core/converters/xlsx-converter.ts
import { PandocExecutor } from '../pandoc/executor.js';
import { PreProcessor } from '../pandoc/pre-processor.js';
import ExcelJS from 'exceljs';

export async function convertToXlsx(
  markdown: string,
  outputPath: string,
  options: XlsxConversionOptions = {}
): Promise<XlsxConversionResult> {
  const executor = new PandocExecutor();
  const preProcessor = new PreProcessor();

  // Pre-process to extract formulas
  const { content, extractedData } = preProcessor.process(markdown);
  const { formulas, metadata } = extractedData;

  // Get Pandoc AST for reliable table extraction
  const ast = await executor.toAST(content);

  // Extract tables from AST
  const tables = extractTablesFromAST(ast);

  // Create workbook using ExcelJS
  const workbook = new ExcelJS.Workbook();
  workbook.creator = metadata.author || 'MD Converter';
  workbook.title = metadata.title;

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const worksheet = workbook.addWorksheet(
      table.caption || `Table ${i + 1}`
    );

    // Add headers
    worksheet.addRow(table.headers);

    // Add data rows with formula injection
    for (const row of table.rows) {
      const processedRow = row.map((cell, colIndex) => {
        // Check if this cell has a formula
        const formula = formulas.find(
          f => f.tableIndex === i &&
               f.row === table.rows.indexOf(row) + 1 &&
               f.column === colIndex
        );

        if (formula) {
          return { formula: formula.formula };
        }

        return processCell(cell, metadata.date_format);
      });

      worksheet.addRow(processedRow);
    }

    // Apply formatting
    applyWorksheetFormatting(worksheet, metadata);
  }

  await workbook.xlsx.writeFile(outputPath);

  return {
    success: true,
    outputPath,
    worksheets: tables.map(t => t.caption || 'Untitled'),
    formulaCount: formulas.length,
    warnings: []
  };
}

function extractTablesFromAST(ast: PandocAST): ExtractedTable[] {
  const tables: ExtractedTable[] = [];

  function walk(blocks: PandocBlock[]) {
    for (const block of blocks) {
      if (block.t === 'Table') {
        tables.push(parseTableBlock(block));
      } else if (block.c && Array.isArray(block.c)) {
        walk(block.c);
      }
    }
  }

  walk(ast.blocks);
  return tables;
}
```

---

## 6. Migration Strategy

### Phase 1: Foundation (Week 1-2)

1. **Install Pandoc dependency management**
   - Add installation check on startup
   - Provide helpful error messages if not installed
   - Document installation in README

2. **Implement PandocExecutor**
   - Process spawning with proper stream handling
   - Error capture and structured error types
   - Timeout management
   - Temp file cleanup

3. **Create base Lua filters**
   - section-breaks.lua
   - slide-breaks.lua
   - metadata-inject.lua

4. **Create reference documents**
   - reference.docx with styles
   - reference.pptx with layouts

### Phase 2: DOCX Migration (Week 2-3)

1. **Implement DOCX converter using Pandoc**
2. **Create comprehensive test suite**
3. **Compare output quality with current implementation**
4. **Handle edge cases (complex tables, nested lists)**
5. **Deprecate old docx-converter.ts

### Phase 3: PPTX Migration (Week 3-4)

1. **Implement PPTX converter using Pandoc**
2. **Test slide break behaviors**
3. **Verify theme/styling application**
4. **Deprecate old pptx-converter.ts

### Phase 4: XLSX Hybrid (Week 4-5)

1. **Implement Pandoc AST table extraction**
2. **Integrate with existing ExcelJS pipeline**
3. **Ensure formula handling remains functional**
4. **Verify date/number formatting**

### Phase 5: Cleanup & Documentation (Week 5-6)

1. **Remove old library dependencies**
2. **Update documentation**
3. **Performance benchmarking**
4. **Edge case testing**

---

## 7. Configuration

### Pandoc Defaults Files

**`templates/defaults/docx.yaml`:**
```yaml
from: markdown+yaml_metadata_block+pipe_tables+grid_tables
to: docx
standalone: true
reference-doc: templates/reference.docx
lua-filter:
  - filters/section-breaks.lua
  - filters/metadata-inject.lua
variables:
  documentclass: article
metadata:
  lang: en-US
```

**`templates/defaults/pptx.yaml`:**
```yaml
from: markdown+yaml_metadata_block+pipe_tables
to: pptx
standalone: true
reference-doc: templates/reference.pptx
lua-filter:
  - filters/slide-breaks.lua
  - filters/metadata-inject.lua
slide-level: 2
metadata:
  lang: en-US
```

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `PANDOC_PATH` | Custom Pandoc binary location | Auto-detect |
| `MD_CONVERTER_TEMPLATES` | Custom templates directory | `./templates` |
| `MD_CONVERTER_FILTERS` | Custom filters directory | `./filters` |
| `PANDOC_TIMEOUT` | Conversion timeout (ms) | `30000` |

---

## 8. Error Handling

### Error Hierarchy

```typescript
// Base error
class ConverterError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ConverterError';
  }
}

// Pandoc-specific errors
class PandocNotFoundError extends ConverterError {
  constructor() {
    super(
      'Pandoc is not installed. Install from https://pandoc.org/installing.html',
      'PANDOC_NOT_FOUND'
    );
  }
}

class PandocVersionError extends ConverterError {
  constructor(required: string, found: string) {
    super(
      `Pandoc ${required}+ required, found ${found}`,
      'PANDOC_VERSION',
      { required, found }
    );
  }
}

class PandocConversionError extends ConverterError {
  constructor(format: string, stderr: string, exitCode: number) {
    super(
      `Pandoc conversion to ${format} failed`,
      'PANDOC_CONVERSION',
      { format, stderr, exitCode }
    );
  }
}

class FilterError extends ConverterError {
  constructor(filterName: string, error: string) {
    super(
      `Lua filter '${filterName}' failed: ${error}`,
      'FILTER_ERROR',
      { filterName, error }
    );
  }
}
```

### User-Friendly Error Messages

| Error Code | User Message | Resolution |
|------------|--------------|------------|
| `PANDOC_NOT_FOUND` | Pandoc is required but not installed | Install Pandoc from pandoc.org |
| `PANDOC_VERSION` | Pandoc version too old | Upgrade Pandoc to 3.0+ |
| `PANDOC_CONVERSION` | Conversion failed | Check markdown syntax |
| `FILTER_ERROR` | Custom filter failed | Check filter file exists |
| `TEMPLATE_NOT_FOUND` | Reference document missing | Reinstall or specify path |

---

## 9. Testing Strategy

### Unit Tests

```typescript
describe('PandocExecutor', () => {
  it('should detect Pandoc installation', async () => {
    const executor = new PandocExecutor();
    const result = await executor.checkInstallation();
    expect(result.installed).toBe(true);
    expect(result.version).toMatch(/^\d+\.\d+/);
  });

  it('should convert markdown to DOCX', async () => {
    const executor = new PandocExecutor();
    const result = await executor.convert(
      '# Hello\n\nWorld',
      { inputFormat: 'markdown', outputFormat: 'docx', standalone: true }
    );
    expect(result.success).toBe(true);
    expect(result.outputBuffer).toBeDefined();
  });

  it('should handle conversion errors gracefully', async () => {
    const executor = new PandocExecutor();
    const result = await executor.convert(
      '# Test',
      { inputFormat: 'markdown', outputFormat: 'invalid_format' as any }
    );
    expect(result.success).toBe(false);
    expect(result.stderr).toContain('Unknown');
  });
});
```

### Integration Tests

```typescript
describe('DOCX Conversion', () => {
  it('should preserve heading hierarchy', async () => {
    const md = `
---
title: Test
format: docx
---

# Heading 1
## Heading 2
### Heading 3
`;
    const result = await convertToDocx(md, 'test.docx');
    expect(result.success).toBe(true);

    // Verify DOCX structure
    const doc = await readDocx('test.docx');
    expect(doc.headings).toEqual([
      { level: 1, text: 'Heading 1' },
      { level: 2, text: 'Heading 2' },
      { level: 3, text: 'Heading 3' }
    ]);
  });

  it('should apply section breaks correctly', async () => {
    const md = `
---
title: Test
format: docx
section_breaks: auto
---

# Chapter 1
Content

## Section 1.1
More content

## Section 1.2
Even more
`;
    const result = await convertToDocx(md, 'test.docx');

    // Verify section breaks before H2
    const doc = await readDocx('test.docx');
    expect(doc.sectionBreaks).toBe(2); // Before each H2
  });
});
```

### Comparison Tests

```typescript
describe('Pandoc vs Current Output Comparison', () => {
  it('should produce equivalent DOCX output', async () => {
    const md = readFileSync('fixtures/complex.md', 'utf8');

    const currentResult = await currentConvertToDocx(md, 'current.docx');
    const pandocResult = await pandocConvertToDocx(md, 'pandoc.docx');

    // Compare structural elements
    const current = await parseDocx('current.docx');
    const pandoc = await parseDocx('pandoc.docx');

    expect(pandoc.paragraphCount).toBe(current.paragraphCount);
    expect(pandoc.headings).toEqual(current.headings);
    expect(pandoc.tables.length).toBe(current.tables.length);
  });
});
```

---

## 10. Performance Considerations

### Benchmarks

| Operation | Current (avg) | Pandoc (expected) | Notes |
|-----------|--------------|-------------------|-------|
| Simple DOCX | 150ms | 200ms | Pandoc process startup overhead |
| Complex DOCX | 500ms | 350ms | Pandoc more efficient for large docs |
| PPTX | 300ms | 250ms | Pandoc native PPTX support |
| XLSX | 200ms | 220ms | Hybrid approach similar |
| Batch (10 files) | 2000ms | 1500ms | Reuse Pandoc process |

### Optimization Strategies

1. **Process Pooling** - Keep Pandoc server running for batch operations
2. **Parallel Conversion** - Convert multiple files simultaneously
3. **Caching** - Cache Pandoc AST for repeated operations
4. **Streaming** - Pipe directly to Pandoc stdin, avoid temp files

---

## 11. Backward Compatibility

### API Compatibility

The public API remains unchanged:

```typescript
// These signatures remain identical
convertToDocx(markdown: string, outputPath: string, options?: DocxConversionOptions)
convertToXlsx(markdown: string, outputPath: string, options?: XlsxConversionOptions)
convertToPptx(markdown: string, outputPath: string, options?: PptxConversionOptions)
```

### CLI Compatibility

All existing CLI commands continue to work:

```bash
md-convert document.md --format docx
md-convert document.md --format xlsx
md-convert document.md --format pptx
md-convert preview document.md
md-convert validate document.md
```

### MCP Tool Compatibility

MCP tools maintain identical schemas and behavior:

```typescript
// Tool definitions unchanged
convert_md_to_docx({ content, outputPath, options })
convert_md_to_xlsx({ content, outputPath, options })
convert_md_to_pptx({ content, outputPath, options })
```

### Breaking Changes

None for end users. Internal implementation details change but public interfaces remain stable.

---

## 12. Future Enhancements

With Pandoc as the conversion engine, these features become feasible:

### New Output Formats

| Format | Pandoc Support | Implementation Effort |
|--------|---------------|----------------------|
| PDF | Native | Low (add writer option) |
| HTML | Native | Low |
| LaTeX | Native | Low |
| EPUB | Native | Low |
| ODT | Native | Low |
| RTF | Native | Low |

### New Input Formats

| Format | Pandoc Support | Use Case |
|--------|---------------|----------|
| RST | Native | Sphinx documentation |
| Org | Native | Emacs users |
| Textile | Native | Legacy wikis |
| DocBook | Native | Technical docs |

### Advanced Features

1. **Citation Support** - Pandoc-citeproc for academic documents
2. **Cross-References** - pandoc-crossref for figures/tables/equations
3. **Custom Filters** - User-provided Lua filters
4. **Templating** - Custom Pandoc templates per project
5. **Bibliography** - BibTeX/CSL integration

---

## 13. Appendix

### A. Pandoc AST Structure

```json
{
  "pandoc-api-version": [1, 23],
  "meta": {
    "title": {"t": "MetaInlines", "c": [{"t": "Str", "c": "Document Title"}]}
  },
  "blocks": [
    {"t": "Header", "c": [1, ["heading-id", [], []], [{"t": "Str", "c": "Heading"}]]},
    {"t": "Para", "c": [{"t": "Str", "c": "Paragraph"}, {"t": "Space"}, {"t": "Str", "c": "text"}]},
    {"t": "Table", "c": [/* table structure */]}
  ]
}
```

### B. Lua Filter Development

```lua
-- Basic filter structure
function Pandoc(doc)
  -- Modify entire document
  return doc
end

function Meta(meta)
  -- Modify metadata
  return meta
end

function Header(elem)
  -- Modify headers
  return elem
end

function Para(elem)
  -- Modify paragraphs
  return elem
end

function Table(elem)
  -- Modify tables
  return elem
end
```

### C. Reference Document Creation

1. Create new Word/PowerPoint document
2. Apply styles to sample content
3. Save as template
4. Test with: `pandoc test.md -o test.docx --reference-doc=template.docx`

### D. Useful Pandoc Commands

```bash
# View supported formats
pandoc --list-input-formats
pandoc --list-output-formats

# View AST
pandoc input.md -t json | python -m json.tool

# Test filter
pandoc input.md --lua-filter=filter.lua -t native

# Verbose output
pandoc input.md -o output.docx --verbose

# Version check
pandoc --version
```

---

## Document Control

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Status | Draft |
| Author | MD Converter Team |
| Created | 2026-01-29 |
| Last Updated | 2026-01-29 |
