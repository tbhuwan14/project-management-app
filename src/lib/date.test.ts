import { formatDue, isLate, isOverdue } from './date';

test('formatDue renders short month + day', () => {
  expect(formatDue('2026-10-05T17:00:00.000Z')).toMatch(/Oct 5/);
});

test('isOverdue compares against now', () => {
  expect(isOverdue('2000-01-01T00:00:00.000Z')).toBe(true);
  expect(isOverdue('2099-01-01T00:00:00.000Z')).toBe(false);
});

describe('isLate', () => {
  test('a past due date on a not-done task is late', () => {
    expect(isLate('2000-01-01T00:00:00.000Z', 'todo')).toBe(true);
    expect(isLate('2000-01-01T00:00:00.000Z', 'in_progress')).toBe(true);
  });

  test('a past due date on a done task is never late', () => {
    expect(isLate('2000-01-01T00:00:00.000Z', 'done')).toBe(false);
  });

  test('a future due date is never late regardless of status', () => {
    expect(isLate('2099-01-01T00:00:00.000Z', 'todo')).toBe(false);
    expect(isLate('2099-01-01T00:00:00.000Z', 'done')).toBe(false);
  });

  test('no due date is never late', () => {
    expect(isLate(null, 'todo')).toBe(false);
  });
});
