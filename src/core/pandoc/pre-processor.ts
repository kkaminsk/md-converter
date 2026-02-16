/**
 * Pandoc Pre-Processor
 * Prepares markdown content for Pandoc conversion by:
 * - Extracting Excel formulas and replacing with placeholders
 * - Normalizing metadata for Pandoc compatibility
 * - Normalizing line endings for cross-platform consistency
 */

import * as yaml from 'js-yaml';
import { parseFrontMatter } from '../parsers/frontmatter-parser.js';
import { validateFormula } from '../parsers/formula-parser.js';
import { PreProcessorError } from './errors.js';
import type {
  FormulaLocation,
  PreProcessorResult,
  PreProcessorOptions,
} from './types.js';
import type { DocumentMetadata } from '../parsers/frontmatter-parser.js';

/**
 * Pre-processor for markdown content before Pandoc conversion
 */
export class PreProcessor {
  /**
   * Process markdown content for Pandoc conversion
   */
  process(markdown: string, options: PreProcessorOptions = {}): PreProcessorResult {
    const { validateFormulas = true, preserveLineEndings = false } = options;
    const warnings: string[] = [];

    // Step 1: Normalize line endings (unless disabled)
    let content = preserveLineEndings ? markdown : this.normalizeLineEndings(markdown);

    // Step 2: Parse and normalize metadata
    const { metadata, content: contentWithoutFrontMatter, metadataWarnings } =
      this.parseMetadata(content);
    warnings.push(...metadataWarnings);

    // Step 3: Extract formulas from tables
    const { processedContent, formulas, tableCount, formulaWarnings } =
      this.extractFormulas(contentWithoutFrontMatter, validateFormulas);
    warnings.push(...formulaWarnings);

    // Reconstruct content with front matter if metadata exists
    const finalContent = this.reconstructContent(metadata, processedContent);

    return {
      content: finalContent,
      extractedData: {
        formulas,
        metadata: this.normalizeMetadata(metadata),
        tableCount,
      },
      warnings,
    };
  }

