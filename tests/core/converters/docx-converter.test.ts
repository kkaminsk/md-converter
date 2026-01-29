import * as fs from 'fs/promises';
import * as path from 'path';
import { convertToDocx, convertMarkdownToDocx } from '../../../src/core/converters/docx-converter.js';

describe('docx-converter', () => {
  const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures');
  const outputDir = path.join(process.cwd(), 'tests', 'output');

  beforeAll(async () => {
    // Create output directory for tests
    await fs.mkdir(outputDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up output files
    try {
      const files = await fs.readdir(outputDir);
      for (const file of files) {
        if (file.endsWith('.docx')) {
          await fs.unlink(path.join(outputDir, file));
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('convertToDocx', () => {
    it('should convert a valid markdown file to docx', async () => {
      const inputPath = path.join(fixturesDir, 'valid-docx.md');
      const outputPath = path.join(outputDir, 'valid-docx.docx');

      const result = await convertToDocx(inputPath, outputPath);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);

      // Verify file was created
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should convert minimal markdown file', async () => {
      const inputPath = path.join(fixturesDir, 'minimal.md');
      const outputPath = path.join(outputDir, 'minimal.docx');

      const result = await convertToDocx(inputPath, outputPath);

      expect(result.success).toBe(true);

      // Verify file was created
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should use default output path when not specified', async () => {
      // Create a temporary input file
      const tempInput = path.join(outputDir, 'temp-test.md');
      await fs.writeFile(tempInput, `---
format: docx
title: "Temp Test"
---

# Temp Test

Content here.
`);

      const result = await convertToDocx(tempInput);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(tempInput.replace(/\.md$/, '.docx'));

      // Clean up
      await fs.unlink(tempInput);
      await fs.unlink(result.outputPath);
    });

    it('should include warnings from front matter parsing', async () => {
      // Create a file with missing recommended fields
      const tempInput = path.join(outputDir, 'warnings-test.md');
      await fs.writeFile(tempInput, `---
format: docx
title: "Only Required Fields"
---

# Content
`);

      const result = await convertToDocx(tempInput);

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);

      // Clean up
      await fs.unlink(tempInput);
      await fs.unlink(result.outputPath);
    });
  });

  describe('convertMarkdownToDocx', () => {
    it('should convert markdown string to docx', async () => {
      const markdown = `---
format: docx
title: "String Test"
author: "Test Author"
---

# String Test Document

This is a test paragraph.

## Section One

- Bullet item 1
- Bullet item 2

## Section Two

1. Numbered item 1
2. Numbered item 2
`;

      const outputPath = path.join(outputDir, 'string-test.docx');
      const result = await convertMarkdownToDocx(markdown, outputPath);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);

      // Verify file was created
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should handle markdown without front matter', async () => {
      const markdown = `# No Front Matter

Just some content.
`;

      const outputPath = path.join(outputDir, 'no-frontmatter.docx');
      const result = await convertMarkdownToDocx(markdown, outputPath);

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0); // Warning about missing front matter
    });

    it('should handle tables in markdown', async () => {
      const markdown = `---
format: docx
title: "Table Test"
---

# Table Test

| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1 | Cell 2 | Cell 3 |
| Cell 4 | Cell 5 | Cell 6 |
`;

      const outputPath = path.join(outputDir, 'table-test.docx');
      const result = await convertMarkdownToDocx(markdown, outputPath);

      expect(result.success).toBe(true);
    });

    it('should handle code blocks', async () => {
      const markdown = `---
format: docx
title: "Code Test"
---

# Code Test

\`\`\`javascript
const x = 1;
console.log(x);
\`\`\`
`;

      const outputPath = path.join(outputDir, 'code-test.docx');
      const result = await convertMarkdownToDocx(markdown, outputPath);

      expect(result.success).toBe(true);
    });

    it('should handle horizontal rules for section breaks', async () => {
      const markdown = `---
format: docx
title: "Section Test"
section_breaks: all
---

# Section One

Content for section one.

---

# Section Two

Content for section two.
`;

      const outputPath = path.join(outputDir, 'section-test.docx');
      const result = await convertMarkdownToDocx(markdown, outputPath);

      expect(result.success).toBe(true);
    });
  });

  describe('inline formatting', () => {
    it('should handle bold text', async () => {
      const markdown = `---
format: docx
title: "Bold Test"
---

# Bold Test

This has **bold** text.
`;

      const outputPath = path.join(outputDir, 'bold-test.docx');
      const result = await convertMarkdownToDocx(markdown, outputPath);

      expect(result.success).toBe(true);
    });

    it('should handle italic text', async () => {
      const markdown = `---
format: docx
title: "Italic Test"
---

# Italic Test

This has *italic* text.
`;

      const outputPath = path.join(outputDir, 'italic-test.docx');
      const result = await convertMarkdownToDocx(markdown, outputPath);

      expect(result.success).toBe(true);
    });

    it('should handle inline code', async () => {
      const markdown = `---
format: docx
title: "Inline Code Test"
---

# Inline Code Test

This has \`inline code\` text.
`;

      const outputPath = path.join(outputDir, 'inline-code-test.docx');
      const result = await convertMarkdownToDocx(markdown, outputPath);

      expect(result.success).toBe(true);
    });
  });

  describe('metadata handling', () => {
    it('should use metadata for document properties', async () => {
      const markdown = `---
format: docx
title: "Document Title"
author: "Test Author"
subject: "Test Subject"
keywords:
  - keyword1
  - keyword2
description: "Test Description"
---

# Content
`;

      const outputPath = path.join(outputDir, 'metadata-test.docx');
      const result = await convertMarkdownToDocx(markdown, outputPath);

      expect(result.success).toBe(true);
      // Note: Actual metadata verification would require reading the DOCX file
    });
  });
});
