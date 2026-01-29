## MODIFIED Requirements

### Requirement: Inline Markdown Formatting
Converters SHALL correctly parse and render inline markdown formatting including nested patterns.

#### Scenario: Simple bold formatting
- **WHEN** markdown contains `**bold text**`
- **THEN** output document renders "bold text" in bold

#### Scenario: Simple italic formatting
- **WHEN** markdown contains `*italic text*`
- **THEN** output document renders "italic text" in italic

#### Scenario: Inline code formatting
- **WHEN** markdown contains `` `code text` ``
- **THEN** output document renders "code text" in monospace font

#### Scenario: Nested bold and italic
- **WHEN** markdown contains `**bold with *italic* inside**`
- **THEN** output document renders:
  - "bold with " in bold only
  - "italic" in bold AND italic
  - " inside" in bold only

#### Scenario: Multiple formatting in paragraph
- **WHEN** markdown contains `Normal **bold** and *italic* and **more *nested* bold**`
- **THEN** each segment renders with correct formatting
- **AND** formatting does not bleed into adjacent text

## ADDED Requirements

### Requirement: Shared Inline Parser
The project SHALL provide a shared inline parsing utility for consistent formatting across converters.

#### Scenario: Parse inline tokens
- **WHEN** `parseInlineTokens()` is called with markdown text
- **THEN** returns array of segments with formatting properties
- **AND** nested formatting is correctly represented

#### Scenario: Consistent across formats
- **WHEN** same markdown is converted to DOCX and PPTX
- **THEN** inline formatting is identical in both outputs
