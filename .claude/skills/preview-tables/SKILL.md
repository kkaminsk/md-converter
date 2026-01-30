---
name: preview-tables
description: Preview how tables will be extracted from a Markdown file before converting to Excel. Use to verify table structure and formulas.
license: MIT
compatibility: Requires md-convert CLI.
metadata:
  author: md-converter
  version: "1.0"
---

Preview table extraction from a Markdown file before converting to Excel.

**Input**: The argument after `/preview-tables` should be a path to a Markdown file containing tables.

---

## Steps

1. **Identify the input file**
   - If the user provided a file path, use that
   - If not, ask the user which Markdown file to preview
   - Verify the file exists

2. **Check prerequisites**
   ```bash
   npm run build 2>/dev/null || true
   ```

3. **Run the preview**
   ```bash
   npx md-convert preview <input.md>
   ```

4. **Analyze the output**

   The preview shows:
   - **Table count**: Number of tables found
   - **Headers**: Column names for each table
   - **Rows**: Data rows with cell contents
   - **Formulas**: Cells containing `{=...}` formulas
   - **Warnings**: Potential issues detected

5. **Report findings to user**
   - Summarize what was found
   - Highlight any formulas detected
   - Note any warnings or issues
   - Suggest `/convert-to-xlsx` if ready to convert

---

## What Preview Shows

```
Table 1: Budget Summary
  Headers: Category, Jan, Feb, Mar, Total
  Rows: 3
  Formulas: 4 (in column E)

Table 2: Expense Details
  Headers: Date, Description, Amount
  Rows: 12
  Formulas: 1 (total row)

Summary:
  - 2 tables found
  - 5 formulas detected
  - Ready for conversion
```

---

## Common Issues Found by Preview

### Missing Header Row
Tables must have a header row with column names.

### Inconsistent Column Count
All rows should have the same number of columns.

### Malformed Formulas
```
Warning: Cell D5 has unclosed formula brace
  Found: {=SUM(B2:B4
  Expected: {=SUM(B2:B4)}
```

### Empty Tables
Tables with no data rows (only headers) are flagged.

---

## Next Steps After Preview

If preview looks good:
```
/convert-to-xlsx <file.md>
```

If formulas need validation:
```
/validate-formulas <file.md>
```
