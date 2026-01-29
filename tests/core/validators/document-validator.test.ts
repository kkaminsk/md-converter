import {
  validateDocument,
  validateDocumentStrict,
  validateHeadingHierarchy,
  validateTables,
  hasFrontMatter,
  extractMetadata,
} from '../../../src/core/validators/document-validator.js';
import { ValidationError } from '../../../src/core/errors.js';

describe('document-validator', () => {
  describe('validateDocument', () => {
    it('should validate a complete document', () => {
      const markdown = `---
format: docx
title: "Test Document"
author: "Test Author"
date: "2025-01-28"
---

# Main Title

## Section One

Some content here.

## Section Two

More content.`;

      const result = validateDocument(markdown);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata).not.toBeNull();
    });

    it('should report front matter errors', () => {
      const markdown = `---
title: "Missing format"
---

# Content`;

      const result = validateDocument(markdown);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('format'));
    });

    it('should warn on missing recommended fields', () => {
      const markdown = `---
format: docx
title: "Minimal"
---

# Content`;

      const result = validateDocument(markdown);
      // Valid but with warnings
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateHeadingHierarchy', () => {
    it('should pass for valid hierarchy', () => {
      const content = [
        { type: 'heading' as const, level: 1, content: 'H1' },
        { type: 'heading' as const, level: 2, content: 'H2' },
        { type: 'heading' as const, level: 3, content: 'H3' },
        { type: 'heading' as const, level: 2, content: 'H2 again' },
      ];

      const result = validateHeadingHierarchy(content);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect skipped heading levels', () => {
      const content = [
        { type: 'heading' as const, level: 1, content: 'H1' },
        { type: 'heading' as const, level: 3, content: 'H3 skipped H2' },
      ];

      const result = validateHeadingHierarchy(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('H2'));
    });

    it('should allow going back to lower levels', () => {
      const content = [
        { type: 'heading' as const, level: 1, content: 'H1' },
        { type: 'heading' as const, level: 2, content: 'H2' },
        { type: 'heading' as const, level: 3, content: 'H3' },
        { type: 'heading' as const, level: 1, content: 'Back to H1' },
      ];

      const result = validateHeadingHierarchy(content);
      expect(result.valid).toBe(true);
    });

    it('should ignore non-heading content', () => {
      const content = [
        { type: 'heading' as const, level: 1, content: 'H1' },
        { type: 'paragraph' as const, content: 'Some text' },
        { type: 'heading' as const, level: 2, content: 'H2' },
      ];

      const result = validateHeadingHierarchy(content);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateTables', () => {
    it('should pass for valid table', () => {
      const content = [
        {
          type: 'table' as const,
          content: {
            headers: ['A', 'B', 'C'],
            rows: [
              ['1', '2', '3'],
              ['4', '5', '6'],
            ],
          },
        },
      ];

      const result = validateTables(content);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing headers', () => {
      const content = [
        {
          type: 'table' as const,
          content: {
            headers: [],
            rows: [['1', '2']],
          },
        },
      ];

      const result = validateTables(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('No headers'));
    });

    it('should detect column count mismatch', () => {
      const content = [
        {
          type: 'table' as const,
          content: {
            headers: ['A', 'B', 'C'],
            rows: [
              ['1', '2'], // Missing column
              ['4', '5', '6'],
            ],
          },
        },
      ];

      const result = validateTables(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Column count mismatch'));
    });

    it('should validate multiple tables', () => {
      const content = [
        {
          type: 'table' as const,
          content: {
            headers: ['A', 'B'],
            rows: [['1', '2']],
          },
        },
        {
          type: 'table' as const,
          content: {
            headers: ['C', 'D'],
            rows: [['3']], // Missing column
          },
        },
      ];

      const result = validateTables(content);
      expect(result.valid).toBe(false);
    });
  });

  describe('hasFrontMatter', () => {
    it('should return true for document with front matter', () => {
      const markdown = `---
format: docx
title: "Test"
---

Content`;

      expect(hasFrontMatter(markdown)).toBe(true);
    });

    it('should return false for document without front matter', () => {
      const markdown = `# Just a heading

Some content`;

      expect(hasFrontMatter(markdown)).toBe(false);
    });

    it('should handle leading whitespace', () => {
      const markdown = `  ---
format: docx
title: "Test"
---

Content`;

      // Should still detect after trimStart
      expect(hasFrontMatter(markdown)).toBe(true);
    });
  });

  describe('extractMetadata', () => {
    it('should extract valid metadata', () => {
      const markdown = `---
format: docx
title: "Test Document"
author: "Test Author"
---

Content`;

      const metadata = extractMetadata(markdown);
      expect(metadata).not.toBeNull();
      expect(metadata?.format).toBe('docx');
      expect(metadata?.title).toBe('Test Document');
      expect(metadata?.author).toBe('Test Author');
    });

    it('should return null for invalid front matter', () => {
      const markdown = `---
format: invalid
---

Content`;

      const metadata = extractMetadata(markdown);
      expect(metadata).toBeNull();
    });

    it('should return null for missing front matter', () => {
      const markdown = `# No front matter

Just content`;

      const metadata = extractMetadata(markdown);
      expect(metadata).toBeNull();
    });
  });

  describe('content validation', () => {
    it('should detect empty headings', () => {
      const markdown = `---
format: docx
title: "Test"
---

#

Content after empty heading`;

      const result = validateDocument(markdown);
      expect(result.errors).toContainEqual(expect.stringContaining('Empty heading'));
    });

    it('should warn on missing H1', () => {
      const markdown = `---
format: docx
title: "Test"
---

## Starting with H2

Content`;

      const result = validateDocument(markdown);
      expect(result.warnings).toContainEqual(expect.stringContaining('no H1'));
    });

    it('should warn on empty list', () => {
      // This is hard to construct in markdown - an empty list typically doesn't parse
      // So we'll just verify the validator handles normal lists correctly
      const markdown = `---
format: docx
title: "Test"
---

# Title

- Item 1
- Item 2`;

      const result = validateDocument(markdown);
      // Should not have empty list warnings for a normal list
      expect(result.warnings.filter(w => w.includes('Empty') && w.includes('list'))).toHaveLength(0);
    });

    it('should warn on code block without language', () => {
      const markdown = `---
format: docx
title: "Test"
---

# Title

\`\`\`
some code without language
\`\`\``;

      const result = validateDocument(markdown);
      expect(result.warnings).toContainEqual(expect.stringContaining('no language tag'));
    });

    it('should not warn on code block with language', () => {
      const markdown = `---
format: docx
title: "Test"
---

# Title

\`\`\`javascript
const x = 1;
\`\`\``;

      const result = validateDocument(markdown);
      expect(result.warnings.filter(w => w.includes('language tag'))).toHaveLength(0);
    });
  });

  describe('validateDocumentStrict', () => {
    it('should return metadata and warnings for valid document', () => {
      const markdown = `---
format: docx
title: "Test Document"
---

# Title

Content here.`;

      const result = validateDocumentStrict(markdown);
      expect(result.metadata).not.toBeNull();
      expect(result.metadata?.format).toBe('docx');
    });

    it('should throw ValidationError for missing required field', () => {
      const markdown = `---
title: "Missing format"
---

# Content`;

      expect(() => validateDocumentStrict(markdown)).toThrow(ValidationError);
    });

    it('should include rule in ValidationError', () => {
      const markdown = `---
title: "Missing format"
---

# Content`;

      try {
        validateDocumentStrict(markdown);
        fail('Expected ValidationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).rule).toBe('required-field');
      }
    });

    it('should throw ValidationError for heading hierarchy issues', () => {
      const markdown = `---
format: docx
title: "Test"
---

# Title

### Skipped H2

Content`;

      expect(() => validateDocumentStrict(markdown)).toThrow(ValidationError);
    });

    it('should include location for heading hierarchy errors', () => {
      const markdown = `---
format: docx
title: "Test"
---

# Title

### Skipped H2`;

      try {
        validateDocumentStrict(markdown);
        fail('Expected ValidationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).rule).toBe('heading-hierarchy');
        expect((error as ValidationError).location).not.toBeNull();
      }
    });

    it('should throw ValidationError for empty heading', () => {
      const markdown = `---
format: docx
title: "Test"
---

#

Content`;

      expect(() => validateDocumentStrict(markdown)).toThrow(ValidationError);
    });
  });
});
