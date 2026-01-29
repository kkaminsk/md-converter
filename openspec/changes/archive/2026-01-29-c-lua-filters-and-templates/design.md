## Context

Pandoc uses two extensibility mechanisms:
1. **Lua filters** - Transform the document AST during conversion
2. **Reference documents** - Define styles/layouts for DOCX/PPTX output

We need custom filters to implement our section/slide break logic (from front matter) and reference documents to ensure consistent styling.

### Current State

- Section break logic exists in `section-rules.ts` for the old converters
- No Lua filters or reference documents exist yet
- PandocExecutor (Change A) can run filters via the `filters` option

### Constraints

- Filters must be pure Lua (no external dependencies)
- Reference documents must be valid OOXML that Pandoc accepts
- Must support all three section_breaks modes: auto, all, none
- Must support all three slide_breaks modes: h1, h2, hr

## Goals / Non-Goals

**Goals:**
- Implement section break logic as Lua filter for DOCX
- Implement slide break logic as Lua filter for PPTX
- Create reference.docx with all required styles
- Create reference.pptx with proper slide layouts
- Provide defaults files for easy Pandoc invocation
- Support custom filter/template directories via env vars

**Non-Goals:**
- Complex slide animations or transitions
- Custom fonts (use system defaults)
- Embedded images in templates
- Per-document template customization

## Decisions

### 1. Filter Execution Order

**Decision:** metadata-inject.lua runs first, then format-specific filters

**Rationale:**
- Metadata normalization should happen before other filters read metadata
- section-breaks.lua and slide-breaks.lua depend on normalized metadata

**Order:**
1. metadata-inject.lua (always)
2. section-breaks.lua (DOCX only)
3. slide-breaks.lua (PPTX only)

### 2. Page Break Implementation

**Decision:** Use raw OpenXML blocks for DOCX page breaks

**Rationale:**
- Pandoc doesn't have native page break support
- Raw blocks allow injecting arbitrary OOXML
- `<w:br w:type="page"/>` is the standard DOCX page break

**Code pattern:**
```lua
pandoc.RawBlock('openxml', '<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
```

### 3. Slide Level Control

**Decision:** Use Pandoc's built-in slide-level with header promotion/demotion

**Rationale:**
- Pandoc's slide-level option controls which heading level creates slides
- We adjust header levels in the filter to achieve desired behavior
- More reliable than trying to inject raw PPTX

**Approach:**
- h1 mode: Set slide-level=1, demote H2+
- h2 mode: Set slide-level=2 (default)
- hr mode: Convert HRs to H2s (slide boundaries)

### 4. Reference Document Creation

**Decision:** Create minimal reference docs programmatically, document manual creation steps

**Rationale:**
- Binary DOCX/PPTX files can't be created purely in code easily
- Users may want to customize templates
- Provide both: minimal working templates + documentation for customization

**Approach:**
- Use Pandoc to generate initial reference docs
- Document style customization process in README

### 5. Path Resolution Strategy

**Decision:** Check env vars first, then fall back to relative paths from package root

**Rationale:**
- Env vars allow deployment flexibility
- Relative paths work for development
- Package root detection via import.meta.url or __dirname

**Resolution order:**
1. `MD_CONVERTER_FILTERS` / `MD_CONVERTER_TEMPLATES` env vars
2. `src/pandoc/filters/` and `templates/` relative to package

## Risks / Trade-offs

### Binary Template Files
**Risk:** DOCX/PPTX files can't be code-reviewed or diffed meaningfully
**Mitigation:** Document exact steps to recreate templates. Include style manifest.

### Pandoc Version Sensitivity
**Risk:** Lua filter API or reference doc format may change between Pandoc versions
**Mitigation:** Test with Pandoc 3.0+, document minimum version requirement.

### Filter Debugging Difficulty
**Risk:** Lua filter errors can be cryptic
**Mitigation:** Add detailed error messages, provide test commands in documentation.

## File Structure

```
src/
├── pandoc/
│   └── filters/
│       ├── section-breaks.lua    # DOCX page break injection
│       ├── slide-breaks.lua      # PPTX slide boundary control
│       └── metadata-inject.lua   # Metadata normalization
└── core/
    └── pandoc/
        └── filters.ts            # Path resolution helper

templates/
├── reference.docx                # Word styling template
├── reference.pptx                # PowerPoint template
└── defaults/
    ├── docx.yaml                 # Pandoc defaults for DOCX
    └── pptx.yaml                 # Pandoc defaults for PPTX
```
