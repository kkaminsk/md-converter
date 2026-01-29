/**
 * Pandoc Post-Processor
 * Finalizes Pandoc output by injecting formulas, adding headers/footers,
 * and patching document properties
 */

import { existsSync } from 'fs';
import { PostProcessorError } from './errors.js';
import { processXlsx } from './xlsx-post.js';
import { processDocx } from './docx-post.js';
import { processPptx } from './pptx-post.js';
import type { PostProcessorOptions, PostProcessorResult } from './types.js';

/**
 * Post-processor for Pandoc output files
 */
export class PostProcessor {
  /**
   * Process a Pandoc output file
   * Dispatches to format-specific handler based on options.format
   */
  async process(options: PostProcessorOptions): Promise<PostProcessorResult> {
    const { format, outputPath, extractedData } = options;

    // Validate file exists
    if (!existsSync(outputPath)) {
      throw new PostProcessorError(
        `Output file not found: ${outputPath}`,
        format,
        outputPath
      );
    }

    // Dispatch to format-specific handler
    switch (format) {
      case 'xlsx':
        return processXlsx({
          outputPath,
          formulas: extractedData.formulas,
          metadata: extractedData.metadata,
        });

      case 'docx':
        return processDocx({
          outputPath,
          metadata: extractedData.metadata,
        });

      case 'pptx':
        return processPptx({
          outputPath,
          metadata: extractedData.metadata,
        });

      default:
        throw new PostProcessorError(
          `Unsupported format: ${format}`,
          format,
          outputPath
        );
    }
  }
}
