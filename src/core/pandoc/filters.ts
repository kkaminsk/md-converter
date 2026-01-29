/**
 * Filter and template path resolution utilities
 * Supports custom directories via environment variables
 */

import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';

// Get package root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = resolve(__dirname, '..', '..', '..');

/**
 * Default paths relative to package root
 */
const DEFAULT_FILTERS_DIR = join(PACKAGE_ROOT, 'src', 'pandoc', 'filters');
const DEFAULT_TEMPLATES_DIR = join(PACKAGE_ROOT, 'templates');

/**
 * Get the directory containing Lua filters
 * Checks MD_CONVERTER_FILTERS env var first, then uses default
 */
export function getFiltersDir(): string {
  const envPath = process.env.MD_CONVERTER_FILTERS;
  if (envPath) {
    return resolve(envPath);
  }
  return DEFAULT_FILTERS_DIR;
}

/**
 * Get the directory containing templates
 * Checks MD_CONVERTER_TEMPLATES env var first, then uses default
 */
export function getTemplatesDir(): string {
  const envPath = process.env.MD_CONVERTER_TEMPLATES;
  if (envPath) {
    return resolve(envPath);
  }
  return DEFAULT_TEMPLATES_DIR;
}

/**
 * Get the full path to a Lua filter
 * @param filterName - Filter filename (e.g., 'section-breaks.lua')
 * @returns Full path to the filter
 */
export function getFilterPath(filterName: string): string {
  return join(getFiltersDir(), filterName);
}

/**
 * Get the full path to a template file
 * @param templateName - Template filename (e.g., 'reference.docx')
 * @returns Full path to the template
 */
export function getTemplatePath(templateName: string): string {
  return join(getTemplatesDir(), templateName);
}

/**
 * Get the full path to a defaults file
 * @param defaultsName - Defaults filename (e.g., 'docx.yaml')
 * @returns Full path to the defaults file
 */
export function getDefaultsPath(defaultsName: string): string {
  return join(getTemplatesDir(), 'defaults', defaultsName);
}

/**
 * Check if a filter exists
 * @param filterName - Filter filename
 * @returns True if the filter file exists
 */
export function filterExists(filterName: string): boolean {
  return existsSync(getFilterPath(filterName));
}

/**
 * Check if a template exists
 * @param templateName - Template filename
 * @returns True if the template file exists
 */
export function templateExists(templateName: string): boolean {
  return existsSync(getTemplatePath(templateName));
}

/**
 * Available filter names
 */
export const FILTERS = {
  SECTION_BREAKS: 'section-breaks.lua',
  SLIDE_BREAKS: 'slide-breaks.lua',
  METADATA_INJECT: 'metadata-inject.lua',
} as const;

/**
 * Available template names
 */
export const TEMPLATES = {
  REFERENCE_DOCX: 'reference.docx',
  REFERENCE_PPTX: 'reference.pptx',
} as const;

/**
 * Available defaults file names
 */
export const DEFAULTS = {
  DOCX: 'docx.yaml',
  PPTX: 'pptx.yaml',
} as const;
