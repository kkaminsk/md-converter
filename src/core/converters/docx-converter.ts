/**
 * DOCX Converter
 * Convert Markdown to Word document with formatting
 */

import { createRequire } from 'module';

// The docx library has type definition issues with NodeNext module resolution.
// Using createRequire for ESM compatibility with explicit typing.
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const docxLib: any = require('docx');

const Document = docxLib.Document as new (options: DocumentOptions) => unknown;
const Packer = docxLib.Packer as { toBuffer: (doc: unknown) => Promise<Buffer> };
const Paragraph = docxLib.Paragraph as new (options: ParagraphOptions) => ParagraphInstance;
const TextRun = docxLib.TextRun as new (options: TextRunOptions) => TextRunInstance;
const Table = docxLib.Table as new (options: TableOptions) => TableInstance;
const TableRow = docxLib.TableRow as new (options: TableRowOptions) => TableRowInstance;
const TableCell = docxLib.TableCell as new (options: TableCellOptions) => TableCellInstance;
const HeadingLevel = docxLib.HeadingLevel as HeadingLevelType;
const AlignmentType = docxLib.AlignmentType as { START: string };
const LevelFormat = docxLib.LevelFormat as { DECIMAL: string };
const WidthType = docxLib.WidthType as { PERCENTAGE: string };
const BorderStyle = docxLib.BorderStyle as { SINGLE: string };

// Type definitions for docx library constructs
interface DocumentOptions {
  creator?: string;
  title?: string;
  description?: string;
  subject?: string;
  keywords?: string;
  sections?: ISectionOptions[];
  numbering?: {
    config: Array<{
      reference: string;
      levels: Array<{
        level: number;
        format: string;
        text: string;
        alignment: string;
        style: {
          paragraph: {
            indent: { left: number; hanging: number };
          };
        };
      }>;
    }>;
  };
}

interface ISectionOptions {
  properties?: {
    page?: {
      margin?: {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
      };
    };
  };
  children?: Array<ParagraphInstance | TableInstance>;
}

interface ParagraphOptions {
  text?: string;
  children?: TextRunInstance[];
  heading?: string;
  style?: string;
  spacing?: { before?: number; after?: number };
  bullet?: { level: number };
  numbering?: { reference: string; level: number };
  border?: {
    bottom?: {
      color: string;
      space: number;
      style: string;
      size: number;
    };
  };
  shading?: { fill: string };
}

interface TextRunOptions {
  text: string;
  bold?: boolean;
  italics?: boolean;
  font?: string;
  style?: string;
}

interface TableOptions {
  rows: TableRowInstance[];
  width?: { size: number; type: string };
  borders?: {
    top?: { style: string; size: number };
    bottom?: { style: string; size: number };
    left?: { style: string; size: number };
    right?: { style: string; size: number };
    insideHorizontal?: { style: string; size: number };
    insideVertical?: { style: string; size: number };
  };
}

interface TableRowOptions {
  children: TableCellInstance[];
}

interface TableCellOptions {
  children: ParagraphInstance[];
  shading?: { fill: string };
}

interface HeadingLevelType {
  HEADING_1: string;
  HEADING_2: string;
  HEADING_3: string;
  HEADING_4: string;
  HEADING_5: string;
  HEADING_6: string;
}

// Instance types (opaque - we just pass them around)
type ParagraphInstance = { readonly __brand: 'Paragraph' };
type TextRunInstance = { readonly __brand: 'TextRun' };
type TableInstance = { readonly __brand: 'Table' };
type TableRowInstance = { readonly __brand: 'TableRow' };
type TableCellInstance = { readonly __brand: 'TableCell' };
import * as fs from 'fs/promises';
import * as path from 'path';
import { parseMarkdown, type ContentBlock, type TableData } from '../parsers/markdown.js';
import { parseFrontMatter, type DocumentMetadata } from '../parsers/frontmatter-parser.js';
import { shouldCreateSectionBreak } from './section-rules.js';
import { parseInlineTokens, type InlineSegment } from '../parsers/inline-parser.js';
import { ConversionError } from '../errors.js';

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

