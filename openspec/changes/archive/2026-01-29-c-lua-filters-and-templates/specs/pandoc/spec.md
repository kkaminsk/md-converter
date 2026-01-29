## ADDED Requirements

### Requirement: Section breaks filter controls DOCX page breaks

The `section-breaks.lua` filter SHALL read the `section_breaks` metadata field and insert page breaks in DOCX output according to the mode:

- **auto** (default): Insert page break before H2 headings only
- **all**: Insert page break before H2, H3 headings and at horizontal rules
- **none**: No automatic page breaks inserted

Page breaks SHALL be implemented as raw OpenXML blocks.

#### Scenario: Auto mode inserts break before H2

- **WHEN** document has `section_breaks: auto` and contains H2 headings
- **THEN** a page break is inserted before each H2 heading
- **AND** no break is inserted before H3 or at horizontal rules

#### Scenario: All mode inserts breaks at multiple points

- **WHEN** document has `section_breaks: all`
- **THEN** page breaks are inserted before H2 and H3 headings
- **AND** horizontal rules are converted to page breaks

#### Scenario: None mode inserts no breaks

- **WHEN** document has `section_breaks: none`
- **THEN** no page breaks are inserted
- **AND** horizontal rules remain as visual dividers

#### Scenario: Default behavior when not specified

- **WHEN** document has no `section_breaks` metadata
- **THEN** auto mode is used (breaks before H2 only)

### Requirement: Slide breaks filter controls PPTX slide boundaries

The `slide-breaks.lua` filter SHALL read the `slide_breaks` metadata field and control slide creation in PPTX output:

- **h1**: Only H1 headings create new slides
- **h2** (default): H1 and H2 headings create new slides
- **hr**: Horizontal rules create slide breaks (in addition to H1/H2)

#### Scenario: H1 mode creates slides only at H1

- **WHEN** document has `slide_breaks: h1`
- **THEN** only H1 headings start new slides
- **AND** H2 and H3 appear as content within slides

#### Scenario: H2 mode creates slides at H1 and H2

- **WHEN** document has `slide_breaks: h2`
- **THEN** H1 and H2 headings start new slides
- **AND** H3 appears as content within slides

#### Scenario: HR mode adds slide breaks at horizontal rules

- **WHEN** document has `slide_breaks: hr`
- **THEN** horizontal rules create slide boundaries
- **AND** H1 and H2 also create slides as normal

#### Scenario: Default behavior when not specified

- **WHEN** document has no `slide_breaks` metadata
- **THEN** h2 mode is used (H1 and H2 create slides)

### Requirement: Metadata inject filter normalizes document metadata

The `metadata-inject.lua` filter SHALL normalize and validate document metadata:

- Ensure `title` is present (default: "Untitled Document")
- Copy `classification` to `subject` field for document properties
- Pass through `section_breaks` and `slide_breaks` for other filters
- Add `generator: md-converter` field

#### Scenario: Missing title gets default

- **WHEN** document has no title in metadata
- **THEN** title is set to "Untitled Document"

#### Scenario: Classification maps to subject

- **WHEN** document has `classification: OFFICIAL`
- **THEN** `subject` field is set to "OFFICIAL"

#### Scenario: Existing metadata preserved

- **WHEN** document has author, date, and keywords
- **THEN** all fields are preserved unchanged

### Requirement: Filter path resolution supports custom directories

The `getFilterPath()` function SHALL resolve filter paths using:

1. `MD_CONVERTER_FILTERS` environment variable (if set)
2. Default path: `src/pandoc/filters/` relative to package root

The `getTemplatePath()` function SHALL resolve template paths using:

1. `MD_CONVERTER_TEMPLATES` environment variable (if set)
2. Default path: `templates/` relative to package root

#### Scenario: Env var overrides default path

- **WHEN** `MD_CONVERTER_FILTERS` is set to `/custom/filters`
- **THEN** `getFilterPath('section-breaks.lua')` returns `/custom/filters/section-breaks.lua`

#### Scenario: Default path used when no env var

- **WHEN** `MD_CONVERTER_FILTERS` is not set
- **THEN** `getFilterPath('section-breaks.lua')` returns path relative to package root

#### Scenario: Template path resolution

- **WHEN** `MD_CONVERTER_TEMPLATES` is set to `/custom/templates`
- **THEN** `getTemplatePath('reference.docx')` returns `/custom/templates/reference.docx`

### Requirement: Pandoc defaults files configure conversion

Defaults files SHALL be provided for DOCX and PPTX conversion:

`defaults/docx.yaml`:
- Input format: markdown with extensions
- Output format: docx
- Reference document: reference.docx
- Filters: metadata-inject.lua, section-breaks.lua

`defaults/pptx.yaml`:
- Input format: markdown with extensions
- Output format: pptx
- Reference document: reference.pptx
- Filters: metadata-inject.lua, slide-breaks.lua
- Slide level: 2

#### Scenario: DOCX defaults include correct filters

- **WHEN** using `pandoc --defaults=docx.yaml`
- **THEN** metadata-inject and section-breaks filters are applied
- **AND** reference.docx is used for styling

#### Scenario: PPTX defaults include correct filters

- **WHEN** using `pandoc --defaults=pptx.yaml`
- **THEN** metadata-inject and slide-breaks filters are applied
- **AND** reference.pptx is used for styling
- **AND** slide-level is set to 2

### Requirement: Reference documents define output styles

`reference.docx` SHALL define styles for:
- Title, Heading 1-6 (document structure)
- Normal, First Paragraph (body text)
- Source Code (code blocks)
- Block Text (blockquotes)
- Hyperlink (links)

`reference.pptx` SHALL define:
- Title slide layout
- Content slide layout
- Consistent color theme

#### Scenario: DOCX output uses reference styles

- **WHEN** converting markdown with headings and code blocks
- **THEN** output DOCX uses styles from reference.docx

#### Scenario: PPTX output uses reference layouts

- **WHEN** converting markdown to presentation
- **THEN** output PPTX uses layouts from reference.pptx
