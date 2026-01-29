# Change: Add Configurable Date Format

## Why
The table parser currently only supports Australian date format (DD/MM/YYYY). Users in the US (MM/DD/YYYY) or those preferring ISO format (YYYY-MM-DD) must work around this limitation. Date format should be configurable via front matter metadata.

## What Changes
- Add `date_format` field to DocumentMetadata interface
- Support common date format patterns:
  - `DD/MM/YYYY` (default, Australian/UK)
  - `MM/DD/YYYY` (US)
  - `YYYY-MM-DD` (ISO)
- Update table parser to use configured date format for detection
- Update Excel converter to apply appropriate date formatting

## Impact
- Affected specs: Modified `parsers` capability
- Affected code:
  - `src/core/parsers/frontmatter-parser.ts` (add field)
  - `src/core/parsers/table-parser.ts` (use format)
  - `src/core/converters/xlsx-converter.ts` (apply format)
- Dependencies: Proposals 1-5

## Priority
**6 of 6** - Feature enhancement with low effort and high value for international users.
