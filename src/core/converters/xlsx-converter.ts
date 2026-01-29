/**
 * XLSX Converter
 * Convert Markdown tables to Excel with formula support
 */

import ExcelJS from 'exceljs';
import { parseMarkdown, type TableData } from '../parsers/markdown.js';
import { processTable, type ProcessedTable, type DateFormat } from '../parsers/table-parser.js';
import { validateFormula } from '../parsers/formula-parser.js';
import { parseFrontMatter } from '../parsers/frontmatter-parser.js';
import { ConversionError } from '../errors.js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface RichTextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export interface XlsxConversionOptions {
  freezeHeaders?: boolean;
  autoWidth?: boolean;
  addBorders?: boolean;
  headerStyle?: {
    bold?: boolean;
    fontSize?: number;
    fillColor?: string;
  };
}

export interface XlsxConversionResult {
  success: boolean;
  outputPath: string;
  worksheetNames: string[];
  tableCount: number;
  formulaCount: number;
  warnings: string[];
}

/**
 * Convert Markdown file to XLSX with formula support
 */
export async function convertToXlsx(
  inputPath: string,
  outputPath?: string,
  options: XlsxConversionOptions = {}
): Promise<XlsxConversionResult> {
  try {
    // Read markdown file
    const rawMarkdown = await fs.readFile(inputPath, 'utf-8');

    // Parse front matter
    const {
      metadata,
      content: markdownContent,
      warnings: fmWarnings,
    } = parseFrontMatter(rawMarkdown);

    // Parse markdown
    const parsed = parseMarkdown(markdownContent);

    if (parsed.tables.length === 0) {
      throw new ConversionError('No tables found in the markdown file', 'xlsx', inputPath);
    }

    // Determine output path
    const output = outputPath || inputPath.replace(/\.md$/, '.xlsx');

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = metadata?.author || 'MD Converter';
    workbook.created = new Date();
    if (metadata?.title) workbook.title = metadata.title;
    if (metadata?.subject) workbook.subject = metadata.subject;
    if (metadata?.keywords) workbook.keywords = metadata.keywords.join(', ');
    if (metadata?.description) workbook.description = metadata.description;

    const worksheetNames: string[] = [];
    let totalFormulas = 0;
    const warnings: string[] = [...fmWarnings];

    // Get date format from metadata (default to DD/MM/YYYY for backward compatibility)
    const dateFormat: DateFormat = metadata?.date_format || 'DD/MM/YYYY';

    // Process each table
    for (let i = 0; i < parsed.tables.length; i++) {
      const table = parsed.tables[i];
      const processedTable = processTable(table, dateFormat);

      // Create worksheet
      const sheetName = `Table ${i + 1}`;
      const worksheet = workbook.addWorksheet(sheetName);
      worksheetNames.push(sheetName);

      // Add table to worksheet
      const formulaCount = await addTableToWorksheet(worksheet, processedTable, options, warnings, dateFormat);

      totalFormulas += formulaCount;
    }

    // Ensure output directory exists
    await fs.mkdir(path.dirname(output), { recursive: true });

    // Save workbook
    await workbook.xlsx.writeFile(output);

    return {
      success: true,
      outputPath: output,
      worksheetNames,
      tableCount: parsed.tables.length,
      formulaCount: totalFormulas,
      warnings,
    };
  } catch (error) {
    if (error instanceof ConversionError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new ConversionError(message, 'xlsx', inputPath);
  }
}

/**
 * Parse markdown formatting in text and convert to Excel rich text
 */
function parseMarkdownFormatting(text: string): string | { richText: ExcelJS.RichText[] } {
  // Check if there's any markdown formatting
  if (!text.includes('**') && !text.includes('*') && !text.includes('_')) {
    return text;
  }

  const segments: RichTextSegment[] = [];
  // Split by bold (**text**), italic (*text* or _text_)
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/);

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith('**') && part.endsWith('**')) {
      // Bold
      segments.push({
        text: part.slice(2, -2),
        bold: true,
      });
    } else if (part.startsWith('*') && part.endsWith('*')) {
      // Italic
      segments.push({
        text: part.slice(1, -1),
        italic: true,
      });
    } else if (part.startsWith('_') && part.endsWith('_')) {
      // Italic (underscore)
      segments.push({
        text: part.slice(1, -1),
        italic: true,
      });
    } else {
      // Regular text
      segments.push({
        text: part,
      });
    }
  }

  // If only one segment with no formatting, return plain text
  if (segments.length === 1 && !segments[0].bold && !segments[0].italic) {
    return segments[0].text;
  }

  // Convert to ExcelJS rich text format
  const richText: ExcelJS.RichText[] = segments.map((segment) => {
    const font: Partial<ExcelJS.Font> = {};
    if (segment.bold) font.bold = true;
    if (segment.italic) font.italic = true;

    return {
      text: segment.text,
      font: Object.keys(font).length > 0 ? font : undefined,
    } as ExcelJS.RichText;
  });

  return { richText };
}

