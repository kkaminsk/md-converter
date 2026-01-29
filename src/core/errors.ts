/**
 * Custom Error Classes
 * Specific error types for different failure scenarios
 */

/**
 * Base error class for all converter errors
 * Extends Error to add structured context for error handling
 */
export class ConverterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConverterError';
    // Maintain proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when Excel formula validation fails
 */
export class FormulaValidationError extends ConverterError {
  readonly formula: string;
  readonly reason: string;

  constructor(formula: string, reason: string) {
    super(`Invalid formula "${formula}": ${reason}`);
    this.name = 'FormulaValidationError';
    this.formula = formula;
    this.reason = reason;
  }
}

/**
 * Error thrown when YAML front matter parsing or validation fails
 */
export class FrontMatterError extends ConverterError {
  readonly field: string | null;
  readonly value: unknown;

  constructor(message: string, field: string | null = null, value: unknown = undefined) {
    super(field ? `Front matter error in field "${field}": ${message}` : `Front matter error: ${message}`);
    this.name = 'FrontMatterError';
    this.field = field;
    this.value = value;
  }
}

/**
 * Error thrown when document conversion fails
 */
export class ConversionError extends ConverterError {
  readonly format: string;
  readonly source: string;

  constructor(message: string, format: string, source: string) {
    super(`Conversion to ${format} failed for "${source}": ${message}`);
    this.name = 'ConversionError';
    this.format = format;
    this.source = source;
  }
}

/**
 * Error thrown when document structure validation fails
 */
export class ValidationError extends ConverterError {
  readonly rule: string;
  readonly location: string | null;

  constructor(message: string, rule: string, location: string | null = null) {
    super(location ? `Validation failed (${rule}) at ${location}: ${message}` : `Validation failed (${rule}): ${message}`);
    this.name = 'ValidationError';
    this.rule = rule;
    this.location = location;
  }
}
