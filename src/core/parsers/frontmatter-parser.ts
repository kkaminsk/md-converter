/**
 * Front Matter Parser
 * Parse and validate YAML front matter from Markdown documents
 */

import * as yaml from 'js-yaml';
import { FrontMatterError } from '../errors.js';

export interface DocumentMetadata {
  // Required fields
  format: 'docx' | 'pptx' | 'xlsx' | 'docx,pptx' | 'docx,xlsx' | 'all';
  title: string;

  // Extended fields
  author?: string;
  date?: string;
  classification?: string;
  version?: string;
  status?: 'draft' | 'review' | 'approved' | 'final';
  description?: string;
  keywords?: string[];
  subject?: string;

  // Document control
  convert?: boolean; // Explicitly enable/disable conversion (default: true)
  document_type?: 'document' | 'email' | 'reference' | 'note' | 'system'; // Document category

  // Format-specific
  section_breaks?: 'auto' | 'all' | 'none'; // For DOCX
  slide_breaks?: 'h1' | 'h2' | 'hr'; // For PPTX
  date_format?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'; // For date parsing in tables
}

export interface FrontMatterResult {
  metadata: DocumentMetadata | null;
  content: string;
  warnings: string[];
  errors: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_FORMATS = ['docx', 'pptx', 'xlsx', 'docx,pptx', 'docx,xlsx', 'all'];
const VALID_STATUSES = ['draft', 'review', 'approved', 'final'];
const VALID_SECTION_BREAKS = ['auto', 'all', 'none'];
const VALID_SLIDE_BREAKS = ['h1', 'h2', 'hr'];
const VALID_DOCUMENT_TYPES = ['document', 'email', 'reference', 'note', 'system'];
const VALID_DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

/**
 * Parse YAML front matter from markdown content
 */
export function parseFrontMatter(markdown: string): FrontMatterResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check if document starts with ---
  if (!markdown.trimStart().startsWith('---')) {
    return {
      metadata: null,
      content: markdown,
      warnings: ['No YAML front matter found. Consider adding metadata.'],
      errors: [],
    };
  }

  // Extract front matter
  const lines = markdown.split('\n');
  let frontMatterEnd = -1;
  let inFrontMatter = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (i === 0 && line === '---') {
      inFrontMatter = true;
      continue;
    }

