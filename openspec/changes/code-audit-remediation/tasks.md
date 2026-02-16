## 1. Type Safety (High Severity)

- [ ] 1.1 Create `src/mcp/types.ts` with interfaces for each MCP tool's arguments — **15 min**
- [ ] 1.2 Add input validation (file path existence, required fields) to each MCP handler — **20 min**
- [ ] 1.3 Create `CliOptions` interface in `src/cli/index.ts` and type the options parameter — **10 min**
- [ ] 1.4 Add parseInt validation for fontSize with fallback default — **5 min**

## 2. CI and Versioning

- [ ] 2.1 Update `package.json` version from `1.0.0` to `2.1.0` — **1 min**
- [ ] 2.2 Update CLI `.version()` call to `2.1.0` — **1 min**
- [ ] 2.3 Update MCP server version to `2.1.0` — **1 min**
- [ ] 2.4 Create `.github/workflows/ci.yml` with build, type-check, lint, and test steps — **10 min**
- [ ] 2.5 Add `tests/output/` to `.gitignore` — **1 min**

## 3. Dependency Hygiene

- [ ] 3.1 Move `@types/js-yaml` from `dependencies` to `devDependencies` — **1 min**
- [ ] 3.2 Remove `docx` from `dependencies` — **1 min**
- [ ] 3.3 Remove `pptxgenjs` from `dependencies` — **1 min**
- [ ] 3.4 Add `jszip` to `dependencies` — **1 min**

## 4. Code Deduplication

- [ ] 4.1 Create `src/core/pandoc/xml-utils.ts` with `escapeXml()` and `updateXmlElement()` — **10 min**
- [ ] 4.2 Refactor `docx-post.ts` and `pptx-post.ts` to import from `xml-utils.ts` — **10 min**
- [ ] 4.3 Replace manual YAML serialization in `pre-processor.ts` with `yaml.dump()` — **10 min**
- [ ] 4.4 Refactor `xlsx-converter.ts` `parseMarkdownFormatting()` to use `inline-parser.ts` — **15 min**

## 5. Validation

- [ ] 5.1 Run `npm run build` to confirm TypeScript compilation — **2 min**
- [ ] 5.2 Run `npm run lint` to confirm no linting errors — **2 min**
- [ ] 5.3 Run `npm test` to confirm tests pass — **5 min**
