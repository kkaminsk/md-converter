/**
 * Tests for PandocExecutor
 */

import { PandocExecutor, PandocNotFoundError, PandocVersionError } from '../../../src/core/pandoc/index.js';

describe('PandocExecutor', () => {
  describe('checkInstallation', () => {
    it('should return installation info or not-found status', async () => {
      const executor = new PandocExecutor();
      const result = await executor.checkInstallation();

      // Either Pandoc is installed or it's not
      expect(typeof result.installed).toBe('boolean');

      if (result.installed) {
        expect(result.version).toBeDefined();
        expect(result.version).toMatch(/^\d+\.\d+/);
        expect(result.path).toBeDefined();
      } else {
        expect(result.error).toBeDefined();
      }
    });

    it('should cache installation check results', async () => {
      const executor = new PandocExecutor();

      const result1 = await executor.checkInstallation();
      const result2 = await executor.checkInstallation();

      // Results should be identical (cached)
      expect(result1).toEqual(result2);
    });

    it('should use custom pandoc path if provided', async () => {
      const executor = new PandocExecutor('/nonexistent/path/to/pandoc');
      const result = await executor.checkInstallation();

      expect(result.installed).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('convert', () => {
    it('should throw PandocNotFoundError when Pandoc is not installed', async () => {
      const executor = new PandocExecutor('/nonexistent/pandoc');

      await expect(
        executor.convert('# Hello', {
          inputFormat: 'markdown',
          outputFormat: 'docx',
          standalone: true,
        })
      ).rejects.toThrow(PandocNotFoundError);
    });
  });

  describe('toAST', () => {
    it('should throw PandocNotFoundError when Pandoc is not installed', async () => {
      const executor = new PandocExecutor('/nonexistent/pandoc');

      await expect(executor.toAST('# Hello')).rejects.toThrow(PandocNotFoundError);
    });
  });
});

describe('Error classes', () => {
  it('PandocNotFoundError should have correct name and message', () => {
    const error = new PandocNotFoundError();
    expect(error.name).toBe('PandocNotFoundError');
    expect(error.message).toContain('Pandoc');
    expect(error.message).toContain('pandoc.org');
  });

  it('PandocNotFoundError should include searched path when provided', () => {
    const error = new PandocNotFoundError('/custom/path');
    expect(error.message).toContain('/custom/path');
  });

  it('PandocVersionError should include version info', () => {
    const error = new PandocVersionError('3.0', '2.19');
    expect(error.name).toBe('PandocVersionError');
    expect(error.requiredVersion).toBe('3.0');
    expect(error.foundVersion).toBe('2.19');
    expect(error.message).toContain('3.0');
    expect(error.message).toContain('2.19');
  });
});
