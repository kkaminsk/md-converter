---
name: convert-to-pptx
description: Convert Markdown to Microsoft PowerPoint (PPTX) presentations. Use when the user wants to create slide decks from Markdown.
license: MIT
compatibility: Requires md-convert CLI and Pandoc 3.0+.
metadata:
  author: md-converter
  version: "1.0"
---

Convert a Markdown file to Microsoft PowerPoint (PPTX) presentation.

**Input**: The argument after `/convert-to-pptx` should be a path to a Markdown file, or empty to prompt for a file.

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

3. **Validate the document**
   ```bash
   npx md-convert validate <input.md>
   ```

4. **Run the conversion**
   ```bash
   npx md-convert <input.md> --format pptx
   ```

5. **Report the result**
   - Show the output file path
   - Number of slides created
   - Any warnings from conversion

---

## Slide Structure

Headings control slide boundaries based on the `slide_breaks` setting:

### slide_breaks: h2 (default)

```markdown
# Presentation Title    <- Title slide

## First Topic          <- New slide
Content...

## Second Topic         <- New slide
Content...

### Subsection          <- Same slide (H3 doesn't break)
More content...
```

### slide_breaks: h1

```markdown
# First Major Section   <- New slide
Content...

# Second Major Section  <- New slide
Content...
```

### slide_breaks: hr

```markdown
Content on slide 1...

---                     <- New slide

Content on slide 2...

---                     <- New slide

Content on slide 3...
```

---

## YAML Front Matter

```yaml
---
format: pptx
title: "Quarterly Review"
author: "Team Lead"
date: "2025-01-28"
slide_breaks: h2        # h1, h2, or hr
classification: "INTERNAL"
---
```

### Optional fields for PPTX:

| Field | Description | Default |
|-------|-------------|---------|
| `author` | Presentation author | None |
| `date` | Presentation date | Today |
| `classification` | Footer classification | None |
| `slide_breaks` | h1\|h2\|hr | h2 |

---

## Slide Content Support

### Text and Lists
```markdown
## Slide Title

- Bullet point one
- Bullet point two
  - Nested bullet

1. Numbered item
2. Another item
```

### Images
```markdown
## Slide with Image

![Description](path/to/image.png)
```

### Code Blocks
```markdown
## Code Example

```python
def hello():
    print("Hello, World!")
```
```

### Speaker Notes
```markdown
## Slide Title

Content visible on slide.

::: notes
These are speaker notes.
Not shown on the slide itself.
:::
```

---

## Common Issues

### "Pandoc not found"
Pandoc 3.0+ must be installed. On Windows:
```bash
winget install JohnMacFarlane.Pandoc
```

### "Too many slides"
If slides are fragmenting unexpectedly:
- Check your heading levels match `slide_breaks` setting
- Use `slide_breaks: hr` for explicit control

### "Images not appearing"
- Use relative paths from the Markdown file location
- Ensure images exist at the specified path

---

## Example

```markdown
---
format: pptx
title: "Project Update"
author: "Development Team"
slide_breaks: h2
---

# Project Update
January 2025

## Progress This Month

- Completed feature X
- Fixed 15 bugs
- Improved performance by 20%

## Next Steps

1. Launch beta version
2. Gather user feedback
3. Iterate on design

## Questions?

Contact: team@example.com
```

Creates a 4-slide presentation with title slide and content slides.
