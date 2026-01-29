import {
  parseMarkdown,
  hasHorizontalRules,
  splitByHorizontalRules,
} from '../../../src/core/parsers/markdown.js';

describe('markdown parser', () => {
  describe('parseMarkdown', () => {
    it('should parse basic markdown', () => {
      const markdown = `# Heading 1

Some paragraph content.

## Heading 2

More content here.`;

      const result = parseMarkdown(markdown);
      expect(result.tokens).toBeDefined();
      expect(result.headings).toHaveLength(2);
      expect(result.content).toBeDefined();
    });

    it('should return empty arrays for empty markdown', () => {
      const result = parseMarkdown('');
      expect(result.tokens).toHaveLength(0);
      expect(result.tables).toHaveLength(0);
      expect(result.headings).toHaveLength(0);
      expect(result.content).toHaveLength(0);
    });
  });

  describe('extractHeadings', () => {
    it('should extract all heading levels', () => {
      const markdown = `# H1
## H2
### H3
#### H4
##### H5
###### H6`;

      const result = parseMarkdown(markdown);
      expect(result.headings).toHaveLength(6);
      expect(result.headings[0]).toEqual(expect.objectContaining({ level: 1, text: 'H1' }));
      expect(result.headings[1]).toEqual(expect.objectContaining({ level: 2, text: 'H2' }));
      expect(result.headings[2]).toEqual(expect.objectContaining({ level: 3, text: 'H3' }));
      expect(result.headings[3]).toEqual(expect.objectContaining({ level: 4, text: 'H4' }));
      expect(result.headings[4]).toEqual(expect.objectContaining({ level: 5, text: 'H5' }));
      expect(result.headings[5]).toEqual(expect.objectContaining({ level: 6, text: 'H6' }));
    });

    it('should extract heading text with inline formatting', () => {
      const markdown = `# Heading with **bold** and *italic*`;

      const result = parseMarkdown(markdown);
      expect(result.headings[0].text).toContain('**bold**');
      expect(result.headings[0].text).toContain('*italic*');
    });

    it('should include line numbers when available', () => {
      const markdown = `# First Heading

## Second Heading`;

      const result = parseMarkdown(markdown);
      // Line numbers may vary based on parser, but should be defined
      expect(result.headings[0].line).toBeDefined();
    });
  });

  describe('extractTables', () => {
    it('should extract simple table', () => {
      const markdown = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1 | Cell 2 |
| Cell 3 | Cell 4 |`;

      const result = parseMarkdown(markdown);
      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].headers).toEqual(['Header 1', 'Header 2']);
      expect(result.tables[0].rows).toHaveLength(2);
    });

    it('should extract multiple tables', () => {
      const markdown = `| A | B |
|---|---|
| 1 | 2 |

Some text between tables.

| C | D |
|---|---|
| 3 | 4 |`;

      const result = parseMarkdown(markdown);
      expect(result.tables).toHaveLength(2);
    });

    it('should preserve cell content with formulas', () => {
      const markdown = `| Value | Formula |
|-------|---------|
| 100 | {=A2*2} |`;

      const result = parseMarkdown(markdown);
      expect(result.tables[0].rows[0][1]).toBe('{=A2*2}');
    });

    it('should handle table with many columns', () => {
      const markdown = `| A | B | C | D | E | F |
|---|---|---|---|---|---|
| 1 | 2 | 3 | 4 | 5 | 6 |`;

      const result = parseMarkdown(markdown);
      expect(result.tables[0].headers).toHaveLength(6);
      expect(result.tables[0].rows[0]).toHaveLength(6);
    });
  });

  describe('extractContent', () => {
    it('should extract headings as content blocks', () => {
      const markdown = `# Heading`;

      const result = parseMarkdown(markdown);
      const headingBlock = result.content.find(b => b.type === 'heading');
      expect(headingBlock).toBeDefined();
      expect(headingBlock?.content).toBe('Heading');
      expect(headingBlock?.level).toBe(1);
    });

    it('should extract paragraphs', () => {
      const markdown = `This is a paragraph.

This is another paragraph.`;

      const result = parseMarkdown(markdown);
      const paragraphs = result.content.filter(b => b.type === 'paragraph');
      expect(paragraphs).toHaveLength(2);
    });

    it('should extract bullet lists', () => {
      const markdown = `- Item 1
- Item 2
- Item 3`;

      const result = parseMarkdown(markdown);
      const listBlock = result.content.find(b => b.type === 'list');
      expect(listBlock).toBeDefined();
      expect(listBlock?.ordered).toBe(false);
      expect(Array.isArray(listBlock?.content)).toBe(true);
      expect((listBlock?.content as string[]).length).toBe(3);
    });

    it('should extract ordered lists', () => {
      const markdown = `1. First
2. Second
3. Third`;

      const result = parseMarkdown(markdown);
      const listBlock = result.content.find(b => b.type === 'list');
      expect(listBlock).toBeDefined();
      expect(listBlock?.ordered).toBe(true);
    });

    it('should extract code blocks', () => {
      const markdown = `\`\`\`javascript
const x = 1;
\`\`\``;

      const result = parseMarkdown(markdown);
      const codeBlock = result.content.find(b => b.type === 'code');
      expect(codeBlock).toBeDefined();
      expect(codeBlock?.language).toBe('javascript');
      expect(codeBlock?.content).toContain('const x = 1');
    });

    it('should extract horizontal rules', () => {
      const markdown = `Content above

---

Content below`;

      const result = parseMarkdown(markdown);
      const hrBlock = result.content.find(b => b.type === 'hr');
      expect(hrBlock).toBeDefined();
    });

    it('should extract tables as content blocks', () => {
      const markdown = `| A | B |
|---|---|
| 1 | 2 |`;

      const result = parseMarkdown(markdown);
      const tableBlock = result.content.find(b => b.type === 'table');
      expect(tableBlock).toBeDefined();
      expect(typeof tableBlock?.content).toBe('object');
    });
  });

  describe('hasHorizontalRules', () => {
    it('should detect horizontal rules', () => {
      const markdown = `Content

---

More content`;

      const result = parseMarkdown(markdown);
      expect(hasHorizontalRules(result.tokens)).toBe(true);
    });

    it('should return false when no horizontal rules', () => {
      const markdown = `# Heading

Just some content`;

      const result = parseMarkdown(markdown);
      expect(hasHorizontalRules(result.tokens)).toBe(false);
    });
  });

  describe('splitByHorizontalRules', () => {
    it('should split content at horizontal rules', () => {
      const markdown = `# Slide 1

Content 1

---

# Slide 2

Content 2

---

# Slide 3

Content 3`;

      const result = parseMarkdown(markdown);
      const slides = splitByHorizontalRules(result.tokens);
      expect(slides).toHaveLength(3);
    });

    it('should return single group when no horizontal rules', () => {
      const markdown = `# Just one section

With some content`;

      const result = parseMarkdown(markdown);
      const slides = splitByHorizontalRules(result.tokens);
      expect(slides).toHaveLength(1);
    });

    it('should handle consecutive horizontal rules', () => {
      const markdown = `Content

---

---

More content`;

      const result = parseMarkdown(markdown);
      const slides = splitByHorizontalRules(result.tokens);
      // Empty sections between consecutive HRs should be omitted
      expect(slides.length).toBeGreaterThanOrEqual(2);
    });
  });
});
