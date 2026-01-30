---
name: "MD Convert: XLSX"
description: "Convert Markdown tables to Excel with formula support"
category: Document Conversion
tags: [convert, xlsx, excel, markdown, formulas]
---

Convert Markdown tables to Microsoft Excel (XLSX) format with full formula support.

**Input**: The argument after `/md-convert:xlsx` is the path to the Markdown file containing tables.

## Quick Steps

1. Preview tables with: `npx md-convert preview <file.md>`
2. Validate formulas with: `npx md-convert validate <file.md>`
3. Convert: `npx md-convert <file.md> --format xlsx`
4. Report output location and formula count

## Formula Syntax

Use `{=FORMULA}` in table cells:

```markdown
| Item | Amount | Total |
|------|--------|-------|
| A | 100 | {=B2*1.1} |
| B | 200 | {=B3*1.1} |
| **Sum** | {=SUM(B2:B3)} | {=SUM(C2:C3)} |
```

Each table becomes a separate worksheet.
