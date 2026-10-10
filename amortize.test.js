'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const test = require('node:test');
const { buildReport } = require('./amortize.js');

function digest(report) {
  return crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex');
}

function firstYearExtras() {
  const extras = new Map();
  for (let month = 1; month <= 12; month += 1) extras.set(month, 100);
  return extras;
}

function fe(overrides = {}) {
  return {
    fixedMonths: 84,
    adjustMonths: 12,
    marginThousandths: 2500,
    initialCapThousandths: 5000,
    periodicCapThousandths: 2000,
    lifetimeCapThousandths: 5000,
    floorThousandths: 2500,
    initialFloorThousandths: 2500,
    roundEighth: false,
    indexByMonth: new Map(),
    ...overrides,
  };
}

function feReport(overrides = {}, extras = new Map(), rate = 5.875) {
  return buildReport(570000, rate, 360, extras, undefined, fe(overrides));
}

function adjustment(report, month) {
  const found = report.arm.adjustments.find((item) => item.month === month);
  assert.ok(found, `missing adjustment at month ${month}`);
  return found;
}

function row(report, month) {
  const found = report.schedule.find((item) => item.month === month);
  assert.ok(found, `missing month ${month}`);
  return found;
}

test('AC1 fixed reports are unchanged and carry no ARM fields', () => {
  const cases = [
    ['$570,000 / 7% / 360, empty map', [570000, 7, 360, new Map(), 30],
      '5032842927056d51e03e2524a40e58776549257399d2a19cfb43fedd57449175'],
    ['$570,000 / 7% / 360, first-year $100', [570000, 7, 360, firstYearExtras(), 30],
      'a5f4f0353c39581bef05801fcb17e101975e2ffbafe20fe9861e9f980d88ccaf'],
    ['$200,000 / 6% / 15 years', [200000, 6, 180, new Map(), 15],
      'a4287cfa19660bacef1ab81d8253aa00c39a90284eed7c18958b56901f591447'],
    ['$570,000 / 7% / 180 months', [570000, 7, 180, new Map(), undefined],
      '538cffa90313c8e3b970a4f6ed5159a60bf3d00e3fd615571f9c571e8d3a691e'],
    ['$570,000 / 7% / 13 months', [570000, 7, 13, new Map(), undefined],
      '6efb52c42089121a052fce6e89653b3f8205b710bbcece71f1482b50dc515f07'],
    ['$570,000 / 7.375% recast sample first run', [570000, 7.375, 360, new Map(), 30],
      'a7eb851219f2bdc6e0fd05db187def4ab18fdb8de31fb9ae531b19970af55837'],
  ];
  for (const [label, args, expected] of cases) {
    const report = buildReport(...args);
    assert.equal(digest(report), expected, label);
    assert.equal('arm' in report, false, label);
    for (const item of report.schedule) {
      assert.equal('rate_percent' in item, false, label);
      assert.equal('payment_cents' in item, false, label);
      assert.equal('index_percent' in item, false, label);
    }
  }
  const first = buildReport(570000, 7, 360, firstYearExtras(), 30);
  assert.equal(first.interest_saved_cents, 813770);
  assert.equal(first.payoff_month, 358);
  assert.deepEqual(
    buildReport(570000, 7, 360, new Map(), 30),
    buildReport(570000, 7, 360, new Map(), 30, undefined),
  );
});

