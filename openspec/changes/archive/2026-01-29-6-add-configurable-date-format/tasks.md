# Tasks: Add Configurable Date Format

## 1. Update Metadata Interface
- [x] 1.1 Add `date_format` field to `DocumentMetadata` interface in frontmatter-parser.ts
- [x] 1.2 Define allowed values: `'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'`
- [x] 1.3 Set default value to `'DD/MM/YYYY'` for backward compatibility
- [x] 1.4 Add validation in `validateFrontMatter()` function

## 2. Update Table Parser
- [x] 2.1 Accept date format parameter in table parsing functions
- [x] 2.2 Create date detection patterns for each format:
  - DD/MM/YYYY: `/^\d{1,2}\/\d{1,2}\/\d{4}$/`
  - MM/DD/YYYY: `/^\d{1,2}\/\d{1,2}\/\d{4}$/`
  - YYYY-MM-DD: `/^\d{4}-\d{2}-\d{2}$/`
- [x] 2.3 Update `detectDataType()` to use configured pattern
- [x] 2.4 Parse date strings according to configured format

## 3. Update XLSX Converter
- [x] 3.1 Pass date format from metadata to table parser
- [x] 3.2 Apply appropriate Excel date formatting based on configured format
- [x] 3.3 Test date display in generated Excel files

## 4. Update Documentation
- [x] 4.1 Add `date_format` to FRONTMATTER.md documentation
- [x] 4.2 Add examples showing different date formats
- [x] 4.3 Update CLAUDE.md with new metadata field

## 5. Testing
- [x] 5.1 Add unit tests for each date format pattern
- [x] 5.2 Add integration tests for date conversion in XLSX
- [x] 5.3 Test backward compatibility (no date_format specified uses default)
- [x] 5.4 Test invalid date_format value handling