/**
 * Get Excel number format string for a date format
 */
function getExcelDateFormat(dateFormat: DateFormat): string {
  switch (dateFormat) {
    case 'DD/MM/YYYY':
      return 'dd/mm/yyyy';
    case 'MM/DD/YYYY':
      return 'mm/dd/yyyy';
    case 'YYYY-MM-DD':
      return 'yyyy-mm-dd';
    default:
      return 'dd/mm/yyyy';
  }
}

/**
 * Add a processed table to a worksheet
 */
async function addTableToWorksheet(
  worksheet: ExcelJS.Worksheet,
  table: ProcessedTable,
  options: XlsxConversionOptions,
  warnings: string[],
  dateFormat: DateFormat = 'DD/MM/YYYY'
): Promise<number> {
  let formulaCount = 0;
  const startRow = 1;
  const startCol = 1;

  // Add headers
  if (table.headers.length > 0) {
    for (let col = 0; col < table.headers.length; col++) {
      const cell = worksheet.getCell(startRow, startCol + col);
      // Parse markdown formatting in headers
      const headerValue = parseMarkdownFormatting(table.headers[col]);
      cell.value = headerValue;

      // Apply header styling (only if not rich text)
      if (typeof headerValue !== 'object' || !('richText' in headerValue)) {
        cell.font = {
          bold: options.headerStyle?.bold !== false,
          size: options.headerStyle?.fontSize || 12,
        };
      }

      if (options.headerStyle?.fillColor) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: options.headerStyle.fillColor },
        };
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' }, // Light grey
        };
      }

      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    }

    // Freeze header row if requested
    if (options.freezeHeaders !== false) {
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    }
  }

  // Add data rows
  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex++) {
    const row = table.rows[rowIndex];
    const excelRow = startRow + rowIndex + 1; // +1 for header row

    for (let colIndex = 0; colIndex < row.cells.length; colIndex++) {
      const cellData = row.cells[colIndex];
      const cell = worksheet.getCell(excelRow, startCol + colIndex);

      if (cellData.isFormula && cellData.formula) {
        // Validate formula
        const validation = validateFormula(cellData.formula);

        if (!validation.isValid) {
          warnings.push(
            `Invalid formula in row ${excelRow}, col ${startCol + colIndex}: ${validation.errors.join(', ')}`
          );
          // Fall back to text
          cell.value = cellData.rawValue;
        } else {
          // Set as formula (ExcelJS expects formulas without leading =)
          const formulaWithoutEquals = cellData.formula.startsWith('=')
            ? cellData.formula.substring(1)
            : cellData.formula;

          cell.value = { formula: formulaWithoutEquals };
          formulaCount++;

          // Add warnings if any
          if (validation.warnings.length > 0) {
            warnings.push(
              `Formula warnings in row ${excelRow}, col ${startCol + colIndex}: ${validation.warnings.join(', ')}`
            );
          }
        }
      } else if (cellData.dataType === 'number' && cellData.numericValue !== undefined) {
        // Set as number
        cell.value = cellData.numericValue;
        cell.numFmt = '#,##0.00';
      } else if (cellData.dataType === 'date' && cellData.dateValue) {
        // Set as date with configured format
        cell.value = cellData.dateValue;
        cell.numFmt = getExcelDateFormat(dateFormat);
      } else if (cellData.dataType === 'boolean') {
        // Set as boolean
        cell.value = cellData.displayValue.toLowerCase() === 'true';
      } else {
        // Set as text with markdown formatting
        const formattedValue = parseMarkdownFormatting(cellData.displayValue);
        cell.value = formattedValue;

        // Rich text formatting is handled by ExcelJS automatically
        // No need to set cell.font - it would override the rich text formatting
      }

      // Apply basic alignment
      if (cellData.dataType === 'number' || cellData.dataType === 'formula') {
        cell.alignment = { horizontal: 'right' };
      } else {
        cell.alignment = { horizontal: 'left' };
      }
    }
  }

  // Add borders if requested
  if (options.addBorders !== false) {
    const borderStyle: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FF000000' } };

    for (let row = startRow; row <= startRow + table.rows.length; row++) {
      for (let col = startCol; col < startCol + table.headers.length; col++) {
        const cell = worksheet.getCell(row, col);
        cell.border = {
          top: borderStyle,
          left: borderStyle,
          bottom: borderStyle,
          right: borderStyle,
        };
      }
    }
  }

  // Auto-size columns if requested
  if (options.autoWidth !== false) {
    worksheet.columns.forEach((column) => {
      if (column) {
        let maxLength = 10;

        // Check each cell in the column
        column.eachCell?.({ includeEmpty: false }, (cell) => {
          const cellValue = cell.value?.toString() || '';
          maxLength = Math.max(maxLength, cellValue.length);
        });

        // Set width with some padding (max 50 characters)
        column.width = Math.min(maxLength + 2, 50);
      }
    });
  }

  return formulaCount;
}

