# Change: C - Lua Filters and Reference Templates

## Why
Pandoc's power comes from its extensibility through:
1. **Lua filters** - Modify the document AST during conversion
2. **Reference documents** - Define styles and layouts for output

We need custom filters to implement our section/slide break logic and reference documents to maintain consistent styling.

## What Changes

### New Directory Structure
```
src/
└── pandoc/
    └── filters/
        ├── section-breaks.lua
        ├── slide-breaks.lua
        └── metadata-inject.lua

templates/
├── reference.docx
├── reference.pptx
└── defaults/
    ├── docx.yaml
    └── pptx.yaml
```

### Lua Filters

#### 1. `section-breaks.lua`
Controls page/section breaks in DOCX output based on `section_breaks` metadata:
- **auto** (default): Insert page break before H2 headings
- **all**: Insert page break before H2/H3 and at horizontal rules
- **none**: No automatic page breaks

```lua
-- Reads section_breaks from metadata
-- Modifies Header and HorizontalRule elements
-- Injects OpenXML page break raw blocks
```

#### 2. `slide-breaks.lua`
Controls slide boundaries in PPTX output based on `slide_breaks` metadata:
- **h1**: Only H1 creates new slides
- **h2** (default): H1 and H2 create slides
- **hr**: Horizontal rules create slide breaks

```lua
-- Reads slide_breaks from metadata
-- Adjusts header levels to control Pandoc's slide creation
-- Converts HRs to slide-breaking elements when mode is 'hr'
```

#### 3. `metadata-inject.lua`
Normalizes and injects metadata into document properties:
- Ensures title is set (defaults to "Untitled Document")
- Maps `classification` to `subject` field
- Normalizes date format for Pandoc
- Passes through custom fields for other filters

### Reference Documents

#### `reference.docx`
Word template with these styles defined:
| Style | Purpose | Formatting |
|-------|---------|------------|
| Title | Document title | 24pt, Bold, Centered |
| Heading 1-6 | Heading hierarchy | Decreasing sizes, Bold |
| Normal | Body paragraphs | 11pt, Calibri |
| First Paragraph | After heading | No indent |
| Code | Inline code | Consolas, 10pt |
| Source Code | Code blocks | Consolas, 10pt, Gray background |
| Block Text | Blockquotes | Italic, Indented |
| Table | Table cells | 10pt, Bordered |
| Hyperlink | Links | Blue, Underlined |

#### `reference.pptx`
PowerPoint template with:
- Title slide layout (H1 on first slide)
- Section header layout (subsequent H1s)
- Content slide layout (H2 headings)
- Two-column layout option
- Light theme colors matching Word template
- Footer placeholder for classification

### Pandoc Defaults Files

#### `defaults/docx.yaml`
```yaml
from: markdown+yaml_metadata_block+pipe_tables+grid_tables
to: docx
standalone: true
reference-doc: templates/reference.docx
lua-filter:
  - src/pandoc/filters/section-breaks.lua
  - src/pandoc/filters/metadata-inject.lua
metadata:
  lang: en-US
```

#### `defaults/pptx.yaml`
```yaml
from: markdown+yaml_metadata_block+pipe_tables
to: pptx
standalone: true
reference-doc: templates/reference.pptx
lua-filter:
  - src/pandoc/filters/slide-breaks.lua
  - src/pandoc/filters/metadata-inject.lua
slide-level: 2
metadata:
  lang: en-US
```

### Helper Module
- Create `src/core/pandoc/filters.ts` - Filter and template path resolution
- Support `MD_CONVERTER_TEMPLATES` and `MD_CONVERTER_FILTERS` env vars

## Impact
- **Affected specs**: Extends `pandoc` capability
- **Affected code**:
  - `src/pandoc/filters/section-breaks.lua` (new)
  - `src/pandoc/filters/slide-breaks.lua` (new)
  - `src/pandoc/filters/metadata-inject.lua` (new)
  - `templates/reference.docx` (new)
  - `templates/reference.pptx` (new)
  - `templates/defaults/docx.yaml` (new)
  - `templates/defaults/pptx.yaml` (new)
  - `src/core/pandoc/filters.ts` (new)
- **Dependencies**: Change A (uses PandocExecutor for testing filters)

## Acceptance Criteria
1. `section-breaks.lua` correctly inserts page breaks based on all three modes
2. `slide-breaks.lua` correctly controls slide boundaries for all modes
3. `metadata-inject.lua` properly maps custom metadata to Pandoc fields
4. Reference DOCX produces correctly styled output for all element types
5. Reference PPTX produces correctly styled slides with proper layouts
6. Defaults files work with `pandoc --defaults=docx.yaml`
7. Filter path resolution handles custom directories via env vars

## Priority
**3 of 7** - Required before converter migrations. Can proceed in parallel with B.
