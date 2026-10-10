'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const skillDir = path.join(__dirname, '.agents', 'skills', 'arm-loan-concepts');
const skillPath = path.join(skillDir, 'SKILL.md');

function readSkill() {
  return fs.readFileSync(skillPath, 'utf8');
}

test('AC1 skill file shape and frontmatter', () => {
  assert.ok(fs.existsSync(skillPath));
  const skill = readSkill();
  const collapsed = skill.replace(/\s+/g, ' ');
  assert.ok(skill.includes('name: arm-loan-concepts'));
  assert.ok(collapsed.includes('how a fixed-then-adjusting ARM'));
  assert.ok(collapsed.includes('does not run the calculator'));
  assert.doesNotMatch(skill, /disable-model-invocation:\s*true/);
  assert.deepEqual(fs.readdirSync(skillDir), ['SKILL.md']);
});

test('AC2 required names, formulas, and relations', () => {
  const skill = readSkill();
  const required = [
    'start_rate',
    'term_payments',
    'fixed_payments',
    'adjust_interval',
    'index_at_lookback',
    'margin',
    'initial_cap',
    'periodic_cap',
    'lifetime_cap',
    'initial_floor',
    'lifetime_floor',
    'new_rate',
    'change_payment',
    'rate_in_effect',
    'fully_indexed_rate = index_at_lookback + margin',
    'lifetime_ceiling = start_rate + lifetime_cap',
    'first_change = fixed_payments + 1',
    'start_rate + initial_cap',
    'start_rate - initial_cap',
    'upper_first = min(start_rate + initial_cap, lifetime_ceiling)',
    'lower_first = initial_floor',
    'new_rate = max(min(fully_indexed_rate, upper_first), lower_first)',
    'upper = min(rate_in_effect + periodic_cap, lifetime_ceiling)',
    'lower = max(rate_in_effect - periodic_cap, lifetime_floor)',
    'new_rate = max(min(fully_indexed_rate, upper), lower)',
    'monthly_rate = new_rate / 100 / 12',
    'payments_left = term_payments - change_payment + 1',
    'payment = unpaid_balance × monthly_rate / (1 - (1 + monthly_rate) ^ -payments_left)',
    'unpaid_balance',
    'change date',
    'lookback',
    'higher margin',
    'moves with the start rate',
    'not a change date',
    'only one floor',
    'lifetime floor does not enter the first change',
    'rounded sum',
    'not rounded',
    'no index',
    'upper bound',
    'through maturity',
  ];
  for (const phrase of required) {
    assert.ok(skill.includes(phrase), `missing: ${phrase}`);
  }
  const calcSkillMatches = skill.match(/mortgage-loan-calculator/g) ?? [];
  assert.equal(calcSkillMatches.length, 1, 'mortgage-loan-calculator must occur exactly once');
});

test('AC3 forbidden content', () => {
  const skill = readSkill();
  assert.doesNotMatch(skill, /\$\s?\d/);
  assert.doesNotMatch(skill, /\b(daily|weekly)\b/i);
  for (const forbidden of [
    'http',
    'node scripts/',
    'compound_interest_monthly',
    '--json',
    '--amount',
    '--index',
    'R0',
    'C1',
    'Cp',
    'CL',
    'F1',
    'FL',
    'Rc',
    'upper_j',
    'lower_j',
    'erDiagram',
    'classDiagram',
    'flowchart',
  ]) {
    assert.equal(skill.includes(forbidden), false, `contains: ${forbidden}`);
  }
});

test('AC4 single mermaid sequence diagram', () => {
  const skill = readSkill();
  const fence = '```mermaid';
  const starts = [...skill.matchAll(new RegExp(fence, 'g'))].map((m) => m.index);
  assert.equal(starts.length, 1);
  const open = starts[0];
  const afterOpen = skill.slice(open + fence.length);
  assert.match(afterOpen, /^\s*\nsequenceDiagram/);
  const close = skill.indexOf('```', open + fence.length);
  const block = skill.slice(open, close + 3);
  const inner = block.slice(block.indexOf('\n') + 1, block.lastIndexOf('```'));
  for (const word of [
    'participant',
    'as Note',
    'Servicer',
    'Index publisher',
    'Borrower',
    'loop',
    'index',
    'margin',
    'upper_first',
    'periodic_cap',
    'cap',
    'floor',
    'ceiling',
    'unpaid balance',
    'payments left',
    'notice',
  ]) {
    assert.ok(inner.includes(word), `mermaid missing: ${word}`);
  }
  for (const ch of [';', '#', '^']) {
    assert.equal(inner.includes(ch), false, `mermaid contains forbidden ${ch}`);
  }
});

test('AC5 example table values and Buy-Down placement', () => {
  const skill = readSkill();
  for (const phrase of [
    '7 Years',
    'Annually',
    '1-Year Constant Maturity Treasury (CMT)',
    '2.50%',
    '5/2/5',
    '45 Days',
    '5.875%',
    '10.875%',
    '5.50%',
    '30 years',
    'one example',
    'not the definition',
  ]) {
    assert.ok(skill.includes(phrase), `missing: ${phrase}`);
  }
  const firstFence = skill.indexOf('```mermaid');
  const beforeMermaid = skill.slice(0, firstFence);
  assert.equal(beforeMermaid.includes('Buy-Down'), false);
});

test('AC6 repo document strings', () => {
  const readme = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8');
  const agents = fs.readFileSync(path.join(__dirname, 'AGENTS.md'), 'utf8');
  const review = fs.readFileSync(path.join(__dirname, 'REVIEW.md'), 'utf8');
  assert.ok(readme.includes('arm-loan-concepts'));
  assert.ok(readme.includes('intent/arm-concepts/'));
  assert.ok(agents.includes('arm-loan-concepts'));
  assert.ok(review.includes('intent/arm-concepts/'));
});

test('AC8 How to answer phrases', () => {
  const skill = readSkill();
  const section = skill.slice(skill.indexOf('## How to answer'));
  for (const phrase of [
    'does not fetch',
    'does not run the calculator',
    'mortgage-loan-calculator',
    "one invented example",
    '45',
    'calendar date',
    'which published fixing',
    'no comparison of fixings',
    'fully amortizing',
    'interest-only',
    'payment-option',
    'negative-amortization',
    'balloon',
    'payment-capped',
  ]) {
    assert.ok(section.includes(phrase), `How to answer missing: ${phrase}`);
  }
});

test('AC9 heading order and mermaid placement', () => {
  const skill = readSkill();
  const headings = [
    '## Parameters',
    '## Procedure',
    '## Sequence diagram',
    '## Example: Example Credit Union 7/1',
    '## How to answer',
  ];
  let last = -1;
  for (const h of headings) {
    const count = skill.split(h).length - 1;
    assert.equal(count, 1, `heading ${h} must occur exactly once`);
    const idx = skill.indexOf(h);
    assert.ok(idx > last, `heading order wrong at ${h}`);
    last = idx;
  }
  const fenceIdx = skill.indexOf('```mermaid');
  const seqIdx = skill.indexOf('## Sequence diagram');
  const exampleIdx = skill.indexOf('## Example: Example Credit Union 7/1');
  assert.ok(fenceIdx > seqIdx && fenceIdx < exampleIdx);
});
