// Lint for the public site (refactor phase 5, 2026-11-27). Correctness rules only: the code style (compact one-line
// handlers, single-quoted strings, no semicolons in places) is the project's own and is not enforced here.
// ESLint itself is installed at the repository root, like vite.
import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  {ignores: ['dist/**', 'public/**']},
  js.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    languageOptions: {ecmaVersion: 'latest', sourceType: 'module', globals: {...globals.browser}},
    rules: {
      'no-unused-vars': ['error', {args: 'none', caughtErrors: 'none', ignoreRestSiblings: true, varsIgnorePattern: '^_'}],
      'no-empty': ['error', {allowEmptyCatch: true}],
      // Single-word page names (Home, Assets, Finance…) are route components, not reusable elements.
      'vue/multi-word-component-names': 'off',
    },
  },
  {files: ['scripts/**', 'tests/**', 'vite.config.*', 'src/server/**'], languageOptions: {globals: {...globals.node}}},
]
