/**
 * Pandoc Executor
 * Core module for spawning and managing Pandoc processes
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import type {
  PandocOptions,
  PandocResult,
  PandocInstallation,
  PandocAST,
} from './types.js';
import {
  PandocNotFoundError,
  PandocVersionError,
  PandocConversionError,
  PandocTimeoutError,
} from './errors.js';

/** Minimum required Pandoc version */
const MIN_PANDOC_VERSION = '3.0';

/** Default timeout for Pandoc operations (30 seconds) */
const DEFAULT_TIMEOUT = parseInt(process.env.PANDOC_TIMEOUT || '30000', 10);

/**
 * PandocExecutor class for spawning and managing Pandoc processes
 */
export class PandocExecutor {
  private pandocPath: string | null = null;
  private cachedInstallation: PandocInstallation | null = null;

  /**
   * Create a new PandocExecutor
   * @param customPandocPath - Optional custom path to Pandoc binary
   */
  constructor(customPandocPath?: string) {
    this.pandocPath = customPandocPath || process.env.PANDOC_PATH || null;
  }

  /**
   * Check if Pandoc is installed and meets version requirements
   */
  async checkInstallation(): Promise<PandocInstallation> {
    // Return cached result if available
    if (this.cachedInstallation) {
      return this.cachedInstallation;
    }

    const pandocCmd = this.pandocPath || 'pandoc';

    try {
      const result = await this.runCommand(pandocCmd, ['--version'], 5000);

      if (result.exitCode !== 0) {
        this.cachedInstallation = {
          installed: false,
          error: `Pandoc exited with code ${result.exitCode}`,
        };
        return this.cachedInstallation;
      }

      // Parse version from output (first line: "pandoc 3.1.2")
      const versionMatch = result.stdout.match(/pandoc\s+(\d+\.\d+(?:\.\d+)?)/i);
      if (!versionMatch) {
        this.cachedInstallation = {
          installed: false,
          error: 'Could not parse Pandoc version from output',
        };
        return this.cachedInstallation;
      }

      const version = versionMatch[1];

      // Check minimum version
      if (!this.isVersionSufficient(version, MIN_PANDOC_VERSION)) {
        this.cachedInstallation = {
          installed: true,
          version,
          path: pandocCmd,
          error: `Pandoc ${MIN_PANDOC_VERSION}+ required, found ${version}`,
        };
        return this.cachedInstallation;
      }

      // Find actual path if using system pandoc
      let actualPath = pandocCmd;
      if (!this.pandocPath) {
        actualPath = await this.findPandocPath() || pandocCmd;
      }

      this.cachedInstallation = {
        installed: true,
        version,
        path: actualPath,
      };
      return this.cachedInstallation;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.cachedInstallation = {
        installed: false,
        error: errorMessage.includes('ENOENT')
          ? 'Pandoc not found in PATH'
          : errorMessage,
      };
      return this.cachedInstallation;
    }
  }

  /**
   * Convert content using Pandoc
   * @param input - Markdown content string or input file path
   * @param options - Conversion options
   * @param outputPath - Optional output file path (uses temp file if not provided)
   */
  async convert(
    input: string | Buffer,
    options: PandocOptions,
    outputPath?: string
  ): Promise<PandocResult> {
    const startTime = Date.now();

    // Verify installation
    const installation = await this.checkInstallation();
    if (!installation.installed) {
      throw new PandocNotFoundError(this.pandocPath || undefined);
    }
    if (installation.error?.includes('required')) {
      throw new PandocVersionError(MIN_PANDOC_VERSION, installation.version || 'unknown');
    }

    // Determine output path
    const finalOutputPath = outputPath || await this.createTempFile(options.outputFormat);

    // Build command arguments
    const args = this.buildArguments(options, finalOutputPath);

    try {
      // Convert input to string if Buffer
      const inputContent = Buffer.isBuffer(input) ? input.toString('utf8') : input;

      // Run Pandoc with stdin input
      const result = await this.runCommandWithStdin(
        installation.path!,
        args,
        inputContent,
        DEFAULT_TIMEOUT
      );

      const duration = Date.now() - startTime;

      if (result.exitCode !== 0) {
        // Clean up temp file on error
        if (!outputPath) {
          await this.cleanupTempFile(finalOutputPath);
        }

        return {
          success: false,
          stderr: result.stderr,
          exitCode: result.exitCode,
          duration,
        };
      }

      // Read output file into buffer if no outputPath was provided
      let outputBuffer: Buffer | undefined;
      if (!outputPath) {
        outputBuffer = await fs.readFile(finalOutputPath);
        await this.cleanupTempFile(finalOutputPath);
      }

      return {
        success: true,
        outputPath: outputPath ? finalOutputPath : undefined,
        outputBuffer,
        stderr: result.stderr,
        exitCode: 0,
        duration,
      };
    } catch (error) {
      // Clean up temp file on error
      if (!outputPath) {
        await this.cleanupTempFile(finalOutputPath);
      }

      if (error instanceof PandocTimeoutError) {
        throw error;
      }

      throw new PandocConversionError(
        error instanceof Error ? error.message : String(error),
        '',
        -1,
        options.outputFormat
      );
    }
  }

