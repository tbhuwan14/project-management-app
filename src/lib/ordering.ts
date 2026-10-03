export const POSITION_GAP = 1024;

/** Float position for inserting between two siblings (null = edge). */
export function positionBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return POSITION_GAP;
  if (before === null) return (after as number) / 2;
  if (after === null) return before + POSITION_GAP;
  return (before + after) / 2;
}

export function nextPosition(existing: number[]): number {
  return existing.length === 0 ? POSITION_GAP : Math.max(...existing) + POSITION_GAP;
}
