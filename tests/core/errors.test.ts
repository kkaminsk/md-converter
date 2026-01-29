import {
  ConverterError,
  FormulaValidationError,
  FrontMatterError,
  ConversionError,
  ValidationError,
} from '../../src/core/errors.js';

describe('errors', () => {
  describe('ConverterError', () => {
    it('should create error with message', () => {
      const error = new ConverterError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ConverterError');
    });

    it('should be instanceof Error', () => {
      const error = new ConverterError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ConverterError);
    });

    it('should have stack trace', () => {
      const error = new ConverterError('Test error');
      expect(error.stack).toBeDefined();
    });
  });

  describe('FormulaValidationError', () => {
    it('should create error with formula and reason', () => {
      const error = new FormulaValidationError('SUM(A1:A10', 'Mismatched parentheses');
      expect(error.formula).toBe('SUM(A1:A10');
      expect(error.reason).toBe('Mismatched parentheses');
      expect(error.name).toBe('FormulaValidationError');
    });

    it('should format message correctly', () => {
      const error = new FormulaValidationError('SUM(A1:A10', 'Mismatched parentheses');
      expect(error.message).toBe('Invalid formula "SUM(A1:A10": Mismatched parentheses');
    });

    it('should be instanceof ConverterError', () => {
      const error = new FormulaValidationError('=BAD', 'reason');
      expect(error).toBeInstanceOf(ConverterError);
      expect(error).toBeInstanceOf(FormulaValidationError);
    });
  });

  describe('FrontMatterError', () => {
    it('should create error with message only', () => {
      const error = new FrontMatterError('Invalid YAML syntax');
      expect(error.message).toBe('Front matter error: Invalid YAML syntax');
      expect(error.field).toBeNull();
      expect(error.value).toBeUndefined();
      expect(error.name).toBe('FrontMatterError');
    });

    it('should create error with field and value', () => {
      const error = new FrontMatterError('Invalid format', 'format', 'invalid');
      expect(error.message).toBe('Front matter error in field "format": Invalid format');
      expect(error.field).toBe('format');
      expect(error.value).toBe('invalid');
    });

    it('should handle null value', () => {
      const error = new FrontMatterError('Required field missing', 'title', null);
      expect(error.field).toBe('title');
      expect(error.value).toBeNull();
    });

    it('should be instanceof ConverterError', () => {
      const error = new FrontMatterError('test');
      expect(error).toBeInstanceOf(ConverterError);
      expect(error).toBeInstanceOf(FrontMatterError);
    });
  });

  describe('ConversionError', () => {
    it('should create error with format and source', () => {
      const error = new ConversionError('File not found', 'docx', 'input.md');
      expect(error.format).toBe('docx');
      expect(error.source).toBe('input.md');
      expect(error.name).toBe('ConversionError');
    });

    it('should format message correctly', () => {
      const error = new ConversionError('File not found', 'xlsx', 'data.md');
      expect(error.message).toBe('Conversion to xlsx failed for "data.md": File not found');
    });

    it('should be instanceof ConverterError', () => {
      const error = new ConversionError('test', 'pptx', 'file.md');
      expect(error).toBeInstanceOf(ConverterError);
      expect(error).toBeInstanceOf(ConversionError);
    });
  });

  describe('ValidationError', () => {
    it('should create error with rule only', () => {
      const error = new ValidationError('Title required', 'required-field');
      expect(error.rule).toBe('required-field');
      expect(error.location).toBeNull();
      expect(error.name).toBe('ValidationError');
    });

    it('should create error with rule and location', () => {
      const error = new ValidationError('Invalid heading level', 'heading-hierarchy', 'line 5');
      expect(error.rule).toBe('heading-hierarchy');
      expect(error.location).toBe('line 5');
    });

    it('should format message without location', () => {
      const error = new ValidationError('Required', 'required-field');
      expect(error.message).toBe('Validation failed (required-field): Required');
    });

    it('should format message with location', () => {
      const error = new ValidationError('Error here', 'structure', 'position 5');
      expect(error.message).toBe('Validation failed (structure) at position 5: Error here');
    });

    it('should be instanceof ConverterError', () => {
      const error = new ValidationError('test', 'rule');
      expect(error).toBeInstanceOf(ConverterError);
      expect(error).toBeInstanceOf(ValidationError);
    });
  });

  describe('error discrimination', () => {
    it('should distinguish error types with instanceof', () => {
      const errors = [
        new ConverterError('base'),
        new FormulaValidationError('=bad', 'reason'),
        new FrontMatterError('yaml error'),
        new ConversionError('failed', 'docx', 'file.md'),
        new ValidationError('invalid', 'rule'),
      ];

      // All should be ConverterError
      errors.forEach(error => {
        expect(error).toBeInstanceOf(ConverterError);
      });

      // Only specific ones should be their type
      expect(errors[0]).toBeInstanceOf(ConverterError);
      expect(errors[0]).not.toBeInstanceOf(FormulaValidationError);

      expect(errors[1]).toBeInstanceOf(FormulaValidationError);
      expect(errors[1]).not.toBeInstanceOf(FrontMatterError);

      expect(errors[2]).toBeInstanceOf(FrontMatterError);
      expect(errors[2]).not.toBeInstanceOf(ConversionError);

      expect(errors[3]).toBeInstanceOf(ConversionError);
      expect(errors[3]).not.toBeInstanceOf(ValidationError);

      expect(errors[4]).toBeInstanceOf(ValidationError);
      expect(errors[4]).not.toBeInstanceOf(FormulaValidationError);
    });
  });
});