const HEADING_LEVELS: Record<number, string> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
};

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
    const rawMarkdown = await fs.readFile(inputPath, 'utf-8');

    // Parse front matter
    const { metadata, content: markdownContent, warnings } = parseFrontMatter(rawMarkdown);

    // Parse markdown content
    const parsed = parseMarkdown(markdownContent);

    // Determine output path
    const output = outputPath || inputPath.replace(/\.md$/, '.docx');

    // Split content into sections at horizontal rules (using metadata rules)
    const sections = splitIntoSections(parsed.content, options, metadata);

    // Create document with proper metadata for Word compatibility
    const doc = new Document({
      creator: metadata?.author || 'MD Converter',
      title: metadata?.title || path.basename(inputPath, '.md'),
      description: metadata?.description,
      subject: metadata?.subject,
      keywords: metadata?.keywords?.join(', '),
      // Custom properties for classification, version, status, date
      ...(metadata &&
      (metadata.classification || metadata.version || metadata.status || metadata.date)
        ? {
            sections: sections.map((section) => ({
              ...section,
              properties: {
                ...section.properties,
                // Add custom document properties via headers/footers if needed
              },
            })),
          }
        : { sections }),
      numbering: {
        config: [
          {
            reference: 'default-numbering',
            levels: [
              {
                level: 0,
                format: LevelFormat.DECIMAL,
                text: '%1.',
                alignment: AlignmentType.START,
                style: {
                  paragraph: {
                    indent: { left: 720, hanging: 260 },
                  },
                },
              },
            ],
          },
        ],
      },
    });

    // Ensure output directory exists
    await fs.mkdir(path.dirname(output), { recursive: true });

    // Write the document using Packer.toBuffer for proper binary format
    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(output, buffer, 'binary');

    return {
      success: true,
      outputPath: output,
      warnings: warnings,
    };
  } catch (error) {
    if (error instanceof ConversionError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new ConversionError(message, 'docx', inputPath);
  }
}

/**
 * Split content into sections at horizontal rules (---)
 * Intelligently creates section breaks based on metadata rules
 */
function splitIntoSections(
  content: ContentBlock[],
  options: DocxConversionOptions,
  metadata: DocumentMetadata | null
): ISectionOptions[] {
  const sections: ISectionOptions[] = [];
  let currentSection: ContentBlock[] = [];

  for (let i = 0; i < content.length; i++) {
    const block = content[i];

    if (block.type === 'hr') {
      // Check if this HR should create a section break
      if (shouldCreateSectionBreak(i, content, metadata)) {
        // Create section from accumulated content
        if (currentSection.length > 0) {
          sections.push({
            properties: {
              page: {
                margin: {
                  top: 1440, // 1 inch in twips
                  right: 1440,
                  bottom: 1440,
                  left: 1440,
                },
              },
            },
            children: convertContentToDocx(currentSection, options, metadata),
          });
          currentSection = [];
        }
      } else {
        // Not a section break, add as visual divider
        currentSection.push(block);
      }
    } else {
      currentSection.push(block);
    }
  }

  // Add final section
  if (currentSection.length > 0 || sections.length === 0) {
    sections.push({
      properties: {
        page: {
          margin: {
            top: 1440,
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
      },
      children:
        currentSection.length > 0
          ? convertContentToDocx(currentSection, options, metadata)
          : [new Paragraph({ text: '' })],
    });
  }

  return sections;
}

/**
 * Convert content blocks to DOCX paragraphs and tables
 */
function convertContentToDocx(
  content: ContentBlock[],
  options: DocxConversionOptions,
  _metadata?: DocumentMetadata | null
): Array<ParagraphInstance | TableInstance> {
  const elements: Array<ParagraphInstance | TableInstance> = [];

  for (const block of content) {
    switch (block.type) {
      case 'heading':
        elements.push(createHeading(block, options));
        break;

      case 'paragraph':
        elements.push(createParagraph(block, options));
        break;

      case 'list':
        elements.push(...createList(block, options));
        break;

      case 'table':
        if (typeof block.content === 'object' && 'headers' in block.content) {
          elements.push(createTable(block.content as TableData, options));
        }
        break;

      case 'code':
        elements.push(createCodeBlock(block, options));
        break;

      case 'hr':
        // HR not handled as section break, render as visual divider
        elements.push(createHorizontalRule());
        break;
    }
  }

  return elements;
}

/**
 * Create a heading paragraph
 */
function createHeading(block: ContentBlock, _options: DocxConversionOptions): ParagraphInstance {
  const level = block.level || 1;
  const text = typeof block.content === 'string' ? block.content : '';

  return new Paragraph({
    text,
    heading: HEADING_LEVELS[level] || HeadingLevel.HEADING_1,
    spacing: {
      before: 240,
      after: 120,
    },
  });
}

/**
 * Create a paragraph with inline formatting
 */
function createParagraph(block: ContentBlock, options: DocxConversionOptions): ParagraphInstance {
  const text = typeof block.content === 'string' ? block.content : '';
  const runs = parseInlineFormatting(text, options);

  return new Paragraph({
    children: runs,
    style: 'Normal',
    spacing: {
      after: 120,
    },
  });
}

/**
 * Parse inline formatting (bold, italic, code) using markdown-it tokens
 * Correctly handles nested formatting like **bold with *italic* inside**
 */
function parseInlineFormatting(text: string, _options: DocxConversionOptions): TextRunInstance[] {
  const segments = parseInlineTokens(text);

  if (segments.length === 0) {
    return [new TextRun({ text })];
  }

  return segments.map((segment: InlineSegment) => segmentToTextRun(segment));
}

/**
 * Convert an InlineSegment to a docx TextRun with proper formatting
 */
function segmentToTextRun(segment: InlineSegment): TextRunInstance {
  if (segment.code) {
    // Inline code - use monospace font
    return new TextRun({
      text: segment.text,
      font: 'Courier New',
    });
  }

  // Build text run options based on formatting
  const options: TextRunOptions = {
    text: segment.text,
  };

  if (segment.bold && segment.italic) {
    // Both bold and italic
    options.bold = true;
    options.italics = true;
  } else if (segment.bold) {
    // Bold only - use Strong character style
    options.bold = true;
    options.style = 'Strong';
  } else if (segment.italic) {
    // Italic only - use Emphasis character style
    options.italics = true;
    options.style = 'Emphasis';
  }

  return new TextRun(options);
}

/**
 * Create list paragraphs
 */
function createList(block: ContentBlock, options: DocxConversionOptions): ParagraphInstance[] {
  const items = Array.isArray(block.content) ? block.content : [];

  return items.map((item) => {
    const runs = parseInlineFormatting(item, options);

    return new Paragraph({
      children: runs,
      style: 'ListParagraph',
      bullet: block.ordered ? undefined : { level: 0 },
      numbering: block.ordered ? { reference: 'default-numbering', level: 0 } : undefined,
      spacing: {
        after: 60,
      },
    });
  });
}

/**
 * Create a table
 */
function createTable(tableData: TableData, options: DocxConversionOptions): TableInstance {
  const rows: TableRowInstance[] = [];

  // Create header row
  if (tableData.headers.length > 0) {
    const headerCells = tableData.headers.map(
      (header) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: header,
                  bold: true,
                  style: 'Strong',
                }),
              ],
              style: 'Normal',
            }),
          ],
          shading: {
            fill: 'D3D3D3', // Light grey background
          },
        })
    );

    rows.push(new TableRow({ children: headerCells }));
  }

  // Create data rows
  for (const row of tableData.rows) {
    const cells = row.map((cellValue) => {
      const runs = parseInlineFormatting(cellValue, options);

      return new TableCell({
        children: [
          new Paragraph({
            children: runs,
            style: 'Normal',
          }),
        ],
      });
    });

    rows.push(new TableRow({ children: cells }));
  }

  return new Table({
    rows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 },
    },
  });
}

