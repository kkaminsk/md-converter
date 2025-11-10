/**
 * DOCX Converter
 * Convert Markdown to Word document with formatting
 */

// @ts-nocheck
import * as docx from 'docx';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parseMarkdown, type ContentBlock, type TableData } from '../parsers/markdown.js';
import { parseFrontMatter, type DocumentMetadata } from '../parsers/frontmatter-parser.js';
import { shouldCreateSectionBreak } from './section-rules.js';

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

const HEADING_LEVELS: Record<number, docx.HeadingLevel> = {
  1: docx.HeadingLevel.HEADING_1,
  2: docx.HeadingLevel.HEADING_2,
  3: docx.HeadingLevel.HEADING_3,
  4: docx.HeadingLevel.HEADING_4,
  5: docx.HeadingLevel.HEADING_5,
  6: docx.HeadingLevel.HEADING_6,
};

/**
 * Convert Markdown file to DOCX
 */
export async function convertToDocx(
  inputPath: string,
  outputPath?: string,
  options: DocxConversionOptions = {}
): Promise<DocxConversionResult> {
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
  const doc = new docx.Document({
    creator: metadata?.author || "MD Converter",
    title: metadata?.title || path.basename(inputPath, '.md'),
    description: metadata?.description,
    subject: metadata?.subject,
    keywords: metadata?.keywords?.join(', '),
    // Custom properties for classification, version, status, date
    ...(metadata && (metadata.classification || metadata.version || metadata.status || metadata.date) ? {
      sections: sections.map((section, index) => ({
        ...section,
        properties: {
          ...section.properties,
          // Add custom document properties via headers/footers if needed
        },
      })),
    } : { sections }),
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: docx.LevelFormat.DECIMAL,
              text: '%1.',
              alignment: docx.AlignmentType.START,
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
  const buffer = await docx.Packer.toBuffer(doc);
  await fs.writeFile(output, buffer, 'binary');

  return {
    success: true,
    outputPath: output,
    warnings: warnings,
  };
}

/**
 * Split content into sections at horizontal rules (---)
 * Intelligently creates section breaks based on metadata rules
 */
function splitIntoSections(
  content: ContentBlock[],
  options: DocxConversionOptions,
  metadata: DocumentMetadata | null
): docx.ISectionOptions[] {
  const sections: docx.ISectionOptions[] = [];
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
      children: currentSection.length > 0 ? convertContentToDocx(currentSection, options, metadata) : [new docx.Paragraph({ text: '' })],
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
  metadata?: DocumentMetadata | null
): Array<docx.Paragraph | docx.Table> {
  const elements: Array<docx.Paragraph | docx.Table> = [];

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
function createHeading(block: ContentBlock, _options: DocxConversionOptions): docx.Paragraph {
  const level = block.level || 1;
  const text = typeof block.content === 'string' ? block.content : '';
  
  return new docx.Paragraph({
    text,
    heading: HEADING_LEVELS[level] || docx.HeadingLevel.HEADING_1,
    spacing: {
      before: 240,
      after: 120,
    },
  });
}

/**
 * Create a paragraph with inline formatting
 */
function createParagraph(block: ContentBlock, options: DocxConversionOptions): docx.Paragraph {
  const text = typeof block.content === 'string' ? block.content : '';
  const runs = parseInlineFormatting(text, options);
  
  return new docx.Paragraph({
    children: runs,
    style: 'Normal',
    spacing: {
      after: 120,
    },
  });
}

/**
 * Parse inline formatting (bold, italic, code)
 */
function parseInlineFormatting(text: string, options: DocxConversionOptions): docx.TextRun[] {
  const runs: docx.TextRun[] = [];
  
  // Simple parsing for bold (**text**), italic (*text*), and inline code (`text`)
  // This is a simplified version - a full implementation would use a proper parser
  
  const segments = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[([^\]]+)\]\(([^)]+)\))/);
  
  for (const segment of segments) {
    if (!segment) continue;
    
    if (segment.startsWith('**') && segment.endsWith('**')) {
      // Bold - use Strong character style
      runs.push(new docx.TextRun({
        text: segment.slice(2, -2),
        bold: true,
        style: 'Strong',
      }));
    } else if (segment.startsWith('*') && segment.endsWith('*')) {
      // Italic - use Emphasis character style
      runs.push(new docx.TextRun({
        text: segment.slice(1, -1),
        italics: true,
        style: 'Emphasis',
      }));
    } else if (segment.startsWith('`') && segment.endsWith('`')) {
      // Inline code - use monospace font
      runs.push(new docx.TextRun({
        text: segment.slice(1, -1),
        font: 'Courier New',
      }));
    } else {
      // Regular text - no explicit style, inherits from paragraph
      runs.push(new docx.TextRun({
        text: segment,
      }));
    }
  }
  
  return runs.length > 0 ? runs : [new docx.TextRun({ 
    text,
  })];
}

/**
 * Create list paragraphs
 */
function createList(block: ContentBlock, options: DocxConversionOptions): docx.Paragraph[] {
  const items = Array.isArray(block.content) ? block.content : [];
  
  return items.map((item) => {
    const runs = parseInlineFormatting(item, options);
    
    return new docx.Paragraph({
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
function createTable(tableData: TableData, options: DocxConversionOptions): docx.Table {
  const rows: docx.TableRow[] = [];

  // Create header row
  if (tableData.headers.length > 0) {
    const headerCells = tableData.headers.map((header) =>
      new docx.TableCell({
        children: [
          new docx.Paragraph({
            children: [
              new docx.TextRun({
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
    
    rows.push(new docx.TableRow({ children: headerCells }));
  }

  // Create data rows
  for (const row of tableData.rows) {
    const cells = row.map((cellValue) => {
      const runs = parseInlineFormatting(cellValue, options);
      
      return new docx.TableCell({
        children: [
          new docx.Paragraph({
            children: runs,
            style: 'Normal',
          }),
        ],
      });
    });
    
    rows.push(new docx.TableRow({ children: cells }));
  }

  return new docx.Table({
    rows,
    width: {
      size: 100,
      type: docx.WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: docx.BorderStyle.SINGLE, size: 1 },
      bottom: { style: docx.BorderStyle.SINGLE, size: 1 },
      left: { style: docx.BorderStyle.SINGLE, size: 1 },
      right: { style: docx.BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: docx.BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: docx.BorderStyle.SINGLE, size: 1 },
    },
  });
}

/**
 * Create a code block
 */
function createCodeBlock(block: ContentBlock, options: DocxConversionOptions): docx.Paragraph {
  const code = typeof block.content === 'string' ? block.content : '';
  
  return new docx.Paragraph({
    children: [
      new docx.TextRun({
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
function createHorizontalRule(): docx.Paragraph {
  return new docx.Paragraph({
    border: {
      bottom: {
        color: '000000',
        space: 1,
        style: docx.BorderStyle.SINGLE,
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

  const doc = new docx.Document({
    creator: metadata?.author || "MD Converter",
    title: metadata?.title || "Untitled Document",
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
              format: docx.LevelFormat.DECIMAL,
              text: '%1.',
              alignment: docx.AlignmentType.START,
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

  const buffer = await docx.Packer.toBuffer(doc);
  await fs.writeFile(outputPath, buffer, 'binary');

  return {
    success: true,
    outputPath,
    warnings,
  };
}

