---
name: convert-to-xlsx
description: Convert Markdown tables to Microsoft Excel (XLSX) format with formula support. Use when the user wants to create spreadsheets from Markdown tables.
license: MIT
compatibility: Requires md-convert CLI.
metadata:
  author: md-converter
  version: "1.0"
---

Convert Markdown tables to Microsoft Excel (XLSX) format with full formula support.

**Input**: The argument after `/convert-to-xlsx` should be a path to a Markdown file containing tables, or empty to prompt for a file.

---

## Steps

1. **Identify the input file**
   - If the user provided a file path, use that
   - If not, ask the user which Markdown file to convert
   - Verify the file exists and contains tables

2. **Check prerequisites**
   ```bash
   npm run build 2>/dev/null || true
   ```

3. **Preview tables first** (recommended)
   ```bash
   npx md-convert preview <input.md>
   ```

   This shows:
   - Number of tables detected
   - Column headers for each table
   - Formula cells identified
   - Potential issues

4. **Validate formulas** (if tables contain formulas)
   ```bash
   npx md-convert validate <input.md>
   ```

5. **Run the conversion**
   ```bash
   npx md-convert <input.md> --format xlsx
   ```

6. **Report the result**
   - Show the output file path
   - Number of worksheets created (one per table)
   - Formula count injected
   - Any warnings

---

## Excel Formula Syntax

Use `{=FORMULA}` syntax in Markdown tables for Excel formulas:

```markdown
| Item | Amount | Tax | Total |
|------|--------|-----|-------|
| Widget | 100 | {=B2*0.1} | {=B2+C2} |
| Gadget | 200 | {=B3*0.1} | {=B3+C3} |
| **Total** | {=SUM(B2:B3)} | {=SUM(C2:C3)} | {=SUM(D2:D3)} |
```

### Supported Formula Types

- Cell references: `{=A1}`, `{=B2+C2}`
- Ranges: `{=SUM(A1:A10)}`, `{=AVERAGE(B1:B5)}`
- Functions: `{=IF(A1>0,"Yes","No")}`, `{=VLOOKUP(...)}`
- Math: `{=A1*0.1}`, `{=(A1+B1)/2}`

### Cell Reference Rules

- Row 1 is the header row (not included in data)
- Data starts at row 2
- Columns: A, B, C, D... (left to right)

---

## YAML Front Matter

```yaml
---
format: xlsx
title: "Sales Report"
date_format: DD/MM/YYYY   # Optional: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
---
```

---

## Common Issues

### "No tables found"
The Markdown file must contain at least one pipe-delimited table.

### "Invalid formula syntax"
Formula must use `{=...}` syntax. Common mistakes:
- `=SUM(A1:A5)` - Missing braces
- `{SUM(A1:A5)}` - Missing equals sign
- `{=SUM(A1:A5}` - Unbalanced braces

### "Cell reference out of range"
The formula references a cell that doesn't exist in the table.

---

## Example

Input Markdown:
```markdown
---
format: xlsx
title: "Q1 Budget"
---

# Q1 Budget Report

| Category | Jan | Feb | Mar | Total |
|----------|-----|-----|-----|-------|
| Salary | 5000 | 5000 | 5000 | {=SUM(B2:D2)} |
| Rent | 1500 | 1500 | 1500 | {=SUM(B3:D3)} |
| Utilities | 300 | 350 | 400 | {=SUM(B4:D4)} |
| **Total** | {=SUM(B2:B4)} | {=SUM(C2:C4)} | {=SUM(D2:D4)} | {=SUM(E2:E4)} |
```

Creates an Excel file with working formulas that calculate automatically.
