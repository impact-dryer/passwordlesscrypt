import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import security from 'eslint-plugin-security';
import globals from 'globals';

export default ts.config(
  js.configs.recommended,
  ...ts.configs.strictTypeChecked,
  ...ts.configs.stylisticTypeChecked,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
        ...globals.node,
      },
      parserOptions: {
        project: './tsconfig.json',
        extraFileExtensions: ['.svelte'],
      },
    },
    plugins: {
      security,
    },
    rules: {
      // Security-critical rules
      'security/detect-object-injection': 'error',
      'security/detect-non-literal-regexp': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-possible-timing-attacks': 'warn',

      // TypeScript strict rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        {
          allowString: false,
          allowNumber: false,
          allowNullableObject: true,
        },
      ],

      // Code quality
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
      },
    },
    rules: {
      'svelte/no-at-html-tags': 'error',
      'svelte/valid-compile': 'error',
      'svelte/no-target-blank': 'error',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  {
    files: ['e2e/**/*.ts'],
    rules: {
      // Relax rules for E2E tests
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-confusing-void-expression': 'off',
      'no-console': 'off',
      curly: 'off',
    },
  },
  {
    ignores: [
      'node_modules/',
      'build/',
      '.svelte-kit/',
      'dist/',
      'coverage/',
      '**/*.config.js',
      '**/*.config.cjs',
      '**/*.config.ts',
    ],
  }
);
