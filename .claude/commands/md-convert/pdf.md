---
name: "MD Convert: PDF"
description: "Convert Markdown to PDF format"
category: Document Conversion
tags: [convert, pdf, markdown]
---

Convert a Markdown file to PDF format.

**Input**: The argument after `/md-convert:pdf` is the path to the Markdown file to convert.

## Quick Steps

1. Validate the Markdown file has proper front matter with `format: pdf` and `title`
2. Run: `npx md-convert <file.md> --format pdf`
3. Report the output file location

## Requirements

- Pandoc 3.0+ must be installed
- A PDF engine must be available (wkhtmltopdf recommended, or pdflatex/xelatex/lualatex)
- File must have YAML front matter with at least `title` field

## Installing PDF Engine

**Windows**: `winget install wkhtmltopdf.wkhtmltox`
**macOS**: `brew install wkhtmltopdf`
**Linux**: `sudo apt install wkhtmltopdf`

Or set `WKHTMLTOPDF_PATH` environment variable for custom location.

## Example Front Matter

```yaml
---
format: pdf
title: "My Document"
author: "Author Name"
classification: "INTERNAL"
---
```
