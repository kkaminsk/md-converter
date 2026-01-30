---
name: "MD Convert: Preview"
description: "Preview table extraction before Excel conversion"
category: Document Conversion
tags: [preview, tables, xlsx, excel]
---

Preview how tables will be extracted from a Markdown file before converting to Excel.

**Input**: The argument after `/md-convert:preview` is the path to the Markdown file to preview.

## Quick Steps

1. Run: `npx md-convert preview <file.md>`
2. Report:
   - Number of tables found
   - Column headers for each
   - Formula cells identified
   - Any warnings

## What to Look For

- Tables with consistent column counts
- Properly formatted formulas: `{=FORMULA}`
- Header rows present
- No malformed cells

If preview looks good, suggest: `/md-convert:xlsx <file.md>`