/**
 * Create a code block
 */
function createCodeBlock(block: ContentBlock, _options: DocxConversionOptions): ParagraphInstance {
  const code = typeof block.content === 'string' ? block.content : '';

  return new Paragraph({
    children: [
      new TextRun({
        text: code,
        font: 'Courier New',
      }),
    ],
    style: 'Normal',
    shading: {
      fill: 'F5F5F5', // Light grey background
    },
    spacing: {
      before: 120,
      after: 120,
    },
  });
}

/**
 * Create a horizontal rule
 * Note: HRs are now handled as section breaks, but keeping this for backwards compatibility
 */
function createHorizontalRule(): ParagraphInstance {
  return new Paragraph({
    border: {
      bottom: {
        color: '000000',
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    spacing: {
      before: 120,
      after: 120,
    },
  });
}

/**
 * Convert content directly from markdown string
 */
export async function convertMarkdownToDocx(
  markdown: string,
  outputPath: string,
  options: DocxConversionOptions = {}
): Promise<DocxConversionResult> {
  // Parse front matter
  const { metadata, content: markdownContent, warnings } = parseFrontMatter(markdown);

  // Parse markdown content
  const parsed = parseMarkdown(markdownContent);

  // Split content into sections at horizontal rules (using metadata rules)
  const sections = splitIntoSections(parsed.content, options, metadata);

  const doc = new Document({
    creator: metadata?.author || 'MD Converter',
    title: metadata?.title || 'Untitled Document',
    description: metadata?.description,
    subject: metadata?.subject,
    keywords: metadata?.keywords?.join(', '),
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 260 },
                },
              },
            },
          ],
        },
      ],
    },
    sections: sections,
  });

  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(outputPath, buffer, 'binary');

  return {
    success: true,
    outputPath,
    warnings,
  };
}