  /**
   * Convert markdown to Pandoc JSON AST
   * @param input - Markdown content
   */
  async toAST(input: string): Promise<PandocAST> {
    const result = await this.convert(input, {
      inputFormat: 'markdown+yaml_metadata_block',
      outputFormat: 'json',
    });

    if (!result.success) {
      throw new PandocConversionError(
        'Failed to convert to AST',
        result.stderr,
        result.exitCode,
        'json'
      );
    }

    const jsonContent = result.outputBuffer?.toString('utf8');
    if (!jsonContent) {
      throw new PandocConversionError('No AST output received', '', -1, 'json');
    }

    return JSON.parse(jsonContent) as PandocAST;
  }

  /**
   * Convert Pandoc JSON AST to output format
   * @param ast - Pandoc AST object
   * @param options - Conversion options (inputFormat is ignored, forced to json)
   */
  async fromAST(
    ast: PandocAST,
    options: Omit<PandocOptions, 'inputFormat'> & { inputFormat?: string },
    outputPath?: string
  ): Promise<PandocResult> {
    const jsonInput = JSON.stringify(ast);

    return this.convert(jsonInput, {
      ...options,
      inputFormat: 'json' as unknown as PandocOptions['inputFormat'],
    } as PandocOptions, outputPath);
  }

  /**
   * Build Pandoc command arguments from options
   */
  private buildArguments(options: PandocOptions, outputPath: string): string[] {
    const args: string[] = [
      '--from', options.inputFormat,
      '--to', options.outputFormat,
      '--output', outputPath,
    ];

    if (options.standalone) {
      args.push('--standalone');
    }

    if (options.referenceDoc) {
      args.push('--reference-doc', options.referenceDoc);
    }

    if (options.tableOfContents) {
      args.push('--toc');
    }

    if (options.numberSections) {
      args.push('--number-sections');
    }

    if (options.slideLevel) {
      args.push('--slide-level', options.slideLevel.toString());
    }

    if (options.defaultsFile) {
      args.push('--defaults', options.defaultsFile);
    }

    if (options.dataDir) {
      args.push('--data-dir', options.dataDir);
    }

    // Add filters
    for (const filter of options.filters ?? []) {
      args.push('--lua-filter', filter);
    }

    // Add variables
    for (const [key, value] of Object.entries(options.variables ?? {})) {
      args.push('--variable', `${key}=${value}`);
    }

    // Add metadata
    for (const [key, value] of Object.entries(options.metadata ?? {})) {
      const metaValue = typeof value === 'string' ? value : JSON.stringify(value);
      args.push('--metadata', `${key}=${metaValue}`);
    }

    // Add resource paths
    for (const resourcePath of options.resourcePath ?? []) {
      args.push('--resource-path', resourcePath);
    }

    return args;
  }

  /**
   * Run a command and capture output
   */
  private runCommand(
    command: string,
    args: string[],
    timeout: number
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        shell: process.platform === 'win32',
      });

      let stdout = '';
      let stderr = '';
      let killed = false;

      const timer = setTimeout(() => {
        killed = true;
        proc.kill('SIGTERM');
        reject(new PandocTimeoutError(timeout));
      }, timeout);

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (!killed) {
          resolve({
            stdout,
            stderr,
            exitCode: code ?? -1,
          });
        }
      });

      proc.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Run a command with stdin input
   */
  private runCommandWithStdin(
    command: string,
    args: string[],
    stdin: string,
    timeout: number
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        shell: process.platform === 'win32',
      });

      let stdout = '';
      let stderr = '';
      let killed = false;

      const timer = setTimeout(() => {
        killed = true;
        proc.kill('SIGTERM');
        reject(new PandocTimeoutError(timeout));
      }, timeout);

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (!killed) {
          resolve({
            stdout,
            stderr,
            exitCode: code ?? -1,
          });
        }
      });

      proc.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });

      // Write to stdin and close
      proc.stdin.write(stdin);
      proc.stdin.end();
    });
  }

  /**
   * Find Pandoc path using `where` (Windows) or `which` (Unix)
   */
  private async findPandocPath(): Promise<string | null> {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    try {
      const result = await this.runCommand(cmd, ['pandoc'], 5000);
      if (result.exitCode === 0 && result.stdout.trim()) {
        // Take first line (where can return multiple results)
        return result.stdout.trim().split('\n')[0].trim();
      }
    } catch {
      // Ignore errors
    }
    return null;
  }

  /**
   * Create a temporary file path
   */
  private async createTempFile(extension: string): Promise<string> {
    const tmpDir = os.tmpdir();
    const filename = `pandoc-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    return path.join(tmpDir, filename);
  }

  /**
   * Clean up a temporary file
   */
  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Compare version strings
   */
  private isVersionSufficient(current: string, required: string): boolean {
    const currentParts = current.split('.').map(Number);
    const requiredParts = required.split('.').map(Number);

    for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
      const curr = currentParts[i] || 0;
      const req = requiredParts[i] || 0;

      if (curr > req) return true;
      if (curr < req) return false;
    }

    return true; // Equal versions
  }
}
