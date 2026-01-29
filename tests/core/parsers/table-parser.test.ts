import {
  processTable,
  processCell,
  extractFormulas,
  getTableDimensions,
  columnIndexToLetter,
  columnLetterToIndex,
  type ProcessedTable,
} from '../../../src/core/parsers/table-parser.js';
import type { TableData } from '../../../src/core/parsers/markdown.js';

describe('table-parser', () => {
  describe('processTable', () => {
    it('should process a simple table', () => {
      const table: TableData = {
        headers: ['Name', 'Value'],
        rows: [
          ['Item 1', '100'],
          ['Item 2', '200'],
        ],
      };

      const result = processTable(table);
      expect(result.headers).toEqual(['Name', 'Value']);
      expect(result.rows).toHaveLength(2);
      expect(result.hasFormulas).toBe(false);
    });

    it('should detect formulas in table', () => {
      const table: TableData = {
        headers: ['A', 'B', 'Total'],
        rows: [
          ['10', '20', '{=A1+B1}'],
        ],
      };

      const result = processTable(table);
      expect(result.hasFormulas).toBe(true);
      expect(result.rows[0].cells[2].isFormula).toBe(true);
      expect(result.rows[0].cells[2].formula).toBe('A1+B1');
    });

    it('should detect multiple formulas', () => {
      const table: TableData = {
        headers: ['Value', 'Square', 'Cube'],
        rows: [
          ['5', '{=POWER(A2,2)}', '{=POWER(A2,3)}'],
        ],
      };

      const result = processTable(table);
      expect(result.hasFormulas).toBe(true);
      const formulas = extractFormulas(result);
      expect(formulas).toHaveLength(2);
    });

    it('should use default DD/MM/YYYY date format when not specified', () => {
      const table: TableData = {
        headers: ['Date', 'Value'],
        rows: [
          ['01/02/2025', '100'], // Feb 1 in DD/MM/YYYY
        ],
      };

      const result = processTable(table);
      expect(result.rows[0].cells[0].dataType).toBe('date');
      expect(result.rows[0].cells[0].dateValue?.getMonth()).toBe(1); // February
      expect(result.rows[0].cells[0].dateValue?.getDate()).toBe(1);
    });

    it('should use MM/DD/YYYY date format when specified', () => {
      const table: TableData = {
        headers: ['Date', 'Value'],
        rows: [
          ['01/02/2025', '100'], // Jan 2 in MM/DD/YYYY
        ],
      };

      const result = processTable(table, 'MM/DD/YYYY');
      expect(result.rows[0].cells[0].dataType).toBe('date');
      expect(result.rows[0].cells[0].dateValue?.getMonth()).toBe(0); // January
      expect(result.rows[0].cells[0].dateValue?.getDate()).toBe(2);
    });

    it('should use YYYY-MM-DD date format when specified', () => {
      const table: TableData = {
        headers: ['Date', 'Value'],
        rows: [
          ['2025-12-25', '100'],
        ],
      };

      const result = processTable(table, 'YYYY-MM-DD');
      expect(result.rows[0].cells[0].dataType).toBe('date');
      expect(result.rows[0].cells[0].dateValue?.getMonth()).toBe(11); // December
      expect(result.rows[0].cells[0].dateValue?.getDate()).toBe(25);
    });
  });

  describe('processCell', () => {
    describe('formula detection', () => {
      it('should detect formula cell', () => {
        const result = processCell('{=SUM(A1:A10)}');
        expect(result.isFormula).toBe(true);
        expect(result.dataType).toBe('formula');
        expect(result.formula).toBe('SUM(A1:A10)');
      });

      it('should not treat regular text as formula', () => {
        const result = processCell('Regular text');
        expect(result.isFormula).toBe(false);
        expect(result.dataType).toBe('string');
      });
    });

    describe('boolean detection', () => {
      it('should detect true as boolean', () => {
        const result = processCell('true');
        expect(result.dataType).toBe('boolean');
      });

      it('should detect TRUE as boolean (case insensitive)', () => {
        const result = processCell('TRUE');
        expect(result.dataType).toBe('boolean');
      });

      it('should detect false as boolean', () => {
        const result = processCell('false');
        expect(result.dataType).toBe('boolean');
      });
    });

    describe('number detection', () => {
      it('should detect integer', () => {
        const result = processCell('123');
        expect(result.dataType).toBe('number');
        expect(result.numericValue).toBe(123);
      });

      it('should detect decimal', () => {
        const result = processCell('123.45');
        expect(result.dataType).toBe('number');
        expect(result.numericValue).toBe(123.45);
      });

      it('should detect negative number', () => {
        const result = processCell('-42');
        expect(result.dataType).toBe('number');
        expect(result.numericValue).toBe(-42);
      });

      it('should detect number with dollar sign', () => {
        const result = processCell('$100.00');
        expect(result.dataType).toBe('number');
        expect(result.numericValue).toBe(100);
      });

      it('should detect number with euro sign', () => {
        const result = processCell('€50.00');
        expect(result.dataType).toBe('number');
        expect(result.numericValue).toBe(50);
      });

      it('should detect number with pound sign', () => {
        const result = processCell('£75.50');
        expect(result.dataType).toBe('number');
        expect(result.numericValue).toBe(75.5);
      });

      it('should detect number with commas', () => {
        const result = processCell('1,234,567');
        expect(result.dataType).toBe('number');
        expect(result.numericValue).toBe(1234567);
      });
    });

    describe('date detection', () => {
      describe('DD/MM/YYYY format (default)', () => {
        it('should detect Australian date format', () => {
          const result = processCell('28/01/2025');
          expect(result.dataType).toBe('date');
          expect(result.dateValue).toBeDefined();
          expect(result.dateValue?.getFullYear()).toBe(2025);
          expect(result.dateValue?.getMonth()).toBe(0); // January
          expect(result.dateValue?.getDate()).toBe(28);
        });

        it('should detect single-digit day/month', () => {
          const result = processCell('1/1/2025');
          expect(result.dataType).toBe('date');
        });

        it('should reject invalid date', () => {
          const result = processCell('32/13/2025');
          expect(result.dataType).toBe('string'); // Invalid date treated as string
        });

        it('should interpret ambiguous date as DD/MM/YYYY', () => {
          // 01/02/2025 should be February 1 in DD/MM/YYYY format
          const result = processCell('01/02/2025', 'DD/MM/YYYY');
          expect(result.dataType).toBe('date');
          expect(result.dateValue?.getMonth()).toBe(1); // February (0-indexed)
          expect(result.dateValue?.getDate()).toBe(1);
        });
      });

      describe('MM/DD/YYYY format (US)', () => {
        it('should detect US date format', () => {
          const result = processCell('12/25/2025', 'MM/DD/YYYY');
          expect(result.dataType).toBe('date');
          expect(result.dateValue?.getFullYear()).toBe(2025);
          expect(result.dateValue?.getMonth()).toBe(11); // December
          expect(result.dateValue?.getDate()).toBe(25);
        });

        it('should interpret ambiguous date as MM/DD/YYYY', () => {
          // 01/02/2025 should be January 2 in MM/DD/YYYY format
          const result = processCell('01/02/2025', 'MM/DD/YYYY');
          expect(result.dataType).toBe('date');
          expect(result.dateValue?.getMonth()).toBe(0); // January (0-indexed)
          expect(result.dateValue?.getDate()).toBe(2);
        });

        it('should reject invalid US date', () => {
          const result = processCell('13/25/2025', 'MM/DD/YYYY');
          expect(result.dataType).toBe('string'); // Invalid month 13
        });
      });

      describe('YYYY-MM-DD format (ISO)', () => {
        it('should detect ISO date format', () => {
          const result = processCell('2025-12-25', 'YYYY-MM-DD');
          expect(result.dataType).toBe('date');
          expect(result.dateValue?.getFullYear()).toBe(2025);
          expect(result.dateValue?.getMonth()).toBe(11); // December
          expect(result.dateValue?.getDate()).toBe(25);
        });

        it('should reject invalid ISO date', () => {
          const result = processCell('2025-13-25', 'YYYY-MM-DD');
          expect(result.dataType).toBe('string'); // Invalid month
        });

        it('should reject slash-format when ISO expected', () => {
          const result = processCell('25/12/2025', 'YYYY-MM-DD');
          expect(result.dataType).toBe('string'); // Wrong format
        });
      });

      describe('format mismatch', () => {
        it('should reject ISO format when DD/MM/YYYY expected', () => {
          const result = processCell('2025-01-28', 'DD/MM/YYYY');
          expect(result.dataType).toBe('string');
        });

        it('should reject slash format when ISO expected', () => {
          const result = processCell('28/01/2025', 'YYYY-MM-DD');
          expect(result.dataType).toBe('string');
        });
      });
    });

    describe('string detection', () => {
      it('should treat regular text as string', () => {
        const result = processCell('Hello World');
        expect(result.dataType).toBe('string');
        expect(result.displayValue).toBe('Hello World');
      });

      it('should preserve raw value', () => {
        const result = processCell('  trimmed  ');
        expect(result.rawValue).toBe('  trimmed  ');
        expect(result.displayValue).toBe('trimmed');
      });
    });
  });

  describe('extractFormulas', () => {
    it('should extract all formulas from table', () => {
      const table: ProcessedTable = {
        headers: ['A', 'B', 'C'],
        rows: [
          {
            cells: [
              { rawValue: '10', displayValue: '10', isFormula: false, dataType: 'number', numericValue: 10 },
              { rawValue: '20', displayValue: '20', isFormula: false, dataType: 'number', numericValue: 20 },
              { rawValue: '{=A1+B1}', displayValue: 'A1+B1', isFormula: true, formula: 'A1+B1', dataType: 'formula' },
            ],
          },
          {
            cells: [
              { rawValue: '30', displayValue: '30', isFormula: false, dataType: 'number', numericValue: 30 },
              { rawValue: '{=SUM(A:A)}', displayValue: 'SUM(A:A)', isFormula: true, formula: 'SUM(A:A)', dataType: 'formula' },
              { rawValue: '{=B2*2}', displayValue: 'B2*2', isFormula: true, formula: 'B2*2', dataType: 'formula' },
            ],
          },
        ],
        hasFormulas: true,
      };

      const formulas = extractFormulas(table);
      expect(formulas).toHaveLength(3);
      expect(formulas).toContain('A1+B1');
      expect(formulas).toContain('SUM(A:A)');
      expect(formulas).toContain('B2*2');
    });

    it('should return empty array for table without formulas', () => {
      const table: ProcessedTable = {
        headers: ['A', 'B'],
        rows: [
          {
            cells: [
              { rawValue: '10', displayValue: '10', isFormula: false, dataType: 'number', numericValue: 10 },
              { rawValue: '20', displayValue: '20', isFormula: false, dataType: 'number', numericValue: 20 },
            ],
          },
        ],
        hasFormulas: false,
      };

      const formulas = extractFormulas(table);
      expect(formulas).toHaveLength(0);
    });
  });

  describe('getTableDimensions', () => {
    it('should return correct dimensions', () => {
      const table: ProcessedTable = {
        headers: ['A', 'B', 'C'],
        rows: [
          { cells: [] },
          { cells: [] },
        ],
        hasFormulas: false,
      };

      const dims = getTableDimensions(table);
      expect(dims.rows).toBe(2);
      expect(dims.cols).toBe(3);
      expect(dims.hasHeaders).toBe(true);
    });

    it('should handle empty table', () => {
      const table: ProcessedTable = {
        headers: [],
        rows: [],
        hasFormulas: false,
      };

      const dims = getTableDimensions(table);
      expect(dims.rows).toBe(0);
      expect(dims.cols).toBe(0);
      expect(dims.hasHeaders).toBe(false);
    });
  });

  describe('columnIndexToLetter', () => {
    it('should convert single letter columns', () => {
      expect(columnIndexToLetter(0)).toBe('A');
      expect(columnIndexToLetter(1)).toBe('B');
      expect(columnIndexToLetter(25)).toBe('Z');
    });

    it('should convert double letter columns', () => {
      expect(columnIndexToLetter(26)).toBe('AA');
      expect(columnIndexToLetter(27)).toBe('AB');
      expect(columnIndexToLetter(51)).toBe('AZ');
      expect(columnIndexToLetter(52)).toBe('BA');
    });

    it('should convert triple letter columns', () => {
      expect(columnIndexToLetter(702)).toBe('AAA');
    });
  });

  describe('columnLetterToIndex', () => {
    it('should convert single letter columns', () => {
      expect(columnLetterToIndex('A')).toBe(0);
      expect(columnLetterToIndex('B')).toBe(1);
      expect(columnLetterToIndex('Z')).toBe(25);
    });

    it('should convert double letter columns', () => {
      expect(columnLetterToIndex('AA')).toBe(26);
      expect(columnLetterToIndex('AB')).toBe(27);
      expect(columnLetterToIndex('AZ')).toBe(51);
      expect(columnLetterToIndex('BA')).toBe(52);
    });

    it('should be inverse of columnIndexToLetter', () => {
      for (let i = 0; i < 100; i++) {
        const letter = columnIndexToLetter(i);
        const backToIndex = columnLetterToIndex(letter);
        expect(backToIndex).toBe(i);
      }
    });
  });
});
