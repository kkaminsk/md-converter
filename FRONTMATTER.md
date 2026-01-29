# YAML Front Matter Specification

**MD Converter** supports YAML front matter for document metadata and conversion control.

---

## Structure

YAML front matter must appear at the **very beginning** of the markdown file, enclosed in `---` delimiters:

```markdown
---
format: docx
title: "My Document"
author: "John Smith"
---

# Document Content Starts Here
```

---

## Required Fields

### `format` (string)

**Purpose:** Specifies which output format(s) to generate.

**Valid Values:**
- `docx` - Word document only
- `pptx` - PowerPoint presentation only
- `xlsx` - Excel spreadsheet only
- `docx,pptx` - Both Word and PowerPoint
- `docx,xlsx` - Both Word and Excel
- `all` - Generate all three formats

**Example:**
```yaml
format: docx
```

### `title` (string)

**Purpose:** Document title. Maps to document properties in output files.

**Requirements:**
- Must be a non-empty string
- Used as filename if not specified in CLI

**Example:**
```yaml
title: "Executive Brief - AI Capability Enablement"
```

---

## Extended Fields (Optional but Recommended)

### `author` (string)

**Purpose:** Document author name. Maps to creator/author property.

**Example:**
```yaml
author: "Dale Rogers"
```

**Default:** "MD Converter" if not specified

### `date` (string)

**Purpose:** Document date or last modified date.

**Format:** `YYYY-MM-DD` (recommended)

**Example:**
```yaml
date: "2025-11-10"
```

**Warning:** Non-YYYY-MM-DD format will generate a warning

### `classification` (string)

**Purpose:** Document classification or security level.

**Example:**
```yaml
classification: "OFFICIAL"
```

**Common Values:** OFFICIAL, PROTECTED, SECRET, UNCLASSIFIED, PUBLIC

### `version` (string)

**Purpose:** Document version number.

**Example:**
```yaml
version: "1.0"
```

### `status` (string)

**Purpose:** Document status in workflow.

**Valid Values:**
- `draft` - Work in progress
- `review` - Under review
- `approved` - Approved for use
- `final` - Final version

**Example:**
```yaml
status: draft
```

### `description` (string)

**Purpose:** Brief description of document purpose and content.

**Requirements:**
- Recommended max 250 characters
- Will generate warning if longer

**Example:**
```yaml
description: "Comprehensive project plan for AI capability enablement initiative"
```

### `keywords` (array of strings)

**Purpose:** Keywords for document search and categorization.

**Example:**
```yaml
keywords: ["AI", "project plan", "DCCEEW", "capability", "enablement"]
```

### `subject` (string)

**Purpose:** Document subject or category.

**Example:**
```yaml
subject: "Project Planning"
```

---

## Document Control Fields

### `convert` (boolean)

**Purpose:** Explicitly enable or disable conversion for this document.

**Valid Values:**
- `true` (default) - Document will be converted
- `false` - Document will be skipped during conversion

**Example:**
```yaml
convert: false
```

**Use Cases:**
- README files that should remain markdown-only
- Reference emails that don't need Word format
- System documentation not for distribution
- Work-in-progress notes

### `document_type` (string)

**Purpose:** Categorize document type for automatic exclusion rules.

**Valid Values:**
- `document` (default) - Standard document, will be converted
- `email` - Email or communication, automatically excluded
- `reference` - Reference material, automatically excluded
- `note` - Notes or working documents, automatically excluded
- `system` - System documentation, automatically excluded

**Example:**
```yaml
document_type: reference
```

**Automatic Exclusion:**
Documents with `document_type` of `email`, `reference`, `note`, or `system` are automatically skipped during batch conversion.

---

## Exclusion Rules

The converter uses **combination exclusion** with both naming patterns and front matter:

### Path-Based Exclusion (Automatic)

Files matching these patterns are automatically excluded:

1. **README files:** `README.md` (case-insensitive)
2. **Notes directory:** Any file in `/notes/` directory
3. **References directory:** Any file in `/reference/` or `/references/` directory

**Examples:**
- ✗ `README.md` - Excluded
- ✗ `docs/notes/meeting-notes.md` - Excluded
- ✗ `documents/references/email.md` - Excluded
- ✓ `documents/deliverables/project_plan.md` - Included

### Front Matter Exclusion

**Method 1: Explicit Flag**
```yaml
---
convert: false
title: "Internal Notes"
---
```

**Method 2: Document Type**
```yaml
---
document_type: email
title: "Project Initiation Email"
---
```

### Exclusion Priority

1. **Path pattern** - Checked first (fastest)
2. **`convert: false`** - Explicit override
3. **`document_type`** - Automatic by category

---

## Format-Specific Fields

### XLSX: `date_format` (string)

**Purpose:** Controls how dates in table cells are parsed and displayed in Excel.

**Valid Values:**

- `DD/MM/YYYY` (default) - Australian/UK format
  - "25/12/2025" is parsed as December 25, 2025
  - Excel displays dates as dd/mm/yyyy

