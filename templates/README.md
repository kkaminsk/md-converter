# Templates

This directory contains reference documents and defaults files for Pandoc conversion.

## Setup

The reference documents (`reference.docx` and `reference.pptx`) need to be generated using Pandoc.

### Generate Reference Documents

Run these commands to create the reference documents:

```bash
# Generate reference.docx
echo "# Sample" | pandoc -o templates/reference.docx

# Generate reference.pptx
echo "# Sample" | pandoc -o templates/reference.pptx
```

### Customize Styles

After generating the base files:

1. **reference.docx**: Open in Word, modify styles (Home → Styles), save
2. **reference.pptx**: Open in PowerPoint, edit Slide Master, save

### Required Styles (DOCX)

| Style | Purpose |
|-------|---------|
| Title | Document title |
| Heading 1-6 | Heading hierarchy |
| Normal | Body paragraphs |
| First Paragraph | After headings (no indent) |
| Source Code | Code blocks |
| Block Text | Blockquotes |
| Hyperlink | Links |

### Required Layouts (PPTX)

| Layout | Purpose |
|--------|---------|
| Title Slide | First slide (H1) |
| Section Header | Section breaks (H1) |
| Title and Content | Content slides (H2) |

## Defaults Files

- `defaults/docx.yaml` - Pandoc configuration for Word output
- `defaults/pptx.yaml` - Pandoc configuration for PowerPoint output

### Usage

```bash
pandoc input.md --defaults=templates/defaults/docx.yaml -o output.docx
pandoc input.md --defaults=templates/defaults/pptx.yaml -o output.pptx
```

## Environment Variables

- `MD_CONVERTER_TEMPLATES` - Override templates directory path
- `MD_CONVERTER_FILTERS` - Override filters directory path
