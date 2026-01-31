---
name: batch-convert
description: Convert multiple Markdown files to Office formats at once. Use for bulk document conversion with glob patterns.
license: MIT
compatibility: Requires md-convert CLI and Pandoc 3.0+.
metadata:
  author: md-converter
  version: "1.0"
---

Convert multiple Markdown files to Office formats (DOCX, XLSX, PPTX) and PDF at once.

**Input**: The argument after `/batch-convert` should be a glob pattern (e.g., `docs/*.md`) or empty to convert all eligible files.

---

## Steps

1. **Determine scope**
   - If user provided a glob pattern, use that
   - If not, use `**/*.md` to find all Markdown files
   - Explain what files will be processed

2. **Check prerequisites**
   ```bash
   npm run build 2>/dev/null || true
   ```

3. **Preview what will be converted**
   ```bash
   # List matching files
   npx md-convert "pattern/*.md" --dry-run
   ```

   Or manually check:
   - Which files match the pattern
   - Which have valid front matter
   - Which will be excluded

4. **Run batch conversion**
   ```bash
   npx md-convert "pattern/*.md" --format all
   ```

   Or specific format:
   ```bash
   npx md-convert "pattern/*.md" --format docx
   ```

5. **Report results**
   - Files successfully converted
   - Files skipped (and why)
   - Any errors encountered
   - Output file locations

---

## Exclusion Rules

These files are automatically skipped:

| Pattern | Reason |
|---------|--------|
| `README.md` | Documentation file |
| `*/notes/*` | Notes directory |
| `*/reference/*` | Reference materials |
| `*/references/*` | Reference materials |
| `convert: false` | Front matter flag |
| `document_type: email` | Email documents |
| `document_type: reference` | Reference docs |
| `document_type: note` | Personal notes |
| `document_type: system` | System files |

---

## Format Options

### Convert to all formats
```bash
npx md-convert "docs/*.md" --format all
```
Creates .docx, .xlsx (if tables), .pptx, and .pdf for each file.

### Convert to specific format
```bash
npx md-convert "docs/*.md" --format docx
npx md-convert "docs/*.md" --format xlsx
npx md-convert "docs/*.md" --format pptx
npx md-convert "docs/*.md" --format pdf
```

### Use format from front matter
Each file's `format` field determines output:
```yaml
---
format: docx  # This file becomes .docx
---
```

---

## Glob Pattern Examples

| Pattern | Matches |
|---------|---------|
| `*.md` | All .md in current dir |
| `**/*.md` | All .md recursively |
| `docs/*.md` | All .md in docs/ |
| `docs/**/*.md` | All .md in docs/ recursively |
| `reports/2025-*.md` | 2025 reports |

---

## Validation Modes

### Strict mode (fail on warnings)
```bash
npx md-convert "docs/*.md" --format all --strict
```

### Skip validation
```bash
npx md-convert "docs/*.md" --format all --no-validate
```

---

## Example Output

```
Batch converting docs/*.md to all formats...

Processing 5 files:

  report-q1.md
    -> report-q1.docx (success)
    -> report-q1.xlsx (success, 2 tables)

  report-q2.md
    -> report-q2.docx (success)
    -> report-q2.xlsx (success, 1 table)

  presentation.md
    -> presentation.pptx (success, 8 slides)

  README.md
    -> skipped (README file)

  notes/draft.md
    -> skipped (notes directory)

Summary:
  Converted: 3 files
  Skipped: 2 files
  Errors: 0
```

---

## Common Issues

### "No files match pattern"
- Check your glob pattern syntax
- Ensure you're in the right directory
- Try a broader pattern first

### "All files skipped"
- Check exclusion rules above
- Verify front matter has `convert: true` or no `convert` field
- Check `document_type` isn't an excluded type