- `MM/DD/YYYY` - US format
  - "12/25/2025" is parsed as December 25, 2025
  - Excel displays dates as mm/dd/yyyy

- `YYYY-MM-DD` - ISO format
  - "2025-12-25" is parsed as December 25, 2025
  - Excel displays dates as yyyy-mm-dd

**Example:**
```yaml
date_format: MM/DD/YYYY
```

**Important:** The date format affects both parsing (how date strings in tables are interpreted) and display (how dates appear in Excel). For example, "01/02/2025" is interpreted as:
- **DD/MM/YYYY:** February 1, 2025
- **MM/DD/YYYY:** January 2, 2025

### DOCX: `section_breaks` (string)

**Purpose:** Controls how horizontal rules (`---`) are handled in Word documents.

**Valid Values:**

- `auto` (default) - Section break only if `---` is followed by `## Heading 2`
  - Major section boundaries get independent formatting
  - Minor dividers remain visual only
  
- `all` - Every `---` creates a Word section break
  - Each section can have independent headers/footers
  - Each section can have different page numbering
  - Each section can have different orientation/margins
  
- `none` - All `---` are visual dividers only
  - No section breaks created
  - Entire document is one section

**Example:**
```yaml
section_breaks: auto
```

**Use Cases:**
- `auto`: Most documents (intelligent sectioning)
- `all`: Documents needing independent section formatting
- `none`: Simple documents, web content

### PPTX: `slide_breaks` (string)

**Purpose:** Controls when new slides are created in PowerPoint.

**Valid Values:**

- `h2` (default) - New slide at every `# H1` and `## H2`
  - H1 creates title slides
  - H2 creates content slides
  
- `h1` - New slide only at `# H1`
  - More content per slide
  - H2 and below stay on same slide
  
- `hr` - New slide at every `---` horizontal rule
  - Manual control over slide breaks
  - Ignore heading levels

**Example:**
```yaml
slide_breaks: h2
```

---

## Complete Example

```yaml
---
format: docx
title: "AI Capability Design & Enablement - Executive Brief"
author: "Dale Rogers"
date: "2025-11-10"
classification: "OFFICIAL"
version: "1.0"
status: final
description: "Executive decision brief presenting three delivery options for DCCEEW AI capability programme"
keywords: ["AI", "capability", "DCCEEW", "executive brief", "decision"]
subject: "Executive Briefing"
section_breaks: auto
date_format: DD/MM/YYYY
---
```

---

## Validation

The converter performs **strict validation** with the following checks:

### Errors (Fail Conversion):
- Missing or invalid YAML syntax
- Missing required fields (`format`, `title`)
- Invalid enum values (format, status, section_breaks, slide_breaks)
- Invalid field types
- Heading hierarchy violations (H1 → H3 skip)
- Empty headings
- Table column count inconsistencies

### Warnings (Continue with Warning):
- Missing recommended fields (author, date, classification, version, keywords)
- Date not in YYYY-MM-DD format
- Description > 250 characters
- Missing H1 title
- Code blocks without language tags
- Empty lists

---

## CLI Options

### Standard Mode
```bash
md-convert document.md --format docx
```
- Shows warnings in yellow
- Continues conversion
- Displays metadata summary

### Strict Mode
```bash
md-convert document.md --format docx --strict
```
- Treats warnings as errors
- Fails conversion on any warning
- Use for production documents

### Skip Validation
```bash
md-convert document.md --format docx --no-validate
```
- Skips all validation
- Faster for trusted documents
- Not recommended for production

---

## Migration from Documents Without Front Matter

If converting legacy documents without front matter:

1. **First conversion:** Document will convert with warning: "No YAML front matter found"
2. **Default values:** Uses filename as title, "MD Converter" as author
3. **Add front matter:** Copy template from `examples/frontmatter-template.md`
4. **Reconvert:** Re-run conversion with proper metadata

---

## Best Practices

1. **Always include front matter** for production documents
2. **Use `section_breaks: auto`** for most Word documents
3. **Keep descriptions under 250 characters**
4. **Use YYYY-MM-DD date format** for consistency
5. **Add 3-5 keywords** for searchability
6. **Set appropriate classification** for security
7. **Update version number** on significant changes
8. **Use `status: final`** only for approved documents

---

## Metadata Mapping

### DOCX (Word)
- `title` → Document Title
- `author` → Creator
- `description` → Description
- `subject` → Subject
- `keywords` → Keywords (comma-separated)
- `classification`, `version`, `status`, `date` → Custom Properties

### PPTX (PowerPoint)
- `title` → Presentation Title
- `author` → Author
- `subject` → Subject
- `keywords` → Keywords
- `description` → Description
- `classification` → Footer on all slides (if present)

### XLSX (Excel)
- `title` → Workbook Title
- `author` → Creator
- `subject` → Subject
- `keywords` → Keywords
- `description` → Description
- Metadata sheet added if classification/version/status present

---

**Version:** 1.0  
**Last Updated:** 2025-11-10

