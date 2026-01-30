---
name: "MD Convert: Batch"
description: "Convert multiple Markdown files at once"
category: Document Conversion
tags: [batch, convert, glob, bulk]
---

Convert multiple Markdown files to Office formats at once.

**Input**: The argument after `/md-convert:batch` is a glob pattern (e.g., `docs/*.md`).

## Quick Steps

1. Identify matching files with the glob pattern
2. Run: `npx md-convert "pattern/*.md" --format all`
3. Report success/skip/error counts

## Auto-Excluded Files

- `README.md` files
- Files in `notes/`, `reference/`, `references/` directories
- Files with `convert: false` in front matter
- Files with `document_type: email|reference|note|system`

## Format Options

```bash
# All formats based on front matter
npx md-convert "docs/*.md" --format all

# Specific format
npx md-convert "docs/*.md" --format docx
```

## Glob Examples

- `*.md` - Current directory
- `**/*.md` - All subdirectories
- `docs/**/*.md` - All in docs/
