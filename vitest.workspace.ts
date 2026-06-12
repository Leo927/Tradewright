import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'contract',
      environment: 'node',
      include: ['packages/contract/tests/**/*.test.ts'],
      passWithNoTests: true,
    },
  },
  {
    test: {
      name: 'engine',
      environment: 'node',
      include: ['packages/engine/tests/**/*.test.ts'],
      passWithNoTests: true,
    },
  },
  {
    test: {
      name: 'content',
      environment: 'node',
      include: ['packages/content/tests/**/*.test.ts'],
      passWithNoTests: true,
    },
  },
  {
    test: {
      name: 'client',
      environment: 'node',
      include: ['apps/client/src/**/*.test.{ts,tsx}'],
      passWithNoTests: true,
    },
  },
]);