test('amortize.js requires nothing', () => {
  const source = fs.readFileSync(`${__dirname}/amortize.js`, 'utf8');
  assert.doesNotMatch(source, /require\(\s*['"](?!\.)/);
  assert.doesNotMatch(source, /\bprocess\./);
});

test('F1 fixed $570,000 at 5.875% for 360 months', () => {
  const report = buildReport(570000, 5.875, 360, new Map(), 30);
  assert.equal(report.monthly_payment_cents, 337177);
  assert.equal(report.interest_cents, 64383549);
});

test('AC2 F2 worst case on the Example Credit Union 7/1 example terms', () => {
  const report = feReport();
  assert.equal(report.monthly_payment_cents, 337177);
  assert.equal(report.rate_percent, 5.875);
  assert.equal(report.interest_cents, 110363633);
  assert.equal(report.payoff_month, 360);
  assert.equal(report.arm.ceiling_percent, 10.875);
  assert.equal(report.arm.max_rate_percent, 10.875);
  assert.equal(report.arm.max_rate_month, 85);
  assert.equal(report.arm.max_payment_cents, 503771);
  assert.equal(report.arm.max_payment_month, 85);
  assert.equal(report.arm.round_eighth, false);
  assert.equal(report.arm.fixed_months, 84);
  assert.equal(report.arm.adjust_months, 12);
  assert.equal(report.arm.margin_percent, 2.5);
  assert.equal(report.arm.initial_cap_percent, 5);
  assert.equal(report.arm.periodic_cap_percent, 2);
  assert.equal(report.arm.lifetime_cap_percent, 5);
  assert.equal(report.arm.floor_percent, 2.5);
  assert.equal(report.arm.initial_floor_percent, 2.5);

  const list = report.arm.adjustments;
  assert.equal(list.length, 23);
  assert.deepEqual(list[0], {
    month: 85,
    index_percent: null,
    fully_indexed_percent: null,
    rate_percent: 10.875,
    payment_cents: 503771,
  });
  assert.deepEqual(list.map((item) => item.month), Array.from({ length: 23 }, (_, k) => 85 + 12 * k));
  assert.ok(list.every((item) => item.rate_percent === 10.875 && item.payment_cents === 503771));

  assert.equal(report.schedule.length, 360);
  const through84 = report.schedule.slice(0, 84).reduce((sum, item) => sum + item.interest_cents, 0);
  assert.ok(Math.abs(through84 - 22302440) <= 84);
  assert.equal(row(report, 84).interest_cents, 250014);
  assert.equal(row(report, 84).principal_cents, 87162);
  assert.equal(row(report, 84).remaining_principal_cents, 50979612);
  assert.equal(row(report, 84).rate_percent, 5.875);
  assert.equal(row(report, 84).payment_cents, 337177);
  assert.equal(row(report, 85).interest_cents, 462003);
  assert.equal(row(report, 85).principal_cents, 41768);
  assert.equal(row(report, 85).remaining_principal_cents, 50937844);
  assert.equal(row(report, 85).rate_percent, 10.875);
  assert.equal(row(report, 85).payment_cents, 503771);
  assert.equal(row(report, 85).index_percent, null);
  assert.equal(row(report, 97).interest_cents, 457227);
  assert.equal(row(report, 97).principal_cents, 46544);
  assert.equal(row(report, 360).interest_cents, 4524);
  assert.equal(row(report, 360).principal_cents, 499247);
  assert.equal(row(report, 360).remaining_principal_cents, 0);
});

test('F2 interest through month 84 is 22302440 cents', () => {
  const report = feReport();
  const total = report.interest_cents;
  const remaining = row(report, 84).remaining_interest_cents;
  assert.equal(total - remaining, 22302440);
});

test('AC2 F3 caps 2/2/5 step 7.875, 9.875, 10.875', () => {
  const report = feReport({ initialCapThousandths: 2000 });
  assert.deepEqual(
    report.arm.adjustments.slice(0, 4).map((item) => [item.month, item.rate_percent, item.payment_cents]),
    [[85, 7.875, 400385], [97, 9.875, 466369], [109, 10.875, 499953], [121, 10.875, 499953]],
  );
  assert.equal(report.interest_cents, 107712034);
  assert.equal(report.arm.max_payment_month, 109);
});

test('AC2 F4 10/1 first reset is month 121', () => {
  const report = feReport({ fixedMonths: 120 });
  assert.equal(report.arm.adjustments[0].month, 121);
  assert.equal(report.arm.adjustments[0].rate_percent, 10.875);
  assert.equal(report.arm.adjustments[0].payment_cents, 486671);
  assert.equal(report.interest_cents, 100262267);
  assert.equal(report.arm.adjustments.length, 20);
});

test('AC2 F12 six-month resets', () => {
  const report = feReport({ adjustMonths: 6, periodicCapThousandths: 1000 });
  assert.deepEqual(report.arm.adjustments.slice(0, 3).map((item) => item.month), [85, 91, 97]);
  assert.equal(report.arm.adjustments[0].rate_percent, 10.875);
  assert.equal(report.interest_cents, 110363633);
});

test('AC2 F13 the page default rate on the FE terms', () => {
  const report = feReport({}, new Map(), 7.375);
  assert.equal(report.monthly_payment_cents, 393685);
  assert.equal(report.arm.adjustments[0].month, 85);
  assert.equal(report.arm.adjustments[0].rate_percent, 12.375);
  assert.equal(report.arm.adjustments[0].payment_cents, 572559);
  assert.equal(report.arm.ceiling_percent, 12.375);
  assert.equal(report.interest_cents, 134095782);
});

test('AC3 F5 index 4.42 at the first reset', () => {
  const report = feReport({ indexByMonth: new Map([[85, 4420]]) });
  assert.deepEqual(adjustment(report, 85), {
    month: 85,
    index_percent: 4.42,
    fully_indexed_percent: 6.92,
    rate_percent: 6.92,
    payment_cents: 369572,
  });
  assert.equal(adjustment(report, 97).rate_percent, 8.92);
  assert.equal(adjustment(report, 97).payment_cents, 433322);
  assert.equal(adjustment(report, 97).index_percent, null);
  assert.equal(adjustment(report, 109).rate_percent, 10.875);
  assert.equal(adjustment(report, 109).payment_cents, 497820);
  assert.equal(adjustment(report, 121).payment_cents, 497820);
  assert.equal(report.interest_cents, 106408179);
  assert.equal(row(report, 85).index_percent, 4.42);
  assert.equal(row(report, 86).index_percent, null);
});

test('AC3 F6 a zero index at 97 is held by the step floor, not the lifetime floor', () => {
  const report = feReport({ indexByMonth: new Map([[85, 4420], [97, 0]]) });
  assert.equal(adjustment(report, 97).fully_indexed_percent, 2.5);
  assert.equal(adjustment(report, 97).rate_percent, 4.92);
  assert.equal(adjustment(report, 97).payment_cents, 310654);
  assert.equal(adjustment(report, 109).rate_percent, 6.92);
  assert.equal(adjustment(report, 109).payment_cents, 367376);
  assert.equal(adjustment(report, 121).rate_percent, 8.92);
  assert.equal(adjustment(report, 121).payment_cents, 426539);
  assert.equal(adjustment(report, 133).rate_percent, 10.875);
  assert.equal(adjustment(report, 133).payment_cents, 486069);
  assert.equal(adjustment(report, 145).payment_cents, 486069);
  assert.equal(report.interest_cents, 99836311);
});

test('AC3 F7 an index above the ceiling is clamped and both numbers are reported', () => {
  const report = feReport({ indexByMonth: new Map([[85, 9000]]) });
  assert.equal(adjustment(report, 85).fully_indexed_percent, 11.5);
  assert.equal(adjustment(report, 85).index_percent, 9);
  assert.equal(adjustment(report, 85).rate_percent, 10.875);
  assert.equal(adjustment(report, 85).payment_cents, 503771);
  assert.equal(report.interest_cents, 110363633);
});

test('AC3 F8 index 4 at every reset month', () => {
  const indexByMonth = new Map();
  for (let month = 85; month <= 360; month += 12) indexByMonth.set(month, 4000);
  const report = feReport({ indexByMonth });
  assert.ok(report.arm.adjustments.every((item) => item.rate_percent === 6.5 && item.payment_cents === 356380));
  assert.equal(report.interest_cents, 69683834);
  assert.equal(report.arm.max_rate_percent, 6.5);
});

test('AC3 F9 rounding to an eighth against F5 without it', () => {
  const rounded = feReport({ roundEighth: true, indexByMonth: new Map([[85, 4420]]) });
  assert.equal(adjustment(rounded, 85).fully_indexed_percent, 6.875);
  assert.equal(adjustment(rounded, 85).rate_percent, 6.875);
  assert.equal(adjustment(rounded, 85).payment_cents, 368148);
  assert.equal(adjustment(rounded, 97).rate_percent, 8.875);
  assert.equal(adjustment(rounded, 97).payment_cents, 431789);
  assert.equal(adjustment(rounded, 109).rate_percent, 10.875);
  assert.equal(adjustment(rounded, 109).payment_cents, 497714);
  assert.equal(rounded.interest_cents, 106345915);
  assert.equal(rounded.arm.round_eighth, true);

  const plain = feReport({ roundEighth: false, indexByMonth: new Map([[85, 4420]]) });
  assert.equal(plain.interest_cents, 106408179);
  assert.equal(adjustment(plain, 85).rate_percent, 6.92);

  const odd = feReport({ roundEighth: true, indexByMonth: new Map([[85, 4437]]) });
  assert.equal(adjustment(odd, 85).fully_indexed_percent, 6.875);
});

test('AC3 a typed index of 4.437 without rounding is 6.937', () => {
  const report = feReport({ indexByMonth: new Map([[85, 4437]]) });
  assert.equal(adjustment(report, 85).rate_percent, 6.937);
  const zero = feReport({ indexByMonth: new Map([[85, 0]]) });
  assert.equal(adjustment(zero, 85).fully_indexed_percent, 2.5);
  assert.equal(adjustment(zero, 85).rate_percent, 2.5);
});

test('AC4 F10 extra principal lowers the reset payment, not the term', () => {
  const report = feReport({}, firstYearExtras());
  assert.equal(report.interest_cents, 110005697);
  assert.equal(report.interest_saved_cents, 357936);
  assert.equal(report.months_saved, 0);
  assert.equal(report.payoff_month, 360);
  assert.equal(report.arm.adjustments[0].payment_cents, 502039);
  assert.equal(report.arm.max_payment_cents, 502039);
  assert.equal(row(report, 84).remaining_principal_cents, 50804376);

  const monthOne = feReport({}, new Map([[1, 100]]));
  assert.equal(monthOne.interest_cents, 110332727);
  assert.equal(monthOne.interest_saved_cents, 30906);
  assert.equal(monthOne.arm.adjustments[0].payment_cents, 503623);

  const without = feReport({}, new Map([[2, 100], [3, 100], [4, 100], [5, 100], [6, 100],
    [7, 100], [8, 100], [9, 100], [10, 100], [11, 100], [12, 100]]));
  assert.equal(without.interest_cents - report.interest_cents, 30907);
});

test('AC4 F10 an extra does not reduce that month\'s interest', () => {
  const report = feReport({}, firstYearExtras());
  assert.equal(row(report, 1).interest_cents, feReport().schedule[0].interest_cents);
  assert.equal(row(report, 1).interest_saved_cents, 0);
});

test('AC4 F11 $2,400 extra every month pays off in 181', () => {
  const extras = new Map();
  for (let month = 1; month <= 360; month += 1) extras.set(month, 2400);
  const report = feReport({}, extras);
  assert.equal(report.payoff_month, 181);
  assert.equal(report.interest_cents, 29088693);
  assert.equal(report.interest_saved_cents, 81274940);
  assert.equal(report.months_saved, 179);
  assert.equal(adjustment(report, 85).payment_cents, 258079);
  assert.equal(adjustment(report, 169).payment_cents, 36835);
  assert.equal(adjustment(report, 181).payment_cents, 2657);
  assert.equal(report.arm.adjustments.length, 9);
  assert.equal(report.arm.adjustments.at(-1).month, 181);
  assert.equal(report.arm.max_payment_cents, 337177);
  assert.equal(report.arm.max_payment_month, 1);
  assert.equal(report.schedule.length, 360);
  const after = row(report, 200);
  assert.equal(after.interest_cents, 0);
  assert.equal(after.payment_cents, 0);
  assert.equal(after.rate_percent, 10.875);
});

test('an index after the payoff month is accepted and has no effect', () => {
  const extras = new Map();
  for (let month = 1; month <= 360; month += 1) extras.set(month, 2400);
  const base = feReport({}, extras);
  const late = feReport({ indexByMonth: new Map([[193, 4000]]) }, extras);
  assert.equal(late.interest_cents, base.interest_cents);
  assert.equal(late.arm.adjustments.length, base.arm.adjustments.length);
  assert.equal(row(late, 193).index_percent, 4);
});

test('an index at the payoff month changes that month', () => {
  const extras = new Map();
  for (let month = 1; month <= 360; month += 1) extras.set(month, 2400);
  const base = feReport({}, extras);
  const at = feReport({ indexByMonth: new Map([[181, 0]]) }, extras);
  assert.equal(adjustment(at, 181).index_percent, 0);
  assert.notEqual(adjustment(at, 181).rate_percent, adjustment(base, 181).rate_percent);
  assert.ok(at.interest_cents < base.interest_cents);
});

test('the first reset is governed by the initial cap, not the periodic cap', () => {
  const report = feReport();
  assert.equal(adjustment(report, 85).rate_percent, 10.875);
  assert.notEqual(adjustment(report, 85).rate_percent, 7.875);
});

test('a reset payment is the level payment on the actual balance over the months left', () => {
  const report = feReport({ indexByMonth: new Map([[85, 4420]]) });
  const balanceCents = row(report, 84).remaining_principal_cents;
  const r = 0.0692 / 12;
  const left = 360 - 85 + 1;
  const level = (balanceCents / 100) * ((r * (1 + r) ** left) / ((1 + r) ** left - 1));
  assert.ok(Math.abs(level * 100 - adjustment(report, 85).payment_cents) < 1);
});

test('F2 fixed period matches the fixed loan to the cent', () => {
  const fixed = buildReport(570000, 5.875, 360, new Map(), 30);
  const arm = feReport();
  for (let month = 1; month <= 84; month += 1) {
    assert.equal(arm.schedule[month - 1].interest_cents, fixed.schedule[month - 1].interest_cents);
    assert.equal(arm.schedule[month - 1].principal_cents, fixed.schedule[month - 1].principal_cents);
  }
});

test('years is set on an ARM report only when passed', () => {
  assert.equal('years' in feReport(), false);
  const report = buildReport(570000, 5.875, 360, new Map(), 30, fe());
  assert.equal(report.years, 30);
});

test('AC5 the library names the term it rejects', () => {
  const cases = [
    [{ fixedMonths: 360 }, /fixed period/],
    [{ fixedMonths: 0 }, /fixed period/],
    [{ adjustMonths: 0 }, /adjustment interval/],
    [{ floorThousandths: 11000 }, /lifetime floor.*above the ceiling/],
    [{ initialFloorThousandths: 11000 }, /first adjustment floor.*above the ceiling/],
    [{ floorThousandths: 0 }, /lifetime floor.*greater than zero/],
    [{ initialFloorThousandths: 0 }, /first adjustment floor.*greater than zero/],
    [{ indexByMonth: new Map([[86, 4000]]) }, /index month 86 is not an adjustment month/],
    [{ indexByMonth: new Map([[84, 4000]]) }, /index month 84 is not an adjustment month/],
    [{ indexByMonth: new Map([[361, 4000]]) }, /index month 361 is not an adjustment month/],
    [{ indexByMonth: new Map([[85, -1]]) }, /index.*must not be negative/],
    [{ initialCapThousandths: -1 }, /initial cap.*must not be negative/],
    [{ periodicCapThousandths: -1 }, /periodic cap.*must not be negative/],
    [{ lifetimeCapThousandths: -1 }, /lifetime cap.*must not be negative/],
    [{ marginThousandths: -1 }, /margin.*must not be negative/],
  ];
  for (const [overrides, pattern] of cases) {
    assert.throws(() => feReport(overrides), pattern, JSON.stringify([...Object.keys(overrides)]));
  }
});

test('AC5 a floor above the ceiling is judged against the initial rate plus the lifetime cap', () => {
  assert.doesNotThrow(() => feReport({ floorThousandths: 10875 }));
  assert.throws(() => feReport({ floorThousandths: 10876 }), /lifetime floor/);
});

test('R0 is the rate in thousandths, exactly', () => {
  assert.equal(Math.round(6.99 * 1000), 6990);
  const report = buildReport(570000, 6.99, 360, new Map(), 30, fe({ marginThousandths: 2000 }));
  assert.equal(report.arm.ceiling_percent, 11.99);
});

test('max payment month is 1 when no reset payment exceeds the initial payment', () => {
  const indexByMonth = new Map();
  for (let month = 85; month <= 360; month += 12) indexByMonth.set(month, 0);
  const report = feReport({ indexByMonth });
  assert.equal(report.arm.max_payment_month, 1);
  assert.equal(report.arm.max_payment_cents, 337177);
  assert.equal(report.arm.max_rate_month, 1);
  assert.equal(report.arm.max_rate_percent, 5.875);
});
