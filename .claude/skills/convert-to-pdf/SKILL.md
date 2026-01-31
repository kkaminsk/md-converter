---
name: convert-to-pdf
description: Convert Markdown files to PDF format. Use when the user wants to create PDF documents from Markdown.
license: MIT
compatibility: Requires md-convert CLI, Pandoc 3.0+, and a PDF engine (wkhtmltopdf or LaTeX).
metadata:
  author: md-converter
  version: "1.0"
---

Convert a Markdown file to PDF format.

**Input**: The argument after `/convert-to-pdf` should be a path to a Markdown file, or empty to prompt for a file.

---

## Steps

1. **Identify the input file**
   - If the user provided a file path, use that
   - If not, ask the user which Markdown file to convert
   - Verify the file exists

2. **Check prerequisites**
   ```bash
   npm run build 2>/dev/null || true
   ```

3. **Validate the document first** (optional but recommended)
   ```bash
   npx md-convert validate <input.md>
   ```

   Check for:
   - Missing or invalid YAML front matter
   - Missing required fields (title, format)
   - Formula syntax errors (if tables present)

4. **Run the conversion**
   ```bash
   npx md-convert <input.md> --format pdf
   ```

5. **Report the result**
   - Show the output file path
   - Note any warnings from conversion
   - If errors occurred, explain what went wrong

---

## YAML Front Matter Requirements

The Markdown file should have YAML front matter with at least:

```yaml
---
format: pdf
title: "Document Title"
---
```

### Optional fields for PDF:

| Field | Description | Default |
|-------|-------------|---------|
| `author` | Document author | None |
| `date` | Document date (YYYY-MM-DD) | Today |
| `classification` | Classification header/footer | None |
| `version` | Document version | None |
| `status` | draft\|review\|approved\|final | None |

---

## PDF Engine Requirements

PDF conversion requires a PDF engine. The converter automatically discovers:

1. **wkhtmltopdf** (recommended) - Lightweight, no LaTeX needed
2. **pdflatex/xelatex/lualatex** - Higher quality, requires TeX distribution

### Installing wkhtmltopdf

**Windows:**
```bash
winget install wkhtmltopdf.wkhtmltox
```

**macOS:**
```bash
brew install wkhtmltopdf
```

**Linux:**
```bash
sudo apt install wkhtmltopdf
```

### Custom PDF Engine Path

Set the `WKHTMLTOPDF_PATH` environment variable to specify a custom location:
```bash
export WKHTMLTOPDF_PATH="/path/to/wkhtmltopdf"
```

---

## Common Issues

### "No PDF engine found"
Install wkhtmltopdf or a LaTeX distribution. See installation instructions above.

### "Pandoc not found"
Pandoc 3.0+ must be installed. On Windows:
```bash
winget install JohnMacFarlane.Pandoc
```

### "Missing required field: title"
Add a `title` field to the YAML front matter.

### "Invalid format"
The `format` field must be `docx`, `xlsx`, `pptx`, `pdf`, or `all`.

---

## Example

```markdown
---
format: pdf
title: "Project Report"
author: "Jane Smith"
date: "2025-01-28"
classification: "INTERNAL"
---

# Introduction

This is my report...

## Section One

Content here...
```

Converts to a PDF document with proper formatting. If `classification` is set, it appears in the header and footer of each page.

---

## Conversion Options

PDF conversion supports these options through the API:

| Option | Description | Default |
|--------|-------------|---------|
| `pageSize` | A4, letter, legal | A4 |
| `margins` | top, right, bottom, left | Default engine margins |
| `orientation` | portrait, landscape | portrait |
