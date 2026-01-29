/**
 * PPTX Converter
 * Convert Markdown to PowerPoint presentation
 */

import { createRequire } from 'module';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  parseMarkdown,
  splitByHorizontalRules,
  extractContent,
  type ContentBlock,
  type TableData,
} from '../parsers/markdown.js';
import { parseFrontMatter } from '../parsers/frontmatter-parser.js';
import { parseInlineTokens, type InlineSegment } from '../parsers/inline-parser.js';
import { ConversionError } from '../errors.js';

// The pptxgenjs library has ESM/CJS interop issues.
// Using createRequire for compatibility.
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PptxGenJS: any = require('pptxgenjs');

// Type definitions for pptxgenjs constructs
interface PptxPresentation {
  author: string;
  company: string;
  subject: string;
  title: string;
  keywords: string;
  slides: PptxSlide[];
  addSlide: () => PptxSlide;
  writeFile: (options: { fileName: string }) => Promise<void>;
}

interface PptxTextSegment {
  text: string;
  options?: {
    bold?: boolean;
    italic?: boolean;
    fontFace?: string;
    color?: string;
  };
}

interface PptxSlide {
  background: { color: string };
  addText: (text: string | PptxTextSegment[], options: PptxTextOptions) => void;
  addTable: (rows: PptxTableCell[][], options: PptxTableOptions) => void;
}

interface PptxTextOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize?: number;
  bold?: boolean;
  color?: string;
  align?: string;
  fontFace?: string;
  bullet?: boolean | { type: string };
  fill?: { color: string };
}

interface PptxTableOptions {
  x: number;
  y: number;
  w: number;
  border?: { type: string; pt: number; color: string };
}

interface PptxTableCell {
  text: string;
  options?: {
    bold?: boolean;
    fontSize?: number;
    color?: string;
    fill?: { color: string };
  };
}

interface ThemeColors {
  background: string;
  text: string;
  accent: string;
}

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
 * Convert Markdown file to PPTX
 */
export async function convertToPptx(
  inputPath: string,
  outputPath?: string,
  options: PptxConversionOptions = {}
): Promise<PptxConversionResult> {
  try {
    // Read markdown file
    const rawMarkdown = await fs.readFile(inputPath, 'utf-8');

    // Parse front matter
    const {
      metadata,
      content: markdownContent,
      warnings: fmWarnings,
    } = parseFrontMatter(rawMarkdown);

    // Parse markdown
    const parsed = parseMarkdown(markdownContent);

    // Determine output path
    const output = outputPath || inputPath.replace(/\.md$/, '.pptx');

    const warnings: string[] = [...fmWarnings];

    // Create presentation
    const pres = new PptxGenJS() as PptxPresentation;

    // Set presentation properties from metadata
    pres.author = metadata?.author || 'MD Converter';
    pres.company = '';
    pres.subject = metadata?.subject || 'Converted from Markdown';
    pres.title = metadata?.title || path.basename(inputPath, '.md');
    pres.keywords = metadata?.keywords?.join(', ') || '';

    // Apply theme
    const themeColors = getThemeColors(options.theme || 'light');

    // Split content by horizontal rules (slides)
    const slideGroups = splitByHorizontalRules(parsed.tokens);

    if (slideGroups.length === 0) {
      // No horizontal rules, treat as single content flow
      createSlidesFromContent(pres, parsed.content, options, themeColors, warnings);
    } else {
      // Create slides from groups
      for (const group of slideGroups) {
        const content = extractContent(group);
        createSlidesFromContent(pres, content, options, themeColors, warnings);
      }
    }

    // Ensure output directory exists
    await fs.mkdir(path.dirname(output), { recursive: true });

    // Save presentation
    await pres.writeFile({ fileName: output });

    return {
      success: true,
      outputPath: output,
      slideCount: pres.slides.length,
      warnings,
    };
  } catch (error) {
    if (error instanceof ConversionError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new ConversionError(message, 'pptx', inputPath);
  }
}

/**
 * Get theme colors
 */
function getThemeColors(theme: 'light' | 'dark'): ThemeColors {
  if (theme === 'dark') {
    return {
      background: '1F1F1F',
      text: 'FFFFFF',
      accent: '4A9EFF',
    };
  }

  return {
    background: 'FFFFFF',
    text: '000000',
    accent: '0066CC',
  };
}

/**
 * Create slides from content blocks
 */
function createSlidesFromContent(
  pres: PptxPresentation,
  content: ContentBlock[],
  options: PptxConversionOptions,
  themeColors: ThemeColors,
  _warnings: string[]
): void {
  let i = 0;

  while (i < content.length) {
    const block = content[i];

    if (block.type === 'heading' && block.level === 1) {
      // H1 = Title slide
      const nextBlock = content[i + 1];
      const subtitle =
        nextBlock?.type === 'paragraph'
          ? typeof nextBlock.content === 'string'
            ? (nextBlock.content as string)
            : ''
          : '';

      createTitleSlide(pres, block, subtitle, options, themeColors);
      i += subtitle ? 2 : 1;
    } else if (block.type === 'heading' && block.level === 2) {
      // H2 = Section header
      createSectionSlide(pres, block, options, themeColors);
      i++;
    } else if (block.type === 'heading' && block.level === 3) {
      // H3 = Content slide title
      const slideContent = collectSlideContent(content, i + 1);
      createContentSlide(pres, block, slideContent, options, themeColors);
      i += 1 + slideContent.length;
    } else {
      i++;
    }
  }
}

/**
 * Create a title slide
 */
function createTitleSlide(
  pres: PptxPresentation,
  titleBlock: ContentBlock,
  subtitle: string,
  options: PptxConversionOptions,
  themeColors: ThemeColors
): void {
  const slide = pres.addSlide();
  slide.background = { color: themeColors.background };

  const title = typeof titleBlock.content === 'string' ? titleBlock.content : '';

  // Add title
  slide.addText(title, {
    x: 0.5,
    y: 1.5,
    w: 9,
    h: 1.5,
    fontSize: 44,
    bold: true,
    color: themeColors.text,
    align: 'center',
    fontFace: options.fontFamily || 'Arial',
  });

  // Add subtitle if present
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5,
      y: 3.2,
      w: 9,
      h: 1,
      fontSize: 24,
      color: themeColors.text,
      align: 'center',
      fontFace: options.fontFamily || 'Arial',
    });
  }
}

