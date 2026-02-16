## MODIFIED Requirements

### Requirement: Correct dependency classification (M3, L1, L2)
The package.json SHALL list only runtime dependencies under `dependencies` and type/build-only packages under `devDependencies`.

#### Problem
- `@types/js-yaml` is listed under `dependencies` instead of `devDependencies`
- `docx` and `pptxgenjs` are listed as dependencies but are no longer imported by any source file (Pandoc migration complete for DOCX/PPTX)
- `jszip` is imported by multiple source files but not declared in package.json

#### Fix

**File:** `package.json`

```json
// REMOVE from dependencies:
"@types/js-yaml": "^4.0.9",
"docx": "^8.5.0",
"pptxgenjs": "^3.12.0",

// ADD to dependencies:
"jszip": "^3.10.1",

// ADD to devDependencies:
"@types/js-yaml": "^4.0.9",
```

#### Scenario: No unused production dependencies
- **GIVEN** the package.json has been updated
- **WHEN** `npm ls --prod` is run
- **THEN** `docx` and `pptxgenjs` SHALL NOT appear in the dependency tree
- **AND** `jszip` SHALL appear as a direct dependency

#### Scenario: Types available during build
- **GIVEN** `@types/js-yaml` is in devDependencies
- **WHEN** `npm run build` is run
- **THEN** TypeScript compilation SHALL succeed without type errors for js-yaml imports
