---
name: validate-formulas
description: Validate Excel formula syntax in Markdown tables before conversion. Use to catch formula errors early.
license: MIT
compatibility: Requires md-convert CLI.
metadata:
  author: md-converter
  version: "1.0"
---

Validate Excel formula syntax in Markdown tables before converting to XLSX.

**Input**: The argument after `/validate-formulas` should be a path to a Markdown file containing tables with formulas.

---

## Steps

1. **Identify the input file**
   - If the user provided a file path, use that
   - If not, ask the user which Markdown file to validate
   - Verify the file exists

2. **Check prerequisites**
   ```bash
   npm run build 2>/dev/null || true
   ```

3. **Run validation**
   ```bash
   npx md-convert validate <input.md>
   ```

4. **Analyze and report results**

   **If valid:**
   - Report formula count
   - List formulas found
   - Suggest proceeding with `/convert-to-xlsx`

   **If errors found:**
   - List each error with location
   - Explain what's wrong
   - Suggest how to fix

---

## Formula Syntax Rules

### Correct Syntax

```markdown
| A | B | C |
|---|---|---|
| 10 | 20 | {=A2+B2} |
| 30 | 40 | {=A3+B3} |
| Total | | {=SUM(C2:C3)} |
```

### Common Errors

| Error | Example | Fix |
|-------|---------|-----|
| Missing braces | `=SUM(A1:A5)` | `{=SUM(A1:A5)}` |
| Missing equals | `{SUM(A1:A5)}` | `{=SUM(A1:A5)}` |
| Unclosed brace | `{=SUM(A1:A5` | `{=SUM(A1:A5)}` |
| Unclosed parens | `{=SUM(A1:A5}` | `{=SUM(A1:A5)}` |
| Invalid cell ref | `{=ZZ999}` | Use valid cell |

---

## Validation Output

### Success
```
Validating formulas in report.md...

Found 8 formulas across 2 tables:

Table 1 (Budget):
  D2: {=B2+C2}
  D3: {=B3+C3}
  D4: {=SUM(D2:D3)}

Table 2 (Summary):
  C2: {=A2*B2}
  C3: {=A3*B3}
  C4: {=A4*B4}
  C5: {=A5*B5}
  C6: {=SUM(C2:C5)}

All formulas valid. Ready for conversion.
```

### Errors Found
```
Validating formulas in report.md...

Errors found:

Table 1, Row 3, Column D:
  Error: Unclosed parenthesis
  Found: {=SUM(B2:B3}
  Expected: {=SUM(B2:B3)}

Table 2, Row 5, Column C:
  Error: Missing equals sign
  Found: {SUM(C2:C4)}
  Expected: {=SUM(C2:C4)}

Fix 2 errors before converting.
```

---

## Supported Excel Functions

The validator recognizes common Excel functions:

**Math**: SUM, AVERAGE, MIN, MAX, COUNT, ROUND, ABS
**Logic**: IF, AND, OR, NOT, IFERROR
**Lookup**: VLOOKUP, HLOOKUP, INDEX, MATCH
**Text**: CONCAT, LEFT, RIGHT, MID, LEN, UPPER, LOWER
**Date**: TODAY, NOW, DATE, YEAR, MONTH, DAY

Custom or less common functions are passed through to Excel.

---

## Next Steps

After successful validation:
```
/convert-to-xlsx <file.md>
```
