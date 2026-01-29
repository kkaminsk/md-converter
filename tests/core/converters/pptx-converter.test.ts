import * as fs from 'fs/promises';
import * as path from 'path';
import { convertToPptx, convertMarkdownToPptx } from '../../../src/core/converters/pptx-converter.js';

describe('pptx-converter', () => {
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
        if (file.endsWith('.pptx')) {
          await fs.unlink(path.join(outputDir, file));
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('convertToPptx', () => {
    it('should convert a valid markdown file to pptx', async () => {
      const inputPath = path.join(fixturesDir, 'valid-pptx.md');
      const outputPath = path.join(outputDir, 'valid-pptx.pptx');

      const result = await convertToPptx(inputPath, outputPath);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
      expect(result.slideCount).toBeGreaterThan(0);

      // Verify file was created
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should use default output path when not specified', async () => {
      // Create a temporary input file
      const tempInput = path.join(outputDir, 'pptx-temp.md');
      await fs.writeFile(tempInput, `---
format: pptx
title: "Temp Presentation"
---

# Temp Presentation

Content here.
`);

      const result = await convertToPptx(tempInput);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(tempInput.replace(/\.md$/, '.pptx'));

      // Clean up
      await fs.unlink(tempInput);
      await fs.unlink(result.outputPath);
    });

    it('should create slides from H1 headings as title slides', async () => {
      const markdown = `---
format: pptx
title: "Title Slide Test"
---

# Main Title

Subtitle text here.
`;

      const outputPath = path.join(outputDir, 'title-slide.pptx');
      const result = await convertMarkdownToPptx(markdown, outputPath);

      expect(result.success).toBe(true);
      expect(result.slideCount).toBeGreaterThanOrEqual(1);
    });

    it('should create section slides from H2 headings', async () => {
      const markdown = `---
format: pptx
title: "Section Test"
---

# Main Title

## Section One

## Section Two
`;

      const outputPath = path.join(outputDir, 'section-slides.pptx');
      const result = await convertMarkdownToPptx(markdown, outputPath);

      expect(result.success).toBe(true);
      expect(result.slideCount).toBeGreaterThanOrEqual(3);
    });

    it('should create content slides from H3 headings', async () => {
      const markdown = `---
format: pptx
title: "Content Test"
---

# Main Title

### Content Slide 1

Some content.

### Content Slide 2

More content.
`;

      const outputPath = path.join(outputDir, 'content-slides.pptx');
      const result = await convertMarkdownToPptx(markdown, outputPath);

      expect(result.success).toBe(true);
    });
  });

  describe('convertMarkdownToPptx', () => {
    it('should convert markdown string to pptx', async () => {
      const markdown = `# String Test Presentation

## Section One

### Slide One

- Bullet 1
- Bullet 2
- Bullet 3

### Slide Two

1. Numbered 1
2. Numbered 2
`;

      const outputPath = path.join(outputDir, 'string-pptx.pptx');
      const result = await convertMarkdownToPptx(markdown, outputPath);

      expect(result.success).toBe(true);
      expect(result.slideCount).toBeGreaterThan(0);
    });

    it('should handle slides with tables', async () => {
      const markdown = `# Table Presentation

### Data Slide

| Column A | Column B |
|----------|----------|
| Value 1 | Value 2 |
| Value 3 | Value 4 |
`;

      const outputPath = path.join(outputDir, 'table-pptx.pptx');
      const result = await convertMarkdownToPptx(markdown, outputPath);

      expect(result.success).toBe(true);
    });

    it('should handle slides with code blocks', async () => {
      const markdown = `# Code Presentation

### Code Example

\`\`\`javascript
const hello = 'world';
console.log(hello);
\`\`\`
`;

      const outputPath = path.join(outputDir, 'code-pptx.pptx');
      const result = await convertMarkdownToPptx(markdown, outputPath);

      expect(result.success).toBe(true);
    });

    it('should split slides at horizontal rules', async () => {
      const markdown = `# First Section

Content 1

---

# Second Section

Content 2

---

# Third Section

Content 3
`;

      const outputPath = path.join(outputDir, 'hr-pptx.pptx');
      const result = await convertMarkdownToPptx(markdown, outputPath);

      expect(result.success).toBe(true);
      expect(result.slideCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('theme options', () => {
    it('should apply light theme', async () => {
      const markdown = `# Light Theme Test

### Slide

Content.
`;

      const outputPath = path.join(outputDir, 'light-theme.pptx');
      const result = await convertMarkdownToPptx(markdown, outputPath, {
        theme: 'light',
      });

      expect(result.success).toBe(true);
    });

    it('should apply dark theme', async () => {
      const markdown = `# Dark Theme Test

### Slide

Content.
`;

      const outputPath = path.join(outputDir, 'dark-theme.pptx');
      const result = await convertMarkdownToPptx(markdown, outputPath, {
        theme: 'dark',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('font options', () => {
    it('should use custom font family', async () => {
      const markdown = `# Font Test

### Slide

Content with custom font.
`;

      const outputPath = path.join(outputDir, 'font-pptx.pptx');
      const result = await convertMarkdownToPptx(markdown, outputPath, {
        fontFamily: 'Calibri',
      });

      expect(result.success).toBe(true);
    });

    it('should use custom font size', async () => {
      const markdown = `# Font Size Test

### Slide

Content with custom size.
`;

      const outputPath = path.join(outputDir, 'fontsize-pptx.pptx');
      const result = await convertMarkdownToPptx(markdown, outputPath, {
        fontSize: 24,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('metadata handling', () => {
    it('should use metadata for presentation properties', async () => {
      const markdown = `---
format: pptx
title: "Metadata Test"
author: "Test Author"
subject: "Test Subject"
keywords:
  - keyword1
  - keyword2
---

# Metadata Test

Content.
`;

      const outputPath = path.join(outputDir, 'metadata-pptx.pptx');
      const result = await convertToPptx(
        path.join(outputDir, 'metadata-test.md'),
        outputPath
      ).catch(async () => {
        // Create the temp file first
        await fs.writeFile(path.join(outputDir, 'metadata-test.md'), markdown);
        return convertToPptx(path.join(outputDir, 'metadata-test.md'), outputPath);
      });

      expect(result.success).toBe(true);

      // Clean up temp file
      try {
        await fs.unlink(path.join(outputDir, 'metadata-test.md'));
      } catch {
        // Ignore
      }
    });
  });

  describe('content types', () => {
    it('should handle bullet lists', async () => {
      const markdown = `# List Test

### Bullet List

- Item 1
- Item 2
- Item 3
`;

      const outputPath = path.join(outputDir, 'bullet-list.pptx');
      const result = await convertMarkdownToPptx(markdown, outputPath);

      expect(result.success).toBe(true);
    });

    it('should handle numbered lists', async () => {
      const markdown = `# List Test

### Numbered List

1. First
2. Second
3. Third
`;

      const outputPath = path.join(outputDir, 'numbered-list.pptx');
      const result = await convertMarkdownToPptx(markdown, outputPath);

      expect(result.success).toBe(true);
    });

    it('should handle mixed content', async () => {
      const markdown = `# Mixed Content

### Slide with Everything

Here is a paragraph.

- Bullet 1
- Bullet 2

| Header A | Header B |
|----------|----------|
| Cell 1 | Cell 2 |

\`\`\`
Some code
\`\`\`
`;

      const outputPath = path.join(outputDir, 'mixed-content.pptx');
      const result = await convertMarkdownToPptx(markdown, outputPath);

      expect(result.success).toBe(true);
    });
  });
});
