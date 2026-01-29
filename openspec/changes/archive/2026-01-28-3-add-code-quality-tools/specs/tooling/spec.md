## ADDED Requirements

### Requirement: ESLint Configuration
The project SHALL have ESLint configured for TypeScript linting.

#### Scenario: Run linting
- **WHEN** developer runs `npm run lint`
- **THEN** ESLint checks all TypeScript files in `src/`
- **AND** TypeScript-specific rules are applied
- **AND** exit code 0 indicates no errors

#### Scenario: Auto-fix linting issues
- **WHEN** developer runs `npm run lint:fix`
- **THEN** auto-fixable issues are corrected
- **AND** remaining issues are reported

### Requirement: Prettier Configuration
The project SHALL have Prettier configured for consistent code formatting.

#### Scenario: Check formatting
- **WHEN** developer runs `npm run format:check`
- **THEN** all files are checked against Prettier rules
- **AND** unformatted files are listed

#### Scenario: Apply formatting
- **WHEN** developer runs `npm run format`
- **THEN** all TypeScript files are formatted consistently
- **AND** formatting matches project style guide

### Requirement: ESLint-Prettier Integration
ESLint and Prettier SHALL not conflict on formatting rules.

#### Scenario: No rule conflicts
- **WHEN** both `npm run lint` and `npm run format:check` are run
- **THEN** no contradictory errors occur
- **AND** Prettier handles formatting, ESLint handles logic