    if (inFrontMatter && line === '---') {
      frontMatterEnd = i;
      break;
    }
  }

  if (frontMatterEnd === -1) {
    errors.push('Invalid front matter: Missing closing --- delimiter');
    return {
      metadata: null,
      content: markdown,
      warnings,
      errors,
    };
  }

  // Parse YAML
  const frontMatterText = lines.slice(1, frontMatterEnd).join('\n');
  const content = lines.slice(frontMatterEnd + 1).join('\n');

  let metadata: any;
  try {
    metadata = yaml.load(frontMatterText);
  } catch (error) {
    const yamlError = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Invalid YAML syntax: ${yamlError}`);
    return {
      metadata: null,
      content,
      warnings,
      errors,
    };
  }

  // Validate metadata
  const validation = validateFrontMatter(metadata);

  if (!validation.valid) {
    return {
      metadata: null,
      content,
      warnings: validation.warnings,
      errors: validation.errors,
    };
  }

  return {
    metadata: metadata as DocumentMetadata,
    content,
    warnings: validation.warnings,
    errors: [],
  };
}

/**
 * Validate front matter metadata against schema
 */
export function validateFrontMatter(metadata: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!metadata || typeof metadata !== 'object') {
    errors.push('Front matter must be a valid object');
    return { valid: false, errors, warnings };
  }

  // Required fields
  if (!metadata.format) {
    errors.push('Required field missing: format');
  } else if (!VALID_FORMATS.includes(metadata.format)) {
    errors.push(
      `Invalid format: "${metadata.format}". Must be one of: ${VALID_FORMATS.join(', ')}`
    );
  }

  if (!metadata.title) {
    errors.push('Required field missing: title');
  } else if (typeof metadata.title !== 'string') {
    errors.push('Field "title" must be a string');
  }

  // Optional field validation
  if (metadata.author && typeof metadata.author !== 'string') {
    errors.push('Field "author" must be a string');
  }

  if (metadata.date) {
    if (typeof metadata.date !== 'string') {
      errors.push('Field "date" must be a string');
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(metadata.date)) {
      warnings.push('Field "date" should be in YYYY-MM-DD format');
    }
  }

  if (metadata.classification && typeof metadata.classification !== 'string') {
    errors.push('Field "classification" must be a string');
  }

  if (metadata.version && typeof metadata.version !== 'string') {
    errors.push('Field "version" must be a string');
  }

  if (metadata.status && !VALID_STATUSES.includes(metadata.status)) {
    errors.push(
      `Invalid status: "${metadata.status}". Must be one of: ${VALID_STATUSES.join(', ')}`
    );
  }

  if (metadata.description) {
    if (typeof metadata.description !== 'string') {
      errors.push('Field "description" must be a string');
    } else if (metadata.description.length > 250) {
      warnings.push(
        `Description is ${metadata.description.length} characters (recommended max: 250)`
      );
    }
  }

  if (metadata.keywords) {
    if (!Array.isArray(metadata.keywords)) {
      errors.push('Field "keywords" must be an array');
    } else if (!metadata.keywords.every((k: any) => typeof k === 'string')) {
      errors.push('All keywords must be strings');
    }
  }

  if (metadata.subject && typeof metadata.subject !== 'string') {
    errors.push('Field "subject" must be a string');
  }

  if (metadata.section_breaks && !VALID_SECTION_BREAKS.includes(metadata.section_breaks)) {
    errors.push(
      `Invalid section_breaks: "${metadata.section_breaks}". Must be one of: ${VALID_SECTION_BREAKS.join(', ')}`
    );
  }

  if (metadata.slide_breaks && !VALID_SLIDE_BREAKS.includes(metadata.slide_breaks)) {
    errors.push(
      `Invalid slide_breaks: "${metadata.slide_breaks}". Must be one of: ${VALID_SLIDE_BREAKS.join(', ')}`
    );
  }

  if (metadata.convert !== undefined && typeof metadata.convert !== 'boolean') {
    errors.push('Field "convert" must be a boolean (true or false)');
  }

  if (metadata.document_type && !VALID_DOCUMENT_TYPES.includes(metadata.document_type)) {
    errors.push(
      `Invalid document_type: "${metadata.document_type}". Must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}`
    );
  }

  if (metadata.date_format && !VALID_DATE_FORMATS.includes(metadata.date_format)) {
    errors.push(
      `Invalid date_format: "${metadata.date_format}". Must be one of: ${VALID_DATE_FORMATS.join(', ')}`
    );
  }

  // Completeness warnings
  if (!metadata.author) {
    warnings.push('Recommended field missing: author');
  }

  if (!metadata.date) {
    warnings.push('Recommended field missing: date');
  }

  if (!metadata.classification) {
    warnings.push('Recommended field missing: classification');
  }

  if (!metadata.version) {
    warnings.push('Recommended field missing: version');
  }

  if (!metadata.keywords || metadata.keywords.length === 0) {
    warnings.push('Recommended field missing: keywords');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get format list from metadata
 */
export function getFormats(metadata: DocumentMetadata | null): string[] {
  if (!metadata) return ['docx']; // Default format

  if (metadata.format === 'all') {
    return ['docx', 'pptx', 'xlsx'];
  }

  return metadata.format.split(',') as string[];
}

/**
 * Check if a specific format should be generated
 */
export function shouldGenerateFormat(
  metadata: DocumentMetadata | null,
  format: 'docx' | 'pptx' | 'xlsx'
): boolean {
  const formats = getFormats(metadata);
  return formats.includes(format);
}

/**
 * Check if document should be converted based on metadata
 */
export function shouldConvertDocument(metadata: DocumentMetadata | null): boolean {
  // Explicit convert: false flag
  if (metadata?.convert === false) {
    return false;
  }

  // Exclude certain document types
  const excludedTypes: string[] = ['email', 'reference', 'note', 'system'];
  if (metadata?.document_type && excludedTypes.includes(metadata.document_type)) {
    return false;
  }

  return true;
}

/**
 * Check if file should be excluded based on naming pattern
 */
export function shouldExcludeByPath(filePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Exclude README files
  if (/\/README\.md$/i.test(normalizedPath) || /^README\.md$/i.test(normalizedPath)) {
    return true;
  }

  // Exclude /notes/ directory
  if (/\/notes\//i.test(normalizedPath)) {
    return true;
  }

  // Exclude /reference/ or /references/ directory
  if (/\/references?\//i.test(normalizedPath)) {
    return true;
  }

  return false;
}

/**
 * Parse front matter and throw FrontMatterError on failure
 */
export function parseFrontMatterStrict(markdown: string): {
  metadata: DocumentMetadata;
  content: string;
  warnings: string[];
} {
  const result = parseFrontMatter(markdown);

  if (result.errors.length > 0) {
    // Find the most relevant error
    const firstError = result.errors[0];

    // Check for field-specific errors
    const fieldMatch = firstError.match(/field (?:missing: |")?(\w+)/i);
    if (fieldMatch) {
      throw new FrontMatterError(firstError, fieldMatch[1]);
    }

    throw new FrontMatterError(firstError);
  }

  if (!result.metadata) {
    throw new FrontMatterError('No valid front matter found');
  }

  return {
    metadata: result.metadata,
    content: result.content,
    warnings: result.warnings,
  };
}
