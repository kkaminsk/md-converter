/**
 * PPTX Converter
 * Convert Markdown to PowerPoint presentation using Pandoc pipeline
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import JSZip from 'jszip';
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

export interface PptxConversionOptions {
  theme?: 'light' | 'dark';
  layout?: 'title-content' | 'blank' | 'section';
  fontSize?: number;
  fontFamily?: string;
}

export interface PptxConversionResult {
  success: boolean;
  outputPath: string;
  slideCount: number;
  warnings: string[];
}

/**
 * Build Pandoc options for PPTX conversion
 */
function buildPandocOptions(metadata: DocumentMetadata | null): PandocOptions {
  const filters: string[] = [];

  // Add metadata-inject filter first
  const metadataInjectPath = getFilterPath(FILTERS.METADATA_INJECT);
  if (existsSync(metadataInjectPath)) {
    filters.push(metadataInjectPath);
  }

  // Add slide-breaks filter
  const slideBreaksPath = getFilterPath(FILTERS.SLIDE_BREAKS);
  if (existsSync(slideBreaksPath)) {
    filters.push(slideBreaksPath);
  }

  const options: PandocOptions = {
    inputFormat: 'markdown+yaml_metadata_block+pipe_tables+fenced_code_blocks',
    outputFormat: 'pptx',
    standalone: true,
    filters,
    metadata: {},
    variables: {
      'slide-level': '2', // H1 = title slides, H2 = content slides
    },
  };

  // Add reference doc if it exists
  const refDocPath = getTemplatePath(TEMPLATES.REFERENCE_PPTX);
  if (existsSync(refDocPath)) {
    options.referenceDoc = refDocPath;
  }

  // Pass metadata for filters
  if (metadata) {
    options.metadata = {
      ...options.metadata,
      slide_breaks: metadata.slide_breaks || 'h2',
    };
  }

  return options;
}

/**
 * Count slides in a PPTX file by inspecting the archive
 */
async function countSlides(pptxPath: string): Promise<number> {
  const content = await fs.readFile(pptxPath);
  const zip = await JSZip.loadAsync(content);

  // Count slide files (ppt/slides/slide1.xml, slide2.xml, etc.)
  const slideFiles = Object.keys(zip.files).filter(
    (name) => name.match(/^ppt\/slides\/slide\d+\.xml$/)
  );

  return slideFiles.length;
}

/**
 * Convert Markdown file to PPTX
 */
export async function convertToPptx(
  inputPath: string,
  outputPath?: string,
  options: PptxConversionOptions = {}
): Promise<PptxConversionResult> {
  try {
    // Read markdown file
    const markdown = await fs.readFile(inputPath, 'utf-8');

    // Determine output path
    const output = outputPath || inputPath.replace(/\.md$/, '.pptx');

    // Ensure output directory exists
    await fs.mkdir(path.dirname(output), { recursive: true });

    // Delegate to string-based conversion
    return convertMarkdownToPptx(markdown, output, options);
  } catch (error) {
    if (error instanceof ConversionError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new ConversionError(message, 'pptx', inputPath);
  }
}

/**
 * Convert markdown string directly to PPTX
 */
export async function convertMarkdownToPptx(
  markdown: string,
  outputPath: string,
  _options: PptxConversionOptions = {}
): Promise<PptxConversionResult> {
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
        'pptx'
      );
    }

    // 5. Post-process (classification footers, properties)
    const postResult = await postProcessor.process({
      format: 'pptx',
      outputPath,
      extractedData: preResult.extractedData,
    });

    allWarnings.push(...postResult.warnings);

    // 6. Count slides in the output
    const slideCount = await countSlides(outputPath);

    return {
      success: true,
      outputPath,
      slideCount,
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
        'Pandoc is not installed. Please install Pandoc 3.0+ to use PPTX conversion.',
        'pptx',
        outputPath
      );
    }

    if (error instanceof PandocConversionError) {
      throw new ConversionError(error.message, 'pptx', outputPath);
    }

    if (error instanceof ConversionError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new ConversionError(message, 'pptx', outputPath);
  }
}
