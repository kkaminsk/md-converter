import * as fs from 'fs/promises';
import * as path from 'path';
import {
  convertToXlsx,
  convertTableToXlsx,
  previewTableConversion,
} from '../../../src/core/converters/xlsx-converter.js';
import type { TableData } from '../../../src/core/parsers/markdown.js';

describe('xlsx-converter', () => {
  const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures');
  const outputDir = path.join(process.cwd(), 'tests', 'output');

  beforeAll(async () => {
    // Create output directory for tests
    await fs.mkdir(outputDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up output files
    try {
      const files = await fs.readdir(outputDir);
      for (const file of files) {
        if (file.endsWith('.xlsx')) {
          await fs.unlink(path.join(outputDir, file));
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('convertToXlsx', () => {
    it('should convert a markdown file with tables to xlsx', async () => {
      const inputPath = path.join(fixturesDir, 'valid-xlsx.md');
      const outputPath = path.join(outputDir, 'valid-xlsx.xlsx');

      const result = await convertToXlsx(inputPath, outputPath);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
      expect(result.tableCount).toBeGreaterThan(0);
      expect(result.worksheetNames.length).toBeGreaterThan(0);

      // Verify file was created
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should convert complex formulas', async () => {
      const inputPath = path.join(fixturesDir, 'complex-formulas.md');
      const outputPath = path.join(outputDir, 'complex-formulas.xlsx');

      const result = await convertToXlsx(inputPath, outputPath);

      expect(result.success).toBe(true);
      expect(result.formulaCount).toBeGreaterThan(0);
    });

    it('should throw error for markdown without tables', async () => {
      const tempInput = path.join(outputDir, 'no-tables.md');
      await fs.writeFile(tempInput, `---
format: xlsx
title: "No Tables"
---

# No Tables Here

Just some text.
`);

      await expect(convertToXlsx(tempInput)).rejects.toThrow('No tables found');

      // Clean up
      await fs.unlink(tempInput);
    });

    it('should create multiple worksheets for multiple tables', async () => {
      const tempInput = path.join(outputDir, 'multi-table.md');
      await fs.writeFile(tempInput, `---
format: xlsx
title: "Multiple Tables"
---

# Multiple Tables

## Table 1

| A | B |
|---|---|
| 1 | 2 |

## Table 2

| C | D |
|---|---|
| 3 | 4 |

## Table 3

| E | F |
|---|---|
| 5 | 6 |
`);

      const outputPath = path.join(outputDir, 'multi-table.xlsx');
      const result = await convertToXlsx(tempInput, outputPath);

      expect(result.success).toBe(true);
      expect(result.tableCount).toBe(3);
      expect(result.worksheetNames).toHaveLength(3);
      expect(result.worksheetNames).toEqual(['Table 1', 'Table 2', 'Table 3']);

      // Clean up
      await fs.unlink(tempInput);
    });

    it('should add warnings for invalid formulas', async () => {
      const tempInput = path.join(outputDir, 'invalid-formula.md');
      await fs.writeFile(tempInput, `---
format: xlsx
title: "Invalid Formula"
---

# Invalid Formula Test

| Value | Result |
|-------|--------|
| 10 | {=SUM(A1} |
`);

      const outputPath = path.join(outputDir, 'invalid-formula.xlsx');
      const result = await convertToXlsx(tempInput, outputPath);

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('Invalid formula'))).toBe(true);

      // Clean up
      await fs.unlink(tempInput);
    });
  });

  describe('convertTableToXlsx', () => {
    it('should convert a single table to xlsx', async () => {
      const table: TableData = {
        headers: ['Name', 'Value'],
        rows: [
          ['Item 1', '100'],
          ['Item 2', '200'],
        ],
      };

      const outputPath = path.join(outputDir, 'single-table.xlsx');
      const result = await convertTableToXlsx(table, outputPath);

      expect(result.success).toBe(true);
      expect(result.worksheetNames).toEqual(['Data']);
      expect(result.tableCount).toBe(1);

      // Verify file was created
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should handle table with formulas', async () => {
      const table: TableData = {
        headers: ['A', 'B', 'Sum'],
        rows: [
          ['10', '20', '{=A2+B2}'],
          ['30', '40', '{=A3+B3}'],
        ],
      };

      const outputPath = path.join(outputDir, 'formula-table.xlsx');
      const result = await convertTableToXlsx(table, outputPath);

      expect(result.success).toBe(true);
      expect(result.formulaCount).toBe(2);
    });

    it('should respect conversion options', async () => {
      const table: TableData = {
        headers: ['A', 'B'],
        rows: [['1', '2']],
      };

      const outputPath = path.join(outputDir, 'options-table.xlsx');
      const result = await convertTableToXlsx(table, outputPath, {
        freezeHeaders: true,
        autoWidth: true,
        addBorders: true,
        headerStyle: {
          bold: true,
          fontSize: 14,
          fillColor: 'FF0000FF', // Blue
        },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('previewTableConversion', () => {
    it('should preview table without formulas', () => {
      const table: TableData = {
        headers: ['Name', 'Value'],
        rows: [
          ['Item 1', '100'],
          ['Item 2', '200'],
        ],
      };

      const preview = previewTableConversion(table);

      expect(preview.headers).toEqual(['Name', 'Value']);
      expect(preview.rowCount).toBe(2);
      expect(preview.columnCount).toBe(2);
      expect(preview.formulas).toHaveLength(0);
      expect(preview.dataTypes.number).toBe(2);
      expect(preview.dataTypes.string).toBe(2);
    });

    it('should preview table with formulas', () => {
      const table: TableData = {
        headers: ['A', 'B', 'Sum'],
        rows: [
          ['10', '20', '{=A2+B2}'],
          ['30', '40', '{=A3+B3}'],
          ['Total', '', '{=SUM(C2:C3)}'],
        ],
      };

      const preview = previewTableConversion(table);

      expect(preview.formulas).toHaveLength(3);
      expect(preview.formulas[0]).toEqual({ row: 2, col: 3, formula: 'A2+B2' });
      expect(preview.dataTypes.formula).toBe(3);
    });

    it('should detect various data types', () => {
      const table: TableData = {
        headers: ['Type', 'Value'],
        rows: [
          ['String', 'Hello'],
          ['Number', '123.45'],
          ['Boolean', 'true'],
          ['28/01/2025', '28/01/2025'], // Date in both columns
          ['Formula', '{=A1+B1}'],
        ],
      };

      const preview = previewTableConversion(table);

      expect(preview.dataTypes.string).toBeGreaterThan(0);
      expect(preview.dataTypes.number).toBeGreaterThan(0);
      expect(preview.dataTypes.boolean).toBe(1);
      expect(preview.dataTypes.date).toBe(2); // Both columns have dates
      expect(preview.dataTypes.formula).toBe(1);
    });
  });

  describe('data type handling', () => {
    it('should handle currency values', async () => {
      const table: TableData = {
        headers: ['Item', 'Price'],
        rows: [
          ['Widget', '$100.00'],
          ['Gadget', '€50.00'],
          ['Thing', '£75.50'],
        ],
      };

      const preview = previewTableConversion(table);
      expect(preview.dataTypes.number).toBe(3); // All prices detected as numbers
    });

    it('should handle date values with default DD/MM/YYYY format', async () => {
      const table: TableData = {
        headers: ['Start', 'End'],
        rows: [
          ['28/01/2025', '29/01/2025'],
          ['15/02/2025', '16/02/2025'],
        ],
      };

      const preview = previewTableConversion(table);
      expect(preview.dataTypes.date).toBe(4); // 4 date cells
    });

    it('should handle boolean values', async () => {
      const table: TableData = {
        headers: ['Feature', 'Enabled'],
        rows: [
          ['Feature A', 'true'],
          ['Feature B', 'false'],
          ['Feature C', 'TRUE'],
        ],
      };

      const preview = previewTableConversion(table);
      expect(preview.dataTypes.boolean).toBe(3);
    });
  });

  describe('date format configuration', () => {
    it('should use default DD/MM/YYYY date format when not specified', async () => {
      const tempInput = path.join(outputDir, 'date-default.md');
      await fs.writeFile(tempInput, `---
format: xlsx
title: "Default Date Format"
---

# Date Test

| Date | Value |
|------|-------|
| 01/02/2025 | 100 |
`);

      const outputPath = path.join(outputDir, 'date-default.xlsx');
      const result = await convertToXlsx(tempInput, outputPath);

      expect(result.success).toBe(true);
      // The date 01/02/2025 should be interpreted as Feb 1, 2025 (DD/MM/YYYY)

      // Clean up
      await fs.unlink(tempInput);
    });

    it('should use MM/DD/YYYY date format when specified', async () => {
      const tempInput = path.join(outputDir, 'date-us.md');
      await fs.writeFile(tempInput, `---
format: xlsx
title: "US Date Format"
date_format: MM/DD/YYYY
---

# Date Test

| Date | Value |
|------|-------|
| 12/25/2025 | 100 |
`);

      const outputPath = path.join(outputDir, 'date-us.xlsx');
      const result = await convertToXlsx(tempInput, outputPath);

      expect(result.success).toBe(true);
      // The date 12/25/2025 should be interpreted as Dec 25, 2025 (MM/DD/YYYY)

      // Clean up
      await fs.unlink(tempInput);
    });

    it('should use YYYY-MM-DD date format when specified', async () => {
      const tempInput = path.join(outputDir, 'date-iso.md');
      await fs.writeFile(tempInput, `---
format: xlsx
title: "ISO Date Format"
date_format: YYYY-MM-DD
---

# Date Test

| Date | Value |
|------|-------|
| 2025-12-25 | 100 |
`);

      const outputPath = path.join(outputDir, 'date-iso.xlsx');
      const result = await convertToXlsx(tempInput, outputPath);

      expect(result.success).toBe(true);

      // Clean up
      await fs.unlink(tempInput);
    });

    it('should not detect dates in wrong format', async () => {
      const tempInput = path.join(outputDir, 'date-mismatch.md');
      await fs.writeFile(tempInput, `---
format: xlsx
title: "Date Format Mismatch"
date_format: YYYY-MM-DD
---

# Date Test

| Date | Value |
|------|-------|
| 25/12/2025 | 100 |
`);

      const outputPath = path.join(outputDir, 'date-mismatch.xlsx');
      const result = await convertToXlsx(tempInput, outputPath);

      expect(result.success).toBe(true);
      // The date 25/12/2025 should NOT be detected when YYYY-MM-DD format is expected

      // Clean up
      await fs.unlink(tempInput);
    });

    it('should maintain backward compatibility with no date_format', async () => {
      const tempInput = path.join(outputDir, 'date-compat.md');
      await fs.writeFile(tempInput, `---
format: xlsx
title: "Backward Compatibility"
---

# Date Test

| Date | Description |
|------|-------------|
| 28/01/2025 | Australia Day |
| 25/12/2025 | Christmas |
`);

      const outputPath = path.join(outputDir, 'date-compat.xlsx');
      const result = await convertToXlsx(tempInput, outputPath);

      expect(result.success).toBe(true);
      // Dates should be interpreted as DD/MM/YYYY (the default)

      // Clean up
      await fs.unlink(tempInput);
    });
  });
});
