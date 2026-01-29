/**
 * Pandoc integration module
 * Exports all Pandoc-related types, errors, and the executor
 */

// Types
export type {
  PandocInputFormat,
  PandocOutputFormat,
  PandocOptions,
  PandocResult,
  PandocInstallation,
  PandocAST,
  PandocMeta,
  PandocMetaValue,
  PandocBlock,
  PandocInline,
  PandocTable,
  PandocTableHead,
  PandocTableBody,
  PandocTableFoot,
  PandocTableRow,
  PandocTableCell,
  PandocAttr,
  // Pre-processor types
  FormulaLocation,
  PreProcessorResult,
  PreProcessorOptions,
} from './types.js';

// Errors
export {
  PandocNotFoundError,
  PandocVersionError,
  PandocConversionError,
  PandocTimeoutError,
  PandocFilterError,
  PandocReferenceDocError,
  PreProcessorError,
} from './errors.js';

// Executor
export { PandocExecutor } from './executor.js';

// Pre-processor
export { PreProcessor } from './pre-processor.js';

// Filter and template utilities
export {
  getFiltersDir,
  getTemplatesDir,
  getFilterPath,
  getTemplatePath,
  getDefaultsPath,
  filterExists,
  templateExists,
  FILTERS,
  TEMPLATES,
  DEFAULTS,
} from './filters.js';
