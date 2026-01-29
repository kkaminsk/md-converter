/**
 * XLSX Post-Processor
 * Handles formula injection into Excel files
 */

import ExcelJS from 'exceljs';
import type { FormulaLocation, PostProcessorResult } from './types.js';
import type { DocumentMetadata } from '../parsers/frontmatter-parser.js';

export interface XlsxPostOptions {
  outputPath: string;
  formulas: FormulaLocation[];
  metadata: DocumentMetadata | null;
}

/**
 * Post-process XLSX file: inject formulas, update properties
 */
export async function processXlsx(options: XlsxPostOptions): Promise<PostProcessorResult> {
  const { outputPath, formulas, metadata } = options;
  const modifications: string[] = [];
  const warnings: string[] = [];

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(outputPath);

  // Inject formulas
  if (formulas.length > 0) {
    const formulaResults = injectFormulas(workbook, formulas);
    modifications.push(...formulaResults.modifications);
    warnings.push(...formulaResults.warnings);
  }

  // Update document properties
  if (metadata) {
    const propsModifications = updateProperties(workbook, metadata);
    modifications.push(...propsModifications);
  }

  // Save the modified workbook
  await workbook.xlsx.writeFile(outputPath);

  return {
    success: true,
    outputPath,
    modifications,
    warnings,
  };
}

/**
 * Inject formulas into workbook cells, replacing placeholders
 */
function injectFormulas(
  workbook: ExcelJS.Workbook,
  formulas: FormulaLocation[]
): { modifications: string[]; warnings: string[] } {
  const modifications: string[] = [];
  const warnings: string[] = [];

  for (const formula of formulas) {
    const { tableIndex, row, column, formula: formulaText, placeholder } = formula;

    // Get worksheet (tableIndex maps to worksheet index)
    const worksheet = workbook.worksheets[tableIndex];
    if (!worksheet) {
      warnings.push(`Worksheet ${tableIndex} not found for formula placeholder: ${placeholder}`);
      continue;
    }

    // Find cell with placeholder
    let found = false;
    worksheet.eachRow((wsRow, rowNumber) => {
      wsRow.eachCell((cell, colNumber) => {
        if (cell.value && String(cell.value).includes(placeholder)) {
          // Replace with formula
          cell.value = { formula: formulaText };
          modifications.push(
            `Injected formula at ${worksheet.name}!${columnToLetter(colNumber)}${rowNumber}: ${formulaText}`
          );
          found = true;
        }
      });
    });

    if (!found) {
      // Try direct cell access using row/column from FormulaLocation
      // Row is 0-based in FormulaLocation, 1-based in ExcelJS
      // Column is 0-based in FormulaLocation, 1-based in ExcelJS
      const excelRow = row + 1;
      const excelCol = column + 1;
      const cell = worksheet.getCell(excelRow, excelCol);

      if (cell.value && String(cell.value).includes(placeholder)) {
        cell.value = { formula: formulaText };
        modifications.push(
          `Injected formula at ${worksheet.name}!${columnToLetter(excelCol)}${excelRow}: ${formulaText}`
        );
      } else {
        warnings.push(`Formula placeholder not found: ${placeholder}`);
      }
    }
  }

  return { modifications, warnings };
}

/**
 * Update workbook properties with metadata
 */
function updateProperties(workbook: ExcelJS.Workbook, metadata: DocumentMetadata): string[] {
  const modifications: string[] = [];

  if (metadata.title) {
    workbook.title = metadata.title;
    modifications.push(`Set workbook title: ${metadata.title}`);
  }

  if (metadata.author) {
    workbook.creator = metadata.author;
    modifications.push(`Set workbook creator: ${metadata.author}`);
  }

  if (metadata.subject || metadata.classification) {
    const subject = metadata.subject || metadata.classification || '';
    workbook.subject = subject;
    modifications.push(`Set workbook subject: ${subject}`);
  }

  if (metadata.keywords && metadata.keywords.length > 0) {
    workbook.keywords = metadata.keywords.join(', ');
    modifications.push(`Set workbook keywords: ${workbook.keywords}`);
  }

  // Set modified date
  workbook.modified = new Date();

  return modifications;
}

/**
 * Convert column number to Excel letter (1=A, 2=B, 26=Z, 27=AA)
 */
function columnToLetter(column: number): string {
  let letter = '';
  let temp = column;

  while (temp > 0) {
    const remainder = (temp - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    temp = Math.floor((temp - 1) / 26);
  }

  return letter;
}
