#!/usr/bin/env node
'use strict';

// Regenerate recorded cents: node scripts/verify-even-out-grid.js --write-fixture
// Verify recorded cents against a walk binary search: node scripts/verify-even-out-grid.js

const fs = require('node:fs');
const path = require('node:path');
const {
  evenOutGrid480Loans,
  recordedEvenOutCentsForGridLoan,
} = require('../even-out-walk-search');

const fixturePath = path.join(__dirname, '..', 'fixtures', 'even-out-grid-expected-cents.js');

function writeFixture() {
  const loans = evenOutGrid480Loans();
  const cents = loans.map((loan) => recordedEvenOutCentsForGridLoan(loan));
  const body = `${[
    '// Recorded even_out_cents for evenOutGrid480Loans() in even-out-walk-search.js.',
    '// Regenerate: node scripts/verify-even-out-grid.js --write-fixture',
    `module.exports = ${JSON.stringify(cents)};`,
    '',
  ].join('\n')}`;
  fs.writeFileSync(fixturePath, body);
  process.stdout.write(`Wrote ${cents.length} cents to ${fixturePath}\n`);
}

function verify() {
  const expected = require(fixturePath);
  const loans = evenOutGrid480Loans();
  if (expected.length !== loans.length) {
    throw new Error(`fixture length ${expected.length} !== grid ${loans.length}`);
  }
  for (let i = 0; i < loans.length; i += 1) {
    const searched = recordedEvenOutCentsForGridLoan(loans[i]);
    if (searched !== expected[i]) {
      throw new Error(`loan ${i}: search ${searched} !== recorded ${expected[i]}`);
    }
  }
  process.stdout.write(`Verified ${loans.length} grid loans.\n`);
}

if (process.argv.includes('--write-fixture')) {
  writeFixture();
} else {
  verify();
}
