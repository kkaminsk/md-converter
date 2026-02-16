/**
 * MCP Tool Argument Types
 * Typed interfaces for MCP handler arguments with validation
 */

import * as fs from 'fs/promises';

export interface ConvertToDocxArgs {
  file_path: string;
  output_path?: string;
  options?: {
    fontSize?: number;
    fontFamily?: string;
  };
}

export interface ConvertToXlsxArgs {
  file_path: string;
  output_path?: string;
  options?: {
    freezeHeaders?: boolean;
    autoWidth?: boolean;
  };
}

export interface ConvertToPptxArgs {
  file_path: string;
  output_path?: string;
  options?: {
    theme?: 'light' | 'dark';
    fontSize?: number;
  };
}

export interface ConvertToPdfArgs {
  file_path: string;
  output_path?: string;
  options?: {
    pageSize?: 'A4' | 'letter' | 'legal';
    orientation?: 'portrait' | 'landscape';
    margins?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
  };
}

export interface FilePathArgs {
  file_path: string;
}

/**
 * Validate that required file_path field exists and the file is accessible
 */
export async function validateFilePathArgs(args: unknown): Promise<{ file_path: string }> {
  if (!args || typeof args !== 'object') {
    throw new Error('Arguments must be an object');
  }

  const { file_path } = args as Record<string, unknown>;

  if (!file_path || typeof file_path !== 'string') {
    throw new Error('Required field missing: file_path');
  }

  // Verify file exists
  try {
    await fs.access(file_path);
  } catch {
    throw new Error(`File not found: ${file_path}`);
  }

  return { file_path };
}

/**
 * Validate convert tool arguments (file_path required, output_path and options optional)
 */
export async function validateConvertArgs(args: unknown): Promise<{
  file_path: string;
  output_path?: string;
  options: Record<string, unknown>;
}> {
  const { file_path } = await validateFilePathArgs(args);

  const typedArgs = args as Record<string, unknown>;
  const output_path = typeof typedArgs.output_path === 'string' ? typedArgs.output_path : undefined;
  const options = (typeof typedArgs.options === 'object' && typedArgs.options !== null)
    ? typedArgs.options as Record<string, unknown>
    : {};

  return { file_path, output_path, options };
}
