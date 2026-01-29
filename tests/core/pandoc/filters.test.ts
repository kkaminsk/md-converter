/**
 * Tests for filter and template path resolution
 */

import {
  getFiltersDir,
  getTemplatesDir,
  getFilterPath,
  getTemplatePath,
  getDefaultsPath,
  filterExists,
  FILTERS,
  TEMPLATES,
  DEFAULTS,
} from '../../../src/core/pandoc/index.js';

describe('Filter path resolution', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env vars before each test
    process.env = { ...originalEnv };
    delete process.env.MD_CONVERTER_FILTERS;
    delete process.env.MD_CONVERTER_TEMPLATES;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getFiltersDir', () => {
    it('should return default path when env var not set', () => {
      const dir = getFiltersDir();
      expect(dir).toContain('src');
      expect(dir).toContain('pandoc');
      expect(dir).toContain('filters');
    });

    it('should return env var path when set', () => {
      process.env.MD_CONVERTER_FILTERS = '/custom/filters';
      const dir = getFiltersDir();
      expect(dir).toContain('custom');
      expect(dir).toContain('filters');
    });
  });

  describe('getTemplatesDir', () => {
    it('should return default path when env var not set', () => {
      const dir = getTemplatesDir();
      expect(dir).toContain('templates');
    });

    it('should return env var path when set', () => {
      process.env.MD_CONVERTER_TEMPLATES = '/custom/templates';
      const dir = getTemplatesDir();
      expect(dir).toContain('custom');
      expect(dir).toContain('templates');
    });
  });

  describe('getFilterPath', () => {
    it('should return full path to filter', () => {
      const path = getFilterPath('section-breaks.lua');
      expect(path).toContain('section-breaks.lua');
      expect(path).toContain('filters');
    });

    it('should use env var when set', () => {
      process.env.MD_CONVERTER_FILTERS = '/custom/filters';
      const path = getFilterPath('section-breaks.lua');
      expect(path).toContain('custom');
      expect(path).toContain('filters');
      expect(path).toContain('section-breaks.lua');
    });
  });

  describe('getTemplatePath', () => {
    it('should return full path to template', () => {
      const path = getTemplatePath('reference.docx');
      expect(path).toContain('reference.docx');
      expect(path).toContain('templates');
    });

    it('should use env var when set', () => {
      process.env.MD_CONVERTER_TEMPLATES = '/custom/templates';
      const path = getTemplatePath('reference.docx');
      expect(path).toContain('custom');
      expect(path).toContain('templates');
      expect(path).toContain('reference.docx');
    });
  });

  describe('getDefaultsPath', () => {
    it('should return path in defaults subdirectory', () => {
      const path = getDefaultsPath('docx.yaml');
      expect(path).toContain('defaults');
      expect(path).toContain('docx.yaml');
    });
  });

  describe('filterExists', () => {
    it('should return true for existing filters', () => {
      expect(filterExists(FILTERS.SECTION_BREAKS)).toBe(true);
      expect(filterExists(FILTERS.SLIDE_BREAKS)).toBe(true);
      expect(filterExists(FILTERS.METADATA_INJECT)).toBe(true);
    });

    it('should return false for non-existent filters', () => {
      expect(filterExists('nonexistent.lua')).toBe(false);
    });
  });

  describe('Constants', () => {
    it('should have correct filter names', () => {
      expect(FILTERS.SECTION_BREAKS).toBe('section-breaks.lua');
      expect(FILTERS.SLIDE_BREAKS).toBe('slide-breaks.lua');
      expect(FILTERS.METADATA_INJECT).toBe('metadata-inject.lua');
    });

    it('should have correct template names', () => {
      expect(TEMPLATES.REFERENCE_DOCX).toBe('reference.docx');
      expect(TEMPLATES.REFERENCE_PPTX).toBe('reference.pptx');
    });

    it('should have correct defaults names', () => {
      expect(DEFAULTS.DOCX).toBe('docx.yaml');
      expect(DEFAULTS.PPTX).toBe('pptx.yaml');
    });
  });
});
