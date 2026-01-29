import {
  parseInlineTokens,
  mergeAdjacentSegments,
  type InlineSegment,
} from '../../../src/core/parsers/inline-parser.js';

describe('inline parser', () => {
  describe('parseInlineTokens', () => {
    describe('basic formatting', () => {
      it('should return empty array for empty input', () => {
        expect(parseInlineTokens('')).toEqual([]);
      });

      it('should parse plain text', () => {
        const result = parseInlineTokens('Hello world');
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          text: 'Hello world',
          bold: false,
          italic: false,
          code: false,
        });
      });

      it('should parse bold text', () => {
        const result = parseInlineTokens('**bold text**');
        const boldSegments = result.filter(s => s.text && s.bold);
        expect(boldSegments).toHaveLength(1);
        expect(boldSegments[0].text).toBe('bold text');
        expect(boldSegments[0].italic).toBe(false);
      });

      it('should parse italic text', () => {
        const result = parseInlineTokens('*italic text*');
        const italicSegments = result.filter(s => s.text && s.italic);
        expect(italicSegments).toHaveLength(1);
        expect(italicSegments[0].text).toBe('italic text');
        expect(italicSegments[0].bold).toBe(false);
      });

      it('should parse inline code', () => {
        const result = parseInlineTokens('`code text`');
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          text: 'code text',
          bold: false,
          italic: false,
          code: true,
        });
      });
    });

    describe('nested formatting', () => {
      it('should parse bold with italic inside', () => {
        const result = parseInlineTokens('**bold with *italic* inside**');

        // Filter out empty segments
        const nonEmpty = result.filter(s => s.text);

        // Should have: "bold with " (bold), "italic" (bold+italic), " inside" (bold)
        expect(nonEmpty.length).toBeGreaterThanOrEqual(3);

        const boldWithText = nonEmpty.find(s => s.text === 'bold with ');
        expect(boldWithText?.bold).toBe(true);
        expect(boldWithText?.italic).toBe(false);

        const italicText = nonEmpty.find(s => s.text === 'italic');
        expect(italicText?.bold).toBe(true);
        expect(italicText?.italic).toBe(true);

        const insideText = nonEmpty.find(s => s.text === ' inside');
        expect(insideText?.bold).toBe(true);
        expect(insideText?.italic).toBe(false);
      });

      it('should parse italic with bold inside', () => {
        const result = parseInlineTokens('*italic with **bold** inside*');

        const nonEmpty = result.filter(s => s.text);

        const boldText = nonEmpty.find(s => s.text === 'bold');
        expect(boldText?.bold).toBe(true);
        expect(boldText?.italic).toBe(true);

        const italicOnly = nonEmpty.filter(s => s.italic && !s.bold);
        expect(italicOnly.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('mixed formatting', () => {
      it('should parse multiple formatting in paragraph', () => {
        const result = parseInlineTokens('Normal **bold** and *italic* and **more *nested* bold**');

        const nonEmpty = result.filter(s => s.text);

        // Check "Normal " is plain text
        const normalText = nonEmpty.find(s => s.text.startsWith('Normal'));
        expect(normalText?.bold).toBe(false);
        expect(normalText?.italic).toBe(false);

        // Check "bold" is bold
        const boldText = nonEmpty.find(s => s.text === 'bold');
        expect(boldText?.bold).toBe(true);
        expect(boldText?.italic).toBe(false);

        // Check "italic" is italic
        const italicText = nonEmpty.find(s => s.text === 'italic');
        expect(italicText?.bold).toBe(false);
        expect(italicText?.italic).toBe(true);

        // Check "nested" is bold+italic
        const nestedText = nonEmpty.find(s => s.text === 'nested');
        expect(nestedText?.bold).toBe(true);
        expect(nestedText?.italic).toBe(true);
      });

      it('should not let formatting bleed into adjacent text', () => {
        const result = parseInlineTokens('before **bold** after');

        const nonEmpty = result.filter(s => s.text);

        // "before " should be plain
        const before = nonEmpty.find(s => s.text.includes('before'));
        expect(before?.bold).toBe(false);

        // " after" should be plain
        const after = nonEmpty.find(s => s.text.includes('after'));
        expect(after?.bold).toBe(false);
      });
    });

    describe('links', () => {
      it('should parse link with text', () => {
        const result = parseInlineTokens('[link text](https://example.com)');

        const linkSegment = result.find(s => s.link);
        expect(linkSegment).toBeDefined();
        expect(linkSegment?.text).toBe('link text');
        expect(linkSegment?.link?.href).toBe('https://example.com');
      });

      it('should parse link with formatting', () => {
        const result = parseInlineTokens('[**bold link**](https://example.com)');

        const linkSegment = result.find(s => s.link && s.bold);
        expect(linkSegment).toBeDefined();
        expect(linkSegment?.text).toBe('bold link');
      });
    });

    describe('code preserves content', () => {
      it('should not interpret formatting inside code', () => {
        const result = parseInlineTokens('`**not bold**`');

        expect(result).toHaveLength(1);
        expect(result[0].code).toBe(true);
        expect(result[0].bold).toBe(false);
        expect(result[0].text).toBe('**not bold**');
      });
    });

    describe('edge cases', () => {
      it('should handle text with only whitespace', () => {
        const result = parseInlineTokens('   ');
        expect(result.length).toBeGreaterThanOrEqual(0);
      });

      it('should handle incomplete formatting', () => {
        // Unmatched asterisks should be treated as literal text
        const result = parseInlineTokens('hello *world');
        const nonEmpty = result.filter(s => s.text);
        expect(nonEmpty.length).toBeGreaterThanOrEqual(1);
        // The text should be preserved
        const combined = nonEmpty.map(s => s.text).join('');
        expect(combined).toContain('hello');
        expect(combined).toContain('world');
      });

      it('should handle multiple consecutive formatting', () => {
        const result = parseInlineTokens('**bold1** **bold2**');
        const boldSegments = result.filter(s => s.bold && s.text);
        expect(boldSegments).toHaveLength(2);
      });
    });
  });

  describe('mergeAdjacentSegments', () => {
    it('should return empty array for empty input', () => {
      expect(mergeAdjacentSegments([])).toEqual([]);
    });

    it('should return single segment unchanged', () => {
      const segments: InlineSegment[] = [
        { text: 'hello', bold: false, italic: false, code: false }
      ];
      expect(mergeAdjacentSegments(segments)).toEqual(segments);
    });

    it('should merge adjacent segments with same formatting', () => {
      const segments: InlineSegment[] = [
        { text: 'hello', bold: true, italic: false, code: false },
        { text: ' world', bold: true, italic: false, code: false }
      ];

      const result = mergeAdjacentSegments(segments);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('hello world');
      expect(result[0].bold).toBe(true);
    });

    it('should not merge segments with different formatting', () => {
      const segments: InlineSegment[] = [
        { text: 'hello', bold: true, italic: false, code: false },
        { text: ' world', bold: false, italic: false, code: false }
      ];

      const result = mergeAdjacentSegments(segments);
      expect(result).toHaveLength(2);
    });

    it('should merge multiple adjacent segments', () => {
      const segments: InlineSegment[] = [
        { text: 'a', bold: false, italic: false, code: false },
        { text: 'b', bold: false, italic: false, code: false },
        { text: 'c', bold: true, italic: false, code: false },
        { text: 'd', bold: true, italic: false, code: false },
        { text: 'e', bold: false, italic: false, code: false }
      ];

      const result = mergeAdjacentSegments(segments);
      expect(result).toHaveLength(3);
      expect(result[0].text).toBe('ab');
      expect(result[1].text).toBe('cd');
      expect(result[2].text).toBe('e');
    });

    it('should consider link href when merging', () => {
      const segments: InlineSegment[] = [
        { text: 'a', bold: false, italic: false, code: false, link: { href: 'http://a.com' } },
        { text: 'b', bold: false, italic: false, code: false, link: { href: 'http://a.com' } },
        { text: 'c', bold: false, italic: false, code: false, link: { href: 'http://b.com' } }
      ];

      const result = mergeAdjacentSegments(segments);
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('ab');
      expect(result[1].text).toBe('c');
    });
  });
});