/**
 * Create a section header slide
 */
function createSectionSlide(
  pres: PptxPresentation,
  headingBlock: ContentBlock,
  options: PptxConversionOptions,
  themeColors: ThemeColors
): void {
  const slide = pres.addSlide();
  slide.background = { color: themeColors.accent };

  const heading = typeof headingBlock.content === 'string' ? headingBlock.content : '';

  slide.addText(heading, {
    x: 0.5,
    y: 2.5,
    w: 9,
    h: 1.5,
    fontSize: 36,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
    fontFace: options.fontFamily || 'Arial',
  });
}

/**
 * Create a content slide
 */
function createContentSlide(
  pres: PptxPresentation,
  titleBlock: ContentBlock,
  content: ContentBlock[],
  options: PptxConversionOptions,
  themeColors: ThemeColors
): void {
  const slide = pres.addSlide();
  slide.background = { color: themeColors.background };

  const title = typeof titleBlock.content === 'string' ? titleBlock.content : '';

  // Add title
  slide.addText(title, {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.8,
    fontSize: 32,
    bold: true,
    color: themeColors.text,
    fontFace: options.fontFamily || 'Arial',
  });

  // Add content
  let yPosition = 1.5;

  for (const block of content) {
    if (yPosition > 6.5) break; // Stop if we run out of space

    switch (block.type) {
      case 'paragraph': {
        const text = typeof block.content === 'string' ? block.content : '';
        const fontFamily = options.fontFamily || 'Arial';
        const textSegments = parseTextForPptx(text, themeColors, fontFamily);

        slide.addText(textSegments, {
          x: 0.5,
          y: yPosition,
          w: 9,
          h: 0.6,
          fontSize: options.fontSize || 18,
          color: themeColors.text,
          fontFace: fontFamily,
        });
        yPosition += 0.8;
        break;
      }

      case 'list': {
        const items = Array.isArray(block.content) ? block.content : [];
        const fontFamily = options.fontFamily || 'Arial';
        // For lists, we need to add each item separately to preserve bullets with formatting
        // pptxgenjs expects array of {text} for bullets, but we need per-segment formatting
        // Use a simplified approach: each list item becomes one text segment array
        const bulletPoints = items.map((item) => {
          const segments = parseInlineTokens(item);
          if (segments.length === 0) {
            return { text: item };
          }
          // For single segment or simple text, use simple format
          if (segments.length === 1 && !segments[0].bold && !segments[0].italic && !segments[0].code) {
            return { text: item };
          }
          // For formatted text, include formatting in options
          // Note: pptxgenjs bullet items support {text, options} format
          const firstSeg = segments[0];
          return {
            text: item,
            options: {
              bold: firstSeg.bold || undefined,
              italic: firstSeg.italic || undefined,
            },
          };
        });

        slide.addText(bulletPoints, {
          x: 0.8,
          y: yPosition,
          w: 8.5,
          h: Math.min(items.length * 0.5, 4),
          fontSize: options.fontSize || 18,
          bullet: block.ordered ? { type: 'number' } : true,
          color: themeColors.text,
          fontFace: fontFamily,
        });
        yPosition += Math.min(items.length * 0.5 + 0.3, 4.5);
        break;
      }

      case 'table': {
        if (typeof block.content === 'object' && 'headers' in block.content) {
          addTableToSlide(slide, block.content as TableData, yPosition, options, themeColors);
          yPosition += 3; // Tables take up more space
        }
        break;
      }

      case 'code': {
        const code = typeof block.content === 'string' ? block.content : '';
        slide.addText(code, {
          x: 0.5,
          y: yPosition,
          w: 9,
          h: Math.min(2, 6.5 - yPosition),
          fontSize: 14,
          fontFace: 'Courier New',
          color: themeColors.text,
          fill: { color: 'F5F5F5' },
        });
        yPosition += 2.2;
        break;
      }
    }
  }
}

