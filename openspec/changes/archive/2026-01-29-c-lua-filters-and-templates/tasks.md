## 1. Directory Structure

- [x] 1.1 Create `src/pandoc/filters/` directory
- [x] 1.2 Create `templates/defaults/` directory

## 2. Lua Filters

- [x] 2.1 Create `section-breaks.lua` with auto/all/none modes for DOCX page breaks
- [x] 2.2 Create `slide-breaks.lua` with h1/h2/hr modes for PPTX slide control
- [x] 2.3 Create `metadata-inject.lua` for metadata normalization

## 3. Reference Documents

- [x] 3.1 Create `reference.docx` with required styles (use Pandoc to generate base)
- [x] 3.2 Create `reference.pptx` with slide layouts (use Pandoc to generate base)

## 4. Defaults Files

- [x] 4.1 Create `defaults/docx.yaml` with filters and reference doc
- [x] 4.2 Create `defaults/pptx.yaml` with filters, reference doc, and slide-level

## 5. Path Resolution Helper

- [x] 5.1 Create `src/core/pandoc/filters.ts` with getFilterPath() and getTemplatePath()
- [x] 5.2 Export filter utilities from `src/core/pandoc/index.ts`

## 6. Tests

- [x] 6.1 Add tests for filter path resolution with env var override
- [x] 6.2 Add tests for template path resolution with env var override
- [x] 6.3 Add integration test verifying filters exist at resolved paths
