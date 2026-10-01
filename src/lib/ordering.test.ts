import { POSITION_GAP, nextPosition, positionBetween } from './ordering';

describe('positionBetween', () => {
  test('empty list → first gap', () => expect(positionBetween(null, null)).toBe(POSITION_GAP));
  test('append after last', () => expect(positionBetween(1024, null)).toBe(1024 + POSITION_GAP));
  test('prepend before first', () => expect(positionBetween(null, 1024)).toBe(512));
  test('midpoint between neighbors', () => expect(positionBetween(1, 2)).toBe(1.5));
});

describe('nextPosition', () => {
  test('empty', () => expect(nextPosition([])).toBe(POSITION_GAP));
  test('appends after max', () => expect(nextPosition([1024, 3072, 2048])).toBe(3072 + POSITION_GAP));
});
