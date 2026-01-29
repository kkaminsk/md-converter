/**
 * Tests for PreProcessor
 */

import { PreProcessor, PreProcessorError } from '../../../src/core/pandoc/index.js';

describe('PreProcessor', () => {
  let preProcessor: PreProcessor;

  beforeEach(() => {
    preProcessor = new PreProcessor();
  });

  describe('formula extraction', () => {
    it('should extract single formula with correct placeholder', () => {
      const markdown = `---
format: xlsx
title: Test
---

| Item | Amount | Total |
|------|--------|-------|
| A | 100 | {=SUM(B2:B5)} |
`;

      const result = preProcessor.process(markdown);

      expect(result.extractedData.formulas).toHaveLength(1);
      expect(result.extractedData.formulas[0]).toEqual({
        tableIndex: 0,
        row: 1, // First data row after header
        column: 2,
        formula: 'SUM(B2:B5)',
        placeholder: '__FORMULA_0_1_2__',
      });
      expect(result.content).toContain('__FORMULA_0_1_2__');
      expect(result.content).not.toContain('{=SUM(B2:B5)}');
    });

    it('should extract multiple formulas across multiple tables', () => {
      const markdown = `---
format: xlsx
title: Test
---

| A | B |
|---|---|
| 1 | {=A2*2} |
| 2 | {=A3*2} |

Some text between tables.

| X | Y |
|---|---|
| 10 | {=X2+1} |
`;

      const result = preProcessor.process(markdown);

      expect(result.extractedData.formulas).toHaveLength(3);
      expect(result.extractedData.tableCount).toBe(2);

      // First table formulas
      expect(result.extractedData.formulas[0].tableIndex).toBe(0);
      expect(result.extractedData.formulas[0].placeholder).toBe('__FORMULA_0_1_1__');
      expect(result.extractedData.formulas[1].tableIndex).toBe(0);
      expect(result.extractedData.formulas[1].placeholder).toBe('__FORMULA_0_2_1__');

      // Second table formula
      expect(result.extractedData.formulas[2].tableIndex).toBe(1);
      expect(result.extractedData.formulas[2].placeholder).toBe('__FORMULA_1_1_1__');
    });

    it('should handle formula with special characters', () => {
      const markdown = `---
format: xlsx
title: Test
---

| A | B |
|---|---|
| 1 | {=IF(A2>0,"Yes","No")} |
`;

      const result = preProcessor.process(markdown);

      expect(result.extractedData.formulas).toHaveLength(1);
      expect(result.extractedData.formulas[0].formula).toBe('IF(A2>0,"Yes","No")');
    });

    it('should return unchanged content when no formulas exist', () => {
      const markdown = `---
format: xlsx
title: Test
---

| A | B |
|---|---|
| 1 | 2 |
`;

      const result = preProcessor.process(markdown);

      expect(result.extractedData.formulas).toHaveLength(0);
      expect(result.extractedData.tableCount).toBe(1);
    });

    it('should ignore formulas outside tables', () => {
      const markdown = `---
format: xlsx
title: Test
---

This paragraph has {=SUM(A1:A10)} in it.

| A | B |
|---|---|
| 1 | 2 |
`;

      const result = preProcessor.process(markdown);

      expect(result.extractedData.formulas).toHaveLength(0);
      expect(result.content).toContain('{=SUM(A1:A10)}');
    });
  });

  describe('formula validation', () => {
    it('should not add warning for valid formula', () => {
      const markdown = `---
format: xlsx
title: Test
---

| A | B |
|---|---|
| 1 | {=SUM(B2:B5)} |
`;

      const result = preProcessor.process(markdown);

      const formulaWarnings = result.warnings.filter((w) => w.includes('Invalid formula'));
      expect(formulaWarnings).toHaveLength(0);
    });

    it('should add warning for invalid formula', () => {
      const markdown = `---
format: xlsx
title: Test
---

| A | B |
|---|---|
| 1 | {=SUM(B2:B5} |
`;

      const result = preProcessor.process(markdown);

      expect(result.warnings.some((w) => w.includes('Invalid formula'))).toBe(true);
      expect(result.warnings.some((w) => w.includes('Mismatched parentheses'))).toBe(true);
      // Formula should still be extracted
      expect(result.extractedData.formulas).toHaveLength(1);
    });
  });

  describe('metadata normalization', () => {
    it('should map classification to subject', () => {
      const markdown = `---
format: docx
title: Test Document
classification: OFFICIAL
---

Content here.
`;

      const result = preProcessor.process(markdown);

      expect(result.extractedData.metadata?.classification).toBe('OFFICIAL');
      expect((result.extractedData.metadata as any)?.subject).toBe('OFFICIAL');
    });

    it('should add generator field', () => {
      const markdown = `---
format: docx
title: Test
---

Content.
`;

      const result = preProcessor.process(markdown);

      expect((result.extractedData.metadata as any)?.generator).toBe('md-converter');
    });

    it('should pass through section_breaks unchanged', () => {
      const markdown = `---
format: docx
title: Test
section_breaks: auto
---

Content.
`;

      const result = preProcessor.process(markdown);

      expect(result.extractedData.metadata?.section_breaks).toBe('auto');
    });

    it('should handle missing front matter with warning', () => {
      const markdown = `# No Front Matter

Just content here.
`;

      const result = preProcessor.process(markdown);

      expect(result.extractedData.metadata).toBeNull();
      expect(result.warnings.some((w) => w.includes('No YAML front matter'))).toBe(true);
    });
  });

  describe('line ending normalization', () => {
    it('should normalize CRLF to LF', () => {
      const markdown = '---\r\nformat: docx\r\ntitle: Test\r\n---\r\n\r\nContent.\r\n';

      const result = preProcessor.process(markdown);

      expect(result.content).not.toContain('\r\n');
      expect(result.content).not.toContain('\r');
    });

    it('should normalize mixed line endings', () => {
      const markdown = '---\r\nformat: docx\rtitle: Test\n---\n\nContent.\r\n';

      const result = preProcessor.process(markdown);

      expect(result.content).not.toContain('\r');
    });

    it('should detect tables correctly after CRLF normalization', () => {
      const markdown =
        '---\r\nformat: xlsx\r\ntitle: Test\r\n---\r\n\r\n| A | B |\r\n|---|---|\r\n| 1 | {=A2*2} |\r\n';

      const result = preProcessor.process(markdown);

      expect(result.extractedData.tableCount).toBe(1);
      expect(result.extractedData.formulas).toHaveLength(1);
    });
  });

  describe('PreProcessorOptions', () => {
    it('should skip formula validation when validateFormulas is false', () => {
      const markdown = `---
format: xlsx
title: Test
---

| A | B |
|---|---|
| 1 | {=SUM(B2:B5} |
`;

      const result = preProcessor.process(markdown, { validateFormulas: false });

      // Formula should be extracted but no validation warning
      expect(result.extractedData.formulas).toHaveLength(1);
      const formulaWarnings = result.warnings.filter((w) => w.includes('Invalid formula'));
      expect(formulaWarnings).toHaveLength(0);
    });

    it('should preserve line endings when preserveLineEndings is true', () => {
      const markdown = '---\r\nformat: docx\r\ntitle: Test\r\n---\r\n\r\nContent.\r\n';

      const result = preProcessor.process(markdown, { preserveLineEndings: true });

      expect(result.content).toContain('\r\n');
    });
  });

  describe('malformed YAML handling', () => {
    it('should throw PreProcessorError for malformed YAML', () => {
      const markdown = `---
format: docx
title: "unclosed quote
---

Content.
`;

      expect(() => preProcessor.process(markdown)).toThrow(PreProcessorError);
    });

    it('should include error details in PreProcessorError', () => {
      const markdown = `---
format: docx
title: "unclosed
---

Content.
`;

      try {
        preProcessor.process(markdown);
        fail('Expected PreProcessorError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PreProcessorError);
        expect((error as PreProcessorError).message).toContain('Invalid YAML');
      }
    });
  });
});
