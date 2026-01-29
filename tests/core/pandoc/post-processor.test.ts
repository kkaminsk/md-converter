/**
 * Tests for PostProcessor
 */

import { join } from 'path';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import {
  PostProcessor,
  PostProcessorError,
} from '../../../src/core/pandoc/index.js';
import type { PostProcessorOptions } from '../../../src/core/pandoc/index.js';

// Use scratchpad for temp files
const TEMP_DIR = join(process.cwd(), '.test-temp');

describe('PostProcessor', () => {
  let postProcessor: PostProcessor;

  beforeAll(() => {
    // Create temp directory
    if (!existsSync(TEMP_DIR)) {
      mkdirSync(TEMP_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up temp directory
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    postProcessor = new PostProcessor();
  });

  describe('format dispatching', () => {
    it('should throw PostProcessorError for non-existent file', async () => {
      const options: PostProcessorOptions = {
        format: 'docx',
        outputPath: '/nonexistent/file.docx',
        extractedData: {
          formulas: [],
          metadata: null,
          tableCount: 0,
        },
      };

      await expect(postProcessor.process(options)).rejects.toThrow(PostProcessorError);
      await expect(postProcessor.process(options)).rejects.toThrow('not found');
    });

    it('should throw PostProcessorError for unsupported format', async () => {
      // Create a dummy file
      const tempFile = join(TEMP_DIR, 'test.xyz');
      writeFileSync(tempFile, 'test');

      const options = {
        format: 'xyz' as any,
        outputPath: tempFile,
        extractedData: {
          formulas: [],
          metadata: null,
          tableCount: 0,
        },
      };

      await expect(postProcessor.process(options)).rejects.toThrow(PostProcessorError);
      await expect(postProcessor.process(options)).rejects.toThrow('Unsupported format');
    });
  });

  describe('XLSX formula injection', () => {
    it('should inject formula into XLSX cell', async () => {
      // Create a test XLSX with placeholder
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Sheet1');
      sheet.getCell('A1').value = 'Amount';
      sheet.getCell('B1').value = 'Tax';
      sheet.getCell('A2').value = 100;
      sheet.getCell('B2').value = '__FORMULA_0_1_1__';

      const tempFile = join(TEMP_DIR, 'formula-test.xlsx');
      await workbook.xlsx.writeFile(tempFile);

      const options: PostProcessorOptions = {
        format: 'xlsx',
        outputPath: tempFile,
        extractedData: {
          formulas: [
            {
              tableIndex: 0,
              row: 1,
              column: 1,
              formula: 'A2*0.1',
              placeholder: '__FORMULA_0_1_1__',
            },
          ],
          metadata: null,
          tableCount: 1,
        },
      };

      const result = await postProcessor.process(options);

      expect(result.success).toBe(true);
      expect(result.modifications.some((m) => m.includes('Injected formula'))).toBe(true);

      // Verify formula was injected
      const resultWorkbook = new ExcelJS.Workbook();
      await resultWorkbook.xlsx.readFile(tempFile);
      const resultSheet = resultWorkbook.worksheets[0];
      const cell = resultSheet.getCell('B2');
      expect(cell.value).toHaveProperty('formula');
    });

    it('should warn when placeholder not found', async () => {
      // Create a test XLSX without placeholder
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Sheet1');
      sheet.getCell('A1').value = 'Test';

      const tempFile = join(TEMP_DIR, 'no-placeholder.xlsx');
      await workbook.xlsx.writeFile(tempFile);

      const options: PostProcessorOptions = {
        format: 'xlsx',
        outputPath: tempFile,
        extractedData: {
          formulas: [
            {
              tableIndex: 0,
              row: 1,
              column: 1,
              formula: 'A2*0.1',
              placeholder: '__FORMULA_0_1_1__',
            },
          ],
          metadata: null,
          tableCount: 1,
        },
      };

      const result = await postProcessor.process(options);

      expect(result.success).toBe(true);
      expect(result.warnings.some((w) => w.includes('not found'))).toBe(true);
    });

    it('should return success with no modifications when no formulas', async () => {
      const workbook = new ExcelJS.Workbook();
      workbook.addWorksheet('Sheet1');

      const tempFile = join(TEMP_DIR, 'empty-formulas.xlsx');
      await workbook.xlsx.writeFile(tempFile);

      const options: PostProcessorOptions = {
        format: 'xlsx',
        outputPath: tempFile,
        extractedData: {
          formulas: [],
          metadata: null,
          tableCount: 0,
        },
      };

      const result = await postProcessor.process(options);

      expect(result.success).toBe(true);
      expect(result.modifications.filter((m) => m.includes('formula'))).toHaveLength(0);
    });
  });

  describe('DOCX header injection', () => {
    it('should add classification header to DOCX', async () => {
      // Create minimal DOCX
      const zip = new JSZip();
      zip.file(
        'word/document.xml',
        '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Test</w:t></w:r></w:p></w:body></w:document>'
      );
      zip.file(
        'word/header1.xml',
        '<?xml version="1.0"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p></w:p></w:hdr>'
      );
      zip.file(
        'word/_rels/document.xml.rels',
        '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/></Relationships>'
      );
      zip.file(
        'docProps/core.xml',
        '<?xml version="1.0"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title></dc:title></cp:coreProperties>'
      );
      zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>');

      const tempFile = join(TEMP_DIR, 'header-test.docx');
      const content = await zip.generateAsync({ type: 'nodebuffer' });
      writeFileSync(tempFile, content);

      const options: PostProcessorOptions = {
        format: 'docx',
        outputPath: tempFile,
        extractedData: {
          formulas: [],
          metadata: {
            format: 'docx',
            title: 'Test',
            classification: 'OFFICIAL',
          },
          tableCount: 0,
        },
      };

      const result = await postProcessor.process(options);

      expect(result.success).toBe(true);
      expect(result.modifications.some((m) => m.includes('classification'))).toBe(true);

      // Verify header was modified
      const resultContent = readFileSync(tempFile);
      const resultZip = await JSZip.loadAsync(resultContent);
      const header = await resultZip.file('word/header1.xml')?.async('string');
      expect(header).toContain('OFFICIAL');
    });

    it('should not modify headers when no classification', async () => {
      // Create minimal DOCX
      const zip = new JSZip();
      zip.file(
        'word/document.xml',
        '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body></w:body></w:document>'
      );
      zip.file(
        'docProps/core.xml',
        '<?xml version="1.0"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"></cp:coreProperties>'
      );

      const tempFile = join(TEMP_DIR, 'no-classification.docx');
      const content = await zip.generateAsync({ type: 'nodebuffer' });
      writeFileSync(tempFile, content);

      const options: PostProcessorOptions = {
        format: 'docx',
        outputPath: tempFile,
        extractedData: {
          formulas: [],
          metadata: {
            format: 'docx',
            title: 'Test',
          },
          tableCount: 0,
        },
      };

      const result = await postProcessor.process(options);

      expect(result.success).toBe(true);
      expect(result.modifications.filter((m) => m.includes('classification'))).toHaveLength(0);
    });
  });

  describe('PPTX footer injection', () => {
    it('should add classification to PPTX slides', async () => {
      // Create minimal PPTX
      const zip = new JSZip();
      zip.file(
        'ppt/slides/slide1.xml',
        '<?xml version="1.0"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree></p:spTree></p:cSld></p:sld>'
      );
      zip.file(
        'docProps/core.xml',
        '<?xml version="1.0"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title></dc:title></cp:coreProperties>'
      );

      const tempFile = join(TEMP_DIR, 'pptx-footer-test.pptx');
      const content = await zip.generateAsync({ type: 'nodebuffer' });
      writeFileSync(tempFile, content);

      const options: PostProcessorOptions = {
        format: 'pptx',
        outputPath: tempFile,
        extractedData: {
          formulas: [],
          metadata: {
            format: 'pptx',
            title: 'Test',
            classification: 'CONFIDENTIAL',
          },
          tableCount: 0,
        },
      };

      const result = await postProcessor.process(options);

      expect(result.success).toBe(true);
      expect(
        result.modifications.some((m) => m.includes('classification')) ||
          result.modifications.some((m) => m.includes('footer'))
      ).toBe(true);
    });
  });

  describe('document properties patching', () => {
    it('should update DOCX properties with metadata', async () => {
      const zip = new JSZip();
      zip.file(
        'word/document.xml',
        '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body></w:body></w:document>'
      );
      zip.file(
        'docProps/core.xml',
        '<?xml version="1.0"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"><dc:title>Old Title</dc:title><dc:creator>Old Author</dc:creator></cp:coreProperties>'
      );

      const tempFile = join(TEMP_DIR, 'props-test.docx');
      const content = await zip.generateAsync({ type: 'nodebuffer' });
      writeFileSync(tempFile, content);

      const options: PostProcessorOptions = {
        format: 'docx',
        outputPath: tempFile,
        extractedData: {
          formulas: [],
          metadata: {
            format: 'docx',
            title: 'New Title',
            author: 'New Author',
            keywords: ['test', 'document'],
          },
          tableCount: 0,
        },
      };

      const result = await postProcessor.process(options);

      expect(result.success).toBe(true);
      expect(result.modifications.some((m) => m.includes('properties'))).toBe(true);

      // Verify properties were updated
      const resultContent = readFileSync(tempFile);
      const resultZip = await JSZip.loadAsync(resultContent);
      const core = await resultZip.file('docProps/core.xml')?.async('string');
      expect(core).toContain('New Title');
      expect(core).toContain('New Author');
    });
  });
});
