/**
 * DOCX Post-Processor
 * Handles classification headers and document properties patching
 */

import JSZip from 'jszip';
import { readFile, writeFile } from 'fs/promises';
import { escapeXml, updateXmlElement } from './xml-utils.js';
import type { PostProcessorResult } from './types.js';
import type { DocumentMetadata } from '../parsers/frontmatter-parser.js';

export interface DocxPostOptions {
  outputPath: string;
  metadata: DocumentMetadata | null;
}

/**
 * Post-process DOCX file: add classification headers, patch properties
 */
export async function processDocx(options: DocxPostOptions): Promise<PostProcessorResult> {
  const { outputPath, metadata } = options;
  const modifications: string[] = [];
  const warnings: string[] = [];

  // Read the DOCX file (which is a ZIP archive)
  const content = await readFile(outputPath);
  const zip = await JSZip.loadAsync(content);

  // Add classification header if specified
  if (metadata?.classification) {
    const headerResult = await addClassificationHeader(zip, metadata.classification);
    modifications.push(...headerResult.modifications);
    warnings.push(...headerResult.warnings);
  }

  // Patch document properties
  if (metadata) {
    const propsResult = await patchDocumentProperties(zip, metadata);
    modifications.push(...propsResult.modifications);
    warnings.push(...propsResult.warnings);
  }

  // Save the modified DOCX
  const newContent = await zip.generateAsync({ type: 'nodebuffer' });
  await writeFile(outputPath, newContent);

  return {
    success: true,
    outputPath,
    modifications,
    warnings,
  };
}

/**
 * Add classification text to document header
 */
async function addClassificationHeader(
  zip: JSZip,
  classification: string
): Promise<{ modifications: string[]; warnings: string[] }> {
  const modifications: string[] = [];
  const warnings: string[] = [];

  // Check if header1.xml exists
  const headerPath = 'word/header1.xml';
  const headerFile = zip.file(headerPath);

  if (headerFile) {
    // Modify existing header
    let headerXml = await headerFile.async('string');

    // Check if classification is already present
    if (headerXml.includes(classification)) {
      return { modifications: [], warnings: [] };
    }

    // Find the first paragraph and prepend classification
    // Look for the first <w:p> element and insert classification paragraph before content
    const classificationPara = createClassificationParagraph(classification);

    // Insert after <w:hdr ...> opening tag
    const hdrMatch = headerXml.match(/<w:hdr[^>]*>/);
    if (hdrMatch) {
      const insertPos = hdrMatch.index! + hdrMatch[0].length;
      headerXml =
        headerXml.slice(0, insertPos) + classificationPara + headerXml.slice(insertPos);

      zip.file(headerPath, headerXml);
      modifications.push(`Added classification header: ${classification}`);
    } else {
      warnings.push('Could not find header element to insert classification');
    }
  } else {
    // Create new header with classification
    const newHeader = createNewHeader(classification);
    zip.file(headerPath, newHeader);

    // Update document relationships to include the header
    const relsResult = await ensureHeaderRelationship(zip);
    if (relsResult.added) {
      modifications.push(`Created new header with classification: ${classification}`);
    }
    warnings.push(...relsResult.warnings);

    // Update document.xml to reference the header
    const docResult = await ensureHeaderReference(zip);
    warnings.push(...docResult.warnings);
  }

  return { modifications, warnings };
}

/**
 * Create a classification paragraph in OOXML format
 */
function createClassificationParagraph(classification: string): string {
  return `
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>${escapeXml(classification)}</w:t>
      </w:r>
    </w:p>`;
}

/**
 * Create a new header XML document
 */
function createNewHeader(classification: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  ${createClassificationParagraph(classification)}
</w:hdr>`;
}

/**
 * Ensure document relationships include the header
 */
async function ensureHeaderRelationship(
  zip: JSZip
): Promise<{ added: boolean; warnings: string[] }> {
  const relsPath = 'word/_rels/document.xml.rels';
  const relsFile = zip.file(relsPath);
  const warnings: string[] = [];

  if (!relsFile) {
    warnings.push('Document relationships file not found');
    return { added: false, warnings };
  }

  let relsXml = await relsFile.async('string');

  // Check if header relationship already exists
  if (relsXml.includes('header1.xml')) {
    return { added: false, warnings: [] };
  }

  // Find highest rId
  const rIdMatches = relsXml.matchAll(/rId(\d+)/g);
  let maxId = 0;
  for (const match of rIdMatches) {
    const id = parseInt(match[1], 10);
    if (id > maxId) maxId = id;
  }

  const newRId = `rId${maxId + 1}`;
  const headerRel = `<Relationship Id="${newRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>`;

  // Insert before closing </Relationships>
  relsXml = relsXml.replace('</Relationships>', `${headerRel}\n</Relationships>`);
  zip.file(relsPath, relsXml);

  return { added: true, warnings: [] };
}

/**
 * Ensure document.xml references the header in section properties
 */
async function ensureHeaderReference(
  zip: JSZip
): Promise<{ warnings: string[] }> {
  const docPath = 'word/document.xml';
  const docFile = zip.file(docPath);
  const warnings: string[] = [];

  if (!docFile) {
    warnings.push('Document.xml not found');
    return { warnings };
  }

  let docXml = await docFile.async('string');

  // Check if header reference already exists
  if (docXml.includes('w:headerReference')) {
    return { warnings: [] };
  }

  // Find the section properties (w:sectPr) and add header reference
  // This is complex - for now, just add a warning if no sectPr found
  if (!docXml.includes('w:sectPr')) {
    warnings.push('Section properties not found - header may not appear');
  }

  return { warnings };
}

/**
 * Patch document core properties with metadata
 */
async function patchDocumentProperties(
  zip: JSZip,
  metadata: DocumentMetadata
): Promise<{ modifications: string[]; warnings: string[] }> {
  const modifications: string[] = [];
  const warnings: string[] = [];

  const corePath = 'docProps/core.xml';
  const coreFile = zip.file(corePath);

  if (!coreFile) {
    warnings.push('Document properties file not found');
    return { modifications, warnings };
  }

  let coreXml = await coreFile.async('string');
  let modified = false;

  // Update title
  if (metadata.title) {
    coreXml = updateXmlElement(coreXml, 'dc:title', metadata.title);
    modified = true;
  }

  // Update author/creator
  if (metadata.author) {
    coreXml = updateXmlElement(coreXml, 'dc:creator', metadata.author);
    modified = true;
  }

  // Update subject (classification)
  if (metadata.classification || metadata.subject) {
    coreXml = updateXmlElement(coreXml, 'dc:subject', metadata.classification || metadata.subject || '');
    modified = true;
  }

  // Update keywords
  if (metadata.keywords && metadata.keywords.length > 0) {
    coreXml = updateXmlElement(coreXml, 'cp:keywords', metadata.keywords.join(', '));
    modified = true;
  }

  // Update modified date
  const now = new Date().toISOString();
  coreXml = updateXmlElement(coreXml, 'dcterms:modified', now);

  if (modified) {
    zip.file(corePath, coreXml);
    modifications.push('Updated document properties');
  }

  return { modifications, warnings };
}

// escapeXml and updateXmlElement imported from xml-utils.ts
