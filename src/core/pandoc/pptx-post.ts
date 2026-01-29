/**
 * PPTX Post-Processor
 * Handles classification footers and document properties patching
 */

import JSZip from 'jszip';
import { readFile, writeFile } from 'fs/promises';
import type { PostProcessorResult } from './types.js';
import type { DocumentMetadata } from '../parsers/frontmatter-parser.js';

export interface PptxPostOptions {
  outputPath: string;
  metadata: DocumentMetadata | null;
}

/**
 * Post-process PPTX file: add classification footers, patch properties
 */
export async function processPptx(options: PptxPostOptions): Promise<PostProcessorResult> {
  const { outputPath, metadata } = options;
  const modifications: string[] = [];
  const warnings: string[] = [];

  // Read the PPTX file (which is a ZIP archive)
  const content = await readFile(outputPath);
  const zip = await JSZip.loadAsync(content);

  // Add classification to slide footers if specified
  if (metadata?.classification) {
    const footerResult = await addClassificationFooters(zip, metadata.classification);
    modifications.push(...footerResult.modifications);
    warnings.push(...footerResult.warnings);
  }

  // Patch document properties
  if (metadata) {
    const propsResult = await patchDocumentProperties(zip, metadata);
    modifications.push(...propsResult.modifications);
    warnings.push(...propsResult.warnings);
  }

  // Save the modified PPTX
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
 * Add classification text to slide footers
 */
async function addClassificationFooters(
  zip: JSZip,
  classification: string
): Promise<{ modifications: string[]; warnings: string[] }> {
  const modifications: string[] = [];
  const warnings: string[] = [];

  // Find all slide files
  const slideFiles = Object.keys(zip.files).filter(
    (name) => name.match(/^ppt\/slides\/slide\d+\.xml$/)
  );

  if (slideFiles.length === 0) {
    warnings.push('No slides found in presentation');
    return { modifications, warnings };
  }

  let slidesModified = 0;

  for (const slidePath of slideFiles) {
    const slideFile = zip.file(slidePath);
    if (!slideFile) continue;

    let slideXml = await slideFile.async('string');

    // Check if footer placeholder exists
    if (slideXml.includes('type="ftr"') || slideXml.includes('<p:ftr')) {
      // Update existing footer
      const footerResult = updateExistingFooter(slideXml, classification);
      if (footerResult.modified) {
        zip.file(slidePath, footerResult.xml);
        slidesModified++;
      }
    } else {
      // Try to add footer to slide
      const addResult = addFooterToSlide(slideXml, classification);
      if (addResult.modified) {
        zip.file(slidePath, addResult.xml);
        slidesModified++;
      }
    }
  }

  if (slidesModified > 0) {
    modifications.push(`Added classification to ${slidesModified} slide footer(s)`);
  } else {
    warnings.push('Could not add classification to slide footers');
  }

  return { modifications, warnings };
}

/**
 * Update an existing footer placeholder with classification
 */
function updateExistingFooter(
  slideXml: string,
  classification: string
): { xml: string; modified: boolean } {
  // Look for footer text frame and update its content
  // Footer elements typically have type="ftr" in their placeholder
  const footerRegex = /<p:sp[^>]*>[\s\S]*?<p:ph[^>]*type="ftr"[\s\S]*?<\/p:sp>/g;
  const match = slideXml.match(footerRegex);

  if (match) {
    // Find the text content within the footer shape
    const footerShape = match[0];

    // Replace text content with classification
    const updatedShape = replaceShapeText(footerShape, classification);

    if (updatedShape !== footerShape) {
      return {
        xml: slideXml.replace(footerShape, updatedShape),
        modified: true,
      };
    }
  }

  return { xml: slideXml, modified: false };
}

/**
 * Replace text content in a shape
 */
function replaceShapeText(shapeXml: string, newText: string): string {
  // Find <a:t> elements and replace their content
  const textRegex = /<a:t>([^<]*)<\/a:t>/g;

  if (textRegex.test(shapeXml)) {
    // Replace first text element with classification
    let replaced = false;
    return shapeXml.replace(textRegex, (match) => {
      if (!replaced) {
        replaced = true;
        return `<a:t>${escapeXml(newText)}</a:t>`;
      }
      return match;
    });
  }

  return shapeXml;
}

/**
 * Add a footer shape to a slide
 */
function addFooterToSlide(
  slideXml: string,
  classification: string
): { xml: string; modified: boolean } {
  // Find the shape tree (p:spTree) and add a footer shape
  const spTreeEnd = '</p:spTree>';

  if (slideXml.includes(spTreeEnd)) {
    const footerShape = createFooterShape(classification);
    const newXml = slideXml.replace(spTreeEnd, footerShape + spTreeEnd);
    return { xml: newXml, modified: true };
  }

  return { xml: slideXml, modified: false };
}

/**
 * Create a footer shape in PPTX XML format
 */
function createFooterShape(text: string): string {
  // Create a simple text box at the bottom of the slide
  // Positions are in EMUs (914400 EMUs = 1 inch)
  // Standard slide is 9144000 x 6858000 EMUs (10" x 7.5")
  return `
    <p:sp>
      <p:nvSpPr>
        <p:cNvPr id="9999" name="Footer Placeholder"/>
        <p:cNvSpPr>
          <a:spLocks noGrp="1"/>
        </p:cNvSpPr>
        <p:nvPr>
          <p:ph type="ftr" sz="quarter" idx="11"/>
        </p:nvPr>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm>
          <a:off x="3124200" y="6356350"/>
          <a:ext cx="2895600" cy="365125"/>
        </a:xfrm>
      </p:spPr>
      <p:txBody>
        <a:bodyPr/>
        <a:lstStyle/>
        <a:p>
          <a:pPr algn="ctr"/>
          <a:r>
            <a:rPr lang="en-US" sz="1200" b="1"/>
            <a:t>${escapeXml(text)}</a:t>
          </a:r>
        </a:p>
      </p:txBody>
    </p:sp>`;
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

/**
 * Update or insert an XML element value
 */
function updateXmlElement(xml: string, tagName: string, value: string): string {
  const escapedValue = escapeXml(value);
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'g');

  if (regex.test(xml)) {
    return xml.replace(regex, `<${tagName}>${escapedValue}</${tagName}>`);
  }

  // Try to insert before closing tag
  const closingTag = '</cp:coreProperties>';
  if (xml.includes(closingTag)) {
    const newElement = `  <${tagName}>${escapedValue}</${tagName}>\n`;
    return xml.replace(closingTag, newElement + closingTag);
  }

  return xml;
}

/**
 * Escape special XML characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