/**
 * Convert InlineSegments to PPTX text segments with formatting
 */
function segmentsToPptxText(
  segments: InlineSegment[],
  themeColors: ThemeColors,
  fontFamily: string
): PptxTextSegment[] {
  return segments.map((segment) => {
    const textSegment: PptxTextSegment = {
      text: segment.text,
    };

    // Build options based on formatting
    if (segment.code) {
      textSegment.options = {
        fontFace: 'Courier New',
        color: themeColors.text,
      };
    } else if (segment.bold || segment.italic) {
      textSegment.options = {
        bold: segment.bold,
        italic: segment.italic,
        fontFace: fontFamily,
        color: themeColors.text,
      };
    } else {
      textSegment.options = {
        fontFace: fontFamily,
        color: themeColors.text,
      };
    }

    return textSegment;
  });
}

/**
 * Parse inline formatting and return PPTX text segments
 */
function parseTextForPptx(
  text: string,
  themeColors: ThemeColors,
  fontFamily: string
): PptxTextSegment[] {
  const segments = parseInlineTokens(text);
  if (segments.length === 0) {
    return [{ text, options: { fontFace: fontFamily, color: themeColors.text } }];
  }
  return segmentsToPptxText(segments, themeColors, fontFamily);
}

/**
 * Collect content for a single slide
 */
function collectSlideContent(content: ContentBlock[], startIndex: number): ContentBlock[] {
  const slideContent: ContentBlock[] = [];

  for (let i = startIndex; i < content.length; i++) {
    const block = content[i];

    // Stop at next heading or HR
    if (block.type === 'heading' || block.type === 'hr') {
      break;
    }

    slideContent.push(block);
  }

  return slideContent;
}

/**
 * Add a table to a slide
 */
function addTableToSlide(
  slide: PptxSlide,
  tableData: TableData,
  yPosition: number,
  options: PptxConversionOptions,
  themeColors: ThemeColors
): void {
  const rows: PptxTableCell[][] = [];

  // Add header row
  if (tableData.headers.length > 0) {
    rows.push(
      tableData.headers.map((header) => ({
        text: header,
        options: {
          bold: true,
          fontSize: options.fontSize || 14,
          color: 'FFFFFF',
          fill: { color: themeColors.accent },
        },
      }))
    );
  }

  // Add data rows
  for (const row of tableData.rows) {
    rows.push(
      row.map((cell) => ({
        text: cell,
        options: {
          fontSize: options.fontSize || 12,
          color: themeColors.text,
        },
      }))
    );
  }

  slide.addTable(rows, {
    x: 0.5,
    y: yPosition,
    w: 9,
    border: { type: 'solid', pt: 1, color: '999999' },
  });
}

/**
 * Convert markdown string directly to PPTX
 */
export async function convertMarkdownToPptx(
  markdown: string,
  outputPath: string,
  options: PptxConversionOptions = {}
): Promise<PptxConversionResult> {
  const parsed = parseMarkdown(markdown);
  const warnings: string[] = [];

  const pres = new PptxGenJS() as PptxPresentation;
  pres.author = 'MD Converter';

  const themeColors = getThemeColors(options.theme || 'light');
  createSlidesFromContent(pres, parsed.content, options, themeColors, warnings);

  await pres.writeFile({ fileName: outputPath });

  return {
    success: true,
    outputPath,
    slideCount: pres.slides.length,
    warnings,
  };
}
