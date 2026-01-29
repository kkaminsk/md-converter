# Change: H - Cleanup and Integration Testing

## Why
After migrating all converters to Pandoc, we need to:
1. Remove unused dependencies
2. Update documentation
3. Run comprehensive integration tests
4. Verify performance characteristics
5. Ensure backward compatibility

This change finalizes the Pandoc migration.

## What Changes

### 1. Remove Unused Dependencies

**Remove from package.json:**
```json
{
  "dependencies": {
    "docx": "^8.5.0",      // REMOVE - replaced by Pandoc
    "pptxgenjs": "^3.12.0" // REMOVE - replaced by Pandoc
  }
}
```

**Keep:**
```json
{
  "dependencies": {
    "exceljs": "^4.4.0",   // KEEP - used for XLSX generation
    "markdown-it": "^14.0.0", // KEEP - used for validation/preview
    "js-yaml": "^4.1.0",   // KEEP - used for front matter parsing
    "@modelcontextprotocol/sdk": "^1.0.0" // KEEP - MCP server
  }
}
```

### 2. Update Documentation

**Update README.md:**
- Add Pandoc installation requirements
- Document minimum Pandoc version (3.0+)
- Add troubleshooting for Pandoc issues

**Update CLAUDE.md:**
- Update architecture section
- Document new Pandoc components
- Update command examples

**Create PANDOC.md:**
- Detailed Pandoc configuration guide
- Custom filter development
- Reference document customization

### 3. Integration Test Suite

Create comprehensive integration tests in `tests/integration/`:

```typescript
// tests/integration/pandoc-conversion.test.ts

describe('Pandoc Integration', () => {
  describe('DOCX Conversion', () => {
    it('converts simple document correctly');
    it('handles complex nested lists');
    it('preserves inline formatting');
    it('applies section breaks correctly');
    it('includes document properties');
    it('handles tables with merged cells');
    it('processes code blocks with syntax');
  });

  describe('PPTX Conversion', () => {
    it('creates correct slide count');
    it('applies slide break modes correctly');
    it('handles images on slides');
    it('renders tables on slides');
    it('applies theme correctly');
  });

  describe('XLSX Conversion', () => {
    it('creates worksheets for each table');
    it('preserves formulas');
    it('formats dates correctly');
    it('handles number types');
    it('applies column alignments');
  });

  describe('Error Handling', () => {
    it('handles missing Pandoc gracefully');
    it('reports version errors clearly');
    it('handles conversion timeouts');
    it('recovers from filter errors');
  });
});
```

### 4. Performance Benchmarks

Create performance test suite:

```typescript
// tests/performance/benchmark.test.ts

describe('Performance', () => {
  const fixtures = [
    { name: 'small', file: 'fixtures/small.md', maxTime: 500 },
    { name: 'medium', file: 'fixtures/medium.md', maxTime: 1000 },
    { name: 'large', file: 'fixtures/large.md', maxTime: 3000 },
  ];

  for (const fixture of fixtures) {
    it(`converts ${fixture.name} DOCX within ${fixture.maxTime}ms`, async () => {
      const start = performance.now();
      await convertToDocx(readFixture(fixture.file), 'output.docx');
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(fixture.maxTime);
    });
  }
});
```

### 5. Backward Compatibility Tests

Verify all public APIs work unchanged:

```typescript
// tests/compatibility/api.test.ts

describe('API Compatibility', () => {
  describe('convertToDocx', () => {
    it('accepts (markdown, outputPath)');
    it('accepts (markdown, outputPath, options)');
    it('returns { success, outputPath, warnings, errors, metadata }');
  });

  describe('CLI Commands', () => {
    it('md-convert file.md --format docx works');
    it('md-convert file.md --format pptx works');
    it('md-convert file.md --format xlsx works');
    it('md-convert preview file.md works');
    it('md-convert validate file.md works');
    it('md-convert serve works');
  });

  describe('MCP Tools', () => {
    it('convert_md_to_docx tool works');
    it('convert_md_to_pptx tool works');
    it('convert_md_to_xlsx tool works');
    it('preview_tables tool works');
    it('validate_formulas tool works');
  });
});
```

### 6. Update CI/CD

**GitHub Actions workflow:**
```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v4

      - name: Install Pandoc
        uses: r-lib/actions/setup-pandoc@v2
        with:
          pandoc-version: '3.1'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Run integration tests
        run: npm run test:integration
```

### 7. Migration Guide

Create `docs/MIGRATION.md` for users upgrading:

```markdown
# Migration Guide: v1.x to v2.0 (Pandoc)

## Requirements

- Pandoc 3.0+ must be installed
- Node.js 18+ (unchanged)

## Breaking Changes

None for public API. Internal implementation changed.

## New Features

- Faster conversion for large documents
- Better table handling
- More consistent output across formats
- Easy path to PDF/HTML export (future)

## Troubleshooting

### Pandoc not found
Install Pandoc from https://pandoc.org/installing.html

### Output looks different
Check reference document customization in templates/
```

## Impact
- **Affected specs**: None (cleanup only)
- **Affected code**:
  - `package.json` (remove deps)
  - `README.md` (update docs)
  - `CLAUDE.md` (update docs)
  - `docs/PANDOC.md` (new)
  - `docs/MIGRATION.md` (new)
  - `tests/integration/*.test.ts` (new)
  - `tests/performance/*.test.ts` (new)
  - `.github/workflows/test.yml` (update)
- **Dependencies**: Changes E, F, G (all converters migrated)

## Acceptance Criteria
1. All old dependencies removed from package.json
2. npm install completes without docx/pptxgenjs
3. All integration tests pass
4. Performance benchmarks meet targets
5. Documentation is complete and accurate
6. CI pipeline passes on all platforms
7. Migration guide covers all scenarios

## Priority
**8 of 8** - Final cleanup after all converters migrated. Depends on E, F, G.
