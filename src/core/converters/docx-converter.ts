/**
 * DOCX Converter
 * Convert Markdown to Word document using Pandoc pipeline
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { PandocExecutor } from '../pandoc/executor.js';
import { PreProcessor } from '../pandoc/pre-processor.js';
import { PostProcessor } from '../pandoc/post-processor.js';
import {
  getFilterPath,
  getTemplatePath,
  FILTERS,
  TEMPLATES,
} from '../pandoc/filters.js';
import { PandocNotFoundError, PandocConversionError } from '../pandoc/errors.js';
import { ConversionError } from '../errors.js';
import type { PandocOptions } from '../pandoc/types.js';
import type { DocumentMetadata } from '../parsers/frontmatter-parser.js';

export interface DocxConversionOptions {
  pageSize?: 'A4' | 'LETTER';
  margins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  fontSize?: number;
  fontFamily?: string;
}

export interface DocxConversionResult {
  success: boolean;
  outputPath: string;
  pageCount?: number;
  warnings: string[];
}

/**
 * Build Pandoc options for DOCX conversion
 */
function buildPandocOptions(metadata: DocumentMetadata | null): PandocOptions {
  const filters: string[] = [];

  // Add metadata-inject filter first
  const metadataInjectPath = getFilterPath(FILTERS.METADATA_INJECT);
  if (existsSync(metadataInjectPath)) {
    filters.push(metadataInjectPath);
  }

  // Add section-breaks filter
  const sectionBreaksPath = getFilterPath(FILTERS.SECTION_BREAKS);
  if (existsSync(sectionBreaksPath)) {
    filters.push(sectionBreaksPath);
  }

  const options: PandocOptions = {
    inputFormat: 'markdown+yaml_metadata_block+pipe_tables+fenced_code_blocks',
    outputFormat: 'docx',
    standalone: true,
    filters,
    metadata: {},
  };

  // Add reference doc if it exists
  const refDocPath = getTemplatePath(TEMPLATES.REFERENCE_DOCX);
  if (existsSync(refDocPath)) {
    options.referenceDoc = refDocPath;
  }

  // Pass metadata for filters (simple values only)
  // Complex metadata like title, author are read from YAML front matter by Pandoc
  if (metadata) {
    options.metadata = {
      ...options.metadata,
      section_breaks: metadata.section_breaks || 'auto',
    };
  }

  return options;
}

/**
 * Convert Markdown file to DOCX
 */
export async function convertToDocx(
  inputPath: string,
  outputPath?: string,
  options: DocxConversionOptions = {}
): Promise<DocxConversionResult> {
  try {
    // Read markdown file
    const markdown = await fs.readFile(inputPath, 'utf-8');

    // Determine output path
    const output = outputPath || inputPath.replace(/\.md$/, '.docx');

    // Ensure output directory exists
    await fs.mkdir(path.dirname(output), { recursive: true });

    // Delegate to string-based conversion
    return convertMarkdownToDocx(markdown, output, options);
  } catch (error) {
    if (error instanceof ConversionError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new ConversionError(message, 'docx', inputPath);
  }
}

/**
 * Convert content directly from markdown string
 */
export async function convertMarkdownToDocx(
  markdown: string,
  outputPath: string,
  _options: DocxConversionOptions = {}
): Promise<DocxConversionResult> {
  const executor = new PandocExecutor();
  const preProcessor = new PreProcessor();
  const postProcessor = new PostProcessor();

  try {
    // 1. Pre-process (extract metadata, normalize content)
    const preResult = preProcessor.process(markdown);
    const allWarnings = [...preResult.warnings];

    // 2. Build Pandoc options
    const pandocOptions = buildPandocOptions(preResult.extractedData.metadata);

    // 3. Ensure output directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // 4. Execute Pandoc conversion
    const pandocResult = await executor.convert(
      preResult.content,
      pandocOptions,
      outputPath
    );

    if (!pandocResult.success) {
      throw new PandocConversionError(
        pandocResult.stderr || 'Pandoc conversion failed',
        pandocResult.stderr || '',
        pandocResult.exitCode,
        'docx'
      );
    }

    // 5. Post-process (classification headers, properties)
    const postResult = await postProcessor.process({
      format: 'docx',
      outputPath,
      extractedData: preResult.extractedData,
    });

    allWarnings.push(...postResult.warnings);

    return {
      success: true,
      outputPath,
      warnings: allWarnings,
    };
  } catch (error) {
    // Clean up partial output on error
    try {
      if (existsSync(outputPath)) {
        await fs.unlink(outputPath);
      }
    } catch {
      // Ignore cleanup errors
    }

    if (error instanceof PandocNotFoundError) {
      throw new ConversionError(
        'Pandoc is not installed. Please install Pandoc 3.0+ to use DOCX conversion.',
        'docx',
        outputPath
      );
    }

    if (error instanceof PandocConversionError) {
      throw new ConversionError(error.message, 'docx', outputPath);
    }

    if (error instanceof ConversionError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new ConversionError(message, 'docx', outputPath);
  }
}
