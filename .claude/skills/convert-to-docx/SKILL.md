---
name: convert-to-docx
description: Convert Markdown files to Microsoft Word (DOCX) format. Use when the user wants to create Word documents from Markdown.
license: MIT
compatibility: Requires md-convert CLI and Pandoc 3.0+.
metadata:
  author: md-converter
  version: "1.0"
---

Convert a Markdown file to Microsoft Word (DOCX) format.

**Input**: The argument after `/convert-to-docx` should be a path to a Markdown file, or empty to prompt for a file.

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
   npx md-convert <input.md> --format docx
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
format: docx
title: "Document Title"
---
```

### Optional fields for DOCX:

| Field | Description | Default |
|-------|-------------|---------|
| `author` | Document author | None |
| `date` | Document date (YYYY-MM-DD) | Today |
| `classification` | Classification header | None |
| `version` | Document version | None |
| `status` | draft\|review\|approved\|final | None |
| `section_breaks` | auto\|all\|none | auto |

### Section Break Modes

- **auto** (default): Section break only before `## H2` headings
- **all**: Every `---` horizontal rule becomes a section break
- **none**: Visual dividers only, no section breaks

---

## Common Issues

### "Pandoc not found"
Pandoc 3.0+ must be installed. On Windows:
```bash
winget install JohnMacFarlane.Pandoc
```

### "Missing required field: title"
Add a `title` field to the YAML front matter.

### "Invalid format"
The `format` field must be `docx`, `xlsx`, `pptx`, or `all`.

---

## Example

```markdown
---
format: docx
title: "Project Report"
author: "Jane Smith"
date: "2025-01-28"
section_breaks: auto
---

# Introduction

This is my report...

## Section One

Content here...
```

Converts to a Word document with proper headings, styles, and section breaks.
