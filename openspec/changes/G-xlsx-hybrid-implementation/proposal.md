# Change: G - XLSX Hybrid Implementation

## Why
Pandoc doesn't natively output Excel format. However, we can leverage Pandoc for:
1. Reliable markdown parsing via JSON AST
2. Consistent table extraction across all formats
3. Metadata handling

We retain ExcelJS for the actual Excel generation while using Pandoc's AST for table parsing.

## What Changes

### Refactor `src/core/converters/xlsx-converter.ts`

Implement a hybrid approach:
- **Pandoc**: Parse markdown to AST, extract structured table data
- **ExcelJS**: Generate Excel workbook with formulas and formatting

```typescript
export async function convertToXlsx(
  markdown: string,
  outputPath: string,
  options?: XlsxConversionOptions
): Promise<XlsxConversionResult>
```

### New Conversion Flow

```
1. Pre-process markdown
   ├── Extract formulas with locations
   ├── Parse front matter
   └── Store formula map for injection

2. Parse with Pandoc AST
   ├── Convert markdown to JSON AST
   ├── Walk AST to extract Table blocks
   └── Parse each table into structured data

3. Generate Excel with ExcelJS
   ├── Create workbook with metadata
   ├── For each table:
   │   ├── Create worksheet
   │   ├── Add header row
   │   ├── Add data rows
   │   ├── Inject formulas from map
   │   └── Apply formatting
   └── Save workbook

4. Return result
   ├── Success status
   ├── Worksheet names
   ├── Formula count
   └── Warnings
```

### Table Extraction from AST

```typescript
interface ExtractedTable {
  caption?: string;
  headers: string[];
  rows: string[][];
  alignments: ('left' | 'center' | 'right')[];
}

function extractTablesFromAST(ast: PandocAST): ExtractedTable[] {
  const tables: ExtractedTable[] = [];

  function walkBlocks(blocks: PandocBlock[]) {
    for (const block of blocks) {
      if (block.t === 'Table') {
        tables.push(parseTableBlock(block));
      }
      // Recurse into nested structures
      if (block.c && Array.isArray(block.c)) {
        for (const child of block.c) {
          if (typeof child === 'object' && Array.isArray(child)) {
            walkBlocks(child);
          }
        }
      }
    }
  }

  walkBlocks(ast.blocks);
  return tables;
}

function parseTableBlock(block: PandocTableBlock): ExtractedTable {
  // Pandoc Table structure:
  // [caption, alignments, widths, headers, rows]
  const [caption, alignments, _widths, headerCells, bodyRows] = block.c;

  return {
    caption: extractCaption(caption),
    headers: headerCells.map(cell => extractCellText(cell)),
    rows: bodyRows.map(row => row.map(cell => extractCellText(cell))),
    alignments: alignments.map(mapAlignment)
  };
}
```

### Formula Injection

```typescript
function injectFormulas(
  worksheet: ExcelJS.Worksheet,
  table: ExtractedTable,
  formulas: FormulaLocation[],
  tableIndex: number
) {
  for (const formula of formulas) {
    if (formula.tableIndex !== tableIndex) continue;

    // Excel rows are 1-indexed, +1 for header row
    const excelRow = formula.row + 1;
    const excelCol = formula.column + 1;

    const cell = worksheet.getCell(excelRow, excelCol);

    // Replace placeholder with actual formula
    cell.value = { formula: formula.formula };
  }
}
```

### Cell Processing

Retain existing cell processing logic from current xlsx-converter:
- Type detection (string, number, date, boolean)
- Date parsing with configurable format
- Currency symbol handling
- Rich text for bold/italic

### Implementation

```typescript
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

  // 1. Pre-process to extract formulas
  const preResult = preProcessor.process(markdown);
  const { formulas, metadata } = preResult.extractedData;

  // 2. Get Pandoc AST for table extraction
  const ast = await executor.toAST(preResult.content);
  const tables = extractTablesFromAST(ast);

  if (tables.length === 0) {
    return {
      success: false,
      errors: ['No tables found in document'],
      warnings: preResult.warnings
    };
  }

  // 3. Create Excel workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = metadata.author || 'MD Converter';
  workbook.title = metadata.title;
  workbook.created = new Date();

  const worksheetNames: string[] = [];

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const worksheetName = table.caption || `Table ${i + 1}`;
    worksheetNames.push(worksheetName);

    const worksheet = workbook.addWorksheet(worksheetName);

    // Add headers with styling
    const headerRow = worksheet.addRow(table.headers);
    styleHeaderRow(headerRow);

    // Add data rows
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      const rowData = table.rows[rowIdx].map((cell, colIdx) =>
        processCell(cell, metadata.date_format)
      );
      worksheet.addRow(rowData);
    }

    // Inject formulas
    injectFormulas(worksheet, table, formulas, i);

    // Apply formatting
    applyColumnWidths(worksheet);
    freezeHeaderRow(worksheet);
    applyAlignments(worksheet, table.alignments);
  }

  // 4. Save workbook
  await workbook.xlsx.writeFile(outputPath);

  return {
    success: true,
    outputPath,
    worksheets: worksheetNames,
    formulaCount: formulas.length,
    warnings: preResult.warnings
  };
}
```

### Benefits of Hybrid Approach

1. **Consistent parsing** - Same AST-based table extraction as other formats
2. **Formula preservation** - ExcelJS handles Excel formulas correctly
3. **Rich formatting** - Full control over cell styles, number formats, dates
4. **Reliability** - ExcelJS is mature and well-maintained for Excel generation

## Impact
- **Affected specs**: Updates `converters` capability
- **Affected code**:
  - `src/core/converters/xlsx-converter.ts` (refactor)
  - `src/core/pandoc/ast-utils.ts` (new - AST parsing utilities)
- **Dependencies**: Changes A, B (uses executor and pre-processor)
- **Retained dependency**: `exceljs` for Excel generation

## Acceptance Criteria
1. All existing unit tests pass with new implementation
2. Tables are correctly extracted from Pandoc AST
3. Formulas are correctly injected and functional in Excel
4. Data types (numbers, dates, text) are preserved
5. Header rows are styled and frozen
6. Multiple tables create multiple worksheets
7. Date format respects metadata.date_format setting
8. Column widths auto-adjust to content

## Testing Strategy

### Table Extraction Tests
- Verify table count matches markdown
- Verify header and row counts
- Check cell content preservation

### Formula Tests
- Simple formulas (SUM, AVERAGE)
- Cell references (A1, $A$1)
- Cross-cell references
- Formulas with functions

### Format Tests
- Date parsing with all three formats
- Number formatting (currency, percentages)
- Boolean detection

## Priority
**7 of 7** - Final converter migration. Depends on A, B. Can run parallel with E, F.
