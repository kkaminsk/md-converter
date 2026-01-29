/**
 * Inline Markdown Parser
 * Parse inline markdown formatting using markdown-it tokens
 * Handles nested formatting like **bold with *italic* inside**
 */

import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.js';

/**
 * Represents a segment of text with its formatting properties
 */
export interface InlineSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  code: boolean;
  link?: {
    href: string;
    title?: string;
  };
}

// Shared markdown-it instance for inline parsing
const md = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false,
});

/**
 * Parse inline markdown text into segments with formatting information
 *
 * @param text - Markdown text with inline formatting
 * @returns Array of InlineSegment with text and formatting properties
 */
export function parseInlineTokens(text: string): InlineSegment[] {
  if (!text) {
    return [];
  }

  const tokens = md.parseInline(text, {});
  if (!tokens.length || !tokens[0].children) {
    return [{ text, bold: false, italic: false, code: false }];
  }

  const children = tokens[0].children;
  return processInlineTokens(children);
}

/**
 * Process inline tokens into segments, tracking formatting state
 */
function processInlineTokens(tokens: Token[]): InlineSegment[] {
  const segments: InlineSegment[] = [];

  // Track current formatting state
  let bold = false;
  let italic = false;
  let currentLink: { href: string; title?: string } | undefined;

  for (const token of tokens) {
    switch (token.type) {
      case 'text':
        // Only add non-empty text segments
        if (token.content) {
          segments.push({
            text: token.content,
            bold,
            italic,
            code: false,
            link: currentLink,
          });
        }
        break;

      case 'strong_open':
        bold = true;
        break;

      case 'strong_close':
        bold = false;
        break;

      case 'em_open':
        italic = true;
        break;

      case 'em_close':
        italic = false;
        break;

      case 'code_inline':
        segments.push({
          text: token.content,
          bold: false,
          italic: false,
          code: true,
        });
        break;

      case 'link_open':
        // Extract href and title from attrs
        if (token.attrs) {
          const hrefAttr = token.attrs.find((attr) => attr[0] === 'href');
          const titleAttr = token.attrs.find((attr) => attr[0] === 'title');
          currentLink = {
            href: hrefAttr ? hrefAttr[1] : '',
            title: titleAttr ? titleAttr[1] : undefined,
          };
        }
        break;

      case 'link_close':
        currentLink = undefined;
        break;

      case 'softbreak':
        // Treat soft break as space
        segments.push({
          text: ' ',
          bold,
          italic,
          code: false,
          link: currentLink,
        });
        break;

      case 'hardbreak':
        // Treat hard break as newline
        segments.push({
          text: '\n',
          bold,
          italic,
          code: false,
          link: currentLink,
        });
        break;

      // Ignore other token types (e.g., image, html_inline)
    }
  }

  return segments;
}

/**
 * Check if two segments can be merged (same formatting)
 */
function canMergeSegments(a: InlineSegment, b: InlineSegment): boolean {
  return (
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.code === b.code &&
    a.link?.href === b.link?.href
  );
}

/**
 * Merge adjacent segments with identical formatting
 * This reduces the number of TextRuns needed in the output
 */
export function mergeAdjacentSegments(segments: InlineSegment[]): InlineSegment[] {
  if (segments.length <= 1) {
    return segments;
  }

  const merged: InlineSegment[] = [];
  let current = { ...segments[0] };

  for (let i = 1; i < segments.length; i++) {
    const next = segments[i];

    if (canMergeSegments(current, next)) {
      // Merge text
      current.text += next.text;
    } else {
      // Push current and start new segment
      merged.push(current);
      current = { ...next };
    }
  }

  // Push final segment
  merged.push(current);

  return merged;
}