/**
 * Convert a single table to XLSX
 */
export async function convertTableToXlsx(
  table: TableData,
  outputPath: string,
  options: XlsxConversionOptions = {}
): Promise<XlsxConversionResult> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MD Converter';
  workbook.created = new Date();

  const processedTable = processTable(table);
  const worksheet = workbook.addWorksheet('Data');
  const warnings: string[] = [];

  const formulaCount = await addTableToWorksheet(worksheet, processedTable, options, warnings);

  await workbook.xlsx.writeFile(outputPath);

  return {
    success: true,
    outputPath,
    worksheetNames: ['Data'],
    tableCount: 1,
    formulaCount,
    warnings,
  };
}

/**
 * Preview how a table will be converted (without saving)
 */
export function previewTableConversion(table: TableData): {
  headers: string[];
  rowCount: number;
  columnCount: number;
  formulas: Array<{ row: number; col: number; formula: string }>;
  dataTypes: Record<string, number>;
} {
  const processedTable = processTable(table);
  const formulas: Array<{ row: number; col: number; formula: string }> = [];
  const dataTypes: Record<string, number> = {
    string: 0,
    number: 0,
    boolean: 0,
    date: 0,
    formula: 0,
  };

  for (let rowIndex = 0; rowIndex < processedTable.rows.length; rowIndex++) {
    const row = processedTable.rows[rowIndex];

    for (let colIndex = 0; colIndex < row.cells.length; colIndex++) {
      const cell = row.cells[colIndex];

      dataTypes[cell.dataType]++;

      if (cell.isFormula && cell.formula) {
        formulas.push({
          row: rowIndex + 2, // +2 for 1-indexed and header row
          col: colIndex + 1, // +1 for 1-indexed
          formula: cell.formula,
        });
      }
    }
  }

  return {
    headers: processedTable.headers,
    rowCount: processedTable.rows.length,
    columnCount: processedTable.headers.length,
    formulas,
    dataTypes,
  };
}
