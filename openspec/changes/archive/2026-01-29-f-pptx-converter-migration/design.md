# Design: F - PPTX Converter Migration

## Context

The current PPTX converter (`src/core/converters/pptx-converter.ts`) uses `pptxgenjs` library with manual slide construction. This approach has:
- ESM/CJS interop issues requiring `createRequire` workaround
- Manual positioning of all elements (text boxes at specific coordinates)
- Custom logic for slide structure (H1=title, H2=section, H3=content)
- 577 lines of complex slide-building code

The DOCX converter was successfully migrated in Change E, establishing a pattern:
1. PreProcessor for metadata extraction and content normalization
2. PandocExecutor for conversion
3. PostProcessor for classification headers and property patching

All required Pandoc infrastructure is already in place:
- `slide-breaks.lua` filter handles h1/h2/hr slide break modes
- `pptx-post.ts` handles classification footers and document properties
- `pptx.yaml` defaults file configures Pandoc for PPTX output
- `reference.pptx` template (optional) for consistent styling

## Goals / Non-Goals

**Goals:**
- Replace pptxgenjs with Pandoc for PPTX generation
- Maintain API compatibility (`convertToPptx`, `convertMarkdownToPptx`)
- Support existing slide break modes (h1, h2, hr)
- Preserve classification footer functionality
- Preserve theme support (light/dark)

**Non-Goals:**
- Adding new PPTX features not in current implementation
- Changing the public API signatures
- Supporting speaker notes (not in current implementation)
- Removing pptxgenjs from package.json (that's Change H)

## Decisions

### 1. Follow DOCX converter pattern exactly

**Decision:** Mirror the structure of `docx-converter.ts`:
- Use PreProcessor → PandocExecutor → PostProcessor pipeline
- Same error handling pattern with cleanup on failure
- Same result shape with warnings array

**Rationale:** Consistency makes the codebase easier to maintain. The pattern was validated in Change E.

**Alternatives considered:**
- Custom pipeline: Rejected - no benefit, increases maintenance burden

### 2. Use slide-level=2 as default, adjust via filter

**Decision:** Set Pandoc's `--slide-level=2` as the default (H1 = title slide, H2 = content slide). Use `slide-breaks.lua` filter to adjust behavior for other modes.

**Rationale:** This matches Pandoc's natural PPTX output and our h2 default mode. The filter already handles demoting headers for h1 mode and converting HRs for hr mode.

**Alternatives considered:**
- Dynamic slide-level: Could set slide-level=1 for h1 mode, but the filter approach is simpler and already implemented

### 3. Handle theme via reference document, not post-processing

**Decision:** Support theme via different reference documents (`reference.pptx` for light, `reference-dark.pptx` for dark) if they exist. Fall back to Pandoc defaults if not.

**Rationale:** Reference documents are Pandoc's intended mechanism for styling. Post-processing theme colors would require extensive OOXML manipulation.

**Alternatives considered:**
- Post-process colors: Too complex, requires modifying slide master and theme XML
- Generate reference docs on the fly: Over-engineered for this use case

### 4. Slide counting via OOXML inspection

**Decision:** Count slides by reading the PPTX zip and counting `ppt/slides/slide*.xml` files, since Pandoc doesn't provide a slide count.

**Rationale:** The PostProcessor already opens the PPTX for footer injection; we can count slides at the same time.

**Alternatives considered:**
- Parse Pandoc output: Pandoc doesn't report slide count
- Estimate from markdown: Unreliable, depends on content length

## Risks / Trade-offs

### Risk: Pandoc slide layout differs from pptxgenjs
**Mitigation:** This is expected. Pandoc uses standard layouts from the reference document. The visual output will be different but more consistent. Document this as a known change.

### Risk: Theme colors may not match exactly
**Mitigation:** Reference documents control theming. If exact colors are needed, users can customize `reference.pptx`. The current implementation's hardcoded hex colors are not a well-defined contract.

### Trade-off: Less control over positioning
**Acceptance:** Pandoc manages layout automatically. We lose pixel-perfect control but gain consistency and maintainability. This is the same trade-off accepted for DOCX.

## Implementation Approach

The implementation is straightforward given existing infrastructure:

1. **Refactor `convertMarkdownToDocx`** to use Pandoc pipeline:
   - PreProcessor.process() for metadata/content
   - Build Pandoc options with slide-breaks filter
   - Execute Pandoc with pptx format
   - PostProcessor.process() for footers/properties
   - Count slides and return result

2. **Refactor `convertToPptx`** to delegate to string-based function (same pattern as DOCX)

3. **Add slide counting** utility function

4. **Remove unused imports** and helper functions that become dead code

The slide-breaks.lua filter, pptx-post.ts processor, and pptx.yaml defaults are already implemented and tested - no changes needed to those components.
