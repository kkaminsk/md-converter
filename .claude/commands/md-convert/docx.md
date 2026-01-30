---
name: "MD Convert: DOCX"
description: "Convert Markdown to Microsoft Word format"
category: Document Conversion
tags: [convert, docx, word, markdown]
---

Convert a Markdown file to Microsoft Word (DOCX) format.

**Input**: The argument after `/md-convert:docx` is the path to the Markdown file to convert.

## Quick Steps

1. Validate the Markdown file has proper front matter with `format: docx` and `title`
2. Run: `npx md-convert <file.md> --format docx`
3. Report the output file location

## Requirements

- Pandoc 3.0+ must be installed
- File must have YAML front matter with at least `title` field

## Example Front Matter

```yaml
---
format: docx
title: "My Document"
author: "Author Name"
section_breaks: auto
---
```
