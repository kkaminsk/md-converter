/**
 * Section Rules
 * Intelligent handling of horizontal rules for section/slide breaks
 */

import type { ContentBlock } from '../parsers/markdown.js';
import type { DocumentMetadata } from '../parsers/frontmatter-parser.js';

/**
 * Determine if a horizontal rule should create a Word section break
 */
export function shouldCreateSectionBreak(
  hrIndex: number,
  content: ContentBlock[],
  metadata: DocumentMetadata | null
): boolean {
  const sectionBreakMode = metadata?.section_breaks || 'auto';

  // Override modes
  if (sectionBreakMode === 'all') {
    return true;
  }

  if (sectionBreakMode === 'none') {
    return false;
  }

  // Auto mode: Only create section break if HR is followed by ## (Heading 2)
  if (sectionBreakMode === 'auto') {
    // Look at the next block after the HR
    const nextBlock = content[hrIndex + 1];

    if (!nextBlock) {
      return false; // HR at end of document
    }

    // Section break only if followed by H2 (major section boundary)
    if (nextBlock.type === 'heading' && nextBlock.level === 2) {
      return true;
    }

    return false;
  }

  return false;
}

/**
 * Determine if a block should trigger a new slide in PPTX
 */
export function shouldCreateSlideBreak(
  block: ContentBlock,
  metadata: DocumentMetadata | null
): boolean {
  const slideBreakMode = metadata?.slide_breaks || 'h2';

  switch (slideBreakMode) {
    case 'h1':
      // New slide at every H1
      return block.type === 'heading' && block.level === 1;

    case 'h2':
      // New slide at every H2 (and H1)
      return block.type === 'heading' && (block.level === 1 || block.level === 2);

    case 'hr':
      // New slide at every horizontal rule
      return block.type === 'hr';

    default:
      return false;
  }
}

/**
 * Get section break type for display
 */
export function getSectionBreakType(metadata: DocumentMetadata | null): string {
  const mode = metadata?.section_breaks || 'auto';

  switch (mode) {
    case 'all':
      return 'All HRs create sections';
    case 'none':
      return 'HRs are visual dividers only';
    case 'auto':
      return 'HRs before H2 create sections';
    default:
      return 'Unknown';
  }
}

/**
 * Get slide break type for display
 */
export function getSlideBreakType(metadata: DocumentMetadata | null): string {
  const mode = metadata?.slide_breaks || 'h2';

  switch (mode) {
    case 'h1':
      return 'New slide at each H1';
    case 'h2':
      return 'New slide at each H1 and H2';
    case 'hr':
      return 'New slide at each ---';
    default:
      return 'Unknown';
  }
}

/**
 * Count expected sections in document
 */
export function countExpectedSections(
  content: ContentBlock[],
  metadata: DocumentMetadata | null
): number {
  let sectionCount = 1; // Always at least one section

  for (let i = 0; i < content.length; i++) {
    const block = content[i];

    if (block.type === 'hr') {
      if (shouldCreateSectionBreak(i, content, metadata)) {
        sectionCount++;
      }
    }
  }

  return sectionCount;
}

/**
 * Count expected slides in presentation
 */
export function countExpectedSlides(
  content: ContentBlock[],
  metadata: DocumentMetadata | null
): number {
  let slideCount = 1; // Always at least one slide

  for (const block of content) {
    if (shouldCreateSlideBreak(block, metadata)) {
      slideCount++;
    }
  }

  return slideCount;
}
