---
name: "MD Convert: Validate"
description: "Validate Excel formula syntax in Markdown tables"
category: Document Conversion
tags: [validate, formulas, xlsx, excel]
---

Validate Excel formula syntax in Markdown tables before conversion.

**Input**: The argument after `/md-convert:validate` is the path to the Markdown file to validate.

## Quick Steps

1. Run: `npx md-convert validate <file.md>`
2. Report all formulas found and any errors
3. If valid, suggest: `/md-convert:xlsx <file.md>`

## Common Formula Errors

| Error | Bad | Good |
|-------|-----|------|
| Missing braces | `=SUM(A:A)` | `{=SUM(A:A)}` |
| Missing equals | `{SUM(A:A)}` | `{=SUM(A:A)}` |
| Unclosed brace | `{=SUM(A:A` | `{=SUM(A:A)}` |
| Unclosed parens | `{=SUM(A:A}` | `{=SUM(A:A)}` |
