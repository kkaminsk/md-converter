# Tasks: Add Code Quality Tools

## 1. Install Dependencies
- [x] 1.1 Install ESLint: `npm install -D eslint`
- [x] 1.2 Install TypeScript ESLint: `npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin`
- [x] 1.3 Install Prettier: `npm install -D prettier`
- [x] 1.4 Install ESLint-Prettier integration: `npm install -D eslint-config-prettier`

## 2. ESLint Configuration
- [x] 2.1 Create `eslint.config.mjs` (flat config format for ESLint 9+)
- [x] 2.2 Configure TypeScript parser
- [x] 2.3 Enable recommended rules for TypeScript
- [x] 2.4 Add project-specific rules (consistent with existing patterns)
- [x] 2.5 Configure to ignore `dist/` and `node_modules/`

## 3. Prettier Configuration
- [x] 3.1 Create `.prettierrc` with project settings
  - Single quotes
  - 2-space indentation
  - Trailing commas
  - 100 character line width
- [x] 3.2 Create `.prettierignore` for dist/ and generated files

## 4. Package Scripts
- [x] 4.1 Add `lint` script: `eslint src/`
- [x] 4.2 Add `lint:fix` script: `eslint src/ --fix`
- [x] 4.3 Add `format` script: `prettier --write src/`
- [x] 4.4 Add `format:check` script: `prettier --check src/`

## 5. Initial Application
- [x] 5.1 Run `npm run format` to apply Prettier to all files
- [x] 5.2 Run `npm run lint:fix` to auto-fix ESLint issues
- [x] 5.3 Manually fix any remaining lint errors
- [x] 5.4 Verify build still works: `npm run build`
- [x] 5.5 Verify tests still pass: `npm test`

## 6. Documentation
- [x] 6.1 Update CLAUDE.md with lint/format commands
