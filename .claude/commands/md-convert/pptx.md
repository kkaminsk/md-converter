---
name: "MD Convert: PPTX"
description: "Convert Markdown to PowerPoint presentations"
category: Document Conversion
tags: [convert, pptx, powerpoint, slides, markdown]
---

Convert a Markdown file to Microsoft PowerPoint (PPTX) presentation.

**Input**: The argument after `/md-convert:pptx` is the path to the Markdown file to convert.

## Quick Steps

1. Validate the Markdown file has proper front matter
2. Run: `npx md-convert <file.md> --format pptx`
3. Report output location and slide count

## Slide Breaks

Control slide boundaries with `slide_breaks` in front matter:

- `h2` (default): New slide at each `## Heading`
- `h1`: New slide at each `# Heading`
- `hr`: New slide at each `---` horizontal rule

## Example Structure

```markdown
---
format: pptx
title: "My Presentation"
slide_breaks: h2
---

# Title Slide

## First Topic
Content here...

## Second Topic
More content...
```

Requires Pandoc 3.0+.
