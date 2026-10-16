// Lint rules for the whole repo: `pnpm lint`. Formatting isn't linted — only things
// that are likely bugs or make code harder to follow. See CONTRIBUTING.md.
import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'
import local from './eslint-rules/domain-boundaries.js'

// ── Folder and file structure (CONTRIBUTING.md, "Folders and files") ────────────────
// Each file holds one kind of thing, named by the file:
//   types.ts               types and interfaces only
//   constants.ts, data/    values only (numbers, tables, schemas, messages)
//   index.ts               re-exports only — the domain's public face
//   anything else          logic: functions and classes
const DOMAIN_INDEXES = ['src/lib/*/index.ts', 'src/composables/*/index.ts', 'src/components/*/index.ts', 'server/*/index.ts']
const VALUE_FILES = ['**/constants.ts', '**/data/**/*.ts']
const NOT_SOURCE = ['**/*.test.ts', '**/*.d.ts']

const EXPORTED_TYPE = {
  selector: 'ExportNamedDeclaration > :matches(TSInterfaceDeclaration, TSTypeAliasDeclaration)',
  message: "Exported types and interfaces go in the domain's types.ts.",
}
const EXPORTED_VALUE = {
  selector: 'ExportNamedDeclaration > VariableDeclaration',
  message: 'Exported constants go in constants.ts, or a file under data/ for tables and per-region data.',
}
const EXPORTED_LOGIC = {
  selector: 'ExportNamedDeclaration > :matches(FunctionDeclaration, ClassDeclaration)',
  message: 'Functions and classes go in a logic file, not in constants.ts or data/.',
}
const RE_EXPORT = {
  selector: ':matches(ExportAllDeclaration, ExportNamedDeclaration[source])',
  message: "Only a domain's index.ts re-exports — import from the file that defines it.",
}
const NOT_A_TYPE = {
  selector: 'Program > :not(ImportDeclaration, TSInterfaceDeclaration, TSTypeAliasDeclaration, TSModuleDeclaration, ExportNamedDeclaration[exportKind="type"], ExportAllDeclaration[exportKind="type"])',
  message: 'types.ts holds types and interfaces only — move values to constants.ts and functions to a logic file.',
}
const NOT_A_RE_EXPORT = {
  selector: 'Program > :not(ExportAllDeclaration, ExportNamedDeclaration[source])',
  message: "A domain's index.ts only re-exports — put code in a named file and re-export it here.",
}

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'data/', 'eslint.config.js', 'eslint-rules/'] },

  js.configs.recommended,
  // Type-aware rules: they read the TypeScript types, so they catch forgotten `await`s,
  // conditions that are always true, unsafe `any` and the like.
  ...tseslint.configs.strictTypeChecked,
  // Vue's correctness rules only; its "recommended" set is mostly formatting.
  ...vue.configs['flat/essential'],

  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
      },
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tseslint.parser },
    },
  },

  {
    rules: {
      // Template literals with numbers are the whole point of the diagram's explanations.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // Exported functions are this codebase's API between modules: their return types
      // are part of the contract, so state them rather than leave them inferred.
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      // Unused variables are errors, except deliberately ignored ones named `_x`.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  // Structure: domain boundaries everywhere, then one file-kind rule set per kind of file.
  {
    plugins: { local },
    rules: { 'local/domain-boundaries': 'error' },
  },
  {
    files: ['**/types.ts'],
    ignores: NOT_SOURCE,
    rules: { 'no-restricted-syntax': ['error', NOT_A_TYPE] },
  },
  {
    files: VALUE_FILES,
    ignores: NOT_SOURCE,
    rules: { 'no-restricted-syntax': ['error', EXPORTED_TYPE, EXPORTED_LOGIC, RE_EXPORT] },
  },
  {
    files: DOMAIN_INDEXES,
    rules: { 'no-restricted-syntax': ['error', NOT_A_RE_EXPORT] },
  },
  {
    files: ['src/**/*.ts', 'server/**/*.ts', 'api/**/*.ts'],
    ignores: [...NOT_SOURCE, '**/types.ts', ...VALUE_FILES, ...DOMAIN_INDEXES],
    rules: { 'no-restricted-syntax': ['error', EXPORTED_TYPE, EXPORTED_VALUE, RE_EXPORT] },
  },

  {
    // Tests may assert that something exists with `!` instead of guarding every lookup,
    // and read response JSON (typed `any`) directly — the assertions check its shape.
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
)
