/**
 * TypeScript interfaces for Pandoc integration
 */

/**
 * Supported Pandoc input formats
 */
export type PandocInputFormat =
  | 'markdown'
  | 'markdown+yaml_metadata_block'
  | 'markdown+yaml_metadata_block+pipe_tables+grid_tables'
  | 'gfm'
  | 'commonmark';

/**
 * Supported Pandoc output formats
 */
export type PandocOutputFormat = 'docx' | 'pptx' | 'json' | 'html' | 'latex' | 'pdf';

/**
 * Options for Pandoc conversion
 */
export interface PandocOptions {
  /** Input format (markdown variant) */
  inputFormat: PandocInputFormat;

  /** Output format */
  outputFormat: PandocOutputFormat;

  /** Lua filter file paths */
  filters?: string[];

  /** Reference document for styling (DOCX/PPTX) */
  referenceDoc?: string;

  /** Pandoc variables (--variable key=value) */
  variables?: Record<string, string>;

  /** Document metadata (--metadata key=value) */
  metadata?: Record<string, unknown>;

  /** Resource search paths */
  resourcePath?: string[];

  /** Pandoc data directory */
  dataDir?: string;

  /** Produce standalone document with header/footer */
  standalone?: boolean;

  /** Include table of contents */
  tableOfContents?: boolean;

  /** Number sections */
  numberSections?: boolean;

  /** Slide level for presentations (1 or 2) */
  slideLevel?: 1 | 2;

  /** Defaults file path */
  defaultsFile?: string;
}

/**
 * Result from a Pandoc conversion
 */
export interface PandocResult {
  /** Whether conversion succeeded */
  success: boolean;

  /** Output file path (if writing to file) */
  outputPath?: string;

  /** Output buffer (if returning content) */
  outputBuffer?: Buffer;

  /** Pandoc stderr output */
  stderr: string;

  /** Pandoc exit code */
  exitCode: number;

  /** Conversion duration in milliseconds */
  duration: number;
}

/**
 * Pandoc installation info
 */
export interface PandocInstallation {
  /** Whether Pandoc is installed */
  installed: boolean;

  /** Pandoc version string (e.g., "3.1.2") */
  version?: string;

  /** Path to Pandoc binary */
  path?: string;

  /** Error message if not installed or version check failed */
  error?: string;
}

/**
 * Pandoc AST structure (JSON representation)
 */
export interface PandocAST {
  /** Pandoc API version */
  'pandoc-api-version': number[];

  /** Document metadata */
  meta: PandocMeta;

  /** Document blocks */
  blocks: PandocBlock[];
}

/**
 * Pandoc metadata object
 */
export interface PandocMeta {
  [key: string]: PandocMetaValue;
}

/**
 * Pandoc metadata value types
 */
export interface PandocMetaValue {
  t: 'MetaString' | 'MetaInlines' | 'MetaBlocks' | 'MetaList' | 'MetaMap' | 'MetaBool';
  c: unknown;
}

/**
 * Pandoc block element
 */
export interface PandocBlock {
  /** Block type (Header, Para, Table, CodeBlock, etc.) */
  t: string;

  /** Block content */
  c: unknown;
}

/**
 * Pandoc inline element
 */
export interface PandocInline {
  /** Inline type (Str, Space, Emph, Strong, etc.) */
  t: string;

  /** Inline content */
  c?: unknown;
}

/**
 * Pandoc table structure
 */
export interface PandocTable {
  /** Table caption */
  caption: PandocInline[];

  /** Column alignments */
  colSpecs: Array<[string, number | null]>;

  /** Table head */
  head: PandocTableHead;

  /** Table bodies */
  bodies: PandocTableBody[];

  /** Table foot */
  foot: PandocTableFoot;
}

export interface PandocTableHead {
  attr: PandocAttr;
  rows: PandocTableRow[];
}

export interface PandocTableBody {
  attr: PandocAttr;
  rowHeadColumns: number;
  head: PandocTableRow[];
  body: PandocTableRow[];
}

export interface PandocTableFoot {
  attr: PandocAttr;
  rows: PandocTableRow[];
}

export interface PandocTableRow {
  attr: PandocAttr;
  cells: PandocTableCell[];
}

export interface PandocTableCell {
  attr: PandocAttr;
  alignment: string;
  rowSpan: number;
  colSpan: number;
  content: PandocBlock[];
}

/**
 * Pandoc attribute tuple [identifier, classes, key-value pairs]
 */
export type PandocAttr = [string, string[], Array<[string, string]>];

// ============================================================================
// Pre-processor types
// ============================================================================

import type { DocumentMetadata } from '../parsers/frontmatter-parser.js';

/**
 * Location of an extracted formula in the markdown
 */
export interface FormulaLocation {
  /** 0-based index of the table in the document */
  tableIndex: number;

  /** 0-based row index within the table (header=0, separator skipped, first data=1) */
  row: number;

  /** 0-based column index */
  column: number;

  /** Original formula text (without {= }) */
  formula: string;

  /** Generated placeholder (e.g., __FORMULA_0_2_3__) */
  placeholder: string;
}

/**
 * Result from pre-processing markdown content
 */
export interface PreProcessorResult {
  /** Markdown content with formula placeholders */
  content: string;

  /** Data extracted during pre-processing */
  extractedData: {
    /** All extracted formulas with their locations */
    formulas: FormulaLocation[];

    /** Normalized document metadata */
    metadata: DocumentMetadata | null;

    /** Number of tables found in the document */
    tableCount: number;
  };

  /** Warnings collected during processing */
  warnings: string[];
}

/**
 * Options for pre-processor behavior
 */
export interface PreProcessorOptions {
  /** Whether to validate extracted formulas (default: true) */
  validateFormulas?: boolean;

  /** Whether to preserve original line endings (default: false) */
  preserveLineEndings?: boolean;
}

// ============================================================================
// Post-processor types
// ============================================================================

/**
 * Options for post-processing Pandoc output
 */
export interface PostProcessorOptions {
  /** Output format being processed */
  format: 'docx' | 'pptx' | 'xlsx';

  /** Data extracted during pre-processing */
  extractedData: {
    /** Formulas to inject (for XLSX) */
    formulas: FormulaLocation[];

    /** Document metadata */
    metadata: DocumentMetadata | null;

    /** Number of tables in document */
    tableCount: number;
  };

  /** Path to the file to post-process */
  outputPath: string;
}

/**
 * Result from post-processing
 */
export interface PostProcessorResult {
  /** Whether processing completed without critical errors */
  success: boolean;

  /** Path to the processed file */
  outputPath: string;

  /** List of modifications made (for logging/debugging) */
  modifications: string[];

  /** Non-critical warnings encountered */
  warnings: string[];
}
