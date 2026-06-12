/** Constitution Gate 3: the four package boundaries, enforced mechanically.
 *  client → contract + content text only (carve-out: src/transport may bind the
 *  engine adapter in-process — the Principle V transport-adapter exception);
 *  engine → contract + content data (never content/text); contract → nothing;
 *  content → nothing. */
module.exports = {
  forbidden: [
    {
      name: 'contract-depends-on-nothing',
      severity: 'error',
      from: { path: '^packages/contract' },
      to: { path: '^(packages/(engine|content)|apps)' },
    },
    {
      name: 'content-depends-on-nothing',
      severity: 'error',
      from: { path: '^packages/content' },
      to: { path: '^(packages/(engine|contract)|apps)' },
    },
    {
      name: 'engine-no-gui',
      severity: 'error',
      from: { path: '^packages/engine' },
      to: { path: '^apps' },
    },
    {
      name: 'engine-never-imports-text',
      severity: 'error',
      from: { path: '^packages/engine' },
      to: { path: '^packages/content/text' },
    },
    {
      name: 'client-engine-only-via-transport',
      severity: 'error',
      from: {
        path: '^apps/client',
        pathNot: '^apps/client/src/transport',
      },
      to: { path: '^packages/engine' },
    },
    {
      name: 'client-no-content-internals',
      severity: 'error',
      from: { path: '^apps/client' },
      to: { path: '^packages/content/(src|schemas|data|tests)' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    exclude: { path: '\\.(test|spec)\\.(ts|tsx)$|/tests/' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'types', 'default'],
    },
  },
};
