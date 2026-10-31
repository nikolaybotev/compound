'use strict';

const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname);
const SCRIPT = path.join(ROOT, 'regulation_z_apr.js');

function run(args, { json = false } = {}) {
  const argv = json ? [...args, '--json'] : args;
  const result = spawnSync(process.execPath, [SCRIPT, ...argv], {
    encoding: 'utf8',
  });
  return result;
}

test('AC4 JSON and summary for fee inversion loan', () => {
  const args = ['--amount', '600000', '--rate', '6.75', '--years', '30', '--charge', 'points=27257.20'];
  const jsonRun = run(args, { json: true });
  assert.equal(jsonRun.status, 0, jsonRun.stderr);
  const report = JSON.parse(jsonRun.stdout);
  assert.equal(report.apr_thousandths, 7210);
  assert.equal(report.amount_financed_cents, 57274280);
  assert.equal(report.irregular, false);

  const summary = run(args);
  assert.equal(summary.status, 0, summary.stderr);
  assert.match(summary.stdout, /Annual percentage rate: 7\.21%/);
  assert.match(summary.stdout, /Tolerance: 0\.125%/);
});

test('AC6 CLI validation exits', () => {
  const noArgs = run([]);
  assert.notEqual(noArgs.status, 0);
  assert.match(noArgs.stderr, /--amount/);
  assert.match(noArgs.stderr, /--rate/);
  assert.match(noArgs.stderr, /--years/);
  assert.match(noArgs.stderr, /--months/);
  assert.doesNotMatch(noArgs.stderr, /\$162,000|\$855,000/);

  assert.notEqual(run(['--amount', '600000', '--years', '30']).status, 0);
  assert.notEqual(run(['--amount', '600000', '--rate', '6.75', '--years', '30', '--months', '360']).status, 0);
  assert.notEqual(run(['--amount', '600000', '--rate', '6.75', '--years', '30', '--charge', 'bogus=1']).status, 0);
  assert.notEqual(run(['--amount', '600000', '--rate', '6.75', '--years', '30', '--charge', 'points=-1']).status, 0);
  assert.notEqual(run(['--amount', '600000', '--rate', '6.75', '--years', '30', '--mi-months', '12']).status, 0);
  assert.notEqual(run(['--amount', '600000', '--rate', '6.75', '--years', '30', '--odd-days', '30']).status, 0);
  assert.notEqual(run([
    '--amount', '570000', '--rate', '5.875', '--years', '30',
    '--fixed-years', '7', '--adjust-months', '12', '--margin', '2.5',
    '--caps', '5/2/5', '--floor', '2.5',
  ]).status, 0);
  assert.notEqual(run(['--amount', '600000', '--rate', '6.75', '--years', '30', '--current-index', '4']).status, 0);
});

test('AC7 skill text and symlink', () => {
  const skillPath = path.join(ROOT, '.agents/skills/regulation-z-apr/SKILL.md');
  const skill = fs.readFileSync(skillPath, 'utf8');
  assert.match(skill, /scripts\/regulation_z_apr\.js/);
  assert.match(skill, /loan amount/i);
  assert.match(skill, /note rate/i);
  assert.match(skill, /term in years or months/i);
  assert.match(skill, /index at consummation/i);
  assert.match(skill, /--json/);
  assert.match(skill, /interest-only/);
  assert.match(skill, /--years 30/);
  assert.match(skill, /does not classify or solve on its own/);

  const link = path.join(ROOT, '.agents/skills/regulation-z-apr/scripts/regulation_z_apr.js');
  assert.ok(fs.lstatSync(link).isSymbolicLink());
  assert.equal(
    fs.realpathSync(link),
    fs.realpathSync(path.join(ROOT, 'regulation_z_apr.js')),
  );
});

test('Closing Disclosure healthy summary', () => {
  const summary = run([
    '--amount', '162000', '--rate', '3.875', '--years', '30',
    '--price', '180000', '--mi', '82.35',
  ]);
  assert.equal(summary.status, 0, summary.stderr);
  assert.match(summary.stdout, /Annual percentage rate: 4\.174%/);
  assert.match(summary.stdout, /Finance charge: 118,830\.27/);
  assert.match(summary.stdout, /Mortgage insurance: 6,588\.00/);
});
