/**
 * Table Parser
 * Extract and process tables with formula detection
 */

import type { TableData } from './markdown.js';

export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

export interface ProcessedTable {
  headers: string[];
  rows: ProcessedRow[];
  hasFormulas: boolean;
}

export interface ProcessedRow {
  cells: ProcessedCell[];
}

export interface ProcessedCell {
  rawValue: string;
  displayValue: string;
  isFormula: boolean;
  formula?: string;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'formula';
  numericValue?: number;
  dateValue?: Date;
}

const FORMULA_PATTERN = /\{=([^}]+)\}/g;

/**
 * Process a table and detect formulas
 * @param table The table data to process
 * @param dateFormat The date format to use for parsing dates (default: DD/MM/YYYY)
 */
export function processTable(table: TableData, dateFormat: DateFormat = 'DD/MM/YYYY'): ProcessedTable {
  const processedRows: ProcessedRow[] = [];
  let hasFormulas = false;

  for (const row of table.rows) {
    const processedCells: ProcessedCell[] = [];

    for (const cellValue of row) {
      const processed = processCell(cellValue, dateFormat);
      if (processed.isFormula) {
        hasFormulas = true;
      }
      processedCells.push(processed);
    }

    processedRows.push({ cells: processedCells });
  }

  return {
    headers: table.headers,
    rows: processedRows,
    hasFormulas,
  };
}

/**
 * Process a single cell and detect its type
 * @param value The cell value to process
 * @param dateFormat The date format to use for parsing dates (default: DD/MM/YYYY)
 */
export function processCell(value: string, dateFormat: DateFormat = 'DD/MM/YYYY'): ProcessedCell {
  const trimmedValue = value.trim();

  // Check for formula
  const formulaMatch = trimmedValue.match(FORMULA_PATTERN);
  if (formulaMatch) {
    const formula = formulaMatch[0].substring(2, formulaMatch[0].length - 1); // Remove {= and }
    return {
      rawValue: value,
      displayValue: formula,
      isFormula: true,
      formula,
      dataType: 'formula',
    };
  }

  // Check for boolean
  if (trimmedValue.toLowerCase() === 'true' || trimmedValue.toLowerCase() === 'false') {
    return {
      rawValue: value,
      displayValue: trimmedValue,
      isFormula: false,
      dataType: 'boolean',
    };
  }

  // Check for number (including currency)
  const numericValue = parseNumeric(trimmedValue);
  if (numericValue !== null) {
    return {
      rawValue: value,
      displayValue: trimmedValue,
      isFormula: false,
      dataType: 'number',
      numericValue,
    };
  }

  // Check for date based on configured format
  const dateValue = parseDate(trimmedValue, dateFormat);
  if (dateValue) {
    return {
      rawValue: value,
      displayValue: trimmedValue,
      isFormula: false,
      dataType: 'date',
      dateValue,
    };
  }

  // Default to string
  return {
    rawValue: value,
    displayValue: trimmedValue,
    isFormula: false,
    dataType: 'string',
  };
}

/**
 * Parse numeric values including currency symbols
 */
function parseNumeric(value: string): number | null {
  // Remove common currency symbols and formatting
  const cleaned = value
    .replace(/[$€£¥AUD]/g, '')
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .trim();

  if (cleaned === '') {
    return null;
  }

  // Ensure the entire string is a valid number (not partial like "28/01/2025" -> 28)
  // Only match numbers that consist entirely of digits, optional decimal, and optional sign
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return null;
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse date according to the specified format
 * @param value The date string to parse
 * @param format The date format to use for parsing
 */
function parseDate(value: string, format: DateFormat): Date | null {
  let day: number, month: number, year: number;

  if (format === 'YYYY-MM-DD') {
    // ISO format: YYYY-MM-DD
    const isoPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = value.match(isoPattern);
    if (!match) return null;
    year = parseInt(match[1], 10);
    month = parseInt(match[2], 10) - 1; // JS months are 0-indexed
    day = parseInt(match[3], 10);
  } else {
    // Slash-separated formats: DD/MM/YYYY or MM/DD/YYYY
    const slashPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = value.match(slashPattern);
    if (!match) return null;

    if (format === 'DD/MM/YYYY') {
      day = parseInt(match[1], 10);
      month = parseInt(match[2], 10) - 1; // JS months are 0-indexed
    } else {
      // MM/DD/YYYY
      month = parseInt(match[1], 10) - 1; // JS months are 0-indexed
      day = parseInt(match[2], 10);
    }
    year = parseInt(match[3], 10);
  }

  const date = new Date(year, month, day);

  // Validate the date is valid (catches invalid dates like Feb 30)
  if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
    return date;
  }

  return null;
}

/**
 * Get all formulas from a table
 */
export function extractFormulas(table: ProcessedTable): string[] {
  const formulas: string[] = [];

  for (const row of table.rows) {
    for (const cell of row.cells) {
      if (cell.isFormula && cell.formula) {
        formulas.push(cell.formula);
      }
    }
  }

  return formulas;
}

/**
 * Get table dimensions for Excel cell references
 */
export interface TableDimensions {
  rows: number;
  cols: number;
  hasHeaders: boolean;
}

export function getTableDimensions(table: ProcessedTable): TableDimensions {
  return {
    rows: table.rows.length,
    cols: table.headers.length,
    hasHeaders: table.headers.length > 0,
  };
}

/**
 * Convert column index to Excel column letter (0 -> A, 1 -> B, 25 -> Z, 26 -> AA)
 */
export function columnIndexToLetter(index: number): string {
  let letter = '';
  let num = index;

  while (num >= 0) {
    letter = String.fromCharCode(65 + (num % 26)) + letter;
    num = Math.floor(num / 26) - 1;
  }

  return letter;
}

/**
 * Convert Excel column letter to index (A -> 0, B -> 1, AA -> 26)
 */
export function columnLetterToIndex(letter: string): number {
  let index = 0;

  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 64);
  }

  return index - 1;
}
