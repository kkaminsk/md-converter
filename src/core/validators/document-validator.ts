/**
 * Document Validator
 * Strict validation of markdown documents for conversion
 */

import { parseFrontMatter, type DocumentMetadata } from '../parsers/frontmatter-parser.js';
import { parseMarkdown, type ContentBlock } from '../parsers/markdown.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata: DocumentMetadata | null;
}

/**
 * Validate entire markdown document
 */
export function validateDocument(markdown: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Parse and validate front matter
  const frontMatter = parseFrontMatter(markdown);
  errors.push(...frontMatter.errors);
  warnings.push(...frontMatter.warnings);
  
  if (frontMatter.errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
      metadata: frontMatter.metadata,
    };
  }
  
  // Parse content
  const parsed = parseMarkdown(frontMatter.content);
  
  // Validate content structure
  const contentValidation = validateContent(parsed.content);
  errors.push(...contentValidation.errors);
  warnings.push(...contentValidation.warnings);
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: frontMatter.metadata,
  };
}

/**
 * Validate content structure
 */
function validateContent(content: ContentBlock[]): { errors: string[], warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Track heading levels for hierarchy validation
  let lastHeadingLevel = 0;
  let hasH1 = false;
  
  for (let i = 0; i < content.length; i++) {
    const block = content[i];
    
    switch (block.type) {
      case 'heading':
        const level = block.level || 1;
        const text = typeof block.content === 'string' ? block.content : '';
        
        // Check for H1
        if (level === 1) {
          hasH1 = true;
        }
        
        // Check heading hierarchy
        if (lastHeadingLevel > 0 && level > lastHeadingLevel + 1) {
          errors.push(`Heading hierarchy error: H${lastHeadingLevel} followed by H${level} (skipped H${lastHeadingLevel + 1})`);
        }
        
        // Check for empty headings
        if (!text.trim()) {
          errors.push(`Empty heading at position ${i}`);
        }
        
        lastHeadingLevel = level;
        break;
      
      case 'list':
        const items = Array.isArray(block.content) ? block.content : [];
        
        // Check for empty list
        if (items.length === 0) {
          warnings.push(`Empty ${block.ordered ? 'numbered' : 'bullet'} list at position ${i}`);
        }
        
        // Check for orphaned list items (no preceding text/heading)
        if (i === 0) {
          warnings.push('List at document start without introduction');
        }
        break;
      
      case 'table':
        if (typeof block.content === 'object' && 'headers' in block.content) {
          const table = block.content as any;
          const headerCount = table.headers?.length || 0;
          
          // Check table has headers
          if (headerCount === 0) {
            warnings.push(`Table at position ${i} has no headers`);
          }
          
          // Check consistent column counts
          if (table.rows && Array.isArray(table.rows)) {
            for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
              const row = table.rows[rowIdx];
              if (Array.isArray(row) && row.length !== headerCount) {
                errors.push(`Table at position ${i}, row ${rowIdx + 1}: Expected ${headerCount} columns, found ${row.length}`);
              }
            }
          }
        }
        break;
      
      case 'code':
        // Check for language tag (warning only)
        if (block.language === undefined || block.language === '') {
          warnings.push(`Code block at position ${i} has no language tag`);
        }
        break;
    }
  }
  
  // Document-level checks
  if (!hasH1) {
    warnings.push('Document has no H1 heading (title)');
  }
  
  return { errors, warnings };
}

/**
 * Validate heading hierarchy separately for detailed error messages
 */
export function validateHeadingHierarchy(content: ContentBlock[]): { valid: boolean, errors: string[] } {
  const errors: string[] = [];
  let lastLevel = 0;
  
  for (const block of content) {
    if (block.type === 'heading') {
      const level = block.level || 1;
      
      if (lastLevel > 0 && level > lastLevel + 1) {
        const text = typeof block.content === 'string' ? block.content : '';
        errors.push(`H${lastLevel} → H${level}: "${text}" (skipped H${lastLevel + 1})`);
      }
      
      lastLevel = level;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate table structure
 */
export function validateTables(content: ContentBlock[]): { valid: boolean, errors: string[], warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  let tableCount = 0;
  
  for (const block of content) {
    if (block.type === 'table' && typeof block.content === 'object' && 'headers' in block.content) {
      tableCount++;
      const table = block.content as any;
      const headerCount = table.headers?.length || 0;
      
      if (headerCount === 0) {
        errors.push(`Table ${tableCount}: No headers defined`);
      }
      
      if (table.rows && Array.isArray(table.rows)) {
        for (let i = 0; i < table.rows.length; i++) {
          const row = table.rows[i];
          if (Array.isArray(row) && row.length !== headerCount) {
            errors.push(`Table ${tableCount}, Row ${i + 1}: Column count mismatch (expected ${headerCount}, found ${row.length})`);
          }
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Quick check if markdown has front matter
 */
export function hasFrontMatter(markdown: string): boolean {
  return markdown.trimStart().startsWith('---');
}

/**
 * Extract just the metadata without full parsing
 */
export function extractMetadata(markdown: string): DocumentMetadata | null {
  const result = parseFrontMatter(markdown);
  return result.metadata;
}