  /**
   * Normalize line endings to LF
   */
  private normalizeLineEndings(content: string): string {
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  /**
   * Parse front matter and extract metadata
   */
  private parseMetadata(content: string): {
    metadata: DocumentMetadata | null;
    content: string;
    metadataWarnings: string[];
  } {
    try {
      const result = parseFrontMatter(content);

      if (result.errors.length > 0) {
        // YAML syntax errors should throw
        throw new PreProcessorError('Invalid YAML front matter', result.errors[0]);
      }

      return {
        metadata: result.metadata,
        content: result.content,
        metadataWarnings: result.warnings,
      };
    } catch (error) {
      if (error instanceof PreProcessorError) {
        throw error;
      }
      // Re-throw unexpected errors
      throw new PreProcessorError(
        'Failed to parse front matter',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Normalize metadata for Pandoc compatibility
   */
  private normalizeMetadata(metadata: DocumentMetadata | null): DocumentMetadata | null {
    if (!metadata) {
      return null;
    }

    const normalized = { ...metadata } as DocumentMetadata & { generator?: string; subject?: string };

    // Add generator field
    normalized.generator = 'md-converter';

    // Map classification to subject for DOCX document properties
    if (metadata.classification && !metadata.subject) {
      normalized.subject = metadata.classification;
    }

    return normalized as DocumentMetadata;
  }

  /**
   * Extract formulas from markdown tables
   */
  private extractFormulas(
    content: string,
    shouldValidate: boolean
  ): {
    processedContent: string;
    formulas: FormulaLocation[];
    tableCount: number;
    formulaWarnings: string[];
  } {
    const formulas: FormulaLocation[] = [];
    const warnings: string[] = [];
    const lines = content.split('\n');
    const processedLines: string[] = [];

    let tableIndex = -1;
    let inTable = false;
    let tableRowIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isTableLine = this.isTableLine(line);
      const isSeparatorLine = this.isSeparatorLine(line);

      if (isTableLine) {
        if (!inTable) {
          // Starting a new table
          inTable = true;
          tableIndex++;
          tableRowIndex = 0;
        }

        if (isSeparatorLine) {
          // Skip separator in row counting
          processedLines.push(line);
          continue;
        }

        // Process table row for formulas
        const { processedLine, rowFormulas, rowWarnings } = this.processTableRow(
          line,
          tableIndex,
          tableRowIndex,
          shouldValidate
        );

        formulas.push(...rowFormulas);
        warnings.push(...rowWarnings);
        processedLines.push(processedLine);
        tableRowIndex++;
      } else {
        // Not a table line
        if (inTable) {
          // Just exited a table
          inTable = false;
        }
        processedLines.push(line);
      }
    }

    return {
      processedContent: processedLines.join('\n'),
      formulas,
      tableCount: tableIndex + 1,
      formulaWarnings: warnings,
    };
  }

  /**
   * Check if a line is part of a pipe table
   */
  private isTableLine(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|');
  }

  /**
   * Check if a line is a table separator (|---|---|)
   */
  private isSeparatorLine(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
      return false;
    }
    // Separator has only |, -, :, and spaces
    const inner = trimmed.slice(1, -1);
    return /^[\s|:\-]+$/.test(inner) && inner.includes('-');
  }

  /**
   * Process a single table row, extracting formulas
   */
  private processTableRow(
    line: string,
    tableIndex: number,
    rowIndex: number,
    shouldValidate: boolean
  ): {
    processedLine: string;
    rowFormulas: FormulaLocation[];
    rowWarnings: string[];
  } {
    const formulas: FormulaLocation[] = [];
    const warnings: string[] = [];

    // Split by | but keep structure
    const cells = this.splitTableRow(line);
    const processedCells: string[] = [];

    for (let colIndex = 0; colIndex < cells.length; colIndex++) {
      const cell = cells[colIndex];
      const formulaMatch = cell.match(/\{=([^}]+)\}/);

      if (formulaMatch) {
        const formulaText = formulaMatch[1];
        const placeholder = `__FORMULA_${tableIndex}_${rowIndex}_${colIndex}__`;

        formulas.push({
          tableIndex,
          row: rowIndex,
          column: colIndex,
          formula: formulaText,
          placeholder,
        });

        // Validate if enabled
        if (shouldValidate) {
          const validation = validateFormula(formulaText);
          if (!validation.isValid) {
            warnings.push(
              `Invalid formula at table ${tableIndex}, row ${rowIndex}, column ${colIndex}: ${validation.errors.join(', ')}`
            );
          }
        }

        // Replace formula with placeholder
        processedCells.push(cell.replace(/\{=[^}]+\}/, placeholder));
      } else {
        processedCells.push(cell);
      }
    }

    return {
      processedLine: '|' + processedCells.join('|') + '|',
      rowFormulas: formulas,
      rowWarnings: warnings,
    };
  }

  /**
   * Split a table row into cells, preserving whitespace
   */
  private splitTableRow(line: string): string[] {
    // Remove leading and trailing |
    const inner = line.trim().slice(1, -1);
    return inner.split('|');
  }

  /**
   * Reconstruct markdown content with front matter
   */
  private reconstructContent(
    metadata: DocumentMetadata | null,
    content: string
  ): string {
    if (!metadata) {
      return content;
    }

    // Reconstruct YAML front matter using js-yaml for proper serialization
    const normalizedMeta = this.normalizeMetadata(metadata);

    if (!normalizedMeta) {
      return content;
    }

    // Filter out undefined values
    const cleanMeta: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(normalizedMeta)) {
      if (value !== undefined) {
        cleanMeta[key] = value;
      }
    }

    const yamlStr = yaml.dump(cleanMeta, {
      lineWidth: -1, // Don't wrap lines
      quotingType: '"',
      forceQuotes: false,
    });

    return `---\n${yamlStr}---\n${content}`;
  }
}
