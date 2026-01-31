/**
 * PDF Converter
 * Convert Markdown to PDF using Pandoc with wkhtmltopdf or LaTeX engine
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { spawn } from 'child_process';
import { PandocExecutor } from '../pandoc/executor.js';
import { PreProcessor } from '../pandoc/pre-processor.js';
import { getFilterPath, FILTERS } from '../pandoc/filters.js';
import { PandocNotFoundError, PandocConversionError } from '../pandoc/errors.js';
import { ConversionError } from '../errors.js';
import type { PandocOptions } from '../pandoc/types.js';
import type { DocumentMetadata } from '../parsers/frontmatter-parser.js';

export interface PdfConversionOptions {
  pageSize?: 'A4' | 'letter' | 'legal';
  margins?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  orientation?: 'portrait' | 'landscape';
  fontSize?: number;
  fontFamily?: string;
}

export interface PdfConversionResult {
  success: boolean;
  outputPath: string;
  warnings: string[];
}

/** Common Windows installation paths for wkhtmltopdf */
const WINDOWS_WKHTMLTOPDF_PATHS = [
  path.join(process.env.PROGRAMFILES || '', 'wkhtmltopdf', 'bin', 'wkhtmltopdf.exe'),
  path.join(process.env['PROGRAMFILES(X86)'] || '', 'wkhtmltopdf', 'bin', 'wkhtmltopdf.exe'),
  'C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe',
];

/** LaTeX engines to try as fallback */
const LATEX_ENGINES = ['pdflatex', 'xelatex', 'lualatex'];

/**
 * Find available PDF engine
 */
async function findPdfEngine(): Promise<string | null> {
  // Check environment variable first
  const envPath = process.env.WKHTMLTOPDF_PATH;
  if (envPath) {
    try {
      await fs.access(envPath);
      return envPath;
    } catch {
      // Environment variable set but path invalid
    }
  }

  // Try wkhtmltopdf in PATH
  if (await isCommandAvailable('wkhtmltopdf')) {
    return 'wkhtmltopdf';
  }

  // Try Windows common paths
  if (process.platform === 'win32') {
    for (const wkPath of WINDOWS_WKHTMLTOPDF_PATHS) {
      if (!wkPath || wkPath.includes('undefined')) continue;
      try {
        await fs.access(wkPath);
        return wkPath;
      } catch {
        // Path doesn't exist
      }
    }
  }

  // Try LaTeX engines as fallback
  for (const engine of LATEX_ENGINES) {
    if (await isCommandAvailable(engine)) {
      return engine;
    }
  }

  return null;
}

/**
 * Check if a command is available in PATH
 */
