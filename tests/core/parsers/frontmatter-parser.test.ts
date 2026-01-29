import {
  parseFrontMatter,
  parseFrontMatterStrict,
  validateFrontMatter,
  getFormats,
  shouldGenerateFormat,
  shouldConvertDocument,
  shouldExcludeByPath,
  type DocumentMetadata,
} from '../../../src/core/parsers/frontmatter-parser.js';
import { FrontMatterError } from '../../../src/core/errors.js';

describe('frontmatter-parser', () => {
  describe('parseFrontMatter', () => {
    it('should parse valid front matter', () => {
      const markdown = `---
format: docx
title: "Test Document"
author: "Test Author"
---

# Content`;

      const result = parseFrontMatter(markdown);
      expect(result.metadata).not.toBeNull();
      expect(result.metadata?.format).toBe('docx');
      expect(result.metadata?.title).toBe('Test Document');
      expect(result.metadata?.author).toBe('Test Author');
      expect(result.errors).toHaveLength(0);
    });

    it('should return warning for missing front matter', () => {
      const markdown = '# Just content\n\nNo front matter here.';
      const result = parseFrontMatter(markdown);
      expect(result.metadata).toBeNull();
      expect(result.warnings).toContainEqual(expect.stringContaining('No YAML front matter found'));
    });

    it('should error on unclosed front matter', () => {
      const markdown = `---
format: docx
title: "Test"

# Content without closing ---`;

      const result = parseFrontMatter(markdown);
      expect(result.metadata).toBeNull();
      expect(result.errors).toContainEqual(expect.stringContaining('Missing closing --- delimiter'));
    });

    it('should error on invalid YAML syntax', () => {
      const markdown = `---
format: docx
title: [invalid yaml
---

# Content`;

      const result = parseFrontMatter(markdown);
      expect(result.metadata).toBeNull();
      expect(result.errors).toContainEqual(expect.stringContaining('Invalid YAML syntax'));
    });

    it('should extract content after front matter', () => {
      const markdown = `---
format: docx
title: "Test"
---

# Content Here`;

      const result = parseFrontMatter(markdown);
      expect(result.content).toContain('# Content Here');
    });
  });

  describe('validateFrontMatter - required fields', () => {
    it('should error on missing format', () => {
      const result = validateFrontMatter({ title: 'Test' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Required field missing: format'));
    });

    it('should error on missing title', () => {
      const result = validateFrontMatter({ format: 'docx' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Required field missing: title'));
    });

    it('should error on invalid format', () => {
      const result = validateFrontMatter({ format: 'pdf', title: 'Test' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Invalid format'));
    });

    it('should accept all valid formats', () => {
      const validFormats = ['docx', 'pptx', 'xlsx', 'docx,pptx', 'docx,xlsx', 'all'];
      for (const format of validFormats) {
        const result = validateFrontMatter({ format, title: 'Test' });
        expect(result.errors.filter(e => e.includes('Invalid format'))).toHaveLength(0);
      }
    });
  });

  describe('validateFrontMatter - optional fields', () => {
    const validBase = { format: 'docx', title: 'Test' };

    it('should validate author as string', () => {
      const result = validateFrontMatter({ ...validBase, author: 123 });
      expect(result.errors).toContainEqual(expect.stringContaining('author'));
    });

    it('should warn on non-standard date format', () => {
      const result = validateFrontMatter({ ...validBase, date: '01/28/2025' });
      expect(result.warnings).toContainEqual(expect.stringContaining('YYYY-MM-DD'));
    });

    it('should accept valid date format', () => {
      const result = validateFrontMatter({ ...validBase, date: '2025-01-28' });
      expect(result.warnings.filter(w => w.includes('date'))).toHaveLength(0);
    });

    it('should validate classification as string', () => {
      const result = validateFrontMatter({ ...validBase, classification: 123 });
      expect(result.errors).toContainEqual(expect.stringContaining('classification'));
    });

    it('should validate version as string', () => {
      const result = validateFrontMatter({ ...validBase, version: 1.0 });
      expect(result.errors).toContainEqual(expect.stringContaining('version'));
    });

    it('should validate status values', () => {
      const validStatuses = ['draft', 'review', 'approved', 'final'];
      for (const status of validStatuses) {
        const result = validateFrontMatter({ ...validBase, status });
        expect(result.errors.filter(e => e.includes('status'))).toHaveLength(0);
      }
    });

    it('should error on invalid status', () => {
      const result = validateFrontMatter({ ...validBase, status: 'invalid' });
      expect(result.errors).toContainEqual(expect.stringContaining('Invalid status'));
    });

    it('should warn on long description', () => {
      const result = validateFrontMatter({ ...validBase, description: 'x'.repeat(300) });
      expect(result.warnings).toContainEqual(expect.stringContaining('300 characters'));
    });

    it('should validate keywords as array of strings', () => {
      const result = validateFrontMatter({ ...validBase, keywords: ['valid', 123] });
      expect(result.errors).toContainEqual(expect.stringContaining('keywords'));
    });

    it('should validate subject as string', () => {
      const result = validateFrontMatter({ ...validBase, subject: 123 });
      expect(result.errors).toContainEqual(expect.stringContaining('subject'));
    });

    it('should validate section_breaks values', () => {
      const validValues = ['auto', 'all', 'none'];
      for (const section_breaks of validValues) {
        const result = validateFrontMatter({ ...validBase, section_breaks });
        expect(result.errors.filter(e => e.includes('section_breaks'))).toHaveLength(0);
      }
    });

    it('should error on invalid section_breaks', () => {
      const result = validateFrontMatter({ ...validBase, section_breaks: 'invalid' });
      expect(result.errors).toContainEqual(expect.stringContaining('section_breaks'));
    });

    it('should validate slide_breaks values', () => {
      const validValues = ['h1', 'h2', 'hr'];
      for (const slide_breaks of validValues) {
        const result = validateFrontMatter({ ...validBase, slide_breaks });
        expect(result.errors.filter(e => e.includes('slide_breaks'))).toHaveLength(0);
      }
    });

    it('should error on invalid slide_breaks', () => {
      const result = validateFrontMatter({ ...validBase, slide_breaks: 'invalid' });
      expect(result.errors).toContainEqual(expect.stringContaining('slide_breaks'));
    });

    it('should validate convert as boolean', () => {
      const result = validateFrontMatter({ ...validBase, convert: 'false' });
      expect(result.errors).toContainEqual(expect.stringContaining('convert'));
    });

    it('should validate document_type values', () => {
      const validTypes = ['document', 'email', 'reference', 'note', 'system'];
      for (const document_type of validTypes) {
        const result = validateFrontMatter({ ...validBase, document_type });
        expect(result.errors.filter(e => e.includes('document_type'))).toHaveLength(0);
      }
    });

    it('should error on invalid document_type', () => {
      const result = validateFrontMatter({ ...validBase, document_type: 'invalid' });
      expect(result.errors).toContainEqual(expect.stringContaining('document_type'));
    });

    it('should validate date_format values', () => {
      const validValues = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
      for (const date_format of validValues) {
        const result = validateFrontMatter({ ...validBase, date_format });
        expect(result.errors.filter(e => e.includes('date_format'))).toHaveLength(0);
      }
    });

    it('should error on invalid date_format', () => {
      const result = validateFrontMatter({ ...validBase, date_format: 'invalid' });
      expect(result.errors).toContainEqual(expect.stringContaining('date_format'));
    });
  });

  describe('validateFrontMatter - completeness warnings', () => {
    it('should warn on missing recommended fields', () => {
      const result = validateFrontMatter({ format: 'docx', title: 'Test' });
      expect(result.warnings).toContainEqual(expect.stringContaining('author'));
      expect(result.warnings).toContainEqual(expect.stringContaining('date'));
      expect(result.warnings).toContainEqual(expect.stringContaining('classification'));
      expect(result.warnings).toContainEqual(expect.stringContaining('version'));
      expect(result.warnings).toContainEqual(expect.stringContaining('keywords'));
    });
  });

  describe('getFormats', () => {
    it('should return default format for null metadata', () => {
      expect(getFormats(null)).toEqual(['docx']);
    });

    it('should return all formats for "all"', () => {
      const metadata = { format: 'all', title: 'Test' } as DocumentMetadata;
      expect(getFormats(metadata)).toEqual(['docx', 'pptx', 'xlsx']);
    });

    it('should split comma-separated formats', () => {
      const metadata = { format: 'docx,pptx', title: 'Test' } as DocumentMetadata;
      expect(getFormats(metadata)).toEqual(['docx', 'pptx']);
    });

    it('should return single format', () => {
      const metadata = { format: 'xlsx', title: 'Test' } as DocumentMetadata;
      expect(getFormats(metadata)).toEqual(['xlsx']);
    });
  });

  describe('shouldGenerateFormat', () => {
    it('should return true for matching format', () => {
      const metadata = { format: 'docx', title: 'Test' } as DocumentMetadata;
      expect(shouldGenerateFormat(metadata, 'docx')).toBe(true);
    });

    it('should return false for non-matching format', () => {
      const metadata = { format: 'docx', title: 'Test' } as DocumentMetadata;
      expect(shouldGenerateFormat(metadata, 'xlsx')).toBe(false);
    });

    it('should return true for "all" format', () => {
      const metadata = { format: 'all', title: 'Test' } as DocumentMetadata;
      expect(shouldGenerateFormat(metadata, 'docx')).toBe(true);
      expect(shouldGenerateFormat(metadata, 'pptx')).toBe(true);
      expect(shouldGenerateFormat(metadata, 'xlsx')).toBe(true);
    });
  });

  describe('shouldConvertDocument', () => {
    it('should return true for normal document', () => {
      const metadata = { format: 'docx', title: 'Test' } as DocumentMetadata;
      expect(shouldConvertDocument(metadata)).toBe(true);
    });

    it('should return false when convert is false', () => {
      const metadata = { format: 'docx', title: 'Test', convert: false } as DocumentMetadata;
      expect(shouldConvertDocument(metadata)).toBe(false);
    });

    it('should return false for email document type', () => {
      const metadata = { format: 'docx', title: 'Test', document_type: 'email' } as DocumentMetadata;
      expect(shouldConvertDocument(metadata)).toBe(false);
    });

    it('should return false for reference document type', () => {
      const metadata = { format: 'docx', title: 'Test', document_type: 'reference' } as DocumentMetadata;
      expect(shouldConvertDocument(metadata)).toBe(false);
    });

    it('should return false for note document type', () => {
      const metadata = { format: 'docx', title: 'Test', document_type: 'note' } as DocumentMetadata;
      expect(shouldConvertDocument(metadata)).toBe(false);
    });

    it('should return false for system document type', () => {
      const metadata = { format: 'docx', title: 'Test', document_type: 'system' } as DocumentMetadata;
      expect(shouldConvertDocument(metadata)).toBe(false);
    });

    it('should return true for document type', () => {
      const metadata = { format: 'docx', title: 'Test', document_type: 'document' } as DocumentMetadata;
      expect(shouldConvertDocument(metadata)).toBe(true);
    });

    it('should return true for null metadata', () => {
      expect(shouldConvertDocument(null)).toBe(true);
    });
  });

  describe('shouldExcludeByPath', () => {
    it('should exclude README.md files', () => {
      expect(shouldExcludeByPath('README.md')).toBe(true);
      expect(shouldExcludeByPath('/docs/README.md')).toBe(true);
      expect(shouldExcludeByPath('path/to/README.md')).toBe(true);
    });

    it('should exclude files in notes directory', () => {
      expect(shouldExcludeByPath('/notes/file.md')).toBe(true);
      expect(shouldExcludeByPath('path/notes/file.md')).toBe(true);
    });

    it('should exclude files in reference/references directory', () => {
      expect(shouldExcludeByPath('/reference/file.md')).toBe(true);
      expect(shouldExcludeByPath('/references/file.md')).toBe(true);
    });

    it('should not exclude regular files', () => {
      expect(shouldExcludeByPath('/docs/document.md')).toBe(false);
      expect(shouldExcludeByPath('myfile.md')).toBe(false);
    });

    it('should handle Windows-style paths', () => {
      expect(shouldExcludeByPath('C:\\docs\\README.md')).toBe(true);
      expect(shouldExcludeByPath('C:\\notes\\file.md')).toBe(true);
    });
  });

  describe('parseFrontMatterStrict', () => {
    it('should return metadata for valid front matter', () => {
      const markdown = `---
format: docx
title: "Test Document"
---

# Content`;

      const result = parseFrontMatterStrict(markdown);
      expect(result.metadata).not.toBeNull();
      expect(result.metadata.format).toBe('docx');
      expect(result.metadata.title).toBe('Test Document');
    });

    it('should throw FrontMatterError for missing front matter', () => {
      const markdown = '# Just content';
      expect(() => parseFrontMatterStrict(markdown)).toThrow(FrontMatterError);
    });

    it('should throw FrontMatterError for invalid YAML', () => {
      const markdown = `---
format: docx
title: [invalid yaml
---
# Content`;
      expect(() => parseFrontMatterStrict(markdown)).toThrow(FrontMatterError);
    });

    it('should throw FrontMatterError with field info for missing required field', () => {
      const markdown = `---
title: "Test"
---
# Content`;

      try {
        parseFrontMatterStrict(markdown);
        fail('Expected FrontMatterError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FrontMatterError);
        expect((error as FrontMatterError).field).toBe('format');
      }
    });

    it('should include warnings for missing recommended fields', () => {
      const markdown = `---
format: docx
title: "Test Document"
---

# Content`;

      const result = parseFrontMatterStrict(markdown);
      expect(result.warnings).toContainEqual(expect.stringContaining('author'));
    });
  });
});
