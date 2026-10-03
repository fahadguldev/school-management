/**
 * Self-check for the two aggregation helpers extracted in the over-engineering
 * audit. Both were copy-pasted before, so a silent edit here changes principal
 * reporting numbers with nothing to catch it.
 *
 * Runs against the compiled output rather than the TS sources, so this needs no
 * test runner and no new dependency: `node test/helpers.check.mjs`.
 *
 * Both helpers are TypeScript-`private`, which is compile-time only, so they are
 * reachable off the prototype at runtime. splitByAssessmentPeriod never touches
 * `this`; rollupMaps only reads this.enrollments and this.assignments, so
 * Object.create skips the DI constructor entirely.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { AnalyticsService } = await import('../dist/analytics/analytics.service.js');
const { ClassesService } = await import('../dist/classes/classes.service.js');

const split = AnalyticsService.prototype.splitByAssessmentPeriod;
const rollup = ClassesService.prototype.rollupMaps;

/** Minimal Result shape: split only reads percentage and the assessment id/date. */
const result = (assessmentId, percentage, examDate) => ({
  percentage,
  assessment: { id: assessmentId, examDate },
});

test('splitByAssessmentPeriod: empty input yields zeroed averages, no comparison', () => {
  const out = split([]);
  assert.deepEqual(out.currentAvg, 0);
  assert.deepEqual(out.previousAvg, 0);
  assert.equal(out.hasComparison, false);
  assert.deepEqual(out.latestSet, []);
  assert.deepEqual(out.prevSet, []);
});

test('splitByAssessmentPeriod: a single cohort compares against itself', () => {
  const rows = [result('a1', 50, '2026-01-01'), result('a1', 70, '2026-01-01')];
  const out = split(rows);
  assert.equal(out.hasComparison, false);
  assert.equal(out.currentAvg, 60);
  // current === previous is the documented single-cohort behaviour
  assert.equal(out.previousAvg, 60);
  assert.equal(out.latestSet, out.prevSet);
});

test('splitByAssessmentPeriod: averages the two newest cohorts, not the first two', () => {
  // Deliberately out of order in the input; ordering must come from examDate.
  const out = split([
    result('mid', 40, '2026-06-01'), // middle
    result('old', 10, '2026-01-01'), // oldest
    result('new', 90, '2026-09-01'), // newest
  ]);
  assert.equal(out.hasComparison, true);
  assert.equal(out.currentAvg, 90, 'newest cohort should be current');
  assert.equal(out.previousAvg, 40, 'second-newest should be previous');
});

test('splitByAssessmentPeriod: string percentages are coerced, not concatenated', () => {
  // Number() on a string is the whole point: "50" + "70" via + would be "5070".
  const out = split([result('a1', '50', '2026-01-01'), result('a1', '70', '2026-01-01')]);
  assert.equal(out.currentAvg, 60);
});

test('rollupMaps: counts enrollments per class and keeps only assignments with a teacher', async () => {
  const service = Object.create(ClassesService.prototype);
  service.enrollments = {
    find: async () => [
      { class: { id: 'c1' } },
      { class: { id: 'c1' } },
      { class: { id: 'c2' } },
      { class: null }, // no class -> must be skipped
    ],
  };
  service.assignments = {
    find: async () => [
      { class: { id: 'c1' }, teacher: { id: 't1', firstName: 'Ada', lastName: 'L', employeeId: 'E1' } },
      { class: { id: 'c2' }, teacher: null }, // no teacher -> must be skipped
    ],
  };

  const { enrollmentCount, inchargeByClassId } = await rollup.call(service, {
    organizationId: 'o1',
  });

  assert.equal(enrollmentCount.get('c1'), 2);
  assert.equal(enrollmentCount.get('c2'), 1);
  // A class-less enrollment resolves to the key `undefined`, not `null`, so the
  // size assertion is what actually pins the `if (classId)` guard down.
  assert.equal(enrollmentCount.size, 2, 'the class-less enrollment is skipped');
  assert.equal(enrollmentCount.has(undefined), false);
  assert.equal(inchargeByClassId.size, 1, 'the teacher-less assignment is dropped');
  assert.deepEqual(inchargeByClassId.get('c1'), {
    teacherId: 't1',
    name: 'Ada L',
    employeeId: 'E1',
  });
});

test('rollupMaps: two sections of one class share a single enrollment count', async () => {
  // findSections iterates sections; the count is keyed by class id, so both
  // sections of c1 must read the same number rather than one being undefined.
  const service = Object.create(ClassesService.prototype);
  service.enrollments = {
    find: async () => [{ class: { id: 'c1' } }, { class: { id: 'c1' } }, { class: { id: 'c1' } }],
  };
  service.assignments = { find: async () => [] };

  const { enrollmentCount, inchargeByClassId } = await rollup.call(service, {
    organizationId: 'o1',
  });

  assert.equal(enrollmentCount.get('c1'), 3);
  assert.equal(inchargeByClassId.size, 0);
});