async function isCommandAvailable(command: string): Promise<boolean> {
  const which = process.platform === 'win32' ? 'where' : 'which';

  return new Promise((resolve) => {
    const proc = spawn(which, [command], {
      shell: process.platform === 'win32',
    });

    proc.on('close', (code) => {
      resolve(code === 0);
    });

    proc.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Get installation instructions for PDF engines
 */
function getPdfEngineInstallInstructions(): string {
  if (process.platform === 'win32') {
    return `To enable PDF conversion, install one of:
  • wkhtmltopdf (recommended): winget install wkhtmltopdf.wkhtmltox
  • MiKTeX (for pdflatex): winget install MiKTeX.MiKTeX

Or set WKHTMLTOPDF_PATH environment variable to your wkhtmltopdf.exe location.`;
  } else if (process.platform === 'darwin') {
    return `To enable PDF conversion, install one of:
  • wkhtmltopdf (recommended): brew install wkhtmltopdf
  • MacTeX (for pdflatex): brew install --cask mactex

Or set WKHTMLTOPDF_PATH environment variable to your wkhtmltopdf location.`;
  } else {
    return `To enable PDF conversion, install one of:
  • wkhtmltopdf (recommended): sudo apt install wkhtmltopdf
  • TeX Live (for pdflatex): sudo apt install texlive-latex-base

Or set WKHTMLTOPDF_PATH environment variable to your wkhtmltopdf location.`;
  }
}

/**
 * Build Pandoc options for PDF conversion
 */
function buildPandocOptions(
  metadata: DocumentMetadata | null,
  options: PdfConversionOptions,
  pdfEngine: string
): PandocOptions {
  const filters: string[] = [];

  // Add metadata-inject filter
  const metadataInjectPath = getFilterPath(FILTERS.METADATA_INJECT);
  if (existsSync(metadataInjectPath)) {
    filters.push(metadataInjectPath);
  }

  const variables: Record<string, string> = {};

  // Page size
  const pageSize = options.pageSize?.toLowerCase() || 'a4';
  variables['papersize'] = pageSize;

  // Margins (default to reasonable values)
  const margins = options.margins || {};
  if (margins.top) variables['margin-top'] = margins.top;
  if (margins.right) variables['margin-right'] = margins.right;
  if (margins.bottom) variables['margin-bottom'] = margins.bottom;
  if (margins.left) variables['margin-left'] = margins.left;

  // Font settings for LaTeX engines
  if (LATEX_ENGINES.includes(pdfEngine) || pdfEngine.includes('latex')) {
    if (options.fontFamily) variables['mainfont'] = options.fontFamily;
    if (options.fontSize) variables['fontsize'] = `${options.fontSize}pt`;
  }

  // Classification as header/footer for wkhtmltopdf
  // Note: wkhtmltopdf handles this via separate --header-html/--footer-html args
  // which Pandoc doesn't directly support. For now, classification appears in document body.

  const pandocOptions: PandocOptions = {
    inputFormat: 'markdown+yaml_metadata_block+pipe_tables+fenced_code_blocks',
    outputFormat: 'pdf',
    standalone: true,
    filters,
    variables,
    pdfEngine,
    metadata: {},
  };

  // Pass simple metadata
  if (metadata) {
    if (metadata.title) pandocOptions.metadata!['title'] = metadata.title;
    if (metadata.author) pandocOptions.metadata!['author'] = metadata.author;
  }

  return pandocOptions;
}

/**
 * Convert Markdown file to PDF
 */
export async function convertToPdf(
  inputPath: string,
  outputPath?: string,
  options: PdfConversionOptions = {}
): Promise<PdfConversionResult> {
  try {
    // Read markdown file
    const markdown = await fs.readFile(inputPath, 'utf-8');

    // Determine output path
    const output = outputPath || inputPath.replace(/\.md$/, '.pdf');

    // Ensure output directory exists
    await fs.mkdir(path.dirname(output), { recursive: true });

    // Delegate to string-based conversion
    return convertMarkdownToPdf(markdown, output, options);
  } catch (error) {
    if (error instanceof ConversionError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new ConversionError(message, 'pdf', inputPath);
  }
}

/**
 * Convert markdown content directly to PDF
 */
export async function convertMarkdownToPdf(
  markdown: string,
  outputPath: string,
  options: PdfConversionOptions = {}
): Promise<PdfConversionResult> {
  const executor = new PandocExecutor();
  const preProcessor = new PreProcessor();

  try {
    // Find PDF engine
    const pdfEngine = await findPdfEngine();
    if (!pdfEngine) {
      throw new ConversionError(
        `No PDF engine found. ${getPdfEngineInstallInstructions()}`,
        'pdf',
        outputPath
      );
    }

    // 1. Pre-process (extract metadata, normalize content)
    const preResult = preProcessor.process(markdown);
    const allWarnings = [...preResult.warnings];

    // 2. Build Pandoc options
    const pandocOptions = buildPandocOptions(
      preResult.extractedData.metadata,
      options,
      pdfEngine
    );

    // 3. Ensure output directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // 4. Execute Pandoc conversion
    const pandocResult = await executor.convert(
      preResult.content,
      pandocOptions,
      outputPath
    );

    if (!pandocResult.success) {
      throw new PandocConversionError(
        pandocResult.stderr || 'PDF conversion failed',
        pandocResult.stderr || '',
        pandocResult.exitCode,
        'pdf'
      );
    }

    // Note: No post-processing needed for PDF (unlike DOCX/PPTX)

    return {
      success: true,
      outputPath,
      warnings: allWarnings,
    };
  } catch (error) {
    // Clean up partial output on error
    try {
      if (existsSync(outputPath)) {
        await fs.unlink(outputPath);
      }
    } catch {
      // Ignore cleanup errors
    }

    if (error instanceof PandocNotFoundError) {
      throw new ConversionError(
        'Pandoc is not installed. Please install Pandoc 3.0+ to use PDF conversion.',
        'pdf',
        outputPath
      );
    }

    if (error instanceof PandocConversionError) {
      // Check if it's a PDF engine error
      if (error.message.includes('not found') || error.message.includes('pdflatex')) {
        throw new ConversionError(
          `PDF engine error: ${error.message}. ${getPdfEngineInstallInstructions()}`,
          'pdf',
          outputPath
        );
      }
      throw new ConversionError(error.message, 'pdf', outputPath);
    }

    if (error instanceof ConversionError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new ConversionError(message, 'pdf', outputPath);
  }
}
