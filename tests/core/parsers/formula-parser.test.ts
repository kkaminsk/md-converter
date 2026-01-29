import {
  parseFormula,
  validateFormula,
  validateFormulaStrict,
  isFormula,
  extractFormula,
  isValidCellReference,
  isValidRangeReference,
  parseCellReference,
  formatCellReference,
  getAllReferences,
  hasCircularReference,
  sanitiseFormula,
  adjustReferences,
} from '../../../src/core/parsers/formula-parser.js';
import { FormulaValidationError } from '../../../src/core/errors.js';

describe('formula-parser', () => {
  describe('parseFormula', () => {
    it('should parse a simple SUM formula', () => {
      const result = parseFormula('SUM(A1:A10)');
      expect(result.isValid).toBe(true);
      expect(result.functions).toContain('SUM');
      expect(result.cellReferences).toContain('A1:A10');
    });

    it('should parse formula with leading equals sign', () => {
      const result = parseFormula('=SUM(A1:A10)');
      expect(result.isValid).toBe(true);
      expect(result.formula).toBe('SUM(A1:A10)');
    });

    it('should detect mismatched parentheses', () => {
      const result = parseFormula('SUM(A1:A10');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Mismatched parentheses');
    });

    it('should detect empty formula', () => {
      const result = parseFormula('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Empty formula');
    });

    it('should warn about unknown functions', () => {
      const result = parseFormula('UNKNOWNFUNC(A1)');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual(expect.stringContaining('Unknown function'));
    });

    it('should extract multiple cell references', () => {
      const result = parseFormula('A1+B2+C3');
      expect(result.cellReferences).toContain('A1');
      expect(result.cellReferences).toContain('B2');
      expect(result.cellReferences).toContain('C3');
    });

    it('should extract range references', () => {
      const result = parseFormula('SUM(A1:B10)');
      expect(result.cellReferences).toContain('A1:B10');
    });

    it('should extract column range references', () => {
      const result = parseFormula('SUM(A:A)');
      expect(result.cellReferences).toContain('A:A');
    });

    it('should extract row range references', () => {
      const result = parseFormula('SUM(1:10)');
      expect(result.cellReferences).toContain('1:10');
    });

    it('should handle absolute references', () => {
      const result = parseFormula('$A$1+$B2+C$3');
      expect(result.cellReferences).toContain('$A$1');
      expect(result.cellReferences).toContain('$B2');
      expect(result.cellReferences).toContain('C$3');
    });

    it('should extract multiple functions', () => {
      const result = parseFormula('IF(A1>0,SUM(B1:B10),AVERAGE(C1:C10))');
      expect(result.functions).toContain('IF');
      expect(result.functions).toContain('SUM');
      expect(result.functions).toContain('AVERAGE');
    });
  });

  describe('Excel function validation', () => {
    const validFunctions = [
      // Math functions
      'SUM', 'AVERAGE', 'COUNT', 'COUNTA', 'COUNTIF', 'COUNTIFS',
      'MIN', 'MAX', 'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'INT', 'ABS',
      'SQRT', 'POWER', 'MOD', 'PRODUCT', 'SUMIF', 'SUMIFS',
      'AVERAGEIF', 'AVERAGEIFS', 'MEDIAN', 'MODE',
      // Logical functions
      'IF', 'AND', 'OR', 'NOT', 'XOR', 'TRUE', 'FALSE', 'IFERROR', 'IFNA',
      // Text functions
      'CONCATENATE', 'CONCAT', 'LEFT', 'RIGHT', 'MID', 'LEN', 'TRIM',
      'UPPER', 'LOWER', 'PROPER', 'SUBSTITUTE', 'REPLACE', 'TEXT',
      // Date functions
      'TODAY', 'NOW', 'DATE', 'YEAR', 'MONTH', 'DAY', 'WEEKDAY',
      'DATEDIF', 'DAYS', 'NETWORKDAYS', 'EOMONTH',
      // Lookup functions
      'VLOOKUP', 'HLOOKUP', 'XLOOKUP', 'INDEX', 'MATCH', 'CHOOSE',
      // Statistical functions
      'STDEV', 'STDEVP', 'VAR', 'VARP', 'RANK', 'PERCENTILE',
      // Financial functions
      'PMT', 'FV', 'PV', 'RATE', 'NPV', 'IRR',
    ];

    it.each(validFunctions)('should recognize %s as a valid function', (func) => {
      const result = parseFormula(`${func}(A1)`);
      expect(result.warnings).not.toContainEqual(expect.stringContaining(`Unknown function: ${func}`));
    });
  });

  describe('validateFormula', () => {
    it('should return same result as parseFormula', () => {
      const formula = 'SUM(A1:A10)';
      const parseResult = parseFormula(formula);
      const validateResult = validateFormula(formula);
      expect(validateResult).toEqual(parseResult);
    });
  });

  describe('isFormula', () => {
    it('should detect formula syntax {=...}', () => {
      expect(isFormula('{=SUM(A1:A10)}')).toBe(true);
    });

    it('should return false for regular text', () => {
      expect(isFormula('Regular text')).toBe(false);
    });

    it('should return false for plain equals', () => {
      expect(isFormula('=SUM(A1)')).toBe(false);
    });
  });

  describe('extractFormula', () => {
    it('should extract formula from {=...} syntax', () => {
      expect(extractFormula('{=SUM(A1:A10)}')).toBe('SUM(A1:A10)');
    });

    it('should return null for non-formula text', () => {
      expect(extractFormula('Regular text')).toBeNull();
    });

    it('should extract nested formula', () => {
      expect(extractFormula('{=IF(A1>0,B1,C1)}')).toBe('IF(A1>0,B1,C1)');
    });
  });

  describe('isValidCellReference', () => {
    it('should validate simple cell reference', () => {
      expect(isValidCellReference('A1')).toBe(true);
      expect(isValidCellReference('Z99')).toBe(true);
      expect(isValidCellReference('AA100')).toBe(true);
    });

    it('should validate absolute cell references', () => {
      expect(isValidCellReference('$A$1')).toBe(true);
      expect(isValidCellReference('$A1')).toBe(true);
      expect(isValidCellReference('A$1')).toBe(true);
    });

    it('should reject invalid references', () => {
      expect(isValidCellReference('1A')).toBe(false);
      expect(isValidCellReference('A')).toBe(false);
      expect(isValidCellReference('1')).toBe(false);
      expect(isValidCellReference('')).toBe(false);
    });
  });

  describe('isValidRangeReference', () => {
    it('should validate cell range', () => {
      expect(isValidRangeReference('A1:B10')).toBe(true);
      expect(isValidRangeReference('$A$1:$B$10')).toBe(true);
    });

    it('should validate column range', () => {
      expect(isValidRangeReference('A:A')).toBe(true);
      expect(isValidRangeReference('A:Z')).toBe(true);
    });

    it('should validate row range', () => {
      expect(isValidRangeReference('1:10')).toBe(true);
      expect(isValidRangeReference('1:1')).toBe(true);
    });

    it('should reject invalid ranges', () => {
      expect(isValidRangeReference('A1')).toBe(false);
      expect(isValidRangeReference('A1:B')).toBe(false);
    });
  });

  describe('parseCellReference', () => {
    it('should parse simple reference', () => {
      const result = parseCellReference('A1');
      expect(result).toEqual({
        column: 'A',
        row: 1,
        absoluteColumn: false,
        absoluteRow: false,
      });
    });

    it('should parse absolute column reference', () => {
      const result = parseCellReference('$A1');
      expect(result).toEqual({
        column: 'A',
        row: 1,
        absoluteColumn: true,
        absoluteRow: false,
      });
    });

    it('should parse absolute row reference', () => {
      const result = parseCellReference('A$1');
      expect(result).toEqual({
        column: 'A',
        row: 1,
        absoluteColumn: false,
        absoluteRow: true,
      });
    });

    it('should parse fully absolute reference', () => {
      const result = parseCellReference('$A$1');
      expect(result).toEqual({
        column: 'A',
        row: 1,
        absoluteColumn: true,
        absoluteRow: true,
      });
    });

    it('should parse multi-letter column', () => {
      const result = parseCellReference('AA10');
      expect(result).toEqual({
        column: 'AA',
        row: 10,
        absoluteColumn: false,
        absoluteRow: false,
      });
    });

    it('should return null for invalid reference', () => {
      expect(parseCellReference('invalid')).toBeNull();
    });
  });

  describe('formatCellReference', () => {
    it('should format simple reference', () => {
      expect(formatCellReference('A', 1)).toBe('A1');
    });

    it('should format with absolute column', () => {
      expect(formatCellReference('A', 1, true, false)).toBe('$A1');
    });

    it('should format with absolute row', () => {
      expect(formatCellReference('A', 1, false, true)).toBe('A$1');
    });

    it('should format fully absolute reference', () => {
      expect(formatCellReference('A', 1, true, true)).toBe('$A$1');
    });
  });

  describe('getAllReferences', () => {
    it('should return unique references', () => {
      const refs = getAllReferences('A1+A1+B2');
      expect(refs).toContain('A1');
      expect(refs).toContain('B2');
      expect(refs.filter(r => r === 'A1').length).toBe(1);
    });
  });

  describe('hasCircularReference', () => {
    it('should detect circular reference', () => {
      expect(hasCircularReference('A1+B1', 'A1')).toBe(true);
    });

    it('should return false when no circular reference', () => {
      expect(hasCircularReference('B1+C1', 'A1')).toBe(false);
    });
  });

  describe('sanitiseFormula', () => {
    it('should remove leading equals sign', () => {
      expect(sanitiseFormula('=SUM(A1)')).toBe('SUM(A1)');
    });

    it('should trim whitespace', () => {
      expect(sanitiseFormula('  SUM(A1)  ')).toBe('SUM(A1)');
    });

    it('should remove HTML tags', () => {
      expect(sanitiseFormula('SUM(A1)<script>alert(1)</script>')).toBe('SUM(A1)alert(1)');
    });
  });

  describe('adjustReferences', () => {
    it('should adjust row offset', () => {
      const result = adjustReferences('A1+B1', 1, 0);
      expect(result).toBe('A2+B2');
    });

    it('should adjust column offset', () => {
      const result = adjustReferences('A1+A2', 0, 1);
      expect(result).toBe('B1+B2');
    });

    it('should not adjust absolute references', () => {
      const result = adjustReferences('$A$1+B1', 1, 1);
      expect(result).toContain('$A$1');
      expect(result).toContain('C2');
    });

    it('should handle mixed absolute/relative', () => {
      const result = adjustReferences('$A1+A$1', 1, 1);
      expect(result).toContain('$A2'); // column absolute, row adjusted
      expect(result).toContain('B$1'); // row absolute, column adjusted
    });
  });

  describe('validateFormulaStrict', () => {
    it('should return validation result for valid formula', () => {
      const result = validateFormulaStrict('SUM(A1:A10)');
      expect(result.isValid).toBe(true);
      expect(result.functions).toContain('SUM');
    });

    it('should throw FormulaValidationError for invalid formula', () => {
      expect(() => validateFormulaStrict('SUM(A1:A10')).toThrow(FormulaValidationError);
    });

    it('should include formula and reason in error', () => {
      try {
        validateFormulaStrict('SUM(A1:A10');
        fail('Expected FormulaValidationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FormulaValidationError);
        expect((error as FormulaValidationError).formula).toBe('SUM(A1:A10');
        expect((error as FormulaValidationError).reason).toContain('Mismatched parentheses');
      }
    });

    it('should throw FormulaValidationError for empty formula', () => {
      try {
        validateFormulaStrict('');
        fail('Expected FormulaValidationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FormulaValidationError);
        expect((error as FormulaValidationError).reason).toContain('Empty formula');
      }
    });
  });
});
