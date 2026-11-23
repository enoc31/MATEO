const { test } = require('node:test');
const assert = require('node:assert/strict');
const { classifyLint, legacyQuery } = require('./check-db-lint.cjs');

const known = [
  {
    function: 'public.crear_reporte_aporte',
    issues: [
      {
        level: 'error',
        sqlState: '42883',
        message: 'operator does not exist: text = uuid',
        query: { text: legacyQuery },
      },
    ],
  },
];

test('accepts a clean lint run and reports the single documented legacy defect', () => {
  assert.equal(classifyLint([], 0), 'pass');
  assert.equal(classifyLint(known, 1), 'legacy');
});

test('rejects extra findings, changed findings and failures without a valid report', () => {
  assert.equal(classifyLint([...known, ...known], 1), 'fail');
  assert.equal(
    classifyLint([{ ...known[0], issues: [...known[0].issues, known[0].issues[0]] }], 1),
    'fail',
  );
  assert.equal(classifyLint([{ ...known[0], function: 'public.other' }], 1), 'fail');
  assert.equal(classifyLint([], 1), 'fail');
  assert.equal(classifyLint(null, 1), 'fail');
  assert.equal(classifyLint(known, 2), 'fail');
});
