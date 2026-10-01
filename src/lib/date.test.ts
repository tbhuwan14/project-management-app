import { formatDue, isOverdue } from './date';

test('formatDue renders short month + day', () => {
  expect(formatDue('2026-10-05T17:00:00.000Z')).toMatch(/Oct 5/);
});

test('isOverdue compares against now', () => {
  expect(isOverdue('2000-01-01T00:00:00.000Z')).toBe(true);
  expect(isOverdue('2099-01-01T00:00:00.000Z')).toBe(false);
});
