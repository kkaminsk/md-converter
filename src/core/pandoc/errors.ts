/**
 * Pandoc-specific error classes
 */

import { ConverterError } from '../errors.js';

/**
 * Error thrown when Pandoc is not installed or not in PATH
 */
export class PandocNotFoundError extends ConverterError {
  constructor(searchedPath?: string) {
    const message = searchedPath
      ? `Pandoc not found at "${searchedPath}". Install from https://pandoc.org/installing.html`
      : 'Pandoc is not installed or not in PATH. Install from https://pandoc.org/installing.html';
    super(message);
    this.name = 'PandocNotFoundError';
  }
}

/**
 * Error thrown when Pandoc version is below minimum required
 */
export class PandocVersionError extends ConverterError {
  readonly requiredVersion: string;
  readonly foundVersion: string;

  constructor(requiredVersion: string, foundVersion: string) {
    super(`Pandoc ${requiredVersion}+ required, found ${foundVersion}`);
    this.name = 'PandocVersionError';
    this.requiredVersion = requiredVersion;
    this.foundVersion = foundVersion;
  }
}

/**
 * Error thrown when Pandoc conversion fails
 */
export class PandocConversionError extends ConverterError {
  readonly stderr: string;
  readonly exitCode: number;
  readonly outputFormat: string;

  constructor(message: string, stderr: string, exitCode: number, outputFormat: string) {
    super(`Pandoc conversion to ${outputFormat} failed: ${message}`);
    this.name = 'PandocConversionError';
    this.stderr = stderr;
    this.exitCode = exitCode;
    this.outputFormat = outputFormat;
  }
}

/**
 * Error thrown when Pandoc process times out
 */
export class PandocTimeoutError extends ConverterError {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Pandoc conversion timed out after ${timeoutMs}ms`);
    this.name = 'PandocTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Error thrown when a Lua filter fails
 */
export class PandocFilterError extends ConverterError {
  readonly filterPath: string;
  readonly filterError: string;

  constructor(filterPath: string, filterError: string) {
    super(`Lua filter "${filterPath}" failed: ${filterError}`);
    this.name = 'PandocFilterError';
    this.filterPath = filterPath;
    this.filterError = filterError;
  }
}

/**
 * Error thrown when reference document is not found
 */
export class PandocReferenceDocError extends ConverterError {
  readonly referencePath: string;

  constructor(referencePath: string) {
    super(`Reference document not found: "${referencePath}"`);
    this.name = 'PandocReferenceDocError';
    this.referencePath = referencePath;
  }
}

/**
 * Error thrown when pre-processing fails
 */
export class PreProcessorError extends ConverterError {
  readonly details?: string;

  constructor(message: string, details?: string) {
    super(details ? `${message}: ${details}` : message);
    this.name = 'PreProcessorError';
    this.details = details;
  }
}
